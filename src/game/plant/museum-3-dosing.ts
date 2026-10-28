import { expandForPlumbing } from './plumbing-expansion';
import type {
  Expansion,
  GivenFitting,
  PlumbEdge,
  PlumbMedium,
} from './plumbing-expansion';
import type { SchematicNode } from './schematics';
import { readings, stepChemistry, waterFrom } from '../water/pool-chemistry';
import type { PoolChemistry } from '../water/pool-chemistry';
import { POOL_CELL_SHARES, exchangeRing } from '../water/circuit';
import { POOL_25M, batherProfile } from '../water/chemistry-bench';
import { CHEMISTRY_TICK, SETTLED, STRENGTH } from './water-treatment';
import { INJECTION_BAR } from './dosing-pumps';
import {
  PLANT_SETTINGS,
  act as actOnController,
  newController,
  stepController,
} from '../../toolkit/components/plant/logic/dosing-controller';
import type {
  ControllerAction,
  ControllerState,
  DoseChannel,
} from '../../toolkit/components/plant/logic/dosing-controller';
import {
  CELL,
  cellFlow,
  cellSignals,
  newSampleCell,
  stepSampleCell,
  testSample,
} from '../../toolkit/components/plant/logic/sample-cell';
import type {
  SampleCellState,
  SampleWater,
  TestResult,
} from '../../toolkit/components/plant/logic/sample-cell';
import {
  keyedDiaphragmPump,
  newKeyedDiaphragmState,
} from '../../toolkit/components/plant/logic/metering-pump';
import type { KeyedDiaphragmState } from '../../toolkit/components/plant/logic/metering-pump';
import { pressKey } from '../../toolkit/components/plant/logic/diaphragm-pump';
import type { DiaphragmKey } from '../../toolkit/components/plant/logic/diaphragm-pump';

/**
 * Hall 3 of the museum, "Safe water" (107c): automatic disinfection, a
 * closed loop. The ideal pool (the chemistry bench's `POOL_25M`: 470 m³
 * in three cells in series and a 30 m³ balance tank) overflows to its
 * balance tank; its pump P1 returns the water through its flowmeter past
 * the sample tapping and the two injection points. A trickle of sample
 * runs through the Chlorella sample cell SC1 (`sample-cell.ts`, ideal
 * probes) to the drain; the DC-1 pair DC1 (`dosing-controller.ts`, the
 * plant's settings: PI on chlorine, P on pH, its alarms and interlocks)
 * reads it and drives two real metering pumps (`metering-pump.ts`: the DMX
 * 1602 for hypochlorite, the DDS 7.5-16 for acid), each drawing from its
 * 60 l day tank, filled by hand from its ideal store. Swimmers (BA1, the
 * SWIMMERS dial) bring their load. Faults that do not trip: air in the
 * hypochlorite pump's head, and a weak delivery of hypochlorite.
 *
 * Every fitting is given, so the plumber adds nothing; tags are derived
 * (room code M3). Pure; seconds, litres, mg/l.
 */

// ---- The schematic -----------------------------------------------------------

export const ROOM_CODE = 'M3';

export type MachineId =
  | 'pool'
  | 'balanceTank'
  | 'poolPump'
  | 'sampleTee'
  | 'hypoInjection'
  | 'acidInjection'
  | 'sampleCell'
  | 'drain'
  | 'hypoStore'
  | 'acidStore'
  | 'hypoTank'
  | 'acidTank'
  | 'hypoPump'
  | 'acidPump';

export const NODES: readonly (SchematicNode & { id: MachineId })[] = [
  { id: 'pool', kind: 'ideal-pool', code: 'IP1', name: 'Ideal pool' },
  {
    id: 'balanceTank',
    kind: 'ideal-vessel',
    code: 'BT1',
    name: 'Balance tank',
  },
  {
    id: 'poolPump',
    kind: 'end-suction-pump',
    code: 'P1',
    name: 'Circulation pump',
  },
  { id: 'sampleTee', kind: 'tee', code: 'TE1', name: 'Sample tapping' },
  {
    id: 'hypoInjection',
    kind: 'injection-point',
    code: 'IJ1',
    name: 'Hypochlorite injection point',
  },
  {
    id: 'acidInjection',
    kind: 'injection-point',
    code: 'IJ2',
    name: 'Acid injection point',
  },
  {
    id: 'sampleCell',
    kind: 'sample-cell',
    code: 'SC1',
    name: 'Sample cell',
  },
  { id: 'drain', kind: 'ideal-sink', code: 'DR1', name: 'Sample drain' },
  {
    id: 'hypoStore',
    kind: 'ideal-chemical-source',
    code: 'CS1',
    name: 'Hypochlorite store',
  },
  {
    id: 'acidStore',
    kind: 'ideal-chemical-source',
    code: 'CS2',
    name: 'Acid store',
  },
  {
    id: 'hypoTank',
    kind: 'day-tank',
    code: 'DT1',
    name: 'Hypochlorite day tank',
  },
  { id: 'acidTank', kind: 'day-tank', code: 'DT2', name: 'Acid day tank' },
  {
    id: 'hypoPump',
    kind: 'metering-pump',
    code: 'DP1',
    name: 'Hypochlorite dosing pump',
  },
  {
    id: 'acidPump',
    kind: 'metering-pump',
    code: 'DP2',
    name: 'Acid dosing pump',
  },
];

export type LinkId =
  | 'overflow'
  | 'suction'
  | 'discharge'
  | 'returnA'
  | 'returnB'
  | 'returnC'
  | 'sample'
  | 'sampleDrain'
  | 'hypoFill'
  | 'hypoSuction'
  | 'hypoDose'
  | 'acidFill'
  | 'acidSuction'
  | 'acidDose';

const link = (
  id: LinkId,
  from: [MachineId, string],
  to: [MachineId, string],
  medium: PlumbMedium = 'water',
): PlumbEdge & { id: LinkId } => ({
  id,
  sourceId: from[0],
  sourcePort: from[1],
  targetId: to[0],
  targetPort: to[1],
  medium,
});

export const LINKS: readonly (PlumbEdge & { id: LinkId })[] = [
  link('overflow', ['pool', 'overflow'], ['balanceTank', 'in']),
  link('suction', ['balanceTank', 'outlet'], ['poolPump', 'suction']),
  link('discharge', ['poolPump', 'discharge'], ['sampleTee', 'in']),
  link('returnA', ['sampleTee', 'run'], ['hypoInjection', 'in']),
  link('returnB', ['hypoInjection', 'out'], ['acidInjection', 'in']),
  link('returnC', ['acidInjection', 'out'], ['pool', 'inlet']),
  link('sample', ['sampleTee', 'branch'], ['sampleCell', 'in']),
  link('sampleDrain', ['sampleCell', 'out'], ['drain', 'in']),
  link('hypoFill', ['hypoStore', 'out-1'], ['hypoTank', 'in'], 'chemical'),
  link('hypoSuction', ['hypoTank', 'out'], ['hypoPump', 'suction'], 'chemical'),
  link(
    'hypoDose',
    ['hypoPump', 'discharge'],
    ['hypoInjection', 'dose'],
    'chemical',
  ),
  link('acidFill', ['acidStore', 'out-1'], ['acidTank', 'in'], 'chemical'),
  link('acidSuction', ['acidTank', 'out'], ['acidPump', 'suction'], 'chemical'),
  link(
    'acidDose',
    ['acidPump', 'discharge'],
    ['acidInjection', 'dose'],
    'chemical',
  ),
];

export const LINK_NAMES: Record<LinkId, string> = {
  overflow: 'Pool overflow to balance tank',
  suction: 'Pool water to pump',
  discharge: 'Pool water from pump',
  returnA: 'Pool water to injection',
  returnB: 'Pool water, chlorinated',
  returnC: 'Treated pool water to pool',
  sample: 'Sample water',
  sampleDrain: 'Sample water to drain',
  hypoFill: 'Sodium hypochlorite fill',
  hypoSuction: 'Sodium hypochlorite to pump',
  hypoDose: 'Sodium hypochlorite dose',
  acidFill: 'Hydrochloric acid fill',
  acidSuction: 'Hydrochloric acid to pump',
  acidDose: 'Hydrochloric acid dose',
};

/** Each link's bore, DN. */
export const LINK_DN: Record<LinkId, 15 | 150> = {
  overflow: 150,
  suction: 150,
  discharge: 150,
  returnA: 150,
  returnB: 150,
  returnC: 150,
  sample: 15,
  sampleDrain: 15,
  hypoFill: 15,
  hypoSuction: 15,
  hypoDose: 15,
  acidFill: 15,
  acidSuction: 15,
  acidDose: 15,
};

/** The chemical a link carries, if any. */
export const chemicalOf = (id: LinkId): DoseChannel | null =>
  id.startsWith('hypo')
    ? 'hypochlorite'
    : id.startsWith('acid')
      ? 'acid'
      : null;

export type ValveId =
  | 'poolPump.suction.iso'
  | 'poolPump.discharge.iso'
  | 'sample.iso'
  | 'sample.needle'
  | 'hypoTank.fill'
  | 'acidTank.fill'
  | 'hypoPump.bleed'
  | 'acidPump.bleed';

export interface HallFitting extends GivenFitting {
  /** The machine whose tag it extends (a valve), or none (a meter). */
  of?: MachineId;
  /** A valve's body: a ball valve, a needle valve, a push-to-fill ball valve, a bleed valve, a spring-loaded injection valve. */
  body?: 'ball' | 'needle' | 'fill' | 'bleed' | 'injection';
}

const valve = (
  id: ValveId,
  edge: LinkId,
  end: 'source' | 'target',
  role: string,
  of: MachineId,
  options: Partial<HallFitting> = {},
): HallFitting => ({
  id,
  kind: 'isolating-valve',
  edge,
  end,
  normally: 'open',
  role,
  operator: 'lever',
  body: 'ball',
  of,
  ...options,
});

/**
 * Every fitting, in the order each machine's are numbered: the pump's
 * suction and discharge valves and its non-return valve; the sample's
 * isolating valve and needle valve; each day tank's push-to-fill valve;
 * each dosing pump's injection valve (a spring-loaded non-return) and its
 * bleed valve; the circulation's flowmeter.
 */
export const FITTINGS: readonly HallFitting[] = [
  valve(
    'poolPump.suction.iso',
    'suction',
    'target',
    'pump suction',
    'poolPump',
  ),
  {
    id: 'poolPump.nrv',
    kind: 'non-return-valve',
    edge: 'discharge',
    end: 'source',
    normally: 'open',
    role: 'pump non-return',
    of: 'poolPump',
  },
  valve(
    'poolPump.discharge.iso',
    'discharge',
    'source',
    'pump discharge',
    'poolPump',
  ),
  {
    id: 'discharge.meter',
    kind: 'flowmeter',
    edge: 'discharge',
    end: 'target',
    normally: 'open',
    role: 'circulation',
  },
  valve('sample.iso', 'sample', 'source', 'sample isolating', 'sampleCell'),
  valve('sample.needle', 'sample', 'target', 'sample flow', 'sampleCell', {
    body: 'needle',
  }),
  valve('hypoTank.fill', 'hypoFill', 'target', 'push-to-fill', 'hypoTank', {
    normally: 'closed',
    body: 'fill',
  }),
  valve('acidTank.fill', 'acidFill', 'target', 'push-to-fill', 'acidTank', {
    normally: 'closed',
    body: 'fill',
  }),
  {
    id: 'hypoPump.injection',
    kind: 'non-return-valve',
    edge: 'hypoDose',
    end: 'target',
    normally: 'open',
    role: 'hypochlorite injection',
    of: 'hypoPump',
    body: 'injection',
  },
  valve('hypoPump.bleed', 'hypoDose', 'source', 'bleed', 'hypoPump', {
    normally: 'closed',
    body: 'bleed',
  }),
  {
    id: 'acidPump.injection',
    kind: 'non-return-valve',
    edge: 'acidDose',
    end: 'target',
    normally: 'open',
    role: 'acid injection',
    of: 'acidPump',
    body: 'injection',
  },
  valve('acidPump.bleed', 'acidDose', 'source', 'bleed', 'acidPump', {
    normally: 'closed',
    body: 'bleed',
  }),
];

export const fittingById = (id: string) => FITTINGS.find((f) => f.id === id);

export type InstrumentKind =
  | 'flow-switch'
  | 'analyser'
  | 'level'
  | 'quality'
  | 'controller'
  | 'sample-point'
  | 'test-kit'
  | 'recorder';

export interface Instrument {
  id: string;
  kind: InstrumentKind;
  role: string;
  /** The machine it is fitted to, if any. */
  on?: MachineId;
}

/** The instruments, in tag order: none set into a line (the cell's are in the cell). */
export const INSTRUMENTS: readonly Instrument[] = [
  { id: 'cell.fs', kind: 'flow-switch', role: 'sample flow', on: 'sampleCell' },
  {
    id: 'cell.cl',
    kind: 'analyser',
    role: 'free chlorine probe',
    on: 'sampleCell',
  },
  { id: 'cell.ph', kind: 'analyser', role: 'pH probe', on: 'sampleCell' },
  {
    id: 'cell.tap',
    kind: 'sample-point',
    role: 'sample tap',
    on: 'sampleCell',
  },
  {
    id: 'hypoTank.li',
    kind: 'level',
    role: 'hypochlorite level',
    on: 'hypoTank',
  },
  { id: 'acidTank.li', kind: 'level', role: 'acid level', on: 'acidTank' },
  { id: 'board.cl', kind: 'quality', role: 'free chlorine meter' },
  { id: 'board.ph', kind: 'quality', role: 'pH meter' },
  { id: 'controller', kind: 'controller', role: 'dosing controller' },
  { id: 'chart', kind: 'recorder', role: 'chart recorder' },
  { id: 'testKit', kind: 'test-kit', role: 'DPD test kit' },
];

// ---- Tags, derived -------------------------------------------------------------

const nodeById = new Map(NODES.map((n) => [n.id, n]));
export const machineTag = (id: MachineId) =>
  `${ROOM_CODE}-${nodeById.get(id)!.code}`;

const LETTERS: Record<InstrumentKind, string> = {
  'flow-switch': 'FS',
  analyser: 'AE',
  level: 'LI',
  quality: 'QI',
  controller: 'DC',
  'sample-point': 'SP',
  'test-kit': 'TK',
  recorder: 'QR',
};

/**
 * Every tag, derived: a valve its machine's tag and its number among that
 * machine's valves (a non-return valve NRV); a meter FT; an instrument its
 * letters and its number among its kind's.
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
    if (f.kind === 'flowmeter') tags[f.id] = `${ROOM_CODE}-FT${next('FT')}`;
    else {
      const letter = f.kind === 'non-return-valve' ? 'NRV' : 'V';
      tags[f.id] = `${machineTag(f.of!)}-${letter}${next(`${f.of}.${letter}`)}`;
    }
  }
  for (const i of INSTRUMENTS) {
    const letters = LETTERS[i.kind];
    tags[i.id] = `${ROOM_CODE}-${letters}${next(letters)}`;
  }
  for (const n of NODES) tags[n.id] = machineTag(n.id);
  // The museum's own: the swimmers' dial, and the fault pedestal.
  tags['swimmers'] = `${ROOM_CODE}-BA1`;
  tags['faults'] = `${ROOM_CODE}-FP1`;
  return tags;
})();

/** A tag without its room code: DP1-V1. */
export const shortTag = (id: string) => TAGS[id].slice(ROOM_CODE.length + 1);

export function fittingName(f: HallFitting): string {
  const role = f.role ?? '';
  const words = role.charAt(0).toUpperCase() + role.slice(1);
  if (f.kind === 'flowmeter') return 'Circulation flowmeter (electromagnetic)';
  if (f.body === 'injection') return `${words} valve (spring-loaded)`;
  if (f.body === 'needle') return 'Sample flow needle valve';
  if (f.body === 'fill') return 'Push-to-fill valve';
  if (f.body === 'bleed') return 'Bleed valve';
  return `${words} valve`;
}

/** The plumber's rules: a non-return valve on the circulation pump's discharge. */
export const RULES = {
  isolate: new Set<string>(),
  pumps: new Set(['end-suction-pump']),
  discharge: 'discharge',
} as const;

export function hall3Expansion(): Expansion {
  return expandForPlumbing(NODES, LINKS, { ...RULES, given: FITTINGS });
}

// ---- The physics -------------------------------------------------------------

/** The pool, every hall's: the chemistry bench's 25 m pool. */
export const POOL = POOL_25M;
/** Its circulation, m³/h (166.7: a three-hour turnover of pool and tank). */
export const CIRCULATION = POOL.circulation;
/** The day tanks, litres. */
export const DAY_TANK_L = 60;
/** A push-to-fill valve's flow from its store, l/min. */
export const FILL_L_PER_MIN = 10;
/** The sample's needle valve: its opening at 40 l/h. */
export const NEEDLE_NORMAL = 40 / CELL.maxFlow;
/** How often the cell, controller and pumps are stepped, plant seconds. */
export const CONTROL_TICK = 1;
/** The weak delivery's strength, g/l. */
export const WEAK_STRENGTH = 100;
/** A bleed valve held open clears the head's gas in about this, s (a flooded suction). */
export const BLEED_SECONDS = 5;
/** Gas let into the hypochlorite pump's head by AIR IN THE PUMP, ml: a big bubble, more than its degassing valve clears before its flow monitor trips. */
export const GAS_ML = 5;

export type Swimmers = 'closed' | 'quiet' | 'normal' | 'crowd';
export const SWIMMERS: readonly Swimmers[] = [
  'closed',
  'quiet',
  'normal',
  'crowd',
];
/** QUIET's swimmers in the water; CROWD's (100 in the hour, an hour's visit each). */
export const QUIET_BATHERS = 20;
export const CROWD_BATHERS = 100;
/** Seconds a day. */
const DAY = 86400;

/** The bathers in the water now, by the dial: CROWD's hundred for the hour after it was turned to, then the normal day's. */
export const bathersNow = (s: Hall3State) =>
  s.swimmers === 'crowd' && s.seconds - s.crowdAt >= 3600
    ? bathersFor('normal', timeOfDay(s))
    : bathersFor(s.swimmers, timeOfDay(s));

/** The bathers in the water at a time of day, by the dial. */
export function bathersFor(swimmers: Swimmers, secondsOfDay: number): number {
  switch (swimmers) {
    case 'closed':
      return 0;
    case 'quiet':
      return QUIET_BATHERS;
    case 'crowd':
      return CROWD_BATHERS;
    case 'normal': {
      // The bench's day: 600 swimmers, open 06:30 to 22:00, busiest 17:00 to 20:00.
      const hours = 17 - 6.5 + 3 * 2 + 2;
      return (
        (POOL.bathersPerDay *
          POOL.visitHours *
          batherProfile(secondsOfDay / 3600)) /
        hours
      );
    }
  }
}

/** The pumps' models. */
/**
 * The pumps' models. Deviation from the brief (DMX on hypochlorite, DDS on
 * acid): on this pool the DMX's 2.1 l/h has no headroom (the evening's
 * swimmers hold it near 100 %, and after any loss of dosing it cannot
 * catch up inside DC1's two-hour limit, which latches it off again), so
 * the hypochlorite has the DDS 7.5-16 and the acid the DMX 1602.
 */
export const PUMPS = {
  hypochlorite: keyedDiaphragmPump('stepper'),
  acid: keyedDiaphragmPump('solenoid'),
} as const;
export const PUMP_KIND = { hypochlorite: 'stepper', acid: 'solenoid' } as const;

export interface DosePump {
  state: KeyedDiaphragmState;
  running: boolean;
  fault: string | null;
  /** Strokes a minute it last ran at; strokes begun since the start. */
  spm: number;
  strokes: number;
  /** Litres delivered, in all. */
  deliveredL: number;
}

export interface DayTank {
  litres: number;
  /** Its chemical's strength, g/l (as filled). */
  strength: number;
  /** Litres drawn this plant day, and the last whole day's. */
  today: number;
  yesterday: number | null;
}

export interface Hall3State {
  /** The time of day it started, s after midnight; plant seconds since. */
  start: number;
  seconds: number;
  /** The balance tank's water; the pool's three cells, return side first. */
  tank: PoolChemistry;
  pool: PoolChemistry[];
  /** Litres of each chemical, and seconds, since the chemistry was last stepped. */
  pending: {
    seconds: number;
    hypochlorite: number;
    acid: number;
    strength: number;
  };
  /** Plant seconds not yet given the controller and pumps. */
  due: number;
  cell: SampleCellState;
  controller: ControllerState;
  pumps: Record<DoseChannel, DosePump>;
  tanks: Record<DoseChannel, DayTank>;
  /** Each hand valve, open. */
  open: Record<ValveId, boolean>;
  /** The circulation pump, started at its station. */
  poolPump: boolean;
  swimmers: Swimmers;
  /** When CROWD was turned to, plant seconds: its hundred swimmers come in the hour after. */
  crowdAt: number;
  /** The stores' strength: CS1's (WEAK DELIVERY lowers it), g/l. */
  storeStrength: number;
  /** The fault pedestal's lamps' faults: air let in, and not yet bled out. */
  airFault: boolean;
  /** The last test at TK1, and the plant second it was taken. */
  test: (TestResult & { at: number }) | null;
  /** Real seconds since the last reset, for the RESET lamp. */
  sinceReset: number;
}

/** The controller's integral at reset, mg/l: what the day's swimmers ask of it, so it starts settled. */
export const START_INTEGRAL = 0.1;

/** The pool's water at reset: the Lounge's settled water, 1.3 mg/l, pH 7.3. */
export function startWater(): PoolChemistry {
  const s = SETTLED.pool_02;
  return {
    ...waterFrom({
      ph: 7.3,
      alkalinity: s.alkalinity,
      hardness: s.hardness,
      tds: s.tds,
      temperature: POOL.temperature,
      freeChlorine: 1.3,
      sulphate: s.sulphate,
    }),
    chlorate: s.chlorate,
  };
}

const sampleOf = (w: PoolChemistry): SampleWater => ({
  free: w.freeChlorine,
  total: readings(w, POOL.temperature).totalChlorine,
  ph: w.ph,
  temperature: POOL.temperature,
});

const newPump = (c: DoseChannel): DosePump => ({
  // The DMX with its auto-degassing head (as the gamma/ X's), which vents
  // what gathers in its head overnight; the DDS deaerates itself.
  state:
    c === 'acid' ? newKeyedDiaphragmState('degassing') : PUMPS[c].initial(),
  running: false,
  fault: null,
  spm: 0,
  strokes: 0,
  deliveredL: 0,
});

/** The hall's reset state, its time of day `now` (RESET, and every entry). */
export function newHall3(now = 0): Hall3State {
  const water = startWater();
  const cell = {
    ...newSampleCell(sampleOf(water), { total: false, redox: false }),
    regulator: NEEDLE_NORMAL,
  };
  const open = Object.fromEntries(
    FITTINGS.filter((f) => f.kind === 'isolating-valve').map((f) => [
      f.id,
      f.normally === 'open',
    ]),
  ) as Record<ValveId, boolean>;
  return {
    start: now,
    seconds: 0,
    tank: { ...water },
    pool: POOL_CELL_SHARES.map(() => ({ ...water })),
    pending: { seconds: 0, hypochlorite: 0, acid: 0, strength: 0 },
    due: 0,
    cell,
    controller: newController(
      { ...PLANT_SETTINGS },
      cellSignals(cell),
      START_INTEGRAL,
    ),
    pumps: { hypochlorite: newPump('hypochlorite'), acid: newPump('acid') },
    tanks: {
      hypochlorite: {
        litres: DAY_TANK_L,
        strength: STRENGTH.hypochlorite,
        today: 0,
        yesterday: null,
      },
      acid: {
        litres: DAY_TANK_L,
        strength: STRENGTH.acid,
        today: 0,
        yesterday: null,
      },
    },
    open,
    poolPump: true,
    swimmers: 'normal',
    crowdAt: 0,
    storeStrength: STRENGTH.hypochlorite,
    airFault: false,
    test: null,
    sinceReset: 0,
  };
}

/** The time of day, seconds after midnight. */
export const timeOfDay = (s: Hall3State) => (s.start + s.seconds) % DAY;

/** The circulation's flow, m³/h. */
export const circulation = (s: Hall3State) =>
  s.poolPump &&
  s.open['poolPump.suction.iso'] &&
  s.open['poolPump.discharge.iso']
    ? CIRCULATION
    : 0;

/** The sample cell as the plant has it: its isolating valve and the circulation feeding it. */
const fedCell = (s: Hall3State): SampleCellState => ({
  ...s.cell,
  valveOpen: s.open['sample.iso'] && circulation(s) > 0,
});

/** The sample's flow, l/h. */
export const sampleFlow = (s: Hall3State) => cellFlow(fedCell(s));

/** The pool's water as the swimmers meet it: its far side. */
export const farSide = (s: Hall3State) => s.pool[s.pool.length - 1];

export type Hall3Action =
  | { type: 'valve'; id: ValveId; open: boolean }
  | { type: 'needle'; by: number }
  | { type: 'pump'; run: boolean }
  | { type: 'swimmers'; swimmers: Swimmers }
  | { type: 'pump-key'; channel: DoseChannel; key: DiaphragmKey }
  | { type: 'pump-ack'; channel: DoseChannel }
  | { type: 'controller'; state: ControllerState }
  | { type: 'controller-act'; action: ControllerAction }
  | { type: 'air' }
  | { type: 'weak' }
  | { type: 'test' }
  | { type: 'reset'; now: number };

const setPump = (
  s: Hall3State,
  c: DoseChannel,
  f: (p: DosePump) => DosePump,
): Hall3State => ({ ...s, pumps: { ...s.pumps, [c]: f(s.pumps[c]) } });

const withBleed = (s: Hall3State, c: DoseChannel, open: boolean) =>
  setPump(s, c, (p) => ({
    ...p,
    state: { ...p.state, head: { ...p.state.head, bleedOpen: open } },
  }));

export function actOnHall3(s: Hall3State, a: Hall3Action): Hall3State {
  switch (a.type) {
    case 'valve': {
      let next: Hall3State = { ...s, open: { ...s.open, [a.id]: a.open } };
      if (a.id === 'hypoPump.bleed')
        next = withBleed(next, 'hypochlorite', a.open);
      if (a.id === 'acidPump.bleed') next = withBleed(next, 'acid', a.open);
      return next;
    }
    case 'needle': {
      const regulator =
        Math.round(Math.max(0, Math.min(1, s.cell.regulator + a.by)) * 12) / 12;
      return { ...s, cell: { ...s.cell, regulator } };
    }
    case 'pump':
      return { ...s, poolPump: a.run };
    case 'swimmers':
      return a.swimmers === s.swimmers
        ? s
        : { ...s, swimmers: a.swimmers, crowdAt: s.seconds };
    case 'pump-key':
      return setPump(s, a.channel, (p) => ({
        ...p,
        state: { ...p.state, keys: pressKey(p.state.keys, a.key) },
      }));
    case 'pump-ack':
      return setPump(s, a.channel, (p) => ({
        ...p,
        state: PUMPS[a.channel].acknowledge(p.state),
        fault: null,
      }));
    case 'controller':
      return { ...s, controller: a.state };
    case 'controller-act':
      return {
        ...s,
        controller: actOnController(s.controller, a.action).state,
      };
    case 'air': {
      const next = setPump(s, 'hypochlorite', (p) => ({
        ...p,
        state: {
          ...p.state,
          head: { ...p.state.head, gasMl: p.state.head.gasMl + GAS_ML },
        },
      }));
      return { ...next, airFault: true };
    }
    case 'weak':
      return { ...s, storeStrength: WEAK_STRENGTH };
    case 'test':
      return {
        ...s,
        test: { ...testSample(fedCell(s)), at: s.seconds },
      };
    case 'reset':
      return newHall3(a.now);
  }
}

/** The chemistry, stepped over what is pending. */
function stepWater(s: Hall3State): Hall3State {
  const p = s.pending;
  const dt = p.seconds;
  const hours = dt / 3600;
  const bathers = bathersNow(s);
  const agitation = Math.min(1, (2 * bathers) / POOL.maxBathers);
  const hypo =
    p.hypochlorite * (p.hypochlorite > 0 ? p.strength / p.hypochlorite : 0);
  const added = {
    hypochlorite: hypo,
    chlorate: hypo * STRENGTH.chlorate,
    hcl: p.acid * STRENGTH.acid,
  };
  const flow = circulation(s);
  const common = {
    temperature: POOL.temperature,
    mains: waterFrom(POOL.mains),
    airCo2: POOL.airCo2,
  };
  const stepped = [...s.pool].map(
    (w, i) =>
      stepChemistry(
        w,
        {
          ...common,
          bathers: bathers * POOL_CELL_SHARES[i],
          visitHours: POOL.visitHours,
          agitation,
          volume: POOL.volume * POOL_CELL_SHARES[i],
          surface: POOL.surface * POOL_CELL_SHARES[i],
          circulation: POOL.circulation * POOL_CELL_SHARES[i],
          // The dose reaches the pool's return side only while the water flows.
          added: i === 0 && flow > 0 ? added : {},
        },
        dt,
      ).water,
  );
  const visits = (bathers / POOL.visitHours) * hours;
  const tank = stepChemistry(
    s.tank,
    {
      ...common,
      volume: POOL.balanceTank,
      surface: 0,
      circulation: POOL.circulation,
      freshWater: visits * POOL.freshPerBather,
      evaporationMakeUp: (POOL.evaporation * hours) / 24,
      added: flow > 0 ? {} : added,
    },
    dt,
  ).water;
  const ring =
    flow > 0
      ? exchangeRing(
          [tank, ...stepped],
          [POOL.balanceTank, ...POOL_CELL_SHARES.map((x) => x * POOL.volume)],
          flow,
          hours,
          POOL.temperature,
        )
      : [tank, ...stepped];
  return {
    ...s,
    tank: ring[0],
    pool: ring.slice(1),
    pending: { seconds: 0, hypochlorite: 0, acid: 0, strength: 0 },
  };
}

/** The cell, the controller and the pumps, `dt` plant seconds on. */
function stepControl(s0: Hall3State, dt: number): Hall3State {
  let s = s0;
  const cell = stepSampleCell(fedCell(s), sampleOf(s.tank), dt);
  s = { ...s, cell: { ...cell, valveOpen: s.cell.valveOpen } };
  const pumps = { ...s.pumps };
  const tanks = { ...s.tanks };
  const pending = { ...s.pending };
  const before = timeOfDay(s0);
  const after = (s.start + s.seconds) % DAY;
  const midnight = after < before;
  for (const c of ['hypochlorite', 'acid'] as const) {
    const pump = s.pumps[c];
    const tank = tanks[c];
    const r = PUMPS[c].step(
      pump.state,
      {
        powered: true,
        release: s.controller.release[c],
        demand: s.controller.yout[c],
        level: tank.litres <= 0.05 ? 'empty' : tank.litres < 6 ? 'low' : 'ok',
        dischargeBar: INJECTION_BAR,
      },
      dt,
    );
    // Its bleed open, the flooded suction pushes the head's gas out through it.
    const bled = r.state.head.bleedOpen
      ? {
          ...r.state,
          head: {
            ...r.state.head,
            gasMl: r.state.head.gasMl * Math.exp(-dt / BLEED_SECONDS),
          },
        }
      : r.state;
    const drawn = Math.min(tank.litres, r.deliveredL + r.returnedL);
    const delivered = Math.min(r.deliveredL, drawn);
    pumps[c] = {
      state: bled,
      running: r.running,
      fault: r.fault,
      spm: r.running ? Math.round((r.strokes / dt) * 60) || pump.spm : 0,
      strokes: pump.strokes + r.strokes,
      deliveredL: pump.deliveredL + delivered,
    };
    tanks[c] = {
      ...tank,
      litres:
        tank.litres -
        drawn +
        (r.returnedL > 0 ? Math.min(r.returnedL, drawn) : 0),
      today: midnight ? 0 : tank.today + delivered,
      yesterday: midnight ? tank.today + delivered : tank.yesterday,
    };
    if (c === 'hypochlorite') {
      pending.hypochlorite += delivered;
      pending.strength += delivered * tank.strength;
    } else pending.acid += delivered;
  }
  // The day tanks fill while their push-to-fill valves are held open.
  for (const [c, v] of [
    ['hypochlorite', 'hypoTank.fill'],
    ['acid', 'acidTank.fill'],
  ] as const)
    if (s.open[v]) {
      const t = tanks[c];
      const add = Math.min(DAY_TANK_L - t.litres, (FILL_L_PER_MIN * dt) / 60);
      if (add > 0) {
        const strength = c === 'hypochlorite' ? s.storeStrength : STRENGTH.acid;
        tanks[c] = {
          ...t,
          litres: t.litres + add,
          strength: (t.litres * t.strength + add * strength) / (t.litres + add),
        };
      }
    }
  const controller = stepController(
    s.controller,
    {
      cell: cellSignals(fedCell({ ...s, cell: s.cell })),
      circulating: circulation(s) > 0,
      pumpFault: {
        hypochlorite: pumps.hypochlorite.fault !== null,
        acid: pumps.acid.fault !== null,
      },
      tankEmpty: {
        hypochlorite: tanks.hypochlorite.litres <= 0.05,
        acid: tanks.acid.litres <= 0.05,
      },
    },
    dt,
  );
  const head = pumps.hypochlorite.state.head;
  const airFault =
    s.airFault && (head.gasMl > 0.1 || pumps.hypochlorite.fault !== null);
  return { ...s, pumps, tanks, pending, controller, airFault };
}

/** One slice of plant time, `h` seconds. */
export function stepHall3(state: Hall3State, h: number): Hall3State {
  if (!(h > 0)) return state;
  let s: Hall3State = {
    ...state,
    seconds: state.seconds + h,
    due: state.due + h,
    pending: { ...state.pending, seconds: state.pending.seconds + h },
  };
  if (s.due >= CONTROL_TICK - 1e-9) {
    const dt = s.due;
    s = stepControl({ ...s, due: 0 }, dt);
  }
  if (s.pending.seconds >= CHEMISTRY_TICK - 1e-9) s = stepWater(s);
  return s;
}

/** Run `plantSeconds` on, in slices of `slice` (the museum's half-second). */
export function runHall3(
  state: Hall3State,
  plantSeconds: number,
  slice = 0.5,
): Hall3State {
  let s = state;
  let left = plantSeconds;
  while (left > 1e-9) {
    const h = Math.min(slice, left);
    s = stepHall3(s, h);
    left -= h;
  }
  return s;
}

/** What the hall's instruments read: only what each shows. */
export function hall3Readings(s: Hall3State) {
  const m = s.controller.measured;
  return {
    flow: circulation(s),
    sampleFlow: sampleFlow(s),
    flowSwitch: s.controller.signals.flowOk,
    /** DC1's measured free chlorine and pH, and its outputs, 0 to 1. */
    free: m.free,
    ph: m.ph,
    hypoOut: s.controller.yout.hypochlorite,
    acidOut: s.controller.yout.acid,
    hypoLitres: s.tanks.hypochlorite.litres,
    acidLitres: s.tanks.acid.litres,
    bathers: bathersNow(s),
  };
}

/** The hall's model, as the museum's clock drives it. */
export const HALL3_MODEL = {
  reset: (now: number) => newHall3(now),
  step: stepHall3,
};
