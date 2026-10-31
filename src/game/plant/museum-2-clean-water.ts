import { expandForPlumbing } from './plumbing-expansion';
import type { Expansion, GivenFitting, PlumbEdge } from './plumbing-expansion';
import type { SchematicNode } from './schematics';
import {
  FILTER_PHYSICS,
  bedLifted,
  bedPasses,
  filterSizing,
  newIdealFilter,
  stepFilterBed,
  washedOut,
} from './ideal-filter';
import type { IdealFilterState } from './ideal-filter';
import {
  NOTCHES,
  PLANT as DEV51,
  RESISTANCE as DEV51_RESISTANCE,
  SPEEDS,
  START_TIME,
  solveWithDeadEnds,
  valveCharacteristic,
} from './ideal-pool-plant';
import type { TimeSpeed } from './ideal-pool-plant';
import { gaugeBar } from '../sim/hydraulics';
import type { NetLink, NetNode } from '../sim/hydraulics';
import {
  DEADHEAD,
  deadheadTrips,
  resetAllowed,
  secondsToReset,
  secondsToTrip,
  stepCasing,
} from './pump-deadhead';
import type { CasingThermal } from './pump-deadhead';
import {
  BOOSTER_INJECTOR,
  CONTACT_TANK,
  DEOZONISER,
  OFF_GAS_DESTRUCTOR,
  OZONE_GENERATOR,
  OZONE_MG_PER_PPM,
  OZONE_MONITOR,
} from './ozone';
import type {
  BoosterParams,
  ContactParams,
  DeozoniserParams,
  DeozoniserState,
  DestructorParams,
  GeneratorParams,
  GeneratorState,
  MonitorParams,
  MonitorState,
} from './ozone';

/**
 * PLANTROOMS Hall 2, "Clean water" (107b; the owner, 2026-10-28): a
 * smaller, focused plant of its own, built from dev51's models, read left
 * to right. Mains make-up into the ideal balance tank; the circulation
 * pump; the sand filter on its five-valve nest, its backwash to an ideal
 * drain; the ozone stage (a side stream's booster pump and venturi drawing
 * the generator's gas, fed from an ideal dry-air supply; the contact tank,
 * its off-gas destructor; the activated-carbon deozoniser); the
 * medium-pressure UV unit; the electromagnetic flowmeter; the ideal pool,
 * overflowing back to the tank. No heating: the pool is a constant 27 °C.
 * No energy, no chlorine (one concept per hall).
 *
 * The schematic is the one source of truth: machines, links, every valve
 * (given, with its role and normal state, so the plumber adds nothing) and
 * every instrument; every tag is derived from it (M2-P1-V1). The water is
 * solved with dev51's solver (`solveWithDeadEnds`) whenever a valve or the
 * pump changes; the bed, the casing, the ozone and the UV lamp are stepped
 * each tick by the blocks the game already has (`ideal-filter.ts`,
 * `pump-deadhead.ts`, `ozone.ts`). Pure; heads in metres above the floor,
 * flows m³/h, seconds.
 */

// ---- The schematic -----------------------------------------------------------

/** The hall's code, the first part of every tag. */
export const ROOM_CODE = 'M2';

export type MachineId =
  | 'mains'
  | 'tank'
  | 'pump'
  | 'feedTee'
  | 'filter'
  | 'wasteTee'
  | 'drain'
  | 'sideTee'
  | 'booster'
  | 'injector'
  | 'mixTee'
  | 'air'
  | 'generator'
  | 'contact'
  | 'destructor'
  | 'carbon'
  | 'uv'
  | 'pool';

/** The machines, left to right as the visitor faces them. */
export const NODES: readonly (SchematicNode & { id: MachineId })[] = [
  { id: 'mains', kind: 'ideal-mains', code: 'MW1', name: 'Ideal mains water' },
  { id: 'air', kind: 'ideal-air-supply', code: 'AS1', name: 'Ideal dry air' },
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
  { id: 'feedTee', kind: 'tee', code: 'TE1', name: 'Filter feed tee' },
  { id: 'filter', kind: 'sand-filter', code: 'F1', name: 'Sand filter' },
  { id: 'wasteTee', kind: 'tee', code: 'TE2', name: 'Waste tee' },
  { id: 'drain', kind: 'ideal-drain', code: 'DR1', name: 'Ideal drain' },
  { id: 'sideTee', kind: 'tee', code: 'TE3', name: 'Side-stream tee' },
  {
    id: 'booster',
    kind: 'booster-pump',
    code: 'P2',
    name: 'Ozone booster pump',
  },
  {
    id: 'injector',
    kind: 'venturi-injector',
    code: 'IJ1',
    name: 'Venturi injector',
  },
  { id: 'mixTee', kind: 'tee', code: 'TE4', name: 'Side-stream return tee' },
  {
    id: 'generator',
    kind: 'ozone-generator',
    code: 'OZ1',
    name: 'Ozone generator',
  },
  {
    id: 'contact',
    kind: 'ozone-contact-tank',
    code: 'CT1',
    name: 'Contact tank',
  },
  {
    id: 'destructor',
    kind: 'ozone-off-gas-destructor',
    code: 'DS1',
    name: 'Off-gas destructor',
  },
  { id: 'carbon', kind: 'gac-filter', code: 'CF1', name: 'Carbon deozoniser' },
  { id: 'uv', kind: 'uv-unit', code: 'UV1', name: 'UV unit' },
  { id: 'pool', kind: 'ideal-pool', code: 'IP1', name: 'Ideal pool' },
];

export type LinkId =
  | 'makeup'
  | 'overflow'
  | 'suction'
  | 'discharge'
  | 'toInlet'
  | 'toUnderdrain'
  | 'backwashOut'
  | 'rinse'
  | 'waste'
  | 'filtered'
  | 'mainRun'
  | 'sideSuction'
  | 'sideDischarge'
  | 'sideReturn'
  | 'toContact'
  | 'toCarbon'
  | 'toUv'
  | 'returnMain'
  | 'airFeed'
  | 'ozoneGas'
  | 'offGas';

const link = (
  id: LinkId,
  from: [MachineId, string],
  to: [MachineId, string],
  medium: 'water' | 'air' = 'water',
): PlumbEdge & { id: LinkId } => ({
  id,
  sourceId: from[0],
  sourcePort: from[1],
  targetId: to[0],
  targetPort: to[1],
  medium,
});

/** The links, each source to target the way its water (or gas) flows. */
export const LINKS: readonly (PlumbEdge & { id: LinkId })[] = [
  link('makeup', ['mains', 'out-1'], ['tank', 'makeup']),
  link('overflow', ['pool', 'overflow'], ['tank', 'inlet']),
  link('suction', ['tank', 'outlet'], ['pump', 'suction']),
  link('discharge', ['pump', 'discharge'], ['feedTee', 'in']),
  link('toInlet', ['feedTee', 'run'], ['filter', 'inlet']),
  link('toUnderdrain', ['feedTee', 'branch'], ['filter', 'backwash-in']),
  link('backwashOut', ['filter', 'backwash-out'], ['wasteTee', 'run']),
  link('rinse', ['filter', 'rinse'], ['wasteTee', 'branch']),
  link('waste', ['wasteTee', 'out'], ['drain', 'in-1']),
  link('filtered', ['filter', 'outlet'], ['sideTee', 'in']),
  link('mainRun', ['sideTee', 'run'], ['mixTee', 'run']),
  link('sideSuction', ['sideTee', 'branch'], ['booster', 'suction']),
  link('sideDischarge', ['booster', 'discharge'], ['injector', 'inlet']),
  link('sideReturn', ['injector', 'outlet'], ['mixTee', 'branch']),
  link('toContact', ['mixTee', 'out'], ['contact', 'inlet']),
  link('toCarbon', ['contact', 'outlet'], ['carbon', 'inlet']),
  link('toUv', ['carbon', 'outlet'], ['uv', 'inlet']),
  link('returnMain', ['uv', 'outlet'], ['pool', 'return']),
  link('airFeed', ['air', 'out-1'], ['generator', 'air'], 'air'),
  link('ozoneGas', ['generator', 'ozone'], ['injector', 'gas'], 'air'),
  link('offGas', ['contact', 'vent'], ['destructor', 'inlet'], 'air'),
];

/** What each link carries, in words, for its pipe's label. */
export const LINK_NAMES: Record<LinkId, string> = {
  makeup: 'Mains make-up',
  overflow: 'Pool overflow',
  suction: 'Pump suction',
  discharge: 'Pump discharge',
  toInlet: 'Filter inlet',
  toUnderdrain: 'Backwash supply',
  backwashOut: 'Backwash to waste',
  rinse: 'Rinse to waste',
  waste: 'Waste',
  filtered: 'Filtered water',
  mainRun: 'Filtered water',
  sideSuction: 'Side stream',
  sideDischarge: 'Side stream to injector',
  sideReturn: 'Ozonised side stream',
  toContact: 'To contact tank',
  toCarbon: 'Ozonised water',
  toUv: 'Deozonised water',
  returnMain: 'Return to pool',
  airFeed: 'Dry air',
  ozoneGas: 'Ozonised air',
  offGas: 'Off-gas',
};

/** Each link's pipe: its nominal bore, mm. */
export const LINK_DN: Record<LinkId, 25 | 50 | 65 | 150> = {
  makeup: 50,
  overflow: 150,
  suction: 150,
  discharge: 150,
  toInlet: 150,
  toUnderdrain: 150,
  backwashOut: 150,
  rinse: 150,
  waste: 150,
  filtered: 150,
  mainRun: 150,
  sideSuction: 65,
  sideDischarge: 65,
  sideReturn: 65,
  toContact: 150,
  toCarbon: 150,
  toUv: 150,
  returnMain: 150,
  airFeed: 25,
  ozoneGas: 25,
  offGas: 25,
};

export type ValveId =
  | 'tank.makeup.iso'
  | 'pump.suction.iso'
  | 'pump.discharge.nrv'
  | 'pump.discharge.iso'
  | 'filter.inlet.iso'
  | 'filter.outlet.iso'
  | 'filter.backwash-in.iso'
  | 'filter.backwash-out.iso'
  | 'filter.rinse.iso'
  | 'booster.suction.iso'
  | 'booster.discharge.nrv'
  | 'booster.discharge.iso'
  | 'injector.gas.nrv';

export type MeterId = 'returnMain.meter';

/** A schematic fitting with what the hall needs of it. */
export interface HallFitting extends GivenFitting {
  /** The machine whose tag it extends (a valve), or none (a meter, tagged by its loop). */
  of?: MachineId;
  /** A meter's kind, after the product it is modelled on. */
  meter?: 'electromagnetic';
  /** A valve's openings the visitor can set it to (a notch plate), or none: on or off. */
  throttles?: boolean;
  /** A valve's normal opening, 0 to 1. */
  normalOpening?: number;
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
  throttles: true,
  of,
  ...options,
});

const nonReturn = (
  id: ValveId,
  edge: LinkId,
  end: 'source' | 'target',
  role: string,
  of: MachineId,
): HallFitting => ({
  id,
  kind: 'non-return-valve',
  edge,
  end,
  normally: 'open',
  role,
  of,
});

const shutInService = { normally: 'closed', normalOpening: 0 } as const;

/**
 * Every fitting on the lines, as the plumber sets them from each end: the
 * make-up's isolating valve; the pump's suction and discharge valves and
 * its non-return valve; the filter's five-valve nest (V1 inlet, V2 outlet
 * in service; V3 underdrain feed, V4 backwash out, V5 rinse shut); the
 * booster's valves and non-return valve; the non-return valve that keeps
 * water out of the generator's gas line; and the circulation's flowmeter.
 */
export const FITTINGS: readonly HallFitting[] = [
  valve('tank.makeup.iso', 'makeup', 'target', 'mains make-up', 'tank', {
    throttles: false,
  }),
  valve('pump.suction.iso', 'suction', 'target', 'pump suction', 'pump'),
  nonReturn(
    'pump.discharge.nrv',
    'discharge',
    'source',
    'pump non-return',
    'pump',
  ),
  valve('pump.discharge.iso', 'discharge', 'source', 'pump discharge', 'pump'),
  valve('filter.inlet.iso', 'toInlet', 'target', 'filter inlet', 'filter'),
  valve('filter.outlet.iso', 'filtered', 'source', 'filter outlet', 'filter'),
  valve(
    'filter.backwash-in.iso',
    'toUnderdrain',
    'target',
    'filter backwash inlet',
    'filter',
    shutInService,
  ),
  valve(
    'filter.backwash-out.iso',
    'backwashOut',
    'source',
    'filter backwash outlet',
    'filter',
    shutInService,
  ),
  valve(
    'filter.rinse.iso',
    'rinse',
    'source',
    'filter rinse to waste',
    'filter',
    shutInService,
  ),
  valve(
    'booster.suction.iso',
    'sideSuction',
    'target',
    'booster suction',
    'booster',
    {
      throttles: false,
    },
  ),
  nonReturn(
    'booster.discharge.nrv',
    'sideDischarge',
    'source',
    'booster non-return',
    'booster',
  ),
  valve(
    'booster.discharge.iso',
    'sideDischarge',
    'source',
    'booster discharge',
    'booster',
    { throttles: false },
  ),
  nonReturn(
    'injector.gas.nrv',
    'ozoneGas',
    'target',
    'ozone gas non-return',
    'injector',
  ),
  {
    id: 'returnMain.meter',
    kind: 'flowmeter',
    edge: 'returnMain',
    end: 'source',
    normally: 'open',
    role: 'circulation',
    meter: 'electromagnetic',
  },
];

/** The valves a visitor works: every isolating valve. */
export const VALVES = FITTINGS.filter((f) => f.kind === 'isolating-valve').map(
  (f) => f.id as ValveId,
);

export type InstrumentKind =
  | 'pressure'
  | 'vacuum'
  | 'differential'
  | 'temperature'
  | 'sight-glass'
  | 'dissolved-ozone'
  | 'ozone-in-air'
  | 'uv-intensity'
  | 'level'
  | 'mimic';

/** A gauge, analyser or meter that is not set into a line as a fitting. */
export interface Instrument {
  id: string;
  kind: InstrumentKind;
  /** What it reads: a network node, a stream, or a machine's state. */
  reads: string;
  /** What it is for, in words. */
  role: string;
  /** The machine it is fitted to, if it is part of one. */
  on?: MachineId;
  /** The link it is set into, for one on a pipe. */
  edge?: LinkId;
}

/**
 * The instruments, left to right: the tank's level; the pump's suction and
 * discharge gauges; the filter's inlet and outlet gauges and its
 * differential gauge; the waste's sight glass; the injector's vacuum
 * gauge; the dissolved-ozone analysers after the contact tank and after
 * the carbon; the ozone-in-air monitor on the wall; the UV unit's
 * intensity sensor; the pool's thermometer; and the mimic panel that
 * repeats them.
 */
export const INSTRUMENTS: readonly Instrument[] = [
  {
    id: 'tank.li',
    kind: 'level',
    reads: 'tank',
    role: 'balance tank level',
    on: 'tank',
  },
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
    id: 'backwashOut.sg',
    kind: 'sight-glass',
    reads: 'waste',
    role: 'backwash water',
    edge: 'backwashOut',
  },
  {
    id: 'injector.pi',
    kind: 'vacuum',
    reads: 'vacuum',
    role: 'injector vacuum',
    on: 'injector',
  },
  {
    id: 'toCarbon.ai',
    kind: 'dissolved-ozone',
    reads: 'contactResidual',
    role: 'ozone after the contact tank',
    edge: 'toCarbon',
  },
  {
    id: 'toUv.ai',
    kind: 'dissolved-ozone',
    reads: 'carbonResidual',
    role: 'ozone after the carbon',
    edge: 'toUv',
  },
  {
    id: 'hall.ai',
    kind: 'ozone-in-air',
    reads: 'roomPpm',
    role: 'ozone in the air',
  },
  {
    id: 'uv.ri',
    kind: 'uv-intensity',
    reads: 'intensity',
    role: 'UV intensity',
    on: 'uv',
  },
  {
    id: 'pool.ti',
    kind: 'temperature',
    reads: 'pool',
    role: 'pool water',
    on: 'pool',
  },
  // The mimic panel on the south wall: a panel of repeaters (the readouts
  // and lamps above), coded MP as the plant rooms' mimic panels are.
  {
    id: 'mimic',
    kind: 'mimic',
    reads: 'hall',
    role: 'mimic panel',
  },
];

// ---- Tags, derived -------------------------------------------------------------

const nodeById = new Map(NODES.map((n) => [n.id, n]));

/** A machine's tag: the hall's code and its own (M2-P1). */
export const machineTag = (id: MachineId) =>
  `${ROOM_CODE}-${nodeById.get(id)!.code}`;

const LETTERS: Record<InstrumentKind, string> = {
  pressure: 'PI',
  vacuum: 'PI',
  differential: 'PDI',
  temperature: 'TI',
  'sight-glass': 'SG',
  'dissolved-ozone': 'AI',
  'ozone-in-air': 'AI',
  'uv-intensity': 'RI',
  level: 'LI',
  mimic: 'MP',
};

/**
 * Every tag, derived from the schematic and never written by hand: a valve
 * its machine's tag and its number among that machine's valves (M2-F1-V2;
 * a non-return valve NRV); a meter FT and its number; an instrument its
 * ISA letters and its number among those of its letters, in the
 * schematic's order (M2-PI1, M2-PDI1, M2-AI1).
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
  return tags;
})();

/** A tag's short form, as a placard or the mimic prints it: FT1, F1-V2. */
export const shortTag = (id: string) => TAGS[id].slice(ROOM_CODE.length + 1);

const fittingById = new Map(FITTINGS.map((f) => [f.id, f]));

/** A fitting of the schematic, by id. */
export const fittingOf = (id: string) => fittingById.get(id);

/** What a fitting is, in words, from the model: "Pump suction valve". */
export function fittingName(f: HallFitting): string {
  const role = f.role ?? '';
  const words = role.charAt(0).toUpperCase() + role.slice(1);
  if (f.kind === 'flowmeter') return `${words} flowmeter (electromagnetic)`;
  if (f.kind === 'non-return-valve')
    return `${words.replace(/ non-return$/, '')} non-return valve`;
  return `${words} valve`;
}

/** What a machine is connected to, from the links. */
export function connectionsOf(id: MachineId): { from: string[]; to: string[] } {
  const name = (m: string) => nodeById.get(m as MachineId)?.name ?? m;
  return {
    from: LINKS.filter((l) => l.targetId === id).map((l) => name(l.sourceId)),
    to: LINKS.filter((l) => l.sourceId === id).map((l) => name(l.targetId)),
  };
}

/** The plumber's rules: isolate both pumps' and the filter's water connections; a non-return valve on each pump. */
export const RULES = {
  isolate: new Set(['end-suction-pump', 'booster-pump', 'sand-filter']),
  pumps: new Set(['end-suction-pump', 'booster-pump']),
  discharge: 'discharge',
} as const;

/** The enhanced network: the schematic expanded by the plumber, its fittings given. */
export function hall2Expansion(): Expansion {
  return expandForPlumbing(NODES, LINKS, { ...RULES, given: FITTINGS });
}

// ---- The physics -------------------------------------------------------------

/** The sand filter, dev51's: Ø2.8 m, a 1 m bed. */
export const FILTER_SPEC = { diameter: 2.8 } as const;

/**
 * The dead-headed pump's casing in the museum (the owner, 2026-10-28): it
 * trips about a minute after its valve is shut and may be reset about half
 * a minute later, by a smaller heat capacity than dev51's 167 kJ/K (its
 * trip at 45 °C and reset below 42 °C unchanged).
 */
export const MUSEUM_CASING: CasingThermal = {
  casingKJperK: 33,
  casingUA: 0.17,
};

export const PLANT = {
  /** The pool's and the tank's water levels, m above the floor (ideal: fixed), and the pool's volume, m³ (dev51's). */
  poolHead: DEV51.poolHead,
  tankHead: DEV51.tankHead,
  poolVolume: DEV51.poolVolume,
  /** The balance tank's water at its working level, m³; its low-level cut-out, m³. */
  tankVolume: 30,
  tankLow: 3,
  /** The make-up's float valve: its most, m³/h, at full bore (DN50 off the mains, indicative). */
  makeupMax: 20,
  /** The pump's curve (Grundflow NKC 150-315): H = shutoff − k·Q². */
  pumpShutoff: DEV51.pumpShutoff,
  pumpK: DEV51.pumpK,
  pumpAxis: DEV51.pumpAxis,
  filterGauges: DEV51.filterGauges,
  poolDirt: DEV51.poolDirt,
  glassLag: DEV51.glassLag,
  surgeMain: DEV51.surgeMain,
  surgeClose: DEV51.surgeClose,
  surgeLag: DEV51.surgeLag,
  /** The plant room's air, and the pool's water, constant, °C. */
  roomC: DEV51.roomC,
  poolC: 27,
  /** The ideal dry air: its dew point, °C; the generator's ideal cooling water, l/h and °C. */
  airDewPoint: -65,
  coolingFlow: 400,
  coolingC: 18,
  /** The generator's output knob at the start, %. */
  setpoint: 80,
  /** The UV lamp: its least flow, m³/h (its flow switch); its sensor's reading at full output, W/m²; its warm-up, s. */
  uvMinFlow: 20,
  uvFull: 180,
  uvWarmUp: 90,
  /** Its lamp's hours at the start (a lamp part-way through its life, indicative). */
  uvHoursStart: 2150,
  /** A backwash is due at this rise of PDI1 over a clean bed's, bar (UK practice: 0.3 to 0.5 bar, indicative). */
  backwashDueRise: 0.4,
  /** A backwash's length, s (five minutes), and its rinse's (one minute). */
  backwashSeconds: 300,
  rinseSeconds: 60,
} as const;

/**
 * The ozone stage's machines (`ozone.ts`), sized for this hall's flow:
 * the generator after ProMinent's Bono Zon BONa 3D and Ozonia's CFS-7
 * (240 g/h); the booster's side stream about a tenth of the flow; the
 * contact tank 7 m³, a little over two minutes at the normal duty; the
 * monitor in the hall's air (15.4 × 13.4 × 9.5 m, four air changes an hour).
 */
export const OZONE = {
  generator: { ...OZONE_GENERATOR.params, rated: 240 } as GeneratorParams,
  booster: {
    ...BOOSTER_INJECTOR.params,
    flow: 15,
    power: 2.2,
  } as BoosterParams,
  contact: { ...CONTACT_TANK.params, volume: 7 } as ContactParams,
  carbon: DEOZONISER.params as DeozoniserParams,
  destructor: OFF_GAS_DESTRUCTOR.params as DestructorParams,
  monitor: {
    ...OZONE_MONITOR.params,
    volume: 1960,
    changes: 4,
  } as MonitorParams,
} as const;

/** A resistance that loses `metres` at `flow`. */
const r = (metres: number, flow: number) => metres / (flow * flow);

/** Resistances, m per (m³/h)²: dev51's, and the treatment train's at about its normal flow. */
export const RESISTANCE = {
  suctionPipe: DEV51_RESISTANCE.suctionPipe,
  dischargePipe: DEV51_RESISTANCE.dischargePipe,
  nonReturn: DEV51_RESISTANCE.nonReturn,
  feedPipe: DEV51_RESISTANCE.feedPipe,
  filteredPipe: DEV51_RESISTANCE.filteredPipe,
  wasteRun: DEV51_RESISTANCE.wasteRun,
  returnMain: DEV51_RESISTANCE.returnMain,
  /** The contact tank's inlet and baffles, the carbon's 0.5 m bed and nozzles, the UV chamber (indicative). */
  contactTank: r(0.3, 185),
  carbonBed: r(1.0, 185),
  uvChamber: r(0.3, 185),
  valveOpen: DEV51_RESISTANCE.valveOpen[150],
} as const;

export type { TimeSpeed };
export { NOTCHES, SPEEDS };

export interface Hall2State {
  /** Each valve's opening, 0 shut to 1 open. */
  opening: Record<ValveId, number>;
  pumpRunning: boolean;
  boosterRunning: boolean;
  /** The pump's casing water, °C, and its thermostat's latch; the low-level cut-out's latch. */
  casingC: number;
  tripped: boolean;
  lowLevel: boolean;
  /** The balance tank's water, m³. */
  tankWater: number;
  bed: IdealFilterState;
  wasteDirt: number;
  surge: number;
  /** The ozone generator: its mains switch, RUN, output knob (%), its latched trip, and RESET pressed. */
  generatorOn: boolean;
  generatorRun: boolean;
  setpoint: number;
  generator: GeneratorState;
  /** The destructor's switch; the carbon's state; the hall's air and the monitor's latch. */
  destructorOn: boolean;
  carbon: DeozoniserState;
  monitor: MonitorState;
  /** The UV unit's switch, its lamp's output (0 to 1, warming up), its lamp hours. */
  uvOn: boolean;
  uvOutput: number;
  uvHours: number;
  speed: TimeSpeed;
  seconds: number;
  clockStart: number;
  sinceReset: number;
}

/** A valve's normal opening, as the schematic has it. */
export const normalOpening = (id: ValveId) => {
  const f = fittingById.get(id)!;
  return f.normalOpening ?? (f.normally === 'open' ? 1 : 0);
};

/** The hall as it starts (and on RESET): every valve normal, both pumps running, a clean bed, the ozone and UV running, ×1. */
export function newHall2(clockStart: number = START_TIME): Hall2State {
  return {
    opening: Object.fromEntries(
      VALVES.map((v) => [v, normalOpening(v)]),
    ) as Record<ValveId, number>,
    pumpRunning: true,
    boosterRunning: true,
    casingC: PLANT.poolC,
    tripped: false,
    lowLevel: false,
    tankWater: PLANT.tankVolume,
    bed: newIdealFilter(),
    wasteDirt: 0,
    surge: 0,
    generatorOn: true,
    generatorRun: true,
    setpoint: PLANT.setpoint,
    generator: OZONE_GENERATOR.init(OZONE.generator),
    destructorOn: true,
    carbon: DEOZONISER.init(OZONE.carbon),
    monitor: OZONE_MONITOR.init(OZONE.monitor),
    uvOn: true,
    uvOutput: 1,
    uvHours: PLANT.uvHoursStart,
    speed: 1,
    seconds: 0,
    clockStart,
    sinceReset: Infinity,
  };
}

export type Hall2Action =
  | { type: 'valve'; id: ValveId; opening: number }
  | { type: 'notch'; id: ValveId; by: 1 | -1 }
  | { type: 'pump'; run: boolean }
  /** RESET at the pump: clears its trip once the casing has cooled and the tank is above its low level. */
  | { type: 'trip-reset' }
  | { type: 'booster'; run: boolean }
  | { type: 'generator-power'; on: boolean }
  | { type: 'generator-run'; run: boolean }
  /** The generator's output knob, %. */
  | { type: 'setpoint'; percent: number }
  /** RESET on the generator: clears a latched trip whose cause has gone. */
  | { type: 'generator-reset' }
  | { type: 'destructor'; on: boolean }
  /** RESET on the ozone monitor: clears its alarm once the air is clear. */
  | { type: 'monitor-reset' }
  | { type: 'uv'; on: boolean }
  | { type: 'speed'; speed: TimeSpeed }
  /** RESET SIMULATION (and walking in): everything to the start, its clock to `clock`. */
  | { type: 'reset'; clock?: number };

/** What the generator sees now, as its block's inputs. */
function generatorInputs(s: Hall2State, f: Hall2Flows, reset = false) {
  return {
    power: s.generatorOn,
    enable: s.generatorRun,
    setpoint: s.setpoint,
    circulation: f.toPool,
    dewPoint: PLANT.airDewPoint,
    dry: true,
    coolingFlow: PLANT.coolingFlow,
    coolingTemp: PLANT.coolingC,
    vacuum: boosterNow(s, f).vacuum,
    door: false,
    roomAlarm: s.monitor.alarm,
    leak: 0,
    reset,
  };
}

/** Act on the hall: a valve, a switch, a knob, a reset. */
export function actOnHall2(s: Hall2State, a: Hall2Action): Hall2State {
  switch (a.type) {
    case 'valve':
      return withSurge(s, {
        ...s,
        opening: { ...s.opening, [a.id]: Math.max(0, Math.min(1, a.opening)) },
      });
    case 'notch': {
      const f = fittingById.get(a.id)!;
      const now = s.opening[a.id];
      if (f.throttles === false)
        return withSurge(s, {
          ...s,
          opening: { ...s.opening, [a.id]: a.by > 0 ? 1 : 0 },
        });
      const i = NOTCHES.reduce(
        (best, n, k) =>
          Math.abs(n - now) < Math.abs(NOTCHES[best] - now) ? k : best,
        0,
      );
      const k = Math.max(0, Math.min(NOTCHES.length - 1, i + a.by));
      return withSurge(s, {
        ...s,
        opening: { ...s.opening, [a.id]: NOTCHES[k] },
      });
    }
    case 'pump':
      return a.run && (s.tripped || s.lowLevel)
        ? s
        : { ...s, pumpRunning: a.run };
    case 'trip-reset':
      return {
        ...s,
        tripped: s.tripped && !resetAllowed(s.casingC),
        lowLevel: s.lowLevel && s.tankWater <= PLANT.tankLow,
      };
    case 'booster':
      return { ...s, boosterRunning: a.run };
    case 'generator-power':
      return { ...s, generatorOn: a.on };
    case 'generator-run':
      return { ...s, generatorRun: a.run };
    case 'setpoint':
      return { ...s, setpoint: Math.max(0, Math.min(100, a.percent)) };
    case 'generator-reset': {
      const f = solveHall2(s);
      const p = OZONE.generator;
      const { state } = OZONE_GENERATOR.step(
        p,
        s.generator,
        generatorInputs(s, f, true),
        0,
        s.seconds,
        0,
      );
      return { ...s, generator: state };
    }
    case 'destructor':
      return { ...s, destructorOn: a.on };
    case 'monitor-reset': {
      const ppm = s.monitor.conc / OZONE_MG_PER_PPM;
      return ppm < OZONE.monitor.warning
        ? { ...s, monitor: { ...s.monitor, alarm: false } }
        : s;
    }
    case 'uv':
      return { ...s, uvOn: a.on };
    case 'speed':
      return { ...s, speed: a.speed };
    case 'reset':
      return { ...newHall2(a.clock ?? s.clockStart), sinceReset: 0 };
  }
}

/** The main's bore's area, m² (DN150). */
const MAIN_AREA = (Math.PI * 0.15 ** 2) / 4;

/** A valve worked while the pump runs: the surge felt at the discharge gauge (Joukowsky, slowed by the closure), as dev51's. */
function withSurge(before: Hall2State, after: Hall2State) {
  if (!before.pumpRunning) return after;
  const dq = Math.abs(
    solveHall2(before).circulation - solveHall2(after).circulation,
  );
  const dv = dq / 3600 / MAIN_AREA;
  const bar = (2 * 1000 * PLANT.surgeMain * dv) / PLANT.surgeClose / 1e5;
  return { ...after, surge: Math.max(before.surge, bar) };
}

/** The water network's solution. */
export interface Hall2Flows {
  /** Through the pump; on to the pool; down through the bed (+) or up (−); to waste by V4 and V5; m³/h. */
  circulation: number;
  toPool: number;
  bed: number;
  backwash: number;
  rinse: number;
  feedTop: number;
  feedBottom: number;
  lifted: boolean;
  meter: Record<MeterId, number>;
  /** Each pressure gauge's reading, bar. */
  gauge: Record<string, number>;
  pumpHead: number;
  converged: boolean;
}

function valveR(s: Hall2State, id: ValveId) {
  const k = valveCharacteristic(s.opening[id]);
  return k <= 1e-6 ? null : RESISTANCE.valveOpen / (k * k);
}

const dirtStep = (bed: IdealFilterState) => {
  const ref = filterSizing(FILTER_SPEC).dirtRef;
  return (Math.round((bed.dirt / ref) * 50) / 50) * ref;
};

function bedResistance(bed: IdealFilterState, lifted: boolean) {
  const z = filterSizing(FILTER_SPEC);
  if (lifted) return z.bedDepth / (z.washFlow * z.washFlow);
  return (
    (z.cleanHead / (z.designFlow * z.designFlow)) *
    (1 + dirtStep(bed) / z.dirtRef) *
    (1 - 0.6 * bed.fissuring)
  );
}

/** What the water network depends on: when this changes, it is solved again. */
export const networkKey = (s: Hall2State) =>
  `${s.pumpRunning ? 1 : 0}|${dirtStep(s.bed).toFixed(4)}|${Math.round(s.bed.fissuring * 50)}|${VALVES.map((v) => s.opening[v]).join(',')}`;

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
 * Solve the circulation: tank to pool through the pump, the filter's nest
 * and the treatment train (contact tank, carbon, UV), or to waste in a
 * backwash. The booster's side stream leaves and rejoins the main between
 * two tees a pipe's length apart, so it changes nothing here (`boosterNow`).
 */
export function solveHall2(s: Hall2State): Hall2Flows {
  const R = RESISTANCE;
  const nodes: NetNode[] = [
    { id: 'tank', head: PLANT.tankHead },
    { id: 'pool', head: PLANT.poolHead },
    { id: 'waste', head: 0 },
    { id: 'pumpIn' },
    { id: 'pumpOut' },
    { id: 'checked' },
    { id: 'feed' },
    { id: 'filterIn' },
    { id: 'filterOut' },
    { id: 'treated' },
  ];
  const network = (lifted: boolean): NetLink[] => [
    series('suction', 'tank', 'pumpIn', [
      R.suctionPipe,
      valveR(s, 'pump.suction.iso'),
    ]),
    {
      id: 'pump',
      kind: 'pump',
      from: 'pumpIn',
      to: 'pumpOut',
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
    series('discharge', 'checked', 'feed', [
      R.dischargePipe,
      valveR(s, 'pump.discharge.iso'),
    ]),
    series('toInlet', 'feed', 'filterIn', [
      R.feedPipe,
      valveR(s, 'filter.inlet.iso'),
    ]),
    series('toUnderdrain', 'feed', 'filterOut', [
      R.feedPipe,
      valveR(s, 'filter.backwash-in.iso'),
    ]),
    {
      id: 'bed',
      kind: 'resistance',
      from: 'filterIn',
      to: 'filterOut',
      r: bedResistance(s.bed, lifted),
    },
    series('filtered', 'filterOut', 'treated', [
      R.filteredPipe,
      valveR(s, 'filter.outlet.iso'),
    ]),
    series('backwashOut', 'filterIn', 'waste', [
      R.wasteRun,
      valveR(s, 'filter.backwash-out.iso'),
    ]),
    series('rinse', 'filterOut', 'waste', [
      R.wasteRun,
      valveR(s, 'filter.rinse.iso'),
    ]),
    {
      id: 'train',
      kind: 'resistance',
      from: 'treated',
      to: 'pool',
      r: R.contactTank + R.carbonBed + R.uvChamber + R.returnMain,
    },
  ];
  let c = solveWithDeadEnds(nodes, network(false), PLANT.poolHead);
  let lifted = false;
  if (bedLifted(FILTER_SPEC, c.flows.bed ?? 0)) {
    c = solveWithDeadEnds(nodes, network(true), PLANT.poolHead);
    lifted = true;
  }
  const clean = (q: number) => (Math.abs(q) < 0.05 ? 0 : q);
  const toPool = clean(c.flows.filtered);
  const h = c.heads;
  return {
    circulation: clean(c.flows.suction),
    toPool,
    bed: clean(c.flows.bed),
    backwash: clean(c.flows.backwashOut),
    rinse: clean(c.flows.rinse),
    feedTop: clean(c.flows.toInlet),
    feedBottom: clean(c.flows.toUnderdrain),
    lifted,
    meter: { 'returnMain.meter': toPool },
    gauge: {
      'pump.suction.pi': gaugeBar(h.pumpIn, PLANT.pumpAxis),
      'pump.discharge.pi': gaugeBar(h.pumpOut, PLANT.pumpAxis),
      'filter.inlet.pi': gaugeBar(h.filterIn, PLANT.filterGauges),
      'filter.outlet.pi': gaugeBar(h.filterOut, PLANT.filterGauges),
      'filter.pdi': gaugeBar(h.filterIn - h.filterOut, 0),
    },
    pumpHead: h.pumpOut - h.pumpIn,
    converged: c.converged,
  };
}

/** A pressure gauge's reading, bar: the network's, and a surge on the discharge. */
export const gaugeReading = (s: Hall2State, f: Hall2Flows, id: string) =>
  (f.gauge[id] ?? 0) + (id === 'pump.discharge.pi' ? s.surge : 0);

/**
 * The booster and its venturi now: running with both its valves open. Its
 * side stream leaves the main at one tee and rejoins it at the next, so it
 * circulates round that little loop even when the main is stopped, and
 * its venturi's vacuum holds.
 */
export function boosterNow(s: Hall2State, _f?: Hall2Flows) {
  const supply =
    s.opening['booster.suction.iso'] > 0 &&
    s.opening['booster.discharge.iso'] > 0;
  return BOOSTER_INJECTOR.read!(
    OZONE.booster,
    null,
    { supply, run: s.boosterRunning },
    s.seconds,
  ) as { running: boolean; vacuum: number; flow: number; power: number };
}

/** What the ozone stage is doing now. */
export interface OzoneReadings {
  /** The generator: g/h made, its status words, its lamps, its fault code. */
  ozone: number;
  status: string;
  running: boolean;
  alarm: boolean;
  code: number;
  /** The booster's side stream, m³/h, and the venturi's vacuum, mbar. */
  sideFlow: number;
  vacuum: number;
  /** The dose per volume treated, the contact tank's outlet and the carbon's, mg/l; contact time, s; off-gas, g/h. */
  applied: number;
  contactResidual: number;
  carbonResidual: number;
  contact: number;
  offGas: number;
  /** Off-gas getting past the destructor, g/h; ozone in the hall's air, ppm; the monitor's warning and alarm. */
  slip: number;
  roomPpm: number;
  warning: boolean;
  roomAlarm: boolean;
}

export function ozoneNow(s: Hall2State, f: Hall2Flows): OzoneReadings {
  const b = boosterNow(s, f);
  const g = OZONE_GENERATOR.read!(
    OZONE.generator,
    s.generator,
    generatorInputs(s, f),
    s.seconds,
  );
  const ozone = g.ozone as number;
  const c = CONTACT_TANK.read!(
    OZONE.contact,
    null,
    { flow: f.toPool, dose: ozone },
    s.seconds,
  );
  const d = DEOZONISER.read!(
    OZONE.carbon,
    s.carbon,
    { flow: f.toPool, residualIn: c.residual as number },
    s.seconds,
  );
  const x = OFF_GAS_DESTRUCTOR.read!(
    OZONE.destructor,
    null,
    { offGas: c.offGas as number, power: s.destructorOn, fault: false },
    s.seconds,
  );
  const ppm = s.monitor.conc / OZONE_MG_PER_PPM;
  return {
    ozone,
    status: g.status as string,
    running: g.running as boolean,
    alarm: g.alarm as boolean,
    code: g.code as number,
    sideFlow: b.flow,
    vacuum: b.vacuum,
    applied: c.applied as number,
    contactResidual: c.residual as number,
    carbonResidual: d.residual as number,
    contact: c.contact as number,
    offGas: c.offGas as number,
    slip: x.slip as number,
    roomPpm: ppm,
    warning: ppm >= OZONE.monitor.warning,
    roomAlarm: s.monitor.alarm,
  };
}

/** The UV unit now: lit with its switch on and enough water through it (its flow switch). */
export function uvLit(s: Hall2State, f: Hall2Flows) {
  return s.uvOn && f.toPool >= PLANT.uvMinFlow;
}

/** What the UV unit's intensity sensor reads, W/m². */
export const uvIntensity = (s: Hall2State) => PLANT.uvFull * s.uvOutput;

/** The water the make-up's float valve lets in, m³/h: up to its most while the tank is below its working level and its valve is open. */
export function makeupFlow(s: Hall2State) {
  if (s.tankWater >= PLANT.tankVolume - 1e-6) return 0;
  return PLANT.makeupMax * valveCharacteristic(s.opening['tank.makeup.iso']);
}

const ease = (from: number, to: number, tau: number, dt: number) =>
  to + (from - to) * Math.exp(-dt / tau);

/** Step the hall `dt` real seconds (its own time at its speed), in small steps; the network re-solved when it changes. */
export function stepHall2(
  state: Hall2State,
  flows: Hall2Flows,
  dt: number,
): Hall2State {
  if (!(dt > 0)) return state;
  let s = { ...state, sinceReset: state.sinceReset + dt };
  let f = flows;
  let key = networkKey(s);
  let left = dt * s.speed;
  while (left > 1e-9) {
    const h = Math.min(left, 0.5);
    s = stepOnce(s, f, h);
    const next = networkKey(s);
    if (next !== key) {
      key = next;
      f = solveHall2(s);
    }
    left -= h;
  }
  return s;
}

function stepOnce(s: Hall2State, f: Hall2Flows, dt: number): Hall2State {
  const t = s.seconds + dt;
  // The pump's casing and its thermostat (the museum's shorter timing).
  const casingC = stepCasing(
    s.casingC,
    {
      running: s.pumpRunning,
      flow: f.circulation,
      head: f.pumpHead,
      inletC: PLANT.poolC,
      roomC: PLANT.roomC,
    },
    dt,
    MUSEUM_CASING,
  );
  const trip = s.pumpRunning && deadheadTrips(casingC);
  // The tank: the waste leaves it, the float valve tops it up.
  const toWaste = f.backwash + f.rinse;
  const tankWater = Math.min(
    PLANT.tankVolume,
    Math.max(0, s.tankWater + ((makeupFlow(s) - toWaste) * dt) / 3600),
  );
  const low = s.pumpRunning && tankWater <= PLANT.tankLow;
  // The bed and the waste's sight glass, as dev51's.
  const bed = stepFilterBed(FILTER_SPEC, s.bed, f.bed, PLANT.poolDirt, dt);
  const dirt =
    toWaste <= 0
      ? s.wasteDirt
      : (f.backwash * washedOut(FILTER_SPEC, s.bed, f.bed) +
          f.rinse * bedPasses(FILTER_SPEC, s.bed, PLANT.poolDirt)) /
        toWaste;
  // The ozone stage: the generator's latch, the carbon used, the hall's air.
  const gen = OZONE_GENERATOR.step(
    OZONE.generator,
    s.generator,
    generatorInputs(s, f),
    dt,
    t,
    0,
  );
  const o = ozoneNow(s, f);
  const carbon = DEOZONISER.step(
    OZONE.carbon,
    s.carbon,
    { flow: f.toPool, residualIn: o.contactResidual },
    dt,
    t,
    0,
  ).state;
  const monitor = OZONE_MONITOR.step(
    OZONE.monitor,
    s.monitor,
    { leak: 0, slip: o.slip, reset: false },
    dt,
    t,
    0,
  ).state;
  // The UV lamp: warming up while lit, out at once when not; its hours counting while lit.
  const lit = uvLit(s, f);
  const uvOutput = lit ? ease(s.uvOutput, 1, PLANT.uvWarmUp / 3, dt) : 0;
  return {
    ...s,
    casingC,
    tankWater,
    bed,
    wasteDirt: ease(s.wasteDirt, dirt, PLANT.glassLag, dt),
    surge: s.surge * Math.exp(-dt / PLANT.surgeLag),
    generator: gen.state,
    carbon,
    monitor,
    uvOutput,
    uvHours: s.uvHours + (lit ? dt / 3600 : 0),
    seconds: t,
    ...(trip ? { tripped: true, pumpRunning: false } : {}),
    ...(low ? { lowLevel: true, pumpRunning: false } : {}),
  };
}

/** Everything the hall shows, at once: the flows, the gauges, the ozone, the UV, the tank. */
export interface Hall2Readings {
  flows: Hall2Flows;
  ozone: OzoneReadings;
  uvLit: boolean;
  uvIntensity: number;
  makeup: number;
  turnover: number;
}

export function hall2Readings(
  s: Hall2State,
  flows = solveHall2(s),
): Hall2Readings {
  return {
    flows,
    ozone: ozoneNow(s, flows),
    uvLit: uvLit(s, flows),
    uvIntensity: uvIntensity(s),
    makeup: makeupFlow(s),
    turnover: turnoverHours(flows.toPool),
  };
}

/** How long the pool takes to pass once through the plant at a flow, hours. */
export const turnoverHours = (flow: number) =>
  flow > 0 ? PLANT.poolVolume / flow : Infinity;

/** The plant's clock, seconds after midnight. */
export const plantClock = (s: Hall2State) => (s.clockStart + s.seconds) % 86400;

/** The plant's clock as a display shows it: HH:MM:SS. */
export function clockText(s: Hall2State) {
  const t = Math.floor(plantClock(s));
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(Math.floor(t / 3600))}:${two(Math.floor(t / 60) % 60)}:${two(t % 60)}`;
}

/** Run the hall `seconds` of its own time (its speed ignored), solving its network as it changes. */
export function runHall2(s: Hall2State, seconds: number): Hall2State {
  const at1 = { ...s, speed: 1 as TimeSpeed };
  const out = stepHall2(at1, solveHall2(at1), seconds);
  return { ...out, speed: s.speed, sinceReset: s.sinceReset };
}

/** The museum pump's dead-head timing, for the placards: seconds to trip from the pool's water, and to cool to a reset. */
export const deadheadTiming = () => ({
  trip: secondsToTrip(PLANT.poolC, PLANT.roomC, MUSEUM_CASING),
  reset: secondsToReset(DEADHEAD.tripC, PLANT.roomC, MUSEUM_CASING),
});

/** The filter's settings, derived from the model, for the placard that states them. */
export function filterSettings() {
  const z = filterSizing(FILTER_SPEC);
  const s = newHall2();
  const f = solveHall2(s);
  const clean = f.gauge['filter.pdi'];
  const wash = backwashFlows();
  return {
    diameter: FILTER_SPEC.diameter,
    area: z.area,
    bedDepth: z.bedDepth,
    flow: f.toPool,
    velocity: f.toPool / z.area,
    designRate: FILTER_PHYSICS.filtrationRate,
    turnover: turnoverHours(f.toPool),
    cleanBar: clean,
    dueBar: clean + PLANT.backwashDueRise,
    backwashFlow: wash.backwash,
    backwashVelocity: wash.backwash / z.area,
    backwashMinutes: PLANT.backwashSeconds / 60,
    toWaste: (wash.backwash * PLANT.backwashSeconds) / 3600,
  };
}

/** The backwash line-up: the pump running, V1 and V2 shut, V3 and V4 open. */
export function backwashLineUp(s: Hall2State): Hall2State {
  return {
    ...s,
    opening: {
      ...s.opening,
      'filter.inlet.iso': 0,
      'filter.outlet.iso': 0,
      'filter.backwash-in.iso': 1,
      'filter.backwash-out.iso': 1,
      'filter.rinse.iso': 0,
    },
  };
}

/** The flows of a full backwash. */
export const backwashFlows = () => solveHall2(backwashLineUp(newHall2()));
