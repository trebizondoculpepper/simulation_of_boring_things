import { createYardDressing } from '../views/yard-dressing';
import { yardIntake } from '../views/yard-intake';
import { dockDoor } from '../views/dock-door';
import { YARD, dockFloorAt, dockYardSolids } from '../logic/dock-yard';
import { createDockSafety, dockFireAlarm } from '../views/dock-safety';
import {
  createDockFittings,
  dockChannel,
  dockPalletSolids,
} from '../views/dock-fittings';
import { SHELL_WALL } from '../logic/shell-rooms';
import { createDockOutside } from '../views/dock-outside';
import { createInspector } from '../views/inspect-pick';
import { touchingAt } from '../../controls/input/touch-point';
import { computed, signal } from '@preact/signals-core';
import {
  actOnZoneMusic,
  newZoneMusic,
  stepZoneMusic,
} from '../../../game/plant/music';
import { serviceAvailable } from '../../../game/plant/services';
import { roomWorld } from '../../save/world-store';
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  HemisphereLight,
  HalfFloatType,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import type { Object3D } from 'three';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import {
  createComposer,
  createRenderer,
} from '../../components/core/parts/render-style';
import { METRE } from '../../components/core/logic/units';
import { partAudio } from '../../components/core/audio/part-audio';
import {
  createFirstPerson,
  WALKER_RADIUS_METRES,
} from '../../controls/input/first-person';
import {
  humanLadderLandingAt,
  humanLadderLandingSolids,
  humanLadderZones,
} from '../../components/architectural/views/human-ladder';
import { isHeldPortableHit } from '../../controls/input/object-handling';
import { DEFAULT_POOL_LOOK, POOL_LOOKS } from '../logic/pool-looks';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { createZoneMusicRack } from '../../components/sound/parts/zone-music-rack';
import { JACUZZI_MUSIC } from '../audio/jacuzzi-music';
import type { Part } from '../../components/core/parts/parts';
import { createPartSet } from '../../components/core/parts/parts';
import { knobDirection } from '../../controls/input/knob-turning';
import {
  activeDoorway,
  pickDoorway,
  registerJoint,
  useDoorway,
} from '../logic/door-joins';
import type { Joint } from '../logic/door-joins';
import { doorwayStops, overlaps } from '../logic/doorway';
import { doorReaders } from '../../components/architectural/logic/card-reader';
import { enterDevRoom } from '../logic/dev-room-links';
import type { RoomId } from '../logic/dev-room-links';
import {
  SHELL_ROOMS,
  shellDoorPlace,
  shellDoorway,
  shellOpening,
  shellSolids,
  throughShellDoor,
  wetHallFloorAt,
  wetHallPartition,
  wetHallPitWalls,
  wetHallRails,
  wetHallRoom,
} from '../logic/shell-rooms';
import type {
  ShellAperture,
  ShellDoor,
  ShellRoomId,
} from '../logic/shell-rooms';
import { airFloorAt, airBox, gantries, levelSolids } from '../logic/air-plant';
import {
  STAIR_TOWER,
  stairTowerRuns,
  surfaceFloorAt,
} from '../logic/stair-run';
import { createStairStructure, gantryColumnFeet } from '../views/stair-run';
import type { Footprint } from '../../controls/logic/walk-collision';
import {
  createShellRoom,
  createWetHall,
  wetHallBayDoors,
  wetHallFireAlarm,
} from '../views/shell-room';
import { createRoomEquipment } from '../views/room-equipment';
import type { EquipmentDoorsPart } from '../../components/architectural/parts/equipment-doors';
import type { Group } from 'three';
import { bindRoomLights } from '../views/room-lights';
import {
  createDoorPresence,
  doorActor,
} from '../../components/architectural/logic/door-proximity';
import { zoneOfRoom } from '../../../game/plant/lighting';
import { bindRoomPower, roomPowered } from '../views/room-power';
import type { ServiceRoom } from '../../../game/plant/services';

const SEEDS: Record<ShellRoomId, number> = {
  boiler_house: 61,
  loading_bay: 67,
  hypo_store: 71,
  acid_store: 73,
  switch_room: 79,
  air_plant: 83,
  control_room: 89,
  engineers_office: 97,
};

/** The air plant's gantries and stair (`logic/air-plant.ts`). */
const airSurfaces = gantries(airBox());

/** One of the main plant's empty rooms (`logic/shell-rooms.ts`), in its own scene. */
export function startShellRoom(canvas: HTMLCanvasElement, id: ShellRoomId) {
  const spec = SHELL_ROOMS[id];
  const room = {
    w: spec.w,
    d: spec.d,
    doors: spec.doors,
    apertures: ('apertures' in spec ? spec.apertures : undefined) as
      | readonly ShellAperture[]
      | undefined,
  };
  const channels = (room.apertures ?? [])
    .filter((o) => !o.door)
    .map((o) => dockChannel(o, -spec.d / 2));
  // The loading dock's way out to the yard (prompts 073, 080).
  const yard = {
    wallZ: -spec.d / 2,
    thickness: SHELL_WALL,
    doorX: room.apertures?.find((o) => o.door)?.at ?? 0,
    channels,
  };
  let pierOpen = () => false;
  const lorryOpenings = (room.apertures ?? []).filter((o) => !o.door);
  return runShell(canvas, {
    self: id,
    ...(id === 'loading_bay'
      ? {
          install: (kit: ReturnType<typeof createPanelKit>) => {
            const door = dockDoor(kit, { x: yard.doorX, wallZ: yard.wallZ });
            pierOpen = door.open;
            return [
              ...dockFireAlarm(kit, { hw: spec.w / 2, hd: spec.d / 2 }),
              door.part,
              // The site's intake on the outside wall (prompt 083).
              ...yardIntake(kit),
            ];
          },
          // Out through the pier door, down the steps, onto the tarmac.
          levelSolids: (y: number) => [
            ...dockYardSolids(yard, y < YARD.level / 2),
            // The door's leaf while it is shut.
            ...(pierOpen()
              ? []
              : [
                  {
                    minX: yard.doorX - 0.5,
                    maxX: yard.doorX + 0.5,
                    minZ: yard.wallZ - yard.thickness,
                    maxZ: yard.wallZ,
                  },
                ]),
          ],
        }
      : {}),
    room,
    build: (metre, kit) => {
      const built = createShellRoom(metre, kit, {
        ...room,
        floor: 0,
        roof: spec.height,
        // The control room's walls are its mimics': no title card there.
        title:
          id === 'control_room' || id === 'loading_bay' ? null : spec.title,
        titleHeight: (spec as { titleHeight?: number }).titleHeight,
        // The loading dock's lorry channels, cut out of its floor; its
        // lights a metre higher, all at one level (the owner, 2026-10-26).
        floorHoles: channels,
        ...(id === 'loading_bay' ? { battenHeight: 4.1 } : {}),
        note: spec.note,
        seed: SEEDS[id],
      });
      // The loading dock's openings look out on the yard; its fittings
      // and pallets (prompt 073).
      if (id === 'loading_bay') {
        built.group.add(
          createDockOutside(kit, {
            wallZ: -spec.d / 2 - SHELL_WALL,
            width: spec.w,
            thickness: SHELL_WALL,
            openings: (room.apertures ?? []).filter((o) => !o.door),
            doorX: yard.doorX,
          }).group,
          createDockFittings(kit, {
            wallZ: -spec.d / 2,
            thickness: SHELL_WALL,
            apertures: lorryOpenings,
          }).group,
          createYardDressing(kit, lorryOpenings, yard.doorX),
          createDockSafety(kit, {
            wallZ: -spec.d / 2,
            hw: spec.w / 2,
            hd: spec.d / 2,
            thickness: SHELL_WALL,
            apertures: lorryOpenings,
          }).group,
        );
      }
      return built;
    },
    // The air plant's gantries and stair: walked on, or under, by the
    // height one comes from; their handrails only up on them.
    floorAt:
      id === 'air_plant'
        ? (x, z, previous) => airFloorAt(airSurfaces, x, z, previous)
        : id === 'loading_bay'
          ? (x, z) => dockFloorAt(yard, x, z)
          : () => 0,
    ...(id === 'air_plant'
      ? { levelSolids: (y: number) => levelSolids(airSurfaces, y) }
      : {}),
    solids: [
      ...shellSolids(room),
      ...(id === 'loading_bay' ? dockPalletSolids() : []),
    ],
    // Just inside its first door, looking into the room.
    start: (() => {
      const p = shellDoorPlace(room, spec.doors[0]);
      return {
        x: p.inner.x + p.into[0] * 0.8,
        z: p.inner.z + p.into[1] * 0.8,
        yaw: Math.atan2(p.into[0], -p.into[1]),
      };
    })(),
  });
}

/** The planned duty manager's office, listed by URL until its doors are placed. */
export function startDutyManagersOffice(canvas: HTMLCanvasElement) {
  const room = { w: 8, d: 8, doors: [] as ShellDoor[] };
  return runShell(canvas, {
    self: 'duty_managers_office',
    room,
    powered: () => true,
    build: (metre, kit) =>
      createShellRoom(metre, kit, {
        ...room,
        floor: 0,
        roof: 2.7,
        title: 'DUTY MANAGER’S OFFICE',
        services: false,
        note: 'Duty manager’s desk, logbook and test kit',
        seed: 101,
      }),
    floorAt: () => 0,
    solids: shellSolids(room),
    start: { x: 0, z: 3, yaw: 0 },
  });
}

/** A standalone music-effects lab, using the jacuzzi plant room’s rack components. */
export function startMusicEffectsRoom(canvas: HTMLCanvasElement) {
  const room = { w: 6, d: 6, doors: [] as ShellDoor[] };
  return runShell(canvas, {
    self: 'dev36',
    room,
    powered: () => true,
    build: (metre, kit) =>
      createShellRoom(metre, kit, {
        ...room,
        floor: 0,
        roof: 3,
        title: 'DEV36 · MUSIC EFFECTS',
        services: false,
        note: 'Jacuzzi music: 1U source, NEXT track, 3U amplifier, ON/OFF and VOLUME.',
        seed: 36,
      }),
    install: (kit) => {
      const state = signal(newZoneMusic());
      const store = roomWorld();
      const powered = store.read((w) =>
        serviceAvailable(w.plant, 'plant_pool_03', 'power'),
      );
      const act = (action: Parameters<typeof actOnZoneMusic>[1]) => {
        state.value = actOnZoneMusic(state.value, action);
      };
      const rack = createZoneMusicRack(
        kit,
        {
          source: computed(() => state.value.zones.jacuzzi.source),
          amplifier: computed(() => state.value.zones.jacuzzi.amplifier),
          powered,
          skip: () => act({ type: 'skip', zone: 'jacuzzi' }),
          toggle: () => act({ type: 'toggle', zone: 'jacuzzi' }),
          volume: (volume) => act({ type: 'volume', zone: 'jacuzzi', volume }),
        },
        JACUZZI_MUSIC,
      );
      rack.object.position.set(0, 1.05, -2.5);
      return [
        {
          ...rack,
          update(delta: number) {
            state.value = stepZoneMusic(state.value, delta, powered.value);
            rack.update(delta);
          },
        },
      ];
    },
    floorAt: () => 0,
    solids: [
      ...shellSolids(room),
      { minX: -0.35, maxX: 0.35, minZ: -3, maxZ: -2.4 },
    ],
    start: { x: 0, z: -1.85, yaw: 0, pitch: -0.2 },
  });
}

/**
 * The stair test room (dev34): a wide room four storeys tall, a deck at
 * each upper storey along its west wall and the stair helper's stair
 * outside them, from the floor to the top (`logic/stair-run.ts`). No
 * doors; nothing else in it.
 */
export function startStairTowerRoom(canvas: HTMLCanvasElement) {
  const { w, d, height } = STAIR_TOWER;
  const room = { w, d, doors: [] as ShellDoor[] };
  const runs = stairTowerRuns();
  const surfaces = runs.flatMap((r) => r.surfaces);
  return runShell(canvas, {
    self: 'dev34',
    room,
    build: (metre, kit) => {
      const built = createShellRoom(metre, kit, {
        ...room,
        floor: 0,
        roof: height,
        title: 'DEV34 · STAIR TOWER',
        note: 'four storeys, the stair helper from floor to top, painted and stainless',
        seed: 34,
      });
      for (const r of runs)
        built.group.add(
          createStairStructure(kit, r.surfaces, 0, {
            side: r.side,
            finish: r.finish,
          }),
        );
      return built;
    },
    floorAt: (x, z, previous) => surfaceFloorAt(surfaces, x, z, previous),
    levelSolids: (y) => levelSolids(surfaces, y),
    solids: [
      ...shellSolids(room),
      ...runs.flatMap((r) => gantryColumnFeet(r.surfaces, r.side)),
    ],
    powered: () => true,
    // In the middle of the room's south end, looking north between the stairs.
    start: { x: 0, z: d / 2 - 1.5, yaw: 0 },
  });
}

/** The wet hall, half a storey down in the middle of the main corridor's ring. */
export function startWetHall(canvas: HTMLCanvasElement) {
  const room = wetHallRoom();
  return runShell(canvas, {
    self: 'wet_hall',
    room,
    build: (metre, kit) => createWetHall(metre, kit),
    // The make-up bay's pair of equipment doors (prompt 036).
    install: (kit) => [wetHallBayDoors(kit), ...wetHallFireAlarm(kit)],
    floorAt: wetHallFloorAt,
    levelSolids: wetHallPitWalls,
    // And the make-up bay's partition (prompt 036).
    solids: [...shellSolids(room), ...wetHallRails(), ...wetHallPartition()],
    // On the east landing, looking west over the hall to the ramp.
    start: { x: room.w / 2 - 0.6, z: 0, yaw: -Math.PI / 2 },
  });
}

export interface ShellConfig {
  self: RoomId;
  install?: (kit: ReturnType<typeof createPanelKit>) => Part[];
  room: { w: number; d: number; doors: readonly ShellDoor[] };
  build: (
    metre: number,
    kit: ReturnType<typeof createPanelKit>,
  ) => {
    group: Group;
    doors: { door: ShellDoor; part: EquipmentDoorsPart; lobby: Group }[];
  };
  /** The floor at (x, z), come from height `previous`: where floors stack, the one walked on. */
  floorAt: (x: number, z: number, previous: number) => number;
  /** What else stops a walker standing at height `y`: a gantry's handrails. */
  levelSolids?: (y: number) => Footprint[];
  solids: Footprint[];
  start: { x: number; z: number; yaw: number; pitch?: number };
  /** Whether its lamps and displays have power: by default, its own room's supply. */
  powered?: () => boolean;
  /** Its lighting zone's room, if not its own (the bridge's is the control room's). */
  lightsOf?: string;
  /** Where its noclip may fly, metres, if not within `room` (the bridge's plan). */
  bounds?: Footprint;
  /** Its doorways stop the walker only below this height, metres (the bridge's are at the foot of its stair). */
  doorsBelow?: number;
}

/**
 * A shell room's scene: its doorways each a joint the app sees through
 * (`door-joins.ts`), built when its doors open, walked through without a
 * break; where it has several doorways to the same room (the wet hall's
 * two to the corridor), one joint for them all, its frame that of the
 * doorway in use. Every card reader in the room shows green while any of
 * its doors stands open, beeping as one is opened here.
 */
export function runShell(canvas: HTMLCanvasElement, cfg: ShellConfig) {
  const metre = METRE;
  const scene = new Scene();
  scene.background = null;
  const renderer = createRenderer(canvas, true);
  renderer.toneMapping = ACESFilmicToneMapping;
  const look = POOL_LOOKS[DEFAULT_POOL_LOOK];
  renderer.toneMappingExposure = look.exposure;
  renderer.setClearColor('#d8e1df', 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const camera = new PerspectiveCamera(68, 1, 0.05 * metre, 80 * metre);
  scene.add(new AmbientLight('#f4f7f5', 0.18));
  scene.add(new HemisphereLight('#e9f3f1', '#65716f', 0.45));
  const kit = createPanelKit();
  const parts = createPartSet();
  const { group: rooms, doors } = cfg.build(metre, kit);
  for (const d of doors) parts.add(d.part);
  for (const part of cfg.install?.(kit) ?? []) {
    parts.add(part);
    rooms.add(part.object);
  }
  scene.add(rooms);
  // Its machines, placed (`logic/room-equipment.ts`), on its floor.
  const machines = createRoomEquipment(kit, cfg.self, cfg.floorAt(0, 0, 0));
  rooms.add(machines.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(rooms, true)[0];
    if (!hit || hit.distance > 3 * metre) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work = parts.uses.get(o) ?? machines.useOf(o);
      if (work) {
        const at = o;
        // With the hit known, so a touch surface can ask where it was touched.
        return () =>
          touchingAt(hit, () => work(knobDirection(at, hit.point, camera)));
      }
    }
    return null;
  };
  const toMetre = (s: Footprint): Footprint => ({
    minX: s.minX * metre,
    maxX: s.maxX * metre,
    minZ: s.minZ * metre,
    maxZ: s.maxZ * metre,
  });

  // Each doorway: where it is, whether the room beyond is seen through it.
  const ways = doors.map((d) => ({
    ...d,
    place: shellDoorPlace(cfg.room, d.door),
    ...shellDoorway(cfg.room, d.door),
    seen: false,
  }));
  // Whether the walker is near each doorway (`door-proximity.ts`), one for
  // each, wider than its threshold: once open, its pair waits for them.
  const near = ways.map((w) => createDoorPresence(w.leaf));
  type Way = (typeof ways)[number];
  const inWay = (w: Way) =>
    overlaps(
      w.leaf,
      walk.walker.x / metre,
      walk.walker.z / metre,
      WALKER_RADIUS_METRES,
    );
  const jointFor = (w: Way): Joint => ({
    frame: {
      x: w.place.frame.x * metre,
      z: w.place.frame.z * metre,
      y: 0,
      yaw: w.place.frame.yaw,
    },
    onOpen: true,
    open: () => w.part.open(),
    angle: () => w.part.angle(),
    swingTo: (a) => w.part.swingTo(a),
    opening: () => {
      const { outer, into, alongX } = w.place;
      const half = shellOpening(w.door) / 2;
      const x0 = outer.x - into[0] * 2;
      const z0 = outer.z - into[1] * 2;
      const x1 = outer.x + into[0] * 0.4;
      const z1 = outer.z + into[1] * 0.4;
      return toMetre({
        minX: Math.min(x0, x1) - (alongX ? half : 0),
        maxX: Math.max(x0, x1) + (alongX ? half : 0),
        minZ: Math.min(z0, z1) - (alongX ? 0 : half),
        maxZ: Math.max(z0, z1) + (alongX ? 0 : half),
      });
    },
    see: (on) => {
      w.seen = on;
      w.lobby.visible = !on;
    },
    peek: (on) => w.part.showLeaves(!on),
  });
  // One joint to each room beyond; several doorways to one room share it.
  const targets = [...new Set(ways.map((w) => w.door.to))];
  const groups = targets.map((to) => ({
    to,
    ways: ways.filter((w) => w.door.to === to),
  }));
  const inUse = (g: (typeof groups)[number]) =>
    g.ways.length === 1 ? g.ways[0] : g.ways[activeDoorway(cfg.self, g.to)];
  const withdrawals = groups.map((g) => {
    if (g.ways.length === 1)
      return registerJoint(cfg.self, g.to, jointFor(g.ways[0]));
    const each = g.ways.map(jointFor);
    const pick = () => {
      const i = pickDoorway(
        activeDoorway(cfg.self, g.to),
        g.ways.map((w) => w.part.open()),
      );
      useDoorway(cfg.self, g.to, i);
      return i;
    };
    return registerJoint(cfg.self, g.to, {
      get frame() {
        return each[activeDoorway(cfg.self, g.to)].frame;
      },
      onOpen: true,
      open: () => each[pick()].open(),
      angle: () => each[activeDoorway(cfg.self, g.to)].angle(),
      swingTo: (a) => each[activeDoorway(cfg.self, g.to)].swingTo(a),
      opening: () => each[activeDoorway(cfg.self, g.to)].opening(),
      see: (on) => {
        for (const w of g.ways) {
          w.seen = false;
          w.lobby.visible = true;
        }
        each[activeDoorway(cfg.self, g.to)].see(on);
      },
      peek: (on) => {
        for (const e of each) e.peek(false);
        each[activeDoorway(cfg.self, g.to)].peek(on);
      },
    });
  });

  const composer = createComposer(
    renderer,
    new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 }),
  );
  const base = new RenderPass(scene, camera);
  base.clearAlpha = 0;
  composer.addPass(base);
  const ao = new GTAOPass(scene, camera, 1, 1);
  ao.updateGtaoMaterial({
    distanceExponent: 1.4,
    thickness: 1.2 * metre,
    scale: 1,
    samples: 12,
    radius: look.ao.radius * metre,
  });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 });
  ao.blendIntensity = look.ao.blend;
  composer.addPass(ao);
  const bloom = new UnrealBloomPass(
    new Vector2(1, 1),
    look.bloom.strength,
    look.bloom.radius,
    look.bloom.threshold,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      time: { value: 0 },
      grain: { value: look.grain },
      vignette: { value: look.vignette },
    },
    vertexShader:
      'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time, grain, vignette; varying vec2 vUv;
float rand(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
void main() { vec2 c = vUv - 0.5; vec2 shift = c * dot(c, c) * 0.006;
vec4 sampleColour = texture2D(tDiffuse, vUv);
vec3 colour = vec3(texture2D(tDiffuse, vUv + shift).r, sampleColour.g, texture2D(tDiffuse, vUv - shift).b);
colour *= 1.0 - vignette * smoothstep(0.25, 0.85, length(c * vec2(1.15, 1.0)));
colour += (rand(vUv * 731.0) - 0.5) * grain;
gl_FragColor = vec4(colour, sampleColour.a); }`,
  });
  composer.addPass(film);

  const walls = cfg.solids.map(toMetre);
  const machineWalls = machines.solids.map(toMetre);
  // The height of the floor the walker stands on, metres: up on a gantry, or not.
  let standing = cfg.floorAt(cfg.start.x, cfg.start.z, 0);
  let onLadderLanding = false;
  const flightBox = new Box3().setFromObject(rooms);
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    objects: cfg.self === 'engineers_office' ? machines.group : undefined,
    allowPickup: (object) =>
      cfg.self === 'engineers_office' && machines.canRemove(object),
    heldAction(object, _portable, x, y) {
      if (cfg.self !== 'engineers_office') return false;
      raycaster.setFromCamera(pointer.set(x, y), camera);
      const hit = raycaster
        .intersectObject(machines.group, true)
        .find((candidate) => !isHeldPortableHit(candidate.object));
      return Boolean(
        hit &&
        hit.distance <= 3 * metre &&
        machines.returnItem(object, hit.object),
      );
    },
    metre,
    floorY: cfg.floorAt(cfg.start.x, cfg.start.z, 0) * metre,
    // The loading dock's noclip reaches out over its yard (prompt 080).
    flightBounds: () =>
      cfg.bounds
        ? {
            minX: (cfg.bounds.minX + 0.05) * metre,
            maxX: (cfg.bounds.maxX - 0.05) * metre,
            minZ: (cfg.bounds.minZ + 0.05) * metre,
            maxZ: (cfg.bounds.maxZ - 0.05) * metre,
            minY: flightBox.min.y + 0.1 * metre,
            maxY: flightBox.max.y - 0.35 * metre,
          }
        : {
            minX:
              (cfg.self === 'loading_bay' ? -30 : -cfg.room.w / 2 + 0.05) *
              metre,
            maxX:
              (cfg.self === 'loading_bay' ? 30 : cfg.room.w / 2 - 0.05) * metre,
            minZ:
              (cfg.self === 'loading_bay' ? -40 : -cfg.room.d / 2 + 0.05) *
              metre,
            maxZ: (cfg.room.d / 2 - 0.05) * metre,
            minY: flightBox.min.y + 0.1 * metre,
            maxY: flightBox.max.y - 0.35 * metre,
          },
    start: {
      x: cfg.start.x * metre,
      z: cfg.start.z * metre,
      yaw: cfg.start.yaw,
      pitch: cfg.start.pitch,
    },
    floorAt: (x, z, previous) => {
      const landing = humanLadderLandingAt(rooms, x, z, previous);
      onLadderLanding = landing !== null;
      standing =
        landing === null
          ? cfg.floorAt(x / metre, z / metre, previous / metre)
          : landing / metre;
      return standing * metre;
    },
    ladders: () => humanLadderZones(rooms),
    // Each doorway: its leaves while shut, but never where the walker
    // stands; a stop just beyond until the room there is seen.
    solids: () => [
      ...walls,
      ...(onLadderLanding ? [] : machineWalls),
      ...(onLadderLanding ? humanLadderLandingSolids(rooms) : []),
      ...(cfg.levelSolids?.(standing) ?? []).map(toMetre),
      ...machines
        .movingSolids({ x: walk.walker.x / metre, z: walk.walker.z / metre })
        .map(toMetre),
      ...ways
        .filter(() => standing < (cfg.doorsBelow ?? Infinity))
        .flatMap((w) =>
          doorwayStops(
            { inside: inWay(w), shut: w.part.angle() < 0.6, seen: w.seen },
            w.leaf,
            w.beyond,
          ),
        )
        .map(toMetre),
    ],
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
    // What is aimed at, named in the help line (prompt 061).
    inspect: createInspector({
      root: rooms,
      camera,
      metre,
      world: () => roomWorld().world.value,
    }),
  });
  // A development handle for the console, as the plant rooms' is: stand
  // anywhere, in metres, and use what is at (x, y) on the screen (−1 to 1).
  const handle = {
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * metre, z * metre, yaw, pitch);
    },
    use: (x = 0, y = 0) => usableAt(x, y)?.(),
  };
  (window as unknown as { shellRoom: unknown }).shellRoom = handle;
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    composer.setSize(Math.round(width), Math.round(height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  let visual = true;
  let leaving = false;
  // Whether any door stood open last frame: null on arrival.
  let wasOpen: boolean | null = null;
  const readers = doors.flatMap((d) => d.part.readers);
  // Its lights, following its lighting zone (`room-lights.ts`).
  const roomLights = bindRoomLights(
    scene,
    zoneOfRoom(cfg.lightsOf ?? cfg.self),
  );
  // Its equipment's lamps and displays, dark without its power.
  const roomPower = bindRoomPower(
    scene,
    cfg.powered ?? roomPowered(cfg.self as ServiceRoom),
  );
  let last = 0;
  let lastMotionX = NaN;
  let lastMotionZ = NaN;
  let lastMotionYaw = NaN;
  renderer.setAnimationLoop((time) => {
    parts.setAudible(!canvas.parentElement?.hidden && !walk.following);
    machines.setAudible(!canvas.parentElement?.hidden && !walk.following);
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    if (cfg.self === 'engineers_office') {
      const { x, z, yaw } = walk.walker;
      if (
        Number.isNaN(lastMotionX) ||
        Math.abs(x - lastMotionX) > 0.01 * metre ||
        Math.abs(z - lastMotionZ) > 0.01 * metre ||
        Math.abs(yaw - lastMotionYaw) > 0.01
      ) {
        machines.senseMotion();
        lastMotionX = x;
        lastMotionZ = z;
        lastMotionYaw = yaw;
      }
    }
    roomLights.update(delta);
    partAudio.listen(camera, metre);
    // No pair closes on someone near it: told before the leaves move.
    const actor = doorActor(walk, metre, WALKER_RADIUS_METRES);
    ways.forEach((w, i) => w.part.setNearby(near[i].update(actor)));
    parts.update(delta);
    machines.update(delta);
    const r = doorReaders(
      wasOpen,
      doors.some((d) => d.part.open()),
    );
    if (r.light) for (const reader of readers) reader.doorOpened(r.audible);
    wasOpen = r.was;
    // Out through a doorway, once the room beyond is seen: handed over.
    if (!leaving && !walk.following) {
      const x = walk.walker.x / metre;
      const z = walk.walker.z / metre;
      for (const g of groups) {
        const w = inUse(g);
        if (w.seen && throughShellDoor(cfg.room, w.door, x, z)) {
          leaving = true;
          enterDevRoom(g.to, cfg.self, true);
          break;
        }
      }
    }
    // Last, after every machine has set its lamps: dark without power.
    roomPower.update(delta);
    if (visual) {
      film.uniforms.time.value = (time / 1000) % 100;
      composer.render(delta);
    }
  });
  return Object.assign(
    () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      composer.dispose();
      for (const w of withdrawals) w();
      parts.dispose();
      machines.dispose();
      disposeKit(kit, rooms as never);
      walk.dispose();
      rooms.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      renderer.dispose();
      const w = window as unknown as { shellRoom?: unknown };
      if (w.shellRoom === handle) delete w.shellRoom;
    },
    {
      resume() {
        leaving = false;
        wasOpen = null;
        (window as unknown as { shellRoom: unknown }).shellRoom = handle;
      },
      setVisual(enabled: boolean) {
        visual = enabled;
      },
    },
  );
}
