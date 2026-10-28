import { expandForPlumbing } from './plumbing-expansion';
import type {
  Expansion,
  FittingKind,
  GivenFitting,
  PlumbEdge,
} from './plumbing-expansion';
import type { SchematicNode } from './schematics';
import { effectiveness } from './pool-heating';
import { filterSizing } from './ideal-filter';
import { gaugeBar, solveNetwork } from '../sim/hydraulics';
import type { NetLink, NetNode } from '../sim/hydraulics';

/**
 * The ideal pool plant (dev51, mission 106; the owner, 2026-10-28): a
 * swimming pool's whole process as a working three-dimensional schematic,
 * the tanks and pools idealised, everything between them real. The ideal
 * pool overflows by gravity to the ideal balance tank; one circulation
 * pump draws from the tank and pushes through a sand filter and an
 * electromagnetic flowmeter to a split, most of the water through a
 * throttling bypass, the rest through a plate heat exchanger's secondary;
 * the two join and return to the pool. An ideal hot-water source heats the
 * exchanger's primary through its own throttling valve.
 *
 * The schematic is the one source of truth: its machines, its links, every
 * valve (each given, with its role and normal state, so the plumber adds
 * nothing) and every instrument; tags are derived from it. The model solves
 * the water network with the plant's own solver (`solveNetwork`) whenever a
 * valve or the pump changes, and steps the heat each tick: the exchanger by
 * effectiveness, the pool a thermal mass losing heat to its hall, the
 * thermometers lagging the water. Pure; heads in metres above the plant
 * room's floor, flows in m³/h, temperatures in °C, heat in kW, seconds.
 */

// ---- The schematic -----------------------------------------------------------

/** The room's code, the first part of every tag. */
export const ROOM_CODE = 'IPP';

export type MachineId =
  | 'pool'
  | 'tank'
  | 'pump'
  | 'filter'
  | 'split'
  | 'join'
  | 'hx'
  | 'heat'
  | 'heatReturn';

export const NODES: readonly (SchematicNode & { id: MachineId })[] = [
  { id: 'pool', kind: 'ideal-pool', code: 'IP1', name: 'Ideal pool' },
  {
    id: 'tank',
    kind: 'ideal-balance-tank',
    code: 'BT1',
    name: 'Ideal balance tank',
  },
  {
    id: 'pump',
    kind: 'end-suction-pump',
    code: 'P1',
    name: 'Circulation pump',
  },
  { id: 'filter', kind: 'sand-filter', code: 'F1', name: 'Sand filter' },
  { id: 'split', kind: 'tee', code: 'TE1', name: 'Bypass tee' },
  { id: 'join', kind: 'tee', code: 'TE2', name: 'Return tee' },
  {
    id: 'hx',
    kind: 'plate-heat-exchanger',
    code: 'HX1',
    name: 'Pool heat exchanger',
  },
  {
    id: 'heat',
    kind: 'ideal-heat-source',
    code: 'HS1',
    name: 'Ideal hot-water source',
  },
  {
    id: 'heatReturn',
    kind: 'ideal-heat-sink',
    code: 'HS2',
    name: 'Ideal hot-water return',
  },
];

export type LinkId =
  | 'overflow'
  | 'suction'
  | 'discharge'
  | 'filtered'
  | 'bypass'
  | 'hxIn'
  | 'hxOut'
  | 'returnMain'
  | 'primaryFlow'
  | 'primaryReturn';

const link = (
  id: LinkId,
  from: [MachineId, string],
  to: [MachineId, string],
): PlumbEdge & { id: LinkId } => ({
  id,
  sourceId: from[0],
  sourcePort: from[1],
  targetId: to[0],
  targetPort: to[1],
  medium: 'water',
});

/** The links, each as its pipe is drawn, source to target in the way the water flows. */
export const LINKS: readonly (PlumbEdge & { id: LinkId })[] = [
  link('overflow', ['pool', 'overflow'], ['tank', 'inlet']),
  link('suction', ['tank', 'outlet'], ['pump', 'suction']),
  link('discharge', ['pump', 'discharge'], ['filter', 'inlet']),
  link('filtered', ['filter', 'outlet'], ['split', 'in']),
  link('bypass', ['split', 'run'], ['join', 'run']),
  link('hxIn', ['split', 'branch'], ['hx', 'secondary-in']),
  link('hxOut', ['hx', 'secondary-out'], ['join', 'branch']),
  link('returnMain', ['join', 'out'], ['pool', 'return']),
  link('primaryFlow', ['heat', 'out-1'], ['hx', 'primary-in']),
  link('primaryReturn', ['hx', 'primary-out'], ['heatReturn', 'in-1']),
];

/** What each link carries, in words, for its pipe's label. */
export const LINK_NAMES: Record<LinkId, string> = {
  overflow: 'Pool overflow',
  suction: 'Pump suction',
  discharge: 'Pump discharge',
  filtered: 'Filtered water',
  bypass: 'Heat exchanger bypass',
  hxIn: 'To heat exchanger',
  hxOut: 'From heat exchanger',
  returnMain: 'Return to pool',
  primaryFlow: 'LTHW flow',
  primaryReturn: 'LTHW return',
};

/** Each link's pipe: its nominal bore, mm. */
export const LINK_DN: Record<LinkId, 40 | 100 | 150> = {
  overflow: 150,
  suction: 150,
  discharge: 150,
  filtered: 150,
  bypass: 150,
  hxIn: 100,
  hxOut: 100,
  returnMain: 150,
  primaryFlow: 40,
  primaryReturn: 40,
};

export type ValveId =
  | 'pump.suction.iso'
  | 'pump.discharge.nrv'
  | 'pump.discharge.iso'
  | 'filter.inlet.iso'
  | 'filter.outlet.iso'
  | 'bypass.valve'
  | 'hx.secondary-in.iso'
  | 'hx.secondary-out.iso'
  | 'heat.out-1.valve'
  | 'hx.primary-in.iso'
  | 'hx.primary-out.iso';

export type MeterId =
  | 'filter.outlet.meter'
  | 'bypass.meter'
  | 'hx.secondary.meter'
  | 'heat.out-1.meter';

/** A schematic fitting with what the room needs of it: the machine its tag hangs from. */
export interface PlantFitting extends GivenFitting {
  /** The machine whose tag it extends (a valve), or none (an instrument, tagged by its loop). */
  of?: MachineId;
  /** A meter's kind of instrument, after the product it is modelled on. */
  meter?: 'electromagnetic' | 'paddle-wheel' | 'variable-area';
  /** A valve's openings the visitor can set it to (a notch plate), or none: on or off. */
  throttles?: boolean;
  /** A valve's normal opening, 0 to 1, where it is not simply open or shut. */
  normalOpening?: number;
}

const valve = (
  id: ValveId,
  edge: LinkId,
  end: 'source' | 'target',
  role: string,
  of: MachineId | undefined,
  options: Partial<PlantFitting> = {},
): PlantFitting => ({
  id,
  kind: 'isolating-valve',
  edge,
  end,
  normally: 'open',
  role,
  operator: 'lever',
  throttles: true,
  ...(of ? { of } : {}),
  ...options,
});

const meter = (
  id: MeterId,
  edge: LinkId,
  end: 'source' | 'target',
  role: string,
  kind: PlantFitting['meter'],
): PlantFitting => ({
  id,
  kind: 'flowmeter',
  edge,
  end,
  normally: 'open',
  role,
  meter: kind,
});

/**
 * Every fitting on the lines, in the order the plumber sets them from each
 * end: a manual butterfly valve (lever and notch plate) at each machine's
 * connection, the pump's non-return valve, the bypass's balancing valve and
 * the primary's control valve, and the four flowmeters.
 */
export const FITTINGS: readonly PlantFitting[] = [
  valve('pump.suction.iso', 'suction', 'target', 'pump suction', 'pump'),
  {
    id: 'pump.discharge.nrv',
    kind: 'non-return-valve',
    edge: 'discharge',
    end: 'source',
    normally: 'open',
    role: 'pump non-return',
    of: 'pump',
  },
  valve('pump.discharge.iso', 'discharge', 'source', 'pump discharge', 'pump'),
  valve('filter.inlet.iso', 'discharge', 'target', 'filter inlet', 'filter'),
  valve('filter.outlet.iso', 'filtered', 'source', 'filter outlet', 'filter'),
  meter(
    'filter.outlet.meter',
    'filtered',
    'source',
    'circulation',
    'electromagnetic',
  ),
  valve('bypass.valve', 'bypass', 'source', 'exchanger bypass', 'hx', {
    normalOpening: 0.6,
  }),
  meter('bypass.meter', 'bypass', 'source', 'bypass flow', 'variable-area'),
  meter(
    'hx.secondary.meter',
    'hxIn',
    'source',
    'exchanger secondary',
    'paddle-wheel',
  ),
  valve(
    'hx.secondary-in.iso',
    'hxIn',
    'target',
    'exchanger secondary inlet',
    'hx',
  ),
  valve(
    'hx.secondary-out.iso',
    'hxOut',
    'source',
    'exchanger secondary outlet',
    'hx',
  ),
  valve(
    'heat.out-1.valve',
    'primaryFlow',
    'source',
    'heating control',
    'heat',
    {
      normally: 'closed',
      normalOpening: 0,
    },
  ),
  meter(
    'heat.out-1.meter',
    'primaryFlow',
    'source',
    'exchanger primary',
    'variable-area',
  ),
  valve(
    'hx.primary-in.iso',
    'primaryFlow',
    'target',
    'exchanger primary inlet',
    'hx',
  ),
  valve(
    'hx.primary-out.iso',
    'primaryReturn',
    'source',
    'exchanger primary outlet',
    'hx',
  ),
];

/** The valves a visitor works: every fitting but the meters and the non-return valve. */
export const VALVES = FITTINGS.filter((f) => f.kind === 'isolating-valve').map(
  (f) => f.id as ValveId,
);

export type InstrumentKind = 'pressure' | 'differential' | 'temperature';

/** A gauge or thermometer: where it reads, and what. */
export interface Instrument {
  id: string;
  kind: InstrumentKind;
  /** The point it reads: a network node (pressure), or a stream (temperature). */
  reads: string;
  /** What it is for, in words. */
  role: string;
  /** The machine it is fitted to, if it is part of one (the pump's own gauges). */
  on?: MachineId;
  /** The link it is set into, for one set on a pipe. */
  edge?: LinkId;
}

/**
 * The gauges and thermometers, as a real plant room would have them: the
 * pump's suction and discharge gauges (on the pump), the filter's inlet and
 * outlet gauges (on its face) and its differential gauge, and thermometers
 * on the water from the pool, the exchanger's secondary outlet, the return
 * to the pool, and the exchanger's primary in and out.
 */
export const INSTRUMENTS: readonly Instrument[] = [
  {
    id: 'pump.suction.pi',
    kind: 'pressure',
    reads: 'pumpIn',
    role: 'pump suction',
    on: 'pump',
  },
  {
    id: 'pump.discharge.pi',
    kind: 'pressure',
    reads: 'pumpOut',
    role: 'pump discharge',
    on: 'pump',
  },
  {
    id: 'filter.inlet.pi',
    kind: 'pressure',
    reads: 'filterIn',
    role: 'filter inlet',
    on: 'filter',
  },
  {
    id: 'filter.outlet.pi',
    kind: 'pressure',
    reads: 'filterOut',
    role: 'filter outlet',
    on: 'filter',
  },
  {
    id: 'filter.pdi',
    kind: 'differential',
    reads: 'filterIn-filterOut',
    role: 'filter differential',
    on: 'filter',
  },
  {
    id: 'suction.ti',
    kind: 'temperature',
    reads: 'fromPool',
    role: 'water from the pool',
    edge: 'suction',
  },
  {
    id: 'hxOut.ti',
    kind: 'temperature',
    reads: 'hxSecondaryOut',
    role: 'exchanger secondary outlet',
    edge: 'hxOut',
  },
  {
    id: 'returnMain.ti',
    kind: 'temperature',
    reads: 'toPool',
    role: 'water to the pool',
    edge: 'returnMain',
  },
  {
    id: 'primaryFlow.ti',
    kind: 'temperature',
    reads: 'primaryIn',
    role: 'exchanger primary inlet',
    edge: 'primaryFlow',
  },
  {
    id: 'primaryReturn.ti',
    kind: 'temperature',
    reads: 'primaryOut',
    role: 'exchanger primary outlet',
    edge: 'primaryReturn',
  },
];

// ---- Tags, derived -------------------------------------------------------------

const nodeById = new Map(NODES.map((n) => [n.id, n]));

/** A machine's tag: the room's code and its own (IPP-P1). */
export const machineTag = (id: MachineId) =>
  `${ROOM_CODE}-${nodeById.get(id)!.code}`;

/** The ISA letters of an instrument or meter: FT, FI, PI, PDI, TI. */
function instrumentLetters(f: PlantFitting | Instrument): string {
  if ('meter' in f && f.meter)
    return f.meter === 'electromagnetic' ? 'FT' : 'FI';
  const i = f as Instrument;
  return i.kind === 'pressure'
    ? 'PI'
    : i.kind === 'differential'
      ? 'PDI'
      : 'TI';
}

/**
 * Every tag, derived from the schematic and never written by hand: a valve
 * its machine's tag and its own number among that machine's valves (IPP-P1-V1;
 * a non-return valve NRV); a meter or instrument its letters and its number
 * among those of its kind, in the schematic's order (IPP-FT1, IPP-FI1,
 * IPP-PI1, IPP-TI1).
 */
export const TAGS: Readonly<Record<string, string>> = (() => {
  const tags: Record<string, string> = {};
  const count = new Map<string, number>();
  const next = (key: string) => {
    const n = (count.get(key) ?? 0) + 1;
    count.set(key, n);
    return n;
  };
  for (const f of FITTINGS) {
    if (f.kind === 'flowmeter') {
      const letters = instrumentLetters(f);
      // Flow instruments share one loop numbering: FT1, FI2, FI3…
      tags[f.id] = `${ROOM_CODE}-${letters}${next('F')}`;
    } else {
      const letter = f.kind === 'non-return-valve' ? 'NRV' : 'V';
      tags[f.id] = `${machineTag(f.of!)}-${letter}${next(`${f.of}.${letter}`)}`;
    }
  }
  for (const i of INSTRUMENTS) {
    const letters = instrumentLetters(i);
    tags[i.id] = `${ROOM_CODE}-${letters}${next(letters)}`;
  }
  for (const n of NODES) tags[n.id] = machineTag(n.id);
  return tags;
})();

/** A tag's short form, as a placard or the mimic prints it: FI2, P1-V1. */
export const shortTag = (id: string) => TAGS[id].slice(ROOM_CODE.length + 1);

/** What a fitting is, in words, from the model: "Pump suction valve". */
export function fittingName(f: PlantFitting): string {
  const role = f.role ?? '';
  const words = role.charAt(0).toUpperCase() + role.slice(1);
  if (f.kind === 'flowmeter')
    return `${words} flowmeter (${
      f.meter === 'electromagnetic'
        ? 'electromagnetic'
        : f.meter === 'paddle-wheel'
          ? 'paddle wheel'
          : 'variable area'
    })`;
  if (f.kind === 'non-return-valve') return 'Pump non-return valve';
  return `${words} valve`;
}

/** What a machine is connected to, from the links: "from the Ideal balance tank; to the Sand filter". */
export function connectionsOf(id: MachineId): { from: string[]; to: string[] } {
  const name = (m: string) => nodeById.get(m as MachineId)?.name ?? m;
  return {
    from: LINKS.filter((l) => l.targetId === id).map((l) => name(l.sourceId)),
    to: LINKS.filter((l) => l.sourceId === id).map((l) => name(l.targetId)),
  };
}

/** The plumber's rules: isolate the pump's, filter's and exchanger's water connections; a non-return valve on the pump. */
export const RULES = {
  isolate: new Set(['end-suction-pump', 'sand-filter', 'plate-heat-exchanger']),
  pumps: new Set(['end-suction-pump']),
  discharge: 'discharge',
} as const;

/** The enhanced network: the schematic expanded by the plumber, its fittings given. */
export function idealPlantExpansion(): Expansion {
  return expandForPlumbing(NODES, LINKS, { ...RULES, given: FITTINGS });
}

// ---- The physics -------------------------------------------------------------

/** The filter's size: Ø2.8 m, a 1 m bed (`filterSizing`). */
export const FILTER_SPEC = { diameter: 2.8 } as const;

export const PLANT = {
  /** The pool's and the balance tank's water levels, m above the plant room's floor (ideal: fixed). */
  poolHead: 1.7,
  tankHead: 1.2,
  /** The pool: 25 m × 12.5 m × 1.5 m. */
  poolVolume: 470,
  /** The balance tank's water, m³. */
  tankVolume: 30,
  /** The pump's curve, after the Grundflow NKC 150-315's plate (Q 300 m³/h, H 18 m): H = shutoff − k·Q². */
  pumpShutoff: 22,
  pumpK: 4 / 300 ** 2,
  /** Its centre line, m above the floor, where its gauges read. */
  pumpAxis: 0.68,
  /** The filter's gauges' height, m. */
  filterGauges: 1.4,
  /** The ideal hot-water source: its pressure, bar, and its water, °C; its most, m³/h. */
  sourceBar: 0.4,
  sourceC: 80,
  sourceMax: 10,
  /** The exchanger's conductance, kW/K. */
  hxUA: 12,
  /** The pool's heat loss to its hall: kW per kelvin over this, °C. */
  poolUA: 12.5,
  hallReference: 20,
  /** The plant room's air, °C: still water in a pipe drifts to it. */
  roomC: 22,
  /** Lags, s: the exchanger's outlets, the thermometers, still water in a pipe. */
  exchangerLag: 15,
  sensorLag: 6,
  stillLag: 900,
  /** The water at the start, °C. */
  startC: 27,
} as const;

/** A resistance that loses `metres` at `flow`. */
const r = (metres: number, flow: number) => metres / (flow * flow);

/** Resistances, m per (m³/h)², each from a loss at a flow a real plant would see. */
export const RESISTANCE = {
  suctionPipe: r(0.15, 150),
  dischargePipe: r(0.6, 150),
  nonReturn: r(0.5, 150),
  filteredPipe: r(0.4, 150),
  /** The clean bed at its design flow loses its clean head (`filterSizing`). */
  filterBed: r(
    filterSizing(FILTER_SPEC).cleanHead,
    filterSizing(FILTER_SPEC).designFlow,
  ),
  bypassPipe: r(0.2, 100),
  hxPipe: r(0.3, 50),
  hxSecondary: r(3, 50),
  /** The return main and the pool's inlets. */
  returnMain: r(7, 150),
  /** The hot-water source's own, taking half its pressure at its most (as an experimental source's). */
  source: r((PLANT.sourceBar * 10.2) / 2, PLANT.sourceMax),
  primaryPipe: r(1.4, 3),
  hxPrimary: r(2, 3),
  /** An open butterfly valve, by bore. */
  valveOpen: { 150: r(0.15, 150), 100: r(0.1, 50), 40: r(0.1, 3) },
} as const;

/** A butterfly's flow coefficient at an opening, as a share of its full: about the square of the opening. */
export const valveCharacteristic = (opening: number) =>
  Math.max(0, Math.min(1, opening)) ** 2;

/** The openings a valve's notch plate holds: shut, four throttled notches and open. */
export const NOTCHES: readonly number[] = [0, 0.2, 0.4, 0.6, 0.8, 1];

export type TimeSpeed = 1 | 60 | 600;
export const SPEEDS: readonly TimeSpeed[] = [1, 60, 600];

export interface IdealPlantState {
  /** Each valve's opening, 0 shut to 1 open. */
  opening: Record<ValveId, number>;
  pumpRunning: boolean;
  /** The pool's and the tank's water, °C. */
  poolC: number;
  tankC: number;
  /** The exchanger's outlets, as the water leaves them, °C. */
  hxSecondaryOut: number;
  hxPrimaryOut: number;
  /** The water at each thermometer's point, °C (lagging what flows past it). */
  point: Record<
    'fromPool' | 'hxSecondaryOut' | 'toPool' | 'primaryIn' | 'primaryOut',
    number
  >;
  /** What each thermometer reads, by its instrument's id. */
  thermometer: Record<string, number>;
  speed: TimeSpeed;
  /** Seconds of plant time since the start. */
  seconds: number;
  /** Real seconds since the last reset, for the button's light. */
  sinceReset: number;
}

const valveById = new Map(FITTINGS.map((f) => [f.id, f]));

/** A valve's normal opening, as the schematic has it. */
export const normalOpening = (id: ValveId) => {
  const f = valveById.get(id)!;
  return f.normalOpening ?? (f.normally === 'open' ? 1 : 0);
};

/** The plant as it starts: every valve at its normal position, the pump running, the heating off, the water at 27 °C. */
export function newIdealPlant(): IdealPlantState {
  const c = PLANT.startC;
  return {
    opening: Object.fromEntries(
      VALVES.map((v) => [v, normalOpening(v)]),
    ) as Record<ValveId, number>,
    pumpRunning: true,
    poolC: c,
    tankC: c,
    hxSecondaryOut: c,
    hxPrimaryOut: PLANT.roomC,
    point: {
      fromPool: c,
      hxSecondaryOut: c,
      toPool: c,
      primaryIn: PLANT.roomC,
      primaryOut: PLANT.roomC,
    },
    thermometer: Object.fromEntries(
      INSTRUMENTS.filter((i) => i.kind === 'temperature').map((i) => [
        i.id,
        i.reads.startsWith('primary') ? PLANT.roomC : c,
      ]),
    ),
    speed: 1,
    seconds: 0,
    sinceReset: Infinity,
  };
}

export type IdealPlantAction =
  | { type: 'valve'; id: ValveId; opening: number }
  /** One notch more open (+1) or more shut (−1). */
  | { type: 'notch'; id: ValveId; by: 1 | -1 }
  | { type: 'pump'; run: boolean }
  | { type: 'speed'; speed: TimeSpeed }
  | { type: 'reset' };

export function actOnPlant(
  s: IdealPlantState,
  a: IdealPlantAction,
): IdealPlantState {
  switch (a.type) {
    case 'valve':
      return {
        ...s,
        opening: { ...s.opening, [a.id]: Math.max(0, Math.min(1, a.opening)) },
      };
    case 'notch': {
      const now = s.opening[a.id];
      const i = NOTCHES.reduce(
        (best, n, k) =>
          Math.abs(n - now) < Math.abs(NOTCHES[best] - now) ? k : best,
        0,
      );
      const k = Math.max(0, Math.min(NOTCHES.length - 1, i + a.by));
      return { ...s, opening: { ...s.opening, [a.id]: NOTCHES[k] } };
    }
    case 'pump':
      return { ...s, pumpRunning: a.run };
    case 'speed':
      return { ...s, speed: a.speed };
    case 'reset':
      return { ...newIdealPlant(), sinceReset: 0 };
  }
}

/** The water network's solution: every flow and every gauge's reading. */
export interface PlantFlows {
  /** Through the pump and filter (the circulation), the bypass, the exchanger's secondary, its primary, m³/h. */
  circulation: number;
  bypass: number;
  hxSecondary: number;
  primary: number;
  /** Each meter's reading, by its fitting's id, m³/h. */
  meter: Record<MeterId, number>;
  /** Each pressure gauge's reading, bar, by its instrument's id. */
  gauge: Record<string, number>;
  /** The pump's head, m, and its duty, kW of water power. */
  pumpHead: number;
  converged: boolean;
}

/** A valve's resistance, or none if it is shut. */
function valveR(s: IdealPlantState, id: ValveId, dn: 40 | 100 | 150) {
  const k = valveCharacteristic(s.opening[id]);
  return k <= 1e-6 ? null : RESISTANCE.valveOpen[dn] / (k * k);
}

/** A run of resistances in series, closed if any valve on it is shut. */
function series(
  id: string,
  from: string,
  to: string,
  parts: readonly (number | null)[],
): NetLink {
  if (parts.some((p) => p === null)) return { id, kind: 'closed', from, to };
  return {
    id,
    kind: 'resistance',
    from,
    to,
    r: (parts as number[]).reduce((a, b) => a + b, 0),
  };
}

/**
 * The plant's solver on a network with dead ends: the network solver
 * (`solveNetwork`) does not converge where a shut valve leaves a branch
 * fed from one side only (`doc/room-layout-guide.md`, known problems), so
 * the branches that carry nothing are taken out first, by pruning every
 * junction that is left with one open link or none, and the solver is
 * given only what can flow. The water in a dead branch stands still, so
 * its head is its open neighbour's, carried on across its still links: a
 * resistance or a non-return valve loses nothing at no flow; a pump adds
 * its shut-off head (dead-headed) when it runs. A pocket shut off on every
 * side keeps the pool's static head. A stopped pump passes nothing (its
 * own non-return valve and the pool's head above the tank's). Pure.
 */
export function solveWithDeadEnds(
  nodes: readonly NetNode[],
  links: readonly NetLink[],
  fallbackHead: number,
) {
  const flowing = (l: NetLink) =>
    l.kind !== 'closed' && !(l.kind === 'pump' && l.shutoff <= 0);
  const fixed = new Set(
    nodes.filter((n) => n.head !== undefined).map((n) => n.id),
  );
  let live = links.filter(flowing);
  for (;;) {
    const degree = new Map<string, number>();
    for (const l of live)
      for (const id of [l.from, l.to])
        degree.set(id, (degree.get(id) ?? 0) + 1);
    const leaf = (id: string) => !fixed.has(id) && (degree.get(id) ?? 0) <= 1;
    const kept = live.filter((l) => !leaf(l.from) && !leaf(l.to));
    if (kept.length === live.length) break;
    live = kept;
  }
  const inLive = new Set(live.flatMap((l) => [l.from, l.to]));
  const reservoirsJoined =
    [...fixed].filter((id) => inLive.has(id)).length >= 2;
  const solved = reservoirsJoined
    ? solveNetwork(
        nodes.filter((n) => inLive.has(n.id)),
        live,
      )
    : {
        heads: {} as Record<string, number>,
        flows: {} as Record<string, number>,
        converged: true,
      };
  const heads: Record<string, number> = {};
  for (const n of nodes)
    if (n.head !== undefined) heads[n.id] = n.head;
    else if (n.id in solved.heads) heads[n.id] = solved.heads[n.id];
  // Carry heads into the still branches, highest first, until nothing changes.
  for (let pass = 0; pass < nodes.length + 1; pass++) {
    let changed = false;
    for (const l of links) {
      if (l.kind === 'closed' || (reservoirsJoined && live.includes(l)))
        continue;
      const a = heads[l.from];
      const b = heads[l.to];
      // Forward: what the upstream end gives the downstream.
      if (a !== undefined && !(l.to in solved.heads) && !fixed.has(l.to)) {
        const given = l.kind === 'pump' ? a + l.shutoff : a;
        if (b === undefined || given > b + 1e-9) {
          heads[l.to] = given;
          changed = true;
        }
      }
      // Backward, across a link that passes either way.
      if (
        l.kind === 'resistance' &&
        b !== undefined &&
        !(l.from in solved.heads) &&
        !fixed.has(l.from) &&
        (a === undefined || b > a + 1e-9)
      ) {
        heads[l.from] = b;
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const n of nodes) heads[n.id] ??= fallbackHead;
  const flows: Record<string, number> = {};
  for (const l of links) flows[l.id] = solved.flows[l.id] ?? 0;
  return { heads, flows, converged: solved.converged };
}

/**
 * Solve the plant's water: the circulation (tank to pool through the pump,
 * filter and the split) and the primary (the hot-water source through the
 * exchanger to its return), by the plant's network solver.
 */
export function solvePlant(s: IdealPlantState): PlantFlows {
  const R = RESISTANCE;
  const nodes: NetNode[] = [
    { id: 'tank', head: PLANT.tankHead },
    { id: 'pool', head: PLANT.poolHead },
    { id: 'pumpIn' },
    { id: 'pumpOut' },
    { id: 'checked' },
    { id: 'filterIn' },
    { id: 'filterOut' },
    { id: 'split' },
    { id: 'join' },
  ];
  const links: NetLink[] = [
    series('suction', 'tank', 'pumpIn', [
      R.suctionPipe,
      valveR(s, 'pump.suction.iso', 150),
    ]),
    {
      id: 'pump',
      kind: 'pump',
      from: 'pumpIn',
      to: 'pumpOut',
      // Stopped, it adds no head (and its non-return valve holds back).
      shutoff: s.pumpRunning ? PLANT.pumpShutoff : 0,
      k: PLANT.pumpK,
    },
    {
      id: 'nrv',
      kind: 'check',
      from: 'pumpOut',
      to: 'checked',
      r: R.nonReturn,
    },
    series('discharge', 'checked', 'filterIn', [
      R.dischargePipe,
      valveR(s, 'pump.discharge.iso', 150),
      valveR(s, 'filter.inlet.iso', 150),
    ]),
    {
      id: 'bed',
      kind: 'resistance',
      from: 'filterIn',
      to: 'filterOut',
      r: R.filterBed,
    },
    series('filtered', 'filterOut', 'split', [
      R.filteredPipe,
      valveR(s, 'filter.outlet.iso', 150),
    ]),
    series('bypass', 'split', 'join', [
      R.bypassPipe,
      valveR(s, 'bypass.valve', 150),
    ]),
    series('hx', 'split', 'join', [
      R.hxPipe,
      R.hxSecondary,
      valveR(s, 'hx.secondary-in.iso', 100),
      valveR(s, 'hx.secondary-out.iso', 100),
    ]),
    {
      id: 'return',
      kind: 'resistance',
      from: 'join',
      to: 'pool',
      r: R.returnMain,
    },
  ];
  const c = solveWithDeadEnds(nodes, links, PLANT.poolHead);
  const sourceHead = PLANT.sourceBar * 10.2;
  const p = solveWithDeadEnds(
    [
      { id: 'source', head: sourceHead },
      { id: 'hxIn' },
      { id: 'sink', head: 0 },
    ],
    [
      series('primaryFlow', 'source', 'hxIn', [
        R.source,
        R.primaryPipe / 2,
        valveR(s, 'heat.out-1.valve', 40),
        valveR(s, 'hx.primary-in.iso', 40),
      ]),
      series('primaryReturn', 'hxIn', 'sink', [
        R.hxPrimary,
        R.primaryPipe / 2,
        valveR(s, 'hx.primary-out.iso', 40),
      ]),
    ],
    PLANT.sourceBar * 10.2,
  );
  // Leakage past a shut valve (the solver's anchor) is no flow at all.
  const clean = (q: number) => (Math.abs(q) < 0.05 ? 0 : q);
  const circulation = clean(c.flows.suction);
  const bypass = clean(c.flows.bypass);
  const hxSecondary = clean(c.flows.hx);
  const primary = clean(Math.min(p.flows.primaryFlow, p.flows.primaryReturn));
  const h = c.heads;
  const gauge = {
    'pump.suction.pi': gaugeBar(h.pumpIn, PLANT.pumpAxis),
    'pump.discharge.pi': gaugeBar(h.pumpOut, PLANT.pumpAxis),
    'filter.inlet.pi': gaugeBar(h.filterIn, PLANT.filterGauges),
    'filter.outlet.pi': gaugeBar(h.filterOut, PLANT.filterGauges),
    'filter.pdi': gaugeBar(h.filterIn - h.filterOut, 0),
  };
  return {
    circulation,
    bypass,
    hxSecondary,
    primary,
    meter: {
      'filter.outlet.meter': circulation,
      'bypass.meter': bypass,
      'hx.secondary.meter': hxSecondary,
      'heat.out-1.meter': primary,
    },
    gauge,
    pumpHead: h.pumpOut - h.pumpIn,
    converged: c.converged && p.converged,
  };
}

/** A flow's heat capacity rate, kW/K. */
export const capacity = (m3h: number) => (m3h * 1000 * 4.186) / 3600;

const ease = (from: number, to: number, tau: number, dt: number) =>
  to + (from - to) * Math.exp(-dt / tau);

/** The heat the exchanger passes, kW, and its outlets, for the flows and inlets. */
export function exchangerDuty(
  hotIn: number,
  coldIn: number,
  primary: number,
  secondary: number,
) {
  const ch = capacity(primary);
  const cc = capacity(secondary);
  const q =
    ch > 0 && cc > 0
      ? effectiveness(ch, cc, PLANT.hxUA) * Math.min(ch, cc) * (hotIn - coldIn)
      : 0;
  return {
    q,
    hotOut: ch > 0 ? hotIn - q / ch : null,
    coldOut: cc > 0 ? coldIn + q / cc : null,
  };
}

/** What the plant is doing now, for the mimic, the instruments and the placards. */
export interface PlantReadings {
  flows: PlantFlows;
  /** The heat the exchanger passes to the pool water, and the pool's loss to its hall, kW. */
  duty: number;
  poolLoss: number;
}

/**
 * Step the plant `dt` real seconds (its own time runs at its speed), in
 * small steps so its lags hold; `flows` is the network solved for its
 * valves and pump as they stand (`solvePlant`), which no step changes.
 */
export function stepIdealPlant(
  state: IdealPlantState,
  flows: PlantFlows,
  dt: number,
): IdealPlantState {
  if (!(dt > 0)) return state;
  let s = { ...state, sinceReset: state.sinceReset + dt };
  let left = dt * s.speed;
  while (left > 1e-9) {
    const h = Math.min(left, 0.5);
    s = stepOnce(s, flows, h);
    left -= h;
  }
  return s;
}

function stepOnce(
  s: IdealPlantState,
  f: PlantFlows,
  dt: number,
): IdealPlantState {
  const P = PLANT;
  const x = exchangerDuty(P.sourceC, s.tankC, f.primary, f.hxSecondary);
  const hxSecondaryOut = ease(
    s.hxSecondaryOut,
    x.coldOut ?? s.hxSecondaryOut,
    P.exchangerLag,
    dt,
  );
  const hxPrimaryOut = ease(
    s.hxPrimaryOut,
    x.hotOut ?? s.hxPrimaryOut,
    P.exchangerLag,
    dt,
  );
  // The return: the bypass's water and the exchanger's, mixed.
  const total = f.bypass + f.hxSecondary;
  const toPool =
    total > 0
      ? (f.bypass * s.tankC + f.hxSecondary * hxSecondaryOut) / total
      : s.point.toPool;
  // What the return actually brings the pool, and what the pool loses.
  const gain = capacity(total) * (toPool - s.tankC);
  const loss = P.poolUA * (s.poolC - P.hallReference);
  const poolMass = P.poolVolume * 4186; // kJ/K
  const poolC = s.poolC + ((gain - loss) / poolMass) * dt;
  // The tank takes the pool's overflow: it follows the pool by its turnover.
  const tankC =
    f.circulation > 0
      ? ease(s.tankC, s.poolC, (P.tankVolume / f.circulation) * 3600, dt)
      : ease(s.tankC, P.roomC, 20 * 3600, dt);
  // Each thermometer's point: the water passing it, or, still, drifting to the room.
  const at = (now: number, water: number, flowing: boolean) =>
    flowing ? water : ease(now, P.roomC, P.stillLag, dt);
  const point = {
    fromPool: at(s.point.fromPool, s.tankC, f.circulation > 0),
    hxSecondaryOut: at(
      s.point.hxSecondaryOut,
      hxSecondaryOut,
      f.hxSecondary > 0,
    ),
    toPool: at(s.point.toPool, toPool, total > 0),
    primaryIn: at(s.point.primaryIn, P.sourceC, f.primary > 0),
    primaryOut: at(s.point.primaryOut, hxPrimaryOut, f.primary > 0),
  };
  const thermometer = Object.fromEntries(
    INSTRUMENTS.filter((i) => i.kind === 'temperature').map((i) => [
      i.id,
      ease(
        s.thermometer[i.id],
        point[i.reads as keyof typeof point],
        P.sensorLag,
        dt,
      ),
    ]),
  );
  return {
    ...s,
    poolC,
    tankC,
    hxSecondaryOut,
    hxPrimaryOut,
    point,
    thermometer,
    seconds: s.seconds + dt,
  };
}

/** The heat now: the exchanger's duty and the pool's loss, kW. */
export function plantReadings(
  s: IdealPlantState,
  flows: PlantFlows,
): PlantReadings {
  const x = exchangerDuty(
    PLANT.sourceC,
    s.tankC,
    flows.primary,
    flows.hxSecondary,
  );
  return {
    flows,
    duty: x.q,
    poolLoss: PLANT.poolUA * (s.poolC - PLANT.hallReference),
  };
}

/** How long the pool takes to pass once through the plant at a flow, hours. */
export const turnoverHours = (flow: number) =>
  flow > 0 ? PLANT.poolVolume / flow : Infinity;

/** The fitting's kind, by id. */
export const fittingKind = (id: string): FittingKind | undefined =>
  valveById.get(id)?.kind;

/** A fitting, by id. */
export const fittingById = (id: string) => valveById.get(id);
