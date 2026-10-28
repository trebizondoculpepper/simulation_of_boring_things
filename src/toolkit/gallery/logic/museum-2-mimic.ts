import type {
  MimicSpec,
  MimicState,
  Point,
  Reading,
} from '../../components/industrial-control/logic/mimic';
import { flowState } from '../../components/industrial-control/logic/mimic-chaser';
import {
  OZONE,
  PLANT,
  SPEEDS,
  gaugeReading,
  hall2Readings,
  shortTag,
} from '../../../game/plant/museum-2-clean-water';
import type {
  Hall2State,
  TimeSpeed,
  ValveId,
} from '../../../game/plant/museum-2-clean-water';

/**
 * Hall 2's mimic (107b): "The map: how the water is cleaned", a Penfold
 * board. Read left to right as the visitor faces it, as the plant stands:
 * the mains make-up and the balance tank, the pump, the sand filter and its
 * backwash to the drain, the ozone (its booster's side stream and the
 * generator's gas), the contact tank, the carbon, the UV unit, the pool,
 * and the overflow back along the foot. Every line chases its flow; each
 * valve's lens is lit by where it stands; the lamps show the pump's RUN,
 * TRIP and LOW LEVEL, BED LIFTED, the booster, the generator's RUN and
 * ALARM, the ozone-in-air alarm and the UV lamp; a readout repeats each
 * instrument. No energy and no chlorine (one concept per hall). Its only
 * buttons are the TIME speeds: everything else is worked where it is.
 * Pure.
 */

const WATER = '#2a5f9e';
const WASTE = '#7a5a2e';
const GAS = '#8e44ad';
const MAINS = '#4a90c2';

const MAIN_Y = -0.2;
const SIDE_Y = -0.36;

/** Each machine's place on the board, left to right. */
const AT = {
  tank: [-1.5, MAIN_Y],
  pump: [-1.18, MAIN_Y],
  filter: [-0.8, MAIN_Y],
  drain: [-0.8, -0.58],
  booster: [-0.38, SIDE_Y],
  generator: [-0.38, 0.0],
  contact: [0.0, MAIN_Y],
  carbon: [0.42, MAIN_Y],
  uv: [0.82, MAIN_Y],
  pool: [1.32, MAIN_Y],
} as const satisfies Record<string, Point>;

/** The valves whose lenses it shows, where each stands on its line. */
const VALVE_AT: Partial<Record<ValveId, Point>> = {
  'tank.makeup.iso': [-1.6, 0.0],
  'pump.suction.iso': [-1.33, MAIN_Y],
  'pump.discharge.iso': [-1.04, MAIN_Y],
  'filter.inlet.iso': [-0.93, MAIN_Y],
  'filter.outlet.iso': [-0.62, MAIN_Y],
  'filter.backwash-in.iso': [-0.93, -0.42],
  'filter.backwash-out.iso': [-0.66, -0.42],
  'filter.rinse.iso': [-0.66, -0.5],
  'booster.suction.iso': [-0.5, SIDE_Y],
  'booster.discharge.iso': [-0.26, SIDE_Y],
};

const line = (
  flow: string,
  points: Point[],
  colour: string,
): MimicSpec['lines'][number] => ({ colour, points, flow: { id: flow } });

/** Each readout and where it sits: in the process's order, left to right. */
const READOUTS: readonly { id: string; at: Point; legend: string }[] = [
  ['tank.li', 'm3'],
  ['pump.suction.pi', 'bar'],
  ['pump.discharge.pi', 'bar'],
  ['filter.pdi', 'bar'],
  ['backwashOut.sg', 'g/m3'],
  ['generator', 'g/h'],
  ['toCarbon.ai', 'mg/l'],
  ['toUv.ai', 'mg/l'],
  ['uv.ri', 'W/m2'],
  ['returnMain.meter', 'm3/h'],
  ['pool.ti', 'C'],
].map(([id, unit], k) => ({
  id,
  at: [-1.4 + k * 0.28, 0.42] as Point,
  legend: `${shortTag(id)} ${unit}`,
}));

/** The ids of every readout on the board. */
export const MIMIC_READOUTS = READOUTS.map((r) => r.id);

export const HALL2_MIMIC: MimicSpec = {
  title: 'THE MAP: HOW THE WATER IS CLEANED',
  width: 3.6,
  height: 1.6,
  lines: [
    line(
      'makeup',
      [
        [-1.7, 0.0],
        [-1.5, 0.0],
        [-1.5, -0.12],
      ],
      MAINS,
    ),
    line(
      'suction',
      [
        [-1.43, MAIN_Y],
        [-1.23, MAIN_Y],
      ],
      WATER,
    ),
    line(
      'discharge',
      [
        [-1.13, MAIN_Y],
        [-0.88, MAIN_Y],
      ],
      WATER,
    ),
    line(
      'toUnderdrain',
      [
        [-1.0, MAIN_Y],
        [-1.0, -0.42],
        [-0.85, -0.42],
      ],
      WATER,
    ),
    line(
      'backwashOut',
      [
        [-0.75, -0.42],
        [-0.6, -0.42],
        [-0.6, -0.55],
        [-0.76, -0.55],
      ],
      WASTE,
    ),
    line(
      'filtered',
      [
        [-0.72, MAIN_Y],
        [-0.08, MAIN_Y],
      ],
      WATER,
    ),
    line(
      'side',
      [
        [-0.56, MAIN_Y],
        [-0.56, SIDE_Y],
        [-0.2, SIDE_Y],
        [-0.2, MAIN_Y],
      ],
      WATER,
    ),
    line(
      'ozoneGas',
      [
        [-0.38, -0.06],
        [-0.38, SIDE_Y + 0.05],
      ],
      GAS,
    ),
    line(
      'toCarbon',
      [
        [0.08, MAIN_Y],
        [0.34, MAIN_Y],
      ],
      WATER,
    ),
    line(
      'toUv',
      [
        [0.5, MAIN_Y],
        [0.76, MAIN_Y],
      ],
      WATER,
    ),
    line(
      'returnMain',
      [
        [0.88, MAIN_Y],
        [1.17, MAIN_Y],
      ],
      WATER,
    ),
    line(
      'overflow',
      [
        [1.32, -0.33],
        [1.32, -0.7],
        [-1.5, -0.7],
        [-1.5, -0.27],
      ],
      WATER,
    ),
  ],
  shapes: [
    { symbol: 'tank', at: AT.tank, size: 0.12, label: shortTag('tank') },
    { symbol: 'pump', at: AT.pump, size: 0.09, label: shortTag('pump') },
    { symbol: 'filter', at: AT.filter, size: 0.16, label: shortTag('filter') },
    { symbol: 'pump', at: AT.booster, size: 0.07, label: shortTag('booster') },
    {
      symbol: 'cylinder',
      at: AT.generator,
      size: 0.09,
      label: shortTag('generator'),
    },
    { symbol: 'tank', at: AT.contact, size: 0.14, label: shortTag('contact') },
    { symbol: 'filter', at: AT.carbon, size: 0.14, label: shortTag('carbon') },
    { symbol: 'uv', at: AT.uv, size: 0.1, label: shortTag('uv') },
    { symbol: 'pool', at: AT.pool, size: 0.26, label: shortTag('pool') },
    ...(Object.keys(VALVE_AT) as ValveId[]).map((v) => ({
      symbol: 'valve' as const,
      at: VALVE_AT[v]!,
      size: 0.04,
      indicator: { open: `${v}-open`, shut: `${v}-shut` },
    })),
  ],
  labels: [
    ...READOUTS.map((r) => ({
      text: r.legend,
      at: [r.at[0], r.at[1] + 0.065] as Point,
      size: 0.45,
    })),
    { text: 'MAINS', at: [-1.68, 0.05], size: 0.4 },
    { text: 'TO DRAIN', at: [-0.68, -0.62], size: 0.4 },
    { text: 'OVERFLOW', at: [0.0, -0.74], size: 0.4 },
    { text: 'TIME', at: [-1.1, 0.27], size: 0.5 },
  ],
  lamps: [
    { id: 'p1-run', at: [-1.2, -0.48], colour: 'green', label: 'P1 RUN' },
    { id: 'p1-trip', at: [-1.2, -0.58], colour: 'red', label: 'P1 TRIP' },
    { id: 'bt1-low', at: [-1.45, -0.48], colour: 'amber', label: 'LOW LEVEL' },
    {
      id: 'bed-lifted',
      at: [-0.95, -0.6],
      colour: 'amber',
      label: 'BED LIFTED',
    },
    { id: 'p2-run', at: [-0.38, -0.5], colour: 'green', label: 'P2 RUN' },
    { id: 'oz1-run', at: [-0.2, 0.06], colour: 'green', label: 'OZ1 RUN' },
    { id: 'oz1-alarm', at: [-0.2, -0.04], colour: 'red', label: 'OZ1 ALARM' },
    {
      id: 'ozone-in-air',
      at: [0.15, 0.06],
      colour: 'red',
      label: 'OZONE IN AIR',
    },
    { id: 'uv1-lamp', at: [0.82, -0.4], colour: 'white', label: 'UV1 LAMP' },
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
export function hall2Reading(id: string, s: Hall2State): Reading | undefined {
  const r = hall2Readings(s);
  const name = shortTag(id);
  switch (id) {
    case 'tank.li':
      return reading(s.tankWater, 'm3', name);
    case 'pump.suction.pi':
    case 'pump.discharge.pi':
      return reading(gaugeReading(s, r.flows, id), 'bar', name, 2);
    case 'filter.pdi':
      return reading(r.flows.gauge[id], 'bar', name, 2);
    case 'backwashOut.sg':
      return reading(s.wasteDirt, 'g/m3', name, 0);
    case 'generator':
      return reading(r.ozone.ozone, 'g/h', name, 0);
    case 'toCarbon.ai':
      return reading(r.ozone.contactResidual, 'mg/l', name, 2);
    case 'toUv.ai':
      return reading(r.ozone.carbonResidual, 'mg/l', name, 2);
    case 'uv.ri':
      return reading(r.uvIntensity, 'W/m2', name, 0);
    case 'returnMain.meter':
      return reading(r.flows.toPool, 'm3/h', name, 0);
    case 'pool.ti':
      return reading(PLANT.poolC, 'C', name);
  }
  return undefined;
}

/** The board's lamps, readouts and chasers, from the hall's state. */
export function hall2MimicState(s: Hall2State): MimicState {
  const r = hall2Readings(s);
  const f = r.flows;
  const readouts: Record<string, Record<string, Reading>> = {};
  for (const { id } of READOUTS) {
    const value = hall2Reading(id, s);
    if (value) readouts[id] = { live: value };
  }
  return {
    lamps: {
      ...Object.fromEntries(
        (Object.keys(VALVE_AT) as ValveId[]).flatMap((v) => [
          [`${v}-open`, s.opening[v] >= 0.98],
          [`${v}-shut`, s.opening[v] <= 0.02],
        ]),
      ),
      'p1-run': s.pumpRunning,
      'p1-trip': s.tripped,
      'bt1-low': s.lowLevel || s.tankWater <= PLANT.tankLow,
      'bed-lifted': f.lifted,
      'p2-run': r.ozone.sideFlow > 0,
      'oz1-run': r.ozone.running,
      'oz1-alarm': r.ozone.alarm,
      'ozone-in-air': r.ozone.roomPpm >= OZONE.monitor.warning,
      'uv1-lamp': r.uvLit,
      ...Object.fromEntries(SPEEDS.map((x) => [`speed-${x}`, s.speed === x])),
    },
    readouts,
    flows: {
      makeup: flowState(r.makeup * 5),
      suction: flowState(f.circulation),
      discharge: flowState(f.circulation),
      toUnderdrain: flowState(f.feedBottom),
      backwashOut: flowState(f.backwash + f.rinse),
      filtered: flowState(f.toPool),
      side: flowState(r.ozone.sideFlow * 10),
      ozoneGas: flowState(r.ozone.ozone),
      toCarbon: flowState(f.toPool),
      toUv: flowState(f.toPool),
      returnMain: flowState(f.toPool),
      overflow: flowState(f.toPool),
    },
  };
}
