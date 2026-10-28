import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createSevenSegment } from '../../core/views/eighties-controls';
import { createPartSet, pushButton, selector } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { createEngravedPlate } from '../../core/views/plant-signs';
import { createCharacterLcd } from '../../industrial-control/views/ot216-terminal';
import { plantTools } from './plant-tools';
import { describe } from './describe';
import { hose } from './hose';
import { onPlinth, PLINTH_TOP } from './plinth';
import { createDiaphragmPump } from './diaphragm-pump';
import type { DiaphragmPump } from './diaphragm-pump';
import { createChemicalBallValve } from './chemical-ball-valve';
import { chlorellaPlate } from './chlorella-plate';
import { createCx7Controller } from './cx7-controller';
import { createDc1Pair } from './dc1-controller';
import { createSamplePanel } from './sample-cell-panel';
import { relays } from '../logic/dosing-controller';
import type { ControllerState, DoseChannel } from '../logic/dosing-controller';
import type { SampleCellState } from '../logic/sample-cell';
import {
  PACES,
  drawSample,
  newControllerTrial,
  plantSteps,
  probesDrifted,
  pumpDemand,
  setHypoSuction,
  setPhProbe,
  setProbesDrifted,
  slug,
  stepSide,
} from '../logic/dosing-controller-trial';
import type {
  SideState,
  TrialSide,
  TrialState,
} from '../logic/dosing-controller-trial';

type Point = readonly [number, number, number];

/** The board's face, z, in the exhibit's frame; each side's middle, x. */
const BOARD_Z = -0.52;
const SIDE_X: Record<TrialSide, number> = { olympic: -1.25, lounge: 1.25 };

const RELAY_NAMES = [
  'CHLORINE ALARM',
  'pH ALARM',
  'SAMPLE FLOW',
  'DOSING TIME',
  'FAULT',
] as const;

/** The clock of a plant at a pace: hh:mm from 08:00. */
const clock = (s: number) => {
  const t = Math.floor(s + 8 * 3600) % 86400;
  return `${String(Math.floor(t / 3600)).padStart(2, '0')}${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}`;
};

/**
 * Dev44's dosing controller trial (prompt 105): the Olympic's Chlorella
 * CX-7 (left) and the Lounge's pair of Chlorella DC-1s (right), each on
 * a board over its sample cell, each driving its own pair of Grundflow
 * dosing pumps (a DMX 1602 for hypochlorite, a DDS 7.5-16 for acid) on
 * plinths, which dose its own small demonstration pool
 * (`dosing-controller-trial.ts`); its sample line from the pool's
 * circulation to its cell and back; its signal cables in conduit to its
 * pumps (4–20 mA and release out, the error relay back) and its probe
 * cables to it; its alarm relays in trunking along the board to a
 * marshalling box, TO CONTROL ROOM, whose interface relays light as they
 * pull in; and a Chlorella photometer by each cell for the DPD and phenol
 * red tests of a sample drawn at its tap. A trial station between them:
 * the plant's pace, and each pool's faults (a soda ash or acid slug; its
 * probes drifted or new). The hypochlorite pumps' suction valves are real
 * (shut: the pump strokes and delivers nothing), as are each cell's valve,
 * regulator and pH electrode's place. A state of its own, not the world's.
 */
export function createDosingControllerTrial(kit: PanelKit) {
  const t = plantTools(kit);
  const root = new Group();
  root.name = 'Dosing controller trial: CX-7 and DC-1';
  const parts = createPartSet();
  let trial: TrialState = newControllerTrial();
  const side = (s: TrialSide) => trial[s];
  const setSide = (s: TrialSide, f: (x: SideState) => SideState) =>
    (trial = { ...trial, [s]: f(trial[s]) });
  const addPart = (p: Part) => parts.add(p);

  // The board, on its posts.
  const board = new Group();
  root.add(board);
  const post = t.paint('#6f7472', 0.6);
  for (const x of [-2.35, 0, 2.35])
    t.box(board, post, 0.06, 2.45, 0.06, x, 1.225, BOARD_Z - 0.06);
  t.box(
    board,
    t.paint('#c9ccc6', 0.7),
    4.8,
    2.15,
    0.03,
    0,
    1.35,
    BOARD_Z - 0.015,
  );
  const on = (o: Object3D, x: number, y: number, dz = 0) => {
    o.position.set(x, y, BOARD_Z + dz);
    board.add(o);
    return o;
  };
  const caption = (text: string, x: number, y: number, h = 0.016) =>
    t.label(board, text, x, y, BOARD_Z + 0.004, h, '#1b1b1b', '#f4f3ee');
  caption(
    'DOSING CONTROLLER TRIAL · the Olympic’s Chlorella CX-7 (left) and the Lounge’s Chlorella DC-1 pair (right), each on a demonstration pool of its own',
    0,
    2.36,
    0.02,
  );

  const conduit = t.paint('#8f9496', 0.5);
  const cable = t.paint('#1c1d1f', 0.7);
  const trunk = t.paint('#eeeeea', 0.6);
  const water = t.paint('#2f6fb3', 0.45);
  const pe = t.paint('#ece9dc', 0.45);
  /** A conduit through these points, its saddles at each corner. */
  const run = (points: Point[], r = 0.01) => {
    for (let i = 0; i < points.length - 1; i++)
      t.rod(board, conduit, points[i], points[i + 1], r, 10);
    for (const p of points)
      t.cyl(board, conduit, r * 1.3, r * 2.5, p[0], p[1], p[2], 'y', 10);
  };

  // The marshalling box, TO CONTROL ROOM, at the board's top middle.
  const jb = new Group();
  on(jb, 0, 1.92, 0.0);
  t.box(jb, t.paint('#9aa0a2', 0.6), 0.5, 0.26, 0.004, 0, 0, 0.002);
  for (const [w, h, x, y] of [
    [0.5, 0.01, 0, 0.125],
    [0.5, 0.01, 0, -0.125],
    [0.01, 0.26, -0.245, 0],
    [0.01, 0.26, 0.245, 0],
  ] as const)
    t.box(jb, t.paint('#9aa0a2', 0.6), w, h, 0.1, x, y, 0.05);
  // Its clear lid: only its rim shows.
  const rim = t.paint('#c9d4d6', 0.2);
  t.box(jb, rim, 0.5, 0.008, 0.006, 0, 0.126, 0.103);
  t.box(jb, rim, 0.5, 0.008, 0.006, 0, -0.126, 0.103);
  t.box(jb, rim, 0.008, 0.26, 0.006, -0.246, 0, 0.103);
  t.box(jb, rim, 0.008, 0.26, 0.006, 0.246, 0, 0.103);
  t.box(jb, t.paint('#8a8f90', 0.4, 0.6), 0.44, 0.012, 0.01, 0, 0.05, 0.06);
  t.box(jb, t.paint('#8a8f90', 0.4, 0.6), 0.44, 0.012, 0.01, 0, -0.06, 0.06);
  const relayLeds = (['olympic', 'lounge'] as const).map((_, row) =>
    RELAY_NAMES.map((name, i) => {
      const x = -0.18 + i * 0.09;
      const y = row ? -0.05 : 0.06;
      t.box(jb, t.paint('#2a2c2e', 0.6), 0.016, 0.06, 0.05, x, y, 0.07);
      const led = t.led(jb, '#ffb02e', 0.0025, x, y + 0.02, 0.0955);
      led.mesh.userData.live = true;
      t.label(jb, name, x, y - 0.04, 0.0975, 0.0055, '#1b1b1b', '#f4f3ee');
      return led;
    }),
  );
  t.label(
    jb,
    'OLYMPIC CX-7',
    -0.235,
    0.105,
    0.0975,
    0.007,
    '#1b1b1b',
    '#f4f3ee',
  );
  t.label(
    jb,
    'LOUNGE DC-1',
    -0.235,
    -0.002,
    0.0975,
    0.007,
    '#1b1b1b',
    '#f4f3ee',
  );
  describe(jb, 'JB-DC: dosing alarm marshalling box, to the control room', () =>
    (['olympic', 'lounge'] as const)
      .map((s) => {
        const r = relays(side(s).controller);
        const lit = RELAY_NAMES.filter(
          (_, i) => [r.chlorine, r.ph, r.sampleFlow, r.doseLimit, r.fault][i],
        );
        return `${s}: ${lit.length ? lit.join(', ').toLowerCase() : 'no relay pulled in'}`;
      })
      .join('; '),
  );
  const plate = createEngravedPlate(
    kit,
    ['TO CONTROL ROOM', 'JB-DC · DOSING ALARMS'],
    {
      width: 0.24,
      height: 0.05,
    },
  );
  plate.position.set(0, 0.16, 0.002);
  jb.add(plate);
  // Its trunking up and away.
  t.box(board, trunk, 0.06, 0.26, 0.05, 0, 2.18, BOARD_Z + 0.025);

  // The trial station, under the box.
  const station = new Group();
  on(station, 0, 1.1, 0.0);
  t.box(station, t.paint('#d9d4c4', 0.55), 0.7, 0.62, 0.02, 0, 0, 0.01);
  const sc = (text: string, x: number, y: number) =>
    t.label(station, text, x, y, 0.022, 0.0095, '#1b1b1b', '#f4f3ee');
  sc('TRIAL STATION', 0, 0.28);
  const place = <P extends Part>(p: P, x: number, y: number, text: string) => {
    p.object.position.set(x, y, 0.021);
    station.add(p.object);
    sc(text, x, y - 0.065);
    return addPart(p);
  };
  place(
    selector(kit, {
      positions: 3,
      legend: '×1 · ×60 · ×600',
      name: 'trial pace',
      bound: {
        get value() {
          return PACES.indexOf(trial.pace as (typeof PACES)[number]);
        },
        set: (n: number) => (trial = { ...trial, pace: PACES[n] }),
      },
    }),
    0,
    0.17,
    'PLANT PACE\n(plant seconds a second)',
  );
  const plantClock = createSevenSegment(kit, 4, { digitHeight: 0.025 });
  plantClock.group.position.set(0, 0.035, 0.021);
  plantClock.group.userData.live = true;
  station.add(plantClock.group);
  sc('PLANT TIME', 0, -0.0);
  (['olympic', 'lounge'] as const).forEach((s, i) => {
    const x = i ? 0.22 : -0.22;
    sc(s === 'olympic' ? 'OLYMPIC POOL' : 'LOUNGE POOL', x, 0.25);
    place(
      pushButton(kit, {
        colour: 'yellow',
        legend: 'SODA ASH',
        name: `${s} soda ash slug`,
        action: () => setSide(s, (x) => slug(x, 'soda-ash')),
      }),
      x - 0.065,
      0.15,
      'FAULT: 1.5 kg soda ash\n(a pH excursion)',
    );
    place(
      pushButton(kit, {
        colour: 'yellow',
        legend: 'ACID',
        name: `${s} acid slug`,
        action: () => setSide(s, (x) => slug(x, 'acid')),
      }),
      x + 0.065,
      0.15,
      'FAULT: 10 l acid\n(pH down)',
    );
    place(
      selector(kit, {
        positions: 2,
        legend: 'NEW · DRIFTED',
        name: `${s} probes`,
        bound: {
          get value() {
            return probesDrifted(side(s)) ? 1 : 0;
          },
          set: (n: number) => setSide(s, (x) => setProbesDrifted(x, n === 1)),
        },
      }),
      x,
      -0.07,
      'PROBES: new, or a fortnight\nunattended (drifted)',
    );
  });
  sc(
    'Also: each cell’s SAMPLE ISOLATING VALVE and FLOW REGULATOR,\neach hypochlorite pump’s SUCTION VALVE (shut: it delivers nothing),\nthe pH ELECTRODE’s place for its buffers, the SAMPLE TAP and photometer',
    0,
    -0.27,
  );

  // Each side.
  type Built = {
    s: TrialSide;
    controller: { update(d: number): void };
    panel: ReturnType<typeof createSamplePanel>;
    pumps: Record<DoseChannel, DiaphragmPump>;
    lcd: ReturnType<typeof createCharacterLcd>;
  };
  const build = (s: TrialSide): Built => {
    const cx = SIDE_X[s];
    const olympic = s === 'olympic';
    const state = () => side(s).controller;
    const change = (c: ControllerState) =>
      setSide(s, (x) => ({ ...x, controller: c }));
    // Its controller, high on the board.
    const ctrlAt = { x: cx - 0.45, y: 1.78 };
    let controllerUpdate: (d: number) => void;
    let gland: (i: number) => readonly [number, number, number];
    if (olympic) {
      const cx7 = createCx7Controller(kit, {
        tag: 'OLY-DC1',
        pool: 'OLYMPIC (DEMO)',
        state,
        change,
      });
      on(cx7.object, ctrlAt.x, ctrlAt.y);
      addPart(cx7.part);
      controllerUpdate = cx7.update;
      gland = cx7.glandsAt;
    } else {
      const pair = createDc1Pair(kit, { tag: 'LOU-DC', state, change });
      on(pair.object, ctrlAt.x, ctrlAt.y);
      for (const u of pair.units) for (const k of u.keys) addPart(k);
      controllerUpdate = (d) => {
        for (const u of pair.units) u.update(d);
      };
      gland = (i) => {
        const u = pair.units[i < 2 ? 0 : 1];
        const g = u.glandsAt(i % 2);
        return [g[0] + (i < 2 ? -0.115 : 0.115), g[1], g[2] + 0.006] as const;
      };
    }
    caption(
      olympic
        ? 'OLYMPIC · Chlorella CX-7, after ProMinent DULCOMARIN 3 and W&T DEPOLOX Pool: touch the screen'
        : 'LOUNGE · Chlorella DC-1 pair (chlorine, pH), after ProMinent DULCOMETER D1C: ◄► menus, ▲▼ values, ↵ accept or acknowledge, ↩ back',
      cx - 0.1,
      2.12,
      0.012,
    );
    const g = (i: number): Point => {
      const [x, y, z] = gland(i);
      return [ctrlAt.x + x, ctrlAt.y + y, BOARD_Z + z];
    };
    // Its sample cell, to its right.
    const panelAt = { x: cx + 0.4, y: 1.05 };
    const cellState = () => side(s).cell;
    const panel = createSamplePanel(kit, {
      tag: olympic ? 'OLY' : 'LOU',
      state: cellState,
      change: (f: (c: SampleCellState) => SampleCellState) =>
        setSide(s, (x) => ({ ...x, cell: f(x.cell) })),
      sampled: () => setSide(s, drawSample),
      holders: olympic
        ? [
            { name: 'Free Cl', colour: '#e8e3c8' },
            { name: 'Total Cl', colour: '#e3d2a8' },
            { name: 'pH', colour: '#c9d8e8', ph: true },
            { name: 'Redox', colour: '#d8c9e8' },
            { name: 'Pt1000', colour: '#c8c8c8' },
          ]
        : [
            { name: 'Free Cl', colour: '#e8e3c8' },
            { name: 'pH', colour: '#c9d8e8', ph: true },
            null,
            { name: 'Pt1000', colour: '#c8c8c8' },
          ],
    });
    on(panel.object, panelAt.x, panelAt.y);
    for (const p of panel.parts) addPart(p);
    caption('SAMPLE CELL', panelAt.x, panelAt.y + 0.33, 0.012);
    const pp = ([x, y, z]: Point): Point => [
      panelAt.x + x,
      panelAt.y + y,
      BOARD_Z + z,
    ];
    // The probes' cables to the controller.
    panel.probeAt.forEach((at, i) => {
      const a = pp(at);
      const b = g(i % 5);
      hose(
        board,
        cable,
        [
          a,
          [a[0], a[1] + 0.06, a[2] + 0.02],
          [b[0], b[1] - 0.1, b[2] + 0.03],
          b,
        ],
        0.003,
        0.04,
      );
    });
    // Its photometer, on a shelf to the cell's right.
    const ph = new Group();
    on(ph, panelAt.x + 0.4, 0.86);
    t.box(ph, t.paint('#d0d0c8', 0.6), 0.16, 0.01, 0.16, 0, -0.005, 0.08);
    t.box(ph, t.paint('#3a3f3c', 0.6), 0.09, 0.03, 0.16, 0, 0.015, 0.09);
    const lcd = createCharacterLcd(kit, { w: 0.075, h: 0.02 });
    lcd.mesh.rotation.x = -1.0;
    lcd.mesh.position.set(0, 0.04, 0.08);
    ph.add(lcd.mesh);
    const brand = chlorellaPlate(kit, 0.06, 'PT-3 PHOTOMETER');
    brand.rotation.x = -Math.PI / 2;
    brand.position.set(0, 0.0305, 0.13);
    ph.add(brand);
    describe(
      ph,
      `${olympic ? 'OLY' : 'LOU'}: Chlorella PT-3 photometer (DPD 1, DPD 3, phenol red)`,
    );
    caption(
      'PHOTOMETER\n(draw a sample at the tap)',
      panelAt.x + 0.4,
      0.8,
      0.009,
    );
    // The demonstration pool, on the floor before the cell.
    const pool = new Group();
    pool.position.set(cx + 0.5, 0, -0.05);
    root.add(pool);
    const tank = t.paint('#e9ecec', 0.6);
    t.box(pool, tank, 1.1, 0.5, 0.04, 0, 0.25, -0.28);
    t.box(pool, tank, 1.1, 0.5, 0.04, 0, 0.25, 0.28);
    t.box(pool, tank, 0.04, 0.5, 0.6, -0.55, 0.25, 0);
    t.box(pool, tank, 0.04, 0.5, 0.6, 0.55, 0.25, 0);
    t.box(pool, t.paint('#3fa7c9', 0.15), 1.06, 0.01, 0.52, 0, 0.42, 0);
    describe(
      pool,
      `${s === 'olympic' ? 'Olympic' : 'Lounge'} demonstration pool (modelled as 139 m³)`,
    );
    t.label(
      pool,
      'DEMONSTRATION POOL\nmodelled as 139 m³, 12 bathers',
      0,
      0.38,
      0.305,
      0.014,
      '#1b1b1b',
      '#f4f3ee',
    );
    // Its circulation: out of the pool's end and back, the sample taken from it.
    const loopZ = BOARD_Z + 0.06;
    const pipeAt = (x: number, y: number): Point => [x, y, loopZ];
    t.pipe(root, 50, [
      [cx + 1.0, 0.3, -0.05],
      [cx + 1.0, 0.3, loopZ],
      pipeAt(cx + 1.0, 0.62),
      pipeAt(cx - 0.0, 0.62),
      pipeAt(cx - 0.0, 0.3),
      [cx - 0.0, 0.3, -0.05],
    ]);
    caption(
      'CIRCULATION (demonstration: its pumps not modelled)',
      cx + 0.5,
      0.66,
      0.01,
    );
    // The sample line from the circulation to IN, and OUT back to the pool.
    const inP = pp(panel.inAt);
    const outP = pp(panel.outAt);
    hose(
      board,
      water,
      [[inP[0], 0.64, loopZ + 0.02], [inP[0], inP[1] - 0.05, inP[2]], inP],
      0.005,
      0.02,
    );
    hose(
      board,
      water,
      [
        outP,
        [outP[0], outP[1] - 0.1, outP[2] + 0.05],
        [outP[0] - 0.1, 0.46, 0.0],
        [outP[0] - 0.12, 0.43, 0.02],
      ],
      0.005,
      0.03,
    );
    // Its pumps on plinths before the board.
    const pumps = {} as Record<DoseChannel, DiaphragmPump>;
    (['hypochlorite', 'acid'] as const).forEach((ch, i) => {
      const label = `${olympic ? 'OLY' : 'LOU'}-${ch === 'hypochlorite' ? 'HYPO' : 'ACID'}`;
      const pump = createDiaphragmPump(
        kit,
        label,
        ch === 'hypochlorite' ? 'solenoid' : 'stepper',
      );
      const px = cx - 0.75 + i * 0.5;
      const pz = -0.15;
      const stand = onPlinth(kit, pump.object, 0.38);
      stand.position.set(px, 0, pz);
      root.add(stand);
      for (const k of pump.keys) addPart(k);
      pumps[ch] = pump;
      // Its chemical: a 25 l can on the floor, its suction tube down to it.
      const can = new Group();
      can.position.set(px - 0.12, 0, pz + 0.34);
      root.add(can);
      t.box(
        can,
        t.paint(ch === 'hypochlorite' ? '#f4f2e6' : '#f2e6e6', 0.6),
        0.26,
        0.38,
        0.2,
        0,
        0.19,
        0,
      );
      t.box(
        can,
        t.paint(ch === 'hypochlorite' ? '#f2d03b' : '#c8261c', 0.5),
        0.26,
        0.05,
        0.202,
        0,
        0.3,
        0,
      );
      t.label(
        can,
        ch === 'hypochlorite'
          ? 'SODIUM HYPOCHLORITE 14 %'
          : 'HYDROCHLORIC ACID 10 %',
        0,
        0.22,
        0.102,
        0.012,
        '#1b1b1b',
        '#f4f3ee',
      );
      const [sx, sy, sz] = pump.suctionAt;
      const suction: Point = [px + sx, PLINTH_TOP + sy, pz + sz];
      if (ch === 'hypochlorite') {
        // Its suction isolating valve, on the plinth's front: shut, the pump delivers nothing.
        const valveAt: Point = [px - 0.12, 0.62, pz + 0.215];
        const valve = createChemicalBallValve(kit, {
          name: `${label} suction isolating valve`,
          binding: {
            open: () => side(s).hypoSuctionOpen,
            set: (open) => setSide(s, (x) => setHypoSuction(x, open)),
          },
        });
        valve.object.position.set(...valveAt);
        root.add(valve.object);
        addPart(valve);
        t.label(
          root,
          'SUCTION\nVALVE',
          valveAt[0],
          valveAt[1] - 0.06,
          valveAt[2] + 0.02,
          0.012,
          '#1b1b1b',
          '#f4f3ee',
        );
        hose(
          root,
          pe,
          [
            suction,
            [suction[0] - 0.04, suction[1] - 0.06, suction[2] + 0.1],
            [valveAt[0] + 0.06, valveAt[1], valveAt[2]],
          ],
          0.0045,
          0.02,
        );
        hose(
          root,
          pe,
          [
            [valveAt[0] - 0.06, valveAt[1], valveAt[2]],
            [px - 0.12, 0.45, pz + 0.34],
            [px - 0.12, 0.39, pz + 0.34],
          ],
          0.0045,
          0.02,
        );
      } else
        hose(
          root,
          pe,
          [
            suction,
            [suction[0] - 0.04, suction[1] - 0.06, suction[2] + 0.1],
            [px - 0.12, 0.45, pz + 0.34],
            [px - 0.12, 0.39, pz + 0.34],
          ],
          0.0045,
          0.03,
        );
      // Its dose line to the circulation's return.
      const [qx, qy, qz] = pump.dischargeAt;
      const q: Point = [px + qx, PLINTH_TOP + qy, pz + qz];
      hose(
        root,
        pe,
        [
          q,
          [q[0], q[1] + 0.12, q[2] - 0.05],
          [cx + 0.2 + i * 0.15, 0.68, loopZ + 0.01],
          [cx + 0.2 + i * 0.15, 0.64, loopZ],
        ],
        0.0045,
        0.04,
      );
      // Its signal cable in conduit from the controller: 4–20 mA and release out, the error relay back.
      const from = g(olympic ? 5 + i : i * 2 + 1);
      const drop: Point = [px + 0.06, PLINTH_TOP + 0.3, pz - 0.15];
      run([
        from,
        [from[0], 1.3 + i * 0.04, from[2]],
        [px + 0.06, 1.3 + i * 0.04, from[2]],
        [px + 0.06, 1.3 + i * 0.04, drop[2]],
        drop,
      ]);
      hose(
        root,
        cable,
        [
          drop,
          [px + 0.06, PLINTH_TOP + 0.12, pz - 0.1],
          [px + 0.06, PLINTH_TOP + 0.1, pz - 0.06],
        ],
        0.003,
        0.02,
      );
    });
    caption(
      'SIGNAL CABLES IN CONDUIT TO THE PUMPS · 4–20 mA and release out, error relay back',
      cx - 0.5,
      1.22,
      0.009,
    );
    // Its relays' cables in trunking along the board to the marshalling box.
    const top = g(olympic ? 4 : 3);
    const trunkY = 2.03;
    const x0 = Math.min(top[0], 0);
    const x1 = Math.max(top[0], 0);
    t.box(
      board,
      trunk,
      0.05,
      trunkY - (ctrlAt.y + 0.1),
      0.04,
      ctrlAt.x + (olympic ? 0.24 : 0.27),
      (trunkY + ctrlAt.y + 0.1) / 2,
      BOARD_Z + 0.02,
    );
    t.box(
      board,
      trunk,
      Math.abs(x1 - x0) - 0.25 + 0.1,
      0.05,
      0.04,
      (ctrlAt.x + (olympic ? 0.24 : 0.27) + (olympic ? -0.25 : 0.25)) / 2 + 0,
      trunkY,
      BOARD_Z + 0.02,
    );
    caption(
      'ALARM RELAYS IN TRUNKING → TO CONTROL ROOM',
      (ctrlAt.x + (olympic ? -0.25 : 0.25)) / 2 + (olympic ? 0.1 : -0.1),
      trunkY + 0.045,
      0.009,
    );
    return {
      s,
      controller: { update: (d) => controllerUpdate(d) },
      panel,
      pumps,
      lcd,
    };
  };
  const sides = (['olympic', 'lounge'] as const).map(build);

  const update = (delta: number) => {
    // The pumps run on their controllers' demands; the plant at its pace.
    for (const b of sides) {
      const x = side(b.s);
      for (const ch of ['hypochlorite', 'acid'] as const)
        b.pumps[ch].update(delta, pumpDemand(x, ch));
    }
    for (const dt of plantSteps(trial.pace, delta))
      for (const b of sides) {
        const rates = {
          hypochlorite: b.pumps.hypochlorite.output().rate,
          acid: b.pumps.acid.output().rate,
        };
        setSide(b.s, (x) =>
          stepSide(x, rates, { hypochlorite: false, acid: false }, dt),
        );
      }
    for (const b of sides) {
      b.controller.update(delta);
      b.panel.update(delta);
      const r = relays(side(b.s).controller);
      const row = relayLeds[b.s === 'olympic' ? 0 : 1];
      [r.chlorine, r.ph, r.sampleFlow, r.doseLimit, r.fault].forEach((v, i) =>
        row[i].set(v),
      );
      const test = side(b.s).test;
      const lines = test
        ? [
            `DPD1 ${test.dpd1.toFixed(2)} DPD3 ${test.dpd3.toFixed(2)}`.slice(
              0,
              16,
            ),
            `pH ${test.phenolRed.toFixed(1)}  at ${clock(test.at).slice(0, 2)}:${clock(test.at).slice(2)}`.slice(
              0,
              16,
            ),
          ]
        : ['PT-3   READY', 'DRAW A SAMPLE'];
      // Redrawn by the LCD only when its lines change.
      b.lcd.show(lines, null, 1);
    }
    plantClock.show(
      `${clock(trial.olympic.controller.clock).slice(0, 2)}.${clock(trial.olympic.controller.clock).slice(2)}`,
    );
    parts.update(delta);
  };
  const status = () =>
    (['olympic', 'lounge'] as const)
      .map((s) => {
        const c = side(s).controller;
        return `${s}: reads free Cl ${c.measured.free.toFixed(2)} mg/l, pH ${c.measured.ph.toFixed(2)}; hypochlorite ${Math.round(c.yout.hypochlorite * 100)} %, acid ${Math.round(c.yout.acid * 100)} %`;
      })
      .join('. ');
  // A development handle for the console, as `exhibitRoom` is: the trial's
  // state, and its faults set without walking to them (for pictures).
  if (typeof window !== 'undefined')
    (window as unknown as { dosingTrial: unknown }).dosingTrial = {
      state: () => trial,
      pace: (p: number) => (trial = { ...trial, pace: p }),
      fault(s: TrialSide, what: string) {
        const f: Record<string, (x: SideState) => SideState> = {
          'suction-shut': (x) => setHypoSuction(x, false),
          'suction-open': (x) => setHypoSuction(x, true),
          'sample-shut': (x) => ({
            ...x,
            cell: { ...x.cell, valveOpen: false },
          }),
          'sample-open': (x) => ({
            ...x,
            cell: { ...x.cell, valveOpen: true },
          }),
          soda: (x) => slug(x, 'soda-ash'),
          acid: (x) => slug(x, 'acid'),
          drift: (x) => setProbesDrifted(x, true),
          new: (x) => setProbesDrifted(x, false),
          sample: drawSample,
          'ph-cell': (x) => setPhProbe(x, 'cell'),
          'ph-7': (x) => setPhProbe(x, 7),
          'ph-4': (x) => setPhProbe(x, 4),
        };
        if (f[what]) setSide(s, f[what]);
      },
    };
  return { object: root, parts, update, status, trial: () => trial };
}
