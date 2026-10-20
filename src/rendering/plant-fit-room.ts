import {
  AmbientLight,
  BoxGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
} from 'three';
import type { Material, Object3D } from 'three';
import {
  DROP,
  GANTRY,
  STAIR,
  STAIR_WALK,
  fitFloor,
  fitPlant,
  fitSolids,
  stairLines,
} from '../game/main-plant-fit';
import type { Rect } from '../game/main-plant-fit';
import { createBreezeBlockTextures } from '../scene/breeze-block-texture';
import { createWarehouseConcreteFloor } from '../scene/warehouse-concrete-floor';
import { createPumpPair } from '../toolkit/components/plant/views/pumps-plant';
import { plantAt } from '../toolkit/gallery/logic/control-room-demo';
import { mergeTree } from '../toolkit/components/core/views/merge-static';
import {
  DENSITY_TRIAL,
  PUMP_SET,
} from '../toolkit/gallery/rooms/plant/density-trial';
import { isLive } from '../toolkit/gallery/rooms/plant/exhibit';
import type { PlantExhibit } from '../toolkit/gallery/rooms/plant/exhibit';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import { METRE } from '../toolkit/components/core/logic/units';
import {
  createPanelKit,
  disposeKit,
} from '../toolkit/components/core/views/eighties-controls';
import { createFirstPerson } from '../toolkit/controls/input/first-person';
import {
  createPs1Material,
  ps1Uniforms,
} from '../toolkit/components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../toolkit/components/core/parts/render-style';

/** The ceiling's height over the gantry, metres. */
const ROOF = 7;
const WALL = 0.22;

/**
 * The main plant room on its own, at a trial size: a square of side
 * `side` inside its walls, its gantry round the walls at the entry level,
 * two stairs down to the lower floor, and the density trial's machines
 * (`density-trial.ts`) set out by the fit study (`main-plant-fit.ts`):
 * every one on an aisle. For comparing sizes; no corridor.
 */
export function startPlantFitRoom(canvas: HTMLCanvasElement, side: number) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 1.5));
  renderer.setClearColor('#111719');
  const freeEnvironment = useEnvironment(renderer, scene, 0.25);
  const camera = new PerspectiveCamera(62, 1, 0.05, 180 * m);
  scene.add(
    new AmbientLight('#e4e9e8', 0.55),
    new HemisphereLight('#e8eef0', '#515a5c', 0.5),
  );
  const kit = createPanelKit();
  const room = new Group();
  room.name = `main plant room, ${side} m`;
  const half = side / 2;
  const pit = half - GANTRY;

  // ---- The shell -----------------------------------------------------
  const blocks = createBreezeBlockTextures();
  kit.textures.push(blocks.map, blocks.normalMap, blocks.roughnessMap);
  const blockwork = createPs1Material({
    map: blocks.map,
    normalMap: blocks.normalMap,
    roughnessMap: blocks.roughnessMap,
    roughness: 1,
  });
  const ceiling = new MeshStandardMaterial({
    color: '#a4aaab',
    roughness: 0.85,
  });
  const deck = new MeshStandardMaterial({
    color: '#5c676b',
    metalness: 0.36,
    roughness: 0.7,
  });
  const steel = new MeshStandardMaterial({
    color: '#607078',
    metalness: 0.65,
    roughness: 0.38,
  });
  const safety = new MeshStandardMaterial({
    color: '#e1bd53',
    metalness: 0.3,
    roughness: 0.52,
  });
  const box = (
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
    room.add(mesh);
    return mesh;
  };
  /** A blockwork wall, its UVs at block size. */
  const blockWall = (
    along: 'x' | 'z',
    at: number,
    span: number,
    bottom: number,
    top: number,
  ) => {
    const height = top - bottom;
    const geometry = new BoxGeometry(
      along === 'x' ? span : WALL,
      height,
      along === 'x' ? WALL : span,
    );
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) * span, uv.getY(i) * (height / 0.4));
    const mesh = new Mesh(geometry, blockwork);
    mesh.position.set(
      along === 'x' ? 0 : at,
      (bottom + top) / 2,
      along === 'x' ? at : 0,
    );
    room.add(mesh);
  };
  const lower = new Mesh(
    new BoxGeometry(side, 0.3, side),
    createWarehouseConcreteFloor(side),
  );
  lower.position.set(0, -DROP - 0.15, 0);
  room.add(lower);
  box(ceiling, side, 0.24, side, 0, ROOF + 0.12, 0);
  for (const s of [-1, 1]) {
    blockWall('x', s * (half + WALL / 2), side + 2 * WALL, -DROP, ROOF);
    blockWall('z', s * (half + WALL / 2), side, -DROP, ROOF);
  }
  // The gantry: a steel deck round the walls, a kicker and a rail at its edge.
  for (const s of [-1, 1]) {
    box(deck, side, 0.2, GANTRY, 0, -0.1, s * (pit + GANTRY / 2));
    box(deck, GANTRY, 0.2, 2 * pit, s * (pit + GANTRY / 2), -0.1, 0);
  }
  const stairs = stairLines(side);
  /** The gantry's edge, less the gaps where the stairs leave it. */
  const edgeRuns = (along: 'x' | 'z', at: number): [number, number][] => {
    const gaps = stairs
      .filter((s) => along === 'x' && Math.abs(s.startZ - at) < 1e-6)
      .map((s) => [s.x - STAIR_WALK / 2, s.x + STAIR_WALK / 2] as const);
    const runs: [number, number][] = [];
    let from = -pit;
    for (const [a, b] of gaps.sort((p, q) => p[0] - q[0])) {
      runs.push([from, a]);
      from = b;
    }
    runs.push([from, pit]);
    return runs;
  };
  for (const [along, at] of [
    ['x', -pit],
    ['x', pit],
    ['z', -pit],
    ['z', pit],
  ] as const)
    for (const [a, b] of edgeRuns(along, at)) {
      const len = b - a,
        mid = (a + b) / 2;
      const [x, z] = along === 'x' ? [mid, at] : [at, mid];
      const [w, d] = along === 'x' ? [len, 0.06] : [0.06, len];
      box(safety, w, 0.05, d, x, 1.1, z);
      box(safety, w, 0.04, d, x, 0.55, z);
      box(
        steel,
        along === 'x' ? len : 0.1,
        0.15,
        along === 'x' ? 0.1 : len,
        x,
        0.075,
        z,
      );
      for (
        let t = a;
        t <= b + 1e-6;
        t += Math.max(1, len / Math.ceil(len / 1.8))
      )
        box(
          safety,
          0.05,
          1.1,
          0.05,
          along === 'x' ? t : at,
          0.55,
          along === 'x' ? at : t,
        );
    }
  // The stairs: treads down from the gantry, a stringer and a rail either side.
  const treads = 18;
  for (const s of stairs) {
    const step = STAIR.run / treads;
    for (let i = 0; i < treads; i++) {
      const y = (-DROP * (i + 1)) / treads;
      box(
        deck,
        STAIR_WALK,
        0.06,
        step,
        s.x,
        y - 0.03,
        s.startZ + s.direction * (i + 0.5) * step,
      );
    }
    for (const side of [-1, 1]) {
      const rail = new Mesh(
        new BoxGeometry(0.06, 0.06, Math.hypot(STAIR.run, DROP)),
        safety,
      );
      rail.position.set(
        s.x + side * (STAIR_WALK / 2 + 0.05),
        -DROP / 2 + 1,
        s.startZ + (s.direction * STAIR.run) / 2,
      );
      rail.rotation.x = s.direction * Math.atan2(DROP, STAIR.run);
      room.add(rail);
    }
  }
  room.add(...mergeShell(room));

  // ---- The machines, set out by the fit study ---------------------------
  const equipment = new Group();
  equipment.name = 'equipment';
  room.add(equipment);
  const list: PlantExhibit[] = [PUMP_SET, ...DENSITY_TRIAL];
  const fit = fitPlant(
    side,
    list.map((e) => ({ name: e.title, w: e.size.w, d: e.size.d })),
  );
  const pumpPair = createPumpPair(kit);
  const live: { update?(delta: number): void; dispose?(): void }[] = [];
  const footprints: Rect[] = [];
  const unused = [...list];
  for (const p of fit.placed) {
    const exhibit = unused.splice(
      unused.findIndex((e) => e.title === p.name),
      1,
    )[0];
    let object: Object3D;
    if (exhibit === PUMP_SET) object = pumpPair;
    else {
      const built = exhibit.build(kit);
      object = isLive(built) ? built.object : built;
      if (isLive(built)) live.push(built);
    }
    object.name = exhibit.title;
    // The fit lays every machine its long side east–west.
    if (exhibit.size.w < exhibit.size.d) object.rotation.y = Math.PI / 2;
    object.position.set(
      (p.rect.minX + p.rect.maxX) / 2,
      -DROP,
      (p.rect.minZ + p.rect.maxZ) / 2,
    );
    equipment.add(object);
    footprints.push(p.rect);
  }
  const cabinets = equipment.children.filter((o) =>
    ['LV main switchboard', 'Motor control centre'].includes(o.name),
  );
  for (const c of cabinets) equipment.remove(c);
  mergeTree(equipment, (part) => part.userData.live === true, Infinity, {
    share: true,
    originals: (meshes) => meshes.forEach((mesh) => mesh.geometry.dispose()),
  });
  for (const c of cabinets) equipment.add(c);
  room.scale.setScalar(m);
  scene.add(room);

  // Lights: a grid under the ceiling, about one every 12 m.
  const n = Math.max(2, Math.round(side / 12));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const light = new PointLight('#edf6f4', 3.5 * m * m, 30 * m, 2);
      light.position.set(
        (-half + (side * (i + 0.5)) / n) * m,
        (ROOF - 0.6) * m,
        (-half + (side * (j + 0.5)) / n) * m,
      );
      scene.add(light);
    }

  // ---- Walking --------------------------------------------------------
  const scaled = (f: Footprint): Footprint => ({
    minX: f.minX * m,
    maxX: f.maxX * m,
    minZ: f.minZ * m,
    maxZ: f.maxZ * m,
  });
  const solids = fitSolids(side, footprints, WALL).map(scaled);
  const views = {
    start: { x: 0, z: half - 1.2, yaw: 0, pitch: -0.12 },
    floor: { x: 0, z: pit - 1, yaw: 0, pitch: 0 },
  };
  const pose = (name: string | null) =>
    views[(name ?? 'start') as keyof typeof views] ?? views.start;
  const start = pose(new URLSearchParams(location.search).get('view'));
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    floorAt: (x, z) => fitFloor(side, x / m, z / m) * m,
    objects: scene,
    start: { ...start, x: start.x * m, z: start.z * m },
    solids: () => solids,
    use: () => {},
    aimed: () => false,
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
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    const reading = plantAt(time / 1000);
    const [duty, standby] = pumpPair.pumps;
    duty.gauges.suction.set(0.18 - (reading.flow - 600) * 0.001);
    duty.gauges.discharge.set(
      2.1 + 0.3 * (Math.max(...reading.filterDp) - 0.4),
    );
    standby.gauges.suction.set(0.22);
    standby.gauges.discharge.set(0.22);
    for (const pump of pumpPair.pumps) {
      pump.gauges.suction.update(delta);
      pump.gauges.discharge.update(delta);
    }
    for (const l of live) l.update?.(delta);
    renderer.render(scene, camera);
  });
  (window as unknown as { plantFit: unknown }).plantFit = {
    side,
    left: fit.unplaced.map((u) => u.name),
    /** Where the walker stands, metres. */
    where() {
      const p = walk.pose();
      return { ...p, x: p.x / m, y: p.y / m, z: p.z / m };
    },
    /** Where each machine stands, metres. */
    machines: () => fit.placed.map((p) => ({ name: p.name, ...p.rect })),
    view(name: string) {
      const p = pose(name);
      walk.place(p.x * m, p.z * m, p.yaw, p.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
  };
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    for (const l of live) l.dispose?.();
    disposeKit(kit, scene as unknown as Group);
    scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    for (const material of [ceiling, deck, steel, safety]) material.dispose();
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { plantFit?: unknown }).plantFit;
  };
  return Object.assign(dispose, {
    enter() {
      const p = pose(new URLSearchParams(location.search).get('view'));
      walk.place(p.x * m, p.z * m, p.yaw, p.pitch);
    },
  });
}

/** The shell's many plain boxes, merged by material: a few draws, not hundreds. */
function mergeShell(room: Group): Object3D[] {
  const shell = new Group();
  for (const child of [...room.children]) shell.add(child);
  mergeTree(shell, () => false, Infinity, { share: true });
  return [shell];
}
