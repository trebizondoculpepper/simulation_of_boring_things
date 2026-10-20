import { signal } from '@preact/signals-core';
import {
  AdditiveBlending,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import type { SevenSegment } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createEngravedPlate } from '../../core/views/plant-signs';
import { createBrandBadge } from '../../core/views/brand-badge';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import {
  createPartSet,
  pilotLight,
  potentiometer,
  pushButton,
  selector,
} from '../../core/parts/parts';
import type { PartSet } from '../../core/parts/parts';
import {
  TRI_STATES,
  triStateIndicator,
} from '../../core/parts/panel-indicators';
import type { OzoneShown } from '../logic/ozone-room';
import { createDialGauge } from '../../industrial-control/views/dial-gauge';
import { createPanelMeter } from '../../industrial-control/views/panel-instruments';
import {
  createMessageDisplay,
  createStackLight,
} from '../../industrial-control/views/industrial-displays';

/**
 * The ozone plant's machines, each after a real product
 * (`doc/research/ozone-plant.md`) under Trioxa Ozone Systems' name: the
 * corona-discharge generator after ProMinent's Bono Zon BONa 2D (160 g/h,
 * 1600 × 1950 × 500 mm), its twin-tower desiccant air dryer, the booster
 * pump and venturi injector skid, the contact tank, the activated-carbon
 * deozoniser, the off-gas destructor and the room's ozone-in-air monitor
 * with its low sampling head and beacon. In metres, facing +z; floor
 * machines stand on the origin, wall ones hang from it.
 *
 * Each shows a plain state (`OzoneShown`), set by whoever runs the plant,
 * and works through its parts: the generator's START, STOP, RESET, mains
 * switch and output setting, the booster's HAND · OFF · AUTO, and the
 * monitor's TEST and RESET.
 */

/** The plant at rest: everything off, clean air. */
export const OZONE_AT_REST: OzoneShown = {
  powered: false,
  producing: false,
  alarm: false,
  tripped: false,
  message: ['TRIOXA OZ-160', 'MAINS OFF'],
  output: 0,
  setpoint: 1,
  dewPoint: 10,
  tower: 0,
  dryerFault: false,
  coolingFlow: 0,
  coolingTemp: 15,
  vacuum: 0,
  booster: 1,
  residualContact: 0,
  residualAfter: 0,
  carbonUsed: 0,
  pressureIn: 1.6,
  destructorOn: false,
  destructorTemp: 20,
  destructorFault: false,
  roomPpm: 0,
  warning: false,
  roomAlarm: false,
};

export interface OzoneMachineView {
  group: Group;
  parts: PartSet;
  /** Show the state; call each frame. */
  show(s: OzoneShown, delta: number): void;
}

const TRIOXA_GREY = '#d9dcd6';
const TRIOXA_BLUE = '#4b5fc1';
const GRP_GREEN = '#7d8f6a';
const PVC_GREY = '#5f6669';
const STEEL = '#aeb3b5';

/** A readout: seven-segment digits behind a smoked window, labelled. */
function readout(
  kit: PanelKit,
  parent: Group,
  legend: string,
  x: number,
  y: number,
  digits = 4,
  colour?: string,
): SevenSegment {
  const t = tools(kit);
  t.box(
    parent,
    t.paint('#141516', 0.4),
    0.03 * digits + 0.03,
    0.06,
    0.01,
    x,
    y,
    0.005,
  );
  const display = createSevenSegment(kit, digits, {
    digitHeight: 0.024,
    ...(colour ? { colour } : {}),
  });
  display.group.position.set(x, y + 0.003, 0.011);
  display.group.traverse((o) => (o.userData.live = true));
  parent.add(display.group);
  const label = createMicroLabel(kit, legend, { height: 0.01, ink: '#16181a' });
  label.position.set(x, y - 0.045, 0.002);
  parent.add(label);
  return display;
}

/** A pilot lamp driven by a signal, placed on `parent`. */
function lamp(
  kit: PanelKit,
  parts: PartSet,
  parent: Group,
  colour: 'green' | 'amber' | 'red' | 'white',
  legend: string,
  x: number,
  y: number,
) {
  const on = signal(false);
  const part = parts.add(
    pilotLight(kit, { colour, legend, drive: on, name: `${legend} lamp` }),
  );
  part.object.position.set(x, y, 0);
  parent.add(part.object);
  return on;
}

/** Digits for a readout, right-aligned in `n` places. */
const fixed = (v: number, places: number, n = 4) =>
  v.toFixed(places).padStart(n, ' ').slice(-n);

/**
 * The generator: a light grey floor cabinet with Trioxa's blue band, its
 * controls in the upper left, a window on the right onto its six glass
 * dielectric tubes, which glow violet with the corona as it makes ozone,
 * and under them the cooling water's rotameter and thermometer and the
 * venturi's vacuum gauge.
 */
export function createOzoneGenerator(
  kit: PanelKit,
  controls: {
    start: () => void;
    stop: () => void;
    reset: () => void;
    mains: (on: boolean) => void;
    setpoint: (share: number) => void;
  },
): OzoneMachineView {
  const t = tools(kit);
  const W = 1.6,
    H = 1.95,
    D = 0.5;
  const group = new Group();
  group.name = 'Ozone generator';
  const grey = t.paint(TRIOXA_GREY, 0.55);
  t.box(group, t.paint('#3a3d40', 0.6), W, 0.08, D - 0.04, 0, 0.04, 0);
  t.box(group, grey, W, H - 0.08, D, 0, 0.08 + (H - 0.08) / 2, 0);
  t.box(
    group,
    t.paint(TRIOXA_BLUE, 0.5),
    W + 0.004,
    0.09,
    D + 0.004,
    0,
    H - 0.1,
    0,
  );
  const badge = createBrandBadge(kit, 'trioxa', {
    height: 0.05,
    ink: '#ffffff',
  });
  badge.position.set(-W / 2 + 0.22, H - 0.1, D / 2 + 0.004);
  group.add(badge);
  const model = createMicroLabel(kit, 'OZ-160  OZONE GENERATOR  160 g/h', {
    height: 0.022,
    ink: '#ffffff',
  });
  model.position.set(0.3, H - 0.1, D / 2 + 0.004);
  group.add(model);
  // Door seams.
  const seam = t.paint('#9a9e9b', 0.6);
  t.box(
    group,
    seam,
    0.006,
    H - 0.3,
    0.004,
    -0.02,
    0.08 + (H - 0.3) / 2,
    D / 2 + 0.001,
  );
  const parts = createPartSet();

  // The control panel, upper left.
  const face = new Group();
  face.position.set(-0.41, 1.3, D / 2);
  group.add(face);
  t.box(face, t.paint('#c7cbc5', 0.5), 0.7, 0.66, 0.006, 0, 0, 0.003);
  const plate = createEngravedPlate(kit, ['OZONE GENERATOR OZ-160'], {
    colour: 'white',
    width: 0.4,
    height: 0.04,
  });
  plate.position.set(0, 0.29, 0.007);
  face.add(plate);
  const message = createMessageDisplay(kit, { columns: 20, caption: 'TRIOXA' });
  message.group.position.set(-0.08, 0.2, 0.006);
  message.group.traverse((o) => (o.userData.live = true));
  face.add(message.group);
  const meter = createPanelMeter(kit, 'g/h', {
    width: 0.09,
    scaleMax: 200,
    redFrom: 0.9,
  });
  meter.group.position.set(0.24, 0.19, 0.006);
  face.add(meter.group);
  const meterLabel = createMicroLabel(kit, 'OZONE OUTPUT', {
    height: 0.01,
    ink: '#16181a',
  });
  meterLabel.position.set(0.24, 0.12, 0.007);
  face.add(meterLabel);
  const shown = readout(kit, face, 'OUTPUT  g/h', -0.2, 0.07);
  const power = lamp(kit, parts, face, 'white', 'POWER', -0.04, 0.07);
  const ozoneOn = lamp(kit, parts, face, 'green', 'OZONE ON', 0.08, 0.07);
  const alarm = lamp(kit, parts, face, 'red', 'ALARM', 0.2, 0.07);
  const set = parts.add(
    potentiometer(kit, {
      legend: 'OUTPUT SET',
      steps: 21,
      initial: 20,
      name: 'Ozone output setting',
    }),
  );
  set.object.position.set(-0.24, -0.1, 0.006);
  face.add(set.object);
  const buttons: [string, 'green' | 'red' | 'black', () => void][] = [
    ['START', 'green', controls.start],
    ['STOP', 'red', controls.stop],
    ['RESET', 'black', controls.reset],
  ];
  buttons.forEach(([legend, colour, action], i) => {
    const b = parts.add(
      pushButton(kit, {
        colour,
        legend,
        action,
        name: `Ozone generator ${legend}`,
      }),
    );
    b.object.position.set(-0.08 + i * 0.1, -0.1, 0.006);
    face.add(b.object);
  });
  const mains = parts.add(
    selector(kit, {
      positions: 2,
      initial: 0,
      legend: 'MAINS  OFF · ON',
      name: 'Ozone generator mains',
    }),
  );
  mains.object.position.set(0, -0.24, 0.006);
  face.add(mains.object);

  // The window onto the dielectric tubes, upper right.
  const win = new Group();
  win.position.set(0.4, 1.3, D / 2);
  group.add(win);
  t.box(win, t.paint('#1c1f22', 0.4), 0.62, 0.62, 0.01, 0, 0, -0.004);
  const glass = t.paint('#d8e6ea', 0.1, 0.1);
  const steel = t.paint(STEEL, 0.3, 0.8);
  const glow = new MeshBasicMaterial({
    color: '#9d7cff',
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  kit.materials.push(glow);
  for (let i = 0; i < 6; i++) {
    const x = -0.25 + i * 0.1;
    t.cyl(win, steel, 0.032, 0.54, x, 0, -0.05);
    t.cyl(win, glass, 0.026, 0.5, x, 0, -0.012);
    const corona = new Mesh(new CylinderGeometry(0.03, 0.03, 0.48, 12), glow);
    corona.position.set(x, 0, -0.012);
    corona.userData.live = true;
    win.add(corona);
  }
  t.label(win, 'DIELECTRIC TUBES  ·  12 kV', 0, -0.29, 0.004, 0.012, '#d6d9d6');

  // Cooling water and vacuum, lower right.
  const lower = new Group();
  lower.position.set(0.4, 0.6, D / 2);
  group.add(lower);
  // The rotameter: a glass tube, its float rising with the flow.
  t.box(lower, t.paint('#f1f0ea', 0.5), 0.07, 0.36, 0.01, -0.2, 0, 0.005);
  t.cyl(lower, glass, 0.012, 0.3, -0.2, 0, 0.02);
  const float = new Mesh(
    new SphereGeometry(0.009, 10, 8),
    t.paint('#c62c22', 0.4),
  );
  float.userData.live = true;
  float.position.set(-0.2, -0.14, 0.02);
  lower.add(float);
  t.label(lower, 'COOLING  0–400 l/h', -0.2, -0.21, 0.006, 0.01);
  const thermo = createDialGauge(kit, {
    kind: 'thermometer',
    dia: 0.08,
    min: 0,
    max: 60,
    red: { from: 35, to: 60 },
    legend: 'COOLING °C',
  });
  thermo.group.position.set(-0.04, 0.05, 0.02);
  lower.add(thermo.group);
  const vacuum = createDialGauge(kit, {
    kind: 'compound',
    dia: 0.1,
    min: -1,
    max: 0.6,
    legend: 'VACUUM',
  });
  vacuum.group.position.set(0.14, 0.05, 0.02);
  lower.add(vacuum.group);
  // Louvres along the foot.
  for (let i = 0; i < 6; i++)
    t.box(group, seam, 0.6, 0.008, 0.004, -0.41, 0.2 + i * 0.03, D / 2 + 0.002);

  let mainsShown = 0;
  let setShown = -1;
  return {
    group,
    parts,
    show(s, delta) {
      if (mains.position.value !== mainsShown) {
        mainsShown = mains.position.value;
        controls.mains(mainsShown === 1);
      }
      if (set.share.value !== setShown) {
        setShown = set.share.value;
        controls.setpoint(setShown);
      }
      message.show(s.message, s.powered);
      meter.set(s.output / 200);
      meter.update(delta);
      shown.show(s.powered ? fixed(s.output, 0) : '    ');
      power.value = s.powered;
      ozoneOn.value = s.producing;
      alarm.value = s.alarm;
      glow.opacity = s.producing
        ? 0.25 + 0.5 * Math.min(1, s.output / 160) * (0.9 + 0.1 * Math.random())
        : 0;
      float.position.y = -0.14 + 0.28 * Math.min(1, s.coolingFlow / 400);
      thermo.set(s.coolingTemp);
      thermo.update(delta);
      vacuum.set(s.vacuum);
      vacuum.update(delta);
    },
  };
}

/**
 * The air dryer: a compressor in a base frame under two desiccant towers,
 * one drying while the other regenerates, swapping on a timer; a lamp
 * over each, the dried air's dew point in °C, its line pressure, and a
 * DRYER FAULT lamp.
 */
export function createAirDryer(kit: PanelKit): OzoneMachineView {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Ozone air dryer';
  const grey = t.paint(TRIOXA_GREY, 0.55);
  const blue = t.paint(TRIOXA_BLUE, 0.5);
  t.box(group, grey, 0.9, 0.55, 0.6, 0, 0.275, 0);
  t.box(group, blue, 0.904, 0.05, 0.604, 0, 0.5, 0);
  for (let i = 0; i < 5; i++)
    t.box(
      group,
      t.paint('#8a8e8b', 0.6),
      0.5,
      0.008,
      0.004,
      -0.1,
      0.12 + i * 0.06,
      0.301,
    );
  const badge = createBrandBadge(kit, 'trioxa', { height: 0.035 });
  badge.position.set(0.28, 0.4, 0.302);
  group.add(badge);
  const towerPaint = t.paint('#e6e7e1', 0.4, 0.2);
  for (const x of [-0.2, 0.2]) {
    t.cyl(group, towerPaint, 0.09, 1.0, x, 1.05, 0);
    t.cyl(group, t.paint(STEEL, 0.3, 0.8), 0.095, 0.04, x, 0.57, 0);
    t.cyl(group, t.paint(STEEL, 0.3, 0.8), 0.095, 0.04, x, 1.55, 0);
  }
  t.cyl(group, t.paint(STEEL, 0.3, 0.8), 0.014, 0.4, 0, 1.6, 0, 'x');
  t.cyl(group, t.paint(STEEL, 0.3, 0.8), 0.014, 0.4, 0, 0.62, 0, 'x');
  const parts = createPartSet();
  const face = new Group();
  face.position.set(0, 1.05, 0.12);
  group.add(face);
  // Recess the face plate behind the readout and its legend to avoid
  // coplanar fragments around the dark display window.
  t.box(face, t.paint('#c7cbc5', 0.5), 0.22, 0.42, 0.01, 0, 0, -0.01);
  const dew = readout(kit, face, 'DEW POINT  °C', 0, 0.12, 3);
  const a = lamp(kit, parts, face, 'green', 'A DRYING', -0.05, 0.01);
  const b = lamp(kit, parts, face, 'green', 'B DRYING', 0.05, 0.01);
  const fault = lamp(kit, parts, face, 'red', 'DRYER FAULT', 0, -0.1);
  const gauge = createDialGauge(kit, {
    dia: 0.07,
    min: 0,
    max: 10,
    legend: 'AIR bar',
  });
  gauge.group.position.set(0, -0.3, 0.12);
  group.add(gauge.group);
  gauge.group.position.set(0.32, 0.75, 0.31);
  return {
    group,
    parts,
    show(s, delta) {
      dew.show(s.powered ? fixed(s.dewPoint, 0, 3) : '   ');
      a.value = s.powered && s.tower === 0;
      b.value = s.powered && s.tower === 1;
      fault.value = s.dryerFault;
      gauge.set(s.powered ? 6.5 : 0);
      gauge.update(delta);
    },
  };
}

/**
 * The booster pump and venturi injector skid: a close-coupled pump on a
 * frame drawing from the filtered main, through a venturi whose throat
 * takes the ozone gas down from the generator, its check valve, and back
 * into the main; a local isolator with the pump's tri-state indicator and
 * its HAND · OFF · AUTO selector.
 */
export function createInjectorSkid(
  kit: PanelKit,
  { hoa }: { hoa: (position: number) => void },
): OzoneMachineView {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Booster pump and venturi injector';
  const frame = t.paint('#3e4a55', 0.6, 0.3);
  t.box(group, frame, 1.7, 0.08, 0.6, 0, 0.04, 0);
  const pvc = t.paint(PVC_GREY, 0.5);
  // The pump: motor along x, volute at its end.
  const motor = t.paint('#2f5fb8', 0.45, 0.2);
  t.cyl(group, motor, 0.11, 0.36, -0.45, 0.3, 0, 'x');
  t.box(group, motor, 0.2, 0.12, 0.2, -0.45, 0.14, 0);
  t.cyl(group, t.paint('#30343a', 0.5, 0.4), 0.14, 0.12, -0.2, 0.3, 0, 'x');
  // Pipework: from the main up into the pump, along through the venturi.
  t.cyl(group, pvc, 0.045, 0.5, -0.2, 0.6, 0);
  t.cyl(group, pvc, 0.045, 1.2, 0.35, 0.85, 0, 'x');
  t.cyl(group, pvc, 0.045, 0.85, 0.92, 0.43, 0);
  // The venturi: a cone in and a cone out about a narrow throat.
  const cone = (r1: number, r2: number, x: number) => {
    const mesh = new Mesh(
      new CylinderGeometry(r1, r2, 0.18, 16),
      t.paint('#e6e2d8', 0.4),
    );
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, 0.85, 0);
    group.add(mesh);
  };
  cone(0.05, 0.02, 0.24);
  cone(0.02, 0.05, 0.42);
  // The gas line from the generator into its throat.
  const gasLine = t.paint('#c9cdcf', 0.3, 0.8);
  t.cyl(group, gasLine, 0.01, 0.9, 0.33, 1.3, 0);
  t.label(group, 'O₃ GAS', 0.33, 1.2, 0.02, 0.014, '#ffffff', '#c62c22');
  // The check valve after it.
  t.box(group, t.paint('#30343a', 0.5), 0.1, 0.12, 0.12, 0.7, 0.85, 0);
  const parts = createPartSet();
  // The local isolator box.
  const box = new Group();
  box.position.set(-0.7, 0.9, 0.12);
  group.add(box);
  t.box(group, frame, 0.04, 0.9, 0.04, -0.7, 0.5, 0);
  t.box(box, t.paint(TRIOXA_GREY, 0.5), 0.2, 0.32, 0.1, 0, 0, 0);
  const face = new Group();
  face.position.z = 0.05;
  box.add(face);
  const running = signal<number | null>(1);
  const indicator = triStateIndicator(kit, {
    lamps: TRI_STATES.motor,
    state: running,
    title: 'OZ-P01 BOOSTER',
  });
  indicator.group.position.set(0, 0.07, 0);
  face.add(indicator.group);
  for (const l of indicator.lamps) parts.add(l);
  const selectorPart = parts.add(
    selector(kit, {
      positions: 3,
      initial: 2,
      legend: 'HAND · OFF · AUTO',
      name: 'Booster pump HAND OFF AUTO',
    }),
  );
  selectorPart.object.position.set(0, -0.07, 0);
  face.add(selectorPart.object);
  let shown = 2;
  hoa(shown);
  return {
    group,
    parts,
    show(s) {
      if (selectorPart.position.value !== shown) {
        shown = selectorPart.position.value;
        hoa(shown);
      }
      running.value = s.booster;
    },
  };
}

/**
 * A residual ozone analyser on a post: a small grey case reading mg/l in
 * green digits, with a HIGH lamp, sampling the vessel it stands beside.
 */
function residualAnalyser(
  kit: PanelKit,
  parts: PartSet,
  parent: Group,
  legend: string,
  x: number,
  z: number,
) {
  const t = tools(kit);
  t.box(parent, t.paint('#3e4a55', 0.6), 0.04, 1.3, 0.04, x, 0.65, z);
  const face = new Group();
  face.position.set(x, 1.45, z + 0.06);
  parent.add(face);
  t.box(face, t.paint(TRIOXA_GREY, 0.5), 0.24, 0.22, 0.1, 0, 0, -0.05);
  const value = readout(kit, face, legend, 0, 0.03, 4, '#3dff7a');
  const high = lamp(kit, parts, face, 'red', 'HIGH', 0, -0.07);
  return { value, high };
}

/**
 * The contact tank: a GRP vessel holding two minutes of the circulation
 * (160 m³/h × 2 min, about 5.3 m³), on a plinth, a manway on its dome,
 * the main in near the floor and out near the top, its vent up to the
 * off-gas destructor, and the residual analyser beside it.
 */
export function createContactTank(kit: PanelKit): OzoneMachineView {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Ozone contact tank';
  t.box(group, t.paint('#9c9a94', 0.8), 1.9, 0.12, 1.9, 0, 0.06, -0.1);
  const grp = t.paint(GRP_GREEN, 0.6);
  t.cyl(group, grp, 0.9, 2.2, 0, 1.22, -0.1, 'y', 32);
  const dome = new Mesh(
    new SphereGeometry(0.9, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    grp,
  );
  dome.scale.y = 0.3;
  dome.position.set(0, 2.32, -0.1);
  group.add(dome);
  t.cyl(group, t.paint('#6e7d5c', 0.6), 0.25, 0.12, 0, 2.6, -0.1);
  const pvc = t.paint(PVC_GREY, 0.5);
  t.cyl(group, pvc, 0.085, 0.5, -0.9, 0.4, 0.3, 'x');
  t.cyl(group, pvc, 0.085, 0.5, 0.9, 2.0, 0.3, 'x');
  t.cyl(group, t.paint('#c9cdcf', 0.3, 0.8), 0.02, 0.4, 0, 2.85, -0.1);
  const plate = createEngravedPlate(kit, ['OZONE CONTACT TANK  5.5 m³'], {
    colour: 'white',
    width: 0.6,
    height: 0.06,
  });
  plate.position.set(0, 1.6, 0.81);
  group.add(plate);
  const warn = createEngravedPlate(kit, ['DANGER  OZONE  DO NOT ENTER'], {
    colour: 'yellow',
    width: 0.6,
    height: 0.06,
  });
  warn.position.set(0, 1.45, 0.81);
  group.add(warn);
  const parts = createPartSet();
  const analyser = residualAnalyser(kit, parts, group, 'O₃ mg/l', 0.85, 0.7);
  return {
    group,
    parts,
    show(s) {
      analyser.value.show(fixed(s.residualContact, 2));
      analyser.high.value = s.residualContact > 1.5;
    },
  };
}

/**
 * The deozoniser: a steel pressure vessel of activated carbon, which
 * breaks the ozone left in the water back down to oxygen before it goes
 * on; gauges on its inlet and outlet (the difference rising as its bed
 * loads), and the residual analyser after it, whose HIGH lamp means the
 * carbon is spent and ozone is going on toward the pool (DIN 19643:
 * 0.05 mg/l at most).
 */
export function createDeozoniser(kit: PanelKit): OzoneMachineView {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Activated carbon deozoniser';
  const body = t.paint('#2f5f7a', 0.45, 0.3);
  t.cyl(group, body, 0.75, 1.5, 0, 1.15, -0.1, 'y', 32);
  for (const y of [0.4, 1.9]) {
    const end = new Mesh(
      new SphereGeometry(0.75, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      body,
    );
    end.scale.y = y > 1 ? 0.35 : -0.35;
    end.position.set(0, y, -0.1);
    group.add(end);
  }
  const leg = t.paint('#2a2d30', 0.6, 0.3);
  for (const [x, z] of [
    [-0.5, 0.3],
    [0.5, 0.3],
    [-0.5, -0.5],
    [0.5, -0.5],
  ] as const)
    t.box(group, leg, 0.06, 0.4, 0.06, x, 0.2, z);
  const pvc = t.paint(PVC_GREY, 0.5);
  t.cyl(group, pvc, 0.085, 0.9, -0.2, 2.25, 0.5);
  t.cyl(group, pvc, 0.085, 0.4, -0.2, 2.65, 0.3, 'z');
  t.cyl(group, pvc, 0.085, 1.0, 0.2, 0.5, 0.5);
  const plate = createEngravedPlate(kit, ['ACTIVATED CARBON DEOZONISER'], {
    colour: 'white',
    width: 0.6,
    height: 0.06,
  });
  plate.position.set(0, 1.3, 0.66);
  group.add(plate);
  const parts = createPartSet();
  const inlet = createDialGauge(kit, {
    dia: 0.1,
    min: 0,
    max: 4,
    legend: 'INLET',
  });
  inlet.group.position.set(-0.2, 1.5, 0.6);
  group.add(inlet.group);
  const outlet = createDialGauge(kit, {
    dia: 0.1,
    min: 0,
    max: 4,
    legend: 'OUTLET',
  });
  outlet.group.position.set(0.2, 1.0, 0.6);
  group.add(outlet.group);
  const analyser = residualAnalyser(kit, parts, group, 'O₃ mg/l', 0.85, 0.7);
  return {
    group,
    parts,
    show(s, delta) {
      inlet.set(s.pressureIn);
      outlet.set(s.pressureIn - 0.15 - 0.25 * s.carbonUsed);
      inlet.update(delta);
      outlet.update(delta);
      analyser.value.show(fixed(s.residualAfter, 2));
      analyser.high.value = s.residualAfter > 0.05;
    },
  };
}

/**
 * The off-gas destructor, on the wall: a small heated catalytic box on
 * the contact tank's vent, which turns the ozone that comes out of the
 * water back to oxygen before it is let out of doors; its temperature,
 * HEATER ON and FAULT.
 */
export function createOffGasDestructor(kit: PanelKit): OzoneMachineView {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Off-gas destructor';
  t.box(group, t.paint(TRIOXA_GREY, 0.5), 0.55, 0.42, 0.3, 0, 0, 0.15);
  t.box(group, t.paint(TRIOXA_BLUE, 0.5), 0.554, 0.04, 0.304, 0, 0.17, 0.15);
  const steel = t.paint(STEEL, 0.3, 0.8);
  t.cyl(group, steel, 0.03, 0.25, -0.2, 0.33, 0.15);
  t.cyl(group, steel, 0.03, 0.25, 0.2, 0.33, 0.15);
  const badge = createBrandBadge(kit, 'trioxa', { height: 0.025 });
  badge.position.set(-0.15, 0.12, 0.302);
  group.add(badge);
  const parts = createPartSet();
  const face = new Group();
  face.position.z = 0.3;
  group.add(face);
  const temp = readout(kit, face, 'CATALYST  °C', -0.1, -0.05, 3);
  const heater = lamp(kit, parts, face, 'amber', 'HEATER ON', 0.1, 0.0);
  const fault = lamp(kit, parts, face, 'red', 'FAULT', 0.1, -0.12);
  return {
    group,
    parts,
    show(s) {
      temp.show(fixed(s.destructorTemp, 0, 3));
      heater.value = s.destructorOn;
      fault.value = s.destructorFault;
    },
  };
}

/**
 * The room's ozone-in-air monitor: its case at eye height reading ppm,
 * WARNING and ALARM lamps, TEST and RESET; its sampling head low on the
 * wall (ozone is heavier than air: PWTAG puts it 0.35 m above the floor)
 * on a tube from the case; and an amber and red beacon above, seen from
 * the door. From the top of the case to the head, 1.5 m; built about its
 * middle.
 */
export function createOzoneMonitor(
  kit: PanelKit,
  { test, reset }: { test: () => void; reset: () => void },
): OzoneMachineView {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Ozone in air monitor';
  const top = 0.45;
  t.box(group, t.paint('#efe9d8', 0.5), 0.3, 0.28, 0.12, 0, top, 0.06);
  const parts = createPartSet();
  const face = new Group();
  face.position.set(0, top, 0.12);
  group.add(face);
  const plate = createEngravedPlate(kit, ['OZONE IN AIR'], {
    colour: 'white',
    width: 0.2,
    height: 0.03,
  });
  plate.position.set(0, 0.11, 0.002);
  face.add(plate);
  const ppm = readout(kit, face, 'O₃  ppm', -0.05, 0.04, 4);
  const warning = lamp(kit, parts, face, 'amber', 'WARNING', 0.1, 0.05);
  const alarm = lamp(kit, parts, face, 'red', 'ALARM', 0.1, -0.05);
  const testButton = parts.add(
    pushButton(kit, {
      colour: 'black',
      legend: 'TEST',
      action: test,
      name: 'Ozone monitor TEST',
    }),
  );
  testButton.object.position.set(-0.08, -0.08, 0);
  face.add(testButton.object);
  const resetButton = parts.add(
    pushButton(kit, {
      colour: 'black',
      legend: 'RESET',
      action: reset,
      name: 'Ozone monitor RESET',
    }),
  );
  resetButton.object.position.set(0.0, -0.08, 0);
  face.add(resetButton.object);
  // The sampling tube down the wall to its head.
  const tube = t.paint('#2a2d30', 0.5);
  t.cyl(group, tube, 0.006, 1.05, 0.1, -0.2, 0.03);
  t.box(group, t.paint('#efe9d8', 0.5), 0.08, 0.1, 0.06, 0.1, -0.7, 0.03);
  t.label(group, 'SAMPLE HEAD', 0.1, -0.62, 0.062, 0.01);
  // The beacon.
  const beacon = createStackLight(kit, ['#e3261b', '#f0a01a']);
  beacon.group.position.set(-0.1, top + 0.14, 0.06);
  group.add(beacon.group);
  const brand = createBrandBadge(kit, 'trioxa', { height: 0.018 });
  brand.position.set(-0.08, top - 0.125, 0.121);
  group.add(brand);
  let flash = 0;
  return {
    group,
    parts,
    show(s, delta) {
      flash = (flash + delta) % 1;
      ppm.show(fixed(s.roomPpm, 2));
      warning.value = s.warning;
      alarm.value = s.roomAlarm;
      beacon.set([s.roomAlarm && flash < 0.5, s.warning]);
    },
  };
}

/**
 * A commissioning engineer's fault simulator, for the development room:
 * a Penfold Controls wall box of key switches, each putting one fault on
 * the plant (the circulation stopped, the cooling water shut, the dryer's
 * heater failed, the cabinet door open, a leaking joint, the destructor
 * failed), with a lamp lit over each fault while it is on.
 */
export function createFaultSimulator(
  kit: PanelKit,
  faults: readonly { legend: string; set: (on: boolean) => void }[],
): OzoneMachineView {
  const t = tools(kit);
  const W = 0.16 * faults.length + 0.1;
  const H = 0.36;
  const group = new Group();
  group.name = 'Ozone fault simulator';
  t.box(group, t.paint('#c5c7c4', 0.55), W, H, 0.12, 0, 0, 0.06);
  const face = new Group();
  face.position.z = 0.12;
  group.add(face);
  const plate = createEngravedPlate(
    kit,
    ['FAULT SIMULATOR  ·  COMMISSIONING ONLY'],
    {
      colour: 'yellow',
      width: W - 0.1,
      height: 0.04,
    },
  );
  plate.position.set(0, H / 2 - 0.04, 0.002);
  face.add(plate);
  panelMakerMark(kit, face, {
    width: W,
    height: H,
    z: 0,
    corner: 'bottom-right',
  });
  const parts = createPartSet();
  const switches = faults.map(({ legend }, i) => {
    const x = -W / 2 + 0.13 + i * 0.16;
    const on = lamp(kit, parts, face, 'amber', legend, x, 0.04);
    const key = parts.add(
      selector(kit, {
        positions: 2,
        key: true,
        initial: 0,
        name: `Fault: ${legend}`,
      }),
    );
    key.object.position.set(x, -0.09, 0);
    face.add(key.object);
    return { on, key, shown: 0 };
  });
  return {
    group,
    parts,
    show() {
      switches.forEach((s, i) => {
        if (s.key.position.value !== s.shown) {
          s.shown = s.key.position.value;
          faults[i].set(s.shown === 1);
        }
        s.on.value = s.shown === 1;
      });
    },
  };
}
