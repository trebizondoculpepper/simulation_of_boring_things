import { createInspector } from '../views/inspect-pick';
import {
  createSwitchFuse,
  useSwitchFuse,
} from '../../components/industrial-control/views/switch-fuse';
import { createDistributionBoard } from '../../components/plant/views/electrical-switchgear';
import { createPartSet } from '../../components/core/parts/parts';
import { createRearFittingsBoard } from './rear-fittings-board';
import { createBusbarLineDemo } from './busbar-line-demo';
import {
  createRenderer,
  useEnvironment,
  layoutSize,
} from '../../components/core/parts/render-style';
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Group,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
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
import { createCarryCueSheet } from '../views/carry-cue-sheet';
import { isHeldPortableHit } from '../../controls/input/object-handling';
import {
  createPs1Material,
  ps1Uniforms,
} from '../../components/core/parts/ps1-material';
import {
  createCabinetBoard,
  createControlsBoard,
  createDisplaysBoard,
  createBoilerControlsBoard,
  createSmallControlsBoard,
  createWetControlsBoard,
  createSwingHandleBoard,
  createChangeoverHandleBoard,
  createCharacterLcdBoard,
  createTriStateBoard,
  createGaugeTestBoard,
  createMimicTestBoard,
  createPeriodBoard,
  createStudioBoard,
  createLightSwitchBoard,
} from './test-boards';
import type { TestFitting } from './test-boards';
import type { LiveExhibit, PlantExhibit } from './plant/exhibit';
import { POOL_SIGN_POST, POOL_SIGN_WALL } from './plant/pool-sign-demo';
import {
  createMachineGallery,
  createEmptyMachinePlinths,
  ALL_GALLERY_LAYOUT,
  EMPTY_GALLERY_LAYOUT,
  PLANT_GALLERY_LAYOUT,
  MACHINE_GALLERY_LAYOUT,
  MACHINE_PLINTH_WIDTH,
} from './machine-gallery';
import { createPlantPlinths } from './plant-gallery';

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
  // The period instruments (a control room of about 1999) on the west
  // wall, facing east: tried here before the plant rooms use them.
  const periodX = -half.x + 0.25;
  place(createPeriodBoard(kit), periodX, 1.55, -3, Math.PI / 2, {
    minX: -half.x * m,
    maxX: (periodX + 0.6) * m,
    minZ: -4.2 * m,
    maxZ: -1.8 * m,
  });
  place(createMimicTestBoard(kit), periodX, 1.55, 0.6, Math.PI / 2, {
    minX: -half.x * m,
    maxX: (periodX + 0.6) * m,
    minZ: -0.2 * m,
    maxZ: 1.4 * m,
  });
  place(createGaugeTestBoard(kit), periodX, 1.55, 2.6, Math.PI / 2, {
    minX: -half.x * m,
    maxX: (periodX + 0.4) * m,
    minZ: 2.0 * m,
    maxZ: 3.2 * m,
  });
  place(createBoilerControlsBoard(kit), periodX, 1.55, 4.4, Math.PI / 2, {
    minX: -half.x * m,
    maxX: (periodX + 0.4) * m,
    minZ: 3.8 * m,
    maxZ: 5.0 * m,
  });
  place(createSmallControlsBoard(kit), periodX, 1.55, 5.75, Math.PI / 2, {
    minX: -half.x * m,
    maxX: (periodX + 0.3) * m,
    minZ: 5.45 * m,
    maxZ: 6.05 * m,
  });
  place(createTriStateBoard(kit), periodX, 1.55, -1.0, Math.PI / 2, {
    minX: -half.x * m,
    maxX: (periodX + 0.3) * m,
    minZ: -1.5 * m,
    maxZ: -0.5 * m,
  });
  place(createSwingHandleBoard(kit), periodX, 1.55, 6.6, Math.PI / 2, {
    minX: -half.x * m,
    maxX: (periodX + 0.3) * m,
    minZ: 6.4 * m,
    maxZ: 6.8 * m,
  });
  // The changeover switch's rotary handle, beside the cubicle's.
  place(createChangeoverHandleBoard(kit), periodX, 1.55, 7.2, Math.PI / 2, {
    minX: -half.x * m,
    maxX: (periodX + 0.3) * m,
    minZ: 7.0 * m,
    maxZ: 7.4 * m,
  });
  // The OT-216 terminal's character LCD and cursor keys (prompt 091), on
  // the south wall, tried here before dev44's terminals use them.
  place(createCharacterLcdBoard(kit), -1.0, 1.55, half.z - 0.15, Math.PI, {
    minX: -1.3 * m,
    maxX: -0.7 * m,
    minZ: (half.z - 0.35) * m,
    maxZ: half.z * m,
  });
  // The plate light switches with their locator LEDs (the owner,
  // 2026-10-27), on the south wall beside the character LCD.
  place(createLightSwitchBoard(kit), -2.2, 1.4, half.z - 0.15, Math.PI, {
    minX: -2.65 * m,
    maxX: -1.75 * m,
    minZ: (half.z - 0.35) * m,
    maxZ: half.z * m,
  });
  // The poolside information sign, on trial here before dev13 and the
  // pool halls: on the south wall, and on its post beside it, each with
  // its development test panel.
  const signFitting = (exhibit: PlantExhibit): TestFitting => {
    const built = exhibit.build(kit) as LiveExhibit;
    const group = new Group();
    group.add(built.object);
    return {
      group,
      parts: built.parts!,
      update(_seconds, delta) {
        built.parts?.update(delta);
        built.update?.(delta);
      },
      dispose: () => built.parts?.dispose(),
    };
  };
  const southFace = half.z - 0.15;
  place(signFitting(POOL_SIGN_WALL), 6.6, 1.75, southFace, Math.PI, {
    minX: 5.7 * m,
    maxX: 7.5 * m,
    minZ: (southFace - 0.2) * m,
    maxZ: half.z * m,
  });
  // The wet controls, for spas and showers, beside the signs.
  place(createWetControlsBoard(kit), 4.2, 1.55, southFace, Math.PI, {
    minX: 3.8 * m,
    maxX: 4.6 * m,
    minZ: (southFace - 0.2) * m,
    maxZ: half.z * m,
  });
  // The switch-fuse, a room's supply, on the south wall: its door opens
  // at OFF, and its fuses can be changed.
  const switchFuse = createSwitchFuse(kit, { legend: 'DEV0 SUPPLY' });
  const switchFuseParts = createPartSet();
  useSwitchFuse(switchFuse, switchFuseParts.uses);
  const switchFuseGroup = new Group();
  switchFuseGroup.add(switchFuse.group);
  place(
    {
      group: switchFuseGroup,
      parts: switchFuseParts,
      update(_seconds, delta) {
        switchFuseParts.update(delta);
        switchFuse.update(delta);
      },
      dispose: () => switchFuseParts.dispose(),
    },
    2.9,
    1.5,
    half.z,
    Math.PI,
    {
      minX: 2.65 * m,
      maxX: 3.15 * m,
      minZ: (half.z - 0.3) * m,
      maxZ: half.z * m,
    },
  );
  // A machine's supply, as the spas' plant rooms have it: busbar, tap-off,
  // switch-fuse, isolator, out through the wall (`busbar-line-demo.ts`).
  place(createBusbarLineDemo(kit), 5.45, 0, half.z, Math.PI, {
    minX: 4.75 * m,
    maxX: 6.15 * m,
    minZ: (half.z - 0.3) * m,
    maxZ: half.z * m,
  });
  // The same glazed, operable distribution board used in the switch room,
  // with a development tag so its cabinet door can be tried here first.
  const distributionBoard = createDistributionBoard(kit, 'DEV-DB1');
  place(
    {
      group: distributionBoard.object,
      parts: distributionBoard.parts,
      update(_seconds, delta) {
        distributionBoard.parts.update(delta);
        distributionBoard.update(delta);
      },
      dispose: () => distributionBoard.dispose(),
    },
    1.65,
    1.5,
    half.z,
    Math.PI,
    {
      minX: 1.35 * m,
      maxX: 1.95 * m,
      minZ: (half.z - 0.25) * m,
      maxZ: half.z * m,
    },
  );
  const postZ = southFace - 1.1;
  place(signFitting(POOL_SIGN_POST), 8.6, 0, postZ, Math.PI, {
    minX: 7.85 * m,
    maxX: 9.35 * m,
    minZ: (postZ - 0.25) * m,
    maxZ: (postZ + 0.25) * m,
  });
  [
    ...createMachineGallery(kit),
    ...createPlantPlinths(kit),
    ...createEmptyMachinePlinths(kit),
  ].forEach((plinth, i) => {
    const { x, z } = ALL_GALLERY_LAYOUT[i];
    const reach = MACHINE_PLINTH_WIDTH / 2 + 0.15;
    place(plinth, x, 0, z, 0, {
      minX: (x - reach) * m,
      maxX: (x + reach) * m,
      minZ: (z - reach) * m,
      maxZ: (z + reach) * m,
    });
  });

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
  /** What a use at a normalised screen point would do, or null. */
  const usableAt = (x: number, y: number): (() => void) | null => {
    pointer.set(x, y);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster
      .intersectObjects([...passages.uses.keys(), ...uses.keys()], true)
      .find((hit) => !isHeldPortableHit(hit.object));
    if (!hit) return null;
    const passage = passages.uses.get(hit.object as Mesh);
    if (passage) return passage;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work = uses.get(o);
      if (!work) continue;
      const shaft = o;
      return () => work(knobDirection(shaft, hit.point, camera));
    }
    return null;
  };
  const use = (x: number, y: number) => {
    const act = usableAt(x, y);
    act?.();
    return Boolean(act);
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
    switchgear: {
      x: 1.65 * m,
      z: 6.3 * m,
      yaw: Math.PI,
      pitch: -0.12,
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
    scene,
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
    // Whether anything is aimed at, for the crosshair's plain ring.
    aimed: () => usableAt(0, 0) !== null,
    useWhileHolding: (_object, x, y) => use(x, y),
    // Its twin: whether that use would find anything, without working it.
    useWhileHoldingAt: (_object, x, y) => usableAt(x, y) !== null,
    // What is aimed at, named in the help line (prompt 061): dev0's trial.
    // Its exhibits carry no plant tags: a control is named by its part's
    // name, the nearest control up the parents (a switch over its board).
    inspect: createInspector({
      root: scene,
      camera,
      metre: m,
      identify: (object) => {
        for (let o: Object3D | null = object; o; o = o.parent)
          if (uses.has(o)) {
            const name = partName(o);
            return name ? { name } : undefined;
          }
        return undefined;
      },
    }),
  });
  const notes = document.createElement('div');
  notes.textContent = `DEV0 · Controls and Displays: controls and displays on the north wall, switch-fuse and distribution board on the south wall, machine components on ${MACHINE_GALLERY_LAYOUT.length} plinths and plant fittings on ${PLANT_GALLERY_LAYOUT.length}, plus ${EMPTY_GALLERY_LAYOUT.length} temporarily empty exhibits · Portals: the training room west, dev1 east`;
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
    const { width, height: tall } = layoutSize(canvas);
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

  const cueSheet = createCarryCueSheet();
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
    /**
     * Where each piece of the part `name` that takes a click is, in
     * metres, and the way it faces (its +z), for a scripted look at it.
     */
    where: (name: string) =>
      [...uses.keys()]
        .filter((object) => partName(object) === name)
        .map((object) => ({
          at: object.getWorldPosition(new Vector3()).divideScalar(m).toArray(),
          facing: object.getWorldDirection(new Vector3()).toArray(),
        })),
    log: () => [...log.children].map((item) => item.textContent),
    /**
     * Show or hide the sheet of carrying cues, both sets side by side at
     * real size (mission 116, the owner's question 1); `?cues=sheet`
     * opens the room with it shown.
     */
    cueSheet(show = true) {
      if (show && !cueSheet.isConnected) canvas.parentElement?.append(cueSheet);
      else if (!show) cueSheet.remove();
    },
  };
  if (params.get('cues') === 'sheet') canvas.parentElement?.append(cueSheet);

  let last = 0;
  const frame = (time: number) => {
    const delta = last ? Math.min(0.1, Math.max(0, (time - last) / 1000)) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    passages.update(delta, walk.walker.x, walk.walker.z, !walk.following);
    for (const fitting of fittings)
      fitting.update(time / 1000, delta, reducedMotion?.matches ?? false);
    dazzle.update(delta);
    partAudio.listen(camera, m, scene);
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
