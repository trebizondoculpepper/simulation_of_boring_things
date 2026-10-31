import { signal } from '@preact/signals-core';
import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  Group,
  HalfFloatType,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  RepeatWrapping,
  Scene,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import type { Material, Object3D } from 'three';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  createComposer,
  createRenderer,
  followEffectSettings,
  layoutSize,
} from '../../components/core/parts/render-style';
import { METRE } from '../../components/core/logic/units';
import {
  createPs1Material,
  ps1Uniforms,
} from '../../components/core/parts/ps1-material';
import {
  createFirstPerson,
  WALKER_RADIUS_METRES,
} from '../../controls/input/first-person';
import { knobDirection } from '../../controls/input/knob-turning';
import {
  createPanelKit,
  disposeKit,
  kitGlow,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import {
  createPartSet,
  keySwitch,
  pushButton,
} from '../../components/core/parts/parts';
import type { OperatorColour } from '../../components/industrial-control/views/industrial-controls';
import { partAudio } from '../../components/core/audio/part-audio';
import { createCanvasTexture } from '../../components/core/views/screens';
import { createBrandBadge } from '../../components/core/views/brand-badge';
import { createEngravedNameSign } from '../../components/general-safety/views/engraved-sign';
import { createLiftDoors } from '../../components/architectural/views/lift-doors';
import {
  ALARM_BELL,
  ARRIVAL_CHIME,
  BRAKE_CLUNK,
  CLOSING_WARNING,
  DOOR_THUD,
  DOOR_WHIRR,
  MOTOR_RUN,
  NUDGE_BUZZER,
} from '../../components/sound/audio/lift-sounds';
import { roomWorld } from '../../save/world-store';
import {
  carButtonLit,
  carAcceleration,
  carLevel,
  liftBetweenSteps,
  closingWarning,
  LIFTS,
  openAt,
} from '../logic/freight-lift';
import type { LiftId, LiftState } from '../logic/freight-lift';
import {
  CAR_FRONT,
  landingArrival,
  LANDING_SET,
  LIFT_CAR,
  LIFT_DOOR,
  liftDoorway,
} from '../logic/lift-doorway';
import type { LiftPlace } from '../logic/lift-doorway';
import { registerJoint } from '../logic/door-joins';
import { doorwayStops, overlaps } from '../logic/doorway';
import { enterDevRoom } from '../logic/dev-room-links';
import type { RoomId } from '../logic/dev-room-links';
import { prepareRoom } from '../logic/room-readiness';
import type { Footprint } from '../../controls/logic/walk-collision';
import {
  createLiftIndicator,
  indicatorOf,
  installLiftLanding,
} from '../views/lift-landing';

/**
 * The lift rooms (mission 108): a lift's car, a room of its own that
 * travels nowhere real (each floor is a room and a landing in it), and the
 * trial lift's dev floors (dev54_1 to dev54_4), alike but for their
 * colours and big numbers, on which the ride is tried as a way of masking
 * the floor ahead's loading: the car does not arrive until the room ahead
 * is built and warmed (`room-readiness.ts`).
 */

/** A room's renderer, camera, composer and frame size, as the lift rooms share them. */
function rig(canvas: HTMLCanvasElement) {
  const metre = METRE;
  const scene = new Scene();
  scene.background = null;
  const renderer = createRenderer(canvas, true);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor('#000000', 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const camera = new PerspectiveCamera(68, 1, 0.05 * metre, 80 * metre);
  const composer = createComposer(
    renderer,
    new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 }),
  );
  const base = new RenderPass(scene, camera);
  base.clearAlpha = 0;
  composer.addPass(base);
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.35, 0.4, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  followEffectSettings(composer, { bloom });
  const resize = () => {
    const { width, height } = layoutSize(canvas);
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    composer.setSize(Math.round(width), Math.round(height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  const group = new Group();
  group.scale.setScalar(metre);
  scene.add(group);
  return {
    metre,
    scene,
    renderer,
    camera,
    composer,
    group,
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      composer.dispose();
      scene.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      renderer.dispose();
    },
  };
}

const box = (
  material: Material,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  parent: Object3D,
) => {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};

const toScene = (metre: number) => (f: Footprint) => ({
  minX: f.minX * metre,
  maxX: f.maxX * metre,
  minZ: f.minZ * metre,
  maxZ: f.maxZ * metre,
});

/** What a room's walker aims at and may use, within reach. */
function aiming(
  camera: PerspectiveCamera,
  root: Object3D,
  uses: Map<Object3D, (direction?: number) => void>,
  metre: number,
) {
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  return (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(root, true)[0];
    if (!hit || hit.distance > 2.5 * metre) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work = uses.get(o);
      if (work) {
        const at = o;
        return () => work(knobDirection(at, hit.point, camera));
      }
    }
    return null;
  };
}

/** Chequer plate: raised diamond bosses on steel, drawn once. */
function chequerTexture(kit: PanelKit) {
  const { context: c, texture } = createCanvasTexture(64, 64);
  c.fillStyle = '#7c8286';
  c.fillRect(0, 0, 64, 64);
  c.fillStyle = '#a3a9ac';
  for (const [x, y, a] of [
    [16, 16, 0.6],
    [48, 48, 0.6],
    [48, 16, -0.6],
    [16, 48, -0.6],
  ]) {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.fillRect(-9, -2.5, 18, 5);
    c.restore();
  }
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(8, 11);
  kit.textures.push(texture);
  return texture;
}

/** The lift's inspection certificate (LOLER 1998), framed: printed once. */
function certificate(kit: PanelKit, name: string) {
  const { context: c, texture } = createCanvasTexture(300, 400);
  c.fillStyle = '#f4f1e6';
  c.fillRect(0, 0, 300, 400);
  c.fillStyle = '#1d1d1f';
  c.textAlign = 'center';
  c.font = 'bold 20px sans-serif';
  c.fillText('REPORT OF THOROUGH', 150, 40);
  c.fillText('EXAMINATION', 150, 64);
  c.font = '13px sans-serif';
  const lines = [
    'Lifting Operations and Lifting',
    'Equipment Regulations 1998, reg. 9',
    '',
    name,
    'Stannard Lifts goods lift, type GL2000',
    'Serial SL-2000-1187 · installed 1999',
    'Safe working load 2000 kg (26 persons)',
    '',
    'Examined: 14 AUG 2026',
    'Next examination due: 14 FEB 2027',
    'Defects requiring action: NONE',
    '',
    'Competent person: R. Achterberg',
    'for Certikind Inspection Services',
  ];
  lines.forEach((line, i) => c.fillText(line, 150, 100 + i * 19));
  c.strokeStyle = '#8a2c26';
  c.lineWidth = 3;
  c.strokeRect(8, 8, 284, 384);
  kit.textures.push(texture);
  // PS1, so it trembles with the wall it hangs on; stood clear of its
  // frame and drawn over it whatever the depth buffer's precision, so the
  // two never fight, even as the car judders.
  const material = createPs1Material(
    {
      map: texture,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -8,
    },
    true,
  );
  kit.materials.push(material);
  const sheet = new Mesh(new PlaneGeometry(0.21, 0.28), material);
  sheet.position.z = 0.003;
  // The frame, 8 mm deep behind the sheet.
  const frame = new Mesh(
    new BoxGeometry(0.24, 0.31, 0.008),
    kitPaint(kit, '#2b2b2b'),
  );
  frame.position.z = -0.004;
  const g = new Group();
  g.add(frame, sheet);
  return g;
}

/** How far into the car its front stands behind its sill's edge: the car door's panels run there. */
const FRONT = CAR_FRONT;
/** The judder's tremble, metres for each level per second squared the car accelerates: about 5 mm at its hardest. */
const JUDDER = 0.008;

/**
 * A lift's car (`freight_lift`, or the trial lift's `dev54`): a heavy steel
 * goods car 2.62 m wide, 2.8 m deep and 2.4 m clear, its doorway at the
 * north end (z 0), its chequer-plate floor, steel walls and buffer rails,
 * a fluorescent fitting, the car's door (centre-opening, four stainless
 * panels, a light curtain down its leading edges; the owner, 2026-10-30:
 * solid, so the shaft is never seen while riding), a floor indicator
 * over the doorway, the car operating panel on the right as one faces
 * out, the rated-load plate and the inspection certificate. Through its
 * open doors the floor it stands at is seen (its room, drawn under).
 */
export function startLiftCarRoom(canvas: HTMLCanvasElement, id: LiftId) {
  const r = rig(canvas);
  const { metre, scene, camera, group } = r;
  const spec = LIFTS[id];
  const room = spec.car as RoomId;
  const store = roomWorld();
  const lift = () => store.world.value.lifts[id];
  const kit = createPanelKit();
  const parts = createPartSet();
  scene.add(new AmbientLight('#eef2f5', 0.35));
  scene.add(new HemisphereLight('#f2f6f8', '#3b3f42', 0.5));
  const { w: W, d: D, h: H } = LIFT_CAR;
  const place: LiftPlace = { x: 0, z: 0, yaw: 0 };
  const doorway = liftDoorway(place);
  // The car's body.
  const body = new Group();
  group.add(body);
  const floorMaterial = kitPaint(kit, '#ffffff', 0.5);
  (floorMaterial as unknown as { map: unknown }).map = chequerTexture(kit);
  box(floorMaterial, W, 0.02, D, 0, -0.01, D / 2, body);
  const wall = kitPaint(kit, '#8e979c', 0.45);
  const rail = kitPaint(kit, '#4f5559', 0.5);
  // Side walls and back wall, with buffer rails at 0.3 m and 0.9 m.
  for (const s of [-1, 1]) {
    box(wall, 0.04, H, D, s * (W / 2 + 0.02), H / 2, D / 2, body);
    for (const y of [0.3, 0.9])
      box(rail, 0.05, 0.14, D - 0.1, s * (W / 2 - 0.025), y, D / 2, body);
  }
  box(wall, W, H, 0.04, 0, H / 2, D + 0.02, body);
  for (const y of [0.3, 0.9])
    box(rail, W - 0.1, 0.14, 0.05, 0, y, D - 0.025, body);
  // The front: returns either side of the doorway and the panel over it,
  // set back `FRONT` from the car's sill edge, the door's panels running
  // between (inside the car's side of its doorway, so they are drawn when
  // the car is seen from a landing).
  const ret = (W - LIFT_DOOR.clear) / 2;
  for (const s of [-1, 1])
    box(
      wall,
      ret,
      H,
      0.04,
      s * (LIFT_DOOR.clear / 2 + ret / 2),
      H / 2,
      FRONT + 0.02,
      body,
    );
  box(
    wall,
    LIFT_DOOR.clear,
    H - LIFT_DOOR.height,
    0.04,
    0,
    (H + LIFT_DOOR.height) / 2,
    FRONT + 0.02,
    body,
  );
  // The ceiling, and its fluorescent fitting.
  box(kitPaint(kit, '#c9cdcf'), W, 0.03, D, 0, H + 0.015, D / 2, body);
  box(kitPaint(kit, '#d9dcdc'), 0.2, 0.06, 1.25, 0, H - 0.03, D / 2, body);
  box(kitGlow(kit, '#f4fbff'), 0.14, 0.01, 1.2, 0, H - 0.065, D / 2, body);
  const tube = new PointLight('#eef6ff', 3.5 * metre * metre, 0, 2);
  tube.position.set(0, (H - 0.2) * metre, (D / 2) * metre);
  scene.add(tube);
  // The car's door, in the doorway, its panels stacking behind the front
  // returns.
  // Its sill under them, grooved aluminium.
  box(
    kitPaint(kit, '#a9aeb0', 0.5),
    W,
    0.012,
    FRONT,
    0,
    0.006,
    FRONT / 2,
    body,
  );
  const carDoor = createLiftDoors(kit, { frame: false, curtain: true });
  carDoor.group.position.z = FRONT;
  body.add(carDoor.group);
  const whirr = {};
  let whirring = false;
  // Beyond it, while the floor's room is not seen: the landing doors, as
  // the car stands at them, or the shaft wall going by as it runs.
  const outside = new Group();
  group.add(outside);
  // The landing as it stands across the running gap: its face (the wall's)
  // `LANDING_SET` out, turned to face away from the car, its doors in
  // its recess nearest the car's sill.
  const landing = createLiftDoors(kit);
  landing.group.position.z = -LANDING_SET;
  landing.group.rotation.y = Math.PI;
  outside.add(landing.group);
  const shaftTex = (() => {
    const { context: c, texture } = createCanvasTexture(64, 256);
    // Concrete, a landing's steel sill band and its yellow nosing once a
    // storey, as the car passes each floor.
    c.fillStyle = '#9a9c98';
    c.fillRect(0, 0, 64, 256);
    for (let y = 0; y < 256; y += 32) {
      c.fillStyle = '#8f918d';
      c.fillRect(0, y, 64, 2);
    }
    c.fillStyle = '#55595b';
    c.fillRect(0, 112, 64, 24);
    c.fillStyle = '#d8b21c';
    c.fillRect(0, 136, 64, 5);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(2, 1);
    kit.textures.push(texture);
    return texture;
  })();
  const shaftMaterial = new MeshBasicMaterial({
    map: shaftTex,
    color: '#b4b4b4',
  });
  kit.materials.push(shaftMaterial);
  const shaft = new Mesh(new PlaneGeometry(W + 0.4, 4), shaftMaterial);
  shaft.position.set(0, 1.5, -0.6);
  outside.add(shaft);
  // The indicator over the doorway.
  const indicator = createLiftIndicator(kit, 0.04);
  indicator.group.position.set(0, LIFT_DOOR.height + 0.1, FRONT + 0.045);
  body.add(indicator.group);
  // The car operating panel, on the right-hand wall as one faces out (+x
  // in the car's frame is east; facing north, the right).
  const cop = new Group();
  cop.position.set(W / 2 - 0.005, 0, 0.42);
  cop.rotation.y = -Math.PI / 2;
  body.add(cop);
  box(kitPaint(kit, '#c3c8ca', 0.75), 0.26, 1.1, 0.012, 0, 1.15, -0.006, cop);
  const badge = createBrandBadge(kit, 'stannard', { height: 0.028 });
  badge.position.set(0, 1.64, 0.002);
  cop.add(badge);
  const lits = new Map<string, ReturnType<typeof signal<boolean>>>();
  const add = (
    part: ReturnType<typeof pushButton> | ReturnType<typeof keySwitch>,
    y: number,
    x = 0,
  ) => {
    parts.add(part);
    part.object.position.set(x, y, 0.001);
    cop.add(part.object);
  };
  const press = (button: string) =>
    store.dispatch({ type: 'lift/press', lift: id, button });
  // Floor buttons, the top floor first.
  const floors = [...spec.floors].reverse();
  const top = 1.5;
  const step = Math.min(0.12, 0.42 / Math.max(1, floors.length - 1));
  floors.forEach((f, i) => {
    const lit = signal(false);
    lits.set(f.id, lit);
    add(
      pushButton(kit, {
        name: `${spec.name} car button, floor ${f.label}`,
        legend: `${f.label} ${f.legend}`,
        colour: 'white',
        head: 'illuminated',
        lamp: lit,
        symbol: f.label,
        action: () => press(f.id),
      }),
      top - i * step,
    );
  });
  const row = top - floors.length * step - 0.04;
  const button = (
    name: string,
    colour: OperatorColour,
    symbol: string,
    b: string,
    x: number,
    y: number,
  ) =>
    add(
      pushButton(kit, {
        name: `${spec.name} ${name}`,
        legend: name,
        colour,
        symbol,
        action: () => press(b),
      }),
      y,
      x,
    );
  button('DOOR OPEN', 'black', '◀▶', 'open', -0.06, row);
  button('DOOR CLOSE', 'black', '▶◀', 'close', 0.06, row);
  button('ALARM', 'yellow', '♪', 'alarm', 0, row - 0.13);
  // The independent service key switch: seen, turned, wired to nothing.
  add(
    keySwitch(kit, { name: 'Independent service', legend: 'INDEPENDENT' }),
    row - 0.27,
  );
  // The rated-load plate and the certificate, on the left-hand wall.
  const left = new Group();
  left.position.set(-W / 2 + 0.005, 0, 0.9);
  left.rotation.y = Math.PI / 2;
  body.add(left);
  const plate = createEngravedNameSign(
    kit,
    0.5,
    0.09,
    'RATED LOAD 2000 kg · 26 PERSONS',
  );
  plate.position.set(0, 1.75, 0.002);
  left.add(plate);
  const cert = certificate(kit, spec.name);
  cert.position.set(0, 1.4, 0.0035);
  left.add(cert);

  // Its side of the doorway, registered to the floor it stands at; while
  // it runs, to the floor ahead, lazily, so the app builds that room
  // unseen (`checkDoors` in `src/main.ts`).
  let seen = false;
  const roomOf = (floor: string) =>
    spec.floors.find((f) => f.id === floor)?.room as RoomId | undefined;
  const joint = (to: RoomId, lazy: boolean) =>
    registerJoint(room, to, {
      frame: { x: 0, z: 0, yaw: 0, y: 0 },
      lazy,
      open: () => {
        const l = lift();
        return !lazy && roomOf(l.floor) === to && openAt(l, l.floor);
      },
      angle: () => 0,
      swingTo: () => {},
      opening: () => toScene(metre)(doorway.opening),
      see: (on) => {
        seen = on;
        outside.visible = !on;
      },
      // Seen from the landing, the car's door stays: it and the landing's
      // move as a pair, and the landing's own panels are hidden while the
      // car is seen through them.
      peek: () => {},
    });
  let registered: { to: RoomId; lazy: boolean; withdraw: () => void } | null =
    null;
  const settleJoint = (l: LiftState) => {
    const to = roomOf(l.trip ? l.trip.to : l.floor);
    const lazy = Boolean(l.trip);
    if (!to) return;
    if (registered && registered.to === to && registered.lazy === lazy) return;
    // Never to another room while the doors stand open: the room beyond
    // is drawn through them (a lazy joint never is, so it may turn into
    // the floor's own at once).
    if (registered && registered.to !== to && l.open > 0) return;
    registered?.withdraw();
    registered = { to, lazy, withdraw: joint(to, lazy) };
  };
  settleJoint(lift());

  const walls = [
    { minX: -W / 2 - 0.2, maxX: -W / 2, minZ: -0.2, maxZ: D + 0.2 },
    { minX: W / 2, maxX: W / 2 + 0.2, minZ: -0.2, maxZ: D + 0.2 },
    { minX: -W / 2, maxX: W / 2, minZ: D, maxZ: D + 0.2 },
    {
      minX: -W / 2,
      maxX: -LIFT_DOOR.clear / 2,
      minZ: -0.2,
      maxZ: FRONT + 0.04,
    },
    {
      minX: LIFT_DOOR.clear / 2,
      maxX: W / 2,
      minZ: -0.2,
      maxZ: FRONT + 0.04,
    },
  ];
  const params = new URLSearchParams(location.search);
  const from = params.get('from');
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre,
    floorY: 0,
    // Just inside the doorway if come from a floor, else at the back
    // looking out.
    start: {
      x: 0,
      z: (from ? 1.0 : 2.2) * metre,
      yaw: 0,
    },
    floorAt: () => 0,
    solids: () => {
      const l = lift();
      const w = { x: walk.walker.x / metre, z: walk.walker.z / metre };
      return [
        ...walls,
        ...doorwayStops(
          {
            inside: overlaps(doorway.leaf, w.x, w.z, WALKER_RADIUS_METRES),
            shut: Boolean(l.trip) || l.open < 0.75,
            seen,
          },
          doorway.leaf,
          doorway.beyond,
        ),
      ].map(toScene(metre));
    },
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
  });
  const usableAt = aiming(camera, group, parts.uses, metre);
  // In development, a console handle to stand the walker in the car
  // (`window.liftCar.stand(0, 1.6, 0)`: metres, yaw in degrees), for
  // looking out or at the panel where no mouse can turn the view, and to
  // press its buttons.
  if (import.meta.env.DEV && typeof window !== 'undefined')
    (window as unknown as { liftCar: unknown }).liftCar = {
      stand(x: number, z: number, yaw: number, pitch = 0) {
        walk.place(
          x * metre,
          z * metre,
          (yaw * Math.PI) / 180,
          (pitch * Math.PI) / 180,
        );
      },
      /** Presses a car button (`'2'`), for riding without a mouse. */
      press,
    };

  let held = false;
  let blocked = false;
  let leaving = false;
  let was: LiftState | null = null;
  let warned = false;
  let preparing = '';
  const motorOwner = {};
  let visual = true;
  let last = 0;
  let clock = 0;
  const smooth = liftBetweenSteps(spec.floors);
  r.renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    clock += delta;
    walk.update(delta);
    const l = lift();
    settleJoint(l);
    // The doors, as the world has them (carried on between its steps, so
    // they move smoothly); the shaft going by.
    const v = smooth(l, clock);
    const here = !l.trip;
    const seen = here ? v.open : 0;
    carDoor.setOpen(seen);
    carDoor.setCurtain(here && l.held && l.doors !== 'shut');
    landing.setOpen(seen);
    landing.group.visible = here;
    shaft.visible = !here;
    // Rising, the wall goes down past the door: the offset grows with the level.
    shaftTex.offset.y = carLevel(v, spec.floors) * 0.9;
    for (const [f, lit] of lits) lit.value = carButtonLit(l, f);
    const shown = indicatorOf(l, id);
    indicator.show(shown.label, shown.way);
    // Vibration: the universe's lost precision (the effects lab's), every
    // vertex snapped to a fine grid and trembling, by as much as the car
    // is speeding up or slowing down: hard as it sets off and comes in to
    // a floor, still while it runs at its speed or stands.
    const grid = Math.abs(carAcceleration(v, spec.floors)) * JUDDER;
    ps1Uniforms.time.value = clock;
    ps1Uniforms.precision.value.set(grid * metre, grid ? 1 : 0, 30);
    parts.update(delta);
    // Only while in charge: not drawn under another room, nor just left.
    if (!walk.following && !leaving) {
      partAudio.listen(camera, metre, scene);
      const w = { x: walk.walker.x / metre, z: walk.walker.z / metre };
      // The light curtain, and the doors' safety edges: someone in either
      // door's path (the car's, or the landing's across the sill).
      const inPath = here && doorway.blocks(w.x, w.z, WALKER_RADIUS_METRES);
      const inWay = inPath || (here && doorway.inDoorway(w.x, w.z));
      if (inWay !== held || inPath !== blocked) {
        held = inWay;
        blocked = inPath;
        store.dispatch({ type: 'lift/hold', lift: id, held, blocked });
      }
      // The floor ahead built and warmed unseen while the car runs: only
      // then may it arrive.
      if (l.trip && !l.trip.ready) {
        const key = `${l.trip.from}>${l.trip.to}`;
        const to = roomOf(l.trip.to);
        if (key !== preparing && to) {
          preparing = key;
          const floor = l.trip.to;
          void prepareRoom(to)
            .catch(() => {})
            .then(() =>
              store.dispatch({ type: 'lift/ready', lift: id, floor }),
            );
        }
      } else if (!l.trip) preparing = '';
      // Its sounds.
      partAudio.hold(motorOwner, l.trip ? MOTOR_RUN : null, body);
      if (was) {
        if (was.trip && !l.trip) {
          partAudio.play(BRAKE_CLUNK, body);
          partAudio.play(ARRIVAL_CHIME, indicator.group);
        }
        if (was.doors !== l.doors && (l.doors === 'open' || l.doors === 'shut'))
          partAudio.play(DOOR_THUD, carDoor.group);
        const warning = closingWarning(l);
        if (warning && !warned)
          partAudio.play(
            l.nudging ? NUDGE_BUZZER : CLOSING_WARNING,
            indicator.group,
          );
        warned = warning;
        if (l.alarm > was.alarm + 0.5) partAudio.play(ALARM_BELL, cop);
      }
      was = l;
      const moving = here && (l.doors === 'opening' || l.doors === 'closing');
      if (moving !== whirring) {
        whirring = moving;
        partAudio.hold(whirr, moving ? DOOR_WHIRR : null, carDoor.group);
      }
      // Out through the open doors onto the floor: handed over.
      const to = roomOf(l.floor);
      if (!leaving && here && seen && to && doorway.through(w.x, w.z)) {
        leaving = true;
        if (held) {
          held = false;
          blocked = false;
          store.dispatch({ type: 'lift/hold', lift: id, held: false });
        }
        enterDevRoom(to, room, true);
      }
    } else {
      partAudio.hold(motorOwner, null);
      if (whirring) partAudio.hold(whirr, null);
      whirring = false;
      was = null;
    }
    if (visual) r.composer.render(delta);
  });
  return Object.assign(
    () => {
      partAudio.hold(motorOwner, null);
      partAudio.hold(whirr, null);
      registered?.withdraw();
      parts.dispose();
      disposeKit(kit, group as never);
      walk.dispose();
      r.dispose();
    },
    {
      resume() {
        leaving = false;
        held = false;
        blocked = false;
        was = null;
      },
      suspend() {
        partAudio.hold(motorOwner, null);
        partAudio.hold(whirr, null);
        whirring = false;
      },
      setVisual(enabled: boolean) {
        visual = enabled;
      },
    },
  );
}

/** Each trial floor's colours: its walls, its floor, its number's paint. */
const TRIAL_COLOURS: Record<string, readonly [string, string, string]> = {
  '1': ['#5f7f96', '#3c4a54', '#f2f2f2'],
  '2': ['#6f9068', '#3f4d3b', '#f7f3d0'],
  '3': ['#a3865a', '#56482f', '#1e1b16'],
  '4': ['#8a6a8f', '#4a3a4e', '#f8e8ff'],
};

/** A big painted floor number. */
function bigNumber(kit: PanelKit, text: string, ink: string, size: number) {
  const { context: c, texture } = createCanvasTexture(256, 256);
  c.clearRect(0, 0, 256, 256);
  c.fillStyle = ink;
  c.font = 'bold 200px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 128, 138);
  kit.textures.push(texture);
  const material = createPs1Material({ map: texture, transparent: true }, true);
  kit.materials.push(material);
  return new Mesh(new PlaneGeometry(size, size), material);
}

/** The trial floors' room: 8 m wide, 7 m deep, 3.2 m high, its landing in the middle of its north wall. */
export const TRIAL_FLOOR = { w: 8, d: 7, h: 3.2, wall: 0.2 } as const;
export const TRIAL_LANDING: LiftPlace = { x: 0, z: 0, yaw: 0 };

/**
 * A trial lift floor (`dev54_1` to `dev54_4`): a plain room, each in its
 * own colours with its number painted big on its floor and its south
 * wall, the trial lift's landing in its north wall.
 */
export function startLiftTrialFloor(canvas: HTMLCanvasElement, n: string) {
  const r = rig(canvas);
  const { metre, scene, camera, group } = r;
  const room = `dev54_${n}` as RoomId;
  const store = roomWorld();
  const kit = createPanelKit();
  const parts = createPartSet();
  const [wallColour, floorColour, ink] = TRIAL_COLOURS[n] ?? TRIAL_COLOURS['1'];
  const { w: W, d: D, h: H, wall: T } = TRIAL_FLOOR;
  scene.add(new AmbientLight('#ffffff', 0.4));
  scene.add(new HemisphereLight('#ffffff', '#404040', 0.6));
  for (const z of [2, 5]) {
    const lamp = new PointLight('#fff6e8', 6 * metre * metre, 0, 2);
    lamp.position.set(0, (H - 0.3) * metre, z * metre);
    scene.add(lamp);
    box(kitGlow(kit, '#fffaf0'), 1.2, 0.04, 0.2, 0, H - 0.02, z, group);
  }
  const wallM = kitPaint(kit, wallColour);
  box(kitPaint(kit, floorColour), W, 0.02, D, 0, -0.01, D / 2, group);
  box(kitPaint(kit, '#d8d8d4'), W, 0.02, D, 0, H + 0.01, D / 2, group);
  // The walls: the north wall round the landing's frame.
  const gap = LIFT_DOOR.clear / 2 + LIFT_DOOR.frame;
  const head = LIFT_DOOR.height + LIFT_DOOR.frame;
  box(
    wallM,
    W / 2 - gap + T,
    H,
    T,
    -(gap + W / 2 + T) / 2,
    H / 2,
    -T / 2,
    group,
  );
  box(
    wallM,
    W / 2 - gap + T,
    H,
    T,
    (gap + W / 2 + T) / 2,
    H / 2,
    -T / 2,
    group,
  );
  box(wallM, 2 * gap, H - head, T, 0, (H + head) / 2, -T / 2, group);
  box(wallM, W + 2 * T, H, T, 0, H / 2, D + T / 2, group);
  for (const s of [-1, 1])
    box(wallM, T, H, D, s * (W / 2 + T / 2), H / 2, D / 2, group);
  // Its number, big, on the floor and on the south wall.
  const onFloor = bigNumber(kit, n, ink, 2.6);
  onFloor.rotation.x = -Math.PI / 2;
  onFloor.position.set(0, 0.005, 3.6);
  group.add(onFloor);
  const onWall = bigNumber(kit, n, ink, 2.2);
  onWall.rotation.y = Math.PI;
  onWall.position.set(0, 1.6, D - 0.01);
  group.add(onWall);
  const solidsOf = toScene(metre);
  const walls = [
    { minX: -W / 2 - T, maxX: -gap, minZ: -T, maxZ: 0 },
    { minX: gap, maxX: W / 2 + T, minZ: -T, maxZ: 0 },
    { minX: -W / 2 - T, maxX: W / 2 + T, minZ: D, maxZ: D + T },
    { minX: -W / 2 - T, maxX: -W / 2, minZ: -T, maxZ: D + T },
    { minX: W / 2, maxX: W / 2 + T, minZ: -T, maxZ: D + T },
  ];
  const params = new URLSearchParams(location.search);
  const arrival = landingArrival(TRIAL_LANDING);
  const fromCar = params.get('from') === LIFTS.trial.car;
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre,
    floorY: 0,
    // Out of the lift, or at the back of the room looking at the landing.
    start: fromCar
      ? { x: arrival.x * metre, z: arrival.z * metre, yaw: arrival.yaw }
      : { x: 0, z: 5 * metre, yaw: 0 },
    floorAt: () => 0,
    solids: () => [...walls, ...landing.solids()].map(solidsOf),
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
  });
  const landing = installLiftLanding({
    room,
    lift: 'trial',
    floor: n,
    place: TRIAL_LANDING,
    kit,
    parts,
    parent: group,
    metre,
    store,
    walk,
    camera,
  });
  const usableAt = aiming(camera, group, parts.uses, metre);
  let visual = true;
  let last = 0;
  r.renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    if (!walk.following) partAudio.listen(camera, metre, scene);
    parts.update(delta);
    landing.update();
    if (visual) r.composer.render(delta);
  });
  return Object.assign(
    () => {
      landing.dispose();
      parts.dispose();
      disposeKit(kit, group as never);
      walk.dispose();
      r.dispose();
    },
    {
      resume() {
        landing.resume();
      },
      suspend() {
        landing.suspend();
      },
      setVisual(enabled: boolean) {
        visual = enabled;
      },
    },
  );
}
