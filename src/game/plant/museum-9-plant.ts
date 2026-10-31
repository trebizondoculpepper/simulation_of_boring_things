import { expandForPlumbing } from './plumbing-expansion';
import type {
  Expansion,
  GivenFitting,
  PlumbEdge,
  PlumbMedium,
} from './plumbing-expansion';
import type { SchematicNode } from './schematics';
import {
  actOnHall1,
  FS_FLOW,
  GAS_MBAR,
  hall1Readings,
  MV_STROKE,
  newHall1,
  PUMP as HALL1_PUMP,
  RESISTANCE as HALL1_RESISTANCE,
  START_SET,
  stepHall1,
  thermostat,
} from './museum-1-heating';
import type { Hall1Action, Hall1State } from './museum-1-heating';
import {
  actOnHall2,
  networkKey,
  newHall2,
  solveHall2,
  stepHall2,
} from './museum-2-clean-water';
import type {
  Hall2Action,
  Hall2Flows,
  Hall2State,
} from './museum-2-clean-water';
import {
  actOnHall3,
  hall3Readings,
  NEEDLE_NORMAL,
  newHall3,
  stepHall3,
} from './museum-3-dosing';
import type { Hall3Action, Hall3State } from './museum-3-dosing';
import { DRIFTED_PROBES } from '../../toolkit/components/plant/logic/sample-cell';
import { boilerLamps } from '../../toolkit/components/plant/logic/boiler-house';

/**
 * Hall 9 of the museum, "The whole plant" (107e, the finale): Halls 1 to
 * 3 joined into one small working plant, by their own models, imported,
 * never copied. Hall 2's circulation (the balance tank, the pump, the
 * sand filter on its five-valve nest and its backwash) carries the water;
 * its flow, through the new basket strainer ST1 on the pump's suction,
 * is the flow Hall 1's exchanger sees (its pool pump's valve held so its
 * own loop passes exactly that water) and the flow that carries Hall 3's
 * chemistry round (its pump running while the water moves). Hall 1's
 * Hamwarmy HW 160 heats the pool through the exchanger, its motorised
 * valve worked by the thermostat, or held OPEN or SHUT from the desk;
 * Hall 3's sample cell, controller and metering pumps look after the
 * chlorine and pH. P1 has a starter of its own (HAND · OFF · AUTO, an
 * overload). Faults enter only through the models' own inputs (a fouled
 * strainer, a seized valve, a dead actuator, a nudged gas cock, an empty
 * day tank, gas in a pump's head, a blocked needle valve, a drifted
 * probe); `museum-9-faults.ts` causes and judges them. The water's
 * readouts and the annunciator read only instruments, never the true
 * water. Every fitting is given, so the plumber adds nothing; tags are
 * derived (room code M9). Pure; seconds, m³/h, bar, °C, mg/l.
 *
 * Joined, two simplifications: Hall 2's treatment train (its contact
 * tank, carbon and UV, switched off here) stays in its network as the
 * return main's resistance; and the pool's temperature is Hall 1's while
 * the chemistry keeps Hall 3's constant pool temperature.
 */

export const ROOM_CODE = 'M9';

// ---- The schematic ------------------------------------------------------------

export type MachineId =
  | 'gasMain'
  | 'boiler'
  | 'atmosphere'
  | 'pressurisation'
  | 'primaryPump'
  | 'flowTee'
  | 'returnTee'
  | 'balanceTank'
  | 'strainer'
  | 'poolPump'
  | 'feedTee'
  | 'filter'
  | 'wasteTee'
  | 'drain'
  | 'hxTeeIn'
  | 'hx'
  | 'hxTeeOut'
  | 'sampleTee'
  | 'hypoInjection'
  | 'acidInjection'
  | 'pool'
  | 'hypoStore'
  | 'hypoTank'
  | 'hypoPump'
  | 'acidStore'
  | 'acidTank'
  | 'acidPump'
  | 'sampleCell'
  | 'sampleDrain';

const node = (
  id: MachineId,
  kind: string,
  code: string,
  name: string,
): SchematicNode & { id: MachineId } => ({ id, kind, code, name });

/** The machines, left to right as the visitor sees them: heat, water, chemistry. */
export const NODES: readonly (SchematicNode & { id: MachineId })[] = [
  node('gasMain', 'ideal-gas-source', 'GS1', 'Ideal gas main'),
  node('boiler', 'condensing-boiler', 'B1', 'Condensing boiler'),
  node('atmosphere', 'ideal-atmosphere', 'AT1', 'The open air (flue terminal)'),
  node('pressurisation', 'pressurisation-unit', 'PU1', 'Pressurisation unit'),
  node('primaryPump', 'twin-head-pump', 'P2', 'Primary pump'),
  node('flowTee', 'tee', 'TE1', 'Heating bypass tee, flow'),
  node('returnTee', 'tee', 'TE2', 'Heating bypass tee, return'),
  node('balanceTank', 'ideal-balance-tank', 'BT1', 'Ideal balance tank'),
  node('strainer', 'basket-strainer', 'ST1', 'Pump suction strainer'),
  node('poolPump', 'end-suction-pump', 'P1', 'Circulation pump'),
  node('feedTee', 'tee', 'TE3', 'Filter feed tee'),
  node('filter', 'sand-filter', 'F1', 'Sand filter'),
  node('wasteTee', 'tee', 'TE4', 'Waste tee'),
  node('drain', 'ideal-drain', 'DR1', 'Ideal drain'),
  node('hxTeeIn', 'tee', 'TE5', 'Exchanger bypass tee, in'),
  node('hx', 'plate-heat-exchanger', 'HX1', 'Plate heat exchanger'),
  node('hxTeeOut', 'tee', 'TE6', 'Exchanger bypass tee, out'),
  node('sampleTee', 'tee', 'TE7', 'Sample tapping'),
  node(
    'hypoInjection',
    'injection-point',
    'IJ1',
    'Hypochlorite injection point',
  ),
  node('acidInjection', 'injection-point', 'IJ2', 'Acid injection point'),
  node('pool', 'ideal-pool', 'IP1', 'Ideal pool'),
  node('hypoStore', 'ideal-chemical-source', 'CS1', 'Hypochlorite store'),
  node('hypoTank', 'day-tank', 'DT1', 'Hypochlorite day tank'),
  node('hypoPump', 'metering-pump', 'DP1', 'Hypochlorite dosing pump'),
  node('acidStore', 'ideal-chemical-source', 'CS2', 'Acid store'),
  node('acidTank', 'day-tank', 'DT2', 'Acid day tank'),
  node('acidPump', 'metering-pump', 'DP2', 'Acid dosing pump'),
  node('sampleCell', 'sample-cell', 'SC1', 'Sample cell'),
  node('sampleDrain', 'ideal-sink', 'DR2', 'Sample drain'),
];

export type LinkId =
  | 'gas'
  | 'flue'
  | 'fill'
  | 'primaryFlow'
  | 'hxFlow'
  | 'bypass'
  | 'hxReturn'
  | 'primarySuction'
  | 'primaryReturn'
  | 'overflow'
  | 'suction'
  | 'strained'
  | 'discharge'
  | 'toInlet'
  | 'toUnderdrain'
  | 'backwashOut'
  | 'rinse'
  | 'waste'
  | 'filtered'
  | 'toHx'
  | 'hxBypass'
  | 'fromHx'
  | 'heated'
  | 'returnA'
  | 'returnB'
  | 'returnC'
  | 'sample'
  | 'sampleOut'
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

/** The links, each the way its contents flow. */
export const LINKS: readonly (PlumbEdge & { id: LinkId })[] = [
  link('gas', ['gasMain', 'out-1'], ['boiler', 'gas'], 'gas'),
  link('flue', ['boiler', 'flue'], ['atmosphere', 'in'], 'flue'),
  link('fill', ['pressurisation', 'out'], ['boiler', 'fill']),
  link('primaryFlow', ['boiler', 'flow'], ['flowTee', 'in']),
  link('hxFlow', ['flowTee', 'run'], ['hx', 'primary-in']),
  link('bypass', ['flowTee', 'branch'], ['returnTee', 'branch']),
  link('hxReturn', ['hx', 'primary-out'], ['returnTee', 'run']),
  link('primarySuction', ['returnTee', 'out'], ['primaryPump', 'suction']),
  link('primaryReturn', ['primaryPump', 'discharge'], ['boiler', 'return']),
  link('overflow', ['pool', 'overflow'], ['balanceTank', 'inlet']),
  link('suction', ['balanceTank', 'outlet'], ['strainer', 'in']),
  link('strained', ['strainer', 'out'], ['poolPump', 'suction']),
  link('discharge', ['poolPump', 'discharge'], ['feedTee', 'in']),
  link('toInlet', ['feedTee', 'run'], ['filter', 'inlet']),
  link('toUnderdrain', ['feedTee', 'branch'], ['filter', 'backwash-in']),
  link('backwashOut', ['filter', 'backwash-out'], ['wasteTee', 'run']),
  link('rinse', ['filter', 'rinse'], ['wasteTee', 'branch']),
  link('waste', ['wasteTee', 'out'], ['drain', 'in']),
  link('filtered', ['filter', 'outlet'], ['hxTeeIn', 'in']),
  link('toHx', ['hxTeeIn', 'run'], ['hx', 'secondary-in']),
  link('hxBypass', ['hxTeeIn', 'branch'], ['hxTeeOut', 'branch']),
  link('fromHx', ['hx', 'secondary-out'], ['hxTeeOut', 'run']),
  link('heated', ['hxTeeOut', 'out'], ['sampleTee', 'in']),
  link('returnA', ['sampleTee', 'run'], ['hypoInjection', 'in']),
  link('returnB', ['hypoInjection', 'out'], ['acidInjection', 'in']),
  link('returnC', ['acidInjection', 'out'], ['pool', 'inlet']),
  link('sample', ['sampleTee', 'branch'], ['sampleCell', 'in']),
  link('sampleOut', ['sampleCell', 'out'], ['sampleDrain', 'in']),
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
  gas: 'Natural gas',
  flue: 'Flue',
  fill: 'Pressurisation fill',
  primaryFlow: 'Heating flow',
  hxFlow: 'Heating flow to exchanger',
  bypass: 'Heating bypass',
  hxReturn: 'Heating return from exchanger',
  primarySuction: 'Heating return',
  primaryReturn: 'Heating return to boiler',
  overflow: 'Pool overflow',
  suction: 'Pump suction',
  strained: 'Strained water to pump',
  discharge: 'Pump discharge',
  toInlet: 'Filter inlet',
  toUnderdrain: 'Backwash supply',
  backwashOut: 'Backwash to waste',
  rinse: 'Rinse to waste',
  waste: 'Waste',
  filtered: 'Filtered water',
  toHx: 'Pool water to exchanger',
  hxBypass: 'Exchanger bypass',
  fromHx: 'Warmed pool water',
  heated: 'Return to pool',
  returnA: 'Return to injection',
  returnB: 'Return, chlorinated',
  returnC: 'Treated water to pool',
  sample: 'Sample water',
  sampleOut: 'Sample water to drain',
  hypoFill: 'Sodium hypochlorite fill',
  hypoSuction: 'Sodium hypochlorite to pump',
  hypoDose: 'Sodium hypochlorite dose',
  acidFill: 'Hydrochloric acid fill',
  acidSuction: 'Hydrochloric acid to pump',
  acidDose: 'Hydrochloric acid dose',
};

/** Each link's bore, DN. */
export const LINK_DN: Record<LinkId, 15 | 40 | 50 | 65 | 150 | 250> = {
  gas: 50,
  flue: 250,
  fill: 15,
  primaryFlow: 65,
  hxFlow: 65,
  bypass: 40,
  hxReturn: 65,
  primarySuction: 65,
  primaryReturn: 65,
  overflow: 150,
  suction: 150,
  strained: 150,
  discharge: 150,
  toInlet: 150,
  toUnderdrain: 150,
  backwashOut: 150,
  rinse: 150,
  waste: 150,
  filtered: 150,
  toHx: 150,
  hxBypass: 150,
  fromHx: 150,
  heated: 150,
  returnA: 150,
  returnB: 150,
  returnC: 150,
  sample: 15,
  sampleOut: 15,
  hypoFill: 15,
  hypoSuction: 15,
  hypoDose: 15,
  acidFill: 15,
  acidSuction: 15,
  acidDose: 15,
};

/** The chemical a link carries, if any. */
export const chemicalOf = (id: LinkId): 'hypochlorite' | 'acid' | null =>
  id.startsWith('hypo')
    ? 'hypochlorite'
    : id.startsWith('acid')
      ? 'acid'
      : null;

/** Which hall's model each valve is kept in. */
export type ValveHome = 'water' | 'heat' | 'chem' | 'hall';

export interface HallFitting extends GivenFitting {
  of?: MachineId;
  home?: ValveHome;
  /** A meter's letters: FT, FQ (gas), HM (heat). */
  meter?: 'FT' | 'FQ' | 'HM';
  body?:
    | 'ball'
    | 'butterfly'
    | 'needle'
    | 'fill'
    | 'bleed'
    | 'injection'
    | 'bypass'
    | 'motorised';
}

const valve = (
  id: string,
  edge: LinkId,
  end: 'source' | 'target',
  role: string,
  of: MachineId,
  home: ValveHome,
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
  home,
  ...options,
});

const nonReturn = (
  id: string,
  edge: LinkId,
  end: 'source' | 'target',
  role: string,
  of: MachineId,
  body?: HallFitting['body'],
): HallFitting => ({
  id,
  kind: 'non-return-valve',
  edge,
  end,
  normally: 'open',
  role,
  of,
  ...(body ? { body } : {}),
});

const meter = (
  id: string,
  edge: LinkId,
  end: 'source' | 'target',
  role: string,
  letters: 'FT' | 'FQ' | 'HM',
): HallFitting => ({
  id,
  kind: 'flowmeter',
  edge,
  end,
  normally: 'open',
  role,
  meter: letters,
});

const shut = { normally: 'closed' } as const;

/**
 * Every fitting, given, each kept in the hall model whose valve it is
 * (Hall 1's gas and boiler valves, Hall 2's pump and filter nest, Hall
 * 3's sample and dosing valves, by the same ids), or in this hall's own
 * state (the exchanger's bypass and motorised valve).
 */
export const FITTINGS: readonly HallFitting[] = [
  meter('gas.meter', 'gas', 'source', 'gas', 'FQ'),
  valve('gas.ecv', 'gas', 'source', 'emergency control', 'gasMain', 'heat'),
  valve(
    'boiler.gas.iso',
    'gas',
    'target',
    'boiler gas isolating',
    'boiler',
    'heat',
  ),
  valve(
    'boiler.flow.iso',
    'primaryFlow',
    'source',
    'boiler flow',
    'boiler',
    'heat',
  ),
  valve(
    'boiler.return.iso',
    'primaryReturn',
    'target',
    'boiler return',
    'boiler',
    'heat',
  ),
  valve(
    'boiler.bypass',
    'bypass',
    'source',
    'differential bypass',
    'boiler',
    'heat',
    {
      ...shut,
      operator: undefined,
      body: 'bypass',
    },
  ),
  nonReturn(
    'primaryPump.nrv',
    'primaryReturn',
    'source',
    'primary pump non-return',
    'primaryPump',
  ),
  meter('hx.primary.heat', 'hxReturn', 'source', 'heat to the pool', 'HM'),
  valve(
    'pump.suction.iso',
    'suction',
    'target',
    'pump suction',
    'poolPump',
    'water',
    {
      body: 'butterfly',
    },
  ),
  nonReturn(
    'pump.discharge.nrv',
    'discharge',
    'source',
    'pump non-return',
    'poolPump',
  ),
  valve(
    'pump.discharge.iso',
    'discharge',
    'source',
    'pump discharge',
    'poolPump',
    'water',
    {
      body: 'butterfly',
    },
  ),
  valve(
    'filter.inlet.iso',
    'toInlet',
    'target',
    'filter inlet',
    'filter',
    'water',
    {
      body: 'butterfly',
    },
  ),
  valve(
    'filter.outlet.iso',
    'filtered',
    'source',
    'filter outlet',
    'filter',
    'water',
    {
      body: 'butterfly',
    },
  ),
  valve(
    'filter.backwash-in.iso',
    'toUnderdrain',
    'target',
    'filter backwash inlet',
    'filter',
    'water',
    {
      ...shut,
      body: 'butterfly',
    },
  ),
  valve(
    'filter.backwash-out.iso',
    'backwashOut',
    'source',
    'filter backwash outlet',
    'filter',
    'water',
    {
      ...shut,
      body: 'butterfly',
    },
  ),
  valve(
    'filter.rinse.iso',
    'rinse',
    'source',
    'filter rinse to waste',
    'filter',
    'water',
    {
      ...shut,
      body: 'butterfly',
    },
  ),
  meter('filtered.meter', 'filtered', 'target', 'circulation', 'FT'),
  valve('hx.bypass', 'hxBypass', 'source', 'exchanger bypass', 'hx', 'hall', {
    ...shut,
    body: 'butterfly',
  }),
  valve(
    'hx.primary.mv',
    'hxFlow',
    'target',
    'exchanger primary',
    'hx',
    'hall',
    {
      ...shut,
      operator: 'motor',
      body: 'motorised',
    },
  ),
  valve(
    'sample.iso',
    'sample',
    'source',
    'sample isolating',
    'sampleCell',
    'chem',
  ),
  valve(
    'sample.needle',
    'sample',
    'target',
    'sample flow',
    'sampleCell',
    'chem',
    {
      body: 'needle',
    },
  ),
  valve(
    'hypoTank.fill',
    'hypoFill',
    'target',
    'push-to-fill',
    'hypoTank',
    'chem',
    {
      ...shut,
      body: 'fill',
    },
  ),
  valve(
    'acidTank.fill',
    'acidFill',
    'target',
    'push-to-fill',
    'acidTank',
    'chem',
    {
      ...shut,
      body: 'fill',
    },
  ),
  nonReturn(
    'hypoPump.injection',
    'hypoDose',
    'target',
    'hypochlorite injection',
    'hypoPump',
    'injection',
  ),
  valve('hypoPump.bleed', 'hypoDose', 'source', 'bleed', 'hypoPump', 'chem', {
    ...shut,
    body: 'bleed',
  }),
  nonReturn(
    'acidPump.injection',
    'acidDose',
    'target',
    'acid injection',
    'acidPump',
    'injection',
  ),
  valve('acidPump.bleed', 'acidDose', 'source', 'bleed', 'acidPump', 'chem', {
    ...shut,
    body: 'bleed',
  }),
];

export const fittingById = (id: string) => FITTINGS.find((f) => f.id === id);

export type InstrumentKind =
  | 'pressure'
  | 'differential'
  | 'sight-glass'
  | 'temperature'
  | 'flow-switch'
  | 'thermostat'
  | 'analyser'
  | 'sample-point'
  | 'level'
  | 'quality'
  | 'controller'
  | 'annunciator'
  | 'test-kit'
  | 'clock'
  | 'board'
  | 'mimic'
  | 'desk';

export interface Instrument {
  id: string;
  kind: InstrumentKind;
  role: string;
  on?: MachineId;
  edge?: LinkId;
}

const inst = (
  id: string,
  kind: InstrumentKind,
  role: string,
  where: { on?: MachineId; edge?: LinkId } = {},
): Instrument => ({ id, kind, role, ...where });

/** The instruments, in tag order. */
export const INSTRUMENTS: readonly Instrument[] = [
  inst('pump.suction.pi', 'pressure', 'pump suction (compound)', {
    on: 'poolPump',
  }),
  inst('pump.discharge.pi', 'pressure', 'pump discharge', { on: 'poolPump' }),
  inst('gas.pi', 'pressure', 'gas supply', { edge: 'gas' }),
  inst('filter.pdi', 'differential', 'filter differential', { on: 'filter' }),
  inst('backwashOut.sg', 'sight-glass', 'backwash water', {
    edge: 'backwashOut',
  }),
  inst('hxIn.ti', 'temperature', 'pool water to exchanger', { edge: 'toHx' }),
  inst('hxOut.ti', 'temperature', 'pool water from exchanger', {
    edge: 'fromHx',
  }),
  inst('boilerFlow.ti', 'temperature', 'boiler flow', { edge: 'primaryFlow' }),
  inst('boilerReturn.ti', 'temperature', 'boiler return', {
    edge: 'primaryReturn',
  }),
  inst('pool.ti', 'temperature', 'pool water', { on: 'pool' }),
  inst('hx.fs', 'flow-switch', 'pool water through the exchanger', {
    edge: 'toHx',
  }),
  inst('cell.fs', 'flow-switch', 'sample flow', { on: 'sampleCell' }),
  inst('pool.tc', 'thermostat', 'pool thermostat', { edge: 'toHx' }),
  inst('cell.cl', 'analyser', 'free chlorine probe', { on: 'sampleCell' }),
  inst('cell.ph', 'analyser', 'pH probe', { on: 'sampleCell' }),
  inst('cell.tap', 'sample-point', 'sample tap', { on: 'sampleCell' }),
  inst('hypoTank.li', 'level', 'hypochlorite level', { on: 'hypoTank' }),
  inst('acidTank.li', 'level', 'acid level', { on: 'acidTank' }),
  inst('desk.qi', 'quality', 'water quality display'),
  inst('controller', 'controller', 'dosing controller (Chlorella CX-7)'),
  inst('desk.ua', 'annunciator', 'location annunciator'),
  inst('testKit', 'test-kit', 'DPD test kit'),
  inst('desk.clock', 'clock', 'station clock'),
  // The boards and the desk that carry the instruments above, coded as
  // Hall 1's losses board (QB), the plant rooms' mimic panels (MP) and
  // Hall 4's desk (DS) are: the heating's thermometer board by the
  // exchanger, the mimic and the control desk that holds it.
  inst('tiBoard', 'board', 'heating thermometer board'),
  inst('mimic', 'mimic', 'mimic panel'),
  inst('desk', 'desk', 'control desk'),
];

// ---- Tags, derived -------------------------------------------------------------

const nodeById = new Map(NODES.map((n) => [n.id, n]));
export const machineTag = (id: MachineId) =>
  `${ROOM_CODE}-${nodeById.get(id)!.code}`;

const LETTERS: Record<InstrumentKind, string> = {
  pressure: 'PI',
  differential: 'PDI',
  'sight-glass': 'SG',
  temperature: 'TI',
  'flow-switch': 'FS',
  thermostat: 'TC',
  analyser: 'AE',
  'sample-point': 'SP',
  level: 'LI',
  quality: 'QI',
  controller: 'DC',
  annunciator: 'UA',
  'test-kit': 'TK',
  clock: 'KI',
  board: 'QB',
  mimic: 'MP',
  desk: 'DS',
};

/**
 * Every tag, derived: a valve its machine's tag and its number among that
 * machine's valves (a non-return valve NRV); a meter its letters (FT, FQ,
 * HM) and number; an instrument its letters and its number among them.
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
      const l = f.meter ?? 'FT';
      tags[f.id] = `${ROOM_CODE}-${l}${next(l)}`;
    } else {
      const letter = f.kind === 'non-return-valve' ? 'NRV' : 'V';
      tags[f.id] = `${machineTag(f.of!)}-${letter}${next(`${f.of}.${letter}`)}`;
    }
  }
  for (const i of INSTRUMENTS) {
    const l = LETTERS[i.kind];
    tags[i.id] = `${ROOM_CODE}-${l}${next(l)}`;
  }
  for (const n of NODES) tags[n.id] = machineTag(n.id);
  tags['starter'] = `${machineTag('poolPump')}-MS1`;
  tags['swimmers'] = `${ROOM_CODE}-BA1`;
  tags['faults'] = `${ROOM_CODE}-FP1`;
  tags['scoreboard'] = `${ROOM_CODE}-SB1`;
  return tags;
})();

export const shortTag = (id: string) => TAGS[id].slice(ROOM_CODE.length + 1);

export function fittingName(f: HallFitting): string {
  const role = f.role ?? '';
  const words = role.charAt(0).toUpperCase() + role.slice(1);
  if (f.kind === 'flowmeter')
    return f.meter === 'FQ'
      ? 'Gas meter'
      : f.meter === 'HM'
        ? 'Heat meter'
        : 'Circulation flowmeter (electromagnetic)';
  if (f.body === 'injection') return `${words} valve (spring-loaded)`;
  if (f.kind === 'non-return-valve')
    return `${words.replace(/ non-return$/, '')} non-return valve`;
  if (f.body === 'needle') return 'Sample flow needle valve';
  if (f.body === 'fill') return 'Push-to-fill valve';
  if (f.body === 'bleed') return 'Bleed valve';
  if (f.body === 'motorised') return 'Exchanger primary motorised valve';
  return `${words} valve`;
}

/** The plumber's rules: a non-return valve on each pump's discharge; nothing else added. */
export const RULES = {
  isolate: new Set<string>(),
  pumps: new Set(['end-suction-pump', 'twin-head-pump']),
  discharge: 'discharge',
} as const;

export function hall9Expansion(): Expansion {
  return expandForPlumbing(NODES, LINKS, { ...RULES, given: FITTINGS });
}

// ---- The joined plant ------------------------------------------------------------

export type StarterMode = 'hand' | 'off' | 'auto';
export const STARTER_MODES: readonly StarterMode[] = ['hand', 'off', 'auto'];
export type MvCommand = 'auto' | 'open' | 'shut';

/** ST1's fouling a second: its swimmers' slow hair and plasters (a month to block), and blocked (the fault: ten plant minutes). */
export const STRAINER_RATE = { normal: 1 / (30 * 86400), blocked: 1 / 600 };
/** How far a fouled basket closes the suction, as a share of the line's opening at full fouling. */
export const STRAINER_CHOKE = 0.82;
/** The seized outlet valve's opening. */
export const STUCK_AT = 0.2;
/** GS1-V1 nudged part-shut: its opening (Hall 1's boiler sees no gas at half or less). */
export const NUDGED_AT = 0.5;
/** P1's motor: its full-load current, A, and its design flow, m³/h. */
export const P1_FLC = 55;
const P1_DESIGN = 185;

export interface Hall9State {
  start: number;
  seconds: number;
  water: Hall2State;
  heat: Hall1State;
  chem: Hall3State;
  /** ST1: fouling 0 (clean) to 1; its rate; its lid off. */
  strainer: number;
  strainerRate: number;
  lidOpen: boolean;
  starter: { mode: StarterMode; tripped: boolean };
  /** The desk's P1 and P2 START (true) or STOP. */
  deskP1: boolean;
  deskP2: boolean;
  mvCommand: MvCommand;
  actuatorFailed: boolean;
  override: boolean;
  /** F1-V2 seized. */
  stuck: boolean;
  /** HX1-V1, the exchanger's bypass, 0 shut to 1 open. */
  hxBypass: number;
  /** SC1-V2 blocked with debris. */
  needleBlocked: boolean;
  sinceReset: number;
}

/** The hall's reset state, its time of day `now`. */
export function newHall9Plant(now = 0): Hall9State {
  const water: Hall2State = {
    ...newHall2(now),
    generatorOn: false,
    generatorRun: false,
    boosterRunning: false,
    destructorOn: false,
    uvOn: false,
    uvOutput: 0,
    sinceReset: 0,
  };
  const heat: Hall1State = {
    ...newHall1(),
    poolC: START_SET,
    swimmers: 'busy',
  };
  return {
    start: now,
    seconds: 0,
    water,
    heat,
    chem: newHall3(now),
    strainer: 0,
    strainerRate: STRAINER_RATE.normal,
    lidOpen: false,
    starter: { mode: 'auto', tripped: false },
    deskP1: true,
    deskP2: true,
    mvCommand: 'auto',
    actuatorFailed: false,
    override: false,
    stuck: false,
    hxBypass: 0,
    needleBlocked: false,
    sinceReset: 0,
  };
}

/** P1's starter calls it to run. */
export const p1Called = (s: Hall9State) =>
  !s.starter.tripped &&
  !s.water.tripped &&
  !s.lidOpen &&
  (s.starter.mode === 'hand' || (s.starter.mode === 'auto' && s.deskP1));

/** The water network as Hall 2's model solves it: the strainer's choke on the suction, the seized valve held. */
export function waterAsSolved(s: Hall9State): Hall2State {
  const o = s.water.opening;
  return {
    ...s.water,
    pumpRunning: p1Called(s),
    opening: {
      ...o,
      'pump.suction.iso':
        o['pump.suction.iso'] * (1 - STRAINER_CHOKE * s.strainer),
    },
  };
}

let memoKey = '';
let memoFlows: Hall2Flows | null = null;
/** The circulation's solution, solved again only when the network changes. */
export function flowsOf(s: Hall9State): Hall2Flows {
  const w = waterAsSolved(s);
  const key = networkKey(w);
  if (key !== memoKey || !memoFlows) {
    memoFlows = solveHall2(w);
    memoKey = key;
  }
  return memoFlows;
}

/** Share of the filtered water through the exchanger (the rest by its bypass). */
export const hxShare = (s: Hall9State) => 1 - 0.6 * s.hxBypass;

/** Hall 1's pool pump's discharge valve, set so its own loop passes `q`. */
function heatOpeningFor(q: number): number {
  const R = HALL1_RESISTANCE;
  const total = HALL1_PUMP.shutoff / (q * q) - HALL1_PUMP.k;
  const others = R.suction + R.valveOpen + R.nonReturn + R.hx + R.returnMain;
  const valveR = total - others;
  if (valveR <= R.valveOpen) return 1;
  return Math.cbrt(R.valveOpen / valveR);
}

/**
 * The motorised valve's end switch: with HX1-V2 held shut (its actuator
 * dead, or SHUT from the desk) the boiler is not enabled, so it stands
 * idle rather than fire into a closed circuit; TC1 still calls.
 */
export const endSwitchOpen = (s: Hall9State) =>
  (s.actuatorFailed && !s.override) || s.mvCommand === 'shut';

/** The heating side as Hall 1's model steps it: the circulation's flow through its exchanger; P2 stopped from the desk; the end switch. */
function heatAsStepped(s: Hall9State, q: number): Hall1State {
  const through = q * hxShare(s);
  const run = through > 0.5;
  return {
    ...s.heat,
    poolPump: run,
    tripped: false,
    casingC: s.heat.poolC,
    tcSet: endSwitchOpen(s) ? 0 : s.heat.tcSet,
    opening: {
      ...s.heat.opening,
      'poolPump.suction.iso': 1,
      'poolPump.discharge.iso': run ? heatOpeningFor(through) : 1,
      'boiler.flow.iso': s.deskP2 ? s.heat.opening['boiler.flow.iso'] : 0,
    },
  };
}

const toward = (from: number, to: number, h: number) =>
  from + Math.max(-h / MV_STROKE, Math.min(h / MV_STROKE, to - from));

/** One slice of plant time, `h` seconds (no more than half a second). */
export function stepHall9Plant(state: Hall9State, h: number): Hall9State {
  if (!(h > 0)) return state;
  const s0 = state;
  const flows = flowsOf(s0);
  // The water: Hall 2's model, its suction choked by ST1, P1 on its starter.
  const solved = waterAsSolved(s0);
  const stepped = stepHall2(solved, flows, h);
  const water: Hall2State = {
    ...stepped,
    pumpRunning: s0.water.pumpRunning,
    opening: s0.water.opening,
  };
  if (stepped.tripped && !s0.water.tripped) water.tripped = true;
  const q = flows.toPool;
  // The heat: Hall 1's model, on that flow.
  const mv0 = s0.heat.mv;
  const asStepped = heatAsStepped(s0, q);
  let heat = stepHall1(asStepped, h);
  const target = s0.actuatorFailed
    ? s0.override
      ? 1
      : 0
    : s0.mvCommand === 'open'
      ? 1
      : s0.mvCommand === 'shut'
        ? 0
        : null;
  heat = {
    ...heat,
    tcSet: s0.heat.tcSet,
    calling: thermostat({ ...heat, tcSet: s0.heat.tcSet }).calling,
    opening: {
      ...heat.opening,
      'boiler.flow.iso': s0.heat.opening['boiler.flow.iso'],
    },
    ...(target === null
      ? {}
      : { mv: s0.actuatorFailed ? target : toward(mv0, target, h) }),
  };
  // The chemistry: Hall 3's model, its pump running while the water flows.
  let chem: Hall3State = {
    ...s0.chem,
    poolPump: q > 0.5,
    cell: s0.needleBlocked ? { ...s0.chem.cell, regulator: 0 } : s0.chem.cell,
  };
  chem = stepHall3(chem, h);
  const strainer = Math.min(1, s0.strainer + s0.strainerRate * h);
  return {
    ...s0,
    seconds: s0.seconds + h,
    water,
    heat,
    chem,
    strainer,
  };
}

export function runHall9Plant(s: Hall9State, seconds: number): Hall9State {
  let out = s;
  let left = seconds;
  while (left > 1e-9) {
    const h = Math.min(0.5, left);
    out = stepHall9Plant(out, h);
    left -= h;
  }
  return out;
}

export type Hall9PlantAction =
  | { type: 'water'; action: Hall2Action }
  | { type: 'heat'; action: Hall1Action }
  | { type: 'chem'; action: Hall3Action }
  | { type: 'starter-mode'; mode: StarterMode }
  | { type: 'starter-reset' }
  | { type: 'desk-p1'; run: boolean }
  | { type: 'desk-p2'; run: boolean }
  | { type: 'desk-mv'; command: 'open' | 'shut' }
  | { type: 'mv-override'; on: boolean }
  | { type: 'replace-actuator' }
  | { type: 'lid'; open: boolean }
  | { type: 'clean-basket' }
  | { type: 'free-valve' }
  | { type: 'clear-needle' }
  | { type: 'hx-bypass'; open: boolean };

/** ST1 isolated: P1 not running, its suction and discharge valves shut. */
export const strainerIsolated = (s: Hall9State) =>
  !p1Called(s) &&
  s.water.opening['pump.suction.iso'] === 0 &&
  s.water.opening['pump.discharge.iso'] === 0;

/** What an action does, at the machine it is done at. */
export function actOnHall9Plant(
  s: Hall9State,
  a: Hall9PlantAction,
): Hall9State {
  switch (a.type) {
    case 'water': {
      const w = a.action;
      if (
        s.stuck &&
        (w.type === 'valve' || w.type === 'notch') &&
        w.id === 'filter.outlet.iso'
      )
        return s;
      return { ...s, water: actOnHall2(s.water, w) };
    }
    case 'heat':
      return { ...s, heat: actOnHall1(s.heat, a.action) };
    case 'chem': {
      if (s.needleBlocked && a.action.type === 'needle') return s;
      return { ...s, chem: actOnHall3(s.chem, a.action) };
    }
    case 'starter-mode':
      return { ...s, starter: { ...s.starter, mode: a.mode } };
    case 'starter-reset':
      return {
        ...s,
        starter: { ...s.starter, tripped: false },
        water: actOnHall2(s.water, { type: 'trip-reset' }),
      };
    case 'desk-p1':
      return { ...s, deskP1: a.run };
    case 'desk-p2':
      return { ...s, deskP2: a.run };
    case 'desk-mv':
      return {
        ...s,
        mvCommand: s.mvCommand === a.command ? 'auto' : a.command,
      };
    case 'mv-override':
      return { ...s, override: a.on };
    case 'replace-actuator':
      return s.actuatorFailed
        ? { ...s, actuatorFailed: false, override: false }
        : s;
    case 'lid':
      return a.open && !strainerIsolated(s) ? s : { ...s, lidOpen: a.open };
    case 'clean-basket':
      return s.lidOpen
        ? { ...s, strainer: 0, strainerRate: STRAINER_RATE.normal }
        : s;
    case 'free-valve':
      return s.stuck
        ? {
            ...s,
            stuck: false,
            water: {
              ...s.water,
              opening: { ...s.water.opening, 'filter.outlet.iso': 1 },
            },
          }
        : s;
    case 'clear-needle':
      return s.needleBlocked
        ? {
            ...s,
            needleBlocked: false,
            chem: {
              ...s.chem,
              cell: { ...s.chem.cell, regulator: NEEDLE_NORMAL },
            },
          }
        : s;
    case 'hx-bypass':
      return { ...s, hxBypass: a.open ? 1 : 0 };
  }
}

/** The drifted probe's errors: AE1 alone (DRIFTED_PROBES' chlorine figures). */
export const DRIFTED_AE1 = {
  freeSensitivity: DRIFTED_PROBES.freeSensitivity,
  freeZeroUa: DRIFTED_PROBES.freeZeroUa,
} as const;

// ---- What the instruments read ---------------------------------------------------

export interface Hall9Readings {
  /** FT1, the circulation after the filter, m³/h; the exchanger's share. */
  flow: number;
  hxFlow: number;
  pi1: number;
  pi2: number;
  pdi1: number;
  /** SG1's dirt, a share of its glass's darkest. */
  sg1: number;
  p1Running: boolean;
  p1Amps: number;
  p2Running: boolean;
  fs1: boolean;
  tc1Calling: boolean;
  mv: number;
  ti: { ti1: number; ti2: number; ti3: number; ti4: number; ti5: number };
  pi3: number;
  gasFlow: number;
  heatKW: number;
  boilerOutput: number;
  lockout: boolean;
  /** DC1's measured free chlorine and pH: the probes', through its calibration. */
  free: number;
  ph: number;
  sampleFlow: number;
  fs2: boolean;
  li1: number;
  li2: number;
  dp1Fault: boolean;
  dp2Fault: boolean;
  dp1Running: boolean;
  dp2Running: boolean;
}

export function hall9Readings(s: Hall9State): Hall9Readings {
  const f = flowsOf(s);
  const h = hall1Readings(heatAsStepped(s, f.toPool));
  const c = hall3Readings(s.chem);
  const running = p1Called(s);
  const ecv = s.heat.opening['gas.ecv'];
  const pi3 =
    ecv >= 0.999 ? h.gasMbar : ecv > 0 ? GAS_MBAR * (0.4 + 0.6 * ecv) : 0;
  return {
    flow: f.toPool,
    hxFlow: f.toPool * hxShare(s),
    pi1: f.gauge['pump.suction.pi'],
    pi2: f.gauge['pump.discharge.pi'] + s.water.surge,
    pdi1: f.gauge['filter.pdi'],
    sg1: s.water.wasteDirt,
    p1Running: running,
    p1Amps: running
      ? P1_FLC * (0.45 + 0.55 * Math.min(1.2, f.circulation / P1_DESIGN))
      : 0,
    p2Running: s.deskP2 && boilerLamps(s.heat.boiler).pump,
    fs1: f.toPool * hxShare(s) > FS_FLOW,
    tc1Calling: s.heat.calling,
    mv: s.heat.mv,
    ti: {
      ti1: h.temps['hxIn.ti'],
      ti2: h.temps['hxOut.ti'],
      ti3: h.temps['boilerFlow.ti'],
      ti4: h.temps['boilerReturn.ti'],
      ti5: h.temps['pool.ti'],
    },
    pi3,
    gasFlow: h.gasFlow,
    heatKW: h.duty,
    boilerOutput: h.output,
    lockout: s.heat.boiler.lockout !== null,
    free: c.free,
    ph: c.ph,
    sampleFlow: c.sampleFlow,
    fs2: c.flowSwitch,
    li1: c.hypoLitres,
    li2: c.acidLitres,
    dp1Fault: s.chem.pumps.hypochlorite.fault !== null,
    dp2Fault: s.chem.pumps.acid.fault !== null,
    dp1Running: s.chem.pumps.hypochlorite.running,
    dp2Running: s.chem.pumps.acid.running,
  };
}

// ---- The annunciator's windows: each lit by an instrument crossing its limit --------

export const ALARMS = [
  'pump-tripped',
  'suction-low',
  'filter-dp-high',
  'low-flow',
  'heating-no-flow',
  'sample-flow-low',
  'boiler-lockout',
  'dosing-pump-fault',
  'day-tank-low',
  'pool-temp-low',
  'pool-temp-high',
  'chlorine-low',
  'chlorine-high',
  'ph-low',
  'ph-high',
] as const;
export type AlarmId = (typeof ALARMS)[number];

/** The board's 24 windows, six columns by four rows: the named ones, then spares. */
export const WINDOWS: readonly string[] = [
  ...ALARMS,
  ...Array.from({ length: 24 - ALARMS.length }, (_, k) => `spare-${k + 1}`),
];

export const ALARM_TEXT: Readonly<Record<string, string>> = {
  'pump-tripped': 'PUMP P1\nTRIPPED',
  'suction-low': 'SUCTION\nLOW',
  'filter-dp-high': 'FILTER DP\nHIGH',
  'low-flow': 'LOW\nFLOW',
  'heating-no-flow': 'HEATING\nNO FLOW',
  'sample-flow-low': 'SAMPLE FLOW\nLOW',
  'boiler-lockout': 'BOILER\nLOCKOUT',
  'dosing-pump-fault': 'DOSING PUMP\nFAULT',
  'day-tank-low': 'DAY TANK\nLOW',
  'pool-temp-low': 'POOL TEMP\nLOW',
  'pool-temp-high': 'POOL TEMP\nHIGH',
  'chlorine-low': 'CHLORINE\nLOW',
  'chlorine-high': 'CHLORINE\nHIGH',
  'ph-low': 'pH\nLOW',
  'ph-high': 'pH\nHIGH',
};

/**
 * The limits (107c's PWTAG figures, indicative bands): free chlorine 0.5
 * to 2.0 mg/l, pH 7.2 to 7.6, the pool 27 to 30 °C (a degree under its 28, indicative); LOW FLOW below 120
 * m³/h; SUCTION LOW below −0.25 bar; FILTER DP HIGH above 0.8 bar (a clean
 * bed's 0.42 and PWTAG's backwash rise); DAY TANK LOW below 6 litres.
 */
export const LIMITS = {
  chlorine: [0.5, 2.0],
  ph: [7.2, 7.6],
  pool: [27, 30],
  lowFlow: 120,
  suction: -0.25,
  filterDp: 0.8,
  dayTank: 6,
} as const;

/** The alarms present now, from the instruments alone, in the windows' order. */
export function hall9Alarms(s: Hall9State, r = hall9Readings(s)): AlarmId[] {
  const on: Record<AlarmId, boolean> = {
    'pump-tripped': s.starter.tripped || s.water.tripped,
    'suction-low': r.pi1 < LIMITS.suction,
    'filter-dp-high': r.pdi1 > LIMITS.filterDp,
    'low-flow': r.flow < LIMITS.lowFlow,
    'heating-no-flow': !r.fs1,
    'sample-flow-low': !r.fs2,
    'boiler-lockout': r.lockout,
    'dosing-pump-fault': r.dp1Fault || r.dp2Fault,
    'day-tank-low': r.li1 < LIMITS.dayTank || r.li2 < LIMITS.dayTank,
    'pool-temp-low': r.ti.ti5 < LIMITS.pool[0],
    'pool-temp-high': r.ti.ti5 > LIMITS.pool[1],
    'chlorine-low': r.free < LIMITS.chlorine[0],
    'chlorine-high': r.free > LIMITS.chlorine[1],
    'ph-low': r.ph < LIMITS.ph[0],
    'ph-high': r.ph > LIMITS.ph[1],
  };
  return ALARMS.filter((id) => on[id]);
}
