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
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createRenderer } from '../../components/core/parts/render-style';
import { METRE } from '../../components/core/logic/units';
import {
  createFirstPerson,
  WALKER_RADIUS_METRES,
} from '../../controls/input/first-person';
import { DEFAULT_POOL_LOOK, POOL_LOOKS } from '../logic/pool-looks';
import { createPlantRoomShell } from '../views/plant-room-shell';
import {
  EQUIPMENT_OPENING,
  PLANT_DOORWAY,
  PLANT_ROOM,
  plantRoomFloorAt,
  plantRoomPlan,
  plantRoomSolids,
} from '../logic/plant-rooms';
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

const JACUZZI_MIMIC_STATE = {
  lamps: { pump: false, uv: false },
  readouts: {
    water: {
      temp: { value: 37, unit: '°C', name: 'WATER', places: 1 },
      flow: { value: 0, unit: 'm³/h', name: 'RETURN', places: 0 },
    },
  },
};
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import { partAudio } from '../../components/core/audio/part-audio';
import { knobDirection } from '../../controls/input/knob-turning';
import { createRoomEquipment } from '../views/room-equipment';
import { cabinetServices } from '../views/cabinet-services';
import { CEILING_ZONE } from '../logic/room-pipes';
import { createMimicBoard } from '../../components/industrial-control/views/mimic-board';
import type { MimicSpec } from '../../components/industrial-control/logic/mimic';

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
) {
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
  // Each hall's plant room is numbered as its hall is: plant room 4 is
  // POOL-04's, the footbath's.
  const name = hall
    ? `PLANT ROOM ${Number(hall.slice(-2))} – ${POOL_HALLS[hall].title.toUpperCase()}`
    : undefined;
  const {
    group: rooms,
    door,
    equipment,
  } = createPlantRoomShell(size, metre, kit, name);
  parts.add(equipment);
  parts.add(door);
  scene.add(rooms);
  const plan = plantRoomPlan(size);
  // A hall's plant room's machines, placed (`logic/room-equipment.ts`).
  const machines = hall
    ? createRoomEquipment(kit, `plant_${hall}`, plan.floor)
    : null;
  if (machines) rooms.add(machines.group);
  // A packaged cabinet's services (`logic/cabinet-pipes.ts`): its pipes
  // and conduit, each marked (BS 1710) and fitted where it passes through
  // a wall; its drain's tundish and gully; and its isolator, which feeds
  // it: switched off, the cabinet is dead.
  const services = hall
    ? cabinetServices(
        kit,
        `plant_${hall}`,
        plan.floor,
        plan.roof - plan.floor - CEILING_ZONE,
      )
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
  const jacuzziMimic =
    hall === 'pool_03' ? createMimicBoard(kit, JACUZZI_MIMIC) : null;
  if (jacuzziMimic) {
    jacuzziMimic.group.position.set(0, plan.floor + 1.8, -plan.h + 0.025);
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

  const composer = new EffectComposer(
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
  const walls = plantRoomSolids(plan).map(toMetre);
  // The two doorways, through the north and south walls: each its leaf's
  // place, across the wall, and a stop just beyond it (metres).
  const way = (
    x: number,
    half: number,
    z0: number,
    z1: number,
    out: number,
  ) => ({
    leaf: {
      minX: x - half,
      maxX: x + half,
      minZ: Math.min(z0, z1),
      maxZ: Math.max(z0, z1),
    },
    beyond: {
      minX: x - half,
      maxX: x + half,
      minZ: Math.min(z1, z1 + out),
      maxZ: Math.max(z1, z1 + out),
    },
  });
  const northWay = way(
    plan.door.x,
    PLANT_DOORWAY / 2,
    -plan.h,
    -plan.h - PLANT_ROOM.wall,
    -0.3,
  );
  const southWay = way(
    plan.equipment.x,
    EQUIPMENT_OPENING / 2,
    plan.h,
    plan.h + PLANT_ROOM.wall,
    0.3,
  );
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
        shut: !hall || equipment.angle() < 0.6,
        seen: Boolean(hall) && corridorSeen,
      },
      southWay.leaf,
      southWay.beyond,
    ),
  ];
  // Its machines' footprints, to walk round.
  if (machines) walls.push(...machines.solids.map(toMetre));
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre,
    floorY: 0,
    // On the landing, just inside the door, looking into the room.
    start: {
      x: plan.door.x * metre,
      z: -(plan.h - 0.6) * metre,
      // Facing south, into the room.
      yaw: Math.PI,
    },
    floorAt: (x, z) => plantRoomFloorAt(plan, x / metre, z / metre) * metre,
    // The door's leaf while near shut; and, with no hall beyond, always.
    // Each doorway: its leaf while shut, but never where the walker
    // stands; a stop just beyond until the room there is seen.
    solids: () => [...walls, ...stops().map(toMetre)],
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
  });
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
  // Whether a door stood open last frame: null on arrival, before the first.
  let wasOpen: boolean | null = null;
  // The plant room door as a doorway the app sees through, to its hall.
  const self = (hall ? `plant_${hall}` : `plant_room_${size}`) as RoomId;
  let hallSeen = false;
  // The equipment doors, a doorway to the main corridor (a hall's plant
  // room only), seen through and walked through without a break.
  let corridorSeen = false;
  let leavingSouth = false;
  const southFace = (plan.h + PLANT_ROOM.wall) * metre;
  const corridorLobby = rooms.getObjectByName('equipment lobby');
  const withdrawSouth = hall
    ? registerJoint(self, 'main_corridor', {
        frame: {
          x: plan.equipment.x * metre,
          z: southFace,
          y: plan.floor * metre,
          yaw: Math.PI,
        },
        onOpen: true,
        open: () => equipment.open(),
        angle: () => equipment.angle(),
        swingTo: (a) => equipment.swingTo(a),
        opening: () => ({
          minX: (plan.equipment.x - EQUIPMENT_OPENING / 2) * metre,
          maxX: (plan.equipment.x + EQUIPMENT_OPENING / 2) * metre,
          minZ: southFace - 0.4 * metre,
          maxZ: southFace + 2 * metre,
        }),
        see: (on) => {
          corridorSeen = on;
          if (corridorLobby) corridorLobby.visible = !on;
        },
        peek: (on) => equipment.showLeaves(!on),
      })
    : () => {};
  const lobby = rooms.getObjectByName('plant door lobby');
  const outFace = (plan.h + PLANT_ROOM.wall) * metre;
  const withdraw = hall
    ? registerJoint(self, hall, {
        frame: { x: plan.door.x * metre, z: -outFace, y: 0, yaw: 0 },
        onOpen: true,
        open: () => door.angle() > 0.05,
        angle: () => door.angle(),
        swingTo: (a) => door.swingTo(a),
        opening: () => ({
          minX: (plan.door.x - PLANT_DOORWAY / 2) * metre,
          maxX: (plan.door.x + PLANT_DOORWAY / 2) * metre,
          minZ: -outFace - 2 * metre,
          maxZ: -outFace + 0.4 * metre,
        }),
        see: (on) => {
          hallSeen = on;
          if (lobby) lobby.visible = !on;
        },
        peek: (on) => door.showLeaf(!on),
      })
    : () => {};
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    partAudio.listen(camera, metre);
    parts.update(delta);
    // A door never closes on someone standing in its doorway.
    if (inWay(northWay)) door.holdOpen();
    if (inWay(southWay)) equipment.holdOpen();
    // Every card reader in the room shows green while either pair of its
    // doors stands open (beeping as it goes green).
    // They beep only when a door is opened while the walker is here, not
    // when it arrives with a door already open (handed over through it).
    const r = doorReaders(wasOpen, door.angle() > 0.05 || equipment.open());
    if (r.light)
      for (const reader of [door.reader, ...equipment.readers])
        reader.doorOpened(r.audible);
    wasOpen = r.was;
    machines?.update(delta);
    if (services) {
      services.update(delta);
      if (supply) supply.value = services.isolator?.on ?? true;
    }
    jacuzziMimic?.parts.update(delta);
    jacuzziMimic?.show(JACUZZI_MIMIC_STATE);
    // Out through the equipment doors, once the corridor is seen beyond.
    if (hall && corridorSeen && !leavingSouth && !walk.following) {
      const x = walk.walker.x / metre;
      const z = walk.walker.z / metre;
      if (
        z > plan.h + PLANT_ROOM.wall + 0.05 &&
        Math.abs(x - plan.equipment.x) < EQUIPMENT_OPENING / 2
      ) {
        leavingSouth = true;
        enterDevRoom('main_corridor', self, true);
      }
    }
    // Out through the plant room door, once its pool hall is seen beyond
    // it: handed over to it, without a break.
    if (hall && hallSeen && !leaving && !walk.following) {
      const x = walk.walker.x / metre;
      const z = walk.walker.z / metre;
      if (
        z < -(plan.h + PLANT_ROOM.wall + 0.05) &&
        Math.abs(x - plan.door.x) < PLANT_DOORWAY / 2
      ) {
        leaving = true;
        enterDevRoom(hall, self, true);
      }
    }
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
      parts.dispose();
      machines?.dispose();
      jacuzziMimic?.parts.dispose();
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
      },
      setVisual(enabled: boolean) {
        visual = enabled;
      },
    },
  );
}
