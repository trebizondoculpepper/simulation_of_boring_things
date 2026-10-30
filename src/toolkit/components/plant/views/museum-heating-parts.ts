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
  pilotLight,
  potentiometer,
  selector,
} from '../../core/parts/parts';
import { badge } from './air-handling';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import { createPanelMeter } from '../../industrial-control/views/panel-instruments';

/**
 * The working fittings Hall 1 of the museum adds to the plant (107a): the
 * pool's capillary thermostat, the energy-cost display and the museum's losses board with
 * its SWIMMERS dial. Each is a real, worked component: its parts are
 * worked through the control scheme, and it shows only what it is given.
 * Displays draw only when what they show changes. In metres.
 */

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
  // The digits take a reading once a second, as a pulse-counting display
  // does (2026-10-29 performance pass: a modulating burner's flow changed
  // its last digit, and uploaded its 864 × 320 texture, every frame).
  let due = 0;
  return {
    group,
    show(kW: number, m3h: number, delta: number) {
      meter.set(kW / scale);
      meter.update(delta);
      due -= delta;
      if (due > 0 && shown) return;
      due = 1;
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
    // Kept within its meter's width, so each label is plainly its own.
    const label = createMicroLabel(kit, m.label, {
      height: 0.018,
      ink: '#16191b',
      plate: '#f4f3ee',
      maxWidth: 0.24,
    });
    label.position.set(x, -0.1, 0.062);
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
  // Just left of its dial, no bigger than the meters' labels.
  const dialLabel = createMicroLabel(kit, 'SWIMMERS', {
    height: 0.02,
    ink: '#16191b',
  });
  dialLabel.position.set(0.1, -0.3, 0.062);
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
