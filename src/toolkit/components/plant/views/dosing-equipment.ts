import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { brandLivery } from '../../core/views/brand-livery';
import { FINISH, PIPE_SIZES, plantTools } from './plant-tools';
import type { Point } from './plant-tools';
import { createNotice, createTag } from './chemicals-signs';
import { CHEMICAL_COLOUR } from './chemicals-storage';

/**
 * A pool's dosing plant, in metres, each piece at the size of the
 * product it is after (`doc/research/plant-products-chemicals-dosing.md`)
 * under a maker of the game's own. The controller samples the pool water
 * before the dosing points, measures free chlorine, pH, redox and
 * temperature, and drives the dosing pumps: acid to hold pH, injected
 * first, then hypochlorite to hold free chlorine, well downstream.
 * Floor pieces stand on the floor at their origin, front +z; wall pieces
 * hang with their back in the wall's face at their origin, front +z.
 */

type Tools = ReturnType<typeof plantTools>;

function put(parent: Object3D, mesh: Object3D, at: Point, yaw = 0) {
  mesh.position.set(...at);
  mesh.rotation.y = yaw;
  parent.add(mesh);
  return mesh;
}

/** A small printed LCD showing `lines`, `w` × `h`, glowing. */
function lcd(
  t: Tools,
  w: number,
  h: number,
  lines: readonly string[],
  back = '#1c3a2a',
  ink = '#9ff0b8',
) {
  return liveLcd(t, w, h, lines, back, ink).mesh;
}

/** An LCD whose lines can be changed (`show`), redrawn only when they do. */
function liveLcd(
  t: Tools,
  w: number,
  h: number,
  lines: readonly string[],
  back = '#1c3a2a',
  ink = '#9ff0b8',
) {
  const screen = t.printed(w, h, () => {}, 256, true);
  let shown = '';
  const show = (now: readonly string[]) => {
    const key = now.join('\n');
    if (key === shown) return;
    shown = key;
    const c = screen.context;
    const cw = c.canvas.width;
    const ch = c.canvas.height;
    c.fillStyle = back;
    c.fillRect(0, 0, cw, ch);
    c.fillStyle = ink;
    c.textBaseline = 'middle';
    const step = ch / now.length;
    now.forEach((line, i) => {
      c.font = `bold ${step * 0.62}px ${SANS}`;
      c.fillText(line, cw * 0.06, step * (i + 0.5), cw * 0.9);
    });
    screen.texture.needsUpdate = true;
  };
  show(lines);
  return { mesh: screen.mesh, show };
}

/** What a dosing pump shows: whether it is dosing, and at what rate, l/h. */
export interface DosingPumpState {
  running: boolean;
  rate: number;
}

/** A clear plastic material, for sample cells and calibration pots. */
function clear(kit: PanelKit, tint = '#d8eef2', opacity = 0.35) {
  const material = new MeshStandardMaterial({
    color: tint,
    transparent: true,
    opacity,
    roughness: 0.08,
  });
  kit.materials.push(material);
  return material;
}

/**
 * A solenoid diaphragm dosing pump lying on its foot, its dosing head at
 * its left end (−x) with suction valve below and discharge above. After
 * the ProMinent gamma/ X (housing about 110 mm wide, about 200 mm to the
 * discharge valve; head Ø70–90 mm).
 */
export function createSolenoidPump(kit: PanelKit, label: string) {
  const t = plantTools(kit);
  const group = new Group() as Group & {
    /** Its LCD and run lamp as it doses, or stands. */
    show(s: DosingPumpState): void;
  };
  const maker = brandLivery(kit, 'grundflow');
  const body = maker.paint.casing;
  const lightGrey = maker.paint.main;
  t.box(group, maker.paint.shade, 0.2, 0.02, 0.13, 0.02, 0.01, 0);
  t.box(group, body, 0.2, 0.15, 0.11, 0.03, 0.095, 0);
  t.box(group, lightGrey, 0.2, 0.02, 0.112, 0.03, 0.18, 0);
  // The control panel on the front: LCD, keys, stroke-length knob, and
  // its run lamp, which flashes with each stroke.
  const screen = liveLcd(t, 0.06, 0.03, [label, 'STOP']);
  put(group, screen.mesh, [0.06, 0.12, 0.0555]);
  const runLit = new MeshStandardMaterial({
    color: '#2bd65a',
    emissive: '#2bd65a',
    emissiveIntensity: 0,
  });
  kit.materials.push(runLit);
  const runLamp = new Mesh(new BoxGeometry(0.008, 0.008, 0.003), runLit);
  runLamp.position.set(0.0, 0.105, 0.0565);
  runLamp.userData.live = true;
  group.add(runLamp);
  for (const x of [0.0, 0.02, 0.04])
    t.box(group, lightGrey, 0.014, 0.012, 0.004, x + 0.04, 0.085, 0.057);
  t.cyl(group, maker.paint.accent, 0.018, 0.012, 0.11, 0.135, 0.058, 'z', 20);
  // The dosing head, PVDF white, and its valves.
  const pvdf = t.paint('#ecebe4', 0.4);
  t.cyl(group, pvdf, 0.04, 0.05, -0.095, 0.1, 0, 'x', 24);
  t.cyl(group, pvdf, 0.012, 0.035, -0.095, 0.045, 0, 'y', 12);
  t.cyl(group, pvdf, 0.012, 0.035, -0.095, 0.155, 0, 'y', 12);
  t.cyl(
    group,
    t.paint('#c42b23', 0.4),
    0.007,
    0.02,
    -0.095,
    0.1,
    0.045,
    'z',
    10,
  );
  put(group, maker.badge(0.012), [0.05, 0.16, 0.0558]);
  group.userData.live = true;
  group.show = ({ running, rate }) => {
    screen.show([label, running ? `${rate.toFixed(2)} l/h` : 'STOP']);
    // A stroke a second or so, the lamp lit for each.
    const now = typeof performance === 'undefined' ? 0 : performance.now();
    runLit.emissiveIntensity = running && now % 900 < 180 ? 1.6 : 0;
  };
  return group;
}

/**
 * A stepper-motor diaphragm dosing pump on its click-stop plate, its
 * control cube on the front with a click wheel, its head on the left.
 * After the Grundfos SMART Digital DDA 7.5-16 (drawing: 280 mm high,
 * 251 and 196 mm across; G 5/8" connections).
 */
export function createDigitalPump(kit: PanelKit, label: string) {
  const t = plantTools(kit);
  const group = new Group() as Group & {
    /** Its display as it doses, or stands. */
    show(s: DosingPumpState): void;
  };
  const maker = brandLivery(kit, 'grundflow');
  const grey = maker.paint.casing;
  t.box(group, maker.paint.shade, 0.196, 0.012, 0.17, 0, 0.006, 0);
  t.box(group, grey, 0.15, 0.24, 0.17, 0.02, 0.132, -0.01);
  // The control cube with its display and click wheel.
  t.box(group, maker.paint.main, 0.11, 0.11, 0.05, 0.03, 0.17, 0.095);
  const screen = liveLcd(t, 0.07, 0.04, [label, 'STOP'], '#10283a', '#9fd8ff');
  put(group, screen.mesh, [0.03, 0.19, 0.121]);
  t.cyl(group, maker.paint.accent, 0.018, 0.012, 0.03, 0.14, 0.123, 'z', 20);
  // The dosing head and valves.
  const pp = t.paint('#c9cbc6', 0.45);
  t.cyl(group, pp, 0.045, 0.05, -0.075, 0.13, 0, 'x', 24);
  t.cyl(group, pp, 0.012, 0.04, -0.075, 0.07, 0, 'y', 12);
  t.cyl(group, pp, 0.012, 0.04, -0.075, 0.19, 0, 'y', 12);
  put(group, maker.badge(0.012), [0.03, 0.235, 0.121]);
  group.userData.live = true;
  group.show = ({ running, rate }) =>
    screen.show([label, running ? `${rate.toFixed(2)} l/h` : 'STOP']);
  return group;
}

/** A soft dosing tube (PE, 12 mm) through `points`, in `colour`. */
function tube(
  t: Tools,
  parent: Object3D,
  points: readonly Point[],
  colour = '#ece9dc',
) {
  const material = t.paint(colour, 0.5);
  for (let i = 0; i + 1 < points.length; i++)
    t.rod(parent, material, points[i], points[i + 1], 0.006, 8);
}

/**
 * The hypochlorite dosing set on its backboard: duty and standby pumps
 * on a bunded shelf, a calibration column on the suction, the suction
 * from the bulk tank below and the discharge through a multifunction
 * valve out to the injection point. Wall exhibit, 1.2 × 1.0 m board.
 */
export function createHypochloriteBoard(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group() as Group & {
    /** Its duty pump dosing, or both standing; the standby stands. */
    show(s: DosingPumpState): void;
  };
  const pumps: ReturnType<typeof createSolenoidPump>[] = [];
  const board = t.paint('#ecece6', 0.7);
  t.box(group, board, 1.2, 1.0, 0.02, 0, 0, 0.01);
  // The bunded shelf.
  const tray = t.paint('#2a2d2f', 0.6);
  t.box(group, tray, 1.0, 0.02, 0.24, 0, -0.25, 0.14);
  t.box(group, tray, 1.0, 0.05, 0.01, 0, -0.225, 0.26);
  for (const [x, name] of [
    [-0.25, 'DP-101A DUTY'],
    [0.25, 'DP-101B STANDBY'],
  ] as const) {
    const pump = createSolenoidPump(kit, name.slice(0, 7));
    pumps.push(pump);
    put(group, pump, [x, -0.24, 0.13]);
    put(group, createTag(t, name, 0.18), [x, -0.36, 0.021]);
    // Suction down and out of the board's foot; discharge up to the header.
    tube(t, group, [
      [x - 0.095, -0.205, 0.13],
      [x - 0.095, -0.205, 0.06],
      [x - 0.095, -0.48, 0.06],
    ]);
    tube(t, group, [
      [x - 0.095, -0.07, 0.13],
      [x - 0.095, 0.2, 0.13],
      [x - 0.095, 0.2, 0.06],
    ]);
    t.cyl(
      group,
      t.paint('#ecebe4', 0.4),
      0.018,
      0.08,
      x - 0.095,
      0.08,
      0.13,
      'y',
      16,
    );
  }
  // The discharge header, to the injection point.
  tube(t, group, [
    [-0.345, 0.2, 0.06],
    [0.5, 0.2, 0.06],
    [0.5, 0.5, 0.06],
  ]);
  // The calibration column on the suction, with its valve.
  t.cyl(group, clear(kit), 0.03, 0.4, -0.5, 0.0, 0.08, 'y', 24);
  t.cyl(
    group,
    t.paint(CHEMICAL_COLOUR.hypochlorite, 0.5),
    0.028,
    0.15,
    -0.5,
    -0.12,
    0.08,
    'y',
    24,
  );
  put(group, createTag(t, 'CALIBRATION\n1000 ml', 0.12), [-0.5, 0.27, 0.021]);
  put(
    group,
    createTag(t, 'SODIUM HYPOCHLORITE · DOSING', 0.5, {
      plate: CHEMICAL_COLOUR.hypochlorite,
    }),
    [0, 0.42, 0.021],
  );
  put(group, createTag(t, 'FROM BULK TANK ↓', 0.2), [0.0, -0.45, 0.021]);
  put(group, createTag(t, 'TO INJECTION ↑', 0.18), [0.38, 0.32, 0.021]);
  group.userData.live = true;
  group.show = (state) => {
    pumps[0].show(state);
    pumps[1].show({ running: false, rate: 0 });
  };
  return group;
}

/**
 * The acid (pH correction) dosing pump on its own small board and tray,
 * kept apart from the hypochlorite. Wall exhibit, 0.7 × 0.8 m board.
 */
export function createAcidBoard(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group() as Group & {
    /** Its pump dosing, or standing. */
    show(s: DosingPumpState): void;
  };
  t.box(group, t.paint('#ecece6', 0.7), 0.7, 0.8, 0.02, 0, 0, 0.01);
  const tray = t.paint('#2a2d2f', 0.6);
  t.box(group, tray, 0.5, 0.02, 0.28, 0, -0.2, 0.16);
  t.box(group, tray, 0.5, 0.05, 0.01, 0, -0.175, 0.3);
  const pump = createDigitalPump(kit, 'DP-102');
  put(group, pump, [0.03, -0.19, 0.14]);
  tube(
    t,
    group,
    [
      [-0.045, -0.12, 0.14],
      [-0.045, -0.12, 0.06],
      [-0.045, -0.38, 0.06],
    ],
    '#d9c9c9',
  );
  tube(
    t,
    group,
    [
      [-0.045, 0.0, 0.14],
      [-0.045, 0.25, 0.14],
      [-0.045, 0.25, 0.06],
      [0.25, 0.25, 0.06],
      [0.25, 0.4, 0.06],
    ],
    '#d9c9c9',
  );
  put(
    group,
    createTag(t, 'ACID · pH CORRECTION', 0.4, {
      plate: CHEMICAL_COLOUR.acid,
      ink: '#ffffff',
    }),
    [0, 0.33, 0.021],
  );
  put(group, createTag(t, 'DP-102', 0.12), [0.03, -0.3, 0.021]);
  group.userData.live = true;
  group.show = (state) => pump.show(state);
  return group;
}

/**
 * The water quality controller over its sample panel. The controller
 * (430 × 290 × 150 mm, 7" touch screen) shows free and combined
 * chlorine, pH, redox and temperature; below it the sample water passes
 * a strainer and flow monitor and then clear cells holding the pH, redox
 * and free-chlorine sensors and a temperature probe, and drains to a
 * tundish. After the ProMinent DULCOMARIN 3 and its DGMa bypass
 * armature. Wall exhibit, 1.0 × 1.4 m board.
 */
/** What the water quality controller shows. */
export interface WaterReading {
  freeChlorine: number;
  combinedChlorine: number;
  ph: number;
  redox: number;
  temperature: number;
}

export function createControllerPanel(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group() as Group & {
    /** Its screen, reading the water in its sample cells. */
    show(s: WaterReading): void;
  };
  t.box(group, t.paint('#c9ccc8', 0.7), 1.0, 1.4, 0.02, 0, 0, 0.01);
  // The controller.
  const meter = brandLivery(kit, 'kessler-moody');
  // The body ends at the lid's underside; overlapping them put two
  // differently coloured top faces at exactly the same height.
  const housing = t.box(
    group,
    meter.paint.casing,
    0.43,
    0.26,
    0.15,
    0,
    0.435,
    0.095,
  );
  housing.name = 'Water controller housing';
  const lid = t.box(group, meter.paint.main, 0.43, 0.03, 0.152, 0, 0.58, 0.095);
  lid.name = 'Water controller lid';
  // Its screen: redrawn as the readings change, at their displayed places.
  const screen = t.printed(0.155, 0.09, () => {}, 256, true);
  put(group, screen.mesh, [-0.07, 0.46, 0.171]);
  let shown = '';
  const draw = (rows: [string, string, string][]) => {
    const key = rows.map((r) => r[1]).join('|');
    if (key === shown) return;
    shown = key;
    const c = screen.context;
    const cw = c.canvas.width;
    const ch = c.canvas.height;
    c.fillStyle = '#0f2230';
    c.fillRect(0, 0, cw, ch);
    rows.forEach(([name, value, unit], i) => {
      const y = ch * (0.13 + i * 0.18);
      c.fillStyle = '#7fb8d8';
      c.font = `${ch * 0.11}px ${SANS}`;
      c.textBaseline = 'middle';
      c.fillText(name, cw * 0.05, y);
      c.fillStyle = '#ffffff';
      c.font = `bold ${ch * 0.13}px ${SANS}`;
      c.fillText(value, cw * 0.5, y);
      c.fillStyle = '#7fb8d8';
      c.font = `${ch * 0.09}px ${SANS}`;
      c.fillText(unit, cw * 0.8, y);
    });
    screen.texture.needsUpdate = true;
  };
  group.userData.live = true;
  group.show = (w) =>
    draw([
      ['Free Cl', w.freeChlorine.toFixed(2), 'mg/l'],
      ['Comb. Cl', w.combinedChlorine.toFixed(2), 'mg/l'],
      ['pH', w.ph.toFixed(2), ''],
      ['Redox', w.redox.toFixed(0), 'mV'],
      ['Temp', w.temperature.toFixed(1), '°C'],
    ]);
  // Until it is shown the water, a typical pool's.
  group.show({
    freeChlorine: 1.32,
    combinedChlorine: 0.18,
    ph: 7.32,
    redox: 762,
    temperature: 29.6,
  });
  put(group, meter.badge(0.02), [0.12, 0.535, 0.171]);
  put(
    group,
    createTag(t, 'AIC-101 POOL\nWATER QUALITY', 0.14),
    [0.12, 0.42, 0.171],
  );
  // Sample in, strainer, flow monitor.
  const pvc = t.paint('#6a6f73', 0.5);
  const cell = clear(kit);
  tube(
    t,
    group,
    [
      [-0.45, -0.68, 0.08],
      [-0.45, -0.3, 0.08],
      [-0.38, -0.3, 0.08],
    ],
    '#8a8f92',
  );
  t.cyl(group, pvc, 0.02, 0.06, -0.45, -0.6, 0.08, 'y', 16);
  t.box(group, t.paint('#2a6fb0', 0.4), 0.05, 0.01, 0.01, -0.45, -0.6, 0.105);
  t.cyl(group, cell, 0.03, 0.1, -0.33, -0.3, 0.08, 'y', 20);
  t.cyl(group, cell, 0.012, 0.18, -0.24, -0.25, 0.08, 'y', 16);
  t.cyl(
    group,
    t.paint('#c42b23', 0.4),
    0.011,
    0.012,
    -0.24,
    -0.22,
    0.08,
    'y',
    16,
  );
  // The sensor cells in series, each with its sensor from the top.
  const sensors: [number, string, string, number][] = [
    [-0.1, 'pH', '#2a6fb0', 0.006],
    [0.06, 'REDOX', '#c42b23', 0.006],
    [0.22, 'FREE Cl', '#1d1d1d', 0.0125],
    [0.38, 'TEMP', '#8d9396', 0.003],
  ];
  for (const [x, name, cap, r] of sensors) {
    t.cyl(group, cell, 0.03, 0.14, x, -0.2, 0.08, 'y', 20);
    t.cyl(group, pvc, 0.032, 0.02, x, -0.12, 0.08, 'y', 20);
    t.cyl(group, t.paint('#d9e2e0', 0.2), r, 0.18, x, -0.13, 0.08, 'y', 16);
    t.cyl(
      group,
      t.paint(cap, 0.4),
      Math.max(r, 0.009) + 0.003,
      0.04,
      x,
      -0.02,
      0.08,
      'y',
      16,
    );
    // Its cable up to the controller.
    t.rod(
      group,
      t.paint('#1d1d1d', 0.6),
      [x, 0.0, 0.08],
      [x * 0.5, 0.3, 0.08],
      0.003,
      6,
    );
    put(group, createTag(t, name, 0.09), [x, -0.33, 0.021]);
  }
  tube(
    t,
    group,
    [
      [-0.33, -0.2, 0.08],
      [0.38, -0.2, 0.08],
      [0.45, -0.2, 0.08],
      [0.45, -0.6, 0.08],
    ],
    '#8a8f92',
  );
  // The tundish the sample drains into.
  const funnel = new Mesh(
    new CylinderGeometry(0.06, 0.02, 0.07, 20),
    t.paint('#d9dad6', 0.5),
  );
  funnel.position.set(0.45, -0.66, 0.08);
  group.add(funnel);
  put(
    group,
    createTag(t, 'SAMPLE FROM\nCIRCULATION', 0.14),
    [-0.42, -0.45, 0.021],
  );
  put(group, createTag(t, 'TO DRAIN', 0.1), [0.45, -0.52, 0.021]);
  put(
    group,
    brandLivery(kit, 'trager-feinstein').nameplate(
      ['Sample cells', 'pH · redox · free Cl · temp'],
      0.18,
      0.09,
    ),
    [0.15, -0.45, 0.021],
  );
  return group;
}

/**
 * The injection points on the circulation's return main: a sample
 * tapping first, then acid, then hypochlorite well downstream, each
 * injection valve (PVDF, spring-loaded, R½, Ø8 mm nozzle) on a saddle
 * clamp behind an isolating ball valve. After ProMinent's PVT injection
 * valves on a DN150 PVC-U main.
 */
export function createInjectionRun(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const y = 0.8;
  const r = PIPE_SIZES[150].od / 2;
  t.pipe(group, 150, [
    [-1.3, y, 0],
    [1.3, y, 0],
  ]);
  for (const x of [-1.15, 1.15]) t.flanges(group, 150, [x, y, 0], 'x');
  const galv = t.paint(FINISH.galvanised, 0.45, 0.6);
  for (const x of [-0.9, 0.9]) {
    t.rod(group, galv, [x, 0, 0], [x, y - r, 0], 0.02, 10);
    t.box(group, galv, 0.04, 0.012, 0.22, x, y - r - 0.006, 0);
  }
  const points: [number, string, string, string][] = [
    [-0.8, 'SAMPLE TAPPING\nTO AIC-101', '#8a8f92', '#5e6468'],
    [-0.15, 'ACID INJECTION\nFROM DP-102', '#d9c9c9', CHEMICAL_COLOUR.acid],
    [
      0.75,
      'HYPOCHLORITE INJECTION\nFROM DP-101',
      '#ece9dc',
      CHEMICAL_COLOUR.hypochlorite,
    ],
  ];
  for (const [x, name, line, mark] of points) {
    // Saddle clamp, ball valve, injection valve, tube up and back.
    t.cyl(group, t.paint('#5e6468', 0.5), r + 0.008, 0.07, x, y, 0, 'x', 28);
    t.cyl(
      group,
      t.paint('#ecebe4', 0.4),
      0.017,
      0.05,
      x,
      y + r + 0.025,
      0,
      'y',
      16,
    );
    t.box(
      group,
      t.paint(mark, 0.5),
      0.05,
      0.012,
      0.012,
      x + 0.025,
      y + r + 0.035,
      0,
    );
    t.cyl(
      group,
      t.paint('#ecebe4', 0.4),
      0.012,
      0.06,
      x,
      y + r + 0.08,
      0,
      'y',
      16,
    );
    tube(
      t,
      group,
      [
        [x, y + r + 0.11, 0],
        [x, y + 0.45, 0],
        [x, y + 0.45, -0.3],
      ],
      line,
    );
    put(group, createTag(t, name, 0.32), [x, y - r - 0.1, 0.09]);
  }
  // Flow arrows on the main.
  put(group, createTag(t, 'FROM HEAT EXCHANGER  →  TO POOL', 0.6), [
    0,
    y + r + 0.32,
    0.01,
  ]);
  put(
    group,
    createNotice(t, 0.5, 0.2, [
      'ACID FIRST',
      'Hypochlorite well downstream',
      'Never at the same point',
    ]),
    [0.15, 0.35, 0.12],
  );
  put(
    group,
    brandLivery(kit, 'grundflow').nameplate(
      ['Injection valves', 'PVDF, R½, Ø8 nozzle'],
      0.16,
      0.09,
    ),
    [1.0, y + 0.25, 0.01],
  );
  return group;
}

/**
 * The CO₂ alternative to acid for lowering pH: a bank of two 34 kg
 * cylinders chained in a rack, a manifold with regulator and gauges, and
 * a control panel whose flowmeter and solenoid feed gas to a diffuser in
 * the return. After a BOC pool CO₂ supply (34 kg cylinders 230 × 1460 mm
 * with valve and guard).
 */
export function createCo2Station(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const body = t.paint('#1e1e1e', 0.5);
  const shoulder = t.paint('#8a8d8f', 0.5);
  const back = -0.15;
  const galv = t.paint(FINISH.galvanised, 0.45, 0.6);
  // The rack and chains.
  for (const x of [-0.45, 0.15])
    t.rod(group, galv, [x, 0, back - 0.13], [x, 1.2, back - 0.13], 0.015, 8);
  for (const y of [0.6, 1.05])
    t.rod(
      group,
      galv,
      [-0.45, y, back - 0.13],
      [0.15, y, back - 0.13],
      0.012,
      8,
    );
  for (const x of [-0.3, 0]) {
    t.cyl(group, body, 0.115, 1.2, x, 0.6, back, 'y', 28);
    const dome = new Mesh(
      new CylinderGeometry(0.05, 0.115, 0.15, 28),
      shoulder,
    );
    dome.position.set(x, 1.275, back);
    group.add(dome);
    t.cyl(
      group,
      t.paint(FINISH.brass, 0.35, 0.7),
      0.025,
      0.08,
      x,
      1.39,
      back,
      'y',
      16,
    );
    for (const y of [0.6, 1.05])
      t.cyl(
        group,
        t.paint('#5c5f61', 0.5, 0.5),
        0.118,
        0.01,
        x,
        y,
        back,
        'y',
        28,
      );
    put(group, createTag(t, 'CARBON DIOXIDE\n34 kg', 0.14), [
      x,
      0.9,
      back + 0.117,
    ]);
    // Its pigtail to the manifold.
    t.rod(
      group,
      t.paint(FINISH.brass, 0.35, 0.7),
      [x, 1.42, back],
      [x, 1.48, back + 0.1],
      0.006,
      8,
    );
  }
  t.rod(
    group,
    t.paint(FINISH.brass, 0.35, 0.7),
    [-0.35, 1.48, back + 0.1],
    [0.4, 1.48, back + 0.1],
    0.01,
    10,
  );
  t.pressureGauge(group, [0.25, 1.48, back + 0.13], {
    dia: 0.063,
    max: 250,
    unit: 'bar',
  });
  // The control panel on its post: flowmeter, solenoid, controller link.
  t.rod(group, galv, [0.45, 0, 0], [0.45, 1.1, 0], 0.02, 10);
  const co2 = brandLivery(kit, 'chlorella');
  t.box(group, co2.paint.casing, 0.3, 0.4, 0.12, 0.45, 1.0, 0.07);
  t.cyl(group, clear(kit), 0.012, 0.18, 0.4, 1.02, 0.135, 'y', 12);
  t.cyl(group, t.paint('#c42b23', 0.4), 0.01, 0.01, 0.4, 0.98, 0.135, 'y', 12);
  t.box(group, t.paint('#3a3d3f', 0.5), 0.05, 0.06, 0.05, 0.52, 0.92, 0.155);
  put(group, createTag(t, 'CO₂ pH CONTROL', 0.2), [0.45, 1.16, 0.131]);
  t.rod(
    group,
    t.paint('#1d1d1d', 0.6),
    [0.4, 1.48, back + 0.1],
    [0.45, 1.2, 0.07],
    0.006,
    8,
  );
  t.rod(
    group,
    t.paint('#1d1d1d', 0.6),
    [0.45, 0.8, 0.07],
    [0.45, 0.8, 0.3],
    0.006,
    8,
  );
  put(
    group,
    createNotice(t, 0.3, 0.18, [
      'COMPRESSED GAS',
      'Asphyxiant in a',
      'closed room',
    ]),
    [-0.15, 0.25, back + 0.12],
  );
  put(
    group,
    co2.nameplate(['CO₂ pH control', 'Flowmeter · solenoid'], 0.14, 0.08),
    [0.45, 0.86, 0.131],
  );
  return group;
}

/**
 * The test shelf: a photometer (163 × 70 × 45 mm), DPD and phenol red
 * reagent tablets, a rack of test tubes, and the open pool log book,
 * under the targets the tests are checked against. After the Palintest
 * Lumiso Pooltest photometers. Wall exhibit, 0.7 m shelf.
 */
export function createTestShelf(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const y = -0.15;
  t.box(group, t.paint('#a07a4a', 0.7), 0.7, 0.02, 0.25, 0, y, 0.125);
  for (const x of [-0.3, 0.3])
    t.box(
      group,
      t.paint('#5c5f61', 0.5, 0.4),
      0.02,
      0.15,
      0.2,
      x,
      y - 0.085,
      0.1,
    );
  const top = y + 0.01;
  // The photometer and its tube chamber.
  const lab = brandLivery(kit, 'wonshou-labs');
  t.box(
    group,
    lab.paint.casing,
    0.07,
    0.045,
    0.163,
    -0.22,
    top + 0.0225,
    0.13,
  ).rotation.y = 0.3;
  put(group, lcd(t, 0.04, 0.025, ['1.32', 'mg/l Cl'], '#cfd8c8', '#1d1d1d'), [
    -0.22,
    top + 0.046,
    0.15,
  ]).rotation.x = -Math.PI / 2;
  put(group, lab.badge(0.015), [-0.22, top + 0.06, 0.24]);
  // Reagent tubs.
  for (const [i, name, colour] of [
    [0, 'DPD 1', '#2f7a3a'],
    [1, 'DPD 3', '#6a3a8a'],
    [2, 'PHENOL RED', '#c42b23'],
  ] as const) {
    const x = -0.08 + i * 0.07;
    t.cyl(
      group,
      t.paint('#f1f1ec', 0.5),
      0.022,
      0.06,
      x,
      top + 0.03,
      0.08,
      'y',
      16,
    );
    t.cyl(
      group,
      t.paint(colour, 0.5),
      0.023,
      0.012,
      x,
      top + 0.066,
      0.08,
      'y',
      16,
    );
    put(group, createTag(t, name, 0.05), [x, top + 0.03, 0.103]);
  }
  // A rack of test tubes.
  t.box(
    group,
    t.paint('#d9dad6', 0.5),
    0.1,
    0.04,
    0.04,
    -0.05,
    top + 0.02,
    0.19,
  );
  for (const x of [-0.08, -0.05, -0.02])
    t.cyl(
      group,
      clear(kit, '#ffffff', 0.4),
      0.008,
      0.09,
      x,
      top + 0.05,
      0.19,
      'y',
      10,
    );
  // The open log book.
  const page = t.printed(
    0.15,
    0.2,
    (c, cw, ch) => {
      c.fillStyle = '#f6f4ea';
      c.fillRect(0, 0, cw, ch);
      c.strokeStyle = '#9fb5c8';
      for (let i = 1; i < 12; i++) {
        c.beginPath();
        c.moveTo(0, (ch * i) / 12);
        c.lineTo(cw, (ch * i) / 12);
        c.stroke();
      }
      c.fillStyle = '#28324a';
      c.font = `${ch * 0.05}px ${SANS}`;
      for (let i = 1; i < 10; i++)
        c.fillText(
          `0${7 + (i % 3)}:00  1.${2 + (i % 4)}  7.${3 - (i % 2)}`,
          cw * 0.06,
          (ch * (i + 0.6)) / 12,
        );
    },
    256,
  ).mesh;
  for (const [x, a] of [
    [0.16, 0.08],
    [0.31, -0.08],
  ] as const) {
    const leaf = page.clone();
    leaf.rotation.set(-Math.PI / 2, 0, a);
    leaf.position.set(x, top + 0.008, 0.13);
    group.add(leaf);
  }
  t.box(
    group,
    t.paint('#7a2a2a', 0.6),
    0.31,
    0.006,
    0.21,
    0.235,
    top + 0.003,
    0.13,
  );
  // The targets, pinned above.
  put(
    group,
    createNotice(t, 0.42, 0.3, [
      'POOL WATER TARGETS',
      'Free chlorine 1.0–1.5 mg/l',
      'Combined ≤ ⅓ of free, < 1',
      'pH 7.2–7.4',
      'Test every 2–3 hours',
    ]),
    [0, 0.15, 0.005],
  );
  return group;
}
