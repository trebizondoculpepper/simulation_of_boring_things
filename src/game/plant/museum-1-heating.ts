import { expandForPlumbing } from './plumbing-expansion';
import type {
  Expansion,
  GivenFitting,
  PlumbEdge,
  PlumbMedium,
} from './plumbing-expansion';
import type { SchematicNode } from './schematics';
import { effectiveness } from './pool-heating';
import { THERMAL, saturation, thermalParams } from './thermal';
import { ACTIVITY_FACTOR, evaporationRate } from './evaporation';
import type { Activity } from './evaporation';
import { GROUND } from './heat-loss';
import { BOILER_EFFICIENCY, GAS_ENERGY, WATER_HEAT } from './heat-loop';
import { deadheadTrips, resetAllowed, stepCasing } from './pump-deadhead';
import {
  boilerLamps,
  newBoiler,
  pressBoiler,
  setBoilerSetpoint,
  stepBoiler,
} from '../../toolkit/components/plant/logic/boiler-house';
import type {
  BoilerKey,
  BoilerState,
} from '../../toolkit/components/plant/logic/boiler-house';

/**
 * Hall 1 of the museum, "Warm water" (107a; the owner, 2026-10-28: "a real
 * gas boiler and a heat exchanger connected to an ideal pool"). The
 * schematic is the one source of truth: an ideal gas main feeds a real
 * condensing boiler through its meter and valves; the boiler heats a
 * sealed primary circuit, pumped by a twin-head circulator, through a
 * plate heat exchanger (and a differential bypass when the exchanger's
 * motorised valve is shut); the pool's own pump moves the ideal pool's
 * water through the exchanger's other side and back. A thermostat on the
 * pool's water calls for heat, on and off or modulating, as the visitor
 * chooses; the boiler fires only while it calls and the pool's water is
 * flowing (FS1). The pool loses heat by evaporation (vapour pressure, as
 * `thermal.ts`), convection to its hall's air and conduction to the
 * ground; a cover cuts its evaporation; swimmers raise it.
 *
 * Every fitting is given with its role and normal state, so the plumber
 * adds nothing; tags are derived (room code M1). Pure; °C, kW, m³/h,
 * seconds, metres of head.
 */

// ---- The schematic -----------------------------------------------------------

/** The hall's room code: its number (107-0), the first part of every tag. */
export const ROOM_CODE = 'M1';

export type MachineId =
  | 'gasMain'
  | 'boiler'
  | 'atmosphere'
  | 'flowTee'
  | 'returnTee'
  | 'hx'
  | 'primaryPump'
  | 'pressurisation'
  | 'poolPump'
  | 'pool';

export const NODES: readonly (SchematicNode & { id: MachineId })[] = [
  {
    id: 'gasMain',
    kind: 'ideal-gas-source',
    code: 'GS1',
    name: 'Ideal gas main',
  },
  {
    id: 'boiler',
    kind: 'condensing-boiler',
    code: 'B1',
    name: 'Condensing boiler',
  },
  {
    id: 'atmosphere',
    kind: 'ideal-atmosphere',
    code: 'AT1',
    name: 'The open air (flue terminal)',
  },
  { id: 'flowTee', kind: 'tee', code: 'TE1', name: 'Bypass tee, flow' },
  { id: 'returnTee', kind: 'tee', code: 'TE2', name: 'Bypass tee, return' },
  {
    id: 'hx',
    kind: 'plate-heat-exchanger',
    code: 'HX1',
    name: 'Plate heat exchanger',
  },
  {
    id: 'primaryPump',
    kind: 'twin-head-pump',
    code: 'P1',
    name: 'Primary pump',
  },
  {
    id: 'pressurisation',
    kind: 'pressurisation-unit',
    code: 'PU1',
    name: 'Pressurisation unit',
  },
  {
    id: 'poolPump',
    kind: 'end-suction-pump',
    code: 'P2',
    name: 'Pool pump',
  },
  { id: 'pool', kind: 'ideal-pool', code: 'IP1', name: 'Ideal pool' },
];

export type LinkId =
  | 'gas'
  | 'flue'
  | 'primaryFlow'
  | 'hxFlow'
  | 'bypass'
  | 'hxReturn'
  | 'primarySuction'
  | 'primaryReturn'
  | 'fill'
  | 'poolOut'
  | 'poolDischarge'
  | 'poolReturn';

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

/** The links, each source to target the way its contents flow. */
export const LINKS: readonly (PlumbEdge & { id: LinkId })[] = [
  link('gas', ['gasMain', 'out-1'], ['boiler', 'gas'], 'gas'),
  link('flue', ['boiler', 'flue'], ['atmosphere', 'in'], 'flue'),
  link('primaryFlow', ['boiler', 'flow'], ['flowTee', 'in']),
  link('hxFlow', ['flowTee', 'run'], ['hx', 'primary-in']),
  link('bypass', ['flowTee', 'branch'], ['returnTee', 'branch']),
  link('hxReturn', ['hx', 'primary-out'], ['returnTee', 'run']),
  link('primarySuction', ['returnTee', 'out'], ['primaryPump', 'suction']),
  link('primaryReturn', ['primaryPump', 'discharge'], ['boiler', 'return']),
  link('fill', ['pressurisation', 'out'], ['boiler', 'fill']),
  link('poolOut', ['pool', 'outlet'], ['poolPump', 'suction']),
  link('poolDischarge', ['poolPump', 'discharge'], ['hx', 'secondary-in']),
  link('poolReturn', ['hx', 'secondary-out'], ['pool', 'inlet']),
];

/** Each link's names, as a pipe marker says them. */
export const LINK_NAMES: Record<LinkId, string> = {
  gas: 'Natural gas',
  flue: 'Flue',
  primaryFlow: 'Heating flow',
  hxFlow: 'Heating flow to exchanger',
  bypass: 'Heating bypass',
  hxReturn: 'Heating return from exchanger',
  primarySuction: 'Heating return',
  primaryReturn: 'Heating return to boiler',
  fill: 'Pressurisation fill',
  poolOut: 'Pool water from pool',
  poolDischarge: 'Pool water to exchanger',
  poolReturn: 'Warmed pool water to pool',
};

/** Each link's bore, DN. */
export const LINK_DN: Record<LinkId, 15 | 40 | 50 | 65 | 150 | 250> = {
  gas: 50,
  flue: 250,
  primaryFlow: 65,
  hxFlow: 65,
  bypass: 40,
  hxReturn: 65,
  primarySuction: 65,
  primaryReturn: 65,
  fill: 15,
  poolOut: 150,
  poolDischarge: 150,
  poolReturn: 150,
};

/** Whether a link carries the boiler's heating water. */
export const isPrimary = (id: LinkId) =>
  id === 'primaryFlow' ||
  id === 'hxFlow' ||
  id === 'bypass' ||
  id === 'hxReturn' ||
  id === 'primarySuction' ||
  id === 'primaryReturn' ||
  id === 'fill';

export type ValveId =
  | 'gas.ecv'
  | 'boiler.gas.iso'
  | 'boiler.flow.iso'
  | 'boiler.return.iso'
  | 'boiler.bypass'
  | 'hx.primary.mv'
  | 'poolPump.suction.iso'
  | 'poolPump.discharge.iso';

export interface HallFitting extends GivenFitting {
  /** The machine whose tag it extends (a valve), or none (a meter, tagged by its loop). */
  of?: MachineId;
  /** A meter's kind, after the product it is modelled on. */
  meter?: 'electromagnetic' | 'heat' | 'gas';
  /** A valve's body: a quarter-turn ball valve, a butterfly on a notch plate, or a spring-loaded bypass. */
  body?: 'ball' | 'butterfly' | 'bypass';
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
 * Every fitting on the lines, in the order each machine's are numbered
 * (so the boiler's gas cock is B1-V1, its flow and return isolators V2 and
 * V3, its bypass V4), and on each line in the plumber's order from its
 * end. The non-return valves on both pumps' discharges, which the
 * plumber's rule asks for, are given too.
 */
export const FITTINGS: readonly HallFitting[] = [
  {
    id: 'gas.meter',
    kind: 'flowmeter',
    edge: 'gas',
    end: 'source',
    normally: 'open',
    role: 'gas',
    meter: 'gas',
  },
  valve('gas.ecv', 'gas', 'source', 'emergency control', 'gasMain'),
  valve('boiler.gas.iso', 'gas', 'target', 'boiler gas isolating', 'boiler'),
  valve('boiler.flow.iso', 'primaryFlow', 'source', 'boiler flow', 'boiler'),
  valve(
    'boiler.return.iso',
    'primaryReturn',
    'target',
    'boiler return',
    'boiler',
  ),
  valve('boiler.bypass', 'bypass', 'source', 'differential bypass', 'boiler', {
    normally: 'closed',
    operator: undefined,
    body: 'bypass',
  }),
  valve('hx.primary.mv', 'hxFlow', 'target', 'exchanger primary', 'hx', {
    normally: 'closed',
    operator: 'motor',
    body: undefined,
  }),
  {
    id: 'hx.primary.heat',
    kind: 'flowmeter',
    edge: 'hxReturn',
    end: 'source',
    normally: 'open',
    role: 'heat to the pool',
    meter: 'heat',
  },
  {
    id: 'primaryPump.nrv',
    kind: 'non-return-valve',
    edge: 'primaryReturn',
    end: 'source',
    normally: 'open',
    role: 'primary pump non-return',
    of: 'primaryPump',
  },
  valve(
    'poolPump.suction.iso',
    'poolOut',
    'target',
    'pump suction',
    'poolPump',
    {
      body: 'butterfly',
    },
  ),
  {
    id: 'poolPump.nrv',
    kind: 'non-return-valve',
    edge: 'poolDischarge',
    end: 'source',
    normally: 'open',
    role: 'pool pump non-return',
    of: 'poolPump',
  },
  valve(
    'poolPump.discharge.iso',
    'poolDischarge',
    'source',
    'pump discharge',
    'poolPump',
    { body: 'butterfly' },
  ),
  {
    id: 'poolDischarge.meter',
    kind: 'flowmeter',
    edge: 'poolDischarge',
    end: 'source',
    normally: 'open',
    role: 'pool water',
    meter: 'electromagnetic',
  },
];

export const fittingById = (id: string) => FITTINGS.find((f) => f.id === id);

/** The valves the visitor works by hand: all but the motorised one and the bypass. */
export const HAND_VALVES = FITTINGS.filter(
  (f) =>
    f.kind === 'isolating-valve' &&
    f.body !== 'bypass' &&
    f.operator === 'lever',
).map((f) => f.id as ValveId);

/** The butterfly valves: on a notch plate, throttling. */
export const THROTTLES = FITTINGS.filter((f) => f.body === 'butterfly').map(
  (f) => f.id as ValveId,
);

export type InstrumentKind =
  | 'pressure'
  | 'temperature'
  | 'flow-switch'
  | 'thermostat';

export interface Instrument {
  id: string;
  kind: InstrumentKind;
  role: string;
  /** The machine it is fitted to, if any (the pool pump's gauges, the pool's display). */
  on?: MachineId;
  /** The link it is set into. */
  edge?: LinkId;
  /** The unit it reads in. */
  unit: string;
}

/** The gauges, thermometers, the flow switch and the thermostat, in tag order. */
export const INSTRUMENTS: readonly Instrument[] = [
  {
    id: 'poolPump.suction.pi',
    kind: 'pressure',
    role: 'pool pump suction',
    on: 'poolPump',
    unit: 'bar',
  },
  {
    id: 'poolPump.discharge.pi',
    kind: 'pressure',
    role: 'pool pump discharge',
    on: 'poolPump',
    unit: 'bar',
  },
  {
    id: 'gas.pi',
    kind: 'pressure',
    role: 'gas supply',
    edge: 'gas',
    unit: 'mbar',
  },
  {
    id: 'hxIn.ti',
    kind: 'temperature',
    role: 'pool water into the exchanger',
    edge: 'poolDischarge',
    unit: '°C',
  },
  {
    id: 'hxOut.ti',
    kind: 'temperature',
    role: 'pool water out of the exchanger',
    edge: 'poolReturn',
    unit: '°C',
  },
  {
    id: 'boilerFlow.ti',
    kind: 'temperature',
    role: 'boiler flow',
    edge: 'primaryFlow',
    unit: '°C',
  },
  {
    id: 'boilerReturn.ti',
    kind: 'temperature',
    role: 'boiler return',
    edge: 'primarySuction',
    unit: '°C',
  },
  {
    id: 'pool.ti',
    kind: 'temperature',
    role: 'the pool',
    on: 'pool',
    unit: '°C',
  },
  {
    id: 'poolDischarge.fs',
    kind: 'flow-switch',
    role: 'pool water flowing',
    edge: 'poolDischarge',
    unit: '',
  },
  {
    id: 'poolOut.tc',
    kind: 'thermostat',
    role: 'pool thermostat',
    edge: 'poolOut',
    unit: '°C',
  },
];

// ---- Tags, derived -------------------------------------------------------------

const nodeById = new Map(NODES.map((n) => [n.id, n]));

export const machineTag = (id: MachineId) =>
  `${ROOM_CODE}-${nodeById.get(id)!.code}`;

const LETTERS: Record<InstrumentKind, string> = {
  pressure: 'PI',
  temperature: 'TI',
  'flow-switch': 'FS',
  thermostat: 'TC',
};

/**
 * Every tag, derived and never written by hand: a valve its machine's tag
 * and its number among that machine's valves (M1-B1-V1; a non-return valve
 * NRV); a meter FT (flow), FQ (gas) or HM (heat) and its number; an
 * instrument its ISA letters and its number among those of its kind.
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
      const letters =
        f.meter === 'heat' ? 'HM' : f.meter === 'gas' ? 'FQ' : 'FT';
      tags[f.id] = `${ROOM_CODE}-${letters}${next(letters)}`;
    } else {
      const letter = f.kind === 'non-return-valve' ? 'NRV' : 'V';
      tags[f.id] = `${machineTag(f.of!)}-${letter}${next(`${f.of}.${letter}`)}`;
    }
  }
  for (const i of INSTRUMENTS) {
    const letters = LETTERS[i.kind];
    tags[i.id] = `${ROOM_CODE}-${letters}${next(letters)}`;
  }
  for (const n of NODES) tags[n.id] = machineTag(n.id);
  // The museum's own instruments, beside the plant: the cost display and the losses board.
  tags['cost'] = `${ROOM_CODE}-EC1`;
  for (const [k, id] of [
    'evaporation',
    'convection',
    'ground',
    'total',
  ].entries())
    tags[`loss.${id}`] = `${ROOM_CODE}-QI${k + 1}`;
  tags['cover'] = `${ROOM_CODE}-CV1`;
  return tags;
})();

/** A tag without its room code, as a placard or the mimic prints it: B1-V1. */
export const shortTag = (id: string) => TAGS[id].slice(ROOM_CODE.length + 1);

/** What a fitting is, in words, from the model. */
export function fittingName(f: HallFitting): string {
  const role = f.role ?? '';
  const words = role.charAt(0).toUpperCase() + role.slice(1);
  if (f.meter === 'gas') return 'Gas meter (rotary)';
  if (f.meter === 'heat') return 'Heat meter (ultrasonic)';
  if (f.kind === 'flowmeter') return `${words} flowmeter (electromagnetic)`;
  if (f.kind === 'non-return-valve') return `${words} valve`;
  if (f.operator === 'motor') return `${words} motorised valve`;
  if (f.body === 'bypass') return 'Differential bypass valve';
  if (f.id === 'gas.ecv') return 'Emergency control valve';
  if (f.id === 'boiler.gas.iso') return 'Boiler gas isolating cock';
  return `${words} valve`;
}

/** The plumber's rules: a non-return valve on each pump's discharge; no other isolators asked for. */
export const RULES = {
  isolate: new Set<string>(),
  pumps: new Set(['end-suction-pump', 'twin-head-pump']),
  discharge: 'discharge',
} as const;

/** The enhanced network: the schematic expanded by the plumber, its fittings given. */
export function hall1Expansion(): Expansion {
  return expandForPlumbing(NODES, LINKS, { ...RULES, given: FITTINGS });
}

// ---- The physics -------------------------------------------------------------

/** The pool, the same in every hall: 25 × 12.5 × 1.5 m (dev51's, the chemistry bench's). */
export const POOL = {
  length: 25,
  width: 12.5,
  depth: 1.5,
  volume: 470,
} as const;
export const POOL_AREA = POOL.length * POOL.width;

/** The hall the pool stands in, ideal and held: its air °C and relative humidity. */
export const HALL_AIR = { celsius: 29, humidity: THERMAL.humidity } as const;

/** The pool's heat capacity, kJ/K (547 kWh/K). */
export const POOL_KJ_PER_K = (POOL.volume * THERMAL.waterPerM3) / 1000;

/**
 * Evaporation's coefficient, kg/s per Pa of vapour-pressure difference,
 * set by `thermalParams` so that a calm pool at 28 °C in this hall loses
 * what `evaporationRate` says (0.1 kg/m²·h).
 */
export const EVAPORATION_COEF = thermalParams({
  area: POOL_AREA,
  volume: POOL.volume,
  evaporation: evaporationRate(POOL_AREA, 28, 'calm') / 1000,
  hall: { w: 40, d: 25, h: 8 },
  water: 28,
  air: HALL_AIR.celsius,
}).evaporation;

/**
 * A closed cover's saving on evaporation: nine-tenths. Sourced: a solid
 * cover cut evaporation by about 95 % in a 2025 study of UAE pools, and
 * Southampton University's Jubilee Sports Centre cover saved 169,000 kWh a
 * year; a little short of the best, for a cover that does not quite seal.
 */
export const COVER_SAVING = 0.9;

/** How long the cover's motor takes to roll it fully out or in, seconds. */
export const COVER_TRAVEL = 120;

export type Swimmers = 'none' | 'few' | 'busy' | 'gala';
export const SWIMMERS: readonly Swimmers[] = ['none', 'few', 'busy', 'gala'];
/** How swimmers stir the surface: none still, a few calm, busy flowing, a gala gushing. */
export const SWIMMER_ACTIVITY: Record<Swimmers, Activity> = {
  none: 'still',
  few: 'calm',
  busy: 'flowing',
  gala: 'gushing',
};

/** The boiler: Hamwarmy HW 160, 160 kW, 95 % (gross to net, simplified). */
export const BOILER_KW = 160;
/** The boiler and primary circuit's own water, kJ/K (about 0.25 m³), and its standing loss, kW/K. */
export const PRIMARY_KJ_PER_K = 0.25 * WATER_HEAT * 3600;
export const PRIMARY_LOSS = 0.05;
/** The plant room's air, °C. */
export const ROOM_C = 20;
/** The primary circuit's flow while its pump runs, m³/h (`HEATING.primaryFlow`). */
export const PRIMARY_FLOW = 7;
/** The pressurisation unit's set pressure, bar. */
export const SYSTEM_BAR = 1.5;
/**
 * The plate exchanger's conductance, kW/K. Dev51's 12 kW/K would pull a
 * 160 kW boiler's flow down to about 52 °C at this pool's temperature; a
 * 160 kW pool exchanger designed for 80/60 °C on its primary has about a
 * third of that, which gives the boiler's 80 °C flow and 20 K drop.
 */
export const HX_UA = 3.8;
/** The motorised valve's stroke, seconds (after the Belimo LR24A). */
export const MV_STROKE = 35;
/** The flow switch makes above this, m³/h (dev51's interlock). */
export const FS_FLOW = 5;
/** The thermostat's own differential in ON-OFF, K (indicative: a capillary thermostat's is 0.5 to 1 K). */
export const TC_DIFFERENTIAL = 1;
/** The thermostat's dial, °C. */
export const TC_RANGE = { min: 20, max: 35 } as const;
/** The gas: its supply pressure, mbar, its drop at full fire, mbar. */
export const GAS_MBAR = 21;
export const GAS_DROP = 2;

/** The pool pump's curve (Grundflow NKC 150-315): H = shutoff − k·Q². */
export const PUMP = { shutoff: 22, k: 4 / 300 ** 2, axis: 0.68 } as const;
/** The pool's water level above the hall's floor, m (the ideal vessel's). */
export const POOL_HEAD = 1.7;
/** Its design flow, fully open, m³/h. */
export const DESIGN_FLOW = 185;
const r = (metres: number) => metres / DESIGN_FLOW ** 2;
/**
 * Resistances at the design flow, m per (m³/h)²: the suction run, each
 * open butterfly, the non-return valve, the exchanger's secondary, and the
 * return main and the pool's inlet nozzles, the rest of the loop's loss.
 */
export const RESISTANCE = {
  suction: r(0.3),
  valveOpen: r(0.15),
  nonReturn: r(0.5),
  hx: r(3),
  returnMain: r(
    PUMP.shutoff - PUMP.k * DESIGN_FLOW ** 2 - 0.3 - 0.15 * 2 - 0.5 - 3,
  ),
} as const;

/** The openings a butterfly's notch plate holds. */
export const NOTCHES: readonly number[] = [0, 0.2, 0.4, 0.6, 0.8, 1];
/**
 * A butterfly's flow coefficient at an opening, as a share of its full:
 * the cube of the opening, so its notches throttle visibly (dev51's square
 * law hardly throttles this loop, whose own losses are large, until the
 * last notch).
 */
export const valveCharacteristic = (opening: number) =>
  Math.max(0, Math.min(1, opening)) ** 3;

/** Metres of water to bar. */
const BAR_PER_M = 0.0981;

export type ControlMode = 'on-off' | 'modulating';

export interface Hall1State {
  /** Each hand valve's opening, 0 shut to 1 open. */
  opening: Record<ValveId, number>;
  /** The motorised valve's position, 0 shut to 1 open. */
  mv: number;
  poolPump: boolean;
  tripped: boolean;
  /** The pool pump's casing, °C (its dead-head thermostat). */
  casingC: number;
  boiler: BoilerState;
  /** The thermostat: its setting, °C, its mode, and whether it is calling. */
  tcSet: number;
  mode: ControlMode;
  calling: boolean;
  /** The cover: 0 rolled up, 1 fully over the pool; its motor's drive. */
  cover: number;
  coverDrive: -1 | 0 | 1;
  /** The cover's key switch, turned on. */
  coverKey: boolean;
  swimmers: Swimmers;
  /** The pool, °C; the boiler's flow and return, °C. */
  poolC: number;
  flowC: number;
  returnC: number;
  /** Counters since the visitor came in: gas, m³; heat delivered, kWh; heat lost, kWh. */
  gasM3: number;
  heatKWh: number;
  lostKWh: number;
  /** Real seconds since the last reset, for the RESET lamp. */
  sinceReset: number;
}

/** The pool at the start, °C, and the thermostat's setting. */
export const START_C = 27;
export const START_SET = 28;

/** The hall's reset state (RESET, and every entry). `now` is kept by the hall's clock. */
export function newHall1(): Hall1State {
  const opening = Object.fromEntries(
    FITTINGS.filter((f) => f.kind === 'isolating-valve').map((f) => [
      f.id,
      f.normally === 'open' ? 1 : 0,
    ]),
  ) as Record<ValveId, number>;
  return {
    opening,
    mv: 0,
    poolPump: true,
    tripped: false,
    casingC: START_C,
    boiler: { ...newBoiler(), pressure: SYSTEM_BAR, flow: 60, return: 58 },
    tcSet: START_SET,
    mode: 'modulating',
    calling: true,
    cover: 0,
    coverDrive: 0,
    coverKey: true,
    swimmers: 'few',
    poolC: START_C,
    flowC: 60,
    returnC: 58,
    gasM3: 0,
    heatKWh: 0,
    lostKWh: 0,
    sinceReset: 0,
  };
}

export type Hall1Action =
  | { type: 'notch'; id: ValveId; by: number }
  | { type: 'valve'; id: ValveId; open: boolean }
  | { type: 'pump'; run: boolean }
  | { type: 'trip-reset' }
  | { type: 'boiler'; key: BoilerKey }
  | { type: 'boiler-setpoint'; celsius: number }
  | { type: 'tc-set'; celsius: number }
  | { type: 'mode'; mode: ControlMode }
  | { type: 'cover'; drive: -1 | 0 | 1 }
  | { type: 'cover-key'; on: boolean }
  | { type: 'swimmers'; swimmers: Swimmers }
  | { type: 'reset' };

/** What an action does to the hall. */
export function actOnHall1(s: Hall1State, a: Hall1Action): Hall1State {
  switch (a.type) {
    case 'notch': {
      const k = NOTCHES.findIndex((n) => Math.abs(n - s.opening[a.id]) < 1e-6);
      const at = Math.max(
        0,
        Math.min(NOTCHES.length - 1, (k < 0 ? 5 : k) + a.by),
      );
      return { ...s, opening: { ...s.opening, [a.id]: NOTCHES[at] } };
    }
    case 'valve':
      return { ...s, opening: { ...s.opening, [a.id]: a.open ? 1 : 0 } };
    case 'pump':
      return a.run && s.tripped ? s : { ...s, poolPump: a.run };
    case 'trip-reset':
      return s.tripped && resetAllowed(s.casingC)
        ? { ...s, tripped: false }
        : s;
    case 'boiler':
      return { ...s, boiler: pressBoiler(s.boiler, a.key) };
    case 'boiler-setpoint':
      return { ...s, boiler: setBoilerSetpoint(s.boiler, a.celsius) };
    case 'tc-set':
      return {
        ...s,
        tcSet: Math.max(
          TC_RANGE.min,
          Math.min(TC_RANGE.max, Math.round(a.celsius)),
        ),
      };
    case 'mode':
      return { ...s, mode: a.mode };
    case 'cover':
      return s.coverKey ? { ...s, coverDrive: a.drive } : s;
    case 'cover-key':
      return { ...s, coverKey: a.on, coverDrive: a.on ? s.coverDrive : 0 };
    case 'swimmers':
      return { ...s, swimmers: a.swimmers };
    case 'reset':
      return newHall1();
  }
}

/** The pool's water loop: its flow, m³/h, and the pump's gauges, metres of head above the floor's datum. */
export function poolHydraulics(s: Hall1State) {
  const running = s.poolPump && !s.tripped;
  const valveR = (id: ValveId) => {
    const c = valveCharacteristic(s.opening[id]);
    return c > 0 ? RESISTANCE.valveOpen / c : Infinity;
  };
  const suctionR = RESISTANCE.suction + valveR('poolPump.suction.iso');
  const total =
    suctionR +
    valveR('poolPump.discharge.iso') +
    RESISTANCE.nonReturn +
    RESISTANCE.hx +
    RESISTANCE.returnMain;
  const flow =
    running && Number.isFinite(total)
      ? Math.sqrt(PUMP.shutoff / (PUMP.k + total))
      : 0;
  const head = running ? PUMP.shutoff - PUMP.k * flow * flow : 0;
  // The suction gauge: the pool's level over the pump, less the suction's
  // loss; shut off from the pool, it reads what the pump leaves.
  const staticHead = POOL_HEAD - PUMP.axis;
  const suctionOpen = s.opening['poolPump.suction.iso'] > 0;
  const suction = suctionOpen
    ? staticHead - (Number.isFinite(suctionR) ? suctionR * flow * flow : 0)
    : running
      ? -staticHead
      : staticHead;
  const discharge = suction + head;
  return {
    flow,
    head,
    suctionBar: suction * BAR_PER_M,
    dischargeBar: discharge * BAR_PER_M,
  };
}

/** Whether gas reaches the burner, and the supply's pressure at PI3, mbar. */
export function gasSupply(s: Hall1State, m3h: number) {
  const ecv = s.opening['gas.ecv'] > 0.5;
  const cock = s.opening['boiler.gas.iso'] > 0.5;
  const full = BOILER_KW / BOILER_EFFICIENCY / GAS_ENERGY || 1;
  const mbar = ecv ? GAS_MBAR - GAS_DROP * (m3h / full) ** 2 : 0;
  return { gas: ecv && cock, mbar };
}

/** What the boiler's burner gives now, kW. */
export const boilerOutput = (s: Hall1State) =>
  s.boiler.code === 3 ? s.boiler.rate * BOILER_KW : 0;

/** The pool's losses now, kW: evaporation, convection to the hall air, conduction to the ground. */
export function poolLosses(s: Hall1State) {
  const drive = Math.max(
    0,
    saturation(s.poolC) - HALL_AIR.humidity * saturation(HALL_AIR.celsius),
  );
  const activity = ACTIVITY_FACTOR[SWIMMER_ACTIVITY[s.swimmers]];
  const kgPerS =
    EVAPORATION_COEF * drive * activity * (1 - COVER_SAVING * s.cover);
  const evaporation = (kgPerS * THERMAL.latent) / 1000;
  const convection =
    (THERMAL.surfaceH * POOL_AREA * (s.poolC - HALL_AIR.celsius)) / 1000;
  const ground = (THERMAL.groundU * POOL_AREA * (s.poolC - GROUND)) / 1000;
  return {
    evaporation,
    convection,
    ground,
    total: evaporation + convection + ground,
    /** Water evaporated, kg/h. */
    kgPerHour: kgPerS * 3600,
  };
}

/** The heating circuit now: the primary's flow and how it divides, and the exchanger's duty, kW. */
export function primaryCircuit(s: Hall1State) {
  const pumping = boilerLamps(s.boiler).pump;
  const open =
    s.opening['boiler.flow.iso'] > 0.5 && s.opening['boiler.return.iso'] > 0.5;
  const flow = pumping && open ? PRIMARY_FLOW : 0;
  const hxFlow = flow * s.mv;
  const bypass = flow - hxFlow;
  const pool = poolHydraulics(s).flow;
  const ch = hxFlow * WATER_HEAT;
  const cc = pool * WATER_HEAT;
  const eps = effectiveness(ch, cc, HX_UA);
  const duty = eps * Math.min(ch, cc) * (s.flowC - s.poolC);
  return { pumping, flow, hxFlow, bypass, duty, pool };
}

/** Everything the hall's instruments read, from its state. */
export function hall1Readings(s: Hall1State) {
  const water = poolHydraulics(s);
  const primary = primaryCircuit(s);
  const output = boilerOutput(s);
  const gasFlow = output / BOILER_EFFICIENCY / GAS_ENERGY;
  const gas = gasSupply(s, gasFlow);
  const losses = poolLosses(s);
  const rise = water.flow > 0 ? primary.duty / (water.flow * WATER_HEAT) : 0;
  const gasKW = gasFlow * GAS_ENERGY;
  return {
    flow: water.flow,
    head: water.head,
    suctionBar: water.suctionBar,
    dischargeBar: water.dischargeBar,
    flowSwitch: water.flow > FS_FLOW,
    primaryFlow: primary.flow,
    hxFlow: primary.hxFlow,
    bypassFlow: primary.bypass,
    duty: primary.duty,
    output,
    gasFlow,
    gasKW,
    gasMbar: gas.mbar,
    gasAvailable: gas.gas,
    losses,
    temps: {
      'hxIn.ti': s.poolC,
      'hxOut.ti': s.poolC + rise,
      'boilerFlow.ti': s.flowC,
      'boilerReturn.ti': s.returnC,
      'pool.ti': s.poolC,
    } as Record<string, number>,
  };
}

/** Whether the thermostat calls, by its mode, and the share of fire it asks for. */
export function thermostat(s: Hall1State) {
  if (s.mode === 'on-off') {
    const calling = s.calling
      ? s.poolC < s.tcSet
      : s.poolC <= s.tcSet - TC_DIFFERENTIAL + 1e-9;
    return { calling, share: calling ? 1 : 0 };
  }
  const share = Math.max(0, Math.min(1, (s.tcSet - s.poolC) / THERMAL.band));
  return { calling: share > 0, share };
}

/** One slice of plant time, `h` seconds (no more than half a second). */
export function stepHall1(state: Hall1State, h: number): Hall1State {
  if (!(h > 0)) return state;
  const s: Hall1State = { ...state };
  const water = poolHydraulics(s);
  // The pool pump's own protection: dead-headed, its casing heats and trips it.
  s.casingC = stepCasing(
    s.casingC,
    {
      running: s.poolPump && !s.tripped,
      flow: water.flow,
      head: water.head,
      inletC: s.poolC,
      roomC: ROOM_C,
    },
    h,
  );
  if (s.poolPump && !s.tripped && deadheadTrips(s.casingC)) {
    s.tripped = true;
    s.poolPump = false;
  }
  const made = water.flow > FS_FLOW;
  // The thermostat, and the interlock: it calls, and the pool's water flows.
  const tc = thermostat(s);
  s.calling = tc.calling;
  const enable = tc.calling && made;
  const toward = enable ? 1 : 0;
  s.mv += Math.max(-h / MV_STROKE, Math.min(h / MV_STROKE, toward - s.mv));
  // The heat: the boiler's burner into its water, the exchanger out of it.
  const primary = primaryCircuit(s);
  const output = boilerOutput(s);
  const standing = PRIMARY_LOSS * (s.flowC - ROOM_C);
  s.flowC += ((output - primary.duty - standing) * h) / PRIMARY_KJ_PER_K;
  s.returnC =
    primary.flow > 0
      ? s.flowC - (primary.duty + standing) / (primary.flow * WATER_HEAT)
      : s.returnC + (s.flowC - s.returnC) * Math.min(1, h / 60);
  const losses = poolLosses(s);
  s.poolC += ((primary.duty - losses.total) * h) / POOL_KJ_PER_K;
  s.heatKWh += (primary.duty * h) / 3600;
  s.lostKWh += (losses.total * h) / 3600;
  // The boiler's controller: its demand, its gas, its own sequence.
  const gasFlow = output / BOILER_EFFICIENCY / GAS_ENERGY;
  s.gasM3 += (gasFlow * h) / 3600;
  const { gas } = gasSupply(s, gasFlow);
  let b: BoilerState = { ...s.boiler, flow: s.flowC, return: s.returnC };
  b = stepBoiler(
    b,
    { demand: enable, gas, systemReturn: s.returnC, pressure: SYSTEM_BAR },
    h,
  );
  // Modulating, the thermostat holds the burner back to what it asks.
  if (s.mode === 'modulating' && b.code === 3)
    b.rate = Math.min(b.rate, Math.max(0.2, tc.share));
  b.flow = s.flowC;
  b.return = s.returnC;
  if (s.flowC > 95 && !b.lockout)
    b = { ...b, lockout: 'overheat', rate: 0, code: 0, timer: 0 };
  s.boiler = b;
  // The cover's motor, to its limit switches.
  if (s.coverDrive !== 0) {
    s.cover = Math.max(
      0,
      Math.min(1, s.cover + (s.coverDrive * h) / COVER_TRAVEL),
    );
    if (s.cover <= 0 || s.cover >= 1) s.coverDrive = 0;
  }
  return s;
}

/** Step `plantSeconds` of plant time, in half-second slices. */
export function runHall1(state: Hall1State, plantSeconds: number): Hall1State {
  let s = state;
  let left = plantSeconds;
  while (left > 1e-9) {
    const h = Math.min(0.5, left);
    s = stepHall1(s, h);
    left -= h;
  }
  return s;
}

/** The hall's model, as the museum's clock drives it (`museum-time.ts`). */
export const HALL1_MODEL = {
  reset: (_now: number) => newHall1(),
  step: stepHall1,
};
