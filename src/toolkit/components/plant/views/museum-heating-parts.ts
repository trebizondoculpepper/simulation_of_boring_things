import { Group } from 'three';
import { signal } from '@preact/signals-core';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import {
  createPartSet,
  keySwitch,
  pilotLight,
  potentiometer,
  pushButton,
  selector,
} from '../../core/parts/parts';
import { badge } from './air-handling';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import { createPanelMeter } from '../../industrial-control/views/panel-instruments';

/**
 * The working fittings Hall 1 of the museum adds to the plant (107a): the
 * pool's motorised cover and its key-switch station, the pool's capillary
 * thermostat, the energy-cost display and the museum's losses board with
 * its SWIMMERS dial. Each is a real, worked component: its parts are
 * worked through the control scheme, and it shows only what it is given.
 * Displays draw only when what they show changes. In metres.
 */

/**
 * A motorised slatted pool cover (Certikind), on a roller across one end
 * of the pool: `show(fraction)` rolls it out over the water, 0 rolled up,
 * 1 over all of it. In its own frame: the pool's top at `y`, `w` along x,
 * the roller at z = −d/2, rolling out toward +z.
 */
export function createPoolCover(
  kit: PanelKit,
  { w, d, y }: { w: number; d: number; y: number },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Motorised pool cover';
  const white = t.paint('#e9ecea', 0.5);
  const slat = t.paint('#4f8fc4', 0.35);
  // The roller's housing and its drive's end box, Certikind's badge on it.
  t.cyl(group, white, 0.16, w + 0.1, 0, y + 0.18, -d / 2 + 0.1, 'x', 24);
  const drive = new Group();
  drive.position.set(w / 2 + 0.2, y + 0.18, -d / 2 + 0.1);
  group.add(drive);
  t.box(drive, white, 0.28, 0.36, 0.36, 0, 0, 0);
  badge(kit, drive, 'certikind', [0, 0.05, 0.182], 0.04);
  // The slats, a blind of one piece scaled out from the roller.
  const blind = new Group();
  blind.userData.live = true;
  blind.position.set(0, y - 0.04, -d / 2 + 0.1);
  group.add(blind);
  const sheet = t.box(blind, slat, w - 0.12, 0.025, 1, 0, 0, 0.5);
  sheet.userData.live = true;
  let shown = -1;
  return {
    group,
    show(fraction: number) {
      const f = Math.round(Math.max(0, Math.min(1, fraction)) * 100) / 100;
      if (f === shown) return;
      shown = f;
      blind.visible = f > 0.005;
      blind.scale.z = Math.max(0.001, f * (d - 0.2));
    },
  };
}

/**
 * The cover's station on its post: a key switch, OPEN and CLOSE push
 * buttons, and lamps at its limit switches, OPEN and CLOSED (Certikind).
 */
export function createCoverStation(
  kit: PanelKit,
  {
    tag,
    key,
    drive,
    open,
    closed,
  }: {
    tag: string;
    key: { value: boolean; set(on: boolean): void };
    drive: (to: -1 | 1) => void;
    open: () => boolean;
    closed: () => boolean;
  },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `${tag} cover control station`;
  t.box(group, t.paint('#55616a', 0.5), 0.06, 1.2, 0.06, 0, 0.6, -0.05);
  t.box(group, t.paint('#d8dbd6', 0.5), 0.3, 0.36, 0.1, 0, 1.32, 0);
  const face = new Group();
  face.position.set(0, 1.32, 0.05);
  group.add(face);
  const parts = createPartSet();
  const isOpen = signal(open());
  const isClosed = signal(closed());
  const put = <P extends { object: Group }>(part: P, x: number, y: number) => {
    part.object.position.set(x, y, 0.002);
    face.add(part.object);
    return parts.add(part as never) as P;
  };
  put(
    keySwitch(kit, {
      legend: 'KEY',
      name: `${tag} cover key switch`,
      bound: key,
    }) as never,
    0,
    0.1,
  );
  put(
    pushButton(kit, {
      colour: 'green',
      legend: 'OPEN',
      name: `${tag} cover OPEN`,
      action: () => drive(-1),
    }) as never,
    -0.08,
    -0.03,
  );
  put(
    pushButton(kit, {
      colour: 'black',
      legend: 'CLOSE',
      name: `${tag} cover CLOSE`,
      action: () => drive(1),
    }) as never,
    0.08,
    -0.03,
  );
  put(
    pilotLight(kit, {
      colour: 'white',
      legend: 'OPEN',
      drive: isOpen,
      name: `${tag} cover OPEN lamp`,
    }) as never,
    -0.08,
    -0.12,
  );
  put(
    pilotLight(kit, {
      colour: 'white',
      legend: 'CLOSED',
      drive: isClosed,
      name: `${tag} cover CLOSED lamp`,
    }) as never,
    0.08,
    -0.12,
  );
  const plate = createMicroLabel(kit, `${tag}  POOL COVER`, {
    height: 0.016,
    ink: '#16191b',
    plate: '#f4f3ee',
    maxWidth: 0.26,
  });
  plate.position.set(0, 0.165, 0.002);
  face.add(plate);
  badge(kit, group, 'certikind', [0, 1.08, 0.052], 0.025);
  return {
    group,
    parts,
    update(delta: number) {
      if (isOpen.value !== open()) isOpen.value = open();
      if (isClosed.value !== closed()) isClosed.value = closed();
      parts.update(delta);
    },
  };
}

/**
 * The pool's capillary immersion thermostat (TC1), its box on the pipe
 * from the pool: its setting dial, 20 to 35 °C, and its CALL lamp. Made by
 * Penfold's controls. `range` is its dial's ends.
 */
export function createPoolThermostat(
  kit: PanelKit,
  {
    tag,
    range,
    setting,
    calling,
  }: {
    tag: string;
    range: { min: number; max: number };
    setting: { value: number; set(celsius: number): void };
    calling: () => boolean;
  },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `${tag} pool thermostat`;
  t.box(group, t.paint('#2d3b44', 0.5), 0.22, 0.26, 0.09, 0, 0, 0);
  const face = new Group();
  face.position.z = 0.046;
  group.add(face);
  const parts = createPartSet();
  const steps = range.max - range.min;
  const dial = potentiometer(kit, {
    steps,
    legend: `SET °C  ${range.min}–${range.max}`,
    name: `${tag} thermostat setting dial`,
    bound: {
      get value() {
        return setting.value - range.min;
      },
      set: (p: number) => setting.set(range.min + p),
    },
  });
  dial.object.position.set(0, -0.02, 0.002);
  dial.object.scale.setScalar(1.6);
  face.add(dial.object);
  parts.add(dial);
  const call = signal(calling());
  const lamp = parts.add(
    pilotLight(kit, {
      colour: 'yellow',
      legend: 'CALL',
      drive: call,
      name: `${tag} CALL lamp`,
    }),
  );
  lamp.object.position.set(0.07, 0.08, 0.002);
  face.add(lamp.object);
  const plate = createMicroLabel(kit, `${tag} THERMOSTAT`, {
    height: 0.013,
    ink: '#f4f3ee',
  });
  plate.position.set(-0.035, 0.1, 0.002);
  face.add(plate);
  panelMakerMark(kit, face, {
    width: 0.22,
    height: 0.26,
    z: 0.001,
    corner: 'bottom-right',
    size: 0.012,
    inset: 0.012,
  });
  return {
    group,
    parts,
    update(delta: number) {
      if (call.value !== calling()) call.value = calling();
      parts.update(delta);
    },
  };
}

/**
 * The gas-burn display EC1 (Splashonomics): the gas being burnt right now,
 * a big moving-coil meter of the heat going in, kW, and red LED digits of
 * the gas's flow, m³/h, from the gas meter's pulses. `show` draws the
 * digits only when they change.
 */
export function createGasBurnDisplay(
  kit: PanelKit,
  { tag, scale }: { tag: string; scale: number },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `${tag} gas burn display`;
  t.box(group, t.paint('#1f2a30', 0.5), 0.9, 0.62, 0.06, 0, 0, 0.03);
  const face = t.printed(
    0.86,
    0.58,
    (c, w, h) => {
      c.fillStyle = '#f2efe4';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#16232b';
      c.font = `bold ${h * 0.07}px Arial`;
      c.fillText(`${tag}  GAS BEING BURNT NOW`, w * 0.04, h * 0.1, w * 0.92);
      c.font = `${h * 0.05}px Arial`;
      c.fillText('Heat going in, kW', w * 0.04, h * 0.95, w * 0.45);
      c.fillText('GAS FLOW  m³/h', w * 0.55, h * 0.58, w * 0.42);
    },
    512,
  );
  face.mesh.position.z = 0.061;
  group.add(face.mesh);
  const meter = createPanelMeter(kit, 'kW', { width: 0.07, scaleMax: scale });
  meter.group.scale.setScalar(4);
  meter.group.position.set(-0.2, 0.0, 0.065);
  group.add(meter.group);
  const digits = createSevenSegment(kit, 5, { digitHeight: 0.07 });
  digits.group.position.set(0.22, 0.02, 0.065);
  digits.group.traverse((o) => (o.userData.live = true));
  group.add(digits.group);
  badge(kit, group, 'splashonomics', [0.3, 0.2, 0.062], 0.035);
  let shown = '';
  return {
    group,
    show(kW: number, m3h: number, delta: number) {
      meter.set(kW / scale);
      meter.update(delta);
      const text = m3h.toFixed(1).padStart(5);
      if (text === shown) return;
      shown = text;
      digits.show(text);
    },
  };
}

/** One of the losses board's meters: its name, scale, and whether it reads either side of zero. */
export interface LossMeter {
  id: string;
  label: string;
  scale: number;
  signed?: boolean;
}

/**
 * The museum's losses board (Penfold): a row of big moving-coil kW meters,
 * one for each way the pool loses heat and their total, an ideal
 * instrument, labelled so; and the SWIMMERS dial, NONE · A FEW · BUSY ·
 * GALA, which sets how hard the surface is stirred. Facing +z, its back
 * at the origin.
 */
export function createLossesBoard(
  kit: PanelKit,
  {
    meters,
    swimmers,
  }: {
    meters: readonly LossMeter[];
    swimmers: { value: number; set(position: number): void };
  },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Losses board';
  const W = 1.4;
  const H = 0.9;
  t.box(group, t.paint('#e3e1d8', 0.5), W, H, 0.06, 0, 0, 0.03);
  const print = t.printed(
    W - 0.04,
    0.12,
    (c, w, h) => {
      c.fillStyle = '#16232b';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.font = `bold ${h * 0.42}px Arial`;
      c.fillText('WHERE THE HEAT GOES', w * 0.03, h * 0.5, w * 0.94);
      c.font = `${h * 0.26}px Arial`;
      c.fillText(
        'The museum’s model of the pool’s heat balance: no real plant measures these.',
        w * 0.03,
        h * 0.86,
        w * 0.94,
      );
    },
    512,
  );
  print.mesh.position.set(0, H / 2 - 0.08, 0.061);
  group.add(print.mesh);
  const needles = meters.map((m, k) => {
    const meter = createPanelMeter(kit, 'kW', {
      width: 0.07,
      scaleMax: m.scale,
    });
    meter.group.scale.setScalar(3.2);
    const x = -W / 2 + 0.2 + k * 0.3;
    meter.group.position.set(x, 0.07, 0.065);
    group.add(meter.group);
    const label = createMicroLabel(kit, m.label, {
      height: 0.024,
      ink: '#16191b',
      plate: '#f4f3ee',
    });
    label.position.set(x, -0.14, 0.062);
    group.add(label);
    return { ...m, meter };
  });
  const parts = createPartSet();
  const dial = parts.add(
    selector(kit, {
      positions: 4,
      legend: 'NONE · A FEW · BUSY · GALA',
      name: 'SWIMMERS dial',
      bound: swimmers,
    }),
  );
  dial.object.scale.setScalar(1.8);
  dial.object.position.set(0.25, -0.3, 0.062);
  group.add(dial.object);
  const dialLabel = createMicroLabel(kit, 'SWIMMERS', {
    height: 0.03,
    ink: '#16191b',
  });
  dialLabel.position.set(-0.1, -0.3, 0.062);
  group.add(dialLabel);
  panelMakerMark(kit, group, {
    width: W,
    height: H,
    z: 0.062,
    corner: 'bottom-right',
  });
  return {
    group,
    parts,
    show(values: Record<string, number>, delta: number) {
      for (const n of needles) {
        const v = values[n.id] ?? 0;
        n.meter.set(n.signed ? 0.5 + v / (2 * n.scale) : v / n.scale);
        n.meter.update(delta);
      }
      parts.update(delta);
    },
  };
}

/** A control selector's plate for the boiler (ON-OFF · MODULATING), Penfold's, beside its panel. */
export function createControlSelector(
  kit: PanelKit,
  {
    name,
    mode,
  }: { name: string; mode: { value: number; set(p: number): void } },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = name;
  t.box(group, t.paint('#2d3b44', 0.5), 0.22, 0.16, 0.04, 0, 0, 0.02);
  const parts = createPartSet();
  const knob = parts.add(
    selector(kit, {
      positions: 2,
      legend: 'ON-OFF · MODULATING',
      name,
      bound: mode,
    }),
  );
  knob.object.position.set(0, -0.015, 0.042);
  knob.object.scale.setScalar(1.2);
  group.add(knob.object);
  const label = createMicroLabel(kit, 'CONTROL', {
    height: 0.016,
    ink: '#f4f3ee',
  });
  label.position.set(0, 0.06, 0.041);
  group.add(label);
  panelMakerMark(kit, group, {
    width: 0.22,
    height: 0.16,
    z: 0.041,
    size: 0.01,
    inset: 0.01,
  });
  return { group, parts };
}
