import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createSevenSegment } from '../../core/views/eighties-controls';
import {
  createPartSet,
  potentiometer,
  pushButton,
  selector,
} from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { createDialGauge } from '../../industrial-control/views/dial-gauge';
import { plantTools } from './plant-tools';
import { describe } from './describe';
import { hose } from './hose';
import { onPlinth, PLINTH_TOP } from './plinth';
import { createDiaphragmPump } from './diaphragm-pump';
import { createMotorDosingPump } from './motor-dosing-pump';
import { DMH, admitGas, setRuptured } from '../logic/motor-dosing-pump';
import type { HeadKind, LevelInput } from '../logic/motor-dosing-pump';
import {
  INJECTION_BAR,
  askedLh,
  dmxDemand,
  dmhInputs,
  newDosingTrial,
  resetTotals,
  setDischarge,
  setHead,
  setLevel,
  stepDosingTrial,
} from '../logic/motor-dosing-trial';

const LEVELS: readonly LevelInput[] = ['ok', 'low', 'empty'];
const HEADS: readonly HeadKind[] = ['standard', 'degassing'];
/** A value in four digits: 12.6, 3.13, 0.52. */
const digits = (v: number) =>
  v >= 100 ? String(Math.round(v)) : v >= 10 ? v.toFixed(1) : v.toFixed(2);

/**
 * Dev44's trial of the Olympic's hypochlorite pump and its replacement
 * (prompt 102): the Grundflow DMX 1602 the Olympic has, and Grundflow's
 * DMH 21-10 designed to replace it, each on its plinth, both asked for the
 * same dose by one controller output (`motor-dosing-trial.ts`); the DMH's
 * discharge up through its pulsation damper and gauge. Behind them a
 * trial station: the controller's output, the day tank's level switches,
 * the discharge valve, the DMH's head (standard or degassing), a slug of
 * air and a burst diaphragm; and four readouts, what was asked (l/h, and
 * litres since RESET) and what each pump delivered (litres), so the
 * DMX's shortfall shows. A small state of its own, not the world's.
 */
export function createMotorDosingTrial(kit: PanelKit) {
  const t = plantTools(kit);
  const root = new Group();
  root.name = 'Hypochlorite pump trial: DMX 1602 against DMH 21-10';
  const parts = createPartSet();
  let trial = newDosingTrial();

  // The DMX 1602, as the Olympic has it.
  const dmx = createDiaphragmPump(kit, 'DP-101A', 'solenoid');
  const dmxStand = onPlinth(kit, dmx.object, 0.36);
  dmxStand.position.set(-0.6, 0, 0.1);
  root.add(dmxStand);
  for (const key of dmx.keys) parts.add(key);

  // The DMH 21-10.
  const dmh = createMotorDosingPump(kit, 'NEW DMH', {
    state: () => trial.dmh,
    change: (f) => (trial = { ...trial, dmh: f(trial.dmh) }),
    inputs: () => dmhInputs(trial),
  });
  const dmhStand = onPlinth(kit, dmh.object, 0.5);
  dmhStand.position.set(0.35, 0, 0.1);
  root.add(dmhStand);
  for (const part of dmh.partList) parts.add(part);

  const tube = t.paint('#ece9dc', 0.45);
  const top = PLINTH_TOP;
  // The DMX's tubes, down to its bottle and away to its quill.
  {
    const [sx, sy, sz] = dmx.suctionAt;
    const [qx, qy, qz] = dmx.dischargeAt;
    const at = (x: number, y: number, z: number) =>
      [x - 0.6, y + top, z + 0.1] as const;
    hose(
      root,
      tube,
      [
        at(sx, sy, sz),
        at(sx - 0.05, sy - 0.06, sz + 0.05),
        [-0.75, 0.6, 0.3],
        [-0.75, 0.01, 0.4],
      ],
      0.0045,
      0.02,
    );
    hose(
      root,
      tube,
      [at(qx, qy, qz), at(qx - 0.03, qy + 0.12, qz), [-0.95, 0.95, -0.27]],
      0.0045,
      0.03,
    );
  }
  // The DMH's: its suction from the day tank (into the plinth), its
  // return from the relief and bleed valve beside it, its discharge up to
  // the damper and gauge on the board and away.
  const damperAt = { x: 0.15, y: 1.5, z: -0.24 };
  {
    const at = ([x, y, z]: readonly [number, number, number]) =>
      [x + 0.35, y + top, z + 0.1] as const;
    const [sx, sy, sz] = at(dmh.suctionAt);
    const [rx, ry, rz] = at(dmh.returnAt);
    const [qx, qy, qz] = at(dmh.dischargeAt);
    hose(
      root,
      tube,
      [
        [sx, sy, sz],
        [sx, sy - 0.04, sz + 0.02],
        [sx - 0.05, top - 0.005, sz + 0.12],
      ],
      0.006,
      0.02,
    );
    hose(
      root,
      t.paint('#d8e8f0', 0.4),
      [
        [rx, ry, rz],
        [rx, ry - 0.05, rz + 0.02],
        [rx + 0.03, top - 0.005, rz + 0.1],
      ],
      0.004,
      0.02,
    );
    hose(
      root,
      tube,
      [
        [qx, qy, qz],
        [qx, qy + 0.1, qz - 0.05],
        [damperAt.x, damperAt.y - 0.12, damperAt.z + 0.04],
        [damperAt.x, damperAt.y - 0.08, damperAt.z + 0.04],
      ],
      0.006,
      0.03,
    );
  }

  // The trial station's board on two posts, behind the pumps.
  const board = new Group();
  board.position.set(0, 0, -0.3);
  root.add(board);
  const post = t.paint('#6f7472', 0.6);
  for (const x of [-1.0, 1.0])
    t.box(board, post, 0.05, 2.25, 0.05, x, 1.125, 0);
  t.box(board, t.paint('#d9d4c4', 0.55), 2.05, 0.95, 0.03, 0, 1.75, 0.03);
  const face = 0.046;
  t.label(
    board,
    'HYPOCHLORITE PUMP TRIAL · the Olympic’s DMX 1602 (left) against the DMH 21-10 designed to replace it (right)',
    0,
    2.16,
    face,
    0.02,
    '#1b1b1b',
    '#f4f3ee',
  );
  const caption = (text: string, x: number, y: number) =>
    t.label(board, text, x, y, face, 0.011, '#1b1b1b', '#f4f3ee');

  // The DMH's pulsation damper (a gas-cushioned PVDF vessel, 0.5 l) and
  // its gauge on a diaphragm seal, on the board above the pump.
  const damper = new Group();
  damper.position.set(damperAt.x, damperAt.y, damperAt.z + 0.06);
  root.add(damper);
  const pvdf = t.paint('#ecebe4', 0.4);
  t.cyl(damper, pvdf, 0.012, 0.08, 0, -0.04, 0, 'y', 12);
  t.cyl(damper, pvdf, 0.04, 0.13, 0, 0.065, 0, 'y', 24);
  t.cyl(damper, t.paint('#0b4f9c', 0.5), 0.041, 0.012, 0, 0.11, 0, 'y', 24);
  t.cyl(damper, pvdf, 0.008, 0.06, 0.04, -0.04, 0, 'x', 10);
  describe(damper, 'NEW DMH: pulsation damper, 0.5 l, PVDF');
  const gauge = createDialGauge(kit, {
    dia: 0.063,
    max: 16,
    legend: 'DISCHARGE',
  });
  gauge.group.position.set(0.11, -0.04, 0.012);
  damper.add(gauge.group);
  caption('PULSATION DAMPER\nand DISCHARGE GAUGE', damperAt.x + 0.17, 1.62);

  // The readouts.
  const readouts = (
    [
      ['ASKED L/H', -0.85],
      ['ASKED L', -0.6],
      ['DMX 1602 L', -0.35],
      ['DMH 21-10 L', -0.1],
    ] as const
  ).map(([name, x]) => {
    const r = createSevenSegment(kit, 4, { digitHeight: 0.03 });
    r.group.position.set(x, 2.02, face);
    r.group.userData.live = true;
    board.add(r.group);
    caption(name, x, 1.96);
    return r;
  });
  caption('since RESET', -0.35, 1.925);

  // Its controls.
  const place = <P extends Part>(
    part: P,
    x: number,
    y: number,
    text: string,
  ) => {
    part.object.position.set(x, y, face);
    board.add(part.object);
    caption(text, x, y - 0.075);
    return parts.add(part);
  };
  place(
    potentiometer(kit, {
      steps: 20,
      legend: 'CONTROLLER Yout',
      name: 'trial controller output',
      bound: {
        get value() {
          return Math.round(trial.yout * 20);
        },
        set: (n: number) => (trial = { ...trial, yout: n / 20 }),
      },
    }),
    -0.85,
    1.78,
    'CONTROLLER OUTPUT\n0–100 % of 12.5 l/h',
  );
  place(
    selector(kit, {
      positions: 3,
      legend: 'OK · LOW · EMPTY',
      name: 'trial day tank level',
      bound: {
        get value() {
          return LEVELS.indexOf(trial.level);
        },
        set: (n: number) => (trial = setLevel(trial, LEVELS[n])),
      },
    }),
    -0.6,
    1.78,
    'DAY TANK LEVEL\nswitches',
  );
  place(
    selector(kit, {
      positions: 2,
      legend: 'SHUT · OPEN',
      name: 'trial discharge valve',
      bound: {
        get value() {
          return trial.dischargeOpen ? 1 : 0;
        },
        set: (n: number) => (trial = setDischarge(trial, n === 1)),
      },
    }),
    -0.35,
    1.78,
    'DMH DISCHARGE\nVALVE',
  );
  place(
    selector(kit, {
      positions: 2,
      legend: 'STANDARD · DEGASSING',
      name: 'trial DMH head',
      bound: {
        get value() {
          return HEADS.indexOf(trial.dmh.head);
        },
        set: (n: number) => (trial = setHead(trial, HEADS[n])),
      },
    }),
    -0.1,
    1.78,
    'DMH HEAD',
  );
  place(
    pushButton(kit, {
      colour: 'yellow',
      legend: 'AIR SLUG',
      name: 'trial air slug',
      action: () => (trial = { ...trial, dmh: admitGas(trial.dmh, 5) }),
    }),
    -0.85,
    1.56,
    'FAULT: 5 ml of air\ninto the DMH’s head',
  );
  place(
    pushButton(kit, {
      colour: 'yellow',
      legend: 'A NIGHT',
      name: 'trial a night standing',
      // Twelve hours' gas, as a standby pump left overnight gathers.
      action: () => (trial = { ...trial, dmh: admitGas(trial.dmh, 4.8) }),
    }),
    -0.6,
    1.56,
    'FAULT: a night\nstanding by (gas)',
  );
  place(
    pushButton(kit, {
      colour: 'red',
      legend: 'BURST',
      name: 'trial burst diaphragm',
      action: () =>
        (trial = {
          ...trial,
          dmh: setRuptured(trial.dmh, !trial.dmh.ruptured),
        }),
    }),
    -0.35,
    1.56,
    'FAULT: burst diaphragm\n(again: changed)',
  );
  place(
    pushButton(kit, {
      colour: 'black',
      legend: 'RESET',
      name: 'trial reset totals',
      action: () => (trial = resetTotals(trial)),
    }),
    -0.1,
    1.56,
    'RESET TOTALS',
  );
  caption(
    'DMH: stroke dial on top · BLEED knob on the head (left-click opens) · STOP/START clears Er F',
    0.5,
    1.36,
  );

  let pulse = 0;
  const update = (delta: number) => {
    dmx.update(delta, dmxDemand(trial));
    const r = stepDosingTrial(trial, dmx.output().rate, delta);
    trial = r.trial;
    dmh.show(delta, { began: r.strokes, delivering: r.delivering });
    if (r.delivering > 0) pulse = 0.25;
    pulse = Math.max(0, pulse - delta);
    const bar = !trial.dischargeOpen
      ? DMH.reliefBar
      : trial.dmh.bleedOpen
        ? 0
        : INJECTION_BAR + pulse * 0.6;
    gauge.set(bar);
    gauge.update(delta);
    readouts[0].show(digits(askedLh(trial)));
    readouts[1].show(digits(trial.askedL));
    readouts[2].show(digits(trial.dmxL));
    readouts[3].show(digits(trial.dmhL));
  };
  const status = () =>
    `Asked ${askedLh(trial).toFixed(2)} l/h; since RESET asked ${trial.askedL.toFixed(2)} l, the DMX delivered ${trial.dmxL.toFixed(2)} l, the DMH ${trial.dmhL.toFixed(2)} l. ${dmx.status()}. ${dmh.status()}`;
  return { object: root, parts, update, status };
}
