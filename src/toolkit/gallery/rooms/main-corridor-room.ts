import { signal } from '@preact/signals-core';
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
import { createMainCorridor } from '../views/main-corridor';
import {
  corridorDoorBlock,
  corridorSolids,
  corridorWalls,
  corridorYaw,
  doorPlace,
  inCorridor,
  MAIN_CORRIDOR,
  corridorArrival,
} from '../logic/main-corridor';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { createPartSet, pushButton } from '../../components/core/parts/parts';
import { createDymoLabel } from '../../components/core/views/hand-labels';
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
import { sharedBridgeAmbience } from '../../components/sound/audio/bridge-ambience';
import { doorShare } from '../../components/sound/logic/bridge-ambience';
import type { RoomId } from '../logic/dev-room-links';
import { bindRoomLights } from '../views/room-lights';
import {
  createDoorPresence,
  doorActor,
} from '../../components/architectural/logic/door-proximity';
import { bindRoomPower, sitePowered } from '../views/room-power';
import { roomWorld } from '../../save/world-store';
import {
  CONTROL_ROOM_MODES,
  corridorDoorTo,
  modeAction,
  modeKnobPlace,
  modePosition,
  settledDoorTo,
} from '../logic/control-room-mode';
import { createControlRoomModeKnob } from '../views/control-room-mode-knob';

/**
 * main_corridor: the ring of plant corridor (`logic/main-corridor.ts`),
 * in its own scene: every room of the plant opens off its outside walls,
 * the wet hall off its inside walls, each pair of doors seen through and
 * walked through without a break.
 */
export function startMainCorridorRoom(canvas: HTMLCanvasElement) {
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
  const { group: rooms, doors } = createMainCorridor(metre, kit);
  for (const d of doors) parts.add(d.part);
  scene.add(rooms);
  // The CONTROL ROOM MODE knob beside the control room's doors, by their
  // card reader (`control-room-mode.ts`): where those doors lead.
  const world = roomWorld();
  const mode = world.read((w) => w.controlRoomMode);
  const controlDoors = doors.find((d) => d.door.to === 'control_room')!;
  const controlDoor = controlDoors.door;
  // Locked out while those doors stand open (the owner, 2026-10-27): it
  // turns only with them shut, so where they lead never changes in view.
  const controlDoorsOpen = signal(false);
  const knob = parts.add(
    createControlRoomModeKnob(
      kit,
      {
        get value() {
          return modePosition(mode.value);
        },
        set: (position) => world.dispatch(modeAction(position)),
      },
      controlDoorsOpen,
    ),
  );
  // Its RESET (the owner, 2026-10-27): back to the bridge as first seen,
  // its theme and entrance played again on the next visit.
  {
    // An illuminated button, lit briefly when pressed (the owner, 2026-10-27).
    const resetLit = signal(false);
    let resetTimer = 0;
    const reset = parts.add(
      pushButton(kit, {
        name: 'CONTROL ROOM MODE reset',
        colour: 'amber',
        head: 'illuminated',
        lamp: resetLit,
        action: () => {
          world.dispatch({ type: 'bridge/first-visit-reset' });
          resetLit.value = true;
          window.clearTimeout(resetTimer);
          resetTimer = window.setTimeout(() => (resetLit.value = false), 700);
        },
      }),
    );
    reset.object.scale.setScalar(0.7);
    // Pressed wherever it is touched, its guard ring and all, not only its
    // small cap (the owner, 2026-10-27: it did not click).
    const press = [...reset.uses.values()][0];
    if (press) parts.uses.set(reset.object, press);
    reset.object.position.set(0, -0.045, 0.0045);
    knob.object.add(reset.object);
    const label = createDymoLabel(kit, 'RESET', { seed: 99 });
    label.position.set(0.04, -0.045, 0.0044);
    knob.object.add(label);
  }
  {
    const k = modeKnobPlace(controlDoor);
    const w = corridorWalls()[k.wall];
    // In the corridor's group, which is in metres (scaled by `metre`).
    knob.object.position.set(
      w.alongX ? k.at : w.line,
      k.height,
      w.alongX ? w.line : k.at,
    );
    knob.object.rotation.y = Math.atan2(w.into[0], w.into[1]);
    rooms.add(knob.object);
  }
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(rooms, true)[0];
    if (!hit || hit.distance > 3 * metre) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work = parts.uses.get(o);
      if (work) {
        const at = o;
        return () => work(knobDirection(at, hit.point, camera));
      }
    }
    return null;
  };
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
  // Each room's doors as a doorway the app sees through (`door-joins.ts`):
  // open, the room is built and drawn beyond; walked through, the walker
  // is handed over to it without a break. The wet hall's two pairs share
  // one joint, its frame the pair in use.
  const ways = doors.map((d) => {
    const p = doorPlace(d.door);
    const leaf = corridorDoorBlock(d.door);
    const t = MAIN_CORRIDOR.wall;
    const out = { x: -p.into[0] * (t + 0.15), z: -p.into[1] * (t + 0.15) };
    return {
      ...d,
      p,
      seen: false,
      leaf,
      beyond: {
        minX: leaf.minX + out.x,
        maxX: leaf.maxX + out.x,
        minZ: leaf.minZ + out.z,
        maxZ: leaf.maxZ + out.z,
      },
    };
  });
  type Way = (typeof ways)[number];
  const jointFor = (w: Way): Joint => ({
    frame: {
      x: w.p.x * metre,
      z: w.p.z * metre,
      y: 0,
      yaw: corridorYaw(w.door),
    },
    onOpen: true,
    open: () => w.part.open(),
    angle: () => w.part.angle(),
    swingTo: (a) => w.part.swingTo(a),
    opening: () => {
      const half = MAIN_CORRIDOR.opening / 2;
      const x0 = w.p.x - w.p.into[0] * 2;
      const z0 = w.p.z - w.p.into[1] * 2;
      return toMetre({
        minX: Math.min(w.p.x, x0) - (w.p.into[0] ? 0.1 : half),
        maxX: Math.max(w.p.x, x0) + (w.p.into[0] ? 0.1 : half),
        minZ: Math.min(w.p.z, z0) - (w.p.into[1] ? 0.1 : half),
        maxZ: Math.max(w.p.z, z0) + (w.p.into[1] ? 0.1 : half),
      });
    },
    see: (on) => {
      w.seen = on;
      w.lobby.visible = !on;
    },
    peek: (on) => w.part.showLeaves(!on),
  });
  // One joint for each room off the ring, registered to the room its
  // doors lead to: the control room's, to the old control room or the
  // bridge as the CONTROL ROOM MODE knob says, changed only while they
  // are shut (`control-room-mode.ts`).
  const destination = (w: Way) => corridorDoorTo(w.door, mode.peek()) as RoomId;
  const groups = [...new Set(ways.map((w) => w.door.to))].map((key) => {
    const its = ways.filter((w) => w.door.to === key);
    return { to: destination(its[0]), ways: its, withdraw: () => {} };
  });
  const inUse = (g: (typeof groups)[number]) =>
    g.ways.length === 1
      ? g.ways[0]
      : g.ways[activeDoorway('main_corridor', g.to)];
  // The rooms a doorway may lead to: the control room's doors, either.
  const destinations = (w: Way) =>
    [
      ...new Set(CONTROL_ROOM_MODES.map((m) => corridorDoorTo(w.door, m))),
    ] as RoomId[];
  /**
   * A doorway's joints: to the room it leads to now, and, to each other
   * room it may lead to, one that never opens (so the app never draws
   * that room through it), so that room, reached by its URL, can still
   * see and hand back through the doorway; registered after, so the
   * nearest door is the one in use.
   */
  const register = (g: (typeof groups)[number]) => {
    const active = registerActive(g);
    const others = destinations(g.ways[0])
      .filter((to) => to !== g.to)
      .map((to) =>
        registerJoint('main_corridor', to, {
          ...jointFor(g.ways[0]),
          onOpen: false,
          open: () => false,
        }),
      );
    return () => {
      active();
      for (const o of others) o();
    };
  };
  const registerActive = (g: (typeof groups)[number]) => {
    if (g.ways.length === 1)
      return registerJoint('main_corridor', g.to, jointFor(g.ways[0]));
    const each = g.ways.map(jointFor);
    const active = () => activeDoorway('main_corridor', g.to);
    return registerJoint('main_corridor', g.to, {
      get frame() {
        return each[active()].frame;
      },
      onOpen: true,
      open: () => {
        const i = pickDoorway(
          active(),
          g.ways.map((w) => w.part.open()),
        );
        useDoorway('main_corridor', g.to, i);
        return each[i].open();
      },
      angle: () => each[active()].angle(),
      swingTo: (a) => each[active()].swingTo(a),
      opening: () => each[active()].opening(),
      see: (on) => {
        for (const w of g.ways) {
          w.seen = false;
          w.lobby.visible = true;
        }
        each[active()].see(on);
      },
      peek: (on) => {
        for (const e of each) e.peek(false);
        each[active()].peek(on);
      },
    });
  };
  for (const g of groups) g.withdraw = register(g);
  /** Each doorway's joint to the room it leads to now, re-registered if that has changed. */
  const settleDestinations = () => {
    for (const g of groups) {
      const to = settledDoorTo(
        g.to,
        destination(g.ways[0]),
        g.ways.some((w) => w.part.open()),
      ) as RoomId;
      if (to === g.to) continue;
      g.withdraw();
      for (const w of g.ways) {
        w.seen = false;
        w.lobby.visible = true;
        w.part.showLeaves(true);
      }
      g.to = to;
      g.withdraw = register(g);
    }
  };
  // Whether the walker is near each pair (`door-proximity.ts`), one for
  // each doorway, wider than its threshold: once open, the pair waits.
  const near = ways.map((w) => createDoorPresence(w.leaf));
  const inWay = (w: (typeof ways)[number]) =>
    overlaps(
      w.leaf,
      walk.walker.x / metre,
      walk.walker.z / metre,
      WALKER_RADIUS_METRES,
    );

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

  const walls = corridorSolids().map((s) => ({
    minX: s.minX * metre,
    maxX: s.maxX * metre,
    minZ: s.minZ * metre,
    maxZ: s.maxZ * metre,
  }));
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre,
    floorY: 0,
    // Outside the doors of the room it came from (`?from=`), or else in
    // the outside corner, looking along the east leg.
    start: (() => {
      const params =
        typeof location === 'undefined'
          ? null
          : new URLSearchParams(location.search);
      const a = corridorArrival(
        params?.get('from') ?? null,
        params?.get('door'),
      );
      return a
        ? { x: a.x * metre, z: a.z * metre, yaw: a.yaw }
        : { x: 2 * metre, z: 2 * metre, yaw: Math.PI / 2 };
    })(),
    floorAt: () => 0,
    // Each doorway shut to walking but while its doors stand open and the
    // room beyond is seen through them.
    // Each doorway: its leaves while shut, but never where the walker
    // stands; a stop just beyond until the room there is seen (the wet
    // hall's never, until it is built).
    solids: () => [
      ...walls,
      ...ways
        .flatMap((w) =>
          doorwayStops(
            {
              inside: inWay(w),
              shut: w.part.angle() < 0.6,
              seen: w.seen,
            },
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
  // The bridge's room tone through the control room doors (the owner,
  // 2026-10-27): while the walker is here and those doors lead to the
  // bridge, how far they stand open; nothing otherwise.
  const ambience = sharedBridgeAmbience();
  const controlGroup = groups.find((g) => g.ways[0].door.to === 'control_room');
  const hearBridge = () =>
    ambience.corridor(
      !walk.following && controlGroup?.to === 'bridge'
        ? doorShare(inUse(controlGroup).part.angle())
        : null,
    );
  // Whether each pair stood open last frame: null on arrival.
  const wasOpen: (boolean | null)[] = doors.map(() => null);
  // Its lights, the corridors' zone (`room-lights.ts`).
  const roomLights = bindRoomLights(scene, 'corridors');
  // Its readers' lamps, dark without the site's power.
  const roomPower = bindRoomPower(scene, sitePowered());
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    roomLights.update(delta);
    // No pair closes on someone near it: told before the leaves move.
    const actor = doorActor(walk, metre, WALKER_RADIUS_METRES);
    ways.forEach((w, i) => w.part.setNearby(near[i].update(actor)));
    controlDoorsOpen.value = controlDoors.part.open();
    parts.update(delta);
    settleDestinations();
    hearBridge();
    // Each pair's card readers show green while it stands open, beeping
    // only when it is opened here, not when it is found open on arrival.
    doors.forEach((d, i) => {
      const r = doorReaders(wasOpen[i], d.part.open());
      if (r.light)
        for (const reader of d.part.readers) reader.doorOpened(r.audible);
      wasOpen[i] = r.was;
    });
    // Through a plant room's doors, once it is seen: handed over to it.
    // Only the room in charge: not while drawn under another, following it.
    if (!leaving && !walk.following) {
      const x = walk.walker.x / metre;
      const z = walk.walker.z / metre;
      if (!inCorridor(x, z))
        for (const g of groups) {
          const l = inUse(g);
          const along = l.p.into[0] ? Math.abs(z - l.p.z) : Math.abs(x - l.p.x);
          const beyond = (l.p.x - x) * l.p.into[0] + (l.p.z - z) * l.p.into[1];
          if (l.seen && along < MAIN_CORRIDOR.opening / 2 && beyond > 0.05) {
            leaving = true;
            enterDevRoom(g.to, 'main_corridor', true);
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
      for (const g of groups) g.withdraw();
      ambience.corridor(null);
      parts.dispose();
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
        wasOpen.fill(null);
      },
      suspend() {
        ambience.corridor(null);
      },
      setVisual(enabled: boolean) {
        visual = enabled;
      },
    },
  );
}
