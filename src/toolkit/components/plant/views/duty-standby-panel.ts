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
 * A duty/standby pump panel by Penfold Controls (`game/plant/duty-standby.ts`):
 * a floor-standing cubicle (800 × 400 × 1800 mm) with the two pumps'
 * starters inside and, on its door, a lamp for each pump's running and
 * fault and one for DUTY FAIL; the delivery's flow and the discharge
 * header's pressure on LED readouts; a DUTY selector (pump 1 or 2), and
 * START, STOP and RESET. Its maker's mark in its top right corner. Its own
 * frame: on the floor, its door toward +z.
 */

export interface DutyPanelIO {
  duty(): 0 | 1;
  select(duty: 0 | 1): void;
  start(): void;
  stop(): void;
  reset(): void;
  lamps(): {
    run: [boolean, boolean];
    fault: [boolean, boolean];
    dutyFail: boolean;
  };
  flow(): number;
  headerBar(): number;
}

export function createDutyStandbyPanel(kit: PanelKit, io: DutyPanelIO) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Penfold duty/standby pump panel';
  const W = 0.8;
  const D = 0.4;
  const H = 1.8;
  const grey = t.paint('#c9cbc6', 0.6, 0.2);
  const dark = t.paint('#2e3438', 0.6);
  t.box(group, t.paint('#3a3d3f', 0.7), W, 0.1, D, 0, 0.05, 0);
  t.box(group, grey, W, H - 0.1, D, 0, 0.1 + (H - 0.1) / 2, 0);
  t.box(group, dark, 0.02, 0.14, 0.025, W / 2 - 0.06, 1.0, D / 2 + 0.012);
  for (const x of [-0.3, 0, 0.3])
    t.cyl(group, dark, 0.03, 0.04, x, H + 0.02, 0, 'y', 12);
  const face = new Group();
  face.position.set(0, 1.35, D / 2 + 0.002);
  group.add(face);
  const plate = createMicroLabel(kit, 'PUMPS 1 & 2  ·  DUTY / STANDBY', {
    height: 0.022,
    ink: '#f2f2ec',
    plate: '#2e3438',
    maxWidth: 0.6,
  });
  plate.position.set(-0.04, 0.34, 0.002);
  face.add(plate);
  panelMakerMark(kit, face, { width: W, height: 0.8, z: 0.001 });
  const parts = createPartSet();
  const place = (part: { object: Group }, x: number, y: number) => {
    part.object.position.set(x, y, 0.004);
    face.add(part.object);
  };
  // Each lamp is driven by a signal, set from the controller each frame
  // (a pilot light follows its drive reactively).
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
      0.18,
    );
  };
  lamp('P1 RUN', 'green', () => io.lamps().run[0], -0.28);
  lamp('P1 FAULT', 'amber', () => io.lamps().fault[0], -0.14);
  lamp('DUTY FAIL', 'red', () => io.lamps().dutyFail, 0);
  lamp('P2 FAULT', 'amber', () => io.lamps().fault[1], 0.14);
  lamp('P2 RUN', 'green', () => io.lamps().run[1], 0.28);
  // The delivery's flow and the header's pressure.
  const readout = (label: string, x: number) => {
    const r = createSevenSegment(kit, 4, { digitHeight: 0.026 });
    r.group.position.set(x, 0.0, 0.004);
    face.add(r.group);
    const tag = createMicroLabel(kit, label, {
      height: 0.012,
      ink: '#1d2326',
      maxWidth: 0.2,
    });
    tag.position.set(x, -0.04, 0.004);
    face.add(tag);
    return r;
  };
  const flow = readout('FLOW  m³/h', -0.15);
  const bar = readout('DISCHARGE  bar', 0.15);
  // The controls.
  place(
    parts.add(
      selector(kit, {
        positions: 2,
        legend: 'DUTY  P1 · P2',
        name: 'Duty selector',
        bound: {
          get value() {
            return io.duty();
          },
          set: (v: number) => io.select(v >= 1 ? 1 : 0),
        },
      }),
    ),
    -0.27,
    -0.2,
  );
  place(
    parts.add(
      pushButton(kit, { colour: 'green', legend: 'START', action: io.start }),
    ),
    -0.08,
    -0.2,
  );
  place(
    parts.add(
      pushButton(kit, {
        colour: 'red',
        head: 'extended',
        legend: 'STOP',
        action: io.stop,
      }),
    ),
    0.08,
    -0.2,
  );
  place(
    parts.add(
      pushButton(kit, { colour: 'blue', legend: 'RESET', action: io.reset }),
    ),
    0.26,
    -0.2,
  );
  let shown = '';
  return {
    group,
    parts,
    update() {
      for (const [drive, on] of lamps) drive.value = on();
      const text = `${Math.round(io.flow())}|${io.headerBar().toFixed(1)}`;
      if (text === shown) return;
      shown = text;
      flow.show(String(Math.round(io.flow())));
      bar.show(io.headerBar().toFixed(1));
    },
  };
}
