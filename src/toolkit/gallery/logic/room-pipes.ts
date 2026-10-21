import type { Footprint } from '../../controls/logic/walk-collision';
import { layoutRoom } from './room-equipment';
import type { Placed } from './room-equipment';
import { placedPort } from './machine-ports';

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
  | 'sample';

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
    | 'steel-screwed';
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
/**
 * Into the services ceiling, under the 8 m roof: a run that ends here
 * goes on out of sight to wherever it comes from (the central plant).
 */
export const INTO_CEILING = 8 - 1.9;

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

/** Under the services ceiling: 1.9 m below the roof. */
export const CEILING_ZONE = 1.9;

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
const axisOf = (a: Vec3, b: Vec3): 'x' | 'y' | 'z' =>
  Math.abs(a[0] - b[0]) > 1e-9 ? 'x' : Math.abs(a[1] - b[1]) > 1e-9 ? 'y' : 'z';
/** A point `s` metres along from `a` toward `b`. */
const toward = (a: Vec3, b: Vec3, s: number): Vec3 => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  return [0, 1, 2].map(
    (k) => a[k] + ((b[k] - a[k]) * s) / d,
  ) as unknown as Vec3;
};

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
const ISOLATOR_BOX = { h: 0.17, d: 0.105 };

/** The room's runs and floor channels. */
export function olympicPipework(): {
  runs: PipeRun[];
  channels: FloorChannel[];
  tees: PipeTee[];
  isolators: IsolatorPlace[];
  stands: Vec3[];
} {
  const layout = layoutRoom('plant_pool_02')!;
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
    joins: [pumps.item.label, 'Filter inlet header'],
    service: 'pool water',
    label: 'DISCHARGE',
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
  const IN_LINE = 0.8;
  // Measured from the vessels' fronts: their outlets, in the middle.
  const lineZ = (line: number) => south[0].outlet.at[2] - line;
  const lineX = (line: number) => east[0].outlet.at[0] - line;
  // The inlet header: up from the pumps, south to the south row's line,
  // east along it, north along the east column's.
  const inSouthZ = lineZ(IN_LINE);
  const inEastX = lineX(IN_LINE);
  const northmost = Math.min(...east.map((x) => x.inlet.at[2]));
  const inletHeader = run({
    name: 'Filter inlet header',
    kind: 'pvc-pressure',
    od: main,
    points: [
      discharge.at,
      [discharge.at[0], L.filterIn, discharge.at[2]],
      [discharge.at[0], L.filterIn, inSouthZ],
      [inEastX, L.filterIn, inSouthZ],
      [inEastX, L.filterIn, northmost],
    ],
    joins: ['Pump discharge header'],
    service: 'pool water',
    label: 'TO FILTERS',
  });
  const outSouthZ = lineZ(OUT_LINE);
  const outEastX = lineX(OUT_LINE);
  const westmost = Math.min(...south.map((x) => x.outlet.at[0]));
  const outNorthmost = Math.min(...east.map((x) => x.outlet.at[2]));
  const outletHeader = run({
    name: 'Filter outlet header',
    kind: 'pvc-pressure',
    od: main,
    points: [
      [westmost, L.filterOut, outSouthZ],
      [outEastX, L.filterOut, outSouthZ],
      [outEastX, L.filterOut, outNorthmost],
    ],
    joins: [],
    service: 'pool water',
    label: 'FILTERED',
  });
  // The floor channels: along each row's front, under the inlet header's
  // line, and on to the south wall's drainage.
  channels.push({
    from: [Math.min(...south.map((x) => x.inlet.at[0])) - 0.4, 0, inSouthZ],
    to: [Math.max(...south.map((x) => x.drain.at[0])) + 0.4, 0, inSouthZ],
    width: 0.3,
  });
  // Through the gap between the two filters of the south row.
  const gapX = (south[0].f.footprint.maxX + south[1].f.footprint.minX) / 2;
  channels.push({ from: [gapX, 0, inSouthZ], to: [gapX, 0, h], width: 0.3 });
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
    run({
      name: `Filter ${n} inlet`,
      kind: 'pvc-pressure',
      od: inlet.od,
      points: [[inTee[0], L.filterIn, inTee[2]], inTee, inlet.at],
      joins: [f.item.label, inletHeader.name, `Filter ${n} backwash waste`],
      service: 'pool water',
      label: `F${n} INLET`,
      valves: [
        {
          // Far enough out that its chain hangs clear of the vessel.
          at: toward(inlet.at, inTee, 0.5),
          axis: axisOf(inlet.at, inTee),
          name: `F${n} inlet valve`,
          facing: dir,
          od: inlet.od,
        },
      ],
    });
    // The backwash waste: down from the inlet branch's corner into the channel.
    run({
      name: `Filter ${n} backwash waste`,
      kind: 'pvc-pressure',
      od: inlet.od,
      points: [inTee, [inTee[0], 0.05, inTee[2]]],
      joins: [`Filter ${n} inlet`],
      service: 'drainage',
      label: `F${n} WASTE`,
      valves: [
        {
          at: [inTee[0], 1.1, inTee[2]],
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
          at: toward(drain.at, drainEnd, 0.25),
          axis: axisOf(drain.at, drainEnd),
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
      name: `P-101${k} isolator`,
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
      name: 'UV unit isolator',
      stand: [uvF.minX + 0.15, uvF.maxZ + 1.1],
      facing: [0, 0, 1],
      feed: 2.2,
    },
    {
      machine: generator,
      port: 'power',
      name: 'Ozone generator isolator',
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
    const top = ISOLATOR_Y + ISOLATOR_BOX.h / 2 + 0.02;
    // Its two glands side by side across its face.
    const across: Vec3 = [p.facing[2], 0, -p.facing[0]];
    const supplyIn: Vec3 = [
      at[0] - across[0] * 0.03,
      top,
      at[2] - across[2] * 0.03,
    ];
    const feedOut: Vec3 = [
      at[0] + across[0] * 0.03,
      top,
      at[2] + across[2] * 0.03,
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
  {
    const d = port(tank, 'drain');
    const s = out(d, 0.35);
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
          at: toward(d.at, s, 0.15),
          axis: axisOf(d.at, s),
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
  return room === 'plant_pool_02' ? olympicPipework().runs : [];
}

/** The isolators of a room, and their stands' feet. */
export function roomIsolators(room: string) {
  return room === 'plant_pool_02'
    ? olympicPipework()
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
  return room === 'plant_pool_02' ? olympicPipework().channels : [];
}

/** The explicit three-way fittings of a room. */
export function roomTees(room: string): PipeTee[] {
  return room === 'plant_pool_02' ? olympicPipework().tees : [];
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
