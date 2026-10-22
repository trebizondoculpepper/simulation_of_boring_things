import {
  AmbientLight,
  Box3,
  BoxGeometry,
  CylinderGeometry,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  SpotLight,
  Vector2,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { signal } from '@preact/signals-core';
import { click, partAudio } from '../../components/core/audio/part-audio';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { EXPANSION_CARD_KINDS } from '../../components/industrial-control/logic/machine-components';
import type { MachineComponentKind } from '../../components/industrial-control/logic/machine-components';
import { dressSkip } from '../../components/site-dressing/logic/skip-dressing';
import { createSkipPile } from '../../components/site-dressing/logic/skip-pile';
import type { Slab } from '../../components/site-dressing/logic/skip-pile';
import { binArc } from '../../components/site-dressing/logic/bin-toss';
import { METRE } from '../../components/core/logic/units';
import { materialiseAt } from '../../components/core/logic/materialise';
import { createMaterialise } from '../../components/core/views/materialise';
import { mergeStatic } from '../../components/core/views/merge-static';
import type { Footprint } from '../../controls/logic/walk-collision';
import {
  createCaption,
  createSectionBoard,
} from '../../components/core/views/signage';
import {
  createPartSet,
  potentiometer,
  mushroomStop,
  pushButton,
} from '../../components/core/parts/parts';
import { createCanvasTexture } from '../../components/core/views/screens';
import {
  createPanelKit,
  createSevenSegment,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import {
  addSkipGraffiti,
  addSkipLamps,
  createSkip,
  SKIP_INSIDE,
} from '../../components/site-dressing/views/skip';
import { createPortals } from '../views/portals';
import { createFirstPerson } from '../../controls/input/first-person';
import { knobDirection } from '../../controls/input/knob-turning';
import { machineComponent } from '../../components/industrial-control/parts/machine-components';
import type { MachineDevice } from '../../components/industrial-control/parts/machine-components';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';

const FLOOR = { minX: -6, maxX: 6, minZ: -5, maxZ: 5 };
const CEILING = 4;
/** Seconds between one thing thrown in and the next. */
const EVERY = 1;
/** The emitter: a ring this far round the skip's middle, this high above its rim. */
const RING = 1.2;
const ABOVE = 2;
/** Seconds a thing takes to boil in from nothing. */
const MATERIALISE = 0.7;
/** Once the pile stands this far above the rim, the skip is emptied. */
const HEAPED = 0.3;
/** Seconds a heaped skip is left to be looked at before it is emptied. */
const ADMIRE = 4;
/**
 * DESPAWN: each thing in the skip goes after a countdown drawn from a
 * normal distribution, 7 s on average with a standard deviation of 3 s,
 * never under half a second.
 */
const DESPAWN_MEAN = 7;
const DESPAWN_SPREAD = 3;
const DESPAWN_SOONEST = 0.5;
/** A standard normal draw (Box–Muller). */
const normal = () =>
  Math.sqrt(-2 * Math.log(1 - Math.random())) *
  Math.cos(2 * Math.PI * Math.random());
/** Seconds a despawned thing takes to boil away. */
const BOIL_AWAY = 1.6;
/** The control desk: where it stands, on the floor plan. */
const DESK = { x: 1.4, z: 1.8 };
/**
 * AVERAGE DELAY's detents, seconds: a logarithmic scale, 1, 2, 5 to each
 * decade. Throws come at random, so many a second or one now and then,
 * averaging this.
 */
const DELAYS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
/** What is thrown in: the boards from dev5. */
const KINDS: readonly MachineComponentKind[] = [
  ...EXPANSION_CARD_KINDS,
  'plc-comms',
  'capacitors',
  'drive-power',
];

// Landing in the skip: a hollow clang, as in `bin-tossing.ts`.
const clang = click({
  band: 820,
  q: 7,
  decay: 0.45,
  level: 0.18,
  thump: [72, 0.16],
});

/** A seeded random number generator (mulberry32). */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Dev6, Settling Objects into Skips: an emitter over a mini skip throws
 * something in every second, to see how a skip fills when lots of things
 * go into it. Each, one of dev5's boards, boils in from nothing
 * (`createMaterialise`) at a point on a ring two metres over the skip and
 * is thrown straight in; where it lands it settles on the pile by the
 * skip's settling rule (`src/toolkit/components/site-dressing/logic/skip-pile.ts`): flat on a level
 * heap, tipped onto its highest supports on an uneven one, sliding off
 * anything too steep, so flat things pack down and a skip takes many
 * before it is full. Once the heap stands well above the rim the skip is
 * left a few seconds to be looked at, then emptied, and it starts again.
 */
export function startSettlingRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.45);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  scene.add(new AmbientLight('#e4e6ea', 0.45));
  scene.add(new HemisphereLight('#dfe4ea', '#3a3a36', 0.6));
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  const random = seeded(2121);

  // ---- The room -------------------------------------------------------------
  const W = FLOOR.maxX - FLOOR.minX;
  const D = FLOOR.maxZ - FLOOR.minZ;
  const floor = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#6a6d6b'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#2c2e31'));
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
  const wallPaint = kitPaint(kit, '#474c55');
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
  const sign = createSectionBoard(kit, 'SETTLING OBJECTS INTO SKIPS', 4.8);
  sign.position.set(-2.2, 3, FLOOR.minZ + 0.154);
  room.add(sign);

  // ---- The skip and its pile -----------------------------------------------
  const skip = createSkip(kit);
  room.add(skip.group);
  const dressing = dressSkip(random);
  const graffiti = addSkipGraffiti(kit, skip.group, dressing.tags);
  const lamps = addSkipLamps(kit, skip.group, dressing.lamps);
  const pile = createSkipPile(SKIP_INSIDE);
  const light = new SpotLight('#fff3e2', 22 * m * m, 0, 0.45, 0.6, 2);
  light.position.set(0, (CEILING - 0.1) * m, 1 * m);
  light.target.position.set(0, 0.4 * m, 0);
  scene.add(light, light.target);
  // The emitter's ring, faint, so it can be seen where things come from.
  const ringPaint = kitPaint(kit, '#4f8fbf');
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const dot = new Mesh(new BoxGeometry(0.03, 0.006, 0.03), ringPaint);
    dot.position.set(
      Math.cos(a) * RING,
      SKIP_INSIDE.rim + ABOVE,
      Math.sin(a) * RING,
    );
    room.add(dot);
  }

  // ---- The emitter ----------------------------------------------------------
  const reducedMotion = () =>
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
    false;
  /** Everything thrown in, from the moment it appears until it is emptied out. */
  const thrown: {
    kit: PanelKit;
    device: MachineDevice;
    object: Object3D;
    effect: ReturnType<typeof createMaterialise>;
    from: { x: number; y: number; z: number };
    to: { x: number; y: number; z: number };
    fromQ: Quaternion;
    toQ: Quaternion;
    /** Its middle, in its own frame. */
    middle: Vector3;
    age: number;
    seconds: number;
    landed: boolean;
    merged: boolean;
    /** Its place in the pile, to take it out again. */
    rest: number;
    /** Seconds until it despawns, once DESPAWN has given it a time. */
    despawnIn: number | null;
    /** Boiling away, once its time has come. */
    vanishing: ReturnType<typeof createMaterialise> | null;
  }[] = [];
  /** Seconds to the next throw; a development override of the mean. */
  let nextIn = EVERY;
  let meanOverride: number | null = null;
  let since = 0;
  let heapedFor = 0;

  /** Throw one more thing in. */
  const emit = () => {
    const kind = KINDS[Math.floor(random() * KINDS.length)];
    const own = createPanelKit();
    const device = machineComponent(own, kind, {
      name: `${kind} thrown in`,
      attachment: 'fixed',
    });
    const object = device.object;
    // It is rubbish now: nothing picks it up again.
    delete object.userData.portable;
    // Its sizes, and how it lies flat: thinnest side up, longest along.
    object.updateMatrixWorld(true);
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const middle = box.getCenter(new Vector3());
    const axes = [
      new Vector3(1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, 0, 1),
    ].sort((p, q) => size.dot(p) - size.dot(q));
    const [thin, mid, long] = axes;
    const slab: Slab = {
      length: size.dot(long),
      width: size.dot(mid),
      thickness: size.dot(thin),
    };
    const across = long.clone().cross(thin);
    const lay = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(long, thin, across).transpose(),
    );
    // Where it settles, by the pile's rule.
    const rest = pile.settle(slab, {
      x: (random() * 2 - 1) * (SKIP_INSIDE.topHalfX - 0.2),
      z: (random() * 2 - 1) * (SKIP_INSIDE.halfZ - 0.15),
      yaw: random() * Math.PI * 2,
    });
    const toQ = new Quaternion()
      .setFromRotationMatrix(
        new Matrix4().makeBasis(
          new Vector3(rest.along.x, rest.along.y, rest.along.z),
          new Vector3(rest.up.x, rest.up.y, rest.up.z),
          new Vector3(rest.across.x, rest.across.y, rest.across.z),
        ),
      )
      .multiply(lay);
    // Where it appears: a point on the ring, turned any way.
    const a = random() * Math.PI * 2;
    const from = {
      x: Math.cos(a) * RING,
      y: SKIP_INSIDE.rim + ABOVE,
      z: Math.sin(a) * RING,
    };
    const fromQ = new Quaternion().setFromAxisAngle(
      new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
      random() * Math.PI * 2,
    );
    object.quaternion.copy(fromQ);
    object.position
      .set(from.x, from.y, from.z)
      .sub(middle.clone().applyQuaternion(fromQ));
    room.add(object);
    const distance = Math.hypot(from.x - rest.centre.x, from.z - rest.centre.z);
    thrown.push({
      kit: own,
      device,
      object,
      effect: createMaterialise(object, {
        seconds: MATERIALISE,
        reduced: reducedMotion(),
      }),
      from,
      to: rest.centre,
      fromQ,
      toQ,
      middle,
      age: 0,
      seconds: 0.6 + 0.2 * distance,
      landed: false,
      merged: false,
      rest: rest.id,
      despawnIn: null,
      vanishing: null,
    });
  };

  /** Empty the skip: everything thrown in goes. */
  const empty = () => {
    for (const t of thrown) {
      t.effect.finish();
      t.vanishing?.finish();
      room.remove(t.object);
      t.device.dispose();
      disposeKit(t.kit, t.object as Group);
    }
    thrown.length = 0;
    pile.reset();
    heapedFor = 0;
  };

  /**
   * DESPAWN: everything now in the skip is given a time, about 7 s, give
   * or take 3 (normally distributed); when its time is up it boils away (`createMaterialise`, run
   * out) and is taken out of the pile. What arrives later stays.
   */
  const despawn = () => {
    for (const t of thrown)
      if (t.landed && t.despawnIn === null && !t.vanishing)
        t.despawnIn = Math.max(
          DESPAWN_SOONEST,
          DESPAWN_MEAN + DESPAWN_SPREAD * normal(),
        );
  };
  const vanish = (delta: number) => {
    for (const t of [...thrown]) {
      if (t.despawnIn !== null) {
        t.despawnIn -= delta;
        if (t.despawnIn <= 0) {
          t.despawnIn = null;
          // Whole first, and never merged now: it boils away as it is.
          t.effect.finish();
          t.merged = true;
          t.vanishing = createMaterialise(t.object, {
            out: true,
            seconds: BOIL_AWAY,
            reduced: reducedMotion(),
          });
        }
      }
      if (t.vanishing && !t.vanishing.update(delta)) {
        // Gone: out of the room, and out of the pile.
        pile.remove(t.rest);
        room.remove(t.object);
        t.device.dispose();
        disposeKit(t.kit, t.object as Group);
        thrown.splice(thrown.indexOf(t), 1);
      }
    }
    despawning.value = thrown.some(
      (t) => t.despawnIn !== null || t.vanishing !== null,
    );
  };

  // ---- The control desk: a sloping steel panel on a post by the skip ----
  // START and STOP the emitter; a counter of what is in the skip; DESPAWN;
  // and AVERAGE DELAY, the mean time between throws, on a log scale.
  const parts = createPartSet();
  const desk = new Group();
  desk.name = 'Skip emitter control desk';
  desk.position.set(DESK.x, 0, DESK.z);
  room.add(desk);
  const steel = kitPaint(kit, '#9aa1a3', 0.45);
  const grey = kitPaint(kit, '#8e9592', 0.6);
  const base = new Mesh(new BoxGeometry(0.34, 0.012, 0.34), steel);
  base.position.y = 0.006;
  desk.add(base);
  const height = 0.95;
  const pole = new Mesh(new CylinderGeometry(0.035, 0.035, height, 24), steel);
  pole.position.y = height / 2;
  desk.add(pole);
  // The panel, tilted back towards whoever stands at it.
  const panel = new Group();
  panel.position.set(0, height + 0.08, 0.02);
  panel.rotation.x = -0.6;
  desk.add(panel);
  const box = new Mesh(new BoxGeometry(0.46, 0.26, 0.07), grey);
  box.position.z = -0.035;
  panel.add(box);
  const title = createCaption(kit, 'SKIP EMITTER');
  title.scale.setScalar(0.45);
  title.position.set(0, 0.112, 0.002);
  panel.add(title);
  // The counter: what is in the skip now.
  const counter = createSevenSegment(kit, 4, { digitHeight: 0.022 });
  counter.group.position.set(-0.12, 0.06, 0);
  panel.add(counter.group);
  const counted = createCaption(kit, 'IN SKIP');
  counted.scale.setScalar(0.28);
  counted.position.set(-0.12, 0.028, 0.002);
  panel.add(counted);
  const running = signal(true);
  const stopped = signal(false);
  const despawning = signal(false);
  // STOP is a mushroom emergency stop: pushed in, it latches and stops
  // the emitter; worked again (twisted out) it is released, and START
  // runs it again. START does nothing while it is latched.
  const stop = mushroomStop(kit, {
    legend: 'STOP',
    name: 'STOP emergency stop',
    bound: {
      get value() {
        return stopped.value;
      },
      set(pushed: boolean) {
        stopped.value = pushed;
        if (pushed) running.value = false;
      },
    },
  });
  const start = pushButton(kit, {
    colour: 'green',
    head: 'illuminated',
    legend: 'START',
    name: 'START push button',
    lamp: running,
    action: () => {
      if (!stopped.value) running.value = true;
    },
  });
  const despawnButton = pushButton(kit, {
    colour: 'amber',
    head: 'illuminated',
    legend: 'DESPAWN',
    name: 'DESPAWN push button',
    lamp: despawning,
    action: () => despawn(),
  });
  // START and STOP together; DESPAWN apart, well clear of the mushroom's
  // head, so a click meant for it never lands on the stop. DESPAWN works
  // whether or not the stop is in: the stop stops only the throwing.
  for (const [button, x] of [
    [start, -0.18],
    [stop, -0.1],
    [despawnButton, 0.025],
  ] as const) {
    button.object.position.set(x, -0.06, 0);
    panel.add(button.object);
    parts.add(button);
  }
  const delay = potentiometer(kit, {
    legend: 'AVERAGE DELAY',
    steps: DELAYS.length - 1,
    initial: DELAYS.indexOf(1) / (DELAYS.length - 1),
    name: 'AVERAGE DELAY knob',
  });
  delay.object.position.set(0.14, 0.03, 0);
  panel.add(delay.object);
  parts.add(delay);
  /** The mean seconds between throws, from the knob's detent. */
  const meanDelay = () => DELAYS[delay.position.value] ?? 1;
  const readout = createCanvasTexture(128, 40);
  kit.textures.push(readout.texture);
  const face = new MeshBasicMaterial({ map: readout.texture });
  kit.materials.push(face);
  const screen = new Mesh(new PlaneGeometry(0.07, 0.022), face);
  screen.position.set(0.14, -0.065, 0.001);
  screen.raycast = () => {};
  panel.add(screen);
  let shownDelay = NaN;
  let shownCount = NaN;
  const showPanel = () => {
    if (pile.count !== shownCount) {
      shownCount = pile.count;
      counter.show(String(Math.min(9999, shownCount)));
    }
    const mean = meanDelay();
    if (mean === shownDelay) return;
    shownDelay = mean;
    const c = readout.context;
    c.fillStyle = '#0d120e';
    c.fillRect(0, 0, 128, 40);
    c.fillStyle = '#7dff9a';
    c.font = 'bold 26px monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(`${mean < 1 ? mean.toFixed(1) : mean} s`, 64, 21);
    readout.texture.needsUpdate = true;
  };

  /** Fly, settle and tidy up everything on its way in. */
  const fly = (delta: number) => {
    for (const t of thrown) {
      t.effect.update(delta);
      if (!t.landed) {
        t.age += delta;
        const k = Math.min(1, t.age / t.seconds);
        const at = binArc(t.from, t.to, k, 0.15);
        // It turns to its resting pose as it falls, mostly at the end.
        t.object.quaternion.copy(t.fromQ).slerp(t.toQ, materialiseAt(k, 1));
        t.object.position
          .set(at.x, at.y, at.z)
          .sub(t.middle.clone().applyQuaternion(t.object.quaternion));
        if (k >= 1) {
          t.landed = true;
          partAudio.play(clang, t.object);
        }
      }
      // Landed and whole: a few meshes, not dozens, from now on.
      if (t.landed && !t.merged && !t.effect.running) {
        t.merged = true;
        mergeStatic(t.object, Infinity, new Set(), { share: true });
      }
    }
  };

  // ---- Walking --------------------------------------------------------------
  const portals = createPortals('dev6', devPortals('dev6', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects([portals.group, desk], true)[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const travel = portals.uses.get(o as Mesh);
      if (travel) return () => travel();
      const work = parts.uses.get(o);
      if (work) {
        // A knob turns down on its left half, up on its right.
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
    room: { x: 0, z: 4 * m, yaw: 0, pitch: -0.12 },
    // Beside the skip, looking down into it.
    skip: { x: 0, z: 1.6 * m, yaw: 0, pitch: -0.75 },
    // Across the skip's length, to see the pile's profile.
    end: { x: 3 * m, z: 0, yaw: -Math.PI / 2, pitch: -0.25 },
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
    solids: () => [
      ...outer,
      {
        minX: (-skip.footprint.x / 2 - 0.05) * m,
        maxX: (skip.footprint.x / 2 + 0.05) * m,
        minZ: (-skip.footprint.z / 2 - 0.05) * m,
        maxZ: (skip.footprint.z / 2 + 0.05) * m,
      },
      {
        minX: (DESK.x - 0.2) * m,
        maxX: (DESK.x + 0.2) * m,
        minZ: (DESK.z - 0.2) * m,
        maxZ: (DESK.z + 0.25) * m,
      },
    ],
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
  // Development only: these bind no input.
  (window as unknown as { devSettling: unknown }).devSettling = {
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    /** Stop or start the emitter. */
    pause: () => (running.value = false),
    resume: () => {
      if (!stopped.value) running.value = true;
    },
    /** Throw something in every `seconds`. */
    every: (seconds: number) => (meanOverride = Math.max(0.05, seconds)),
    /** Throw `n` things in at once. */
    throw(n = 1) {
      for (let i = 0; i < n; i++) emit();
    },
    empty,
    /** Press DESPAWN. */
    despawn,
    /** A use at a point on the screen (-1 to 1), as a click there. */
    use: (x: number, y: number) => usableAt(x, y)?.(),
    /** Where the AVERAGE DELAY knob is, for aiming at it. */
    knob: () => delay.object.getWorldPosition(new Vector3()),
    /** How many are in, and how high the pile stands over the skip's floor. */
    state: () => ({
      running: running.value,
      stopped: stopped.value,
      delay: meanDelay(),
      count: pile.count,
      top: pile.top(),
      rim: SKIP_INSIDE.rim,
    }),
  };

  // ---- Each frame ------------------------------------------------------------
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    lamps.update(time / 1000);
    if (pile.top() > SKIP_INSIDE.rim + HEAPED) {
      // Heaped: left a while to be looked at, then emptied.
      heapedFor += delta;
      if (heapedFor > ADMIRE) empty();
    } else if (running.value) {
      since += delta;
      if (since >= nextIn) {
        since = 0;
        emit();
        // At random, averaging the knob's delay (a Poisson stream).
        nextIn = Math.max(
          0.05,
          -Math.log(1 - Math.random()) * (meanOverride ?? meanDelay()),
        );
      }
    }
    showPanel();
    fly(delta);
    vanish(delta);
    parts.update(delta);
    portals.update(delta, walk.walker.x, walk.walker.z);
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    empty();
    parts.dispose();
    lamps.dispose();
    graffiti.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devSettling?: unknown }).devSettling;
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
