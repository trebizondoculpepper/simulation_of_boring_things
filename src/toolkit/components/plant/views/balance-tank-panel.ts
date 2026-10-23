import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import { createBrandBadge } from '../../core/views/brand-badge';
import {
  createPartSet,
  pilotLight,
  pushButton,
  selector,
} from '../../core/parts/parts';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';
import type { OperatorColour } from '../../industrial-control/views/industrial-controls';

/**
 * A balance tank panel by Penfold Controls (`game/plant/balance-tank.ts`):
 * a wall-mounted steel enclosure (800 × 900 × 250 mm) beside its tank. On
 * its door: the level indicator (a Trager-Feinstein 16 × 2 LCD, fed by the
 * ultrasonic transmitter), the flows in and out on LED readouts, a lamp
 * for each float switch and state, the MAKE-UP selector (OFF, AUTO, HAND)
 * and the pumps' START and STOP; and below a rule, the test rig's BATHER
 * LOAD selector, which stands in for the pool's sessions. Its maker's mark
 * in its top right corner. Its own frame: its back on the wall at z = 0,
 * its door toward +z.
 */

export interface BalancePanelIO {
  level(): number;
  volume(): number;
  inflow(): number;
  outflow(): number;
  bathers(): number;
  lamps(): {
    high: boolean;
    overflowing: boolean;
    makeup: boolean;
    low: boolean;
    lowLow: boolean;
    running: boolean;
  };
  makeup(): 0 | 1 | 2;
  setMakeup(mode: 0 | 1 | 2): void;
  session(): number;
  setSession(session: number): void;
  start(): void;
  stop(): void;
}

export const BALANCE_PANEL = { w: 0.8, h: 0.9, d: 0.25 } as const;

export function createBalanceTankPanel(kit: PanelKit, io: BalancePanelIO) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Penfold balance tank panel';
  const { w: W, h: H, d: D } = BALANCE_PANEL;
  t.box(group, t.paint('#c9cbc6', 0.6, 0.2), W, H, D, 0, 0, D / 2);
  const face = new Group();
  face.position.z = D + 0.002;
  group.add(face);
  const plate = createMicroLabel(kit, 'BALANCE TANK  ·  OLYMPIC POOL', {
    height: 0.024,
    ink: '#f2f2ec',
    plate: '#2e3438',
    maxWidth: 0.6,
  });
  plate.position.set(-0.05, 0.39, 0.002);
  face.add(plate);
  panelMakerMark(kit, face, { width: W, height: H, z: 0.001 });
  // The level indicator, its maker's badge beneath it.
  const lcd = createCharacterLcd(kit, {
    columns: 16,
    rows: 2,
    cell: 0.006,
    backlight: true,
  });
  lcd.group.position.set(-0.13, 0.27, 0.003);
  face.add(lcd.group);
  const lcdBadge = createBrandBadge(kit, 'trager-feinstein', { height: 0.012 });
  lcdBadge.position.set(-0.13, 0.2, 0.003);
  face.add(lcdBadge);
  const readout = (label: string, x: number, y: number) => {
    const r = createSevenSegment(kit, 4, { digitHeight: 0.026 });
    r.group.position.set(x, y, 0.004);
    face.add(r.group);
    const tag = createMicroLabel(kit, label, {
      height: 0.012,
      ink: '#1d2326',
      maxWidth: 0.2,
    });
    tag.position.set(x, y - 0.04, 0.004);
    face.add(tag);
    return r;
  };
  const inflow = readout('IN  m³/h', 0.18, 0.3);
  const outflow = readout('OUT  m³/h', 0.18, 0.19);
  const parts = createPartSet();
  const place = (part: { object: Group }, x: number, y: number) => {
    part.object.position.set(x, y, 0.004);
    face.add(part.object);
  };
  const lamps: [ReturnType<typeof signal<boolean>>, () => boolean][] = [];
  const lamp = (
    legend: string,
    colour: OperatorColour,
    on: () => boolean,
    x: number,
  ) => {
    const drive = signal(false);
    lamps.push([drive, on]);
    place(
      parts.add(
        pilotLight(kit, {
          colour,
          legend,
          drive,
          pushToTest: false,
          name: legend,
        }),
      ),
      x,
      0.07,
    );
  };
  const l = () => io.lamps();
  lamp('HIGH LEVEL', 'red', () => l().high, -0.3);
  lamp('OVERFLOW', 'amber', () => l().overflowing, -0.18);
  lamp('MAKE-UP', 'blue', () => l().makeup, -0.06);
  lamp('LOW LEVEL', 'amber', () => l().low, 0.06);
  lamp('LOW LOW TRIP', 'red', () => l().lowLow, 0.18);
  lamp('PUMPS RUN', 'green', () => l().running, 0.3);
  place(
    parts.add(
      selector(kit, {
        positions: 3,
        legend: 'MAKE-UP  OFF · AUTO · HAND',
        name: 'Make-up selector',
        bound: {
          get value() {
            return io.makeup();
          },
          set: (v: number) => io.setMakeup(Math.round(v) as 0 | 1 | 2),
        },
      }),
    ),
    -0.22,
    -0.1,
  );
  place(
    parts.add(
      pushButton(kit, {
        colour: 'green',
        legend: 'PUMPS START',
        action: io.start,
      }),
    ),
    0.08,
    -0.1,
  );
  place(
    parts.add(
      pushButton(kit, {
        colour: 'red',
        head: 'extended',
        legend: 'PUMPS STOP',
        action: io.stop,
      }),
    ),
    0.26,
    -0.1,
  );
  // The test rig's section, ruled off below.
  t.box(face, t.paint('#f2c230', 0.6), W - 0.08, 0.006, 0.002, 0, -0.22, 0.001);
  const test = createMicroLabel(kit, 'TEST RIG  ·  POOL BATHER LOAD', {
    height: 0.016,
    ink: '#1d2326',
    maxWidth: 0.5,
  });
  test.position.set(0, -0.25, 0.004);
  face.add(test);
  place(
    parts.add(
      selector(kit, {
        positions: 4,
        legend: 'CLOSED · QUIET · PUBLIC · GALA',
        name: 'Bather load selector',
        bound: {
          get value() {
            return io.session();
          },
          set: (v: number) => io.setSession(Math.round(v)),
        },
      }),
    ),
    -0.15,
    -0.35,
  );
  const bathers = readout('BATHERS', 0.18, -0.33);
  let shown = '';
  return {
    group,
    parts,
    update() {
      for (const [drive, on] of lamps) drive.value = on();
      const lines = [
        `LEVEL${`${io.level().toFixed(2)} m`.padStart(11)}`,
        `VOLUME${`${io.volume().toFixed(0)} m3`.padStart(10)}`,
      ];
      const key = `${lines.join('|')}|${Math.round(io.inflow())}|${Math.round(io.outflow())}|${Math.round(io.bathers())}`;
      if (key === shown) return;
      shown = key;
      lcd.show(lines);
      inflow.show(String(Math.round(io.inflow())));
      outflow.show(String(Math.round(io.outflow())));
      bathers.show(String(Math.round(io.bathers())));
    },
  };
}
