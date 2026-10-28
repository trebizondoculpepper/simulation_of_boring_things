import type {
  MimicSpec,
  MimicState,
  Point,
  Reading,
} from '../../components/industrial-control/logic/mimic';
import { flowState } from '../../components/industrial-control/logic/mimic-chaser';
import { boilerLamps } from '../../components/plant/logic/boiler-house';
import { hall1Readings, shortTag } from '../../../game/plant/museum-1-heating';
import type { Hall1State, ValveId } from '../../../game/plant/museum-1-heating';
import { SPEEDS } from './museum-time';
import type { TimeSpeed } from './museum-time';

/**
 * Hall 1's mimic (107a): "The map: how the heat gets from the gas to the
 * pool", a Penfold board. Read left to right as the visitor faces it
 * (rule 5): the gas, the boiler and its flue, the heating circuit through
 * the exchanger, the pool's own loop, the pool. Every line chases its
 * flow; each valve's lens is lit by where it stands; the boiler's FIRING
 * and LOCKOUT, both pumps' RUN, the thermostat's CALL, the flow switch,
 * and the cover's limit switches; a readout at every instrument it
 * repeats, the losses and the cost. Its only buttons are the TIME speeds:
 * the pumps, the boiler's RESET and the cover are worked where they are
 * (local controls). Pure.
 */

const GAS = '#c9a227';
const HOT = '#c0392b';
const WATER = '#2a5f9e';
const FLUE = '#6d7378';

/** The valves whose lenses it shows, where each stands on its line. */
const VALVE_AT: Record<ValveId, Point> = {
  'gas.ecv': [-1.25, -0.3],
  'boiler.gas.iso': [-1.06, -0.3],
  'boiler.flow.iso': [-0.62, -0.25],
  'boiler.return.iso': [-0.75, -0.5],
  'boiler.bypass': [-0.35, -0.3],
  'hx.primary.mv': [-0.19, -0.25],
  'poolPump.suction.iso': [0.88, -0.42],
  'poolPump.discharge.iso': [0.44, -0.42],
};

const line = (
  flow: string,
  points: Point[],
  colour: string,
): MimicSpec['lines'][number] => ({ colour, points, flow: { id: flow } });

/** Each readout and where it sits: process order, left to right; the losses by the pool. */
const READOUTS: readonly { id: string; at: Point; legend: string }[] = [
  {
    id: 'gas.meter',
    at: [-1.45, 0.42],
    legend: `${shortTag('gas.meter')} m³/h`,
  },
  { id: 'cost', at: [-1.2, 0.42], legend: `${shortTag('cost')} p/h` },
  {
    id: 'boilerFlow.ti',
    at: [-0.85, 0.42],
    legend: `${shortTag('boilerFlow.ti')} °C`,
  },
  {
    id: 'boilerReturn.ti',
    at: [-0.6, 0.42],
    legend: `${shortTag('boilerReturn.ti')} °C`,
  },
  {
    id: 'hx.primary.heat',
    at: [-0.25, 0.42],
    legend: `${shortTag('hx.primary.heat')} kW`,
  },
  { id: 'hxIn.ti', at: [0.05, 0.42], legend: `${shortTag('hxIn.ti')} °C` },
  { id: 'hxOut.ti', at: [0.3, 0.42], legend: `${shortTag('hxOut.ti')} °C` },
  {
    id: 'poolDischarge.meter',
    at: [0.6, 0.42],
    legend: `${shortTag('poolDischarge.meter')} m³/h`,
  },
  { id: 'pool.ti', at: [1.35, 0.42], legend: `POOL ${shortTag('pool.ti')} °C` },
  {
    id: 'loss.evaporation',
    at: [0.6, 0.12],
    legend: `${shortTag('loss.evaporation')} EVAP kW`,
  },
  {
    id: 'loss.convection',
    at: [0.85, 0.12],
    legend: `${shortTag('loss.convection')} AIR kW`,
  },
  {
    id: 'loss.ground',
    at: [1.1, 0.12],
    legend: `${shortTag('loss.ground')} GROUND kW`,
  },
  {
    id: 'loss.total',
    at: [1.35, 0.12],
    legend: `${shortTag('loss.total')} LOST kW`,
  },
];

/** The ids of every readout on the board. */
export const MIMIC_READOUTS = READOUTS.map((r) => r.id);

export const HALL1_MIMIC: MimicSpec = {
  title: 'THE MAP: HOW THE HEAT GETS FROM THE GAS TO THE POOL',
  width: 3.6,
  height: 1.6,
  lines: [
    line(
      'gas',
      [
        [-1.4, -0.3],
        [-0.93, -0.3],
      ],
      GAS,
    ),
    line(
      'flue',
      [
        [-0.85, -0.22],
        [-0.85, -0.04],
      ],
      FLUE,
    ),
    line(
      'primaryFlow',
      [
        [-0.77, -0.25],
        [-0.35, -0.25],
      ],
      HOT,
    ),
    line(
      'hxFlow',
      [
        [-0.35, -0.25],
        [-0.08, -0.25],
      ],
      HOT,
    ),
    line(
      'bypass',
      [
        [-0.35, -0.25],
        [-0.35, -0.35],
      ],
      HOT,
    ),
    line(
      'hxReturn',
      [
        [-0.08, -0.35],
        [-0.35, -0.35],
      ],
      HOT,
    ),
    line(
      'primarySuction',
      [
        [-0.35, -0.35],
        [-0.35, -0.5],
        [-0.5, -0.5],
      ],
      HOT,
    ),
    line(
      'primaryReturn',
      [
        [-0.62, -0.5],
        [-0.85, -0.5],
        [-0.85, -0.38],
      ],
      HOT,
    ),
    line(
      'poolOut',
      [
        [1.05, -0.42],
        [0.7, -0.42],
      ],
      WATER,
    ),
    line(
      'poolDischarge',
      [
        [0.6, -0.42],
        [0.25, -0.42],
        [0.25, -0.35],
        [0.08, -0.35],
      ],
      WATER,
    ),
    line(
      'poolReturn',
      [
        [0.08, -0.25],
        [1.05, -0.25],
      ],
      WATER,
    ),
  ],
  shapes: [
    { symbol: 'tank', at: [-1.48, -0.3], size: 0.1, label: 'GAS' },
    {
      symbol: 'boiler',
      at: [-0.85, -0.3],
      size: 0.16,
      label: shortTag('boiler'),
    },
    {
      symbol: 'pump',
      at: [-0.56, -0.5],
      size: 0.1,
      label: shortTag('primaryPump'),
    },
    { symbol: 'hx', at: [0, -0.3], size: 0.16, label: shortTag('hx') },
    {
      symbol: 'pump',
      at: [0.65, -0.42],
      size: 0.1,
      label: shortTag('poolPump'),
    },
    { symbol: 'pool', at: [1.25, -0.33], size: 0.3, label: shortTag('pool') },
    ...(Object.keys(VALVE_AT) as ValveId[]).map((v) => ({
      symbol: 'valve' as const,
      at: VALVE_AT[v],
      size: 0.05,
      indicator: { open: `${v}-open`, shut: `${v}-shut` },
    })),
  ],
  labels: [
    ...(Object.keys(VALVE_AT) as ValveId[]).map((v) => ({
      text: shortTag(v).replace(/^[A-Z]+\d-/, ''),
      at: [VALVE_AT[v][0], VALVE_AT[v][1] + 0.05] as Point,
      size: 0.4,
    })),
    ...READOUTS.map((r) => ({
      text: r.legend,
      at: [r.at[0], r.at[1] + 0.065] as Point,
      size: 0.45,
    })),
    { text: 'FLUE', at: [-0.76, -0.06], size: 0.45 },
    { text: 'WHERE THE HEAT GOES', at: [0.97, 0.27], size: 0.5 },
    { text: 'TIME', at: [-1.1, 0.27], size: 0.5 },
  ],
  lamps: [
    { id: 'firing', at: [-1.05, -0.58], colour: 'amber', label: 'FIRING' },
    { id: 'lockout', at: [-0.85, -0.65], colour: 'red', label: 'LOCKOUT' },
    { id: 'p1-run', at: [-0.56, -0.65], colour: 'green', label: 'P1 RUN' },
    {
      id: 'fs1',
      at: [0.25, -0.58],
      colour: 'green',
      label: shortTag('poolDischarge.fs'),
    },
    { id: 'p2-run', at: [0.65, -0.58], colour: 'green', label: 'P2 RUN' },
    {
      id: 'call',
      at: [0.95, -0.65],
      colour: 'amber',
      label: `${shortTag('poolOut.tc')} CALL`,
    },
    { id: 'cover-open', at: [1.2, -0.65], colour: 'white', label: 'COVER OFF' },
    { id: 'cover-shut', at: [1.42, -0.65], colour: 'white', label: 'COVER ON' },
    ...SPEEDS.map((s, k) => ({
      id: `speed-${s}`,
      at: [-1.45 + k * 0.17, 0.2] as Point,
      colour: 'white' as const,
      label: `×${s}`,
    })),
  ],
  readouts: READOUTS.map(({ id, at }) => ({ id, at })),
  buttons: SPEEDS.map((s, k) => ({
    id: `speed/${s}`,
    at: [-1.45 + k * 0.17, 0.08] as Point,
    colour: 'white' as const,
    legend: `×${s}`,
  })),
  modes: [{ id: 'live', legend: 'READINGS' }],
};

/** The speed a press on the board asks for, if any. */
export function mimicSpeed(id: string): TimeSpeed | null {
  const [what, arg] = id.split('/');
  if (what !== 'speed') return null;
  return SPEEDS.find((x) => x === Number(arg)) ?? null;
}

const reading = (
  value: number,
  unit: string,
  name: string,
  places = 1,
): Reading => ({
  value,
  unit,
  name,
  places,
});

/** Each readout's reading, as the instrument it repeats shows it. */
export function hall1Reading(id: string, s: Hall1State): Reading | undefined {
  const r = hall1Readings(s);
  const name = shortTag(id);
  if (id in r.temps) return reading(r.temps[id], 'C', name);
  switch (id) {
    case 'gas.meter':
      return reading(r.gasFlow, 'm3/h', name);
    case 'cost':
      return reading(r.pencePerHour, 'p/h', name, 0);
    case 'hx.primary.heat':
      return reading(Math.max(0, r.duty), 'kW', name, 0);
    case 'poolDischarge.meter':
      return reading(r.flow, 'm3/h', name, 0);
    case 'loss.evaporation':
      return reading(r.losses.evaporation, 'kW', name);
    case 'loss.convection':
      return reading(r.losses.convection, 'kW', name);
    case 'loss.ground':
      return reading(r.losses.ground, 'kW', name);
    case 'loss.total':
      return reading(r.losses.total, 'kW', name);
  }
  return undefined;
}

/** The board's lamps, readouts and chasers, from the hall's state and its clock's speed. */
export function hall1MimicState(s: Hall1State, speed: TimeSpeed): MimicState {
  const r = hall1Readings(s);
  const lamps = boilerLamps(s.boiler);
  const readouts: Record<string, Record<string, Reading>> = {};
  for (const { id } of READOUTS) {
    const value = hall1Reading(id, s);
    if (value) readouts[id] = { live: value };
  }
  const opening = (v: ValveId) => (v === 'hx.primary.mv' ? s.mv : s.opening[v]);
  const bypassOpen = r.bypassFlow > 0 ? 1 : 0;
  return {
    lamps: {
      ...Object.fromEntries(
        (Object.keys(VALVE_AT) as ValveId[]).flatMap((v) => {
          const o = v === 'boiler.bypass' ? bypassOpen : opening(v);
          return [
            [`${v}-open`, o >= 0.98],
            [`${v}-shut`, o <= 0.02],
          ];
        }),
      ),
      firing: lamps.burner,
      lockout: lamps.lockout,
      'p1-run': r.primaryFlow > 0,
      'p2-run': s.poolPump && !s.tripped,
      fs1: r.flowSwitch,
      call: s.calling,
      'cover-open': s.cover <= 0,
      'cover-shut': s.cover >= 1,
      ...Object.fromEntries(SPEEDS.map((x) => [`speed-${x}`, speed === x])),
    },
    readouts,
    flows: {
      gas: flowState(r.gasFlow * 10),
      flue: flowState(r.output > 0 ? 100 : 0),
      primaryFlow: flowState(r.primaryFlow * 10),
      hxFlow: flowState(r.hxFlow * 10),
      bypass: flowState(r.bypassFlow * 10),
      hxReturn: flowState(r.hxFlow * 10),
      primarySuction: flowState(r.primaryFlow * 10),
      primaryReturn: flowState(r.primaryFlow * 10),
      poolOut: flowState(r.flow),
      poolDischarge: flowState(r.flow),
      poolReturn: flowState(r.flow),
    },
  };
}
