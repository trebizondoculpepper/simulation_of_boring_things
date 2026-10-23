import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import {
  createPartSet,
  pilotLight,
  pushButton,
  selector,
} from '../../core/parts/parts';
import type { OperatorColour } from '../../industrial-control/views/industrial-controls';

/**
 * The pool heating mimic board, by Penfold Controls: a wall board (2.6 ×
 * 1.5 m) drawing the whole process: the boiler on its gas, the primary
 * flow in red through the circulator to the three-way valve, the
 * exchanger and the bypass, the return in dark red back to the boiler,
 * and the pool water in blue through the exchanger. Each thermometer's
 * and flowmeter's reading stands where it is on the drawing, with the
 * valve's position, the heat passed and the gas burnt; lamps for the
 * burner, lockout and circulator; and the valve's controls: AUTO or
 * MANUAL, the set point down and up, and OPEN and CLOSE by hand. Its
 * maker's mark top right. Its own frame: its face toward +z, its middle
 * at its origin.
 */

export interface HeatingMimicIO {
  readings(): {
    tt: readonly number[];
    primaryFlow: number;
    poolFlow: number;
    valve: number;
    duty: number;
    gas: number;
    setpoint: number;
    burner: boolean;
    lockout: boolean;
    pump: boolean;
    auto: boolean;
  };
  setAuto(on: boolean): void;
  setpoint(by: number): void;
  drive(to: number): void;
}

export function createHeatingMimic(kit: PanelKit, io: HeatingMimicIO) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Penfold pool heating mimic';
  const W = 2.6;
  const H = 1.5;
  t.box(group, t.paint('#e3e4de', 0.75), W, H, 0.04, 0, 0, 0);
  t.box(group, t.paint('#2e3438', 0.6), W + 0.04, H + 0.04, 0.03, 0, 0, -0.01);
  const face = new Group();
  face.position.z = 0.022;
  group.add(face);
  panelMakerMark(kit, face, { width: W, height: H, z: 0 });
  const label = (
    text: string,
    x: number,
    y: number,
    height = 0.022,
    width = 0.5,
  ) => {
    const l = createMicroLabel(kit, text, {
      height,
      ink: '#1d2326',
      maxWidth: width,
    });
    // In front of the drawing's filled boxes.
    l.position.set(x, y, 0.007);
    face.add(l);
  };
  label(
    'POOL HEATING  ·  BOILER B-1  ·  HEAT EXCHANGER HX-1',
    0,
    0.66,
    0.04,
    2.0,
  );
  const RED = t.paint('#c8302c', 0.6);
  const DARK = t.paint('#7a1f1c', 0.6);
  const BLUE = t.paint('#2f6fb3', 0.6);
  const YELLOW = t.paint('#c49a3c', 0.6);
  const ink = t.paint('#1d2326', 0.6);
  const line = (
    m: ReturnType<typeof t.paint>,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ) => {
    const w = Math.abs(x1 - x0) + 0.018;
    const h = Math.abs(y1 - y0) + 0.018;
    t.box(face, m, w, h, 0.004, (x0 + x1) / 2, (y0 + y1) / 2, 0.002);
  };
  // The boiler, its gas in, its flue up.
  t.box(face, ink, 0.34, 0.5, 0.004, -0.95, 0.05, 0.001);
  t.box(face, t.paint('#d9d6cf', 0.8), 0.32, 0.48, 0.005, -0.95, 0.05, 0.002);
  label('BOILER B-1', -0.95, 0.24, 0.024, 0.3);
  line(YELLOW, -1.25, -0.1, -1.12, -0.1);
  label('GAS', -1.2, -0.06, 0.016, 0.1);
  // The primary flow: from the boiler, through the circulator, to the valve.
  line(RED, -0.78, 0.22, 0.25, 0.22);
  line(RED, 0.25, 0.22, 0.25, 0.08);
  t.cyl(face, ink, 0.045, 0.006, -0.45, 0.22, 0.004, 'z', 24);
  label('P-1', -0.45, 0.3, 0.018, 0.1);
  // The three-way valve, its way down to the exchanger, its bypass across.
  t.box(face, ink, 0.07, 0.07, 0.006, 0.25, 0.05, 0.004);
  label('TV-1', 0.36, 0.05, 0.018, 0.1);
  line(RED, 0.25, 0.02, 0.25, -0.08);
  line(DARK, 0.25, 0.05, 0.05, 0.05);
  // The exchanger.
  t.box(face, ink, 0.4, 0.16, 0.004, 0.3, -0.16, 0.001);
  t.box(face, t.paint('#d9d6cf', 0.8), 0.38, 0.14, 0.005, 0.3, -0.16, 0.002);
  label('HX-1', 0.3, -0.16, 0.022, 0.2);
  // The return: up from the exchanger, the bypass in, back to the boiler.
  line(DARK, 0.05, -0.08, 0.05, 0.05);
  line(DARK, 0.05, 0.05, 0.05, -0.0);
  line(DARK, 0.05, 0.0, -0.78, 0.0);
  // The pool water through the exchanger.
  line(BLUE, -0.6, -0.16, 0.1, -0.16);
  line(BLUE, 0.5, -0.16, 1.15, -0.16);
  label('FROM POOL', -0.6, -0.11, 0.016, 0.2);
  label('TO POOL', 1.1, -0.11, 0.016, 0.2);
  // The readings, where they are on the drawing.
  const readouts: {
    s: ReturnType<typeof createSevenSegment>;
    read: () => string;
  }[] = [];
  const r = () => io.readings();
  const readout = (tag: string, x: number, y: number, read: () => string) => {
    const s = createSevenSegment(kit, 4, { digitHeight: 0.03 });
    s.group.position.set(x, y, 0.004);
    face.add(s.group);
    label(tag, x, y - 0.045, 0.016, 0.24);
    readouts.push({ s, read });
  };
  readout('TT1 FLOW °C', -0.15, 0.34, () => r().tt[0].toFixed(1));
  readout('FT1 m³/h', 0.1, 0.34, () => r().primaryFlow.toFixed(1));
  readout('TT3 RETURN °C', -0.4, -0.07, () => r().tt[2].toFixed(1));
  readout('TT2 °C', -0.12, 0.12, () => r().tt[1].toFixed(1));
  readout('TV-1 %', 0.55, 0.12, () => String(Math.round(r().valve * 100)));
  readout('DUTY kW', 0.85, 0.12, () => String(Math.round(r().duty)));
  readout('TT4 °C', -0.35, -0.27, () => r().tt[3].toFixed(1));
  readout('TT5 °C', 0.7, -0.27, () => r().tt[4].toFixed(1));
  readout('FT2 m³/h', 0.95, -0.27, () => r().poolFlow.toFixed(1));
  readout('GAS m³/h', -0.95, -0.27, () => r().gas.toFixed(1));
  readout('SET °C', 0.25, -0.47, () => r().setpoint.toFixed(1));
  // Lamps.
  const parts = createPartSet();
  const drives: [ReturnType<typeof signal<boolean>>, () => boolean][] = [];
  const lamp = (
    legend: string,
    colour: OperatorColour,
    on: () => boolean,
    x: number,
    y: number,
  ) => {
    const drive = signal(false);
    drives.push([drive, on]);
    const p = parts.add(
      pilotLight(kit, {
        colour,
        legend,
        drive,
        pushToTest: false,
        name: legend,
      }),
    );
    p.object.position.set(x, y, 0.006);
    face.add(p.object);
  };
  lamp('BURNER', 'green', () => r().burner, -1.05, -0.1);
  lamp('LOCKOUT', 'red', () => r().lockout, -0.85, -0.1);
  lamp('P-1 RUN', 'green', () => r().pump, -0.45, 0.13);
  lamp('AUTO', 'green', () => r().auto, -0.75, -0.47);
  lamp('MANUAL', 'amber', () => !r().auto, -0.6, -0.47);
  // The valve's controls.
  const mode = parts.add(
    selector(kit, {
      positions: 2,
      legend: 'TV-1  MAN · AUTO',
      name: 'Valve mode',
      bound: {
        get value() {
          return r().auto ? 1 : 0;
        },
        set: (v: number) => io.setAuto(v >= 1),
      },
    }),
  );
  mode.object.position.set(-0.4, -0.5, 0.006);
  face.add(mode.object);
  const button = (
    legend: string,
    colour: OperatorColour,
    action: () => void,
    x: number,
  ) => {
    const b = parts.add(pushButton(kit, { colour, legend, action }));
    b.object.position.set(x, -0.5, 0.006);
    face.add(b.object);
  };
  button('SET −', 'black', () => io.setpoint(-0.5), 0.05);
  button('SET +', 'black', () => io.setpoint(0.5), 0.45);
  button('CLOSE', 'black', () => io.drive(-1), 0.75);
  button('STOP', 'white', () => io.drive(0), 0.92);
  button('OPEN', 'black', () => io.drive(1), 1.09);
  label('TV-1 BY HAND (MANUAL)', 0.92, -0.62, 0.014, 0.4);
  const shown: string[] = [];
  return {
    group,
    parts,
    update() {
      for (const [d, on] of drives) d.value = on();
      readouts.forEach((o, k) => {
        const text = o.read();
        if (shown[k] === text) return;
        shown[k] = text;
        o.s.show(text);
      });
    },
  };
}
