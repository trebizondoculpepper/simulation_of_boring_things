import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  Float32BufferAttribute,
  CanvasTexture,
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PCFSoftShadowMap,
  PointLight,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Raycaster,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { Material, Object3D, Texture } from 'three';
import { METRE } from '../toolkit/components/core/logic/units';
import { createRenderer } from '../toolkit/components/core/parts/render-style';
import { createFirstPerson } from '../toolkit/controls/input/first-person';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import {
  ALL_ZONES,
  DOOR_WIDTH,
  PLANT_ZONES,
  POOLS,
  SKYLIGHTS,
  SLIDES,
  SLIDE_RADIUS,
  LOUNGER,
  STAFF_DOORS,
  TIKI_BAR,
  WALL_HOLES,
  WINDOWS,
  arches,
  bankPlants,
  boardPlace,
  doorPlace,
  floorAt,
  lamps,
  loungerRect,
  loungers,
  plantDoor,
  riverLine,
  sideOf,
  wallRuns,
  zoneById,
  zoneFloor,
} from '../game/poolrooms-plan';
import type { Pool, Side, WallRun, Zone } from '../game/poolrooms-plan';

/**
 * The pool rooms, bare: a blockout of `src/game/poolrooms-plan.ts`, to
 * walk round and judge its shape before anything is dressed. White tile
 * everywhere, each zone tinted its own colour; pools as blue water in
 * pale basins, some to wade through; stairs and ramps between the four
 * levels; columns in the main hall, some standing in the pool; the
 * slide's tube from the spa down to the grotto, ridden by using its
 * mouth; skylights, windows onto bright nothing, and lamps (frosted
 * globes, sconces, posts); a winding river between flat decks, fake plants on its banks,
 * coming and going by culverts in the walls, sun loungers under its great
 * skylight and a tiki bar, closed; round arches over every opening and down the hall's two
 * arcades, each softly lit from below by uplighters at its feet; a water
 * treatment display board by every pool; and in every
 * zone a plain door marked AUTHORISED PERSONNEL ONLY, which, used, takes
 * the walker out of the pool rooms to a grey room standing in for its
 * plant room, whose own door takes them back. The plan is in metres; the
 * scene in `METRE` units.
 */

const WALL = 0.3;
/** The water lies this far below its zone's floor. */
const FREEBOARD = 0.08;

/** White glazed tile on a canvas, `tiles` a side, tinted. */
function tileTexture(tint: string) {
  const px = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const c = canvas.getContext('2d')!;
  c.fillStyle = new Color(tint).multiplyScalar(0.82).getStyle();
  c.fillRect(0, 0, px, px);
  const tiles = 4;
  const cell = px / tiles;
  for (let i = 0; i < tiles; i++)
    for (let j = 0; j < tiles; j++) {
      c.fillStyle = new Color(tint)
        .multiplyScalar(0.98 + ((i * 7 + j * 13) % 5) * 0.006)
        .getStyle();
      c.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
    }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

export function startPoolroomsWorld(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  scene.background = new Color('#dfeaea');
  scene.fog = new Fog('#dfeaea', 25 * m, 110 * m);
  const camera = new PerspectiveCamera(68, 1, 0.05 * m, 400 * m);
  // The sky's light everywhere, softly; and the sun, which comes in only
  // where a skylight or a window lets it, at a slant, casting shadows.
  scene.add(new HemisphereLight('#ffffff', '#a9bcbc', 1.25));
  const sun = new DirectionalLight('#fff4dc', 3.2);
  {
    // From the south-west, 55° up.
    const middle = new Vector3(-5, 0, -20).multiplyScalar(m);
    const from = new Vector3(-0.45, 1, 0.55).normalize();
    sun.position.copy(middle).addScaledVector(from, 200 * m);
    sun.target.position.copy(middle);
    scene.add(sun.target);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const reach = 95 * m;
    Object.assign(sun.shadow.camera, {
      left: -reach,
      right: reach,
      top: reach,
      bottom: -reach,
      near: 50 * m,
      far: 350 * m,
    });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03 * m;
  }
  scene.add(sun);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  // Nothing in the pool rooms moves: its shadows are drawn once.
  renderer.shadowMap.autoUpdate = false;
  const world = new Group();
  world.scale.setScalar(m);
  scene.add(world);

  const textures: Texture[] = [];
  const materials: Material[] = [];
  const keep = <T extends Material>(material: T) => {
    materials.push(material);
    return material;
  };
  /** A tiled material for a surface `w` by `h` metres, 0.5 m tiles. */
  const tiled = (tint: string, w: number, h: number) => {
    const texture = tileTexture(tint);
    texture.repeat.set(w / 2, h / 2);
    textures.push(texture);
    return keep(new MeshStandardMaterial({ map: texture, roughness: 0.3 }));
  };
  const water = keep(
    new MeshStandardMaterial({
      color: '#2f9fc4',
      transparent: true,
      opacity: 0.72,
      roughness: 0.08,
      metalness: 0.1,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  const basin = '#cfe9ef';

  const box = (
    parent: Object3D,
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  /** A zone's lowest and highest floor. */
  const span = (zone: Zone) => {
    const to = zone.to ?? zone.y;
    return { low: Math.min(zone.y, to), high: Math.max(zone.y, to) };
  };

  // ---- Floors, with holes for the pools, laid on their slopes ----------
  for (const zone of ALL_ZONES) {
    const r = zone.rect;
    const shape = new Shape();
    shape.moveTo(r.minX, r.minZ);
    shape.lineTo(r.maxX, r.minZ);
    shape.lineTo(r.maxX, r.maxZ);
    shape.lineTo(r.minX, r.maxZ);
    shape.closePath();
    for (const pool of POOLS.filter((p) => p.zone === zone.id)) {
      const hole = new Shape();
      const p = pool.rect;
      if (pool.course) {
        // The river's banks: its left edge down, its right edge back,
        // kept just inside the zone where it runs into the walls.
        const line = riverLine(pool);
        const half = pool.width! / 2;
        const edge = (side: number) =>
          line.map(
            (q) =>
              [
                q.x + side * q.nx * half,
                Math.min(
                  r.maxZ - 0.05,
                  Math.max(r.minZ + 0.05, q.z + side * q.nz * half),
                ),
              ] as const,
          );
        const outline = [...edge(1), ...edge(-1).reverse()];
        hole.moveTo(outline[0][0], outline[0][1]);
        for (const [x, z] of outline.slice(1)) hole.lineTo(x, z);
        hole.closePath();
      } else if (pool.round)
        hole.absarc(
          (p.minX + p.maxX) / 2,
          (p.minZ + p.maxZ) / 2,
          (p.maxX - p.minX) / 2,
          0,
          Math.PI * 2,
          true,
        );
      else {
        // Clipped to the zone: a pool may run on through its wall.
        const x0 = Math.max(p.minX, r.minX),
          x1 = Math.min(p.maxX, r.maxX);
        const z0 = Math.max(p.minZ, r.minZ),
          z1 = Math.min(p.maxZ, r.maxZ);
        hole.moveTo(x0, z0);
        hole.lineTo(x0, z1);
        hole.lineTo(x1, z1);
        hole.lineTo(x1, z0);
        hole.closePath();
      }
      shape.holes.push(hole);
    }
    const geometry = new ShapeGeometry(shape, 24);
    const position = geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i),
        z = position.getY(i);
      position.setXYZ(i, x, zoneFloor(zone, x, z), z);
    }
    geometry.computeVertexNormals();
    // Its tiles laid in world metres.
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, position.getX(i) / 2, position.getZ(i) / 2);
    const material = tiled(zone.tint, 2, 2);
    material.side = DoubleSide;
    world.add(new Mesh(geometry, material));
    // Its ceiling, flat, over its highest floor, its skylights cut out.
    const { high } = span(zone);
    const roof = new Shape();
    roof.moveTo(r.minX, r.minZ);
    roof.lineTo(r.maxX, r.minZ);
    roof.lineTo(r.maxX, r.maxZ);
    roof.lineTo(r.minX, r.maxZ);
    roof.closePath();
    for (const sky of SKYLIGHTS.filter((k) => k.zone === zone.id)) {
      const k = sky.rect;
      const hole = new Shape();
      if (sky.round)
        hole.absarc(
          (k.minX + k.maxX) / 2,
          (k.minZ + k.maxZ) / 2,
          (k.maxX - k.minX) / 2,
          0,
          Math.PI * 2,
          true,
        );
      else {
        hole.moveTo(k.minX, k.minZ);
        hole.lineTo(k.minX, k.maxZ);
        hole.lineTo(k.maxX, k.maxZ);
        hole.lineTo(k.maxX, k.minZ);
        hole.closePath();
      }
      roof.holes.push(hole);
    }
    const roofGeometry = new ShapeGeometry(roof, 32);
    const roofPosition = roofGeometry.getAttribute('position');
    for (let i = 0; i < roofPosition.count; i++)
      roofPosition.setXYZ(
        i,
        roofPosition.getX(i),
        high + zone.height,
        roofPosition.getY(i),
      );
    roofGeometry.computeVertexNormals();
    world.add(
      new Mesh(
        roofGeometry,
        keep(new MeshStandardMaterial({ color: zone.tint, side: DoubleSide })),
      ),
    );
  }

  // ---- Pools: basins and water ----------------------------------------
  const poolSolids: Footprint[] = [];
  const addPool = (pool: Pool) => {
    const zone = zoneById(pool.zone);
    const p = pool.rect;
    const cx = (p.minX + p.maxX) / 2,
      cz = (p.minZ + p.maxZ) / 2;
    const w = p.maxX - p.minX,
      d = p.maxZ - p.minZ;
    const at = zoneFloor(zone, cx, cz);
    const group = new Group();
    world.add(group);
    if (pool.course) {
      // A strip down its course: bed, banks and water.
      const line = riverLine(pool);
      const half = pool.width! / 2;
      const floor = zone.y;
      const strip = (
        a: (q: (typeof line)[number]) => readonly [number, number, number],
        b: (q: (typeof line)[number]) => readonly [number, number, number],
        material: Material,
      ) => {
        const positions: number[] = [];
        const uvs: number[] = [];
        let run = 0;
        for (let i = 1; i < line.length; i++) {
          const q0 = line[i - 1],
            q1 = line[i];
          const step = Math.hypot(q1.x - q0.x, q1.z - q0.z);
          const [a0, b0, a1, b1] = [a(q0), b(q0), a(q1), b(q1)];
          positions.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);
          const v0 = run / 2,
            v1 = (run + step) / 2;
          uvs.push(0, v0, 1, v0, 1, v1, 0, v0, 1, v1, 0, v1);
          run += step;
        }
        const geometry = new BufferGeometry();
        geometry.setAttribute(
          'position',
          new Float32BufferAttribute(positions, 3),
        );
        geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
        geometry.computeVertexNormals();
        group.add(new Mesh(geometry, material));
      };
      const at = (q: (typeof line)[number], side: number, y: number) =>
        [q.x + side * q.nx * half, y, q.z + side * q.nz * half] as const;
      const tiles = tiled(basin, 1.5, 1.5);
      tiles.side = DoubleSide;
      strip(
        (q) => at(q, 1, floor - pool.depth),
        (q) => at(q, -1, floor - pool.depth),
        tiles,
      );
      for (const side of [1, -1])
        strip(
          (q) => at(q, side, floor),
          (q) => at(q, side, floor - pool.depth),
          tiles,
        );
      strip(
        (q) => at(q, 1, floor - FREEBOARD),
        (q) => at(q, -1, floor - FREEBOARD),
        water,
      );
      return;
    }
    if (pool.round) {
      const r = w / 2;
      const shell = new Mesh(
        new CylinderGeometry(r, r, pool.depth, 40, 1, true),
        keep(new MeshStandardMaterial({ color: basin, side: DoubleSide })),
      );
      shell.position.set(cx, at - pool.depth / 2, cz);
      group.add(shell);
      const bed = new Mesh(
        new CylinderGeometry(r, r, 0.05, 40),
        keep(new MeshStandardMaterial({ color: basin })),
      );
      bed.position.set(cx, at - pool.depth, cz);
      group.add(bed);
      const surface = new Mesh(new CylinderGeometry(r, r, 0.01, 40), water);
      surface.position.set(cx, at - FREEBOARD, cz);
      group.add(surface);
    } else {
      // A sloped zone's pool follows it: its basin a box sheared to the
      // ramp, drawn as a bed and four walls.
      const slope = (x: number, z: number) => zoneFloor(zone, x, z);
      const corners: [number, number][] = [
        [p.minX, p.minZ],
        [p.maxX, p.minZ],
        [p.maxX, p.maxZ],
        [p.minX, p.maxZ],
      ];
      const quad = (
        points: readonly (readonly [number, number, number])[],
        material: Material,
      ) => {
        const geometry = new PlaneGeometry(1, 1);
        const pos = geometry.getAttribute('position');
        // PlaneGeometry's corners: top-left, top-right, bottom-left, bottom-right.
        const order = [0, 1, 3, 2];
        order.forEach((corner, i) =>
          pos.setXYZ(
            i,
            points[corner][0],
            points[corner][1],
            points[corner][2],
          ),
        );
        geometry.computeVertexNormals();
        const mesh = new Mesh(geometry, material);
        group.add(mesh);
        return mesh;
      };
      const tiles = tiled(basin, w, d);
      tiles.side = DoubleSide;
      quad(
        corners.map(([x, z]) => [x, slope(x, z) - pool.depth, z] as const),
        tiles,
      );
      for (let i = 0; i < 4; i++) {
        const [ax, az] = corners[i];
        const [bx, bz] = corners[(i + 1) % 4];
        quad(
          [
            [ax, slope(ax, az), az],
            [bx, slope(bx, bz), bz],
            [bx, slope(bx, bz) - pool.depth, bz],
            [ax, slope(ax, az) - pool.depth, az],
          ],
          tiles,
        );
      }
      quad(
        corners.map(([x, z]) => [x, slope(x, z) - FREEBOARD, z] as const),
        water,
      );
    }
    if (!pool.wade)
      poolSolids.push({
        minX: p.minX * m,
        maxX: p.maxX * m,
        minZ: p.minZ * m,
        maxZ: p.maxZ * m,
      });
  };
  for (const pool of POOLS) addPool(pool);

  const frameMaterial = keep(
    new MeshStandardMaterial({
      color: '#d9dedd',
      roughness: 0.5,
      metalness: 0.2,
    }),
  );
  const lampSolids: Footprint[] = [];

  // ---- Walls, with the slide's holes ------------------------------------
  const wallSolids: Footprint[] = [];
  const wallFootprint = (run: WallRun): Footprint =>
    run.along === 'x'
      ? {
          minX: run.from * m,
          maxX: run.to * m,
          minZ: (run.at - WALL / 2) * m,
          maxZ: (run.at + WALL / 2) * m,
        }
      : {
          minX: (run.at - WALL / 2) * m,
          maxX: (run.at + WALL / 2) * m,
          minZ: run.from * m,
          maxZ: run.to * m,
        };
  const wallMaterials = new Map<string, Material>();
  for (const run of wallRuns()) {
    const zone = zoneById(run.zone);
    const { low, high } = span(zone);
    const bottom = low - 0.6;
    const top = high + zone.height;
    let material = wallMaterials.get(zone.id);
    if (!material) {
      material = tiled(zone.tint, 4, 4);
      wallMaterials.set(zone.id, material);
    }
    // Pieces: around each hole in it, full height elsewhere.
    // The slide's and the river's holes, and its windows.
    const holes = [
      ...WALL_HOLES,
      ...WINDOWS.map((w) => ({
        ...w,
        bottom: zoneById(w.zone).y + w.sill,
        top: zoneById(w.zone).y + w.head,
      })),
    ]
      .filter(
        (h) =>
          h.zone === run.zone &&
          h.side === run.side &&
          h.from >= run.from &&
          h.to <= run.to,
      )
      .sort((a, b) => a.from - b.from);
    // Its own half of the wall's thickness, on its side of the line, so a
    // wall two zones share shows each its own face and neither fights.
    const inward = { north: 1, south: -1, west: 1, east: -1 }[run.side];
    const line = run.at + (inward * WALL) / 4;
    const piece = (from: number, to: number, y0: number, y1: number) => {
      if (to - from < 0.001 || y1 - y0 < 0.001) return;
      const mid = (from + to) / 2;
      return run.along === 'x'
        ? box(
            world,
            material!,
            to - from,
            y1 - y0,
            WALL / 2,
            mid,
            (y0 + y1) / 2,
            line,
          )
        : box(
            world,
            material!,
            WALL / 2,
            y1 - y0,
            to - from,
            line,
            (y0 + y1) / 2,
            mid,
          );
    };
    let from = run.from;
    for (const hole of holes) {
      piece(from, hole.from, bottom, top);
      piece(hole.from, hole.to, bottom, hole.bottom);
      piece(hole.from, hole.to, hole.top, top);
      from = hole.to;
    }
    piece(from, run.to, bottom, top);
    wallSolids.push(wallFootprint(run));
  }

  // ---- The main hall's columns, some standing in the water --------------
  const column = keep(
    new MeshStandardMaterial({ color: '#f4f7f7', roughness: 0.4 }),
  );
  const columnSolids: Footprint[] = [];
  const hall = zoneById('hall');
  for (let x = -16; x <= 16; x += 8)
    for (let z = -24; z <= 24; z += 8) {
      const mesh = new Mesh(
        new CylinderGeometry(0.45, 0.45, hall.height + 3, 20),
        column,
      );
      mesh.position.set(x, (hall.height - 3) / 2, z);
      world.add(mesh);
      columnSolids.push({
        minX: (x - 0.5) * m,
        maxX: (x + 0.5) * m,
        minZ: (z - 0.5) * m,
        maxZ: (z + 0.5) * m,
      });
    }

  // ---- Skylights: light wells up to glowing panes ---------------------------
  const daylight = keep(new MeshBasicMaterial({ color: '#f7fcff' }));
  const well = keep(
    new MeshStandardMaterial({ color: '#f2f6f6', side: DoubleSide }),
  );
  for (const sky of SKYLIGHTS) {
    const zone = zoneById(sky.zone);
    const k = sky.rect;
    const top = span(zone).high + zone.height;
    const cx = (k.minX + k.maxX) / 2,
      cz = (k.minZ + k.maxZ) / 2;
    const w = k.maxX - k.minX,
      d = k.maxZ - k.minZ;
    const deep = 0.8;
    if (sky.round) {
      const shaft = new Mesh(
        new CylinderGeometry(w / 2, w / 2, deep, 40, 1, true),
        well,
      );
      shaft.position.set(cx, top + deep / 2, cz);
      world.add(shaft);
      const pane = new Mesh(
        new CylinderGeometry(w / 2, w / 2, 0.02, 40),
        daylight,
      );
      pane.position.set(cx, top + deep, cz);
      world.add(pane);
    } else {
      box(world, well, w, deep, 0.05, cx, top + deep / 2, k.minZ);
      box(world, well, w, deep, 0.05, cx, top + deep / 2, k.maxZ);
      box(world, well, 0.05, deep, d, k.minX, top + deep / 2, cz);
      box(world, well, 0.05, deep, d, k.maxX, top + deep / 2, cz);
      box(world, daylight, w, 0.02, d, cx, top + deep, cz);
      // Its glazing bars.
      for (let x = k.minX + 1; x < k.maxX - 0.5; x += 1)
        box(world, frameMaterial, 0.04, 0.04, d, x, top + deep - 0.03, cz);
    }
  }

  // ---- Windows onto bright nothing --------------------------------------
  const glass = keep(
    new MeshBasicMaterial({
      color: '#eef8fb',
      transparent: true,
      opacity: 0.92,
    }),
  );
  for (const w of WINDOWS) {
    const zone = zoneById(w.zone);
    const s = sideOf(zone.rect, w.side);
    const y0 = zone.y + w.sill,
      y1 = zone.y + w.head;
    const mid = (w.from + w.to) / 2;
    const width = w.to - w.from;
    const pane = new Mesh(new PlaneGeometry(width, y1 - y0), glass);
    const out = { north: -1, south: 1, west: -1, east: 1 }[w.side] * (WALL / 2);
    if (s.along === 'x') pane.position.set(mid, (y0 + y1) / 2, s.at + out);
    else {
      pane.rotation.y = Math.PI / 2;
      pane.position.set(s.at + out, (y0 + y1) / 2, mid);
    }
    world.add(pane);
    // Mullions about a metre apart, and a transom two-thirds up.
    const bars = Math.max(1, Math.round(width / 1.2));
    for (let i = 1; i < bars; i++) {
      const u = w.from + (i * width) / bars;
      if (s.along === 'x')
        box(world, frameMaterial, 0.06, y1 - y0, 0.08, u, (y0 + y1) / 2, s.at);
      else
        box(world, frameMaterial, 0.08, y1 - y0, 0.06, s.at, (y0 + y1) / 2, u);
    }
    const transom = y0 + (y1 - y0) * 0.66;
    if (s.along === 'x')
      box(world, frameMaterial, width, 0.06, 0.08, mid, transom, s.at);
    else box(world, frameMaterial, 0.08, 0.06, width, s.at, transom, mid);
  }

  // ---- Lamps ----------------------------------------------------------------
  const halo = (warm: boolean) => {
    const c2 = document.createElement('canvas');
    c2.width = c2.height = 64;
    const c = c2.getContext('2d')!;
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    const tint = warm ? '255, 200, 140' : '235, 245, 255';
    g.addColorStop(0, `rgba(${tint}, 0.8)`);
    g.addColorStop(0.3, `rgba(${tint}, 0.25)`);
    g.addColorStop(1, `rgba(${tint}, 0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    const texture = new CanvasTexture(c2);
    texture.colorSpace = SRGBColorSpace;
    textures.push(texture);
    return keep(
      new SpriteMaterial({
        map: texture,
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
    );
  };
  const halos = { cool: halo(false), warm: halo(true) };
  const bulbs = {
    cool: keep(new MeshBasicMaterial({ color: '#f8fbff' })),
    warm: keep(new MeshBasicMaterial({ color: '#ffd9a8' })),
  };
  const rod = keep(
    new MeshStandardMaterial({
      color: '#b9bec0',
      metalness: 0.6,
      roughness: 0.35,
    }),
  );
  for (const lamp of lamps()) {
    const zone = zoneById(lamp.zone);
    const tone = lamp.warm ? 'warm' : 'cool';
    const at = new Vector3(lamp.x, lamp.y, lamp.z);
    let radius = 0.22;
    if (lamp.kind === 'sconce') {
      // On its wall, standing out from it.
      const inward = {
        north: [0, 1],
        south: [0, -1],
        west: [1, 0],
        east: [-1, 0],
      }[lamp.side!];
      at.x += inward[0] * (WALL / 2 + 0.12);
      at.z += inward[1] * (WALL / 2 + 0.12);
      radius = 0.14;
      box(
        world,
        rod,
        inward[0] ? 0.2 : 0.12,
        0.04,
        inward[1] ? 0.2 : 0.12,
        at.x - inward[0] * 0.06,
        at.y - 0.12,
        at.z - inward[1] * 0.06,
      );
    } else if (lamp.kind === 'pendant') {
      const top = span(zone).high + zone.height;
      const length = top - lamp.y;
      const hanger = new Mesh(
        new CylinderGeometry(0.015, 0.015, length, 6),
        rod,
      );
      hanger.position.set(lamp.x, lamp.y + length / 2, lamp.z);
      world.add(hanger);
      radius = 0.32;
    } else if (lamp.kind === 'post') {
      const floor = zoneFloor(zone, lamp.x, lamp.z);
      const pole = new Mesh(
        new CylinderGeometry(0.035, 0.05, lamp.y - floor, 10),
        rod,
      );
      pole.position.set(lamp.x, (lamp.y + floor) / 2, lamp.z);
      world.add(pole);
      lampSolids.push({
        minX: (lamp.x - 0.15) * m,
        maxX: (lamp.x + 0.15) * m,
        minZ: (lamp.z - 0.15) * m,
        maxZ: (lamp.z + 0.15) * m,
      });
    }
    const bulb = new Mesh(new SphereGeometry(radius, 20, 14), bulbs[tone]);
    bulb.position.copy(at);
    world.add(bulb);
    const glow = new Sprite(halos[tone]);
    glow.scale.setScalar(radius * 9);
    glow.position.copy(at);
    world.add(glow);
    // Below ground, the lamps are all the light there is.
    if (lamp.warm) {
      const light = new PointLight('#ffc98a', 6, 12, 1.6);
      light.position.copy(at);
      world.add(light);
    }
  }

  // ---- Arches, and the uplighters at their feet ----------------------------
  // A glow rising from the floor and fading, for an uplighter's wash.
  const washCanvas = document.createElement('canvas');
  washCanvas.width = 8;
  washCanvas.height = 128;
  {
    const c = washCanvas.getContext('2d')!;
    const g = c.createLinearGradient(0, 128, 0, 0);
    g.addColorStop(0, 'rgba(255, 236, 205, 0.9)');
    g.addColorStop(0.35, 'rgba(255, 236, 205, 0.35)');
    g.addColorStop(1, 'rgba(255, 236, 205, 0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 8, 128);
  }
  const washTexture = new CanvasTexture(washCanvas);
  washTexture.colorSpace = SRGBColorSpace;
  textures.push(washTexture);
  const wash = keep(
    new MeshBasicMaterial({
      map: washTexture,
      transparent: true,
      opacity: 0.55,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  const fitting = keep(new MeshBasicMaterial({ color: '#fff3dc' }));
  const archStone = keep(
    new MeshStandardMaterial({ color: '#f3f5f4', roughness: 0.45 }),
  );
  for (const arch of arches()) {
    const mid = (arch.from + arch.to) / 2;
    const radius = (arch.to - arch.from) / 2;
    // The wall over it: from its spring to the taller zone's ceiling, its
    // head cut out.
    const shape = new Shape();
    shape.moveTo(arch.from, arch.spring);
    shape.lineTo(arch.from, arch.wallTop);
    shape.lineTo(arch.to, arch.wallTop);
    shape.lineTo(arch.to, arch.spring);
    shape.absellipse(mid, arch.spring, radius, arch.rise, 0, Math.PI, false);
    const geometry = new ExtrudeGeometry(shape, {
      depth: arch.thickness,
      bevelEnabled: false,
      curveSegments: 24,
    });
    const head = new Mesh(geometry, archStone);
    const half = arch.thickness / 2;
    if (arch.along === 'x') head.position.set(0, 0, arch.at - half);
    else {
      head.rotation.y = -Math.PI / 2;
      head.position.set(arch.at + half, 0, 0);
    }
    world.add(head);
    // An uplighter at each of its feet, washing light up its jambs.
    const rise = arch.spring + arch.rise * 0.6 - arch.floor;
    for (const [u, facing] of [
      [arch.from, 1],
      [arch.to, -1],
    ] as const) {
      const glow = new Mesh(new PlaneGeometry(arch.thickness, rise), wash);
      const lamp = new Mesh(new BoxGeometry(0.18, 0.04, 0.12), fitting);
      // Just inside the opening, a hand's width off its jamb.
      const off = u + facing * 0.03;
      if (arch.along === 'x') {
        glow.rotation.y = Math.PI / 2;
        glow.position.set(off, arch.floor + rise / 2, arch.at);
        lamp.position.set(u + facing * 0.15, arch.floor + 0.02, arch.at);
      } else {
        glow.position.set(arch.at, arch.floor + rise / 2, off);
        lamp.position.set(arch.at, arch.floor + 0.02, u + facing * 0.15);
      }
      world.add(glow, lamp);
    }
  }

  // ---- Culverts: dark tunnels behind the holes the river runs through ----
  const culvert = keep(
    new MeshStandardMaterial({
      color: '#2b3634',
      roughness: 0.8,
      side: DoubleSide,
    }),
  );
  for (const hole of WALL_HOLES.filter((h) => h.bottom < zoneById(h.zone).y)) {
    const zone = zoneById(hole.zone);
    const s2 = { north: -1, south: 1, west: -1, east: 1 }[hole.side];
    const line = hole.side === 'north' ? zone.rect.minZ : zone.rect.maxZ;
    const w = hole.to - hole.from;
    const mid = (hole.from + hole.to) / 2;
    const deep = 4;
    const cz = line + s2 * (WALL / 2 + deep / 2);
    const h = hole.top - hole.bottom;
    box(world, culvert, w, 0.1, deep, mid, hole.top, cz);
    box(world, culvert, 0.1, h, deep, hole.from, hole.bottom + h / 2, cz);
    box(world, culvert, 0.1, h, deep, hole.to, hole.bottom + h / 2, cz);
    box(
      world,
      culvert,
      w + 0.2,
      h,
      0.1,
      mid,
      hole.bottom + h / 2,
      line + s2 * (WALL / 2 + deep),
    );
    box(world, culvert, w, 0.1, deep, mid, hole.bottom, cz);
    const surface = new Mesh(new PlaneGeometry(w, deep + WALL), water);
    surface.rotation.x = -Math.PI / 2;
    surface.position.set(mid, zone.y - FREEBOARD, line + s2 * (deep / 2));
    world.add(surface);
  }

  // ---- Fake plants on the river's banks -------------------------------------
  const planter = keep(
    new MeshStandardMaterial({ color: '#f1f1ee', roughness: 0.25 }),
  );
  const soil = keep(
    new MeshStandardMaterial({ color: '#3b2f25', roughness: 0.9 }),
  );
  const plastic = [
    keep(
      new MeshStandardMaterial({
        color: '#2f8a3a',
        roughness: 0.35,
        side: DoubleSide,
      }),
    ),
    keep(
      new MeshStandardMaterial({
        color: '#4aa33e',
        roughness: 0.35,
        side: DoubleSide,
      }),
    ),
  ];
  const trunk = keep(
    new MeshStandardMaterial({ color: '#7a6448', roughness: 0.6 }),
  );
  const plantSolids: Footprint[] = [];
  bankPlants().forEach((plant, n) => {
    const group = new Group();
    group.position.set(plant.x, plant.y, plant.z);
    group.rotation.y = n * 2.1;
    world.add(group);
    const potR = plant.kind === 'palm' ? 0.32 : 0.26;
    const potH = plant.kind === 'palm' ? 0.55 : 0.45;
    const pot = new Mesh(
      new CylinderGeometry(potR, potR * 0.8, potH, 20),
      planter,
    );
    pot.position.y = potH / 2;
    group.add(pot);
    const earth = new Mesh(
      new CylinderGeometry(potR * 0.92, potR * 0.92, 0.02, 20),
      soil,
    );
    earth.position.y = potH - 0.04;
    group.add(earth);
    const leaf = (
      length: number,
      width: number,
      droop: number,
      turn: number,
      lift: number,
      y: number,
      i: number,
    ) => {
      // A leaf: a long flat diamond, tilted out and drooping.
      const geometry = new BufferGeometry();
      const tip = [0, -droop, length];
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute(
          [
            0,
            0,
            0,
            width / 2,
            0,
            length * 0.45,
            ...tip,
            0,
            0,
            0,
            ...tip,
            -width / 2,
            0,
            length * 0.45,
          ],
          3,
        ),
      );
      geometry.computeVertexNormals();
      const mesh = new Mesh(geometry, plastic[i % 2]);
      mesh.position.y = y;
      mesh.rotation.set(-lift, turn, 0, 'YXZ');
      group.add(mesh);
    };
    if (plant.kind === 'palm') {
      const stem = new Mesh(
        new CylinderGeometry(0.05, 0.08, plant.height - potH, 8),
        trunk,
      );
      stem.position.y = potH + (plant.height - potH) / 2;
      group.add(stem);
      for (let i = 0; i < 8; i++)
        leaf(1.1, 0.35, 0.5, (i / 8) * Math.PI * 2, 0.5, plant.height, i);
    } else if (plant.kind === 'fern') {
      for (let i = 0; i < 12; i++)
        leaf(
          0.6,
          0.18,
          0.35,
          (i / 12) * Math.PI * 2 + i * 0.2,
          0.9 - (i % 3) * 0.2,
          potH,
          i,
        );
    } else {
      // A monstera: a few broad leaves on long stalks.
      for (let i = 0; i < 6; i++) {
        const turn = (i / 6) * Math.PI * 2;
        const stalk = new Mesh(
          new ConeGeometry(0.015, plant.height - potH, 6),
          trunk,
        );
        stalk.position.set(
          Math.sin(turn) * 0.15,
          potH + (plant.height - potH) / 2,
          Math.cos(turn) * 0.15,
        );
        stalk.rotation.set(Math.cos(turn) * 0.3, 0, -Math.sin(turn) * 0.3);
        group.add(stalk);
        leaf(0.55, 0.45, 0.15, turn, 0.2, plant.height - 0.1 * (i % 2), i);
      }
    }
    plantSolids.push({
      minX: (plant.x - potR) * m,
      maxX: (plant.x + potR) * m,
      minZ: (plant.z - potR) * m,
      maxZ: (plant.z + potR) * m,
    });
  });

  // ---- Labels, drawn on canvases ---------------------------------------
  const printed = (
    w: number,
    h: number,
    draw: (c: CanvasRenderingContext2D, cw: number, ch: number) => void,
  ) => {
    const canvas2 = document.createElement('canvas');
    canvas2.width = 512;
    canvas2.height = Math.round((512 * h) / w);
    draw(canvas2.getContext('2d')!, canvas2.width, canvas2.height);
    const texture = new CanvasTexture(canvas2);
    texture.colorSpace = SRGBColorSpace;
    textures.push(texture);
    return new Mesh(
      new PlaneGeometry(w, h),
      keep(new MeshStandardMaterial({ map: texture, roughness: 0.6 })),
    );
  };
  /** Turn a thing to face into a zone from its `side` wall. */
  const facing: Record<Side, number> = {
    north: 0,
    south: Math.PI,
    west: Math.PI / 2,
    east: -Math.PI / 2,
  };

  // ---- The river room's lounge ----------------------------------------------
  const resin = keep(
    new MeshStandardMaterial({ color: '#f6f6f2', roughness: 0.35 }),
  );
  const furnitureSolids: Footprint[] = [];
  const solidOf = (r: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }) =>
    furnitureSolids.push({
      minX: r.minX * m,
      maxX: r.maxX * m,
      minZ: r.minZ * m,
      maxZ: r.maxZ * m,
    });
  const sunLoungers = loungers();
  for (const l of sunLoungers) {
    // A white resin lounger: legs, a slatted bed, its back raised at its head.
    const group = new Group();
    group.position.set(l.x, 0, l.z);
    group.rotation.y = l.yaw;
    world.add(group);
    const L = LOUNGER.length,
      W = LOUNGER.width;
    for (const z of [-L / 2 + 0.15, L / 2 - 0.15])
      for (const x of [-W / 2 + 0.06, W / 2 - 0.06])
        box(group, resin, 0.05, 0.3, 0.05, x, 0.15, z);
    box(group, resin, W, 0.04, 0.05, 0, 0.31, -L / 2 + 0.6);
    for (let i = 0; i < 9; i++)
      box(group, resin, W - 0.06, 0.03, 0.1, 0, 0.33, -L / 2 + 0.75 + i * 0.14);
    const back = new Group();
    back.position.set(0, 0.33, -L / 2 + 0.68);
    back.rotation.x = -0.75;
    group.add(back);
    for (let i = 0; i < 5; i++)
      box(back, resin, W - 0.06, 0.03, 0.1, 0, 0, -0.07 - i * 0.13);
    box(group, resin, 0.03, 0.04, L - 0.2, -W / 2 + 0.02, 0.32, 0.05);
    box(group, resin, 0.03, 0.04, L - 0.2, W / 2 - 0.02, 0.32, 0.05);
    solidOf(loungerRect(l));
  }
  // A small round table between neighbouring loungers.
  for (let i = 1; i < sunLoungers.length; i++) {
    const a = sunLoungers[i - 1],
      b = sunLoungers[i];
    if (Math.abs(a.z - b.z) > 0.01 || Math.abs(a.x - b.x) > 1.6) continue;
    const top = new Mesh(new CylinderGeometry(0.22, 0.22, 0.03, 20), resin);
    top.position.set((a.x + b.x) / 2, 0.45, a.z - 0.5);
    const stem = new Mesh(new CylinderGeometry(0.03, 0.12, 0.45, 12), resin);
    stem.position.set((a.x + b.x) / 2, 0.22, a.z - 0.5);
    world.add(top, stem);
  }
  {
    // The tiki bar, closed for the day.
    const r = TIKI_BAR.rect;
    const cx = (r.minX + r.maxX) / 2,
      cz = (r.minZ + r.maxZ) / 2;
    const w = r.maxX - r.minX,
      d = r.maxZ - r.minZ;
    const bamboo = keep(
      new MeshStandardMaterial({ color: '#c9a86a', roughness: 0.6 }),
    );
    const thatch = keep(
      new MeshStandardMaterial({ color: '#b98a45', roughness: 0.95 }),
    );
    const shutter = keep(
      new MeshStandardMaterial({
        color: '#9aa1a3',
        metalness: 0.4,
        roughness: 0.45,
      }),
    );
    // Its counter, clad in bamboo, its top a dark board.
    box(world, bamboo, w, 1.05, d - 0.6, cx, 0.525, cz + 0.3);
    box(
      world,
      keep(new MeshStandardMaterial({ color: '#5a3d22', roughness: 0.5 })),
      w + 0.15,
      0.06,
      d - 0.35,
      cx,
      1.08,
      cz + 0.25,
    );
    for (let x = r.minX + 0.1; x < r.maxX; x += 0.18) {
      const cane = new Mesh(new CylinderGeometry(0.04, 0.04, 1.0, 8), bamboo);
      cane.position.set(x, 0.5, r.minZ + 0.32);
      world.add(cane);
    }
    // Posts at its corners, and its thatched roof.
    for (const [x, z] of [
      [r.minX, r.minZ],
      [r.maxX, r.minZ],
      [r.minX, r.maxZ],
      [r.maxX, r.maxZ],
    ] as const) {
      const post = new Mesh(new CylinderGeometry(0.07, 0.08, 2.7, 10), bamboo);
      post.position.set(x, 1.35, z);
      world.add(post);
    }
    const roof = new Mesh(
      new ConeGeometry(Math.hypot(w, d) / 2 + 0.9, 1.4, 4, 1, true),
      thatch,
    );
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(
      (w / Math.hypot(w, d)) * 1.4,
      1,
      (d / Math.hypot(w, d)) * 1.4,
    );
    roof.position.set(cx, 2.7 + 0.7, cz);
    (roof.material as MeshStandardMaterial).side = DoubleSide;
    world.add(roof);
    // Its shutter down across the serving hatch, from counter to roof.
    box(world, shutter, w - 0.2, 1.5, 0.05, cx, 1.85, r.minZ + 0.35);
    for (let y = 1.15; y < 2.6; y += 0.1)
      box(world, shutter, w - 0.2, 0.012, 0.06, cx, y, r.minZ + 0.35);
    const closed = printed(0.7, 0.28, (c, cw, ch) => {
      c.fillStyle = '#b8281e';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#ffffff';
      c.font = `bold ${Math.round(ch * 0.55)}px Arial, Helvetica, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('CLOSED', cw / 2, ch / 2);
    });
    closed.position.set(cx, 1.9, r.minZ + 0.32);
    closed.rotation.y = Math.PI;
    world.add(closed);
    // Its stools, turned up on the counter, legs in the air.
    for (let i = 0; i < 4; i++) {
      const stool = new Group();
      stool.position.set(
        r.minX + 0.6 + i * ((w - 1.2) / 3),
        1.11,
        r.minZ + 0.2,
      );
      stool.rotation.x = Math.PI;
      world.add(stool);
      const seat = new Mesh(new CylinderGeometry(0.18, 0.18, 0.05, 16), bamboo);
      stool.add(seat);
      for (let k = 0; k < 4; k++) {
        const leg = new Mesh(new CylinderGeometry(0.02, 0.02, 0.6, 6), bamboo);
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        leg.position.set(Math.cos(a) * 0.12, 0.3, Math.sin(a) * 0.12);
        stool.add(leg);
      }
    }
    // Its drinks board, on a post beside it.
    const menu = printed(0.6, 0.85, (c, cw, ch) => {
      c.fillStyle = '#20262a';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#f2f0e6';
      c.textAlign = 'center';
      c.font = `bold ${Math.round(ch * 0.075)}px Georgia, serif`;
      c.fillText('LAGOON BAR', cw / 2, ch * 0.11);
      c.font = `${Math.round(ch * 0.045)}px Georgia, serif`;
      const drinks = [
        ['Piña colada', '4.50'],
        ['Mai tai', '4.75'],
        ['Blue lagoon', '4.25'],
        ['Fruit punch', '2.50'],
        ['Iced tea', '1.80'],
        ['Mineral water', '1.20'],
      ];
      drinks.forEach(([name, price], i) => {
        const y = ch * (0.24 + i * 0.1);
        c.textAlign = 'left';
        c.fillText(name, cw * 0.1, y);
        c.textAlign = 'right';
        c.fillText(price, cw * 0.9, y);
      });
      c.textAlign = 'center';
      c.font = `italic ${Math.round(ch * 0.05)}px Georgia, serif`;
      c.fillText('Open 11 till late', cw / 2, ch * 0.9);
    });
    menu.position.set(r.minX - 0.6, 1.4, r.minZ - 0.1);
    menu.rotation.y = Math.PI;
    world.add(menu);
    box(world, bamboo, 0.06, 1.4, 0.06, r.minX - 0.6, 0.7, r.minZ - 0.05);
    solidOf({
      minX: r.minX - 0.1,
      maxX: r.maxX + 0.1,
      minZ: r.minZ - 0.1,
      maxZ: r.maxZ + 0.1,
    });
  }
  // ---- Staff doors, and the grey rooms beyond ----------------------------
  const usable = new Map<Object3D, () => void>();
  const doorLeaf = keep(
    new MeshStandardMaterial({ color: '#8a6a46', roughness: 0.7 }),
  );
  const frame = keep(
    new MeshStandardMaterial({ color: '#2b2e30', roughness: 0.6 }),
  );
  const door = (
    zone: Zone,
    side: Side,
    at: number,
    sign: string,
    go: () => void,
  ) => {
    const place = doorPlace(zone, side, at);
    const group = new Group();
    group.position.set(place.x, place.y, place.z);
    group.rotation.y = facing[side];
    // Stand it on the wall's inner face.
    const inward = new Vector3(0, 0, WALL / 2 + 0.01).applyAxisAngle(
      new Vector3(0, 1, 0),
      facing[side],
    );
    group.position.add(inward);
    world.add(group);
    box(group, frame, DOOR_WIDTH + 0.12, 2.16, 0.04, 0, 1.08, 0);
    const leaf = box(group, doorLeaf, DOOR_WIDTH, 2.08, 0.05, 0, 1.04, 0.02);
    box(group, frame, 0.03, 0.03, 0.12, DOOR_WIDTH / 2 - 0.1, 1.0, 0.07);
    const plate = printed(0.5, 0.16, (c, w, h) => {
      c.fillStyle = '#f2f2ee';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#1a1a1a';
      c.font = `bold ${Math.round(h * 0.32)}px Arial, Helvetica, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const [a, b] = sign.split('\n');
      c.fillText(a, w / 2, h * (b ? 0.32 : 0.5));
      if (b) c.fillText(b, w / 2, h * 0.7);
    });
    plate.position.set(0, 1.55, 0.05);
    group.add(plate);
    usable.set(leaf, go);
    usable.set(plate, go);
  };
  const plantFor = new Map(PLANT_ZONES.map((p) => [p.id, p]));
  for (const staff of STAFF_DOORS) {
    const zone = zoneById(staff.zone);
    const plant = plantFor.get(staff.to)!;
    const back = doorPlace(zone, staff.side, staff.at).arrive;
    const into = plantDoor(plant).arrive;
    door(zone, staff.side, staff.at, 'AUTHORISED\nPERSONNEL ONLY', () =>
      walk.place(into.x * m, into.z * m, into.yaw, 0),
    );
    door(plant, 'west', (plant.rect.minZ + plant.rect.maxZ) / 2, 'POOL', () =>
      walk.place(back.x * m, back.z * m, back.yaw, 0),
    );
    // The grey room's card: what it stands in for.
    const card = printed(2.4, 0.5, (c, w, h) => {
      c.fillStyle = '#1f2a33';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      const text = plant.name.toUpperCase();
      let size = Math.round(h * 0.3);
      c.font = `bold ${size}px Arial, Helvetica, sans-serif`;
      // Shrunk to fit its card.
      while (size > 8 && c.measureText(text).width > w * 0.92) {
        size -= 1;
        c.font = `bold ${size}px Arial, Helvetica, sans-serif`;
      }
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, w / 2, h / 2);
    });
    card.position.set(
      plant.rect.maxX - WALL / 2 - 0.02,
      1.8,
      (plant.rect.minZ + plant.rect.maxZ) / 2,
    );
    card.rotation.y = -Math.PI / 2;
    world.add(card);
  }

  // ---- The slide, and its ride ------------------------------------------
  const rides: { curve: CatmullRomCurve3; length: number }[] = [];
  for (const slide of SLIDES) {
    const curve = new CatmullRomCurve3(
      slide.path.map(([x, y, z]) => new Vector3(x, y, z)),
    );
    const tube = new Mesh(
      new TubeGeometry(curve, 200, SLIDE_RADIUS, 16, false),
      keep(
        new MeshStandardMaterial({
          color: '#f2b233',
          roughness: 0.3,
          side: DoubleSide,
          transparent: true,
          opacity: 0.85,
        }),
      ),
    );
    world.add(tube);
    const ride = { curve, length: curve.getLength() };
    rides.push(ride);
    // Its mouth: a frame round its top end, used to ride it.
    const [x, y, z] = slide.path[0];
    const mouth = box(
      world,
      keep(new MeshStandardMaterial({ color: '#2f6fb0' })),
      0.2,
      1.6,
      1.6,
      x - 0.1,
      y,
      z,
    );
    usable.set(mouth, () => (riding = { ride, s: 0 }));
    const label = printed(0.8, 0.25, (c, w, h) => {
      c.fillStyle = '#2f6fb0';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.font = `bold ${Math.round(h * 0.5)}px Arial, Helvetica, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('SLIDE', w / 2, h / 2);
    });
    label.position.set(x - 0.21, y + 1.0, z);
    label.rotation.y = -Math.PI / 2;
    world.add(label);
  }
  let riding: { ride: (typeof rides)[number]; s: number } | null = null;
  const SLIDE_SPEED = 7;

  // ---- Water treatment display boards ------------------------------------
  /** What each board shows: for now, the readings of a pool kept well. */
  const readings = {
    chlorine: '1.2',
    combined: '0.2',
    ph: '7.4',
    tested: '10:00',
  };
  const temperatures: Record<string, string> = {
    SPA: '36.0',
    'TERRACE 1': '31.0',
    'TERRACE 2': '31.0',
    'TERRACE 3': '31.0',
    'SPLASH POOL': '30.0',
  };
  for (const pool of POOLS.filter((p) => p.board)) {
    const at = boardPlace(pool);
    const group = new Group();
    group.position.set(at.x, at.y, at.z);
    group.rotation.y = at.yaw;
    world.add(group);
    box(group, frame, 0.06, 1.2, 0.06, 0, 0.6, 0);
    const face = printed(0.6, 0.8, (c, w, h) => {
      c.fillStyle = '#123a73';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.font = `bold ${Math.round(h * 0.07)}px Arial, Helvetica, sans-serif`;
      c.fillText(pool.board!, w / 2, h * 0.1);
      c.font = `${Math.round(h * 0.045)}px Arial, Helvetica, sans-serif`;
      c.fillText('WATER TREATMENT', w / 2, h * 0.17);
      const rows: [string, string][] = [
        ['FREE CHLORINE', `${readings.chlorine} mg/l`],
        ['COMBINED CHLORINE', `${readings.combined} mg/l`],
        ['pH', readings.ph],
        ['TEMPERATURE', `${temperatures[pool.board!] ?? '29.0'} °C`],
        ['LAST TESTED', readings.tested],
      ];
      rows.forEach(([name, value], i) => {
        const y = h * (0.3 + i * 0.14);
        c.fillStyle = '#ffffff';
        c.fillRect(w * 0.06, y - h * 0.05, w * 0.88, h * 0.11);
        c.fillStyle = '#123a73';
        c.textAlign = 'left';
        c.font = `bold ${Math.round(h * 0.04)}px Arial, Helvetica, sans-serif`;
        c.fillText(name, w * 0.09, y + h * 0.015);
        c.textAlign = 'right';
        c.font = `bold ${Math.round(h * 0.055)}px Arial, Helvetica, sans-serif`;
        c.fillText(value, w * 0.91, y + h * 0.02);
      });
    });
    face.position.set(0, 1.5, 0.035);
    group.add(face);
    box(group, frame, 0.64, 0.84, 0.03, 0, 1.5, 0.01);
  }

  // Everything solid casts a shadow and takes one; glass, water, glows and
  // the skylights' daylit panes let the sun through.
  world.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const material = o.material as Material;
    const solid =
      !material.transparent && !(material instanceof MeshBasicMaterial);
    o.castShadow = solid;
    o.receiveShadow = material instanceof MeshStandardMaterial;
  });
  renderer.shadowMap.needsUpdate = true;

  // ---- The walker -------------------------------------------------------
  const raycaster = new Raycaster();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(new Vector2(x, y), camera);
    const hit = raycaster
      .intersectObjects([...usable.keys()], false)
      .find((h) => h.distance < 3 * m);
    return hit ? (usable.get(hit.object) ?? null) : null;
  };
  const solids = [
    ...wallSolids,
    ...poolSolids,
    ...columnSolids,
    ...plantSolids,
    ...lampSolids,
    ...furnitureSolids,
  ];
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    floorAt: (x, z, previousY) => floorAt(x / m, z / m, previousY / m) * m,
    start: { x: 0, z: 52 * m },
    solids: () => solids,
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
  });
  walk.place(0, 52 * m, 0, 0);

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
    if (riding) {
      // On the slide: carried down its tube, looking where it goes.
      riding.s += (delta * SLIDE_SPEED) / riding.ride.length;
      const t = Math.min(1, riding.s);
      const p = riding.ride.curve.getPointAt(t);
      const ahead = riding.ride.curve.getTangentAt(t);
      camera.position.set(p.x * m, (p.y + 0.15) * m, p.z * m);
      camera.lookAt(camera.position.clone().addScaledVector(ahead, m));
      if (t >= 1) {
        riding = null;
        walk.place(p.x * m, p.z * m, Math.atan2(ahead.x, -ahead.z), 0);
      }
    } else walk.update(delta);
    renderer.render(scene, camera);
  });

  // A development handle for the console.
  (window as unknown as { poolrooms: unknown }).poolrooms = {
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    ride: () => (riding = { ride: rides[0], s: 0 }),
    /** Use whatever is at (x, y) on the screen (−1 to 1), as a click would. */
    use: (x = 0, y = 0) => usableAt(x, y)?.(),
  };

  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    for (const t of textures) t.dispose();
    for (const material of materials) material.dispose();
    world.traverse((o) => {
      if (o instanceof Mesh) o.geometry.dispose();
    });
    renderer.dispose();
    delete (window as unknown as { poolrooms?: unknown }).poolrooms;
  };
  return Object.assign(dispose, {});
}
