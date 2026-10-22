import { computed, signal } from '@preact/signals-core';
import {
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  SpotLight,
  TorusGeometry,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import {
  MACHINE_TONES,
  createSpin,
  machineTone,
} from '../../components/sound/audio/machine-tones';
import { partAudio } from '../../components/core/audio/part-audio';
import {
  SPA_BLOWER,
  SPA_BUBBLES,
  SPA_JETS,
} from '../../components/pool/audio/spa-sounds';
import { SPA } from '../../components/pool/logic/spa-controller';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { METRE } from '../../components/core/logic/units';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createSectionBoard } from '../../components/core/views/signage';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import { createPortals } from '../views/portals';
import { knobDirection } from '../../controls/input/knob-turning';
import { createCanvasTexture } from '../../components/core/views/screens';
import { createFirstPerson } from '../../controls/input/first-person';
import {
  beginPart,
  createPartSet,
  ledPushbutton,
  potentiometer,
} from '../../components/core/parts/parts';
import {
  createPs1Material,
  ps1Uniforms,
} from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';

const FLOOR = { minX: -7, maxX: 11, minZ: -5, maxZ: 5 };
const CEILING = 3.2;
/** How far the stands stand out from the walls, metres. */
const OFF_WALL = 0.6;
/**
 * Where the stands stand: round the walls, three metres or so apart, so
 * each is heard from where it is, all facing into the room (`yaw` turns
 * a stand's front, +z, towards the middle). The west and east walls keep
 * clear of the portals near their south ends.
 */
const PLACES = [
  ...[-4.5, -1.5, 1.5, 4.5].map((x) => ({
    x,
    z: FLOOR.minZ + OFF_WALL,
    yaw: 0,
  })),
  ...[-1, 1.8].map((z) => ({
    x: FLOOR.maxX - OFF_WALL,
    z,
    yaw: -Math.PI / 2,
  })),
  ...[5, 2, -1].map((x) => ({
    x,
    z: FLOOR.maxZ - OFF_WALL,
    yaw: Math.PI,
  })),
  ...[0.8, -2].map((z) => ({
    x: FLOOR.minX + OFF_WALL,
    z,
    yaw: Math.PI / 2,
  })),
];
/**
 * The spa's sounds (`components/pool/audio/spa-sounds.ts`), on stands of
 * their own at the north wall's east end, where the room was widened for
 * them: the blower, whose bubbles follow it into the water a few seconds
 * after it starts and die away a few seconds after it stops, as in the
 * jacuzzi; and the jet pump, heard as from the plant room.
 */
const SPA_PLACES = [7.5, 9.6].map((x) => ({
  x,
  z: FLOOR.minZ + OFF_WALL,
  yaw: 0,
}));
/** The SPEED knob's steps, and the rates they give: 0.5× to 2×. */
const SPEED_STEPS = 8;
const rateOf = (share: number) => 2 ** (share * 2 - 1);
/** Half the stand's footprint, metres, for walking into it. */
const HALF = 0.2;

/**
 * Dev7, Machine Tones: a listening room for the machine's hums and the
 * noise of its cooling (`src/toolkit/components/sound/audio/machine-tones.ts`), a stand for each
 * under its own spotlight, round the walls and facing in, so each is
 * heard from where it stands. Each stand has a fan behind a guard in its
 * front, its name, a green RUN button that starts and stops its tone, and
 * a SPEED knob that plays it from half to twice its speed, its fan
 * spinning with it, so a tone can be heard as a bigger, slower machine or
 * a smaller, faster one before it is given to a part. At the north
 * wall's east end, the spa's sounds, each with its RUN button.
 */
export function startTonesRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.45);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  scene.add(new AmbientLight('#e4e6ea', 0.3));
  scene.add(new HemisphereLight('#dfe4ea', '#3a3a36', 0.4));
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  const parts = createPartSet();

  // ---- The room -------------------------------------------------------------
  const W = FLOOR.maxX - FLOOR.minX;
  const D = FLOOR.maxZ - FLOOR.minZ;
  const floor = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#585c5e'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#2a2c30'));
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
  const wallPaint = kitPaint(kit, '#38423f');
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
  const sign = createSectionBoard(kit, 'MACHINE TONES', 3.4);
  sign.position.set(-1.7, 2.5, FLOOR.minZ + 0.154);
  room.add(sign);

  // ---- The stands -----------------------------------------------------------
  const casePaint = kitPaint(kit, '#3d4247', 0.3);
  const panelPaint = kitPaint(kit, '#6c7175', 0.2);
  const shroudPaint = kitPaint(kit, '#141516');
  const bladePaint = kitPaint(kit, '#26282b', 0.2);
  const guardPaint = kitPaint(kit, '#c9ccd0', 0.9);
  const runs = new Map<
    string,
    { run: () => void; speed: (n: number) => void }
  >();
  const stands = MACHINE_TONES.map((tone, i) => {
    const { x, z, yaw } = PLACES[i];
    const stand = new Group();
    stand.position.set(x, 0, z);
    stand.rotation.y = yaw;
    room.add(stand);
    // The case.
    const body = new Mesh(new BoxGeometry(0.34, 0.92, 0.3), casePaint);
    body.position.y = 0.46;
    stand.add(body);
    // A fan behind a wire guard in its front.
    const fan = new Group();
    fan.position.set(0, 0.5, 0.151);
    stand.add(fan);
    const shroud = new Mesh(new CircleGeometry(0.125, 40), shroudPaint);
    fan.add(shroud);
    const rotor = new Group();
    rotor.position.z = 0.012;
    fan.add(rotor);
    const hub = new Mesh(new CircleGeometry(0.035, 24), bladePaint);
    hub.position.z = 0.004;
    rotor.add(hub);
    for (let b = 0; b < 7; b++) {
      const blade = new Mesh(new BoxGeometry(0.03, 0.105, 0.004), bladePaint);
      blade.position.set(0, 0.065, 0);
      blade.rotation.y = 0.5;
      const arm = new Group();
      arm.rotation.z = (b / 7) * Math.PI * 2;
      arm.add(blade);
      rotor.add(arm);
    }
    for (const r of [0.04, 0.075, 0.11, 0.125]) {
      const ring = new Mesh(new TorusGeometry(r, 0.0018, 6, 48), guardPaint);
      ring.position.z = 0.026;
      fan.add(ring);
    }
    for (let s = 0; s < 4; s++) {
      const spoke = new Mesh(new BoxGeometry(0.25, 0.003, 0.003), guardPaint);
      spoke.position.z = 0.026;
      spoke.rotation.z = (s / 4) * Math.PI;
      fan.add(spoke);
    }
    // The sloping panel on top.
    const panel = new Group();
    // Its lower edge rests on the front of the case top.
    panel.position.set(0, 0.92 + 0.105, 0.0);
    panel.rotation.x = -0.62;
    stand.add(panel);
    const plate = new Mesh(new BoxGeometry(0.34, 0.26, 0.02), panelPaint);
    plate.position.z = -0.01;
    panel.add(plate);
    const title = createMicroLabel(kit, `${i + 1} · ${tone.name}`, {
      height: 0.012,
      ink: '#1c1d1e',
      maxWidth: 0.3,
    });
    title.position.set(0, 0.095, 0.001);
    panel.add(title);
    const caption = createMicroLabel(kit, tone.caption, {
      height: 0.0045,
      ink: '#2a2c2e',
      bold: false,
      maxWidth: 0.31,
    });
    caption.position.set(0, 0.07, 0.001);
    panel.add(caption);
    const run = parts.add(
      ledPushbutton(kit, {
        colour: 'green',
        legend: 'RUN',
        name: `${tone.name} RUN`,
      }),
    );
    run.object.position.set(-0.08, -0.03, 0);
    panel.add(run.object);
    const speed = parts.add(
      potentiometer(kit, {
        legend: 'SPEED',
        steps: SPEED_STEPS,
        initial: 0.5,
        name: `${tone.name} SPEED`,
      }),
    );
    speed.object.position.set(0.07, -0.03, 0);
    panel.add(speed.object);
    const rate = computed(() => rateOf(speed.share.value));
    // A readout of the rate, under the knob.
    const readout = createCanvasTexture(128, 40);
    kit.textures.push(readout.texture);
    const face = createPs1Material({ map: readout.texture }, true);
    kit.materials.push(face);
    const screen = new Mesh(new PlaneGeometry(0.06, 0.019), face);
    screen.position.set(0.07, -0.098, 0.001);
    screen.raycast = () => {};
    panel.add(screen);
    let shown = NaN;
    const show = (value: number, on: boolean) => {
      const c = readout.context;
      c.fillStyle = '#0d120e';
      c.fillRect(0, 0, 128, 40);
      c.fillStyle = on ? '#7dff9a' : '#2f5a39';
      c.font = 'bold 28px monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(`×${value.toFixed(2)}`, 64, 21);
      readout.texture.needsUpdate = true;
    };
    // The tone itself, held from the fan while RUN is on.
    const sound = beginPart(kit, `${tone.name} tone`);
    fan.add(sound.object);
    sound.holdWhile(run.state, machineTone(tone.id, rate));
    // The fan runs up and down with the sound, on the same times.
    let clock = 0;
    let running: ReturnType<typeof createSpin> | null = null;
    let was = false;
    sound.updates.push((delta) => {
      clock += delta;
      if (run.state.value !== was) {
        was = run.state.value;
        if (was) running = createSpin(tone.spin, clock);
        else running?.stop(clock);
      }
      const turns = running ? rate.value * running.at(clock) * 9 : 0;
      rotor.rotation.z -= turns * delta * Math.PI * 2;
      const key = rate.value + (run.state.value ? 10 : 0);
      if (key !== shown) {
        shown = key;
        show(rate.value, run.state.value);
      }
    });
    parts.add(sound.part());
    runs.set(String(i + 1), {
      run: () => run.uses.values().next().value?.(),
      speed: (n) => {
        const use = speed.uses.values().next().value;
        for (let k = 0; k < Math.abs(n); k++) use?.(Math.sign(n));
      },
    });
    // Its own spotlight, from above and in front.
    const spot = new SpotLight('#fff3e2', 12 * m * m, 0, 0.34, 0.6, 2);
    spot.position.set(
      (x + Math.sin(yaw) * 1.4) * m,
      (CEILING - 0.1) * m,
      (z + Math.cos(yaw) * 1.4) * m,
    );
    spot.target.position.set(x * m, 0.7 * m, z * m);
    scene.add(spot, spot.target);
    return { x, z, yaw, tone };
  });
  // ---- The spa's sounds -----------------------------------------------------
  const spaStands = (
    [
      [
        'SPA BLOWER',
        'Side-channel blower; its bubbles follow a few seconds behind',
        true,
      ],
      [
        'SPA JET PUMP',
        'The jet pump, a distant whine through the plant room wall',
        false,
      ],
    ] as const
  ).map(([name, line, blower], i) => {
    const { x, z, yaw } = SPA_PLACES[i];
    const stand = new Group();
    stand.position.set(x, 0, z);
    stand.rotation.y = yaw;
    room.add(stand);
    const body = new Mesh(new BoxGeometry(0.34, 0.92, 0.3), casePaint);
    body.position.y = 0.46;
    stand.add(body);
    const panel = new Group();
    panel.position.set(0, 0.92 + 0.105, 0.0);
    panel.rotation.x = -0.62;
    stand.add(panel);
    const plate = new Mesh(new BoxGeometry(0.34, 0.26, 0.02), panelPaint);
    plate.position.z = -0.01;
    panel.add(plate);
    const title = createMicroLabel(
      kit,
      `${MACHINE_TONES.length + i + 1} · ${name}`,
      {
        height: 0.012,
        ink: '#1c1d1e',
        maxWidth: 0.3,
      },
    );
    title.position.set(0, 0.095, 0.001);
    panel.add(title);
    const caption = createMicroLabel(kit, line, {
      height: 0.0045,
      ink: '#2a2c2e',
      bold: false,
      maxWidth: 0.31,
    });
    caption.position.set(0, 0.07, 0.001);
    panel.add(caption);
    const run = parts.add(
      ledPushbutton(kit, {
        colour: 'green',
        legend: 'RUN',
        name: `${name} RUN`,
      }),
    );
    run.object.position.set(0, -0.03, 0);
    panel.add(run.object);
    const sound = beginPart(kit, `${name} sound`);
    sound.object.position.set(0, 0.5, 0.16);
    stand.add(sound.object);
    sound.holdWhile(run.state, blower ? SPA_BLOWER : SPA_JETS);
    if (blower) {
      // The bubbles, lagging the blower as the jacuzzi's do.
      const bubbling = signal(false);
      let since = 0;
      let was = false;
      sound.updates.push((delta) => {
        const on = run.state.value;
        since = on === was ? since + delta : 0;
        was = on;
        if (on && since >= SPA.bubblesAfter) bubbling.value = true;
        if (!on && since >= SPA.bubblesLinger) bubbling.value = false;
      });
      sound.holdWhile(bubbling, SPA_BUBBLES);
    }
    parts.add(sound.part());
    runs.set(String(MACHINE_TONES.length + i + 1), {
      run: () => run.uses.values().next().value?.(),
      speed: () => {},
    });
    const spot = new SpotLight('#fff3e2', 12 * m * m, 0, 0.34, 0.6, 2);
    spot.position.set(
      (x + Math.sin(yaw) * 1.4) * m,
      (CEILING - 0.1) * m,
      (z + Math.cos(yaw) * 1.4) * m,
    );
    spot.target.position.set(x * m, 0.7 * m, z * m);
    scene.add(spot, spot.target);
    return { x, z, yaw };
  });
  stands.push(...(spaStands as typeof stands));
  room.updateMatrixWorld(true);

  // ---- Walking and working -----------------------------------------------
  const portals = createPortals('dev7', devPortals('dev7', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects([room, portals.group], true)[0];
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
  // A view's `y`, if given, is the eye's height in metres.
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number; y?: number }
  > = {
    room: { x: 0, z: 2.6 * m, yaw: 0, pitch: -0.12 },
  };
  // Each stand close up, standing at its panel and facing it: `?view=1`
  // and on (forward is (sin yaw, −cos yaw), the stand's front its own).
  for (const [i, { x, z, yaw }] of stands.entries())
    views[String(i + 1)] = {
      x: (x + Math.sin(yaw) * 0.85) * m,
      z: (z + Math.cos(yaw) * 0.85) * m,
      yaw: -yaw,
      pitch: -0.85,
    };
  const go = (pose: (typeof views)[string]) =>
    walk.place(
      pose.x,
      pose.z,
      pose.yaw,
      pose.pitch,
      pose.y === undefined ? undefined : pose.y * m,
    );
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.room,
    solids: () => [
      ...outer,
      ...stands.map(({ x, z }) => ({
        minX: (x - HALF) * m,
        maxX: (x + HALF) * m,
        minZ: (z - HALF) * m,
        maxZ: (z + HALF) * m,
      })),
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
  (window as unknown as { devTones: unknown }).devTones = {
    /** Work whatever is at screen point (x, y), −1 to 1, as a click does. */
    use: (x: number, y: number) => usableAt(x, y)?.(),
    view(name: string) {
      const pose = views[name];
      if (pose) go(pose);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    /** Press stand `n`'s RUN button. */
    run: (n: number | string) => runs.get(String(n))?.run(),
    /** Turn stand `n`'s SPEED knob `steps` detents (negative: slower). */
    speed: (n: number | string, steps: number) =>
      runs.get(String(n))?.speed(steps),
    tones: () => MACHINE_TONES.map((t, i) => `${i + 1} ${t.id}`),
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
    parts.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devTones?: unknown }).devTones;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) {
        go(view);
        return;
      }
      const pose = portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    suspend: () => parts.setAudible(false),
    resume: () => parts.setAudible(true),
  });
}
