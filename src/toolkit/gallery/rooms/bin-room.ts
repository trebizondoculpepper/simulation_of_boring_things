import { plinthOccupied } from '../../controls/input/placement-target';
import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  SpotLight,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { partAudio } from '../../components/core/audio/part-audio';
import { devPortals, devWalls } from '../logic/dev-room-links';
import {
  CARD_DESIGNATIONS,
  EXPANSION_CARD_KINDS,
} from '../../components/industrial-control/logic/machine-components';
import type { MachineComponentKind } from '../../components/industrial-control/logic/machine-components';
import { dressSkip } from '../../components/site-dressing/logic/skip-dressing';
import { METRE } from '../../components/core/logic/units';
import { createMaterialise } from '../../components/core/views/materialise';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createSectionBoard } from '../../components/core/views/signage';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import {
  addSkipGraffiti,
  addSkipLamps,
  createSkip,
} from '../../components/site-dressing/views/skip';
import { createPortals } from '../views/portals';
import { knobDirection } from '../../controls/input/knob-turning';
import { createBinTossing } from '../../components/site-dressing/parts/bin-tossing';
import { createFirstPerson } from '../../controls/input/first-person';
import { machineComponent } from '../../components/industrial-control/parts/machine-components';
import type { MachineDevice } from '../../components/industrial-control/parts/machine-components';
import { isHeldPortableHit } from '../../controls/input/object-handling';
import type { PortableObject } from '../../controls/input/object-handling';
import { createPartSet } from '../../components/core/parts/parts';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';

const FLOOR = { minX: -6, maxX: 6, minZ: -5, maxZ: 5 };
const CEILING = 3.2;
/** The plinths stand in a ring this far from the bin, metres. */
const RING = 3;
const PLINTH = { w: 0.5, h: 0.95, d: 0.5 };
/** Seconds after its board is taken before a plinth has a fresh one. */
const RESTOCK = 10;
/** Seconds a fresh board takes to boil in from nothing. */
const MATERIALISE = 2;
/** The boards on the plinths: the Pepperdyne cards and their neighbours. */
const KINDS: readonly MachineComponentKind[] = [
  ...EXPANSION_CARD_KINDS,
  'plc-comms',
  'capacitors',
  'drive-power',
];
const TITLES: Partial<Record<MachineComponentKind, string>> = {
  capacitors: 'DC BUS CAPACITORS',
  'drive-power': 'DRIVE POWER STAGE',
};
const title = (kind: MachineComponentKind) =>
  (kind in CARD_DESIGNATIONS
    ? CARD_DESIGNATIONS[kind as keyof typeof CARD_DESIGNATIONS].name
    : TITLES[kind])!.toUpperCase();

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
 * Dev5, Putting Things in the Bin: the boards we have built stand on
 * plinths round a builder's mini skip. Let go of one facing the skip
 * within a metre and a half of its nearer end (`src/toolkit/components/site-dressing/logic/bin-toss.ts`)
 * and it flies in a parabola into the skip and lands with a clang on
 * whatever is already there;
 * let go anywhere else and it clatters to the floor as dropped things do.
 * Each plinth has a fresh board a few seconds after its board is taken, so
 * the bin can be filled, and over-filled, with expensive circuit boards.
 */
export function startBinRoom(canvas: HTMLCanvasElement) {
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
  const parts = createPartSet();
  const random = seeded(1313);

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
  const wallPaint = kitPaint(kit, '#4a4f47');
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
  const sign = createSectionBoard(kit, 'PUTTING THINGS IN THE BIN', 4.4);
  sign.position.set(-2.2, 2.5, FLOOR.minZ + 0.154);
  room.add(sign);

  // ---- The skip -------------------------------------------------------------
  // A mini skip in the middle of the ring; boards are thrown into it by the
  // shared bin tossing (`bin-tossing.ts`).
  const tossing = createBinTossing({ camera, metre: m, random });
  const skip = tossing.add({ name: 'skip', ...createSkip(kit), x: 0, z: 0 });
  room.add(skip.group);
  const dressing = dressSkip(random);
  const graffiti = addSkipGraffiti(kit, skip.group, dressing.tags);
  const lamps = addSkipLamps(kit, skip.group, dressing.lamps);
  const light = new SpotLight('#fff3e2', 16 * m * m, 0, 0.42, 0.6, 2);
  light.position.set(0, (CEILING - 0.1) * m, 0.8 * m);
  light.target.position.set(0, 0.4 * m, 0);
  scene.add(light, light.target);

  // ---- The plinths and their boards ---------------------------------------
  const plinthPaint = kitPaint(kit, '#d9d6cc');
  const deckPaint = kitPaint(kit, '#2b2d30');
  const plinths = KINDS.map((kind, i) => {
    // Round the bin, leaving the south side open for the way in.
    const angle = Math.PI + ((i + 0.5) / KINDS.length) * Math.PI * 2;
    const x = Math.sin(angle) * RING;
    const z = -Math.cos(angle) * RING;
    const group = new Group();
    group.position.set(x, 0, z);
    // Each faces the bin.
    group.rotation.y = Math.atan2(-x, -z);
    room.add(group);
    const body = new Mesh(
      new BoxGeometry(PLINTH.w, PLINTH.h - 0.03, PLINTH.d),
      plinthPaint,
    );
    body.position.y = (PLINTH.h - 0.03) / 2;
    group.add(body);
    // A dark deck that dropped boards can land on.
    const deck = new Mesh(
      new BoxGeometry(PLINTH.w + 0.02, 0.03, PLINTH.d + 0.02),
      deckPaint,
    );
    deck.position.y = PLINTH.h - 0.015;
    deck.userData.boardSupport = true;
    group.userData.placementSurface = deck;
    group.add(deck);
    const label = createMicroLabel(kit, title(kind), {
      height: 0.018,
      ink: '#1d1f21',
      maxWidth: PLINTH.w - 0.04,
    });
    label.position.set(0, PLINTH.h - 0.12, PLINTH.d / 2 + 0.001);
    group.add(label);
    const spot = new SpotLight('#fff3e2', 8 * m * m, 0, 0.3, 0.6, 2);
    spot.position.set(x * 0.8 * m, (CEILING - 0.1) * m, z * 0.8 * m);
    spot.target.position.set(x * m, PLINTH.h * m, z * m);
    scene.add(spot, spot.target);
    return {
      kind,
      x,
      z,
      group,
      board: null as MachineDevice | null,
      taken: 0,
    };
  });
  /** Put a fresh board on plinth `p`, sitting on its deck. */
  const stock = (p: (typeof plinths)[number]) => {
    const device = parts.add(
      machineComponent(kit, p.kind, {
        name: `${title(p.kind)} on plinth`,
        attachment: 'detachable',
      }),
    );
    // A card stands as it does in its slot: turned to show its face.
    if (p.kind.startsWith('plc-')) device.object.rotation.y = Math.PI / 2;
    device.object.updateMatrixWorld(true);
    const envelope = new Box3().setFromObject(device.object);
    device.object.position.set(
      -(envelope.min.x + envelope.max.x) / 2,
      PLINTH.h - envelope.min.y,
      -(envelope.min.z + envelope.max.z) / 2,
    );
    p.group.add(device.object);
    p.board = device;
    p.taken = 0;
    return device;
  };
  for (const p of plinths) stock(p);
  // A restocked board does not just appear: it boils in from nothing.
  const reducedMotion = () =>
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
    false;
  const appearing = new Set<ReturnType<typeof createMaterialise>>();
  const portableOf = (device: MachineDevice) =>
    device.object.userData.portable as PortableObject | undefined;

  // ---- Walking and working ------------------------------------------------
  const portals = createPortals('dev5', devPortals('dev5', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster
      .intersectObjects([room, portals.group], true)
      .find((hit) => !isHeldPortableHit(hit.object));
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
    room: { x: 0, z: 4 * m, yaw: 0, pitch: -0.15 },
    // Just south of the skip, looking down into it.
    bin: { x: 0, z: 1.3 * m, yaw: 0, pitch: -0.6 },
  };
  for (const [i, p] of plinths.entries()) {
    // Standing in front of the plinth, between it and the bin.
    const along = (RING - 1) / RING;
    views[String(i + 1)] = {
      x: p.x * along * m,
      z: p.z * along * m,
      yaw: Math.atan2(p.x, -p.z),
      pitch: -0.55,
    };
  }
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    scene,
    nearbyTargetFeedback: tossing.targetFeedback,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    divert: tossing.divert,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.room,
    solids: () => [
      ...outer,
      ...tossing.bins.map((bin) => ({
        minX: (bin.x - bin.footprint.x / 2 - 0.05) * m,
        maxX: (bin.x + bin.footprint.x / 2 + 0.05) * m,
        minZ: (bin.z - bin.footprint.z / 2 - 0.05) * m,
        maxZ: (bin.z + bin.footprint.z / 2 + 0.05) * m,
      })),
      ...plinths.map((p) => ({
        minX: (p.x - 0.32) * m,
        maxX: (p.x + 0.32) * m,
        minZ: (p.z - 0.32) * m,
        maxZ: (p.z + 0.32) * m,
      })),
    ],
    use: (x, y) => usableAt(x, y)?.(),
    useWhileHolding: (_object, x, y) => {
      const action = usableAt(x, y);
      if (!action) return false;
      action();
      return true;
    },
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
  (window as unknown as { devBin: unknown }).devBin = {
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    /** How many things have gone in each bin. */
    fill: () => skip.filled,
    /** Restock now, without the wait, every plinth whose board has gone. */
    hurry() {
      for (const p of plinths) p.taken = RESTOCK;
    },
    /** Throw plinth boards straight into the skip, `n` of them. */
    throw(n = 1) {
      const first = skip.filled;
      for (let k = 0; k < n; k++) {
        const p = plinths[(first + k) % plinths.length];
        const board = p.board;
        const portable = board && portableOf(board);
        if (
          !board ||
          !portable ||
          portable.component.phase.value !== 'installed'
        )
          continue;
        portable.component.pickUp();
        portable.detach();
        scene.attach(board.object);
        portable.component.drop();
        tossing.toss(board.object, portable, 'skip');
      }
    },
  };

  // ---- Each frame ----------------------------------------------------------
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
    tossing.update(delta);
    lamps.update(time / 1000);
    // A plinth whose board has gone has a fresh one a little later.
    for (const p of plinths) {
      if (plinthOccupied(p.group)) {
        p.taken = 0;
        continue;
      }
      p.taken += delta;
      if (p.taken > RESTOCK)
        appearing.add(
          createMaterialise(stock(p).object, {
            seconds: MATERIALISE,
            reduced: reducedMotion(),
          }),
        );
    }
    for (const effect of appearing)
      if (!effect.update(delta)) appearing.delete(effect);
    parts.update(delta);
    portals.update(delta, walk.walker.x, walk.walker.z, !walk.following);
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    for (const effect of appearing) effect.finish();
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    parts.dispose();
    lamps.dispose();
    graffiti.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devBin?: unknown }).devBin;
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
    suspend: () => parts.setAudible(false),
    resume: () => parts.setAudible(true),
  });
}
