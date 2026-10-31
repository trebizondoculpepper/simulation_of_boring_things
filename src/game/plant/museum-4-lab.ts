import { expandForPlumbing } from './plumbing-expansion';
import type { Expansion, GivenFitting, PlumbEdge } from './plumbing-expansion';
import type { SchematicNode } from './schematics';
import { MAINS, STRENGTH } from './water-treatment';
import {
  MOLAR,
  dose,
  mixWaters,
  readings,
  stepChemistry,
  waterFrom,
} from '../water/pool-chemistry';
import type { Additions, PoolChemistry } from '../water/pool-chemistry';
import {
  PLANT,
  POOL_25M,
  handDose,
  newBench,
  stepBench,
} from '../water/chemistry-bench';
import type { BenchPool, BenchState, Plant } from '../water/chemistry-bench';

/**
 * Hall 4 of the museum, "The chemistry of pools" (107d; the owner,
 * 2026-10-28: "a set of ideal tanks, a dosing station with buttons ... and
 * then a readout in the simulated swimming pool"). The visitor is the
 * controller: ten ideal tanks, each through its metering valve into a
 * common header and a dosing pot, injected into the ideal pool's return;
 * swimmers from an ideal source; an ideal analyser reading the water. The
 * chemistry is the bench's (`chemistry-bench.ts`, one well-mixed volume)
 * and the model's (`pool-chemistry.ts`): nothing here reacts or mixes on
 * its own. Pure; grams, mg/l, seconds.
 */

export const ROOM_CODE = 'M4';

// ---- The tanks -------------------------------------------------------------------

export type TankId =
  | 'hypo'
  | 'calHypo'
  | 'hcl'
  | 'bisulphate'
  | 'co2'
  | 'bicarbonate'
  | 'sodaAsh'
  | 'calciumChloride'
  | 'thiosulphate'
  | 'fresh';

export interface Tank {
  id: TankId;
  code: string;
  product: string;
  /** As the VFD shows it, at most 10 characters. */
  short: string;
  unit: 'l' | 'kg' | 'm3';
  /** The model's addition, grams a unit; none for fresh water. */
  addition?: keyof Additions;
  perUnit: number;
  colour: string;
  hazards: readonly (
    | 'corrosive'
    | 'oxidiser'
    | 'irritant'
    | 'environment'
    | 'gas'
  )[];
  purpose: string;
  sideEffects: string;
}

export const TANKS: readonly Tank[] = [
  {
    id: 'hypo',
    code: 'CT1',
    product: 'Sodium hypochlorite 14 %',
    short: 'NaOCl 14%',
    unit: 'l',
    addition: 'hypochlorite',
    perUnit: STRENGTH.hypochlorite,
    colour: '#d9e27a',
    hazards: ['corrosive', 'environment'],
    purpose: 'chlorine: kills germs',
    sideEffects: 'adds salt (TDS), a little alkalinity, and raises the pH',
  },
  {
    id: 'calHypo',
    code: 'CT2',
    product: 'Calcium hypochlorite 65 %',
    short: 'Ca(OCl)2',
    unit: 'kg',
    addition: 'calciumHypochlorite',
    perUnit: 650,
    colour: '#f2f2ee',
    hazards: ['oxidiser', 'corrosive'],
    purpose: 'chlorine, as granules',
    sideEffects: 'brings calcium (hardness) with it',
  },
  {
    id: 'hcl',
    code: 'CT3',
    product: 'Hydrochloric acid 10 %',
    short: 'HCl 10%',
    unit: 'l',
    addition: 'hcl',
    perUnit: STRENGTH.acid,
    colour: '#e8ecd8',
    hazards: ['corrosive'],
    purpose: 'acid: brings the pH down',
    sideEffects: 'takes alkalinity away, adds chloride (TDS)',
  },
  {
    id: 'bisulphate',
    code: 'CT4',
    product: 'Sodium bisulphate (dry acid)',
    short: 'NaHSO4',
    unit: 'kg',
    addition: 'bisulphate',
    perUnit: 1000,
    colour: '#ffffff',
    hazards: ['irritant'],
    purpose: 'dry acid: brings the pH down',
    sideEffects:
      'takes alkalinity away, adds sulphate, which eats grout above 360 mg/l',
  },
  {
    id: 'co2',
    code: 'CT5',
    product: 'Carbon dioxide',
    short: 'CO2',
    unit: 'kg',
    addition: 'co2',
    perUnit: 1000,
    colour: '#8d9599',
    hazards: ['gas'],
    purpose: 'brings the pH down, leaving the alkalinity alone',
    sideEffects: 'leaves to the air over hours, so the pH creeps back up',
  },
  {
    id: 'bicarbonate',
    code: 'CT6',
    product: 'Sodium bicarbonate',
    short: 'NaHCO3',
    unit: 'kg',
    addition: 'bicarbonate',
    perUnit: 1000,
    colour: '#fbfbf6',
    hazards: [],
    purpose: 'raises alkalinity, the buffer',
    sideEffects: 'hardly moves the pH; adds TDS',
  },
  {
    id: 'sodaAsh',
    code: 'CT7',
    product: 'Soda ash (sodium carbonate)',
    short: 'Na2CO3',
    unit: 'kg',
    addition: 'sodaAsh',
    perUnit: 1000,
    colour: '#f4f4ef',
    hazards: ['irritant'],
    purpose: 'raises the pH',
    sideEffects: 'raises alkalinity too, and the pH sharply',
  },
  {
    id: 'calciumChloride',
    code: 'CT8',
    product: 'Calcium chloride',
    short: 'CaCl2',
    unit: 'kg',
    addition: 'calciumChloride',
    perUnit: 1000,
    colour: '#f0efe8',
    hazards: ['irritant'],
    purpose: 'raises calcium hardness',
    sideEffects: 'hardly moves the pH; adds TDS',
  },
  {
    id: 'thiosulphate',
    code: 'CT9',
    product: 'Sodium thiosulphate',
    short: 'Na2S2O3',
    unit: 'kg',
    addition: 'thiosulphate',
    perUnit: 1000,
    colour: '#e3eef2',
    hazards: [],
    purpose: 'takes chlorine away',
    sideEffects: 'the pH rises afterwards: check it and add acid',
  },
  {
    id: 'fresh',
    code: 'FW1',
    product: 'Fresh water from the mains',
    short: 'MAINS',
    unit: 'm3',
    perUnit: 1,
    colour: '#9cc7e6',
    hazards: [],
    purpose: 'dilutes everything towards the mains water',
    sideEffects:
      'the only cure for TDS, sulphate and stabiliser; costs water and heat',
  },
];

export const tankById = (id: TankId) => TANKS.find((t) => t.id === id)!;

// ---- The schematic -----------------------------------------------------------------

export type MachineId =
  | `tank.${TankId}`
  | 'swimmers'
  | 'header'
  | 'pot'
  | 'pump'
  | 'injection'
  | 'pool'
  | 'analyser';

export const NODES: readonly (SchematicNode & { id: MachineId })[] = [
  ...TANKS.map((t) => ({
    id: `tank.${t.id}` as MachineId,
    kind: t.id === 'fresh' ? 'ideal-mains' : 'ideal-chemical-tank',
    code: t.code,
    name: t.id === 'fresh' ? 'Ideal mains water' : `Ideal tank: ${t.product}`,
  })),
  {
    id: 'swimmers',
    kind: 'ideal-bather-source',
    code: 'BA1',
    name: 'Ideal swimmers',
  },
  { id: 'header', kind: 'manifold', code: 'DH1', name: 'Dosing header' },
  { id: 'pot', kind: 'dosing-pot', code: 'DP1', name: 'Dosing pot' },
  {
    id: 'pump',
    kind: 'end-suction-pump',
    code: 'P1',
    name: 'Circulation pump',
  },
  { id: 'injection', kind: 'tee', code: 'TE1', name: 'Injection point' },
  { id: 'pool', kind: 'ideal-pool', code: 'IP1', name: 'Ideal pool' },
  {
    id: 'analyser',
    kind: 'ideal-analyser',
    code: 'AN1',
    name: 'Ideal water analyser',
  },
];

export type LinkId =
  | `dose.${TankId}`
  | 'header'
  | 'injection'
  | 'poolOut'
  | 'poolDischarge'
  | 'poolReturn'
  | 'sample';

const link = (
  id: LinkId,
  from: [MachineId, string],
  to: [MachineId, string],
  medium: PlumbEdge['medium'] = 'water',
): PlumbEdge & { id: LinkId } => ({
  id,
  sourceId: from[0],
  sourcePort: from[1],
  targetId: to[0],
  targetPort: to[1],
  medium,
});

export const LINKS: readonly (PlumbEdge & { id: LinkId })[] = [
  ...TANKS.filter((t) => t.id !== 'fresh').map((t, k) =>
    link(
      `dose.${t.id}`,
      [`tank.${t.id}`, 'out-1'],
      ['header', `in-${k + 1}`],
      'chemical',
    ),
  ),
  link('dose.fresh', ['tank.fresh', 'out-1'], ['pool', 'make-up']),
  link('header', ['header', 'out'], ['pot', 'in'], 'chemical'),
  link('injection', ['pot', 'out'], ['injection', 'branch'], 'chemical'),
  link('poolOut', ['pool', 'outlet'], ['pump', 'suction']),
  link('poolDischarge', ['pump', 'discharge'], ['injection', 'in']),
  link('poolReturn', ['injection', 'run'], ['pool', 'inlet']),
  link('sample', ['pool', 'sample'], ['analyser', 'in']),
];

export const LINK_NAMES: Record<LinkId, string> = {
  ...(Object.fromEntries(
    TANKS.map((t) => [
      `dose.${t.id}`,
      t.id === 'fresh' ? 'Mains make-up' : `${t.short} to header`,
    ]),
  ) as Record<`dose.${TankId}`, string>),
  header: 'Dosing header',
  injection: 'Dose to injection point',
  poolOut: 'Pool water from pool',
  poolDischarge: 'Pool water to injection',
  poolReturn: 'Dosed pool water to pool',
  sample: 'Analyser sample',
};

export interface HallFitting extends GivenFitting {
  of?: MachineId;
}

export const FITTINGS: readonly HallFitting[] = [
  ...TANKS.map((t): HallFitting => ({
    id: `${t.id}.v`,
    kind: 'isolating-valve',
    edge: `dose.${t.id}`,
    end: 'source',
    normally: 'closed',
    role: `${t.short} metering`,
    operator: 'solenoid',
    of: `tank.${t.id}`,
  })),
  {
    id: 'pump.suction',
    kind: 'isolating-valve',
    edge: 'poolOut',
    end: 'target',
    normally: 'open',
    role: 'pump suction',
    operator: 'lever',
    of: 'pump',
  },
  {
    id: 'pump.nrv',
    kind: 'non-return-valve',
    edge: 'poolDischarge',
    end: 'source',
    normally: 'open',
    role: 'pump non-return',
    of: 'pump',
  },
  {
    id: 'pump.discharge',
    kind: 'isolating-valve',
    edge: 'poolDischarge',
    end: 'source',
    normally: 'open',
    role: 'pump discharge',
    operator: 'lever',
    of: 'pump',
  },
  {
    id: 'flow',
    kind: 'flowmeter',
    edge: 'poolDischarge',
    end: 'source',
    normally: 'open',
    role: 'circulation',
  },
];

export const RULES = {
  isolate: new Set<string>(),
  pumps: new Set(['end-suction-pump']),
  discharge: 'discharge',
} as const;

export function hall4Expansion(): Expansion {
  return expandForPlumbing(NODES, LINKS, { ...RULES, given: FITTINGS });
}

/** The readout's meters, in the board's order. */
export const METERS = [
  'fc',
  'cc',
  'tc',
  'ph',
  'hocl',
  'ta',
  'ch',
  'tds',
  'so4',
  'lsi',
] as const;
export type MeterId = (typeof METERS)[number];

const machineTag = (id: MachineId) =>
  `${ROOM_CODE}-${NODES.find((n) => n.id === id)!.code}`;

/** Every tag, derived: valves by their machine (M4-CT3-V1), the meter FT1, the readout's AI1 to AI10, the museum's own. */
export const TAGS: Readonly<Record<string, string>> = (() => {
  const tags: Record<string, string> = {};
  const count = new Map<string, number>();
  const next = (k: string) => {
    const n = (count.get(k) ?? 0) + 1;
    count.set(k, n);
    return n;
  };
  for (const f of FITTINGS) {
    if (f.kind === 'flowmeter') tags[f.id] = `${ROOM_CODE}-FT${next('FT')}`;
    else {
      const l = f.kind === 'non-return-valve' ? 'NRV' : 'V';
      tags[f.id] = `${machineTag(f.of!)}-${l}${next(`${f.of}.${l}`)}`;
    }
  }
  for (const n of NODES) tags[n.id] = machineTag(n.id);
  METERS.forEach((m, k) => (tags[`meter.${m}`] = `${ROOM_CODE}-AI${k + 1}`));
  tags['desk'] = `${ROOM_CODE}-DS1`;
  tags['beam'] = `${ROOM_CODE}-BB1`;
  tags['mimic'] = `${ROOM_CODE}-MP1`;
  return tags;
})();

/**
 * The hall's instruments, not set into a line: the dosing console that
 * works the tanks' valves (mission 113: three touch screens and DOSE), the
 * mimic panel that repeats them, and the Balance Beam that weighs the
 * water's balance. Each binds its drawing by its id; its tag is above
 * (DS1, MP1, BB1). The teleprinter (TP1) and LAB TIME (KI1) are gone with
 * the old desk (the owner, 2026-10-31).
 */
export const INSTRUMENTS: readonly {
  id: 'desk' | 'mimic' | 'beam';
  role: string;
}[] = [
  { id: 'desk', role: 'dosing console' },
  { id: 'mimic', role: 'mimic panel' },
  { id: 'beam', role: 'balance indicator' },
];

export const shortTag = (id: string) => TAGS[id].slice(ROOM_CODE.length + 1);

// ---- The pool and its reset water ------------------------------------------------

/** The bench's 25 m pool, its start the reset water (the PHREEQC check's base water, with chlorine). */
export const RESET_WATER = {
  ph: 7.4,
  alkalinity: 120,
  hardness: 200,
  tds: 930,
  temperature: 28,
  freeChlorine: 1.3,
  sulphate: POOL_25M.start.sulphate ?? 60,
} as const;

export const LAB_POOL: BenchPool = {
  ...POOL_25M,
  mains: { ...MAINS },
  start: { ...RESET_WATER },
};
/** No automatic dosing (the visitor is the controller), no UV. */
export const LAB_PLANT: Plant = { ...PLANT, isolated: true, uv: false };
export const VOLUME = LAB_POOL.volume + LAB_POOL.balanceTank;
export const TEMPERATURE = LAB_POOL.temperature;

export const SWIMMERS = ['none', 'normal', 'busy'] as const;
export type Swimmers = (typeof SWIMMERS)[number];
/** The bench's bather factor for each dial position: none, its 600 a day, the combined-chlorine scenario's ×2.5. */
export const BATHER_FACTOR: Record<Swimmers, number> = {
  none: 0,
  normal: 1,
  busy: 2.5,
};
export const GROUP = 20;
/** Plant seconds a metering valve takes to deliver its dose. */
export const DOSE_SECONDS = 4;
/** Plant seconds between chemistry steps. */
export const CHEMISTRY_STEP = 10;
/** The thumbwheel: four digits, tenths, 000.0 to 999.9. */
export const DIAL_MAX = 9999;

// ---- The challenge cards -----------------------------------------------------------

export type CardId =
  | 'combined-chlorine'
  | 'low-alkalinity'
  | 'high-ph'
  | 'acid-overdose'
  | 'low-hardness'
  | 'high-tds'
  | 'dechlorination'
  | 'faecal-incident'
  | 'stabiliser'
  | 'hard-water'
  | 'sulphate';

/**
 * Each bench scenario's water at the end of its problem phase (the faecal
 * incident's at its start), the circuit mixed (`circuitWater`): pinned
 * from `runBench` by `museum-4-lab.slow.test.ts`, which recomputes them.
 */
export const SCENARIO_WATERS: Record<string, PoolChemistry> = {
  'combined-chlorine': {
    freeChlorine: 2.57043,
    chloramine: 0,
    organicChloramine: 0.495904,
    trichloramine: 0.793211,
    ammonia: 0,
    urea: 0,
    demand: 0.00189802,
    demandSlow: 0.484309,
    alkalinity: 79.6474,
    carbonate: 1.6993,
    hardness: 213.492,
    tds: 757.61,
    sulphate: 42.8754,
    chlorate: 3.30361,
    cyanuric: 0,
    thiosulphate: 0,
    ph: 7.37796,
  },
  'low-alkalinity': {
    freeChlorine: 1.77439,
    chloramine: 0,
    organicChloramine: 0.0987961,
    trichloramine: 0.0618542,
    ammonia: 0,
    urea: 0,
    demand: 0.00169465,
    demandSlow: 0.211766,
    alkalinity: 48.1969,
    carbonate: 1.03817,
    hardness: 216.438,
    tds: 801.241,
    sulphate: 43.5227,
    chlorate: 3.48556,
    cyanuric: 0,
    thiosulphate: 0,
    ph: 7.32141,
  },
  'high-ph': {
    freeChlorine: 1.795,
    chloramine: 0,
    organicChloramine: 0.116049,
    trichloramine: 0.0621788,
    ammonia: 0,
    urea: 0,
    demand: 0.00784759,
    demandSlow: 0.339352,
    alkalinity: 73.3585,
    carbonate: 1.51013,
    hardness: 216.438,
    tds: 783.171,
    sulphate: 43.5227,
    chlorate: 3.48267,
    cyanuric: 0,
    thiosulphate: 0,
    ph: 7.63521,
  },
  'acid-overdose': {
    freeChlorine: 1.73758,
    chloramine: 0.000106661,
    organicChloramine: 0.0683206,
    trichloramine: 0.0543758,
    ammonia: 0,
    urea: 6.67874e-5,
    demand: 0.06436,
    demandSlow: 0.19884,
    alkalinity: 53.685,
    carbonate: 1.30894,
    hardness: 216.547,
    tds: 797.934,
    sulphate: 43.5593,
    chlorate: 3.48655,
    cyanuric: 0,
    thiosulphate: 0,
    ph: 6.92765,
  },
  'low-hardness': {
    freeChlorine: 1.62988,
    chloramine: 0,
    organicChloramine: 0.100133,
    trichloramine: 0.0618406,
    ammonia: 0,
    urea: 0,
    demand: 0.00176019,
    demandSlow: 0.218206,
    alkalinity: 33.7725,
    carbonate: 0.729099,
    hardness: 49.7651,
    tds: 608.471,
    sulphate: 42.3889,
    chlorate: 2.36862,
    cyanuric: 0,
    thiosulphate: 0,
    ph: 7.30225,
  },
  'high-tds': {
    freeChlorine: 1.80799,
    chloramine: 0,
    organicChloramine: 0.101216,
    trichloramine: 0.0618927,
    ammonia: 0,
    urea: 0,
    demand: 0.00201802,
    demandSlow: 0.223329,
    alkalinity: 66.9249,
    carbonate: 1.43464,
    hardness: 216.431,
    tds: 1908.68,
    sulphate: 43.5299,
    chlorate: 3.48405,
    cyanuric: 0,
    thiosulphate: 0,
    ph: 7.3352,
  },
  dechlorination: {
    freeChlorine: 18.522,
    chloramine: 0,
    organicChloramine: 0.0165441,
    trichloramine: 0.0563572,
    ammonia: 0,
    urea: 0,
    demand: 0,
    demandSlow: 0.000268391,
    alkalinity: 72.1226,
    carbonate: 1.40595,
    hardness: 216.748,
    tds: 824.913,
    sulphate: 43.6023,
    chlorate: 3.48206,
    cyanuric: 0,
    thiosulphate: 0,
    ph: 7.43346,
  },
  'faecal-incident': {
    freeChlorine: 1.78602,
    chloramine: 0,
    organicChloramine: 0.100122,
    trichloramine: 0.0618741,
    ammonia: 0,
    urea: 0,
    demand: 0.00182974,
    demandSlow: 0.216352,
    alkalinity: 66.2812,
    carbonate: 1.42745,
    hardness: 216.423,
    tds: 788.439,
    sulphate: 43.5373,
    chlorate: 3.48206,
    cyanuric: 0,
    thiosulphate: 0,
    ph: 7.3373,
  },
};

export interface Bands {
  fc: number;
  cc: number;
  ph: number;
  hoclShare: number;
  ta: number;
  ch: number;
  tdsAbove: number;
  so4: number;
  lsi: number;
}

export interface Card {
  id: CardId;
  title: string;
  /** Printed on the log when it starts. */
  symptom: string;
  goal: string;
  /** Whether the pool is closed (no swimmers) while it runs. */
  closed: boolean;
  water(): PoolChemistry;
  met(r: Hall4Readings, s: Hall4State): boolean;
}

const inPh = (r: Hall4Readings) => r.ph >= 7.0 && r.ph <= 7.405;
const inFc = (r: Hall4Readings) => r.fc >= 1.0 && r.fc <= 3.0;
const resetWater = () => waterFrom(RESET_WATER);
/** The faecal incident's contact: mg·min/l of free chlorine at pH 7.5 or below (CDC via TN23). */
export const FAECAL_CT = 15300;

export const CARDS: readonly Card[] = [
  {
    id: 'combined-chlorine',
    title: 'COMBINED CL',
    closed: true,
    symptom: 'UV FAILED, BUSY WEEK: CHLORINE SMELL, RED EYES',
    goal: 'COMBINED < 0.5 AND < HALF FREE, FREE 1-3',
    water: () => SCENARIO_WATERS['combined-chlorine'],
    met: (r) => r.cc < 0.5 && r.cc <= r.fc / 2 && inFc(r),
  },
  {
    id: 'low-alkalinity',
    title: 'LOW ALK',
    closed: false,
    symptom: 'PH SWINGING WITH EVERY DOSE',
    goal: 'ALKALINITY 80-200, PH 7.0-7.4',
    water: () => SCENARIO_WATERS['low-alkalinity'],
    met: (r) => r.ta >= 80 && r.ta <= 200 && inPh(r),
  },
  {
    id: 'high-ph',
    title: 'HIGH PH',
    closed: false,
    symptom: 'ACID PUMP FAILED 2 DAYS: CHLORINE WORKING POORLY',
    goal: 'PH 7.0-7.4',
    water: () => SCENARIO_WATERS['high-ph'],
    met: (r) => inPh(r),
  },
  {
    id: 'acid-overdose',
    title: 'ACID OVERDOSE',
    closed: true,
    symptom: 'ACID PUMP STUCK ON OVERNIGHT: STINGING EYES',
    goal: 'PH 7.0-7.4, ALKALINITY 80 OR MORE',
    water: () => SCENARIO_WATERS['acid-overdose'],
    met: (r) => inPh(r) && r.ta >= 80,
  },
  {
    id: 'low-hardness',
    title: 'LOW HARDNESS',
    closed: false,
    symptom: 'REFILLED FROM SOFT MAINS: WATER EATING THE GROUT',
    goal: 'HARDNESS 80+, BALANCE -0.5 TO +0.5',
    water: () => SCENARIO_WATERS['low-hardness'],
    met: (r) => r.ch >= 80 && Math.abs(r.lsi) <= 0.5,
  },
  {
    id: 'high-tds',
    title: 'HIGH TDS',
    closed: false,
    symptom: 'TDS 1600 ABOVE THE MAINS: DULL WATER',
    goal: 'TDS AT MOST MAINS + 1000',
    water: () => SCENARIO_WATERS['high-tds'],
    met: (r) => r.tdsAbove <= 1000,
  },
  {
    id: 'dechlorination',
    title: 'DECHLORINATE',
    closed: true,
    symptom: 'SHOCKED TO 20 MG/L: CANNOT REOPEN',
    goal: 'FREE 1-3, PH 7.0-7.4',
    water: () => SCENARIO_WATERS['dechlorination'],
    met: (r) => inFc(r) && inPh(r),
  },
  {
    id: 'faecal-incident',
    title: 'FAECAL',
    closed: true,
    symptom: 'DIARRHOEAL INCIDENT: POOL CLEARED AND CLOSED',
    goal: 'HOLD 20 MG/L AT PH<=7.5 FOR CT 15300, THEN FREE 1-3, PH 7.0-7.4',
    water: () => SCENARIO_WATERS['faecal-incident'],
    met: (r, s) => s.ct >= FAECAL_CT && inFc(r) && inPh(r),
  },
  {
    id: 'stabiliser',
    title: 'STABILISER',
    closed: false,
    symptom: 'WRONG DELIVERY: CHLORINE READS FINE BUT WORKS POORLY',
    goal: "HOCL SHARE ABOVE HALF THE RESET WATER'S, FREE 1-3",
    water: () =>
      dose(resetWater(), { cyanuric: 30 * VOLUME }, VOLUME, TEMPERATURE),
    met: (r) => r.hoclShare >= RESET_HOCL_SHARE / 2 && inFc(r),
  },
  {
    id: 'hard-water',
    title: 'HARD WATER',
    closed: false,
    symptom: 'WHITE CRUST ON THE HEATER: SCALING',
    goal: 'BALANCE -0.5 TO +0.5, HARDNESS 300 OR LESS',
    water: () =>
      waterFrom({
        ph: 7.7,
        alkalinity: 180,
        hardness: 400,
        tds: RESET_WATER.tds,
        temperature: TEMPERATURE,
        freeChlorine: RESET_WATER.freeChlorine,
        sulphate: RESET_WATER.sulphate,
      }),
    met: (r) => Math.abs(r.lsi) <= 0.5 && r.ch <= 300,
  },
  {
    id: 'sulphate',
    title: 'SULPHATE',
    closed: false,
    symptom: 'A SEASON OF DRY ACID: SULPHATE OVER THE GROUT LIMIT',
    goal: 'SULPHATE UNDER 360, PH 7.0-7.4',
    // Dry acid to 400 mg/l of sulphate, bicarbonate mole for mole keeping the
    // alkalinity, its CO2 since gone to the air: the pool tested at the reset
    // pH and alkalinity, with the salts the doses left (`dose`'s TDS).
    water: () => {
      const bis =
        ((400 - RESET_WATER.sulphate) * VOLUME * MOLAR.NaHSO4) / MOLAR.SO4;
      const dosed = dose(
        resetWater(),
        { bisulphate: bis, bicarbonate: (bis * MOLAR.NaHCO3) / MOLAR.NaHSO4 },
        VOLUME,
        TEMPERATURE,
      );
      return waterFrom({
        ...RESET_WATER,
        sulphate: dosed.sulphate,
        tds: dosed.tds,
      });
    },
    met: (r) => r.so4 < 360 && inPh(r),
  },
];

// ---- Readings ------------------------------------------------------------------------

export interface Hall4Readings {
  fc: number;
  cc: number;
  tc: number;
  ph: number;
  /** HOCl as a share of free chlorine, %. */
  hoclShare: number;
  ta: number;
  ch: number;
  /** TDS above the mains', mg/l. */
  tdsAbove: number;
  so4: number;
  lsi: number;
}

export function readWater(w: PoolChemistry): Hall4Readings {
  const r = readings(w, TEMPERATURE);
  return {
    fc: w.freeChlorine,
    cc: r.combinedChlorine,
    tc: r.totalChlorine,
    ph: w.ph,
    hoclShare: w.freeChlorine > 1e-6 ? (100 * r.hocl) / w.freeChlorine : 0,
    ta: w.alkalinity,
    ch: w.hardness,
    tdsAbove: w.tds - MAINS.tds,
    so4: w.sulphate,
    lsi: r.langelier,
  };
}

const RESET_HOCL_SHARE = readWater(resetWater()).hoclShare;

/**
 * The balance index's terms as the Balance Beam shows them (Langelier's
 * formula, as `readings` computes it): the pH; the hardness term C =
 * log CH − 0.4; the alkalinity term D = log TA; and temperature and TDS
 * together, −(9.3 + A + B). They sum to the index.
 */
export function balanceTerms(w: PoolChemistry) {
  const tds = Math.max(1, w.tds);
  const T = TEMPERATURE;
  const A = (Math.log10(tds) - 1) / 10;
  const B = -13.12 * Math.log10(T + 273) + 34.55;
  return {
    ph: w.ph,
    hardness: Math.log10(Math.max(1e-6, w.hardness)) - 0.4,
    alkalinity: Math.log10(Math.max(1e-6, w.alkalinity)),
    temperatureTds: -(9.3 + A + B),
  };
}

// ---- The state ------------------------------------------------------------------------

export interface Delivery {
  tank: TankId;
  /** In the tank's unit. */
  amount: number;
  /** Plant seconds of delivery left. */
  left: number;
}

export interface Hall4State {
  bench: BenchState;
  /** Time of day at reset, s, and plant seconds since. */
  start: number;
  seconds: number;
  /** Plant seconds since the last chemistry step. */
  due: number;
  selected: TankId | null;
  /** The thumbwheels, in tenths of the tank's unit. */
  dial: number;
  delivering: Delivery | null;
  used: Record<TankId, number>;
  swimmers: Swimmers;
  /** Swimmers sent in, waiting for the next step. */
  group: number;
  /** The CHALLENGE selector's card, and the card running. */
  card: number;
  active: CardId | null;
  cardStart: number;
  metSince: number | null;
  solved: boolean;
  /** The faecal card's contact so far, mg·min/l. */
  ct: number;
  /** The log sheet: every line printed since reset, the oldest dropped past 200. */
  log: string[];
  printed: number;
  hour: number;
  /** Real seconds since RESET, for its lamp (kept by the view). */
  sinceReset: number;
}

const two = (n: number) => String(n).padStart(2, '0');
export const clockText = (s: Hall4State) => {
  const t = Math.floor((s.start + s.seconds) % 86400);
  return `${two(Math.floor(t / 3600))}:${two(Math.floor(t / 60) % 60)}`;
};

const print = (s: Hall4State, line: string): Hall4State => ({
  ...s,
  log: [...s.log.slice(-199), `${clockText(s)} ${line}`],
  printed: s.printed + 1,
});

const sign = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
/** The hourly line: "14:00 FC 1.42 CC 0.18 PH 7.38 TA 121 CH 200 SO4 60 LSI +0.05". */
export function waterLine(w: PoolChemistry) {
  const r = readWater(w);
  return `FC ${r.fc.toFixed(2)} CC ${r.cc.toFixed(2)} PH ${r.ph.toFixed(2)} TA ${r.ta.toFixed(0)} CH ${r.ch.toFixed(0)} SO4 ${r.so4.toFixed(0)} LSI ${sign(r.lsi)}`;
}

const zeroUsed = () =>
  Object.fromEntries(TANKS.map((t) => [t.id, 0])) as Record<TankId, number>;

export function newHall4(now = 0): Hall4State {
  const bench = {
    ...newBench(LAB_POOL, { ...LAB_PLANT }, 'one'),
    t: now / 3600,
  };
  let s: Hall4State = {
    bench,
    start: now,
    seconds: 0,
    due: 0,
    selected: null,
    dial: 0,
    delivering: null,
    used: zeroUsed(),
    swimmers: 'normal',
    group: 0,
    card: 0,
    active: null,
    cardStart: 0,
    metSince: null,
    solved: false,
    ct: 0,
    log: [],
    printed: 0,
    hour: Math.floor(now / 3600),
    sinceReset: 0,
  };
  s = print(s, 'NEW SHEET: RESET WATER');
  return print(s, waterLine(bench.pool));
}

export const water = (s: Hall4State) => s.bench.pool;

/** The VFD's line: "HCl 10% 012.7 l READY". */
export function vfdLine(s: Hall4State) {
  if (s.delivering) {
    const t = tankById(s.delivering.tank);
    return `${t.short} ${s.delivering.amount.toFixed(1)} ${t.unit} DOSING`;
  }
  if (!s.selected) return 'SELECT A CHEMICAL';
  const t = tankById(s.selected);
  return `${t.short} ${(s.dial / 10).toFixed(1).padStart(5, '0')} ${t.unit} ${s.dial > 0 ? 'READY' : 'DIAL AMOUNT'}`;
}

export type Hall4Action =
  | { type: 'select'; tank: TankId }
  | { type: 'wheel'; digit: 0 | 1 | 2 | 3; by: number }
  | { type: 'dose' }
  /** The console's DOSE (mission 113): `amount` of `tank` in at once, no metering. */
  | { type: 'dose-now'; tank: TankId; amount: number }
  | { type: 'cancel' }
  | { type: 'swimmers'; swimmers: Swimmers }
  | { type: 'group' }
  | { type: 'card'; by: number }
  | { type: 'start-card' };

/** The digit (0 hundreds … 3 tenths) of the thumbwheels. */
export const digitOf = (dial: number, digit: number) =>
  Math.floor(dial / 10 ** (3 - digit)) % 10;

export function actOnHall4(s: Hall4State, a: Hall4Action): Hall4State {
  switch (a.type) {
    case 'select':
      return s.delivering
        ? s
        : { ...s, selected: s.selected === a.tank ? null : a.tank };
    case 'wheel': {
      const d = digitOf(s.dial, a.digit);
      const nd = (((d + Math.sign(a.by)) % 10) + 10) % 10;
      return { ...s, dial: s.dial + (nd - d) * 10 ** (3 - a.digit) };
    }
    case 'dose': {
      if (s.delivering || !s.selected || s.dial <= 0) return s;
      const t = tankById(s.selected);
      const amount = Math.min(
        s.dial / 10,
        t.id === 'fresh' ? VOLUME : Infinity,
      );
      return print(
        { ...s, delivering: { tank: t.id, amount, left: DOSE_SECONDS } },
        `DOSE ${t.code} ${t.short} ${amount.toFixed(1)} ${t.unit}`,
      );
    }
    case 'dose-now': {
      const t = tankById(a.tank);
      const amount = Math.max(0, a.amount);
      let n: Hall4State = {
        ...s,
        delivering: null,
        used: { ...s.used, [t.id]: s.used[t.id] + amount },
      };
      n = t.addition
        ? {
            ...n,
            bench: handDose(
              n.bench,
              { [t.addition]: amount * t.perUnit },
              'pool',
            ),
          }
        : refill(n, amount);
      return print(
        { ...n, due: CHEMISTRY_STEP },
        `DOSE ${t.code} ${t.short} ${amount.toFixed(1)} ${t.unit}`,
      );
    }
    case 'cancel':
      if (s.delivering) {
        const t = tankById(s.delivering.tank);
        const done =
          s.delivering.amount * (1 - s.delivering.left / DOSE_SECONDS);
        return print(
          t.addition
            ? { ...s, delivering: null }
            : refill({ ...s, delivering: null }, done),
          `CANCEL ${t.code} AFTER ${done.toFixed(1)} ${t.unit}`,
        );
      }
      return { ...s, selected: null, dial: 0 };
    case 'swimmers':
      return print(
        {
          ...s,
          swimmers: a.swimmers,
          bench: {
            ...s.bench,
            plant: {
              ...s.bench.plant,
              batherFactor: BATHER_FACTOR[a.swimmers],
            },
          },
        },
        `SWIMMERS ${a.swimmers.toUpperCase()}`,
      );
    case 'group':
      return print(
        { ...s, group: s.group + GROUP },
        `+${GROUP} SWIMMERS ARRIVE`,
      );
    case 'card':
      return {
        ...s,
        card: (((s.card + a.by) % CARDS.length) + CARDS.length) % CARDS.length,
      };
    case 'start-card': {
      const c = CARDS[s.card];
      const swimmers: Swimmers = c.closed ? 'none' : 'normal';
      let n: Hall4State = {
        ...s,
        bench: {
          ...s.bench,
          pool: { ...c.water() },
          pending: [],
          plant: { ...s.bench.plant, batherFactor: BATHER_FACTOR[swimmers] },
        },
        swimmers,
        group: 0,
        delivering: null,
        active: c.id,
        cardStart: s.seconds,
        metSince: null,
        solved: false,
        ct: 0,
      };
      n = print(n, `CARD ${s.card + 1} ${c.title}: ${c.symptom}`);
      n = print(n, `GOAL: ${c.goal}`);
      return print(n, waterLine(n.bench.pool));
    }
  }
}

const durationText = (sec: number) => {
  const m = Math.round(sec / 60);
  return `${Math.floor(m / 60)} h ${m % 60} min`;
};

/** One chemistry step of `dt` plant seconds: the group in, the bench on, the card checked. */
function chemistry(s: Hall4State, dt: number): Hall4State {
  let bench = s.bench;
  if (s.group > 0) {
    // Twenty visits at once: the model's bathers over one second.
    const r = stepChemistry(
      bench.pool,
      {
        volume: VOLUME,
        temperature: TEMPERATURE,
        surface: LAB_POOL.surface,
        circulation: LAB_POOL.circulation,
        bathers: s.group * 3600,
        visitHours: 1,
      },
      1,
    );
    bench = { ...bench, pool: r.water };
  }
  bench = stepBench(bench, LAB_POOL, dt);
  let n: Hall4State = { ...s, bench, group: 0, due: 0 };
  if (n.active && !n.solved) {
    const r = readWater(bench.pool);
    if (n.active === 'faecal-incident' && r.ph <= 7.5)
      n = { ...n, ct: n.ct + (r.fc * dt) / 60 };
    const card = CARDS.find((c) => c.id === n.active)!;
    if (card.met(r, n)) {
      const since = n.metSince ?? n.seconds;
      n = { ...n, metSince: since };
      if (n.seconds - since >= 3600) {
        n = print(
          { ...n, solved: true },
          `PUT RIGHT ${durationText(n.seconds - n.cardStart)}`,
        );
      }
    } else n = { ...n, metSince: null };
  }
  return n;
}

/** `m` cubic metres drained and made up from the mains (`mixWaters`). */
function refill(s: Hall4State, m: number): Hall4State {
  const units = Math.min(VOLUME, Math.max(0, m));
  return {
    ...s,
    bench: {
      ...s.bench,
      pool: mixWaters(
        [
          { water: s.bench.pool, volume: VOLUME - units },
          { water: waterFrom({ ...MAINS }), volume: units },
        ],
        TEMPERATURE,
      ),
    },
  };
}

/** The lab `h` plant seconds on. */
export function stepHall4(s: Hall4State, h: number): Hall4State {
  if (!(h > 0)) return s;
  let n: Hall4State = { ...s, seconds: s.seconds + h, due: s.due + h };
  let force = n.group > 0;
  let finished = false;
  if (n.delivering) {
    const d = n.delivering;
    const share = Math.min(d.left, h) / DOSE_SECONDS;
    const t = tankById(d.tank);
    const units = d.amount * share;
    n = { ...n, used: { ...n.used, [t.id]: n.used[t.id] + units } };
    if (t.addition)
      n = {
        ...n,
        bench: handDose(n.bench, { [t.addition]: units * t.perUnit }, 'pool'),
      };
    const left = d.left - h;
    n = { ...n, delivering: left > 1e-9 ? { ...d, left } : null };
    // Fresh water: that much drained, then the pool refilled from the mains.
    if (!n.delivering && !t.addition) n = refill(n, d.amount);
    if (!n.delivering) force = finished = true;
  }
  if (force || n.due >= CHEMISTRY_STEP) {
    n = chemistry(n, n.due);
    if (finished) n = print(n, waterLine(n.bench.pool));
  }
  const hour = Math.floor((n.start + n.seconds) / 3600);
  if (hour !== n.hour) n = print({ ...n, hour }, waterLine(n.bench.pool));
  return n;
}

/** The lab `seconds` on, in the museum clock's half-second slices. */
export function runHall4(
  s: Hall4State,
  seconds: number,
  slice = 0.5,
): Hall4State {
  let n = s;
  for (let t = 0; t < seconds - 1e-9; t += slice)
    n = stepHall4(n, Math.min(slice, seconds - t));
  return n;
}

export const HALL4_MODEL = {
  reset: (now: number) => newHall4(now),
  step: stepHall4,
};

/** The green bands the readout paints (PWTAG, as `doc/prompts/107d-chemistry-lab.md` cites). */
export const GREEN: Record<MeterId, readonly [number, number] | null> = {
  fc: [1, 2],
  // The challenge engine's bands (mission 113, `museum-4-challenge.ts`
  // BANDS), so a won card never shows a meter outside green.
  cc: [0, 1.0],
  tc: null,
  ph: [7.2, 7.6],
  hocl: null,
  ta: [80, 200],
  ch: [100, 1000],
  tds: [0, 1000],
  so4: [0, 360],
  lsi: [-0.5, 0.5],
};
export const SCALE: Record<MeterId, readonly [number, number]> = {
  fc: [0, 10],
  cc: [0, 2],
  tc: [0, 10],
  ph: [6.5, 8.5],
  hocl: [0, 100],
  ta: [0, 300],
  ch: [0, 500],
  tds: [0, 2000],
  so4: [0, 600],
  lsi: [-1.5, 1.5],
};
export const METER_LABEL: Record<MeterId, string> = {
  fc: 'FREE CHLORINE mg/l',
  cc: 'COMBINED CHLORINE mg/l',
  tc: 'TOTAL CHLORINE mg/l',
  ph: 'pH',
  hocl: 'CHLORINE WORKING % (HOCl)',
  ta: 'ALKALINITY mg/l CaCO3',
  ch: 'CALCIUM HARDNESS mg/l',
  tds: 'TDS ABOVE MAINS mg/l',
  so4: 'SULPHATE mg/l',
  lsi: 'BALANCE INDEX',
};
export function meterValue(r: Hall4Readings, m: MeterId): number {
  switch (m) {
    case 'fc':
      return r.fc;
    case 'cc':
      return r.cc;
    case 'tc':
      return r.tc;
    case 'ph':
      return r.ph;
    case 'hocl':
      return r.hoclShare;
    case 'ta':
      return r.ta;
    case 'ch':
      return r.ch;
    case 'tds':
      return r.tdsAbove;
    case 'so4':
      return r.so4;
    case 'lsi':
      return r.lsi;
  }
}
export const METER_PLACES: Record<MeterId, number> = {
  fc: 2,
  cc: 2,
  tc: 2,
  ph: 2,
  hocl: 0,
  ta: 0,
  ch: 0,
  tds: 0,
  so4: 0,
  lsi: 2,
};
