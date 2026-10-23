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
 * A filter's backwash control panel by Penfold Controls: a floor-standing
 * cubicle (1200 × 400 × 2000 mm) whose door carries a mimic of the filter
 * and its five valves (a lamp each, lit open), a readout for each valve's
 * flowmeter, the bed's top and bottom pressures and the difference, the
 * SUPPLY ON, VALVES MOVING and BACKWASH DUE lamps, the MODE selector (OFF,
 * SERVICE, BACKWASH, RINSE: it switches all five valves together) and
 * START and STOP for the supply. Its maker's mark top right. Its own
 * frame: on the floor, its door toward +z.
 */

export interface FilterPanelIO {
  mode(): number;
  setMode(index: number): void;
  start(): void;
  stop(): void;
  readings(): {
    open: [boolean, boolean, boolean, boolean, boolean];
    flows: [number, number, number, number, number];
    topBar: number;
    bottomBar: number;
    bedBar: number;
    supplyOn: boolean;
    moving: boolean;
    backwashDue: boolean;
  };
}

const W = 1.2;
const D = 0.4;
const H = 2.0;

export function createFilterPanel(kit: PanelKit, io: FilterPanelIO) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Penfold filter backwash panel';
  const grey = t.paint('#c9cbc6', 0.6, 0.2);
  const dark = t.paint('#2e3438', 0.6);
  const line = t.paint('#1d2326', 0.6);
  t.box(group, t.paint('#3a3d3f', 0.7), W, 0.1, D, 0, 0.05, 0);
  t.box(group, grey, W, H - 0.1, D, 0, 0.1 + (H - 0.1) / 2, 0);
  t.box(group, dark, 0.02, 0.14, 0.025, W / 2 - 0.06, 1.0, D / 2 + 0.012);
  const face = new Group();
  face.position.set(0, 1.35, D / 2 + 0.002);
  group.add(face);
  panelMakerMark(kit, face, { width: W, height: 1.25, z: 0.001 });
  const label = (
    text: string,
    x: number,
    y: number,
    height = 0.012,
    width = 0.2,
  ) => {
    const l = createMicroLabel(kit, text, {
      height,
      ink: '#1d2326',
      maxWidth: width,
    });
    l.position.set(x, y, 0.004);
    face.add(l);
  };
  label('FILTER 1  ·  BACKWASH CONTROL', 0, 0.56, 0.024, 0.8);
  // The mimic: the vessel, its supply column (left), waste column (right), the valves' lamps.
  const bar = (w: number, h: number, x: number, y: number) =>
    t.box(face, line, w, h, 0.003, x, y, 0.002);
  bar(0.16, 0.3, 0, 0.27); // the vessel, outlined by its own block
  t.box(face, t.paint('#d8cfa8', 0.8), 0.14, 0.28, 0.004, 0, 0.27, 0.003);
  bar(0.008, 0.34, -0.38, 0.27);
  bar(0.008, 0.34, 0.38, 0.27);
  bar(0.38, 0.008, -0.19, 0.4);
  bar(0.38, 0.008, 0.19, 0.4);
  bar(0.38, 0.008, -0.19, 0.14);
  bar(0.38, 0.008, 0.19, 0.14);
  bar(0.008, 0.16, 0, 0.06);
  label('SUPPLY', -0.38, 0.47);
  label('WASTE', 0.38, 0.47);
  label('RETURN', 0, -0.03);
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
  const r = () => io.readings();
  lamp('V1', 'green', () => r().open[0], -0.22, 0.4);
  lamp('V4', 'green', () => r().open[3], 0.22, 0.4);
  lamp('V3', 'green', () => r().open[2], -0.22, 0.14);
  lamp('V5', 'green', () => r().open[4], 0.22, 0.14);
  lamp('V2', 'green', () => r().open[1], 0.07, 0.04);
  // A readout for each flowmeter, m³/h.
  const tags = ['FT1 IN', 'FT2 OUT', 'FT3 BW IN', 'FT4 BW OUT', 'FT5 RINSE'];
  const flows = tags.map((tag, k) => {
    const x = -0.44 + k * 0.22;
    const s = createSevenSegment(kit, 4, { digitHeight: 0.02 });
    s.group.position.set(x, -0.14, 0.004);
    face.add(s.group);
    label(tag, x, -0.175, 0.011, 0.18);
    return s;
  });
  label('FLOWS  m³/h', 0, -0.09, 0.012, 0.3);
  // The bed's pressures.
  const pressures = (['TOP  bar', 'BOTTOM  bar', 'BED dP  bar'] as const).map(
    (tag, k) => {
      const x = -0.3 + k * 0.3;
      const s = createSevenSegment(kit, 4, { digitHeight: 0.02 });
      s.group.position.set(x, -0.26, 0.004);
      face.add(s.group);
      label(tag, x, -0.295, 0.011, 0.2);
      return s;
    },
  );
  lamp('SUPPLY ON', 'green', () => r().supplyOn, -0.3, -0.38);
  lamp('VALVES MOVING', 'amber', () => r().moving, 0, -0.38);
  lamp('BACKWASH DUE', 'red', () => r().backwashDue, 0.3, -0.38);
  const mode = parts.add(
    selector(kit, {
      positions: 4,
      legend: 'MODE  OFF · SERVICE · BACKWASH · RINSE',
      name: 'Mode selector',
      bound: {
        get value() {
          return io.mode();
        },
        set: (v: number) => io.setMode(v),
      },
    }),
  );
  mode.object.position.set(-0.3, -0.52, 0.006);
  face.add(mode.object);
  const start = parts.add(
    pushButton(kit, { colour: 'green', legend: 'START', action: io.start }),
  );
  start.object.position.set(0.1, -0.52, 0.006);
  face.add(start.object);
  const stop = parts.add(
    pushButton(kit, {
      colour: 'red',
      head: 'extended',
      legend: 'STOP',
      action: io.stop,
    }),
  );
  stop.object.position.set(0.3, -0.52, 0.006);
  face.add(stop.object);
  let shown = '';
  return {
    group,
    parts,
    update() {
      for (const [d, on] of drives) d.value = on();
      const x = r();
      const texts = [
        ...x.flows.map((f) => String(Math.round(Math.abs(f)))),
        x.topBar.toFixed(2),
        x.bottomBar.toFixed(2),
        x.bedBar.toFixed(2),
      ];
      const key = texts.join('|');
      if (key === shown) return;
      shown = key;
      flows.forEach((s, k) => s.show(texts[k]));
      pressures.forEach((s, k) => s.show(texts[5 + k]));
    },
  };
}
