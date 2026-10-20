import {
  AmbientLight,
  CanvasTexture,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import {
  LOOP_INNER,
  LOOP_OUTER_BOUNDS,
  LOOP_ZONES,
  doorway,
  visibleZones,
  zoneAt,
} from '../game/dev-corridor-plan';
import { createDevCorridor } from '../scene/dev-corridor';
import {
  LOADING_BAY,
  createLoadingBay,
  loadingBayWalls,
} from '../scene/loading-bay';
import { createPumpPair } from '../toolkit/components/plant/views/pumps-plant';
import { plantAt } from '../toolkit/gallery/logic/control-room-demo';
import { mergeTree } from '../toolkit/components/core/views/merge-static';
import { EXHIBITS as PUMP_EXHIBITS } from '../toolkit/gallery/rooms/plant/pumps';
import { EXHIBITS as BALANCE_EXHIBITS } from '../toolkit/gallery/rooms/plant/balance';
import { EXHIBITS as CHEMICAL_EXHIBITS } from '../toolkit/gallery/rooms/plant/chemicals';
import { EXHIBITS as DOSING_EXHIBITS } from '../toolkit/gallery/rooms/plant/dosing';
import { EXHIBITS as BOILER_EXHIBITS } from '../toolkit/gallery/rooms/plant/boiler';
import { EXHIBITS as AIR_EXHIBITS } from '../toolkit/gallery/rooms/plant/air';
import { EXHIBITS as ELECTRICAL_EXHIBITS } from '../toolkit/gallery/rooms/plant/electrical';
import { EXHIBITS as OZONE_EXHIBITS } from '../toolkit/gallery/rooms/plant/ozone';
import { isLive } from '../toolkit/gallery/rooms/plant/exhibit';
import {
  createMainPlantRoom,
  MAIN_PLANT_WALL_FITTINGS,
} from '../scene/main-plant-room';
import {
  GANTRY_INNER,
  mainPlantFloor,
  PLANT_STAIRS,
  STAIR_RUN,
  STAIR_WIDTH,
} from '../game/main-plant-plan';
import { devWalls } from '../toolkit/gallery/logic/dev-room-links';
import { cutOpenings } from '../toolkit/controls/logic/walk-collision';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import { METRE } from '../toolkit/components/core/logic/units';
import {
  createPanelKit,
  disposeKit,
} from '../toolkit/components/core/views/eighties-controls';
import { createFirstPerson } from '../toolkit/controls/input/first-person';
import { partAudio } from '../toolkit/components/core/audio/part-audio';
import { ps1Uniforms } from '../toolkit/components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../toolkit/components/core/parts/render-style';

const PLANT_CORRIDOR_CEILING = 4;

/** The plant corridor and the room at its centre share one physical scene. */
export function startPlantCorridorRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const horizonCanvas = document.createElement('canvas');
  horizonCanvas.width = 2;
  horizonCanvas.height = 512;
  const context = horizonCanvas.getContext('2d')!;
  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#c8cfd0');
  gradient.addColorStop(0.5, '#dfe4e4');
  gradient.addColorStop(0.75, '#f6f7f7');
  gradient.addColorStop(1, '#ffffff');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 2, 512);
  const horizon = new CanvasTexture(horizonCanvas);
  horizon.colorSpace = SRGBColorSpace;
  scene.background = horizon;
  const renderer = createRenderer(canvas);
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 1.5));
  const profile = new URLSearchParams(location.search).has('perf');
  renderer.info.autoReset = !profile;
  renderer.shadowMap.enabled = true;
  renderer.setClearColor('#ffffff');
  const freeEnvironment = useEnvironment(renderer, scene, 0.25);
  const camera = new PerspectiveCamera(62, 1, 0.05, 180 * m);
  scene.add(
    new AmbientLight('#e4e9e8', 0.55),
    new HemisphereLight('#e8eef0', '#515a5c', 0.5),
  );
  const kit = createPanelKit();
  const corridor = createDevCorridor(kit, {
    ceiling: PLANT_CORRIDOR_CEILING,
    rooms: [],
    innerName: 'MAIN PLANT ROOM',
    spare: 'PLANT STORE',
    // The loading bay, across the corridor from the main plant room's door.
    openings: [LOADING_BAY.opening],
  });
  corridor.group.scale.setScalar(m);
  scene.add(corridor.group);
  const plant = createMainPlantRoom(corridor.blockwork);
  const equipment = new Group();
  equipment.name = 'lower floor equipment trial';
  plant.add(equipment);
  const bay = createLoadingBay(kit, corridor.blockwork);
  bay.scale.setScalar(m);
  scene.add(bay);
  for (const [x, z] of [
    [-2.5, 31],
    [2.5, 36],
  ]) {
    const light = new PointLight('#f1f3ec', 4 * m * m, 22 * m, 2);
    light.position.set(x * m, (LOADING_BAY.height - 0.4) * m, z * m);
    scene.add(light);
  }
  const pumpPair = createPumpPair(kit);
  pumpPair.name = 'main pool circulation pumps P-101A and P-101B';
  pumpPair.position.y = -3;
  equipment.add(pumpPair);
  // A dense rendering trial: one of each floor-standing development model.
  // Keep the northeast and southwest stair approaches free.
  const trialModels = [
    ...[1, 4, 5, 6, 7, 8].map((i) => PUMP_EXHIBITS[i]),
    ...BALANCE_EXHIBITS.slice(0, 4),
    ...CHEMICAL_EXHIBITS.slice(0, 4),
    ...DOSING_EXHIBITS.slice(0, 2),
    ...BOILER_EXHIBITS.slice(0, 6),
    ...AIR_EXHIBITS.slice(0, 3),
    ...ELECTRICAL_EXHIBITS.slice(0, 4),
    ...OZONE_EXHIBITS.slice(0, 5),
  ];
  const trialPlaces = [-16, -9.6, -3.2, 3.2, 9.6, 16].flatMap((z) =>
    [-16, -9.6, -3.2, 3.2, 9.6, 16]
      .filter((x) => !(x === 16 && z === -16) && !(x === -16 && z === 16))
      .map((x) => ({ x, z })),
  );
  const trialEquipment = trialModels.map((exhibit, i) => {
    const { x, z } = trialPlaces[i];
    const built = exhibit.build(kit);
    const object = isLive(built) ? built.object : built;
    object.name = exhibit.title;
    object.position.set(x, -3, z);
    equipment.add(object);
    return { exhibit, built, x, z };
  });
  const separateCabinets = trialEquipment
    .filter(({ exhibit }) =>
      ['LV main switchboard', 'Motor control centre'].includes(exhibit.title),
    )
    .map(({ built }) => (isLive(built) ? built.object : built));
  for (const cabinet of separateCabinets) equipment.remove(cabinet);
  mergeTree(equipment, (part) => part.userData.live === true, Infinity, {
    share: true,
    originals: (meshes) => meshes.forEach((mesh) => mesh.geometry.dispose()),
  });
  for (const cabinet of separateCabinets) equipment.add(cabinet);
  plant.scale.setScalar(m);
  scene.add(plant);
  const plantLights = Array.from({ length: 6 }, () => {
    const light = new PointLight('#edf6f4', 0, 38 * m, 2);
    scene.add(light);
    return light;
  });
  const corridorLights = Array.from({ length: 6 }, () => {
    const light = new PointLight('#f4f5ec', 0, 10 * m, 2);
    scene.add(light);
    return light;
  });
  const bounds: Footprint = {
    minX: LOOP_OUTER_BOUNDS.minX * m,
    maxX: LOOP_OUTER_BOUNDS.maxX * m,
    minZ: LOOP_OUTER_BOUNDS.minZ * m,
    maxZ: LOOP_OUTER_BOUNDS.maxZ * m,
  };
  const o = LOADING_BAY.opening;
  const scaled = (f: Footprint): Footprint => ({
    minX: f.minX * m,
    maxX: f.maxX * m,
    minZ: f.minZ * m,
    maxZ: f.maxZ * m,
  });
  // The corridor's outer wall, open into the loading bay; then the bay's own.
  const outer = [
    ...cutOpenings(devWalls(bounds, m, PLANT_CORRIDOR_CEILING * m), [
      scaled({
        minX: o.t - o.width / 2,
        maxX: o.t + o.width / 2,
        minZ: LOOP_OUTER_BOUNDS.maxZ - 0.5,
        maxZ: LOOP_OUTER_BOUNDS.maxZ + 0.5,
      }),
    ]),
    ...loadingBayWalls().map(scaled),
  ];
  const innerDoors = corridor.doors.filter((d) => d.door.wall === 'inner');
  const outerDoors = corridor.doors.filter((d) => d.door.wall === 'outer');
  const solids = () => {
    const t = 0.18 * m;
    const b = LOOP_INNER * m;
    const walls: Footprint[] = [
      { minX: -b, maxX: b, minZ: -b - t, maxZ: -b + t },
      { minX: -b, maxX: b, minZ: b - t, maxZ: b + t },
      { minX: -b - t, maxX: -b + t, minZ: -b, maxZ: b },
      { minX: b - t, maxX: b + t, minZ: -b, maxZ: b },
    ];
    const holes = innerDoors
      .filter((d) => d.part.door.open)
      .map((d) => {
        const p = doorway(d.door);
        return {
          minX: (p.x - 0.7) * m,
          maxX: (p.x + 0.7) * m,
          minZ: (p.z - 0.7) * m,
          maxZ: (p.z + 0.7) * m,
        };
      });
    const pit = GANTRY_INNER * m;
    const edge: Footprint[] = [
      { minX: -pit, maxX: pit, minZ: -pit - t, maxZ: -pit + t },
      { minX: -pit, maxX: pit, minZ: pit - t, maxZ: pit + t },
      { minX: -pit - t, maxX: -pit + t, minZ: -pit, maxZ: pit },
      { minX: pit - t, maxX: pit + t, minZ: -pit, maxZ: pit },
    ];
    const stairGaps = PLANT_STAIRS.map((s) => ({
      minX: (s.x - STAIR_WIDTH / 2) * m,
      maxX: (s.x + STAIR_WIDTH / 2) * m,
      minZ: (s.startZ - 0.4) * m,
      maxZ: (s.startZ + 0.4) * m,
    }));
    const stairSides: Footprint[] = PLANT_STAIRS.flatMap((s) => {
      const a = Math.min(s.startZ, s.startZ + s.direction * STAIR_RUN) * m;
      const b = Math.max(s.startZ, s.startZ + s.direction * STAIR_RUN) * m;
      return [-1, 1].map((side) => ({
        minX: (s.x + side * (STAIR_WIDTH / 2 + 0.04) - 0.06) * m,
        maxX: (s.x + side * (STAIR_WIDTH / 2 + 0.04) + 0.06) * m,
        minZ: a,
        maxZ: b,
      }));
    });
    return [
      ...outer,
      ...cutOpenings(walls, holes),
      ...cutOpenings(edge, stairGaps),
      ...stairSides,
      // The pump plinth remains inaccessible at lower-floor level.
      { minX: -1.65 * m, maxX: 1.65 * m, minZ: -1.3 * m, maxZ: 1.3 * m },
      ...trialEquipment.map(({ exhibit, x, z }) => ({
        minX: (x - exhibit.size.w / 2) * m,
        maxX: (x + exhibit.size.w / 2) * m,
        minZ: (z - exhibit.size.d / 2) * m,
        maxZ: (z + exhibit.size.d / 2) * m,
      })),
    ];
  };
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usable = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(corridor.group, true).find((h) => {
      for (let p: Object3D | null = h.object; p; p = p.parent)
        if (!p.visible) return false;
      return true;
    });
    if (!hit || hit.distance > 4 * m) return null;
    for (let p: Object3D | null = hit.object; p; p = p.parent) {
      const use = corridor.parts.uses.get(p);
      if (use) return use;
    }
    return null;
  };
  const views = {
    start: { x: 0, z: 25, yaw: 0, pitch: 0 },
    corridor: { x: -20, z: -25, yaw: Math.PI / 2, pitch: 0 },
    south: { x: 0, z: 24.8, yaw: 0, pitch: 0 },
    north: { x: 0, z: -24.8, yaw: Math.PI, pitch: 0 },
    west: { x: -24.8, z: 0, yaw: Math.PI / 2, pitch: 0 },
    gantry: { x: 0, z: 22.2, yaw: 0, pitch: -0.12 },
    gantry_surface: { x: 8, z: 22.2, yaw: 0, pitch: -0.72 },
    floor_south: { x: 0, z: 15, yaw: 0, pitch: 0 },
    mcc_side: { x: 0.4, z: 9.6, yaw: Math.PI / 2, pitch: 0 },
    switchgear_sides: { x: -13, z: 9.6, yaw: Math.PI / 2, pitch: 0 },
    break_tank: { x: -3.2, z: -7.8, yaw: 0, pitch: 0 },
    air_dryer: { x: -3.2, z: 17.4, yaw: 0, pitch: -0.4 },
    column_corner: { x: 18, z: 18, yaw: (3 * Math.PI) / 4, pitch: 0.1 },
    northeast_stair: {
      x: PLANT_STAIRS[0].x,
      z: -22,
      yaw: Math.PI,
      pitch: -0.25,
    },
    southwest_stair: { x: PLANT_STAIRS[1].x, z: 22, yaw: 0, pitch: -0.25 },
    northeast_landing: { x: PLANT_STAIRS[0].x, z: -14.1, yaw: 0, pitch: -0.05 },
    plant_door_inside: { x: 0, z: 22.2, yaw: Math.PI, pitch: 0 },
    plant_door_sill: { x: 0, z: 21.1, yaw: Math.PI, pitch: -0.38 },
    loading_bay: { x: 0, z: 38, yaw: 0, pitch: 0 },
    loading_docks: { x: 0, z: 32, yaw: Math.PI, pitch: 0.1 },
    loading_jamb: { x: 1.4, z: 28.5, yaw: 0, pitch: -0.35 },
    loading_bay_light: { x: 3.1, z: 23.8, yaw: Math.PI, pitch: 0.2 },
  };
  const pose = (name: string | null) =>
    views[(name ?? 'start') as keyof typeof views] ?? views.start;
  const start = pose(new URLSearchParams(location.search).get('view'));
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    floorAt: (x, z) => mainPlantFloor(x / m, z / m) * m,
    objects: scene,
    start: { ...start, x: start.x * m, z: start.z * m },
    solids,
    use: (x, y) => usable(x, y)?.(),
    aimed: () => Boolean(usable(0, 0)),
  });
  const fittings = corridor.fittings.map((f) => ({
    ...f,
    zone: zoneAt(f.x, f.z) ?? 'north.middle',
  }));
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
  let renderMs = 0;
  let frameIntervalMs = 0;
  let frames = 0;
  const frame = (time: number) => {
    const elapsed = last ? time - last : 0;
    const delta = last ? Math.min(0.1, Math.max(0, elapsed / 1000)) : 0;
    if (profile && elapsed > 0)
      frameIntervalMs += (Math.min(elapsed, 200) - frameIntervalMs) * 0.1;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    const x = walk.walker.x / m,
      z = walk.walker.z / m;
    for (const d of innerDoors) {
      const p = doorway(d.door);
      d.part.hold(
        d.part.door.open && Math.abs(x - p.x) < 0.7 && Math.abs(z - p.z) < 0.7,
      );
    }
    corridor.parts.update(delta);
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
    for (const { built } of trialEquipment)
      if (isLive(built)) built.update?.(delta);
    const inside = Math.max(Math.abs(x), Math.abs(z)) < LOOP_INNER;
    const through = innerDoors.some((d) => d.part.door.open);
    plant.visible = inside || through;
    for (const d of outerDoors) d.part.object.visible = !inside || through;
    for (const [level, offset] of [
      [-0.6, 0],
      [5.35, 3],
    ] as const) {
      const near = MAIN_PLANT_WALL_FITTINGS.filter((f) => f.y === level)
        .sort(
          (a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z),
        )
        .slice(0, 3);
      near.forEach((f, i) => {
        const light = plantLights[offset + i];
        light.visible = plant.visible;
        light.intensity = 4 * m * m;
        light.position.set(f.x * m, f.y * m, f.z * m);
      });
    }
    const seen = inside || through ? new Set(LOOP_ZONES) : visibleZones(x, z);
    for (const id of LOOP_ZONES)
      corridor.zones.get(id)!.group.visible = seen.has(id);
    const near = fittings
      .filter((f) => seen.has(f.zone))
      .sort(
        (a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z),
      )
      .slice(0, corridorLights.length);
    corridorLights.forEach((light, i) => {
      const f = near[i];
      light.intensity = f && (!inside || through) ? 3 * m * m : 0;
      if (f) light.position.set(f.x * m, f.y * m, f.z * m);
    });
    partAudio.listen(camera, m);
    if (profile) {
      renderer.info.reset();
      const beforeRender = performance.now();
      renderer.render(scene, camera);
      renderMs += (performance.now() - beforeRender - renderMs) * 0.1;
      if (++frames % 30 === 0)
        canvas.dataset.perf = JSON.stringify({
          renderMs,
          frameIntervalMs,
          ...renderer.info.render,
        });
    } else renderer.render(scene, camera);
  };
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    frame(time);
  });
  (window as unknown as { plantCorridor: unknown }).plantCorridor = {
    stats: () => ({ renderMs, frameIntervalMs, ...renderer.info.render }),
    view(name: string) {
      const p = pose(name);
      walk.place(p.x * m, p.z * m, p.yaw, p.pitch);
    },
    open(side: string) {
      innerDoors.find((d) => d.door.side === side)?.part.door.push(1);
    },
    doors: () =>
      innerDoors.map((d) => ({ side: d.door.side, open: d.part.door.open })),
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
  };
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    corridor.parts.dispose();
    for (const { built } of trialEquipment)
      if (isLive(built)) built.dispose?.();
    disposeKit(kit, scene as unknown as Group);
    const plantMaterials = new Set<MeshStandardMaterial>();
    plant.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material])
        if (material instanceof MeshStandardMaterial)
          plantMaterials.add(material);
    });
    for (const material of plantMaterials) {
      material.map?.dispose();
      material.dispose();
    }
    scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    freeEnvironment();
    horizon.dispose();
    renderer.dispose();
    delete (window as unknown as { plantCorridor?: unknown }).plantCorridor;
  };
  return Object.assign(dispose, {
    enter(_previous: string | null) {
      const p = pose(new URLSearchParams(location.search).get('view'));
      walk.place(p.x * m, p.z * m, p.yaw, p.pitch);
    },
    suspend() {
      corridor.parts.setAudible(false);
    },
    resume() {
      corridor.parts.setAudible(true);
    },
  });
}
