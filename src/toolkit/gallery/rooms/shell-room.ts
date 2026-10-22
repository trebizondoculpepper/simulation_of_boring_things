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
import { partAudio } from '../../components/core/audio/part-audio';
import {
  createFirstPerson,
  WALKER_RADIUS_METRES,
} from '../../controls/input/first-person';
import { DEFAULT_POOL_LOOK, POOL_LOOKS } from '../logic/pool-looks';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
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
  wetHallRails,
  wetHallRoom,
} from '../logic/shell-rooms';
import type { ShellDoor, ShellRoomId } from '../logic/shell-rooms';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createShellRoom, createWetHall } from '../views/shell-room';
import { createRoomEquipment } from '../views/room-equipment';
import type { EquipmentDoorsPart } from '../../components/architectural/parts/equipment-doors';
import type { Group } from 'three';

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

/** One of the main plant's empty rooms (`logic/shell-rooms.ts`), in its own scene. */
export function startShellRoom(canvas: HTMLCanvasElement, id: ShellRoomId) {
  const spec = SHELL_ROOMS[id];
  const room = { w: spec.w, d: spec.d, doors: spec.doors };
  return runShell(canvas, {
    self: id,
    room,
    build: (metre, kit) =>
      createShellRoom(metre, kit, {
        ...room,
        floor: 0,
        roof: spec.height,
        title: spec.title,
        note: spec.note,
        seed: SEEDS[id],
      }),
    floorAt: () => 0,
    solids: shellSolids(room),
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

/** The wet hall, half a storey down in the middle of the main corridor's ring. */
export function startWetHall(canvas: HTMLCanvasElement) {
  const room = wetHallRoom();
  return runShell(canvas, {
    self: 'wet_hall',
    room,
    build: (metre, kit) => createWetHall(metre, kit),
    floorAt: wetHallFloorAt,
    solids: [...shellSolids(room), ...wetHallRails()],
    // On the east landing, looking west over the hall to the ramp.
    start: { x: room.w / 2 - 0.6, z: 0, yaw: -Math.PI / 2 },
  });
}

interface ShellConfig {
  self: RoomId;
  room: { w: number; d: number; doors: readonly ShellDoor[] };
  build: (
    metre: number,
    kit: ReturnType<typeof createPanelKit>,
  ) => {
    group: Group;
    doors: { door: ShellDoor; part: EquipmentDoorsPart; lobby: Group }[];
  };
  floorAt: (x: number, z: number) => number;
  solids: Footprint[];
  start: { x: number; z: number; yaw: number };
}

/**
 * A shell room's scene: its doorways each a joint the app sees through
 * (`door-joins.ts`), built when its doors open, walked through without a
 * break; where it has several doorways to the same room (the wet hall's
 * two to the corridor), one joint for them all, its frame that of the
 * doorway in use. Every card reader in the room shows green while any of
 * its doors stands open, beeping as one is opened here.
 */
function runShell(canvas: HTMLCanvasElement, cfg: ShellConfig) {
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
  scene.add(rooms);
  // Its machines, placed (`logic/room-equipment.ts`), on its floor.
  const machines = createRoomEquipment(kit, cfg.self, cfg.floorAt(0, 0));
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
        return () => work(knobDirection(at, hit.point, camera));
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

  const walls = [...cfg.solids, ...machines.solids].map(toMetre);
  const walk = createFirstPerson({
    canvas,
    camera,
    metre,
    floorY: cfg.floorAt(cfg.start.x, cfg.start.z) * metre,
    start: {
      x: cfg.start.x * metre,
      z: cfg.start.z * metre,
      yaw: cfg.start.yaw,
    },
    floorAt: (x, z) => cfg.floorAt(x / metre, z / metre) * metre,
    // Each doorway: its leaves while shut, but never where the walker
    // stands; a stop just beyond until the room there is seen.
    solids: () => [
      ...walls,
      ...ways
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
  // Whether any door stood open last frame: null on arrival.
  let wasOpen: boolean | null = null;
  const readers = doors.flatMap((d) => d.part.readers);
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    partAudio.listen(camera, metre);
    parts.update(delta);
    machines.update(delta);
    // No pair closes on someone standing in its doorway.
    for (const w of ways) if (inWay(w)) w.part.holdOpen();
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
    },
    {
      resume() {
        leaving = false;
        wasOpen = null;
      },
      setVisual(enabled: boolean) {
        visual = enabled;
      },
    },
  );
}
