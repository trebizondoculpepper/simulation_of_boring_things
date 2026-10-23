import { retiredPipes } from './retired-rooms';
import type { Footprint } from '../../controls/logic/walk-collision';
import { layoutRoom } from './room-equipment';
import { WET_HALL_SOFFIT, roomStructure } from './room-structure';
import type { Placed } from './room-equipment';
import { placedPort } from './machine-ports';
import {
  POWER_ISOLATOR,
  glandTop,
} from '../../components/industrial-control/logic/enclosures';

/**
 * The pipework of the Olympic pool's plant room, port to port: each run
 * leaving its machine's nozzle straight out along it (`machine-ports.ts`),
 * rising or falling to its own height, running square, and coming into the
 * far nozzle the same way. Every service has a height of its own, so runs
 * cross without meeting, and all of them pass over the machines' tops and
 * under the services ceiling (which hangs 1.9 m below the 8 m roof). The
 * pool's own water crosses the north wall; everything the central plant
 * supplies or takes away crosses the south.
 *
 * The filters are piped as a battery is: an inlet header from the pumps,
 * a drop from it into each filter's inlet; an outlet header, a rise into
 * it from each filter's outlet; and each filter's backwash waste dropping
 * from its inlet branch, and its drain, into a grated floor channel that
 * runs to the drainage through the south wall. Each filter has its inlet,
 * outlet, waste and drain valves near its nozzles. Pure: metres, the
 * room's frame, its floor at y = 0.
 */

export type Vec3 = readonly [number, number, number];
type V = [number, number, number];

export type Service =
  | 'pool water'
  | 'heating flow'
  | 'heating return'
  | 'drainage'
  | 'make-up'
  | 'ozone'
  | 'electrical'
  | 'hypochlorite'
  | 'sample'
  | 'gas'
  | 'flue'
  | 'hot water';

export interface Valve {
  /** Its middle, on its run, and the run's axis there. */
  at: Vec3;
  axis: 'x' | 'y' | 'z';
  name: string;
  od: number;
  /**
   * How it is worked: by its lever, or, out of reach overhead, by a chain
   * wheel, its chain hanging to `CHAIN_TO` over the floor.
   */
  operator: 'lever' | 'chain';
  /** A water butterfly valve (the default), or a gas lever ball valve. */
  style?: 'butterfly' | 'gas-ball';
  /**
   * The way it faces in plan, away from its machine: its lever, open,
   * along a level pipe that way; its neck and lever, on a vertical pipe,
   * toward that side.
   */
  facing: Vec3;
}

/** Over this, a valve's lever is out of reach from the floor, metres. */
export const REACH = 2.0;
/** A chain wheel's chain hangs to this height. */
export const CHAIN_TO = 1.2;

export interface WallCrossing {
  at: Vec3;
  normal: Vec3;
  thickness: number;
  kind: 'fire-collar' | 'sleeve';
}

export interface PipeRun {
  name: string;
  kind:
    | 'pvc-pressure'
    | 'pvc-drain'
    | 'lagged-heating'
    | 'copper'
    | 'chemical-tube'
    | 'stainless'
    | 'steel-screwed'
    | 'flue';
  od: number;
  points: Vec3[];
  /** The machines and runs at its ends (tees), which it may meet. */
  joins: string[];
  service: Service;
  label: string;
  through: WallCrossing[];
  valves: Valve[];
}

/** A three-way fitting between a continuous main and a perpendicular branch. */
export interface PipeTee {
  name: string;
  kind: PipeRun['kind'];
  at: Vec3;
  mainOd: number;
  branchOd: number;
  mainDirection: Vec3;
  branchDirection: Vec3;
}

/**
 * A channel in the floor: from, to, along its middle. Grated, an open
 * channel carrying waste to the drainage; or covered, a duct with a pipe
 * in it under chequer plate.
 */
export interface FloorChannel {
  from: Vec3;
  to: Vec3;
  width: number;
  kind?: 'grating' | 'cover';
}

/** The pumps' discharge header runs over them at this height. */
export const PUMP_HEADER = 2.4;
/** A duct's pipe runs this far under the floor. */
export const DUCT_DEPTH = -0.45;
/** The heights each service runs at, metres over the floor. */
export const LEVELS = {
  ozone: 2.2,
  /** Back out to the pool's inlets through the north wall. */
  toPool: 2.6,
  /** The contact tank on to the UV unit, along the north. */
  contactToUv: 3.4,
  /** The pumps to the filters: the inlet header. */
  filterIn: 4.0,
  /** The filters on to the heat exchanger: the outlet header. */
  filterOut: 4.6,
  /** The heat exchanger north to the contact tank. */
  heated: 5.2,
  makeUp: 5.6,
  supply: 5.9,
  dosing: 2.4,
} as const;

/** The walls' thickness. */
const WALL = 0.2;
const PLASTIC = new Set<PipeRun['kind']>(['pvc-pressure', 'pvc-drain']);

const sameAs = (a: Vec3, b: Vec3) =>
  a.every((v, k) => Math.abs(v - b[k]) < 1e-9);

/** Points without repeats, or any lying straight between its neighbours. */
export function tidy(points: readonly Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (const p of points)
    if (!out.length || !sameAs(out[out.length - 1], p)) out.push(p);
  return out.filter((p, i) => {
    if (i === 0 || i === out.length - 1) return true;
    const a = out[i - 1];
    const b = out[i + 1];
    const d1 = p.map((v, k) => v - a[k]);
    const d2 = b.map((v, k) => v - p[k]);
    const cross = [
      d1[1] * d2[2] - d1[2] * d2[1],
      d1[2] * d2[0] - d1[0] * d2[2],
      d1[0] * d2[1] - d1[1] * d2[0],
    ];
    return cross.some((v) => Math.abs(v) > 1e-9);
  });
}

/** A square run from `a` to `b` at `level`: across in x then z (or z then x). */
export function square(
  a: Vec3,
  b: Vec3,
  level: number,
  zFirst = false,
): Vec3[] {
  return tidy([
    a,
    [a[0], level, a[2]],
    zFirst ? [a[0], level, b[2]] : [b[0], level, a[2]],
    [b[0], level, b[2]],
    b,
  ]);
}

/** A nozzle's end, and `length` metres straight out along it. */
const out = (p: { at: Vec3; outward: Vec3 }, length: number): V => [
  p.at[0] + p.outward[0] * length,
  p.at[1] + p.outward[1] * length,
  p.at[2] + p.outward[2] * length,
];

/**
 * A lockable rotary isolator beside a machine (BS 7671, for locking it off
 * to work on it), on a galvanised stand: its box's middle, the way it
 * faces, where its supply comes in at its top and its feed leaves.
 */
export interface IsolatorPlace {
  name: string;
  at: Vec3;
  facing: Vec3;
  supplyIn: Vec3;
  feedOut: Vec3;
}

/** An isolator's box (`createPowerIsolator`): about 115 × 160 × 105 mm, its middle this high. */
export const ISOLATOR_Y = 1.5;
const ISOLATOR_BOX = { h: POWER_ISOLATOR.h, d: POWER_ISOLATOR.d };

/** The room's runs and floor channels. */
/** The pool plant rooms routed here: each one's pumps' tag, and its isolators' names. */
const ROUTED: Record<string, { pumps: string; prefix: string }> = {
  plant_pool_01: { pumps: 'P-201', prefix: 'Lounge ' },
};

/**
 * A pool plant room's pipework (the lounge's, the Olympic's): the same
 * circuit, laid to its own machines' places.
 */
export function poolPlantPipework(room: string): {
  runs: PipeRun[];
  channels: FloorChannel[];
  tees: PipeTee[];
  isolators: IsolatorPlace[];
  stands: Vec3[];
} {
  const layout = layoutRoom(room)!;
  // Into the services ceiling (`roomStructure`): a run that ends here goes
  // on out of sight to wherever it comes from (the central plant).
  const INTO_CEILING = roomStructure(room)!.ceilingZone;
  const names = ROUTED[room];
  const h = layout.box.w / 2;
  const by = (end: string) =>
    layout.placed.find((p) => p.item.label.endsWith(end))!;
  const port = (p: Placed, name: string) => placedPort(p, name);
  const tank = by('balance tank');
  const pumps = by('circulation pumps, duty and standby, with strainers');
  const filters = layout.placed.filter((p) =>
    p.item.key.startsWith('sand-filter'),
  );
  const phe = by('plate heat exchanger');
  const contact = by('ozone contact tank');
  const generator = by('ozone generator');
  const uv = by('UV unit');
  const panel = by('local control panel');
  const L = LEVELS;
  const main = 0.355;
  const runs: PipeRun[] = [];
  const channels: FloorChannel[] = [];
  const tees: PipeTee[] = [];
  const run = (
    r: Omit<PipeRun, 'through' | 'valves'> & {
      valves?: Omit<Valve, 'operator'>[];
    },
  ) => {
    const points = tidy(r.points);
    const through: WallCrossing[] = [];
    // Carried through a north or south wall at either end, its fitting in it.
    for (const i of [0, points.length - 1]) {
      const p = points[i];
      const side = Math.sign(p[2]);
      if (Math.abs(Math.abs(p[2]) - h) > 1e-6) continue;
      points[i] = [p[0], p[1], side * (h + WALL)];
      through.push({
        at: [p[0], p[1], side * (h + WALL / 2)],
        normal: [0, 0, -side],
        thickness: WALL,
        kind: PLASTIC.has(r.kind) ? 'fire-collar' : 'sleeve',
      });
    }
    const made: PipeRun = {
      through,
      ...r,
      points,
      valves: (r.valves ?? []).map((v) => ({
        ...v,
        operator: v.at[1] > REACH ? 'chain' : 'lever',
      })),
    };
    runs.push(made);
    return made;
  };

  // ---- From the pool, into the balance tank --------------------------------
  for (const name of ['overflow', 'mainDrain'] as const) {
    const p = port(tank, name);
    run({
      name:
        name === 'overflow'
          ? 'Overflow channel to the balance tank'
          : 'Main drains to the balance tank',
      kind: 'pvc-pressure',
      od: p.od,
      points: [[p.at[0], p.at[1], -h], p.at],
      joins: [tank.item.label],
      service: 'pool water',
      label: name === 'overflow' ? 'FROM OVERFLOW' : 'FROM MAIN DRAINS',
    });
  }

  // ---- The tank to the pumps, and the pumps up to the inlet header ---------
  const suction = port(tank, 'suction');
  // The pair's suction header, west of them, feeding each pump's strainer;
  // the main rises into it out of a duct under the floor, which carries it
  // from the tank's floor west under the tank and its walkway and south:
  // so it crosses no walkway.
  const inA = port(pumps, 'suctionA');
  const inB = port(pumps, 'suctionB');
  // Out clear of the pumps' footprint before it turns.
  const a1 = out(inA, 0.6);
  const b1 = out(inB, 0.6);
  const rise: Vec3 = [a1[0], a1[1], (a1[2] + b1[2]) / 2];
  run({
    name: 'Suction main, balance tank to the pumps',
    kind: 'pvc-pressure',
    od: main,
    points: [
      suction.at,
      ...square(
        [suction.at[0], DUCT_DEPTH, suction.at[2]],
        [rise[0], DUCT_DEPTH, rise[2]],
        DUCT_DEPTH,
      ),
      rise,
    ],
    joins: [tank.item.label, 'Pump suction header'],
    service: 'pool water',
    label: 'SUCTION',
  });
  tees.push({
    name: 'Pump suction header tee',
    kind: 'pvc-pressure',
    at: rise,
    mainOd: inA.od,
    branchOd: main,
    mainDirection: [0, 0, 1],
    branchDirection: [0, -1, 0],
  });
  run({
    name: 'Pump suction header',
    kind: 'pvc-pressure',
    od: inA.od,
    points: [inA.at, a1, b1, inB.at],
    joins: [pumps.item.label, 'Suction main, balance tank to the pumps'],
    service: 'pool water',
    label: 'SUCTION',
  });
  // The duct's cover, where it is not under the tank.
  channels.push({
    from: [rise[0], 0, tank.footprint.maxZ + 0.2],
    to: [rise[0], 0, rise[2]],
    width: 0.4,
    kind: 'cover',
  });
  // Each pump's discharge riser up into the pair's discharge header, over
  // them; the main up from its middle to the filters' inlet header.
  const outA = port(pumps, 'dischargeA');
  const outB = port(pumps, 'dischargeB');
  run({
    name: 'Pump discharge header',
    kind: 'pvc-pressure',
    od: outA.od,
    points: [
      outA.at,
      [outA.at[0], PUMP_HEADER, outA.at[2]],
      [outB.at[0], PUMP_HEADER, outB.at[2]],
      outB.at,
    ],
    joins: [pumps.item.label, 'Pump discharge main'],
    service: 'pool water',
    label: 'DISCHARGE',
  });
  tees.push({
    name: 'Pump discharge header tee',
    kind: 'pvc-pressure',
    at: [outA.at[0], PUMP_HEADER, (outA.at[2] + outB.at[2]) / 2],
    mainOd: outA.od,
    branchOd: main,
    mainDirection: [0, 0, 1],
    branchDirection: [0, 1, 0],
  });
  const discharge = {
    at: [outA.at[0], PUMP_HEADER, (outA.at[2] + outB.at[2]) / 2] as Vec3,
  };

  // ---- The filter battery ------------------------------------------------
  const faces = filters.map((f) => {
    const inlet = port(f, 'inlet');
    return {
      f,
      inlet,
      outlet: port(f, 'outlet'),
      drain: port(f, 'drain'),
      // The way out of its face, in the room.
      dir: inlet.outward,
    };
  });
  const south = faces.filter((x) => x.dir[2] < -0.5);
  const east = faces.filter((x) => x.dir[0] < -0.5);
  // The lines the headers run along in front of the filters' faces.
  const OUT_LINE = 0.35;
  // The inlet line (and the floor channel under it) far enough out that
  // the channel stands clear of every filter's footprint.
  const IN_LINE = Math.max(
    0.8,
    ...faces.map(({ f, outlet, dir }) =>
      dir[2] < -0.5
        ? outlet.at[2] - f.footprint.minZ + 0.2
        : dir[0] < -0.5
          ? outlet.at[0] - f.footprint.minX + 0.2
          : 0,
    ),
  );
  // Measured from the vessels' fronts: their outlets, in the middle.
  const lineZ = (line: number) => south[0].outlet.at[2] - line;
  const lineX = (line: number) =>
    east.length ? east[0].outlet.at[0] - line : 0;
  // The inlet header: up from the pumps, south to the south row's line,
  // along it each way to its filters, and north along the east column's
  // line if there is one.
  const inSouthZ = lineZ(IN_LINE);
  const inEastX = lineX(IN_LINE);
  const southInlets = south.map((x) => x.inlet.at[0]);
  const junction: Vec3 = [discharge.at[0], L.filterIn, inSouthZ];
  run({
    name: 'Pump discharge main',
    kind: 'pvc-pressure',
    od: main,
    points: [
      discharge.at,
      [discharge.at[0], L.filterIn, discharge.at[2]],
      junction,
    ],
    joins: [
      'Pump discharge header',
      'Filter inlet header',
      'Filter inlet header, west',
    ],
    service: 'pool water',
    label: 'TO FILTERS',
  });
  const westmostIn = Math.min(...southInlets);
  if (westmostIn < junction[0] - 1e-6)
    run({
      name: 'Filter inlet header, west',
      kind: 'pvc-pressure',
      od: main,
      points: [junction, [westmostIn, L.filterIn, inSouthZ]],
      joins: ['Pump discharge main', 'Filter inlet header'],
      service: 'pool water',
      label: 'TO FILTERS',
    });
  const northmost = east.length
    ? Math.min(...east.map((x) => x.inlet.at[2]))
    : 0;
  const inletHeader = run({
    name: 'Filter inlet header',
    kind: 'pvc-pressure',
    od: main,
    points: east.length
      ? [
          junction,
          [inEastX, L.filterIn, inSouthZ],
          [inEastX, L.filterIn, northmost],
        ]
      : [junction, [Math.max(...southInlets), L.filterIn, inSouthZ]],
    joins: ['Pump discharge main', 'Filter inlet header, west'],
    service: 'pool water',
    label: 'TO FILTERS',
  });
  if (westmostIn < junction[0] - 1e-6)
    tees.push({
      name: 'Filter inlet header junction tee',
      kind: 'pvc-pressure',
      at: junction,
      mainOd: main,
      branchOd: main,
      mainDirection: [1, 0, 0],
      branchDirection: [0, 0, Math.sign(discharge.at[2] - inSouthZ)],
    });
  const outSouthZ = lineZ(OUT_LINE);
  const outEastX = lineX(OUT_LINE);
  const pheBranchX = out(port(phe, 'poolIn'), 0.6)[0];
  const westmost = Math.min(...south.map((x) => x.outlet.at[0]));
  const eastmost = Math.max(...south.map((x) => x.outlet.at[0]), pheBranchX);
  const outNorthmost = east.length
    ? Math.min(...east.map((x) => x.outlet.at[2]))
    : 0;
  const outletHeader = run({
    name: 'Filter outlet header',
    kind: 'pvc-pressure',
    od: main,
    points: east.length
      ? [
          [westmost, L.filterOut, outSouthZ],
          [outEastX, L.filterOut, outSouthZ],
          [outEastX, L.filterOut, outNorthmost],
        ]
      : [
          [westmost, L.filterOut, outSouthZ],
          [eastmost, L.filterOut, outSouthZ],
        ],
    joins: [],
    service: 'pool water',
    label: 'FILTERED',
  });
  // The floor channels: along each row's front, under the inlet header's
  // line, and on to the south wall's drainage.
  channels.push({
    from: [
      Math.min(
        ...south.map((x) => x.inlet.at[0], ...south.map((y) => y.drain.at[0])),
      ) - 0.4,
      0,
      inSouthZ,
    ],
    to: [
      Math.max(
        ...south.map((x) => x.drain.at[0]),
        ...south.map((y) => y.inlet.at[0]),
      ) + 0.4,
      0,
      inSouthZ,
    ],
    width: 0.3,
  });
  // Through the gap between two filters of the south row.
  const byX = [...south].sort((a, b) => a.f.x - b.f.x);
  const gapX = (byX[0].f.footprint.maxX + byX[1].f.footprint.minX) / 2;
  channels.push({ from: [gapX, 0, inSouthZ], to: [gapX, 0, h], width: 0.3 });
  if (east.length) {
    const eastZs = east.flatMap((x) => [x.inlet.at[2], x.drain.at[2]]);
    const cornerX = h - 0.4;
    const cornerZ = Math.max(...east.map((x) => x.f.footprint.maxZ)) + 0.4;
    channels.push({
      from: [inEastX, 0, Math.min(...eastZs) - 0.4],
      to: [inEastX, 0, cornerZ],
      width: 0.3,
    });
    // South-east, past the last filter, to the south wall by the corner.
    channels.push({
      from: [inEastX, 0, cornerZ],
      to: [cornerX, 0, cornerZ],
      width: 0.3,
    });
    channels.push({
      from: [cornerX, 0, cornerZ],
      to: [cornerX, 0, h],
      width: 0.3,
    });
  }

  faces.forEach(({ f, inlet, outlet, drain, dir }, i) => {
    const n = i + 1;
    // Straight out from nozzle `p` to the line `d` in front of the
    // vessel's front (its outlet nozzle).
    const line = (p: Vec3, d: number): Vec3 =>
      Math.abs(dir[0]) > 0.5
        ? [outlet.at[0] + dir[0] * d, p[1], p[2]]
        : [p[0], p[1], outlet.at[2] + dir[2] * d];
    // The inlet: down from the header, out to the nozzle; its valve on
    // the level length, near the nozzle.
    const inTee = line(inlet.at, IN_LINE);
    tees.push({
      name: `Filter ${n} inlet header tee`,
      kind: 'pvc-pressure',
      at: [inTee[0], L.filterIn, inTee[2]],
      mainOd: main,
      branchOd: inlet.od,
      mainDirection: dir[2] < -0.5 ? [1, 0, 0] : [0, 0, 1],
      branchDirection: [0, -1, 0],
    });
    // The drop from the header, the branch to the nozzle, and the waste
    // below them, meeting in a tee: the drop and the waste one straight
    // main, the branch off it.
    run({
      name: `Filter ${n} inlet drop`,
      kind: 'pvc-pressure',
      od: inlet.od,
      points: [[inTee[0], L.filterIn, inTee[2]], inTee],
      joins: [
        inletHeader.name,
        'Filter inlet header, west',
        `Filter ${n} inlet`,
        `Filter ${n} backwash waste`,
      ],
      service: 'pool water',
      label: `F${n} INLET`,
      // The inlet's isolating valve, on the drop above the backwash tee,
      // so that shut it parts the filter (and its waste) from the header:
      // backwashing one filter never drains the others' feed.
      valves: [
        {
          at: [inTee[0], inTee[1] + 0.35, inTee[2]],
          axis: 'y',
          name: `F${n} inlet valve`,
          facing: dir,
          od: inlet.od,
        },
      ],
    });
    tees.push({
      name: `Filter ${n} inlet tee`,
      kind: 'pvc-pressure',
      at: inTee,
      mainOd: inlet.od,
      branchOd: inlet.od,
      mainDirection: [0, 1, 0],
      branchDirection: [-dir[0], 0, -dir[2]],
    });
    run({
      name: `Filter ${n} inlet`,
      kind: 'pvc-pressure',
      od: inlet.od,
      points: [inTee, inlet.at],
      joins: [
        f.item.label,
        `Filter ${n} inlet drop`,
        `Filter ${n} backwash waste`,
      ],
      service: 'pool water',
      label: `F${n} INLET`,
    });
    // The backwash waste: down from the inlet branch's corner into the channel.
    run({
      name: `Filter ${n} backwash waste`,
      kind: 'pvc-pressure',
      od: inlet.od,
      points: [inTee, [inTee[0], 0.05, inTee[2]]],
      joins: [`Filter ${n} inlet`, `Filter ${n} inlet drop`],
      service: 'drainage',
      label: `F${n} WASTE`,
      valves: [
        {
          // Small-room filter nozzles can sit below 1.1 m. Keep the valve
          // between the tee and floor channel, on the actual waste drop.
          at: [inTee[0], Math.min(1.1, (inTee[1] + 0.05) / 2), inTee[2]],
          axis: 'y',
          name: `F${n} backwash valve`,
          facing: dir,
          od: inlet.od,
        },
      ],
    });
    // The outlet: out of the nozzle, up into the outlet header.
    const outTee = line(outlet.at, OUT_LINE);
    tees.push({
      name: `Filter ${n} outlet header tee`,
      kind: 'pvc-pressure',
      at: [outTee[0], L.filterOut, outTee[2]],
      mainOd: main,
      branchOd: outlet.od,
      mainDirection: dir[2] < -0.5 ? [1, 0, 0] : [0, 0, 1],
      branchDirection: [0, -1, 0],
    });
    run({
      name: `Filter ${n} outlet`,
      kind: 'pvc-pressure',
      od: outlet.od,
      points: [outlet.at, outTee, [outTee[0], L.filterOut, outTee[2]]],
      joins: [f.item.label, outletHeader.name],
      service: 'pool water',
      label: `F${n} OUTLET`,
      valves: [
        {
          at: [outTee[0], 1.3, outTee[2]],
          axis: 'y',
          name: `F${n} outlet valve`,
          facing: dir,
          od: outlet.od,
        },
      ],
    });
    // The drain: out of the nozzle to the channel's line and down into it.
    const drainEnd = line(drain.at, IN_LINE);
    run({
      name: `Filter ${n} drain`,
      kind: 'pvc-drain',
      od: drain.od,
      points: [drain.at, drainEnd, [drainEnd[0], 0.05, drainEnd[2]]],
      joins: [f.item.label],
      service: 'drainage',
      label: `F${n} DRAIN`,
      valves: [
        {
          // On the drop at the front, beside the backwash valve, where it
          // is reached from the floor in front of the filter.
          at: [drainEnd[0], Math.min(0.4, drain.at[1] - 0.15), drainEnd[2]],
          axis: 'y',
          name: `F${n} drain valve`,
          facing: dir,
          od: drain.od,
        },
      ],
    });
  });

  // ---- The outlet header to the heat exchanger, and on round ---------------
  const pheIn = port(phe, 'poolIn');
  const pheOut = port(phe, 'poolOut');
  // The inlet's stub the longer, so the main coming down to it passes
  // clear of the outlet's.
  const pheIn1 = out(pheIn, 0.6);
  const pheOut1 = out(pheOut, 0.25);
  run({
    name: 'Filtered main to the heat exchanger',
    kind: 'pvc-pressure',
    od: pheIn.od,
    points: [
      [pheIn1[0], L.filterOut, outSouthZ],
      [pheIn1[0], L.filterOut, pheIn1[2]],
      pheIn1,
      pheIn.at,
    ],
    joins: [phe.item.label, outletHeader.name],
    service: 'pool water',
    label: 'TO HEAT EXCHANGER',
  });
  const cIn = port(contact, 'inlet');
  const cIn1 = out(cIn, 0.3);
  run({
    name: 'Heat exchanger to the ozone contact tank',
    kind: 'pvc-pressure',
    od: pheOut.od,
    points: [
      pheOut.at,
      pheOut1,
      ...square(pheOut1, cIn1, L.heated, true),
      cIn.at,
    ],
    joins: [
      phe.item.label,
      contact.item.label,
      'Hypochlorite to the heated main',
      'Sample line from the heated main',
    ],
    service: 'pool water',
    label: 'HEATED',
  });
  const cOut = port(contact, 'outlet');
  const cOut1 = out(cOut, 0.3);
  const uvIn = port(uv, 'inlet');
  const uvIn1 = out(uvIn, 0.3);
  run({
    name: 'Contact tank to the UV unit',
    kind: 'pvc-pressure',
    od: cOut.od,
    points: [cOut.at, ...square(cOut1, uvIn1, L.contactToUv), uvIn.at],
    joins: [contact.item.label, uv.item.label],
    service: 'pool water',
    label: 'TO UV',
  });
  const uvOut = port(uv, 'outlet');
  const uvOut1 = out(uvOut, 0.3);
  run({
    name: 'Return main to the pool’s inlets',
    kind: 'pvc-pressure',
    od: uvOut.od,
    points: [
      uvOut.at,
      uvOut1,
      [uvOut1[0], L.toPool, uvOut1[2]],
      [uvOut1[0], L.toPool, -h],
    ],
    joins: [uv.item.label],
    service: 'pool water',
    label: 'TO POOL',
  });
  // Ozone, the generator to the contact tank's injector.
  const oz = port(generator, 'ozoneOut');
  const cOz = port(contact, 'ozone');
  run({
    name: 'Ozone to the contact tank',
    kind: 'stainless',
    od: oz.od,
    points: [
      oz.at,
      ...square(out(oz, 0.5), out(cOz, 0.5), L.ozone, true),
      cOz.at,
    ],
    joins: [generator.item.label, contact.item.label],
    service: 'ozone',
    label: 'OZONE',
  });

  // ---- The central plant's services, through the south wall ----------------
  for (const [name, service, stub] of [
    ['primaryFlow', 'heating flow', 0.6],
    ['primaryReturn', 'heating return', 0.25],
  ] as const) {
    const p = port(phe, name);
    const s = out(p, stub);
    run({
      name:
        service === 'heating flow'
          ? 'Heating flow to the heat exchanger'
          : 'Heating return from the heat exchanger',
      kind: 'lagged-heating',
      od: 0.114,
      points: [[s[0], s[1], h], s, p.at],
      joins: [phe.item.label],
      service,
      label: service === 'heating flow' ? 'LTHW FLOW' : 'LTHW RETURN',
    });
  }
  const makeUp = port(tank, 'makeUp');
  run({
    name: 'Make-up water to the balance tank',
    kind: 'copper',
    od: makeUp.od,
    // Down out of the ceiling, straight into the tank's roof.
    points: [[makeUp.at[0], INTO_CEILING, makeUp.at[2]], makeUp.at],
    joins: [tank.item.label],
    service: 'make-up',
    label: 'MAKE-UP',
  });
  const supply = port(panel, 'supply');
  run({
    name: 'Control panel supply',
    kind: 'steel-screwed',
    od: 0.05,
    // Up into the ceiling's cable tray.
    points: [supply.at, [supply.at[0], INTO_CEILING, supply.at[2]]],
    joins: [panel.item.label],
    service: 'electrical',
    label: '400 V SUPPLY',
  });
  // The dosing: from the panels in the south-east corner, clipped along
  // the south wall behind everything, to the main as it leaves the heat
  // exchanger: the hypochlorite into it, the sample from it.
  const dosing = [
    {
      item: by('hypochlorite dosing pumps'),
      port: 'dose',
      service: 'hypochlorite' as const,
      name: 'Hypochlorite to the heated main',
      label: 'HYPOCHLORITE',
      y: L.dosing,
    },
    {
      item: by('dosing controller and sample cells'),
      port: 'sample',
      service: 'sample' as const,
      name: 'Sample line from the heated main',
      label: 'SAMPLE',
      y: L.dosing - 0.15,
    },
  ];
  // Each line up from its panel into the ceiling, and down out of it to
  // its point on the main beside the heat exchanger.
  dosing.forEach((d, i) => {
    const p = port(d.item, d.port);
    const s = out(p, 0.1);
    const at: Vec3 = [pheOut1[0], d.y, pheOut1[2] + 0.2 + i * 0.05];
    run({
      name: d.name,
      kind: 'chemical-tube',
      od: 0.012,
      points: [p.at, s, [s[0], INTO_CEILING, s[2]]],
      joins: [d.item.item.label],
      service: d.service,
      label: d.label,
    });
    run({
      name: `${d.name}, its point`,
      kind: 'chemical-tube',
      od: 0.012,
      points: [[at[0], INTO_CEILING, at[2]], at, [pheOut1[0], d.y, pheOut1[2]]],
      joins: ['Heat exchanger to the ozone contact tank'],
      service: d.service,
      label: d.label,
    });
  });
  // ---- Power: each machine through its isolator ------------------------------
  // Each isolator on a stand beside its machine, facing where someone
  // stands to work it; its supply down out of the ceiling's cable tray;
  // its feed up, across and down into the machine's terminal box.
  const isolators: IsolatorPlace[] = [];
  const stands: Vec3[] = [];
  const pf = pumps.footprint;
  const uvF = uv.footprint;
  const genF = generator.footprint;
  const powered: {
    machine: Placed;
    port: string;
    name: string;
    stand: [number, number];
    facing: Vec3;
    feed: number;
  }[] = [
    ...(['A', 'B'] as const).map((k) => ({
      machine: pumps,
      port: `power${k}`,
      name: `${names.pumps}${k} isolator`,
      stand: [pf.maxX + 0.4, port(pumps, `power${k}`).at[2]] as [
        number,
        number,
      ],
      facing: [1, 0, 0] as Vec3,
      feed: 2.2,
    })),
    {
      machine: uv,
      port: 'power',
      name: `${names.prefix}UV unit isolator`,
      stand: [uvF.minX + 0.15, uvF.maxZ + 1.1],
      facing: [0, 0, 1],
      feed: 2.2,
    },
    {
      machine: generator,
      port: 'power',
      name: `${names.prefix}${names.prefix ? 'ozone' : 'Ozone'} generator isolator`,
      stand: [genF.maxX - 0.2, genF.maxZ + 1.0],
      facing: [0, 0, 1],
      feed: 2.0,
    },
  ];
  for (const p of powered) {
    const [sx, sz] = p.stand;
    // The box on the stand's face, toward where it faces.
    const at: Vec3 = [
      sx + p.facing[0] * (0.03 + ISOLATOR_BOX.d / 2),
      ISOLATOR_Y,
      sz + p.facing[2] * (0.03 + ISOLATOR_BOX.d / 2),
    ];
    // Its conduits end on its two glands' tops, side by side across it
    // (`POWER_ISOLATOR.glands`; its middle is at their depth).
    const top = ISOLATOR_Y + glandTop(POWER_ISOLATOR);
    const across: Vec3 = [p.facing[2], 0, -p.facing[0]];
    const [gIn, gOut] = POWER_ISOLATOR.glands.x;
    const supplyIn: Vec3 = [
      at[0] + across[0] * gIn,
      top,
      at[2] + across[2] * gIn,
    ];
    const feedOut: Vec3 = [
      at[0] + across[0] * gOut,
      top,
      at[2] + across[2] * gOut,
    ];
    isolators.push({ name: p.name, at, facing: p.facing, supplyIn, feedOut });
    stands.push([sx, 0, sz]);
    run({
      name: `${p.name}: supply`,
      kind: 'steel-screwed',
      od: 0.0269,
      points: [[supplyIn[0], INTO_CEILING, supplyIn[2]], supplyIn],
      joins: [],
      service: 'electrical',
      label: '400 V',
    });
    const terminal = port(p.machine, p.port);
    run({
      name: `${p.name}: feed`,
      kind: 'steel-screwed',
      od: 0.0269,
      points: square(feedOut, terminal.at, p.feed, p.facing[2] !== 0),
      joins: [p.machine.item.label],
      service: 'electrical',
      label: 'FEED',
    });
  }

  // ---- Chemicals from the stores, down out of the ceiling -------------------
  const acidPump = by('acid dosing pump');
  for (const [item, name] of [
    [by('hypochlorite dosing pumps'), 'Hypochlorite from the store'],
    [acidPump, 'Acid from the store'],
  ] as const) {
    const p = port(item, 'supply');
    run({
      name,
      kind: 'chemical-tube',
      od: 0.012,
      points: [[p.at[0], INTO_CEILING, p.at[2]], p.at],
      joins: [item.item.label],
      service: 'hypochlorite',
      label: name.startsWith('Acid') ? 'ACID' : 'HYPOCHLORITE',
    });
  }
  // The acid's dose up into the ceiling and down to its point on the main.
  {
    const p = port(acidPump, 'dose');
    const s = out(p, 0.1);
    run({
      name: 'Acid to the heated main',
      kind: 'chemical-tube',
      od: 0.012,
      points: [p.at, s, [s[0], INTO_CEILING, s[2]]],
      joins: [acidPump.item.label],
      service: 'hypochlorite',
      label: 'ACID',
    });
    const at: Vec3 = [pheOut1[0], L.dosing - 0.3, pheOut1[2] + 0.3];
    run({
      name: 'Acid to the heated main, its point',
      kind: 'chemical-tube',
      od: 0.012,
      points: [
        [at[0], INTO_CEILING, at[2]],
        at,
        [pheOut1[0], at[1], pheOut1[2]],
      ],
      joins: ['Heat exchanger to the ozone contact tank'],
      service: 'hypochlorite',
      label: 'ACID',
    });
  }

  // ---- The balance tank's drain, through its valve into the floor ----------
  // Out under the tank's ladder to just beyond it, then straight down,
  // so it barely enters the walkway round the tank; its valve on the
  // drop, reached from the walkway.
  {
    const d = port(tank, 'drain');
    const f = tank.footprint;
    const [ox, , oz] = d.outward;
    const beyond =
      ox > 0.5
        ? f.maxX - d.at[0]
        : ox < -0.5
          ? d.at[0] - f.minX
          : oz > 0.5
            ? f.maxZ - d.at[2]
            : d.at[2] - f.minZ;
    const s = out(d, Math.max(0.12, beyond + 0.1));
    run({
      name: 'Balance tank drain to waste',
      kind: 'pvc-drain',
      od: d.od,
      points: [d.at, s, [s[0], DUCT_DEPTH, s[2]]],
      joins: [tank.item.label],
      service: 'drainage',
      label: 'DRAIN',
      valves: [
        {
          at: [s[0], Math.max(0.12, d.at[1] - 0.18), s[2]],
          axis: 'y',
          name: 'Balance tank drain valve',
          od: d.od,
          facing: d.outward,
        },
      ],
    });
  }

  return { runs, channels, tees, isolators, stands };
}

/** The pipework of a room, if it has any laid out yet. */
export function roomPipes(room: string): PipeRun[] {
  // A retired room's pipes and ducts are frozen (`retired-rooms.ts`).
  const retired = retiredPipes(room);
  if (retired) return retired;
  if (room === 'boiler_house') return boilerHousePipework().runs;
  if (room === 'wet_hall') return wetHallPipework().runs;
  return room in ROUTED ? poolPlantPipework(room).runs : [];
}

/** The isolators of a room, and their stands' feet. */
export function roomIsolators(room: string) {
  return room in ROUTED
    ? poolPlantPipework(room)
    : { isolators: [] as IsolatorPlace[], stands: [] as Vec3[] };
}

/** A stand's post, to walk round. */
export const standFootprint = ([x, , z]: Vec3): Footprint => ({
  minX: x - 0.05,
  maxX: x + 0.05,
  minZ: z - 0.05,
  maxZ: z + 0.05,
});

/** The floor channels of a room. */
export function roomChannels(room: string): FloorChannel[] {
  return room in ROUTED ? poolPlantPipework(room).channels : [];
}

/** The explicit three-way fittings of a room. */
export function roomTees(room: string): PipeTee[] {
  if (room === 'boiler_house') return boilerHousePipework().tees;
  if (room === 'wet_hall') return [];
  return room in ROUTED ? poolPlantPipework(room).tees : [];
}

/** The boiler house's roof over its floor, m (`shell-rooms.ts`). */
export const BOILER_ROOF = 7;
/** The flues' collectors over the boilers, and the gas header over them. */
export const FLUE_COLLECTOR = 2.6;
export const GAS_HEADER = 3.0;
/** The gas drops' level lengths, and their valves under them, within reach. */
const GAS_DROP = 2.2;
const GAS_VALVE = 1.98;

/**
 * The boiler house's pipework: its flues, its gas, and its heating water.
 *
 * The flues: each cascade of two boilers shares one flue, as a cascade
 * kit does. Each boiler's spigot rises to a collector over the pair,
 * and from the collector's middle a twin-wall stack (Ø350) goes straight
 * up through the roof.
 *
 * The gas: the supply comes up out of the ground into the gas train
 * (meter, filter, safety shut-off valve) on the east wall. From its
 * outlet a DN80 main rises to a header over the boilers, along the west
 * wall, its ends capped just past the last drops. A DN50 drop goes down
 * to each boiler, with a lever ball valve within reach to isolate it.
 *
 * The heating (LTHW): each boiler's flow and return rise into a flow
 * header and a return header behind the boilers, which run south along
 * the west wall to the low-loss header's boiler side. From its system
 * side the flow goes over the doorway to the twin-head circulator, whose
 * discharge rises to a tee: one way out through the south wall to the
 * building, the other north to the calorifier's coil. The return main
 * comes back from the coil and, joined by the building's return through
 * the south wall and the pressurisation unit's fill, to the low-loss
 * header. The calorifier's cold feed comes down from the services
 * ceiling, and its hot water and secondary return go up into it.
 */
export function boilerHousePipework(): { runs: PipeRun[]; tees: PipeTee[] } {
  const layout = layoutRoom('boiler_house')!;
  const runs: PipeRun[] = [];
  const tees: PipeTee[] = [];
  const add = (
    r: Omit<PipeRun, 'through' | 'valves'> &
      Partial<Pick<PipeRun, 'through' | 'valves'>>,
  ) => {
    const full: PipeRun = { through: [], valves: [], ...r };
    runs.push(full);
    return full;
  };
  const cascades = layout.placed
    .filter((p) => p.item.key.startsWith('boiler-cascade'))
    .sort((a, b) => a.z - b.z);
  const train = layout.placed.find((p) => p.item.key === 'gas-train')!;

  // ---- Flues: one per cascade -------------------------------------------
  cascades.forEach((c, i) => {
    const n = i + 1;
    const a = placedPort(c, 'flueA').at;
    const b = placedPort(c, 'flueB').at;
    const x = a[0];
    const mid: Vec3 = [x, FLUE_COLLECTOR, (a[2] + b[2]) / 2];
    for (const [k, p] of [
      ['A', a],
      ['B', b],
    ] as const)
      add({
        name: `Cascade ${n} flue connector ${k}`,
        kind: 'flue',
        od: 0.25,
        points: [[...p], [x, FLUE_COLLECTOR, p[2]], mid],
        joins: [c.item.label, `Cascade ${n} flue stack`],
        service: 'flue',
        label: 'FLUE',
      });
    add({
      name: `Cascade ${n} flue stack`,
      kind: 'flue',
      od: 0.35,
      points: [mid, [x, BOILER_ROOF, mid[2]]],
      joins: [`Cascade ${n} flue connector A`, `Cascade ${n} flue connector B`],
      service: 'flue',
      label: 'FLUE',
      // Out through the roof in its weathered sleeve.
      through: [
        {
          at: [x, BOILER_ROOF, mid[2]],
          normal: [0, 1, 0],
          thickness: 0.3,
          kind: 'sleeve',
        },
      ],
    });
    tees.push({
      name: `Cascade ${n} flue tee`,
      kind: 'flue',
      at: mid,
      mainOd: 0.25,
      branchOd: 0.35,
      mainDirection: [0, 0, 1],
      branchDirection: [0, 1, 0],
    });
  });

  // ---- Gas --------------------------------------------------------------
  const gasPorts = cascades.flatMap((c, i) =>
    (['A', 'B'] as const).map((k) => ({
      // The boilers' tags: B-501 and B-502 in the first cascade, on to B-506.
      name: `B-50${i * 2 + (k === 'A' ? 1 : 2)}`,
      cascade: c,
      at: placedPort(c, `gas${k}`).at,
    })),
  );
  // The header half a metre out from the boilers' gas spigots, clear of
  // their flues.
  const gx = Math.max(...gasPorts.map((g) => g.at[0])) + 0.5;
  const inlet = placedPort(train, 'inlet').at;
  const outlet = placedPort(train, 'outlet').at;
  add({
    name: 'Gas service',
    kind: 'steel-screwed',
    od: 0.0603,
    points: [[...inlet], [inlet[0], DUCT_DEPTH, inlet[2]]],
    joins: [train.item.label],
    service: 'gas',
    label: 'NATURAL GAS',
  });
  const zs = [...gasPorts.map((g) => g.at[2]), outlet[2]];
  const z0 = Math.min(...zs) - 0.15;
  const z1 = Math.max(...zs) + 0.15;
  add({
    name: 'Gas header',
    kind: 'steel-screwed',
    od: 0.0889,
    points: [
      [gx, GAS_HEADER, z0],
      [gx, GAS_HEADER, z1],
    ],
    joins: ['Gas main', ...gasPorts.map((g) => `${g.name} gas drop`)],
    service: 'gas',
    label: 'NATURAL GAS',
  });
  add({
    name: 'Gas main',
    kind: 'steel-screwed',
    od: 0.0889,
    points: [
      [...outlet],
      [outlet[0], GAS_HEADER, outlet[2]],
      [gx, GAS_HEADER, outlet[2]],
    ],
    joins: [train.item.label, 'Gas header'],
    service: 'gas',
    label: 'NATURAL GAS',
  });
  tees.push({
    name: 'Gas main tee',
    kind: 'steel-screwed',
    at: [gx, GAS_HEADER, outlet[2]],
    mainOd: 0.0889,
    branchOd: 0.0889,
    mainDirection: [0, 0, 1],
    branchDirection: [Math.sign(outlet[0] - gx), 0, 0],
  });
  for (const g of gasPorts) {
    const [px, py, pz] = g.at;
    add({
      name: `${g.name} gas drop`,
      kind: 'steel-screwed',
      od: 0.0603,
      points: [
        [gx, GAS_HEADER, pz],
        [gx, GAS_DROP, pz],
        [px, GAS_DROP, pz],
        [px, py, pz],
      ],
      joins: ['Gas header', g.cascade.item.label],
      service: 'gas',
      label: 'GAS',
      valves: [
        {
          at: [px, GAS_VALVE, pz],
          axis: 'y',
          name: `${g.name} gas isolating valve`,
          od: 0.0603,
          operator: 'lever',
          style: 'gas-ball',
          // Its lever toward the room, away from the wall.
          facing: [1, 0, 0],
        },
      ],
    });
    tees.push({
      name: `${g.name} gas header tee`,
      kind: 'steel-screwed',
      at: [gx, GAS_HEADER, pz],
      mainOd: 0.0889,
      branchOd: 0.0603,
      mainDirection: [0, 0, 1],
      branchDirection: [0, -1, 0],
    });
  }

  // ---- Heating water (LTHW) and the calorifier -------------------------
  const lagged = 'lagged-heating' as const;
  const main = 0.0889;
  const find = (key: string) => layout.placed.find((p) => p.item.key === key)!;
  const llh = find('low-loss-header');
  const pump = find('lthw-pumps');
  const press = find('pressurisation');
  const cal = find('calorifier');
  const at = (p: (typeof layout.placed)[number], name: string) =>
    placedPort(p, name).at;
  const tee = (
    name: string,
    where: Vec3,
    mainDirection: Vec3,
    branchDirection: Vec3,
    branchOd: number,
  ) =>
    tees.push({
      name,
      kind: lagged,
      at: where,
      mainOd: main,
      branchOd,
      mainDirection,
      branchDirection,
    });
  const boilers = cascades.flatMap((c, i) =>
    (['A', 'B'] as const).map((k) => ({
      tag: `B-50${i * 2 + (k === 'A' ? 1 : 2)}`,
      cascade: c,
      flow: at(c, `flow${k}`),
      ret: at(c, `return${k}`),
    })),
  );
  // The two headers behind the boilers, clear of their flues: the flow
  // above, the return lower and nearer the wall.
  const px = boilers[0].flow[0];
  const FLOW_X = px - 0.34;
  const FLOW_Y = 2.3;
  const RETURN_X = px - 0.64;
  const RETURN_Y = 2.1;
  const north =
    Math.min(...boilers.flatMap((b) => [b.flow[2], b.ret[2]])) - 0.15;
  const bf = at(llh, 'boilerFlow');
  const br = at(llh, 'boilerReturn');
  const sf = at(llh, 'systemFlow');
  const sr = at(llh, 'systemReturn');
  add({
    name: 'Boiler flow header',
    kind: lagged,
    od: main,
    points: [
      [FLOW_X, FLOW_Y, north],
      [FLOW_X, FLOW_Y, bf[2] - 0.4],
      [bf[0], FLOW_Y, bf[2] - 0.4],
      [bf[0], bf[1], bf[2] - 0.4],
      [...bf],
    ],
    joins: [llh.item.label, ...boilers.map((b) => `${b.tag} flow`)],
    service: 'heating flow',
    label: 'LTHW FLOW',
  });
  add({
    name: 'Boiler return header',
    kind: lagged,
    od: main,
    points: [
      [RETURN_X, RETURN_Y, north],
      [RETURN_X, RETURN_Y, br[2] - 0.6],
      [br[0], RETURN_Y, br[2] - 0.6],
      [br[0], br[1], br[2] - 0.6],
      [...br],
    ],
    joins: [llh.item.label, ...boilers.map((b) => `${b.tag} return`)],
    service: 'heating return',
    label: 'LTHW RETURN',
  });
  for (const b of boilers) {
    add({
      name: `${b.tag} flow`,
      kind: lagged,
      od: 0.0761,
      points: [
        [...b.flow],
        [b.flow[0], FLOW_Y, b.flow[2]],
        [FLOW_X, FLOW_Y, b.flow[2]],
      ],
      joins: [b.cascade.item.label, 'Boiler flow header'],
      service: 'heating flow',
      label: 'LTHW FLOW',
    });
    tee(
      `${b.tag} flow tee`,
      [FLOW_X, FLOW_Y, b.flow[2]],
      [0, 0, 1],
      [1, 0, 0],
      0.0761,
    );
    add({
      name: `${b.tag} return`,
      kind: lagged,
      od: 0.0761,
      points: [
        [...b.ret],
        [b.ret[0], RETURN_Y, b.ret[2]],
        [RETURN_X, RETURN_Y, b.ret[2]],
      ],
      joins: [b.cascade.item.label, 'Boiler return header'],
      service: 'heating return',
      label: 'LTHW RETURN',
    });
    tee(
      `${b.tag} return tee`,
      [RETURN_X, RETURN_Y, b.ret[2]],
      [0, 0, 1],
      [1, 0, 0],
      0.0761,
    );
  }
  // The system side: over the doorway to the circulator, which lifts the
  // flow to a tee under the services ceiling.
  const OVER_DOOR = 3.4;
  const suction = at(pump, 'suction');
  const discharge = at(pump, 'discharge');
  const pumpLane =
    suction[0] + 0.4 * Math.sign(placedPort(pump, 'suction').outward[0]);
  add({
    name: 'LTHW system flow',
    kind: lagged,
    od: main,
    points: [
      [...sf],
      [sf[0], sf[1], sf[2] + 0.37],
      [sf[0], OVER_DOOR, sf[2] + 0.37],
      [pumpLane, OVER_DOOR, sf[2] + 0.37],
      [pumpLane, OVER_DOOR, suction[2]],
      [pumpLane, suction[1], suction[2]],
      [...suction],
    ],
    joins: [llh.item.label, pump.item.label],
    service: 'heating flow',
    label: 'LTHW FLOW',
  });
  const FLOW_MAIN = 3.8;
  const riserX = discharge[0] - 0.05;
  const split: Vec3 = [riserX, FLOW_MAIN, discharge[2]];
  const south = 12.5 / 2;
  add({
    name: 'LTHW flow riser',
    kind: lagged,
    od: 0.0761,
    points: [[...discharge], [riserX, discharge[1], discharge[2]], split],
    joins: [
      pump.item.label,
      'LTHW flow to building',
      'Calorifier primary flow',
    ],
    service: 'heating flow',
    label: 'LTHW FLOW',
    valves: [
      {
        at: [riserX, 1.5, discharge[2]],
        axis: 'y',
        name: 'LTHW flow isolating valve',
        od: 0.0761,
        operator: 'lever',
        facing: [1, 0, 0],
      },
    ],
  });
  add({
    name: 'LTHW flow to building',
    kind: lagged,
    od: main,
    points: [split, [riserX, FLOW_MAIN, south]],
    joins: ['LTHW flow riser', 'Calorifier primary flow'],
    service: 'heating flow',
    label: 'LTHW FLOW',
    through: [
      {
        at: [riserX, FLOW_MAIN, south],
        normal: [0, 0, 1],
        thickness: 0.2,
        kind: 'sleeve',
      },
    ],
  });
  tee('LTHW flow tee', split, [0, 0, 1], [0, -1, 0], 0.0761);
  const cf = at(cal, 'primaryFlow');
  const cr = at(cal, 'primaryReturn');
  const coilLane = cf[0] + 0.4;
  add({
    name: 'Calorifier primary flow',
    kind: lagged,
    od: 0.0603,
    points: [
      split,
      [riserX, FLOW_MAIN, cf[2] + 0.75],
      [coilLane, FLOW_MAIN, cf[2] + 0.75],
      [coilLane, FLOW_MAIN, cf[2]],
      [coilLane, cf[1], cf[2]],
      [...cf],
    ],
    joins: ['LTHW flow riser', 'LTHW flow to building', cal.item.label],
    service: 'heating flow',
    label: 'LTHW FLOW',
  });
  // The return main: from the coil, south over the circulator, along the
  // south wall to the low-loss header.
  const RETURN_MAIN = 3.2;
  const returnLane = cr[0] + 0.2;
  const alongSouth = south - 0.2;
  const returnMain: Vec3[] = [
    [...cr],
    [returnLane, cr[1], cr[2]],
    [returnLane, cr[1], cr[2] + 0.7],
    [returnLane, RETURN_MAIN, cr[2] + 0.7],
    [returnLane, RETURN_MAIN, alongSouth],
    [sr[0], RETURN_MAIN, alongSouth],
    [sr[0], sr[1], alongSouth],
    [...sr],
  ];
  add({
    name: 'LTHW return main',
    kind: lagged,
    od: main,
    points: returnMain,
    joins: [
      cal.item.label,
      llh.item.label,
      'LTHW return from building',
      'Pressurisation fill',
    ],
    service: 'heating return',
    label: 'LTHW RETURN',
  });
  const backX = -1.8;
  add({
    name: 'LTHW return from building',
    kind: lagged,
    od: main,
    points: [
      [backX, RETURN_MAIN, south],
      [backX, RETURN_MAIN, alongSouth],
    ],
    joins: ['LTHW return main'],
    service: 'heating return',
    label: 'LTHW RETURN',
    through: [
      {
        at: [backX, RETURN_MAIN, south],
        normal: [0, 0, 1],
        thickness: 0.2,
        kind: 'sleeve',
      },
    ],
  });
  tee(
    'LTHW return tee',
    [backX, RETURN_MAIN, alongSouth],
    [1, 0, 0],
    [0, 0, 1],
    main,
  );
  const fill = at(press, 'system');
  const fillZ = cr[2] + 1.25;
  add({
    name: 'Pressurisation fill',
    kind: 'copper',
    od: 0.022,
    points: [
      [...fill],
      [fill[0], 2.7, fill[2]],
      [fill[0], 2.7, fillZ],
      [returnLane, 2.7, fillZ],
      [returnLane, RETURN_MAIN, fillZ],
    ],
    joins: [press.item.label, 'LTHW return main'],
    service: 'heating return',
    label: 'LTHW FILL',
  });
  tee(
    'Pressurisation tee',
    [returnLane, RETURN_MAIN, fillZ],
    [0, 0, 1],
    [0, -1, 0],
    0.022,
  );
  // The calorifier's own water: the cold feed down from the services
  // ceiling, the hot water and its secondary return up into it.
  const CEILING = BOILER_ROOF - 1.9 + 0.5;
  const cold = at(cal, 'coldFeed');
  const hot = at(cal, 'hotFlow');
  const secondary = at(cal, 'secondaryReturn');
  add({
    name: 'Calorifier cold feed',
    kind: 'copper',
    od: 0.054,
    points: [
      [...cold],
      [cold[0] - 0.3, cold[1], cold[2]],
      [cold[0] - 0.3, CEILING, cold[2]],
    ],
    joins: [cal.item.label],
    service: 'make-up',
    label: 'COLD FEED',
  });
  add({
    name: 'Hot water flow',
    kind: 'copper',
    od: 0.054,
    points: [[...hot], [hot[0], CEILING, hot[2]]],
    joins: [cal.item.label],
    service: 'hot water',
    label: 'HWS FLOW',
  });
  add({
    name: 'Hot water secondary return',
    kind: 'copper',
    od: 0.034,
    points: [
      [...secondary],
      [secondary[0] - 0.15, secondary[1], secondary[2]],
      [secondary[0] - 0.15, CEILING, secondary[2]],
    ],
    joins: [cal.item.label],
    service: 'hot water',
    label: 'HWS RETURN',
  });
  return { runs, tees };
}

/** The low parts of a room's pipework, under a walker's head, as footprints to walk round. */
export function pipeObstacles(
  runs: readonly PipeRun[],
  below = 1.9,
): Footprint[] {
  const out: Footprint[] = [];
  for (const r of runs)
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1];
      const b = r.points[i];
      if (Math.min(a[1], b[1]) - r.od / 2 >= below) continue;
      // Under the floor, in its duct, out of the way.
      if (Math.max(a[1], b[1]) + r.od / 2 <= 0) continue;
      out.push({
        minX: Math.min(a[0], b[0]) - r.od / 2,
        maxX: Math.max(a[0], b[0]) + r.od / 2,
        minZ: Math.min(a[2], b[2]) - r.od / 2,
        maxZ: Math.max(a[2], b[2]) + r.od / 2,
      });
    }
  return out;
}

/** The wet hall's roof over its floor, from its structure (`roomStructure`). */
const WET_HALL_ROOF = WET_HALL_SOFFIT;

/**
 * The wet hall's pipework (`src/game/plant/wet-hall.ts`), port to port:
 *
 * - the town main down through the roof to the break tank's float valve,
 *   by its stop valve (chain-worked, over the tank);
 * - the break tank's outlet to the booster set's suction, isolated;
 * - the booster set's discharge up to the meter, and on from the meter up
 *   through the roof: the make-up main to the pool plant rooms, isolated;
 * - the backwash main down through the roof into the holding tank, and
 *   its discharge pump's riser over the tank's front and down to the foul
 *   sewer under the floor, isolated;
 * - each tank's overflow and drain down into the floor's drainage.
 *
 * Copper for the water, PVC for the waste. Pure: metres, the room's
 * frame, its floor at y = 0.
 */
export function wetHallPipework(): { runs: PipeRun[] } {
  const layout = layoutRoom('wet_hall')!;
  const find = (key: string) => layout.placed.find((p) => p.item.key === key)!;
  const at = (key: string, name: string) => placedPort(find(key), name).at;
  const runs: PipeRun[] = [];
  const roof = (x: number, z: number): WallCrossing => ({
    at: [x, WET_HALL_ROOF, z],
    normal: [0, 1, 0],
    thickness: 0.3,
    kind: 'sleeve',
  });
  const valve = (
    name: string,
    where: Vec3,
    axis: Valve['axis'],
    od: number,
    facing: Vec3,
    operator: Valve['operator'] = 'lever',
  ): Valve => ({ at: where, axis, name, od, operator, facing });
  const tank = find('break-tank').item.label;
  const booster = find('booster-set').item.label;
  const meter = find('water-meter').item.label;
  const holding = find('backwash-tank').item.label;

  // ---- Make-up ------------------------------------------------------------
  // The main comes down in front of the tank, over the floor, where its
  // stop valve's chain hangs to hand, and crosses over the tank's roof.
  const mains = at('break-tank', 'mainsIn');
  const mainsZ = find('break-tank').footprint.maxZ + 0.3;
  const mainsY = mains[1] + 0.5;
  runs.push({
    name: 'Town main to the break tank',
    kind: 'copper',
    od: 0.067,
    points: [
      [...mains],
      [mains[0], mainsY, mains[2]],
      [mains[0], mainsY, mainsZ],
      [mains[0], WET_HALL_ROOF, mainsZ],
    ],
    joins: [tank],
    service: 'make-up',
    label: 'MAINS COLD WATER',
    through: [roof(mains[0], mainsZ)],
    valves: [
      valve(
        'Town main stop valve',
        [mains[0], mainsY + 0.5, mainsZ],
        'y',
        0.067,
        [0, 0, 1],
        'chain',
      ),
    ],
  });
  const out = at('break-tank', 'outlet');
  const suction = at('booster-set', 'suction');
  const sx = (out[0] + suction[0]) / 2;
  runs.push({
    name: 'Break tank to the booster set',
    kind: 'copper',
    od: 0.089,
    points: [
      [...out],
      [sx, out[1], out[2]],
      [sx, out[1], suction[2]],
      [sx, suction[1], suction[2]],
      [...suction],
    ],
    joins: [tank, booster],
    service: 'make-up',
    label: 'BREAK TANK OUTLET',
    through: [],
    valves: [
      valve(
        'Break tank outlet valve',
        [sx, out[1], (out[2] + suction[2]) / 2],
        'z',
        0.089,
        [1, 0, 0],
      ),
    ],
  });
  const discharge = at('booster-set', 'discharge');
  const inlet = at('water-meter', 'inlet');
  const dx = (discharge[0] + inlet[0]) / 2;
  runs.push({
    name: 'Booster set to the meter',
    kind: 'copper',
    od: 0.076,
    points: [
      [...discharge],
      [dx, discharge[1], discharge[2]],
      [dx, inlet[1], discharge[2]],
      [...inlet],
    ],
    joins: [booster, meter],
    service: 'make-up',
    label: 'MAKE-UP',
    through: [],
    valves: [],
  });
  const outlet = at('water-meter', 'outlet');
  const mx = outlet[0] + 0.3;
  runs.push({
    name: 'Make-up main to the pool plant rooms',
    kind: 'copper',
    od: 0.076,
    points: [
      [...outlet],
      [mx, outlet[1], outlet[2]],
      [mx, WET_HALL_ROOF, outlet[2]],
    ],
    joins: [meter],
    service: 'make-up',
    label: 'MAKE-UP MAIN',
    through: [roof(mx, outlet[2])],
    valves: [
      valve('Make-up main valve', [mx, 1.5, outlet[2]], 'y', 0.076, [0, 0, 1]),
    ],
  });

  // ---- Backwash -----------------------------------------------------------
  const bw = at('backwash-tank', 'inlet');
  runs.push({
    name: 'Backwash main to the holding tank',
    kind: 'pvc-drain',
    od: 0.16,
    points: [[bw[0], WET_HALL_ROOF, bw[2]], [...bw]],
    joins: [holding],
    service: 'drainage',
    label: 'BACKWASH',
    through: [roof(bw[0], bw[2])],
    valves: [],
  });
  const riser = at('backwash-tank', 'discharge');
  const front = find('backwash-tank').footprint.maxZ + 0.4;
  const over = riser[1] + 0.5;
  runs.push({
    name: 'Backwash discharge to the sewer',
    kind: 'pvc-pressure',
    od: 0.076,
    points: [
      [...riser],
      [riser[0], over, riser[2]],
      [riser[0], over, front],
      [riser[0], 0, front],
    ],
    joins: [holding],
    service: 'drainage',
    label: 'BACKWASH TO SEWER',
    through: [],
    valves: [
      valve(
        'Backwash discharge valve',
        [riser[0], 1.2, front],
        'y',
        0.076,
        [0, 0, 1],
      ),
    ],
  });

  // ---- Overflows and drains, into the floor -----------------------------
  for (const [key, label] of [
    ['break-tank', 'Break tank'],
    ['backwash-tank', 'Backwash tank'],
  ] as const) {
    const machine = find(key).item.label;
    const o = placedPort(find(key), 'overflow');
    const ox = o.at[0] + o.outward[0] * 0.3;
    runs.push({
      name: `${label} overflow`,
      kind: 'pvc-drain',
      od: o.od,
      points: [[...o.at], [ox, o.at[1], o.at[2]], [ox, 0, o.at[2]]],
      joins: [machine],
      service: 'drainage',
      label: 'OVERFLOW',
      through: [],
      valves: [],
    });
    // Each drain out past the tank's front (its ladder), its valve there.
    const d = placedPort(find(key), 'drain');
    const dz = find(key).footprint.maxZ + 0.15;
    runs.push({
      name: `${label} drain`,
      kind: 'pvc-drain',
      od: d.od,
      points: [[...d.at], [d.at[0], d.at[1], dz], [d.at[0], 0, dz]],
      joins: [machine],
      service: 'drainage',
      label: 'DRAIN',
      through: [],
      valves: [
        valve(
          `${label} drain valve`,
          [d.at[0], d.at[1], dz - 0.2],
          'z',
          d.od,
          [1, 0, 0],
        ),
      ],
    });
  }
  return { runs };
}
