import { Group } from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { ledText } from '../../../../game/plant/experimental-source';
import {
  BATTERY_40,
  MOTOR_PF,
  RECTIFIER_PF,
  acAmps,
  batteryEnergy,
  dcAmps,
} from '../../../../game/plant/power-conversion';

/**
 * The battery-backed supply's three cabinets (`game/plant/power-conversion.ts`):
 * a rectifier, a battery bank and an inverter, after the 40 kVA class of
 * online UPS split into its parts, each a floor-standing steel cabinet
 * (600 × 800 × 1900 mm, RAL 7035 grey) by Torvald, with its cable glands
 * on its top and a front panel of red LED readouts and status lamps, as a
 * UPS of around 2000 had before one screen took over. Each cabinet's own
 * frame: on the floor, its front toward +z.
 */

export type CabinetRole = 'rectifier' | 'battery' | 'inverter';

export interface CabinetReadings {
  supplyVolts: number;
  supplyKW: number;
  rectifierOn: boolean;
  rectifierKW: number;
  inverterDcKW: number;
  batteryKW: number;
  charge: number;
  batteryVolts: number;
  runtime: number;
  inverterOn: boolean;
  inverterKW: number;
  outputVolts: number;
}

const W = 0.6;
const D = 0.8;
const H = 1.9;

/** A status lamp: its lens lit in its colour, or dark. */
function lamp(
  t: ReturnType<typeof tools>,
  parent: Group,
  colour: string,
  x: number,
  y: number,
  z: number,
) {
  const lens = t.paint('#2a2a2a', 0.3) as Material & {
    color: { set(c: string): void };
  };
  const mesh = t.cyl(parent, lens, 0.012, 0.012, x, y, z, 'z', 16);
  mesh.userData.live = true;
  let lit: boolean | null = null;
  return (on: boolean) => {
    if (on === lit) return;
    lit = on;
    lens.color.set(on ? colour : '#2c2a26');
  };
}

const MODEL: Record<CabinetRole, string> = {
  rectifier: 'RECTIFIER / CHARGER  TR-45',
  battery: 'BATTERY BANK  TB-432',
  inverter: 'INVERTER  TI-40',
};

/** What each cabinet's readouts show (each its legend and its value), and its three lamps. */
const PANEL: Record<
  CabinetRole,
  {
    readouts: [string, (r: CabinetReadings) => number][];
    lamps: [string, string, (r: CabinetReadings) => boolean][];
  }
> = {
  rectifier: {
    readouts: [
      ['INPUT  V AC', (r) => r.supplyVolts],
      ['INPUT  A AC', (r) => acAmps(r.supplyKW, r.supplyVolts, RECTIFIER_PF)],
      ['OUTPUT  kW DC', (r) => r.rectifierKW],
      ['OUTPUT  A DC', (r) => dcAmps(r.rectifierKW, r.batteryVolts)],
    ],
    lamps: [
      ['INPUT OK', '#3ddc5a', (r) => r.rectifierOn],
      ['CHARGING', '#ffb020', (r) => r.batteryKW > 0.01],
      ['NO INPUT', '#ff3b24', (r) => !r.rectifierOn],
    ],
  },
  battery: {
    readouts: [
      ['ENERGY  kWh', (r) => r.charge * batteryEnergy(BATTERY_40)],
      ['CHARGE  %', (r) => r.charge * 100],
      ['BATTERY  V DC', (r) => r.batteryVolts],
      ['CURRENT  A DC', (r) => dcAmps(r.batteryKW, r.batteryVolts)],
      // With no load it has no runtime to show: dashes.
      ['RUNTIME  MIN', (r) => r.runtime / 60],
    ],
    lamps: [
      ['CHARGING', '#ffb020', (r) => r.batteryKW > 0.01],
      ['DISCHARGING', '#ff7a1a', (r) => r.batteryKW < -0.01],
      ['LOW', '#ff3b24', (r) => r.charge < 0.2],
    ],
  },
  inverter: {
    readouts: [
      ['INPUT  A DC', (r) => dcAmps(r.inverterDcKW, r.batteryVolts)],
      ['OUTPUT  V AC', (r) => r.outputVolts],
      ['OUTPUT  A AC', (r) => acAmps(r.inverterKW, r.outputVolts, MOTOR_PF)],
      ['OUTPUT  kW', (r) => r.inverterKW],
    ],
    lamps: [
      ['OUTPUT ON', '#3ddc5a', (r) => r.inverterOn],
      ['ON BATTERY', '#ffb020', (r) => r.inverterOn && !r.rectifierOn],
      ['STOPPED', '#ff3b24', (r) => !r.inverterOn],
    ],
  },
};

export function createPowerCabinet(kit: PanelKit, role: CabinetRole) {
  const t = tools(kit);
  const group = new Group();
  group.name = `Torvald ${MODEL[role].toLowerCase()}`;
  const grey = t.paint('#c9cbc6', 0.6, 0.2);
  const dark = t.paint('#2e3438', 0.6);
  const plinth = t.paint('#3a3d3f', 0.7);
  t.box(group, plinth, W, 0.1, D, 0, 0.05, 0);
  t.box(group, grey, W, H - 0.1, D, 0, 0.1 + (H - 0.1) / 2, 0);
  // The door's seam and handle, the louvres low down.
  t.box(
    group,
    dark,
    0.006,
    H - 0.2,
    0.004,
    W / 2 - 0.04,
    H / 2 + 0.05,
    D / 2 + 0.002,
  );
  t.box(group, dark, 0.02, 0.14, 0.025, W / 2 - 0.08, 1.05, D / 2 + 0.012);
  for (let k = 0; k < 6; k++)
    t.box(
      group,
      dark,
      W - 0.16,
      0.012,
      0.004,
      0,
      0.22 + k * 0.035,
      D / 2 + 0.002,
    );
  // Its cable glands on top: in on the left, out on the right.
  for (const x of [-0.15, 0.15])
    t.cyl(group, dark, 0.03, 0.04, x, H + 0.02, 0, 'y', 12);
  // The front panel.
  const face = new Group();
  face.position.set(0, 0, D / 2 + 0.003);
  group.add(face);
  t.box(face, dark, W - 0.12, 0.7, 0.006, 0, 1.44, 0);
  const brand = createMicroLabel(kit, 'TORVALD', {
    height: 0.032,
    ink: '#f2f2ec',
    maxWidth: 0.3,
  });
  brand.position.set(0, 1.7, 0.006);
  face.add(brand);
  const model = createMicroLabel(kit, MODEL[role], {
    height: 0.014,
    ink: '#c9cfcf',
    maxWidth: 0.42,
  });
  model.position.set(0, 1.655, 0.006);
  face.add(model);
  const panel = PANEL[role];
  // Up to five readouts, one under another.
  const pitch = 0.075;
  const readouts = panel.readouts.map(([label], k) => {
    const y = 1.6 - k * pitch;
    const r = createSevenSegment(kit, 5, { digitHeight: 0.024 });
    r.group.position.set(0, y, 0.006);
    face.add(r.group);
    const tag = createMicroLabel(kit, label, {
      height: 0.012,
      ink: '#ecf1ed',
      maxWidth: 0.3,
    });
    tag.position.set(0, y - 0.034, 0.006);
    face.add(tag);
    return r;
  });
  const lamps = panel.lamps.map(([label, colour], k) => {
    const x = -0.15 + k * 0.15;
    const set = lamp(t, face, colour, x, 1.2, 0.008);
    const tag = createMicroLabel(kit, label, {
      height: 0.01,
      ink: '#ecf1ed',
      maxWidth: 0.14,
    });
    tag.position.set(x, 1.165, 0.006);
    face.add(tag);
    return set;
  });
  const shown: string[] = [];
  return {
    group,
    update(r: CabinetReadings) {
      panel.readouts.forEach(([, read], k) => {
        const value = read(r);
        const text = Number.isFinite(value)
          ? ledText(Math.max(0, value), 5)
          : '-----';
        if (shown[k] === text) return;
        shown[k] = text;
        readouts[k].show(text);
      });
      panel.lamps.forEach(([, , on], k) => lamps[k](on(r)));
    },
  };
}

/**
 * The pump's local panel, on a post beside it: a RUNNING lamp and its
 * flow, from a flowmeter in its delivery. Its own frame: on the floor,
 * facing +z.
 */
export function createPumpLocalPanel(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Pump local panel';
  const steel = t.paint('#9aa0a2', 0.5, 0.4);
  const box = t.paint('#c9cbc6', 0.6, 0.2);
  t.box(group, steel, 0.05, 1.3, 0.05, 0, 0.65, 0);
  t.box(group, box, 0.24, 0.2, 0.1, 0, 1.38, 0.03);
  const set = lamp(t, group, '#3ddc5a', -0.07, 1.42, 0.083);
  const label = createMicroLabel(kit, 'RUNNING', {
    height: 0.011,
    ink: '#1d2326',
    maxWidth: 0.1,
  });
  label.position.set(-0.07, 1.385, 0.082);
  group.add(label);
  const flow = createSevenSegment(kit, 4, { digitHeight: 0.022 });
  flow.group.position.set(0.04, 1.41, 0.082);
  group.add(flow.group);
  const unit = createMicroLabel(kit, 'FLOW  m³/h', {
    height: 0.01,
    ink: '#1d2326',
    maxWidth: 0.1,
  });
  unit.position.set(0.04, 1.36, 0.082);
  group.add(unit);
  let shown = '';
  return {
    group,
    update(running: boolean, m3h: number) {
      set(running);
      const text = String(Math.round(m3h));
      if (text !== shown) {
        shown = text;
        flow.show(text);
      }
    },
  };
}
