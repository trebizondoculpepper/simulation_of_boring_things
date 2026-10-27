import {
  AmbientLight,
  BoxGeometry,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { METRE } from '../../components/core/logic/units';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createSectionBoard } from '../../components/core/views/signage';
import {
  createPartSet,
  potentiometer,
  selector,
} from '../../components/core/parts/parts';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createBinFire } from '../../components/fire/views/fire-fittings';
import { createEmbers } from '../../components/fire/views/embers';
import { createSmokeEmitter } from '../../components/core/views/smoke-emitter';
import { VolumetricFire } from '../../components/fire/views/volumetric-fire';
import { createPortals } from '../views/portals';
import { createFirstPerson } from '../../controls/input/first-person';
import { knobDirection } from '../../controls/input/knob-turning';
import { partAudio } from '../../components/core/audio/part-audio';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';

const FLOOR = { minX: -10, maxX: 10, minZ: -6, maxZ: 6 };
const CEILING = 4.5;
/** Where the exhibits stand: in a row along the north wall, 4 m apart. */
const ROW_Z = -3.6;
const BACKDROP_Z = -FLOOR.maxZ + 0.2;
/** The control lectern, in the middle of the room facing north. */
const LECTERN = { x: 0, z: 0.5 };

/** What one exhibit is: how its fire is made, and what it costs. */
interface Exhibit {
  title: string;
  /** What it is, and how it is drawn. */
  how: string;
  group: Group;
  /** Set it burning at `size` (0 out, 1 full). */
  set(size: number): void;
  update(seconds: number, delta: number, camera: PerspectiveCamera): void;
  /** Where its light comes from, metres above its foot. */
  glow: number;
  dispose(): void;
}

/**
 * Fire made one way and another, side by side, to choose between: the
 * particle fire dev8's bin burns with; the volumetric fire of
 * ThreeVolumetricFire (`volumetric-fire.ts`); that with our smoke and
 * embers; and a burning cabinet as Level 0's machine burns, smoke from its
 * seams. Each stands in front of a backdrop half black and half magnolia,
 * since fire added to what is behind it shows well on dark and washes out
 * on light. Every one is fed by one SIZE knob and lit by one FIRES switch
 * on a lectern in the middle of the room.
 */
function createExhibits(kit: PanelKit): Exhibit[] {
  /** A steel bin, its own particle flames put out, to hold another fire. */
  const emptyBin = () => {
    const bin = createBinFire(kit);
    bin.set(0, 0);
    return bin;
  };
  const volumetric = () =>
    new VolumetricFire({
      width: 0.3,
      height: 1.1,
      depth: 0.3,
      sliceSpacing: 0.025,
      segments: 16,
    });

  // 1. Ours: dev8's bin fire, hundreds of glowing points.
  const particles = createBinFire(kit);

  // 2. Volumetric fire in a bin.
  const bin2 = emptyBin();
  const fire2 = volumetric();
  bin2.group.add(fire2);

  // 3. Volumetric fire with our smoke and embers over it.
  const bin3 = emptyBin();
  const fire3 = volumetric();
  bin3.group.add(fire3);
  const smoke3 = createSmokeEmitter(16, '46, 44, 42');
  smoke3.group.position.y = 1.1;
  smoke3.group.scale.setScalar(1.6);
  bin3.group.add(smoke3.group);
  const embers3 = createEmbers(28);
  embers3.group.position.y = 0.5;
  bin3.group.add(embers3.group);

  // 4. A burning cabinet, as Level 0's machine burns: no flames seen,
  // thick smoke pouring from round its door and up its face.
  const cabinet = new Group();
  const steel = kitPaint(kit, '#7d8b93', 0.35);
  const body = new Mesh(new BoxGeometry(0.8, 1.9, 0.5), steel);
  body.position.y = 0.95;
  cabinet.add(body);
  const door = new Mesh(
    new BoxGeometry(0.7, 0.8, 0.02),
    kitPaint(kit, '#8d9aa1', 0.35),
  );
  door.position.set(0, 0.7, 0.26);
  cabinet.add(door);
  const seams = [-0.22, 0.02, 0.24].map((x, i) => {
    const emitter = createSmokeEmitter(14, '52, 50, 47');
    emitter.group.position.set(x, 1.12, 0.3);
    emitter.group.scale.setScalar(1.05 + i * 0.1);
    cabinet.add(emitter.group);
    return emitter;
  });
  const glow4 = createEmbers(10, { spray: true });
  glow4.group.position.set(0, 1.1, 0.28);
  cabinet.add(glow4.group);

  const reduced = () => false;
  return [
    {
      title: '1  PARTICLE FIRE',
      how: 'DEV8 BIN FIRE · 360 GLOWING POINTS, ADDED · 2 DRAW CALLS',
      group: particles.group,
      glow: 0.7,
      // Its own size 1 is a column near 3 m tall; at a quarter it is the
      // height the others are, so they are compared alike.
      set: (size) => particles.set(size * 0.25, 0),
      update: (_s, delta) => particles.update(delta),
      dispose: () => {},
    },
    {
      title: '2  VOLUMETRIC FIRE',
      how: 'THREEVOLUMETRICFIRE (MIT) · VIEW-ALIGNED SLICES · 1 DRAW CALL',
      group: bin2.group,
      glow: 0.8,
      set: (size) => {
        fire2.level = size;
        fire2.scale.set(0.6 + 0.4 * size, 0.4 + 0.6 * size, 0.6 + 0.4 * size);
        fire2.position.y = 0.3 + 0.55 * fire2.scale.y;
      },
      update: (seconds, _d, camera) => fire2.update(seconds, camera),
      dispose: () => {
        fire2.geometry.dispose();
        fire2.material.dispose();
      },
    },
    {
      title: '3  VOLUMETRIC + SMOKE',
      how: 'NO. 2 WITH OUR SPRITE SMOKE AND EMBERS · 3 DRAW CALLS',
      group: bin3.group,
      glow: 0.8,
      set: (size) => {
        fire3.level = size;
        fire3.scale.set(0.6 + 0.4 * size, 0.4 + 0.6 * size, 0.6 + 0.4 * size);
        fire3.position.y = 0.3 + 0.55 * fire3.scale.y;
        smoke3.group.userData.strength = size;
        embers3.group.userData.strength = size;
      },
      update: (seconds, _d, camera) => {
        fire3.update(seconds, camera);
        const size = (smoke3.group.userData.strength as number) ?? 0;
        smoke3.update(seconds, size, reduced());
        embers3.update(seconds, size, reduced());
      },
      dispose: () => {
        fire3.geometry.dispose();
        fire3.material.dispose();
        smoke3.dispose();
      },
    },
    {
      title: '4  CABINET FIRE',
      how: 'LEVEL 0 · SMOKE FROM THE SEAMS, SPARKS · NO FLAMES SEEN',
      group: cabinet,
      glow: 1.1,
      set: (size) => {
        cabinet.userData.strength = size;
      },
      update: (seconds) => {
        const size = (cabinet.userData.strength as number) ?? 0;
        seams.forEach((s, i) => s.update(seconds + i * 13, size, reduced()));
        glow4.update(seconds, size * 0.6, reduced());
      },
      dispose: () => {
        for (const s of seams) s.dispose();
      },
    },
  ];
}

/**
 * dev9, Fires: the ways of drawing fire and smoke side by side
 * (`createExhibits`), each with its name and what it costs on a card in
 * front of it.
 */
export function startFiresRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.3);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  scene.add(new AmbientLight('#e4e6ea', 0.35));
  scene.add(new HemisphereLight('#dfe4ea', '#3a3a36', 0.5));
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);

  // ---- The room -------------------------------------------------------------
  const W = FLOOR.maxX - FLOOR.minX;
  const D = FLOOR.maxZ - FLOOR.minZ;
  const floor = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#5c5f5e'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#2a2c2f'));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEILING;
  room.add(ceiling);
  const bounds: Footprint = {
    minX: FLOOR.minX * m,
    maxX: FLOOR.maxX * m,
    minZ: FLOOR.minZ * m,
    maxZ: FLOOR.maxZ * m,
  };
  const outer = devWalls(bounds, m, CEILING * m);
  const wallPaint = kitPaint(kit, '#3f4349');
  for (const piece of outer) {
    const mesh = new Mesh(
      new BoxGeometry(
        piece.maxX - piece.minX,
        piece.top - piece.bottom,
        piece.maxZ - piece.minZ,
      ),
      wallPaint,
    );
    mesh.position.set(
      (piece.minX + piece.maxX) / 2,
      (piece.bottom + piece.top) / 2,
      (piece.minZ + piece.maxZ) / 2,
    );
    scene.add(mesh);
  }
  const sign = createSectionBoard(kit, 'FIRES', 3);
  sign.position.set(0, 3.9, FLOOR.minZ + 0.154);
  room.add(sign);

  // ---- The exhibits ---------------------------------------------------------
  const exhibits = createExhibits(kit);
  const dark = kitPaint(kit, '#0e0e0f', 0);
  const light = kitPaint(kit, '#efe6cc', 0);
  const card = kitPaint(kit, '#e9e7df', 0);
  const lights: PointLight[] = [];
  const solids: Footprint[] = [];
  exhibits.forEach((exhibit, i) => {
    const x = (i - (exhibits.length - 1) / 2) * 4;
    // The backdrop, black on the left and magnolia on the right, the fire
    // standing on the line between.
    for (const [paint, dx] of [
      [dark, -0.75],
      [light, 0.75],
    ] as const) {
      const half = new Mesh(new BoxGeometry(1.5, 3.2, 0.05), paint);
      half.position.set(x + dx, 1.6, BACKDROP_Z);
      room.add(half);
    }
    exhibit.group.position.set(x, 0, ROW_Z);
    room.add(exhibit.group);
    // A fire lights what is round it: a warm light, flickering.
    const glow = new PointLight('#ff9a3c', 0, 5 * m, 2);
    glow.position.set(x * m, exhibit.glow * m, (ROW_Z + 0.3) * m);
    scene.add(glow);
    lights.push(glow);
    // Its card, on a low stand in front.
    const stand = new Group();
    // Beside the fire, not in front of it.
    stand.position.set(x + 1.15, 0, ROW_Z + 0.9);
    stand.rotation.y = -0.35;
    room.add(stand);
    const post = new Mesh(new BoxGeometry(0.05, 0.8, 0.05), wallPaint);
    post.position.y = 0.4;
    stand.add(post);
    const face = new Mesh(new BoxGeometry(0.9, 0.36, 0.02), card);
    face.position.set(0, 0.9, 0);
    face.rotation.x = -0.6;
    stand.add(face);
    const title = createMicroLabel(kit, exhibit.title, {
      height: 0.04,
      ink: '#1b1c1c',
    });
    title.position.set(0, 0.06, 0.012);
    face.add(title);
    const how = createMicroLabel(kit, exhibit.how, {
      height: 0.016,
      ink: '#3a3b3a',
      maxWidth: 0.84,
    });
    how.position.set(0, -0.05, 0.012);
    face.add(how);
    solids.push(
      {
        minX: (x - 0.5) * m,
        maxX: (x + 0.5) * m,
        minZ: (ROW_Z - 0.5) * m,
        maxZ: (ROW_Z + 0.5) * m,
      },
      {
        minX: (x + 0.75) * m,
        maxX: (x + 1.55) * m,
        minZ: (ROW_Z + 0.7) * m,
        maxZ: (ROW_Z + 1.1) * m,
      },
    );
  });

  // ---- The lectern: FIRES on and off, and their SIZE -------------------------
  const parts = createPartSet();
  const lectern = new Group();
  lectern.position.set(LECTERN.x, 0, LECTERN.z);
  // Facing north, to the fires: its desk towards the player behind it.
  lectern.rotation.y = Math.PI;
  room.add(lectern);
  const column = new Mesh(new BoxGeometry(0.12, 0.95, 0.12), wallPaint);
  column.position.y = 0.475;
  lectern.add(column);
  const desk = new Group();
  desk.position.y = 1.0;
  desk.rotation.x = 0.45;
  lectern.add(desk);
  desk.add(new Mesh(new BoxGeometry(0.5, 0.04, 0.3), kitPaint(kit, '#3e4547')));
  const heading = createMicroLabel(kit, 'FIRES', {
    height: 0.028,
    ink: '#f0f0ea',
  });
  heading.rotation.x = -Math.PI / 2;
  heading.position.set(0, 0.022, -0.11);
  desk.add(heading);
  const burning = selector(kit, {
    name: 'FIRES switch',
    legend: 'OFF  ON',
    positions: 2,
    initial: 1,
  });
  const size = potentiometer(kit, {
    name: 'FIRE SIZE knob',
    legend: 'SIZE',
    steps: 10,
    initial: 1,
  });
  [burning, size].forEach((knob, i) => {
    knob.object.rotation.x = -Math.PI / 2;
    knob.object.position.set(-0.1 + i * 0.2, 0.021, 0.02);
    desk.add(knob.object);
    parts.add(knob);
  });
  solids.push({
    minX: (LECTERN.x - 0.3) * m,
    maxX: (LECTERN.x + 0.3) * m,
    minZ: (LECTERN.z - 0.3) * m,
    maxZ: (LECTERN.z + 0.3) * m,
  });
  /** How big the fires are now, 0 to 1. */
  let held: number | null = null;
  const level = () =>
    held ?? (burning.position.value === 1 ? size.share.value : 0);

  // ---- Walking --------------------------------------------------------------
  const portals = createPortals('dev9', devPortals('dev9', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects([portals.group, lectern], true)[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const travel = portals.uses.get(o as Mesh);
      if (travel) return () => travel();
      const work = parts.uses.get(o);
      if (work) {
        const at = o;
        return () => work(knobDirection(at, hit.point, camera));
      }
    }
    return null;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    room: { x: 0, z: 5 * m, yaw: 0, pitch: -0.08 },
    lectern: { x: 0, z: 1.15 * m, yaw: 0, pitch: -0.7 },
    ...Object.fromEntries(
      exhibits.map((_, i) => [
        String(i + 1),
        {
          x: (i - (exhibits.length - 1) / 2) * 4 * m,
          z: (ROW_Z + 3.4) * m,
          yaw: 0,
          pitch: -0.12,
        },
      ]),
    ),
  };
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.room,
    solids: () => [...outer, ...solids],
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
  });
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    ps1Uniforms.resolution.value.set(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let last = 0;
  let shown = -1;
  const frame = (time: number) => {
    const delta = last ? Math.min(0.1, Math.max(0, (time - last) / 1000)) : 0;
    last = time;
    const seconds = time / 1000;
    ps1Uniforms.time.value = seconds;
    walk.update(delta);
    portals.update(delta, walk.walker.x, walk.walker.z, !walk.following);
    parts.update(delta);
    const now = level();
    if (now !== shown) {
      shown = now;
      for (const exhibit of exhibits) exhibit.set(now);
    }
    camera.updateMatrixWorld();
    exhibits.forEach((exhibit, i) => {
      exhibit.update(seconds, delta, camera);
      lights[i].intensity =
        now *
        1.6 *
        m *
        m *
        (0.85 +
          0.15 * Math.sin(seconds * 13 + i * 2) * Math.sin(seconds * 7.3));
    });
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    frame(time);
  });

  // Development only: these bind no input.
  (window as unknown as { devFires: unknown }).devFires = {
    /** Stand at a named view: room, lectern, or 1 to 4 (in front of each). */
    view(name: string) {
      const v = views[name];
      if (v) walk.place(v.x, v.z, v.yaw, v.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    /** The exhibits' titles, in order. */
    exhibits: () => exhibits.map((e) => e.title),
    /** Hold the fires at a size (0 to 1), or null to follow the lectern. */
    size(value: number | null) {
      held = value === null ? null : Math.max(0, Math.min(1, value));
    },
    /** Use whatever is at (x, y) on the screen (−1 to 1), as a use would. */
    use: (x = 0, y = 0) => usableAt(x, y)?.(),
    stats: () => ({ ...renderer.info.render }),
    /**
     * Run `seconds` of frames at once (where the browser is not drawing,
     * as in a hidden tab) and give the last as a PNG data URL.
     */
    shot(seconds = 0, width = 1280, height = 720) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      let time = last || 1000;
      for (let t = 0; t <= seconds; t += 1 / 30) frame((time += 1000 / 30));
      const url = canvas.toDataURL('image/png');
      resize();
      return url;
    },
  };

  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    parts.dispose();
    for (const exhibit of exhibits) exhibit.dispose();
    disposeKit(kit, scene as unknown as Group);
    scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devFires?: unknown }).devFires;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) {
        walk.place(view.x, view.z, view.yaw, view.pitch);
        return;
      }
      const pose = portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
  });
}
