import { createRearFittingsBoard } from './rear-fittings-board';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { devPortals, devWalls } from '../logic/dev-room-links';
import type { Footprint } from '../../controls/logic/walk-collision';
import { METRE } from '../../components/core/logic/units';
import { createPortals } from '../views/portals';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { knobDirection } from '../../controls/input/knob-turning';
import { partAudio } from '../../components/core/audio/part-audio';
import { createDazzle } from '../../components/core/views/dazzle';
import { createFirstPerson } from '../../controls/input/first-person';
import { isHeldPortableHit } from '../../controls/input/object-handling';
import {
  createPs1Material,
  ps1Uniforms,
} from '../../components/core/parts/ps1-material';
import {
  createCabinetBoard,
  createControlsBoard,
  createDisplaysBoard,
  createStudioBoard,
} from './test-boards';
import type { TestFitting } from './test-boards';
import {
  createMachineGallery,
  createEmptyMachinePlinths,
  ALL_GALLERY_LAYOUT,
  EMPTY_GALLERY_LAYOUT,
  MACHINE_GALLERY_LAYOUT,
  MACHINE_PLINTH_WIDTH,
} from './machine-gallery';

/**
 * Dev0, Controls and Displays: the kinds of controls, displays and working
 * parts the game's machine will be built from, after the motor control
 * centre in Rockwell's Retro Encabulator film (an Allen-Bradley CENTERLINE
 * line-up). On the north wall, the CONTROLS board of 30 mm pilot devices
 * and the DISPLAYS board of indicators and displays, each driven by test
 * controls. The plinths exhibit the shared machine inventory, each with a top panel to put it through what it does,
 * failures included. Every control is a component.
 */
export function startControlsRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const half = { x: 10, z: 8 };
  const bounds: Footprint = {
    minX: -half.x * m,
    maxX: half.x * m,
    minZ: -half.z * m,
    maxZ: 10.5 * m,
  };
  const height = 3.4;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.35);
  renderer.setClearColor('#2a2c2b');
  const camera = new PerspectiveCamera(52, 1, 0.05, 40 * m);
  scene.add(new AmbientLight('#f4f6ff', 0.9));
  const key = new DirectionalLight('#f6f7ff', 1.6);
  key.position.set(-2, 6, 4);
  scene.add(key);
  // Sealed concrete, and walls in the pale institutional green of a plant.
  const floorMaterial = createPs1Material({ color: '#7b7d78' });
  const wallMaterial = createPs1Material({ color: '#b7c2b2' });
  const slab = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    wall = false,
  ) => {
    const mesh = new Mesh(
      new BoxGeometry(w, h, d),
      wall ? wallMaterial : floorMaterial,
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);
  };
  const roomDepth = bounds.maxZ - bounds.minZ;
  const roomCentreZ = (bounds.minZ + bounds.maxZ) / 2;
  slab(2 * half.x * m, 0.1 * m, roomDepth, 0, -0.05 * m, roomCentreZ);
  slab(
    2 * half.x * m,
    0.1 * m,
    roomDepth,
    0,
    (height + 0.05) * m,
    roomCentreZ,
    true,
  );
  const doors = devPortals('dev0', bounds, m);
  const walls = devWalls(bounds, m, height * m);
  for (const wall of walls)
    slab(
      wall.maxX - wall.minX,
      wall.top - wall.bottom,
      wall.maxZ - wall.minZ,
      (wall.minX + wall.maxX) / 2,
      (wall.bottom + wall.top) / 2,
      (wall.minZ + wall.maxZ) / 2,
      true,
    );
  const passages = createPortals('dev0', doors, 0, m);
  scene.add(passages.group);

  // The north/east wall boards and the freestanding machine gallery.
  const kit = createPanelKit();
  const fittings: TestFitting[] = [];
  const footprints: Footprint[] = [];
  const place = (
    fitting: TestFitting,
    x: number,
    y: number,
    z: number,
    yaw = 0,
    footprint?: Footprint,
  ) => {
    fitting.group.scale.setScalar(m);
    fitting.group.position.set(x * m, y * m, z * m);
    fitting.group.rotation.y = yaw;
    scene.add(fitting.group);
    fittings.push(fitting);
    if (footprint) footprints.push(footprint);
  };
  const boardZ = -half.z + 0.25;
  const boardFootprint = (x: number, width: number): Footprint => ({
    minX: (x - width / 2) * m,
    maxX: (x + width / 2) * m,
    minZ: -half.z * m,
    maxZ: (boardZ + 0.1) * m,
  });
  place(createControlsBoard(kit), -3, 1.55, boardZ, 0, boardFootprint(-3, 3));
  place(
    createDisplaysBoard(kit),
    2.4,
    1.55,
    boardZ,
    0,
    boardFootprint(2.4, 3.2),
  );
  // The studio controls, a newer family than the industrial ones, on the
  // north wall beyond the displays.
  const studioX = 6.4;
  place(
    createStudioBoard(kit),
    studioX,
    1.55,
    boardZ,
    0,
    boardFootprint(studioX, 2.1),
  );
  // The cabinet fittings on the east wall, facing west: tried here first,
  // then fitted to the Retro Encabulator (dev6).
  const cabinetX = half.x - 0.25;
  const cabinetZ = -0.9;
  place(createCabinetBoard(kit), cabinetX, 1.55, cabinetZ, -Math.PI / 2, {
    minX: (cabinetX - 0.1) * m,
    maxX: half.x * m,
    minZ: (cabinetZ - 2.55) * m,
    maxZ: (cabinetZ + 2.55) * m,
  });
  place(createRearFittingsBoard(kit), cabinetX, 1.55, 4.2, -Math.PI / 2, {
    minX: (cabinetX - 0.5) * m,
    maxX: half.x * m,
    minZ: 2.75 * m,
    maxZ: 5.65 * m,
  });
  [...createMachineGallery(kit), ...createEmptyMachinePlinths(kit)].forEach(
    (plinth, i) => {
      const { x, z } = ALL_GALLERY_LAYOUT[i];
      const reach = MACHINE_PLINTH_WIDTH / 2 + 0.15;
      place(plinth, x, 0, z, 0, {
        minX: (x - reach) * m,
        maxX: (x + reach) * m,
        minZ: (z - reach) * m,
        maxZ: (z + reach) * m,
      });
    },
  );

  // What was worked, and what it did.
  const log = document.createElement('ol');
  log.setAttribute('aria-label', 'Parts worked');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  Object.assign(log.style, {
    position: 'absolute',
    left: '12px',
    top: '64px',
    margin: '0',
    padding: '8px 12px',
    listStyle: 'none',
    pointerEvents: 'none',
    maxWidth: 'min(460px, calc(100% - 48px))',
    background: 'rgba(14,12,9,0.78)',
    color: '#e9e1c8',
    font: '13px/1.45 "Courier New", monospace',
  });
  log.hidden = true;
  canvas.parentElement?.append(log);
  const report = (name: string, event: string) => {
    const item = document.createElement('li');
    item.textContent = `${name}: ${event}`;
    log.prepend(item);
    while (log.children.length > 10) log.lastElementChild!.remove();
    log.hidden = false;
    console.info(`dev0: ${item.textContent}`);
  };

  // The parts make their own sounds; this only mutes them all.
  const soundButton = document.createElement('button');
  soundButton.type = 'button';
  const label = () =>
    (soundButton.textContent = partAudio.muted()
      ? 'Sound: muted'
      : 'Sound: on (click to mute)');
  label();
  Object.assign(soundButton.style, {
    position: 'absolute',
    right: '12px',
    top: '12px',
    font: '13px monospace',
    padding: '4px 10px',
    cursor: 'pointer',
  });
  soundButton.addEventListener('click', () => {
    partAudio.setMuted(!partAudio.muted());
    label();
  });
  const uses = new Map<Object3D, (direction?: number) => void>();
  for (const fitting of fittings) {
    for (const [object, use] of fitting.parts.uses) uses.set(object, use);
    fitting.parts.onEvent((event, name) => report(name, event));
  }
  canvas.parentElement?.append(soundButton);

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const use = (x: number, y: number) => {
    pointer.set(x, y);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster
      .intersectObjects([...passages.uses.keys(), ...uses.keys()], true)
      .find((hit) => !isHeldPortableHit(hit.object));
    if (!hit) return false;
    if (passages.uses.has(hit.object as Mesh)) {
      passages.uses.get(hit.object as Mesh)?.();
      return true;
    }
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work = uses.get(o);
      if (!work) continue;
      work(knobDirection(o, hit.point, camera));
      return true;
    }
    return false;
  };

  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    controls: { x: -3 * m, z: (boardZ + 2.2) * m, yaw: 0, pitch: -0.12 },
    displays: { x: 2.4 * m, z: (boardZ + 2.2) * m, yaw: 0, pitch: -0.12 },
    studio: { x: studioX * m, z: (boardZ + 1.6) * m, yaw: 0, pitch: -0.1 },
    cabinet: {
      x: (cabinetX - 2.6) * m,
      z: cabinetZ * m,
      yaw: Math.PI / 2,
      pitch: -0.1,
    },
    rear: {
      x: (cabinetX - 2.3) * m,
      z: 4.2 * m,
      yaw: Math.PI / 2,
      pitch: -0.1,
    },
    architecture: { x: -7.5 * m, z: -3.7 * m, yaw: -Math.PI / 2, pitch: 0 },
    empty: { x: 1 * m, z: 8 * m, yaw: 0, pitch: -0.5 },
    capacitor: { x: -5 * m, z: 7 * m, yaw: 0, pitch: -0.9 },
    backplane: { x: 5 * m, z: 4.85 * m, yaw: 0, pitch: -0.3 },
    components: { x: -6.8 * m, z: 6.2 * m, yaw: 0.35, pitch: -0.17 },
    pedestals: {
      x: -5 * m,
      z: -1 * m,
      yaw: 0,
      pitch: -0.3,
    },
  };
  /** A clickable object's name, or its nearest named ancestor's. */
  const partName = (object: Object3D) => {
    for (let o: Object3D | null = object; o; o = o.parent)
      if (o.name) return o.name;
    return '';
  };
  const params = new URLSearchParams(location.search);
  const startView = views[params.get('view') ?? ''];
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    supports: () =>
      ALL_GALLERY_LAYOUT.map(({ x, z }) => ({
        minX: x - 0.47,
        maxX: x + 0.47,
        minZ: z - 0.47,
        maxZ: z + 0.47,
        top: 0.98,
      })),
    start: startView ??
      passages.arrival(params.get('from')) ?? { x: 0, z: 0, yaw: 0 },
    solids: () => [
      ...walls.filter((wall) => wall.bottom === 0),
      ...passages.solids(),
      ...footprints,
    ],
    use,
    useWhileHolding: (_object, x, y) => use(x, y),
  });
  const notes = document.createElement('div');
  notes.textContent = `DEV0 · Controls and Displays: controls and displays on the north wall, machine components on ${MACHINE_GALLERY_LAYOUT.length} plinths, plus ${EMPTY_GALLERY_LAYOUT.length} temporarily empty exhibits · Portals: the training room west, dev1 east`;
  Object.assign(notes.style, {
    position: 'absolute',
    top: '12px',
    left: '12px',
    maxWidth: 'calc(100% - 260px)',
    padding: '10px',
    background: '#20302bdd',
    color: '#e8e2cc',
    font: '13px monospace',
  });
  canvas.parentElement?.append(notes);
  const resize = () => {
    const { width, height: tall } = canvas.getBoundingClientRect();
    if (!width || !tall) return;
    const scale = 1;
    const w = Math.round(width * scale),
      h = Math.round(tall * scale);
    renderer.setSize(w, h, false);
    ps1Uniforms.resolution.value.set(w, h);
    camera.aspect = width / tall;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  // A part that goes off with a flash (a capacitor venting) dazzles.
  const dazzle = createDazzle(
    canvas,
    camera,
    Math.random,
    () => reducedMotion?.matches ?? false,
  );

  // A handle for scripted views and checks.
  (window as unknown as { devControls: unknown }).devControls = {
    /** Stand with the eye at (x, y, z), looking at (tx, ty, tz), in metres. */
    view(x: number, y: number, z: number, tx: number, ty: number, tz: number) {
      const dx = tx - x;
      const dz = tz - z;
      walk.place(
        x * m,
        z * m,
        Math.atan2(dx, -dz),
        Math.atan2(ty - y, Math.hypot(dx, dz)),
        y * m,
      );
    },
    /** Work a part by its name, as a click would; returns whether found. */
    work(name: string, direction = 1) {
      for (const [object, work] of uses)
        if (partName(object) === name) {
          work(direction);
          return true;
        }
      return false;
    },
    /** The names of every part that takes a click. */
    parts: () => [...uses.keys()].map(partName).sort(),
    log: () => [...log.children].map((item) => item.textContent),
  };

  let last = 0;
  const frame = (time: number) => {
    const delta = last ? Math.min(0.1, Math.max(0, (time - last) / 1000)) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    passages.update(delta, walk.walker.x, walk.walker.z);
    for (const fitting of fittings)
      fitting.update(time / 1000, delta, reducedMotion?.matches ?? false);
    dazzle.update(delta);
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    frame(time);
  });
  Object.assign(
    (window as unknown as { devControls: Record<string, unknown> }).devControls,
    {
      /**
       * Run `seconds` of frames at once (where the browser is not
       * drawing, as in a hidden tab) and give the last as a PNG data URL,
       * with whatever dazzles the eye drawn over it.
       */
      shot(seconds = 0, width = 1280, height = 720) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        let time = last || 1000;
        for (let t = 0; t <= seconds; t += 1 / 30) frame((time += 1000 / 30));
        const picture = document.createElement('canvas');
        picture.width = width;
        picture.height = height;
        const context = picture.getContext('2d')!;
        context.drawImage(canvas, 0, 0, width, height);
        dazzle.paint(context, width, height);
        resize();
        return picture.toDataURL('image/png');
      },
    },
  );
  const dispose = () => {
    renderer.setAnimationLoop(null);
    dazzle.dispose();
    observer.disconnect();
    walk.dispose();
    passages.dispose();
    notes.remove();
    log.remove();
    soundButton.remove();
    for (const fitting of fittings) {
      fitting.dispose();
      disposeKit(kit, fitting.group);
    }
    scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    wallMaterial.dispose();
    floorMaterial.dispose();
    freeEnvironment();
    renderer.dispose();
  };
  return Object.assign(dispose, {
    suspend() {
      for (const fitting of fittings) fitting.parts.setAudible(false);
    },
    resume() {
      for (const fitting of fittings) fitting.parts.setAudible(true);
    },
    enter(previous: string | null) {
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) {
        walk.place(view.x, view.z, view.yaw, view.pitch);
        return;
      }
      const pose = passages.arrival(previous);
      if (pose) {
        walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
        walk.walker.crouched = false;
        walk.walker.lowCrouched = false;
      }
    },
  });
}
