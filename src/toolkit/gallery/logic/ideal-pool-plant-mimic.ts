import type {
  MimicSpec,
  MimicState,
  Point,
  Reading,
} from '../../components/industrial-control/logic/mimic';
import { flowState } from '../../components/industrial-control/logic/mimic-chaser';
import {
  INSTRUMENTS,
  INTERLOCK_VALVE,
  SPEEDS,
  TAGS,
  VALVES,
  gaugeReading,
  plantReadings,
  shortTag,
} from '../../../game/plant/ideal-pool-plant';
import type {
  IdealPlantAction,
  IdealPlantState,
  PlantFlows,
  ValveId,
} from '../../../game/plant/ideal-pool-plant';

/**
 * The ideal pool plant's mimic (dev51, mission 106): the whole circuit as
 * a Penfold board, the map of the exhibit. Every pipe chases its flow;
 * every valve's lens is lit by where its lever stands (green open, red
 * shut, amber throttled between); the pump's RUN lamp and its START and
 * STOP; the heating's lamp, lit while hot water flows; and a readout at
 * every instrument of the room, each showing what that instrument reads
 * (the same reading, from the same model, as its gauge or display). Its
 * TIME buttons run the plant's slow heat faster. Pure.
 */

const WATER = '#2a5f9e';
const HOT = '#c0392b';
const WASTE = '#7a5a2a';

/** Where each valve stands on its line, and its legend. */
const VALVE_AT: Partial<Record<ValveId, Point>> = {
  'pump.suction.iso': [-1.02, -0.3],
  'pump.discharge.iso': [-0.75, -0.02],
  'filter.inlet.iso': [-0.52, 0.12],
  'filter.outlet.iso': [-0.05, -0.42],
  'filter.backwash-in.iso': [-0.62, -0.1],
  'filter.backwash-out.iso': [-0.18, 0.2],
  'filter.rinse.iso': [0.08, -0.15],
  'bypass.valve': [0.2, -0.1],
  'hx.secondary-in.iso': [0.5, -0.42],
  'hx.secondary-out.iso': [0.85, -0.05],
  'heat.out-1.valve': [1.22, -0.42],
  'hx.primary-in.iso': [1.0, -0.42],
  'hx.primary-out.iso': [1.03, -0.62],
};

const line = (
  flow: string,
  points: Point[],
  colour = WATER,
): MimicSpec['lines'][number] => ({ colour, points, flow: { id: flow } });

/** Each readout: where it sits, and the instrument or meter it repeats. */
const READOUTS: readonly { id: string; at: Point }[] = [
  { id: 'suction.ti', at: [-1.05, -0.62] },
  { id: 'pump.suction.pi', at: [-0.82, -0.62] },
  { id: 'pump.discharge.pi', at: [-0.93, 0.02] },
  { id: 'filter.inlet.pi', at: [-0.52, 0.3] },
  { id: 'filter.outlet.pi', at: [-0.52, -0.25] },
  { id: 'filter.pdi', at: [-0.52, -0.6] },
  { id: 'filter.outlet.meter', at: [-0.25, -0.62] },
  { id: 'bypass.meter', at: [0.36, 0.0] },
  { id: 'backwashOut.sg', at: [-0.45, 0.62] },
  { id: 'hx.secondary.meter', at: [0.4, -0.6] },
  { id: 'hxOut.ti', at: [0.62, 0.05] },
  { id: 'returnMain.ti', at: [0.0, 0.62] },
  { id: 'heat.out-1.meter', at: [1.3, -0.12] },
  { id: 'primaryFlow.ti', at: [1.3, 0.12] },
  { id: 'primaryReturn.ti', at: [0.82, -0.62] },
  { id: 'duty', at: [1.12, 0.3] },
  { id: 'pool', at: [-1.3, 0.62] },
];

/** What each readout repeats, as printed over it: its tag and unit. */
const READOUT_LEGEND: Record<string, string> = Object.fromEntries(
  READOUTS.map(({ id }) => [
    id,
    id === 'duty'
      ? 'HEAT kW'
      : id === 'pool'
        ? 'POOL °C'
        : `${shortTag(id)} ${
            id.endsWith('.meter')
              ? 'm³/h'
              : id.endsWith('.ti')
                ? '°C'
                : id.endsWith('.sg')
                  ? 'SIGHT g/m³'
                  : 'bar'
          }`,
  ]),
);

export const IDEAL_PLANT_MIMIC: MimicSpec = {
  title: 'THE IDEAL POOL PLANT',
  width: 3.2,
  height: 1.6,
  lines: [
    line('overflow', [
      [-1.3, 0.16],
      [-1.3, -0.22],
    ]),
    line('suction', [
      [-1.2, -0.3],
      [-0.82, -0.3],
    ]),
    line('discharge', [
      [-0.75, -0.24],
      [-0.75, 0.12],
      [-0.62, 0.12],
    ]),
    line('toInlet', [
      [-0.62, 0.12],
      [-0.25, 0.12],
      [-0.25, 0.06],
    ]),
    line('toUnderdrain', [
      [-0.62, 0.12],
      [-0.62, -0.3],
      [-0.32, -0.3],
      [-0.32, -0.23],
    ]),
    line(
      'backwashOut',
      [
        [-0.18, 0.04],
        [-0.18, 0.3],
        [-0.1, 0.3],
      ],
      WASTE,
    ),
    line(
      'rinse',
      [
        [-0.12, -0.24],
        [-0.12, -0.32],
        [0.08, -0.32],
        [0.08, 0.3],
        [0.0, 0.3],
      ],
      WASTE,
    ),
    line('filtered', [
      [-0.25, -0.26],
      [-0.25, -0.42],
      [0.2, -0.42],
    ]),
    line('bypass', [
      [0.2, -0.42],
      [0.2, 0.22],
    ]),
    line('hxIn', [
      [0.2, -0.42],
      [0.77, -0.42],
    ]),
    line('hxOut', [
      [0.85, -0.34],
      [0.85, 0.22],
      [0.2, 0.22],
    ]),
    line('returnMain', [
      [0.2, 0.22],
      [0.2, 0.48],
      [-1.3, 0.48],
      [-1.3, 0.44],
    ]),
    line(
      'primaryFlow',
      [
        [1.3, -0.42],
        [0.93, -0.42],
      ],
      HOT,
    ),
    line(
      'primaryReturn',
      [
        [0.85, -0.5],
        [0.85, -0.62],
        [1.3, -0.62],
      ],
      HOT,
    ),
  ],
  shapes: [
    {
      symbol: 'pool',
      at: [-1.3, 0.3],
      size: 0.28,
      label: `IDEAL POOL ${shortTag('pool')}`,
    },
    {
      symbol: 'tank',
      at: [-1.3, -0.3],
      size: 0.16,
      label: `BALANCE TANK ${shortTag('tank')}`,
    },
    {
      symbol: 'pump',
      at: [-0.75, -0.3],
      size: 0.13,
      label: `PUMP ${shortTag('pump')}`,
    },
    {
      symbol: 'filter',
      at: [-0.25, -0.1],
      size: 0.3,
      label: `SAND FILTER ${shortTag('filter')}`,
    },
    {
      symbol: 'hx',
      at: [0.85, -0.42],
      size: 0.16,
      label: `HEAT EXCH ${shortTag('hx')}`,
    },
    { symbol: 'boiler', at: [1.38, -0.42], size: 0.1, label: 'HOT WATER IN' },
    { symbol: 'tank', at: [1.38, -0.62], size: 0.07, label: 'HOT WATER OUT' },
    { symbol: 'tank', at: [-0.05, 0.3], size: 0.07, label: 'WASTE' },
    // The heating's interlock: a motorised valve, its lens lit by where it stands.
    {
      symbol: 'valve' as const,
      at: [1.11, -0.42] as Point,
      size: 0.05,
      indicator: { open: 'mv-open', shut: 'mv-shut' },
    },
    ...VALVES.map((v) => ({
      symbol: 'valve' as const,
      at: VALVE_AT[v]!,
      size: 0.05,
      indicator: { open: `${v}-open`, shut: `${v}-shut` },
    })),
  ],
  labels: [
    ...VALVES.map((v) => ({
      text: shortTag(v),
      at: [VALVE_AT[v]![0], VALVE_AT[v]![1] + 0.045] as Point,
      size: 0.5,
    })),
    // Each readout's instrument, printed above it, large enough to read across the room.
    ...READOUTS.map((r) => ({
      text: READOUT_LEGEND[r.id] ?? r.id,
      at: [r.at[0], r.at[1] + 0.065] as Point,
      size: 0.62,
    })),
    { text: 'BYPASS', at: [0.29, 0.14], size: 0.55 },
    { text: 'RETURN TO POOL', at: [-0.55, 0.53], size: 0.6 },
    { text: 'OVERFLOW', at: [-1.18, -0.12], size: 0.5 },
    { text: 'TIME', at: [0.47, 0.64], size: 0.7 },
    {
      text: `${shortTag(INTERLOCK_VALVE)} AUTO`,
      at: [1.11, -0.48],
      size: 0.45,
    },
  ],
  lamps: [
    { id: 'pump-run', at: [-0.62, -0.32], colour: 'green', label: 'RUN' },
    {
      id: 'bed-lifted',
      at: [-0.1, -0.02],
      colour: 'amber',
      label: 'BED LIFTED',
    },
    { id: 'pump-tripped', at: [-0.52, -0.32], colour: 'red', label: 'TRIPPED' },
    { id: 'heating', at: [1.17, -0.27], colour: 'amber', label: 'HEATING' },
    ...SPEEDS.map((s, k) => ({
      id: `speed-${s}`,
      at: [0.62 + k * 0.19, 0.69] as Point,
      colour: 'white' as const,
      label: `×${s}`,
    })),
  ],
  readouts: READOUTS,
  buttons: [
    { id: 'pump/start', at: [-0.62, -0.42], colour: 'green', legend: 'START' },
    { id: 'pump/stop', at: [-0.52, -0.42], colour: 'red', legend: 'STOP' },
    ...SPEEDS.map((s, k) => ({
      id: `speed/${s}`,
      at: [0.62 + k * 0.19, 0.6] as Point,
      colour: 'white' as const,
      legend: `TIME ×${s}`,
    })),
  ],
  modes: [{ id: 'live', legend: 'READINGS' }],
};

/** What a press on the board asks of the plant, if anything. */
export function mimicAction(id: string): IdealPlantAction | null {
  if (id === 'pump/start') return { type: 'pump', run: true };
  if (id === 'pump/stop') return { type: 'pump', run: false };
  const [what, arg] = id.split('/');
  if (what === 'speed') {
    const speed = Number(arg);
    const s = SPEEDS.find((x) => x === speed);
    return s ? { type: 'speed', speed: s } : null;
  }
  return null;
}

const reading = (
  value: number,
  unit: string,
  name: string,
  places = 1,
): Reading => ({ value, unit, name, places });

/** Each instrument's reading, as the instrument itself shows it: from the model's flows and thermometers. */
export function instrumentReading(
  id: string,
  s: IdealPlantState,
  f: PlantFlows,
): Reading | undefined {
  const name = TAGS[id] ? shortTag(id) : id;
  if (id in f.meter)
    return reading(f.meter[id as keyof typeof f.meter], 'm3/h', name);
  if (id in f.gauge) return reading(gaugeReading(s, f, id), 'bar', name, 2);
  // The sight glass: how much dirt the waste water carries, as it looks.
  if (id === 'backwashOut.sg') return reading(s.wasteDirt, 'g/m3', name, 0);
  if (id in s.thermometer) return reading(s.thermometer[id], 'C', name);
  return undefined;
}

/** The board's lamps, readouts and chasers, from the plant alone. */
export function idealPlantMimicState(
  s: IdealPlantState,
  f: PlantFlows,
): MimicState {
  const r = plantReadings(s, f);
  const readouts: Record<string, Record<string, Reading>> = {};
  for (const { id } of READOUTS) {
    const value =
      id === 'duty'
        ? reading(r.duty, 'kW', 'HEAT', 0)
        : id === 'pool'
          ? reading(s.poolC, 'C', 'POOL', 1)
          : instrumentReading(id, s, f);
    if (value) readouts[id] = { live: value };
  }
  return {
    lamps: {
      ...Object.fromEntries(
        VALVES.flatMap((v) => [
          [`${v}-open`, s.opening[v] >= 0.98],
          [`${v}-shut`, s.opening[v] <= 0.02],
        ]),
      ),
      'pump-run': s.pumpRunning,
      'pump-tripped': s.tripped,
      'bed-lifted': f.lifted,
      'mv-open': s.interlock >= 0.98,
      'mv-shut': s.interlock <= 0.02,
      heating: f.primary > 0,
      ...Object.fromEntries(SPEEDS.map((x) => [`speed-${x}`, s.speed === x])),
    },
    readouts,
    flows: {
      overflow: flowState(f.circulation),
      suction: flowState(f.circulation),
      discharge: flowState(f.circulation),
      toInlet: flowState(f.feedTop),
      toUnderdrain: flowState(f.feedBottom),
      backwashOut: flowState(f.backwash),
      rinse: flowState(f.rinse),
      filtered: flowState(f.toPool),
      bypass: flowState(f.bypass),
      hxIn: flowState(f.hxSecondary),
      hxOut: flowState(f.hxSecondary),
      returnMain: flowState(f.toPool),
      primaryFlow: flowState(f.primary * 10),
      primaryReturn: flowState(f.primary * 10),
    },
  };
}

/** The instruments the board repeats: every one in the room. */
export const REPEATED = INSTRUMENTS.map((i) => i.id);
