import {
  ACESFilmicToneMapping,
  AmbientLight,
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
import {
  createFirstPerson,
  WALKER_RADIUS_METRES,
} from '../../controls/input/first-person';
import { DEFAULT_POOL_LOOK, POOL_LOOKS } from '../logic/pool-looks';
import { createPlantRoomShell } from '../views/plant-room-shell';
import { PLANT_ROOM } from '../logic/plant-rooms';
import {
  aloft,
  shellFloorAt,
  shellPlan,
  shellSolids,
  wallFrame,
  yawToward,
} from '../logic/shell-plan';
import type { ShellDoorway, ShellPlan } from '../logic/shell-plan';
import type { Footprint } from '../../controls/logic/walk-collision';
import { registerJoint } from '../logic/door-joins';
import { doorwayStops, overlaps } from '../logic/doorway';
import { doorReaders } from '../../components/architectural/logic/card-reader';
import { POOL_HALLS } from '../logic/pool-halls';
import { enterDevRoom } from '../logic/dev-room-links';
import type { RoomId } from '../logic/dev-room-links';
import type { PlantRoomSize } from '../logic/plant-rooms';
type PlantHall = 'pool_01' | 'pool_02' | 'pool_03' | 'pool_04';

const JACUZZI_MIMIC: MimicSpec = {
  title: 'JACUZZI · WATER CIRCUIT',
  width: 1.2,
  height: 0.72,
  lines: [
    {
      colour: '#2f7d3a',
      points: [
        [-0.43, 0.16],
        [-0.33, 0.16],
        [-0.33, -0.08],
        [0.37, -0.08],
        [0.37, 0.16],
        [-0.43, 0.16],
      ],
    },
  ],
  shapes: [
    { symbol: 'pool', at: [-0.38, 0.18], size: 0.08, label: 'SPA' },
    { symbol: 'pump', at: [-0.19, -0.08], size: 0.055, label: 'PUMP' },
    { symbol: 'filter', at: [0.01, -0.08], size: 0.055, label: 'FILTER' },
    { symbol: 'uv', at: [0.18, -0.08], size: 0.05, label: 'UV' },
    { symbol: 'hx', at: [0.37, -0.08], size: 0.055, label: 'HEAT' },
  ],
  lamps: [
    { id: 'pump', at: [-0.19, 0.04], colour: 'green', label: 'RUN' },
    { id: 'uv', at: [0.18, 0.04], colour: 'green', label: 'ON' },
  ],
  readouts: [{ id: 'water', at: [0.16, 0.19] }],
  modes: [
    { id: 'temp', legend: 'TEMP' },
    { id: 'flow', legend: 'FLOW' },
  ],
};

/**
 * The Jacuzzi mimic's lamps and readout, as the world has its water
 * (`pools.ts`): its pump and UV lit while it circulates, its water's
 * temperature and its return flow.
 */
function jacuzziMimicState(pool: PoolWaterState) {
  const circulating = !pool.tripped && pool.flow > POOL_TARGET.pool_03.flow / 2;
  return {
    lamps: { pump: circulating, uv: circulating },
    readouts: {
      water: {
        temp: { value: pool.temperature, unit: '°C', name: 'WATER', places: 1 },
        flow: { value: pool.flow, unit: 'm³/h', name: 'RETURN', places: 0 },
      },
    },
  };
}
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import { partAudio } from '../../components/core/audio/part-audio';
import { knobDirection } from '../../controls/input/knob-turning';
import { createRoomEquipment } from '../views/room-equipment';
import { cabinetServices } from '../views/cabinet-services';
import { worldStore } from '../../save/world-store';
import { newWorld } from '../../../game/world';
import { POOL_TARGET } from '../../../game/plant/pools';
import type { PoolWaterState } from '../../../game/plant/pools';
import { createMimicBoard } from '../../components/industrial-control/views/mimic-board';
import type { MimicSpec } from '../../components/industrial-control/logic/mimic';
import { bindRoomLights } from '../views/room-lights';
import { zoneOfRoom } from '../../../game/plant/lighting';
import { bindRoomPower, roomPowered } from '../views/room-power';
import type { ServiceRoom } from '../../../game/plant/services';

/**
 * plant_room_small, _medium and _large: a per-attraction plant room's
 * shell in each size, in its own scene, entered on its landing inside the
 * plant room door. It has no other doors yet: it is reached by its URL.
 */
export function startPlantRoomShell(
  canvas: HTMLCanvasElement,
  size: PlantRoomSize,
  /** The pool hall this one is the plant room of, if any; the size's template otherwise. */
  hall?: PlantHall,
  {
    equipment,
    title,
    tankHall = false,
    plan: ownPlan,
  }: {
    /**
     * The room to fill it with in place of the hall's own: a retired room
     * (`retired-rooms.ts`, its frozen layout and pipes).
     */
    equipment?: string;
    /** Its title on the wall, in place of the hall's plant room's. */
    title?: string;
    /** Its balance tank in a hall of its own, through doors in its west wall. */
    tankHall?: boolean;
    /** Its own shell, in place of its size's template (the Olympic's, `olympic-plan.ts`). */
    plan?: ShellPlan;
  } = {},
) {
  const metre = METRE;
  // Its shell: its own, or its size's template.
  const plan = ownPlan ?? shellPlan(size, { tankHall });
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
  // Each hall's plant room is numbered as its hall is: plant room 4 is
  // POOL-04's, the footbath's.
  const name =
    title ??
    (hall
      ? `PLANT ROOM ${Number(hall.slice(-2))} – ${POOL_HALLS[hall].title.toUpperCase()}`
      : undefined);
  const equipmentRoom = equipment ?? (hall ? `plant_${hall}` : undefined);
  const {
    group: rooms,
    door,
    equipment: equipmentDoors,
    tankDoors,
  } = createPlantRoomShell(
    plan,
    metre,
    kit,
    name ?? `PLANT ROOM · ${size.toUpperCase()}`,
  );
  parts.add(equipmentDoors);
  if (tankDoors) parts.add(tankDoors);
  parts.add(door);
  scene.add(rooms);
  // A hall's plant room's machines, placed (`logic/room-equipment.ts`).
  const machines = hall
    ? createRoomEquipment(kit, equipmentRoom!, plan.floor)
    : null;
  if (machines) rooms.add(machines.group);
  // A packaged cabinet's services (`logic/cabinet-pipes.ts`): its pipes
  // and conduit, each marked (BS 1710) and fitted where it passes through
  // a wall; its drain's tundish and gully; and its isolator, which feeds
  // it: switched off, the cabinet is dead.
  const services = hall
    ? cabinetServices(kit, equipmentRoom!, plan.floor)
    : null;
  if (services) rooms.add(services.group);
  const supply = machines
    ? (() => {
        let found: { value: boolean } | null = null;
        machines.group.traverse((o) => {
          if (o.userData.supply)
            found = o.userData.supply as { value: boolean };
        });
        return found as { value: boolean } | null;
      })()
    : null;
  // Whether power reaches the cabinet's isolator: its room's switch-fuse,
  // the switchboard's way and the site's main switch (`room-power.ts`).
  const roomLive = equipmentRoom
    ? roomPowered(equipmentRoom as ServiceRoom)
    : () => true;
  const jacuzziMimic =
    hall === 'pool_03' ? createMimicBoard(kit, JACUZZI_MIMIC) : null;
  const mimicStore = jacuzziMimic ? worldStore('dev') : null;
  if (jacuzziMimic) {
    jacuzziMimic.group.position.set(0, plan.floor + 1.8, -plan.hz + 0.025);
    rooms.add(jacuzziMimic.group);
  }
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(rooms, true)[0];
    if (!hit || hit.distance > 3 * metre) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work =
        parts.uses.get(o) ??
        machines?.useOf(o) ??
        services?.uses.get(o) ??
        jacuzziMimic?.parts.uses.get(o);
      if (work) {
        const at = o;
        return () => work(knobDirection(at, hit.point, camera));
      }
    }
    return null;
  };

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

  const toMetre = (s: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }) => ({
    minX: s.minX * metre,
    maxX: s.maxX * metre,
    minZ: s.minZ * metre,
    maxZ: s.maxZ * metre,
  });
  // Each doorway, through its wall: its leaf's place, across the wall, and
  // a stop just beyond it (metres).
  const wayOf = (d: ShellDoorway) => {
    const f = wallFrame(plan, d.wall, d.at);
    const t = PLANT_ROOM.wall;
    const across = d.wall === 'north' || d.wall === 'south';
    const span = (a: number, b: number) =>
      [Math.min(a, b), Math.max(a, b)] as const;
    const box = (n0: number, n1: number) => {
      const [a, b] = span(n0, n1);
      return across
        ? {
            minX: d.at - d.width / 2,
            maxX: d.at + d.width / 2,
            minZ: f.z + f.out[1] * a,
            maxZ: f.z + f.out[1] * b,
          }
        : {
            minX: f.x + f.out[0] * a,
            maxX: f.x + f.out[0] * b,
            minZ: d.at - d.width / 2,
            maxZ: d.at + d.width / 2,
          };
    };
    const tidy = (b: Footprint): Footprint => ({
      minX: Math.min(b.minX, b.maxX),
      maxX: Math.max(b.minX, b.maxX),
      minZ: Math.min(b.minZ, b.maxZ),
      maxZ: Math.max(b.minZ, b.maxZ),
    });
    return { leaf: tidy(box(0, t)), beyond: tidy(box(t, t + 0.3)), frame: f };
  };
  const northWay = wayOf(plan.door);
  const southWay = wayOf(plan.equipment);
  // The balance tank hall's doors: nothing beyond them yet.
  const westWay = plan.tankDoor ? wayOf(plan.tankDoor) : null;
  const inWay = (w: typeof northWay) =>
    overlaps(
      w.leaf,
      walk.walker.x / metre,
      walk.walker.z / metre,
      WALKER_RADIUS_METRES,
    );
  const stops = () => [
    ...doorwayStops(
      {
        inside: inWay(northWay),
        shut: !hall || door.angle() < 0.6,
        seen: Boolean(hall) && hallSeen,
      },
      northWay.leaf,
      northWay.beyond,
    ),
    ...doorwayStops(
      {
        inside: inWay(southWay),
        shut: !hall || equipmentDoors.angle() < 0.6,
        seen: Boolean(hall) && corridorSeen,
      },
      southWay.leaf,
      southWay.beyond,
    ),
    ...(westWay && tankDoors
      ? doorwayStops(
          {
            inside: inWay(westWay),
            shut: tankDoors.angle() < 0.6,
            seen: tankHallSeen,
          },
          westWay.leaf,
          westWay.beyond,
        )
      : []),
  ];
  // The walls (and the decks' rails, the stair) for the level the walker
  // is on; on the plant floor, its machines' footprints too.
  const wallsUp = shellSolids(plan, true).map(toMetre);
  const wallsDown = [
    ...shellSolids(plan, false),
    ...(machines?.solids ?? []),
  ].map(toMetre);
  /** The walker's floor's height, metres. */
  let standing = 0;
  // On its deck, just inside the plant room door, looking into the room.
  const inward = [-northWay.frame.out[0], -northWay.frame.out[1]] as const;
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre,
    floorY: 0,
    start: {
      x: (northWay.frame.x + inward[0] * 0.6) * metre,
      z: (northWay.frame.z + inward[1] * 0.6) * metre,
      // Facing into the room (forward is (sin yaw, −cos yaw)).
      yaw: Math.atan2(inward[0], -inward[1]),
    },
    floorAt: (x, z, previous) => {
      standing = shellFloorAt(
        plan,
        x / metre,
        z / metre,
        (previous ?? 0) / metre,
      );
      return standing * metre;
    },
    // Each doorway: its leaf while shut, but never where the walker
    // stands; a stop just beyond until the room there is seen.
    solids: () => [
      ...(aloft(plan, standing) ? wallsUp : wallsDown),
      ...stops().map(toMetre),
    ],
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
  });
  const resizeTo = (width: number, height: number) => {
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    composer.setSize(Math.round(width), Math.round(height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    resizeTo(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  let visual = true;
  let leaving = false;
  // Whether a door stood open last frame: null on arrival, before the first.
  let wasOpen: boolean | null = null;
  // The plant room door as a doorway the app sees through, to its hall.
  const self = (hall ? `plant_${hall}` : `plant_room_${size}`) as RoomId;
  let hallSeen = false;
  // The equipment doors, a doorway to the main corridor (a hall's plant
  // room only), seen through and walked through without a break.
  let corridorSeen = false;
  let tankHallSeen = false;
  let leavingWest = false;
  let leavingSouth = false;
  /** A doorway's outer face, as a join's frame: +z into this room. */
  const outer = (w: typeof northWay, y: number) => {
    const t = PLANT_ROOM.wall;
    const f = w.frame;
    return {
      x: (f.x + f.out[0] * t) * metre,
      z: (f.z + f.out[1] * t) * metre,
      y: y * metre,
      yaw: yawToward([-f.out[0], -f.out[1]]),
    };
  };
  /** The space a join looks through: across its doorway, 2 m out, 0.4 m in. */
  const reach = (w: typeof northWay, d: ShellDoorway) => {
    const f = w.frame;
    const t = PLANT_ROOM.wall;
    const across = d.wall === 'north' || d.wall === 'south';
    // From 0.4 m inside its outer face to 2 m beyond it.
    const n0 = f.out[across ? 1 : 0] * (t - 0.4);
    const n1 = f.out[across ? 1 : 0] * (t + 2);
    const lo = Math.min(n0, n1);
    const hi = Math.max(n0, n1);
    return across
      ? {
          minX: (d.at - d.width / 2) * metre,
          maxX: (d.at + d.width / 2) * metre,
          minZ: (f.z + lo) * metre,
          maxZ: (f.z + hi) * metre,
        }
      : {
          minX: (f.x + lo) * metre,
          maxX: (f.x + hi) * metre,
          minZ: (d.at - d.width / 2) * metre,
          maxZ: (d.at + d.width / 2) * metre,
        };
  };
  /** Whether the walker has gone out through a doorway, past its outer face. */
  const outThrough = (w: typeof northWay, d: ShellDoorway) => {
    const f = w.frame;
    const x = walk.walker.x / metre;
    const z = walk.walker.z / metre;
    const out = (x - f.x) * f.out[0] + (z - f.z) * f.out[1];
    const across = (x - f.x) * f.along[0] + (z - f.z) * f.along[1];
    return out > PLANT_ROOM.wall + 0.05 && Math.abs(across) < d.width / 2;
  };
  const corridorLobby = rooms.getObjectByName('equipment lobby');
  const withdrawSouth = hall
    ? registerJoint(self, 'main_corridor', {
        frame: outer(southWay, plan.floor),
        onOpen: true,
        open: () => equipmentDoors.open(),
        angle: () => equipmentDoors.angle(),
        swingTo: (a) => equipmentDoors.swingTo(a),
        opening: () => reach(southWay, plan.equipment),
        see: (on) => {
          corridorSeen = on;
          if (corridorLobby) corridorLobby.visible = !on;
        },
        peek: (on) => equipmentDoors.showLeaves(!on),
      })
    : () => {};
  const lobby = rooms.getObjectByName('plant door lobby');
  const withdraw = hall
    ? registerJoint(self, hall, {
        frame: outer(northWay, 0),
        onOpen: true,
        open: () => door.angle() > 0.05,
        angle: () => door.angle(),
        swingTo: (a) => door.swingTo(a),
        opening: () => reach(northWay, plan.door),
        see: (on) => {
          hallSeen = on;
          if (lobby) lobby.visible = !on;
        },
        peek: (on) => door.showLeaf(!on),
      })
    : () => {};
  // The balance tank hall's doors: the Olympic's, a doorway to its hall
  // (`tank-hall-room.ts`), seen through and walked through.
  const balanceHall: RoomId | null =
    hall === 'pool_02' && westWay && tankDoors ? 'tank_hall' : null;
  const tankLobby = rooms.getObjectByName('balance tank lobby');
  const withdrawWest =
    balanceHall && westWay && tankDoors
      ? registerJoint(self, balanceHall, {
          frame: outer(westWay, plan.floor),
          onOpen: true,
          open: () => tankDoors.open(),
          angle: () => tankDoors.angle(),
          swingTo: (a) => tankDoors.swingTo(a),
          opening: () => reach(westWay, plan.tankDoor!),
          see: (on) => {
            tankHallSeen = on;
            if (tankLobby) tankLobby.visible = !on;
          },
          peek: (on) => tankDoors.showLeaves(!on),
        })
      : () => {};
  // Its lights, following its lighting zone (`room-lights.ts`).
  const roomLights = bindRoomLights(
    scene,
    hall ? zoneOfRoom(`plant_${hall}`) : undefined,
  );
  // Its equipment's lamps and displays, dark without its power.
  const roomPower = hall
    ? bindRoomPower(scene, roomPowered(`plant_${hall}` as ServiceRoom))
    : null;
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    roomLights.update(delta);
    partAudio.listen(camera, metre);
    parts.update(delta);
    // A door never closes on someone standing in its doorway.
    if (inWay(northWay)) door.holdOpen();
    if (inWay(southWay)) equipmentDoors.holdOpen();
    if (westWay && tankDoors && inWay(westWay)) tankDoors.holdOpen();
    // Every card reader in the room shows green while either pair of its
    // doors stands open (beeping as it goes green).
    // They beep only when a door is opened while the walker is here, not
    // when it arrives with a door already open (handed over through it).
    const r = doorReaders(
      wasOpen,
      door.angle() > 0.05 || equipmentDoors.open(),
    );
    if (r.light)
      for (const reader of [door.reader, ...equipmentDoors.readers])
        reader.doorOpened(r.audible);
    wasOpen = r.was;
    machines?.update(delta);
    if (services) {
      services.update(delta);
      // Fed only while its isolator is on and power reaches it: off at
      // either, its pump, its dosing pumps and its hum stop.
      if (supply) supply.value = (services.isolator?.on ?? true) && roomLive();
    }
    jacuzziMimic?.parts.update(delta);
    if (jacuzziMimic)
      jacuzziMimic.show(
        jacuzziMimicState(
          (mimicStore?.world.value ?? newWorld()).pools.pool_03,
        ),
      );
    // Out through the equipment doors, once the corridor is seen beyond.
    if (hall && corridorSeen && !leavingSouth && !walk.following) {
      if (outThrough(southWay, plan.equipment)) {
        leavingSouth = true;
        enterDevRoom('main_corridor', self, true);
      }
    }
    // Out through the balance tank hall's doors, once the hall is seen beyond.
    if (
      balanceHall &&
      westWay &&
      tankHallSeen &&
      !leavingWest &&
      !walk.following
    ) {
      if (outThrough(westWay, plan.tankDoor!)) {
        leavingWest = true;
        enterDevRoom(balanceHall, self, true);
      }
    }
    // Out through the plant room door, once its pool hall is seen beyond
    // it: handed over to it, without a break.
    if (hall && hallSeen && !leaving && !walk.following) {
      if (outThrough(northWay, plan.door)) {
        leaving = true;
        enterDevRoom(hall, self, true);
      }
    }
    // Last, after every machine has set its lamps: dark without power.
    roomPower?.update(delta);
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
      withdraw();
      withdrawSouth();
      withdrawWest();
      parts.dispose();
      machines?.dispose();
      jacuzziMimic?.parts.dispose();
      services?.dispose();
      disposeKit(kit, rooms as never);
      walk.dispose();
      rooms.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      renderer.dispose();
    },
    {
      resume() {
        leaving = false;
        wasOpen = null;
        leavingSouth = false;
        leavingWest = false;
      },
      setVisual(enabled: boolean) {
        visual = enabled;
      },
    },
  );
}
