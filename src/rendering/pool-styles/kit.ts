import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  Shape,
  ShapeGeometry,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { Material, Object3D, Texture } from 'three';
import { METRE } from '../../toolkit/components/core/logic/units';
import { createRenderer } from '../../toolkit/components/core/parts/render-style';
import { createFirstPerson } from '../../toolkit/controls/input/first-person';
import type { Footprint } from '../../toolkit/controls/logic/walk-collision';
import { createPortals } from '../../toolkit/gallery/views/portals';
import { devPortals } from '../../toolkit/gallery/logic/dev-room-links';
import type { RoomId } from '../../toolkit/gallery/logic/dev-room-links';
import { insidePolygon } from '../../game/pool-styles/geometry';
import type { Point, Rect } from '../../game/pool-styles/geometry';

/**
 * The kit the five pool-room styles are built from (`doc/design/
 * pool-styles.md`): a stage (renderer, camera, walker, the doors to the
 * next and previous rooms, the frame loop) and the genre's vocabulary
 * (small square tiles on every surface, two-tone walls, curved outlines,
 * pools with tiled basins, porthole lamps and downlights, stainless
 * handrails, fat round columns, signs, slides to ride). Everything is
 * built in metres in `world`, which is scaled into scene units.
 */

/** What a room's build gives the stage back. */
export interface PoolRoomBuild {
  /** The floor under (x, z) in metres for a walker who stood at `y`. */
  floorAt?(x: number, z: number, y: number): number;
  /** Where the walker cannot go, metres (walls, deep water, columns). */
  solids: readonly Rect[];
  /** Or, where rooms stand over one another, where it cannot go at floor height `y`, metres. */
  solidsAt?(y: number): readonly Rect[];
  /** Where a walker arriving by URL stands, metres. */
  start: { x: number; z: number; yaw: number; pitch?: number };
  /** Called each frame, with the time in seconds. */
  update?(delta: number, time: number): void;
}

export interface PoolStage {
  scene: Scene;
  world: Group;
  camera: PerspectiveCamera;
  /** Keep a material or texture for disposal. */
  keep<T extends Material>(material: T): T;
  texture<T extends Texture>(texture: T): T;
  /** Make `object` usable: clicked (or E) near it, `use` runs. */
  usable(object: Object3D, use: () => void): void;
  /** Ride a slide: carried along `curve` (metres) and set down at its end. */
  ride(curve: CatmullRomCurve3, speed?: number): void;
}

/**
 * Start a pool room: `build` makes its geometry in the stage's world and
 * says where its solids and floors are.
 */
export function startPoolRoom(
  canvas: HTMLCanvasElement,
  id: RoomId,
  {
    bounds,
    background,
    fog,
    sky = ['#ffffff', '#a9b4b0', 1.4],
    exposure = 1,
  }: {
    /** The room's outer walls, metres: its doors are in them. */
    bounds: Rect;
    background: string;
    fog?: readonly [number, number];
    sky?: readonly [string, string, number];
    exposure?: number;
  },
  build: (stage: PoolStage) => PoolRoomBuild,
) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  renderer.toneMappingExposure = exposure;
  scene.background = new Color(background);
  if (fog) scene.fog = new Fog(background, fog[0] * m, fog[1] * m);
  const camera = new PerspectiveCamera(70, 1, 0.05 * m, 400 * m);
  scene.add(new HemisphereLight(sky[0], sky[1], sky[2]));
  const world = new Group();
  world.scale.setScalar(m);
  scene.add(world);
  const materials: Material[] = [];
  const textures: Texture[] = [];
  const uses = new Map<Object3D, () => void>();
  let riding: { curve: CatmullRomCurve3; s: number; speed: number } | null =
    null;
  const stage: PoolStage = {
    scene,
    world,
    camera,
    keep(material) {
      materials.push(material);
      return material;
    },
    texture(texture) {
      textures.push(texture);
      return texture;
    },
    usable(object, use) {
      uses.set(object, use);
    },
    ride(curve, speed = 7) {
      riding = { curve, s: 0, speed };
    },
  };
  const room = build(stage);

  // The doors: on the outer walls, to the previous and next rooms.
  const footprint: Footprint = {
    minX: bounds.minX * m,
    maxX: bounds.maxX * m,
    minZ: bounds.minZ * m,
    maxZ: bounds.maxZ * m,
  };
  const portals = createPortals(id, devPortals(id, footprint, m), 0, m);
  scene.add(portals.group);
  const scaled = (list: readonly Rect[]) =>
    list.map((r) => ({
      minX: r.minX * m,
      maxX: r.maxX * m,
      minZ: r.minZ * m,
      maxZ: r.maxZ * m,
    }));
  const solids = scaled(room.solids);
  // Walls by level, worked out again only when the walker changes level.
  let levelY = NaN;
  let levelSolids = solids;
  const solidsNow = () => {
    if (!room.solidsAt) return solids;
    const y = Math.round(walk.floorY / m);
    if (y !== levelY) {
      levelY = y;
      levelSolids = [...solids, ...scaled(room.solidsAt(walk.floorY / m))];
    }
    return levelSolids;
  };

  const raycaster = new Raycaster();
  const useAt = (x: number, y: number) => {
    raycaster.setFromCamera(new Vector2(x, y), camera);
    const hit = raycaster.intersectObjects(
      [portals.group, ...uses.keys()],
      true,
    )[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const door = portals.uses.get(o as Mesh);
      if (door) return door;
      const use = uses.get(o);
      if (use) return use;
    }
    return null;
  };
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    floorAt: room.floorAt
      ? (x, z, y) => room.floorAt!(x / m, z / m, y / m) * m
      : undefined,
    start: { x: room.start.x * m, z: room.start.z * m },
    solids: () => solidsNow(),
    use: (x, y) => useAt(x, y)?.(),
    aimed: () => Boolean(useAt(0, 0)),
  });
  const place = (x: number, z: number, yaw: number, pitch = 0) =>
    walk.place(x * m, z * m, yaw, pitch);
  const arrival = portals.arrival(
    new URLSearchParams(location.search).get('from'),
  );
  if (arrival) walk.place(arrival.x, arrival.z, arrival.yaw, arrival.pitch);
  else place(room.start.x, room.start.z, room.start.yaw, room.start.pitch);

  const resize = () => {
    const { width: w, height: h } = canvas.getBoundingClientRect();
    if (!w || !h) return;
    renderer.setSize(Math.round(w), Math.round(h), false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    room.update?.(delta, time / 1000);
    if (riding) {
      riding.s += (delta * riding.speed) / riding.curve.getLength();
      const t = Math.min(1, riding.s);
      const p = riding.curve.getPointAt(t);
      const ahead = riding.curve.getTangentAt(t);
      camera.position.set(p.x * m, (p.y + 0.5) * m, p.z * m);
      camera.lookAt(camera.position.clone().addScaledVector(ahead, m));
      if (t >= 1) {
        const yaw = Math.atan2(ahead.x, -ahead.z);
        riding = null;
        place(p.x, p.z, yaw);
      }
    } else {
      walk.update(delta);
      portals.update(delta, walk.walker.x, walk.walker.z);
    }
    renderer.render(scene, camera);
  });

  // A development handle for the console.
  (window as unknown as { poolStyle: unknown }).poolStyle = {
    place,
    use: (x = 0, y = 0) => useAt(x, y)?.(),
  };

  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    for (const t of textures) t.dispose();
    for (const material of materials) material.dispose();
    world.traverse((o) => {
      if (o instanceof Mesh) o.geometry.dispose();
    });
    renderer.dispose();
    delete (window as unknown as { poolStyle?: unknown }).poolStyle;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const pose = portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
  });
}

// ---- Surfaces ----------------------------------------------------------------

/**
 * Small square glazed tiles, `tile` metres a side (an eighth of a metre
 * by default), in `colour` with darker grout: a material whose texture
 * repeats once a metre, for geometry whose UVs are in metres.
 */
export function tiles(
  stage: PoolStage,
  colour: string,
  { tile = 0.125, roughness = 0.25, side = DoubleSide } = {},
) {
  const px = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const c = canvas.getContext('2d')!;
  const base = new Color(colour);
  c.fillStyle = base.clone().multiplyScalar(0.78).getStyle();
  c.fillRect(0, 0, px, px);
  const n = Math.max(1, Math.round(1 / tile));
  const cell = px / n;
  const gap = Math.max(1, cell * 0.06);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      c.fillStyle = base
        .clone()
        .multiplyScalar(0.97 + ((i * 7 + j * 13) % 5) * 0.008)
        .getStyle();
      c.fillRect(
        i * cell + gap,
        j * cell + gap,
        cell - 2 * gap,
        cell - 2 * gap,
      );
    }
  const texture = stage.texture(new CanvasTexture(canvas));
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  return stage.keep(
    new MeshStandardMaterial({ map: texture, roughness, side }),
  );
}

/** Water: deep or shallow, its colour and how much of the basin shows. */
export function water(stage: PoolStage, colour = '#2d8f9a', opacity = 0.78) {
  return stage.keep(
    new MeshStandardMaterial({
      color: colour,
      transparent: true,
      opacity,
      roughness: 0.06,
      metalness: 0.15,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
}

/** Scale a geometry's UVs so that its tiles are laid in metres. */
export function metreUVs(geometry: BufferGeometry, su: number, sv: number) {
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geometry;
}

// ---- Outlines ----------------------------------------------------------------

/** A rounded rectangle's outline, corners of `radius`, anticlockwise in (x, z). */
export function roundedRect(r: Rect, radius: number, per = 8): Point[] {
  const points: Point[] = [];
  const corner = (cx: number, cz: number, from: number) => {
    for (let i = 0; i <= per; i++) {
      const a = from + (i / per) * (Math.PI / 2);
      points.push([cx + radius * Math.cos(a), cz + radius * Math.sin(a)]);
    }
  };
  corner(r.maxX - radius, r.minZ + radius, -Math.PI / 2);
  corner(r.maxX - radius, r.maxZ - radius, 0);
  corner(r.minX + radius, r.maxZ - radius, Math.PI / 2);
  corner(r.minX + radius, r.minZ + radius, Math.PI);
  return points;
}

/** A kidney: an oval with one side drawn in, `w` by `d` metres about (cx, cz), turned `turn`. */
export function kidney(
  cx: number,
  cz: number,
  w: number,
  d: number,
  turn = 0,
  segments = 48,
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    // Drawn in on one side: the radius dips where sin(a) is near 1.
    const dip = 1 - 0.32 * Math.max(0, Math.sin(a)) ** 3;
    const x = (w / 2) * Math.cos(a);
    const z = (d / 2) * Math.sin(a) * dip;
    const c = Math.cos(turn),
      s = Math.sin(turn);
    points.push([cx + x * c - z * s, cz + x * s + z * c]);
  }
  return points;
}

/** A circle's outline about (cx, cz). */
export function circle(
  cx: number,
  cz: number,
  r: number,
  segments = 48,
): Point[] {
  return Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)] as Point;
  });
}

const shapeOf = (outline: readonly Point[]) => {
  const shape = new Shape();
  shape.moveTo(outline[0][0], outline[0][1]);
  for (const [x, z] of outline.slice(1)) shape.lineTo(x, z);
  shape.closePath();
  return shape;
};

/**
 * A level surface: `outline` (x, z) at height `y`, with `holes` cut out
 * (pools), its tiles in metres; facing up, or down for a ceiling.
 */
export function surface(
  stage: PoolStage,
  outline: readonly Point[],
  y: number,
  material: Material,
  holes: readonly (readonly Point[])[] = [],
) {
  const shape = shapeOf(outline);
  for (const hole of holes) shape.holes.push(shapeOf(hole));
  const geometry = new ShapeGeometry(shape, 1);
  const pos = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getY(i);
    pos.setXYZ(i, x, y, z);
    uv.setXY(i, x, z);
  }
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, material);
  stage.world.add(mesh);
  return mesh;
}

/**
 * A wall along a line of points (x, z), from `y0` to `y1`, as a ribbon
 * whose tiles are laid in metres; `closed` joins its last point to its
 * first. Two of these, one over the other, make a two-tone wall.
 */
export function ribbon(
  stage: PoolStage,
  line: readonly Point[],
  y0: number,
  y1: number,
  material: Material,
  closed = false,
) {
  const points = closed ? [...line, line[0]] : [...line];
  const positions: number[] = [];
  const uvs: number[] = [];
  let run = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1];
    const [bx, bz] = points[i];
    const step = Math.hypot(bx - ax, bz - az);
    positions.push(
      ax,
      y0,
      az,
      bx,
      y0,
      bz,
      bx,
      y1,
      bz,
      ax,
      y0,
      az,
      bx,
      y1,
      bz,
      ax,
      y1,
      az,
    );
    uvs.push(
      run,
      y0,
      run + step,
      y0,
      run + step,
      y1,
      run,
      y0,
      run + step,
      y1,
      run,
      y1,
    );
    run += step;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, material);
  stage.world.add(mesh);
  return mesh;
}

/**
 * A two-tone wall: a dark band below, white above, meeting at `split`,
 * as the genre likes them.
 */
export function twoToneWall(
  stage: PoolStage,
  line: readonly Point[],
  y0: number,
  split: number,
  y1: number,
  lower: Material,
  upper: Material,
  closed = false,
) {
  ribbon(stage, line, y0, split, lower, closed);
  ribbon(stage, line, split, y1, upper, closed);
}

/** Solids along a line of points: small squares every `step` metres, `thickness` across. */
export function lineSolids(
  line: readonly Point[],
  thickness = 0.4,
  closed = false,
  step = 0.25,
): Rect[] {
  const points = closed ? [...line, line[0]] : [...line];
  const solids: Rect[] = [];
  const h = thickness / 2;
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1];
    const [bx, bz] = points[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n;
      const z = az + ((bz - az) * k) / n;
      solids.push({ minX: x - h, maxX: x + h, minZ: z - h, maxZ: z + h });
    }
  }
  return solids;
}

/**
 * A pool: its basin (a tiled bed `depth` below `y` and its walls round
 * `outline`) and its water just under `y`.
 */
export function pool(
  stage: PoolStage,
  outline: readonly Point[],
  y: number,
  depth: number,
  basin: Material,
  waterMaterial: Material,
) {
  surface(stage, outline, y - depth, basin);
  ribbon(stage, outline, y - depth, y, basin, true);
  return surface(stage, outline, y - 0.08, waterMaterial);
}

export { insidePolygon };

// ---- Fittings ----------------------------------------------------------------

const halos = new WeakMap<PoolStage, Record<string, SpriteMaterial>>();
/** A soft additive glow round a lamp. */
export function halo(stage: PoolStage, colour = '235, 245, 255', size = 1) {
  let byColour = halos.get(stage);
  if (!byColour) halos.set(stage, (byColour = {}));
  let material = byColour[colour];
  if (!material) {
    const c2 = document.createElement('canvas');
    c2.width = c2.height = 64;
    const c = c2.getContext('2d')!;
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${colour}, 0.85)`);
    g.addColorStop(0.3, `rgba(${colour}, 0.25)`);
    g.addColorStop(1, `rgba(${colour}, 0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    const texture = stage.texture(new CanvasTexture(c2));
    texture.colorSpace = SRGBColorSpace;
    material = byColour[colour] = stage.keep(
      new SpriteMaterial({
        map: texture,
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
    );
  }
  const sprite = new Sprite(material);
  sprite.scale.setScalar(size);
  return sprite;
}

/**
 * A porthole lamp: a glowing oval `w` by `h` metres set in a wall at
 * (x, y, z), facing `yaw` (0 faces +z), with its rim and its glow.
 */
export function porthole(
  stage: PoolStage,
  x: number,
  y: number,
  z: number,
  yaw: number,
  { w = 0.4, h = 0.6, warm = true } = {},
) {
  const group = new Group();
  group.position.set(x, y, z);
  group.rotation.y = yaw;
  const glass = new Mesh(
    new CylinderGeometry(0.5, 0.5, 0.04, 32),
    stage.keep(new MeshBasicMaterial({ color: warm ? '#fff1d2' : '#f2f8ff' })),
  );
  glass.rotation.x = Math.PI / 2;
  glass.scale.set(w, 1, h);
  group.add(glass);
  const rim = new Mesh(
    new CylinderGeometry(0.56, 0.56, 0.03, 32, 1, true),
    stage.keep(
      new MeshStandardMaterial({
        color: '#c9ccc8',
        metalness: 0.6,
        roughness: 0.3,
        side: DoubleSide,
      }),
    ),
  );
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(w, 1, h);
  group.add(rim);
  const glow = halo(
    stage,
    warm ? '255, 232, 196' : '235, 245, 255',
    Math.max(w, h) * 4,
  );
  glow.position.z = 0.15;
  group.add(glow);
  stage.world.add(group);
  return group;
}

/** A square downlight in a ceiling at (x, y, z), `size` metres. */
export function downlight(
  stage: PoolStage,
  x: number,
  y: number,
  z: number,
  size = 0.3,
  warm = false,
) {
  const lamp = new Mesh(
    new PlaneGeometry(size, size),
    stage.keep(
      new MeshBasicMaterial({
        color: warm ? '#fff1d2' : '#f6fbff',
        side: DoubleSide,
      }),
    ),
  );
  lamp.rotation.x = Math.PI / 2;
  lamp.position.set(x, y - 0.01, z);
  stage.world.add(lamp);
  const glow = halo(stage, warm ? '255, 232, 196' : '235, 245, 255', size * 5);
  glow.position.set(x, y - 0.2, z);
  stage.world.add(glow);
}

/** A stainless handrail along points (x, y, z), its posts every `pitch` metres. */
export function handrail(
  stage: PoolStage,
  points: readonly (readonly [number, number, number])[],
  { height = 0.95, pitch = 1.5 } = {},
) {
  const steel = stage.keep(
    new MeshStandardMaterial({
      // Satin, not mirror: a room with nothing to reflect turns mirror steel black.
      color: '#dfe3e3',
      metalness: 0.35,
      roughness: 0.35,
    }),
  );
  const curve = new CatmullRomCurve3(
    points.map(([x, y, z]) => new Vector3(x, y + height, z)),
  );
  stage.world.add(
    new Mesh(
      new TubeGeometry(curve, Math.max(8, points.length * 6), 0.025, 8),
      steel,
    ),
  );
  const length = curve.getLength();
  const n = Math.max(1, Math.round(length / pitch));
  for (let i = 0; i <= n; i++) {
    const p = curve.getPointAt(i / n);
    const post = new Mesh(new CylinderGeometry(0.02, 0.02, height, 8), steel);
    post.position.set(p.x, p.y - height / 2, p.z);
    stage.world.add(post);
  }
}

/** A fat round column at (x, z) from `y0` to `y1`, `r` metres, tapering to `top` × r. */
export function column(
  stage: PoolStage,
  x: number,
  z: number,
  r: number,
  y0: number,
  y1: number,
  material: Material,
  top = 1,
) {
  const geometry = metreUVs(
    new CylinderGeometry(r * top, r, y1 - y0, 40, 1, true),
    2 * Math.PI * r,
    y1 - y0,
  );
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, (y0 + y1) / 2, z);
  stage.world.add(mesh);
  return mesh;
}

/**
 * A printed sign or plate: `lines` of text on a `w` by `h` metre panel,
 * in `ink` on `background`, facing +z (turn it with `yaw`).
 */
export function sign(
  stage: PoolStage,
  lines: readonly string[],
  w: number,
  h: number,
  {
    background = '#f4f4ef',
    ink = '#1a1a1a',
    font = 'bold Arial, Helvetica, sans-serif',
  } = {},
) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(16, Math.round((512 * h) / w));
  const c = canvas.getContext('2d')!;
  c.fillStyle = background;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = ink;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const rows = lines.length;
  let size = Math.round((canvas.height / rows) * 0.62);
  const widest = () => Math.max(...lines.map((l) => c.measureText(l).width));
  c.font = `${size}px ${font}`;
  while (size > 8 && widest() > canvas.width * 0.9) {
    size -= 1;
    c.font = `${size}px ${font}`;
  }
  lines.forEach((line, i) =>
    c.fillText(line, canvas.width / 2, (canvas.height * (i + 0.5)) / rows),
  );
  const texture = stage.texture(new CanvasTexture(canvas));
  texture.colorSpace = SRGBColorSpace;
  return new Mesh(
    new PlaneGeometry(w, h),
    stage.keep(new MeshStandardMaterial({ map: texture, roughness: 0.6 })),
  );
}

/** A box, its tiles in metres, centred at (x, y, z). */
export function block(
  stage: PoolStage,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  material: Material,
  parent: Object3D = stage.world,
) {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/** A white plastic garden chair, standing at (x, y, z), facing `yaw`. */
export function plasticChair(
  stage: PoolStage,
  x: number,
  y: number,
  z: number,
  yaw = 0,
) {
  const white = stage.keep(
    new MeshStandardMaterial({ color: '#f3f3ef', roughness: 0.35 }),
  );
  const chair = new Group();
  chair.position.set(x, y, z);
  chair.rotation.y = yaw;
  for (const [lx, lz] of [
    [-0.22, -0.2],
    [0.22, -0.2],
    [-0.22, 0.22],
    [0.22, 0.22],
  ] as const) {
    const leg = new Mesh(new CylinderGeometry(0.025, 0.03, 0.45, 8), white);
    leg.position.set(lx, 0.22, lz);
    chair.add(leg);
  }
  block(stage, 0.5, 0.04, 0.48, 0, 0.46, 0, white, chair);
  const back = block(stage, 0.5, 0.42, 0.04, 0, 0.7, -0.24, white, chair);
  back.rotation.x = -0.15;
  block(stage, 0.04, 0.04, 0.42, -0.25, 0.64, 0, white, chair);
  block(stage, 0.04, 0.04, 0.42, 0.25, 0.64, 0, white, chair);
  stage.world.add(chair);
  return chair;
}
