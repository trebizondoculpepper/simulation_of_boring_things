import type {
  MimicSpec,
  MimicState,
  Point,
  Reading,
} from '../../components/industrial-control/logic/mimic';
import { flowState } from '../../components/industrial-control/logic/mimic-chaser';
import {
  bathersNow,
  hall3Readings,
  shortTag,
} from '../../../game/plant/museum-3-dosing';
import type { Hall3State } from '../../../game/plant/museum-3-dosing';
import { SPEEDS } from './museum-time';
import type { TimeSpeed } from './museum-time';

/**
 * Hall 3's mimic (107c): "The map: how the plant looks after the water by
 * itself", a Penfold board. Left to right as the visitor faces it (rule
 * 5): the hypochlorite's store, day tank and pump above, the acid's below,
 * their dose lines to the injection points on the return; the balance
 * tank, the pump, the flowmeter, the sample tapping and its line down to
 * the sample cell and the drain; the pool on the right. Every line chases
 * its flow; each pump's STROKE lamp blinks with its strokes and its FAULT
 * lamp; the sample's flow switch; the day tanks' levels, DC1's measured
 * chlorine and pH and its outputs, the swimmers in the water. Its only
 * buttons are the TIME speeds. Shows only what the plant's own
 * instruments show. Pure.
 */

const HYPO = '#c9a227';
const ACID = '#b0392b';
const WATER = '#2a5f9e';
const SAMPLE = '#3e8f6a';

const line = (
  flow: string,
  points: Point[],
  colour: string,
): MimicSpec['lines'][number] => ({ colour, points, flow: { id: flow } });

/** Each readout and where it sits. */
const READOUTS: readonly { id: string; at: Point; legend: string }[] = [
  {
    id: 'hypoTank.li',
    at: [-1.2, 0.5],
    legend: `${shortTag('hypoTank.li')} l`,
  },
  {
    id: 'acidTank.li',
    at: [-1.2, -0.62],
    legend: `${shortTag('acidTank.li')} l`,
  },
  { id: 'dc.cl', at: [-0.05, -0.45], legend: 'DC1 Cl mg/l' },
  { id: 'dc.ph', at: [0.2, -0.45], legend: 'DC1 pH' },
  { id: 'dc.hypo', at: [-0.05, -0.62], legend: 'Cl OUT %' },
  { id: 'dc.acid', at: [0.2, -0.62], legend: 'pH OUT %' },
  {
    id: 'flow',
    at: [0.62, 0.42],
    legend: `${shortTag('discharge.meter')} m³/h`,
  },
  { id: 'swimmers', at: [1.45, 0.42], legend: 'SWIMMERS IN' },
];

export const MIMIC_READOUTS = READOUTS.map((r) => r.id);

/** The circulation's line, left to right along y = 0.1: tank, pump, meter, tee, injections, pool. */
const Y = 0.1;

export const HALL3_MIMIC: MimicSpec = {
  title: 'THE MAP: HOW THE PLANT LOOKS AFTER THE WATER BY ITSELF',
  width: 3.6,
  height: 1.6,
  lines: [
    line(
      'hypoFill',
      [
        [-1.55, 0.3],
        [-1.3, 0.3],
      ],
      HYPO,
    ),
    line(
      'hypoSuction',
      [
        [-1.1, 0.3],
        [-0.85, 0.3],
      ],
      HYPO,
    ),
    line(
      'hypoDose',
      [
        [-0.7, 0.3],
        [0.95, 0.3],
        [0.95, Y + 0.03],
      ],
      HYPO,
    ),
    line(
      'acidFill',
      [
        [-1.55, -0.3],
        [-1.3, -0.3],
      ],
      ACID,
    ),
    line(
      'acidSuction',
      [
        [-1.1, -0.3],
        [-0.85, -0.3],
      ],
      ACID,
    ),
    line(
      'acidDose',
      [
        [-0.7, -0.3],
        [-0.6, -0.3],
        [-0.6, -0.15],
        [1.15, -0.15],
        [1.15, Y - 0.03],
      ],
      ACID,
    ),
    line(
      'suction',
      [
        [0.0, Y],
        [0.25, Y],
      ],
      WATER,
    ),
    line(
      'discharge',
      [
        [0.4, Y],
        [0.75, Y],
      ],
      WATER,
    ),
    line(
      'returnA',
      [
        [0.75, Y],
        [0.95, Y],
      ],
      WATER,
    ),
    line(
      'returnB',
      [
        [0.95, Y],
        [1.15, Y],
      ],
      WATER,
    ),
    line(
      'returnC',
      [
        [1.15, Y],
        [1.35, Y],
      ],
      WATER,
    ),
    line(
      'overflow',
      [
        [1.4, 0.3],
        [1.4, 0.35],
        [-0.15, 0.35],
        [-0.15, Y + 0.08],
      ],
      WATER,
    ),
    line(
      'sample',
      [
        [0.75, Y],
        [0.75, -0.05],
        [0.5, -0.05],
        [0.5, -0.2],
      ],
      SAMPLE,
    ),
    line(
      'sampleDrain',
      [
        [0.5, -0.32],
        [0.5, -0.38],
        [0.65, -0.38],
      ],
      SAMPLE,
    ),
  ],
  shapes: [
    {
      symbol: 'tank',
      at: [-1.62, 0.3],
      size: 0.1,
      label: shortTag('hypoStore'),
    },
    {
      symbol: 'tank',
      at: [-1.2, 0.3],
      size: 0.12,
      label: shortTag('hypoTank'),
    },
    {
      symbol: 'pump',
      at: [-0.78, 0.3],
      size: 0.09,
      label: shortTag('hypoPump'),
    },
    {
      symbol: 'tank',
      at: [-1.62, -0.3],
      size: 0.1,
      label: shortTag('acidStore'),
    },
    {
      symbol: 'tank',
      at: [-1.2, -0.3],
      size: 0.12,
      label: shortTag('acidTank'),
    },
    {
      symbol: 'pump',
      at: [-0.78, -0.3],
      size: 0.09,
      label: shortTag('acidPump'),
    },
    {
      symbol: 'tank',
      at: [-0.08, Y],
      size: 0.14,
      label: shortTag('balanceTank'),
    },
    { symbol: 'pump', at: [0.33, Y], size: 0.1, label: shortTag('poolPump') },
    {
      symbol: 'filter',
      at: [0.5, -0.26],
      size: 0.08,
      label: shortTag('sampleCell'),
    },
    { symbol: 'pool', at: [1.5, 0.18], size: 0.3, label: shortTag('pool') },
    {
      symbol: 'valve',
      at: [0.6, -0.05],
      size: 0.045,
      indicator: { open: 'sample.iso-open', shut: 'sample.iso-shut' },
    },
  ],
  labels: [
    ...READOUTS.map((r) => ({
      text: r.legend,
      at: [r.at[0], r.at[1] + 0.065] as Point,
      size: 0.45,
    })),
    { text: 'HYPOCHLORITE', at: [-1.45, 0.62], size: 0.45 },
    { text: 'ACID', at: [-1.62, -0.45], size: 0.45 },
    { text: 'DC1 CONTROLLER', at: [0.08, -0.3], size: 0.45 },
    { text: 'TIME', at: [-0.55, 0.5], size: 0.5 },
  ],
  lamps: [
    {
      id: 'dp1-stroke',
      at: [-0.85, 0.42],
      colour: 'green',
      label: 'DP1 STROKE',
    },
    { id: 'dp1-fault', at: [-0.65, 0.42], colour: 'red', label: 'DP1 FAULT' },
    {
      id: 'dp2-stroke',
      at: [-0.85, -0.45],
      colour: 'green',
      label: 'DP2 STROKE',
    },
    { id: 'dp2-fault', at: [-0.65, -0.45], colour: 'red', label: 'DP2 FAULT' },
    { id: 'p1-run', at: [0.33, 0.25], colour: 'green', label: 'P1 RUN' },
    {
      id: 'fs1',
      at: [0.75, -0.3],
      colour: 'green',
      label: shortTag('cell.fs'),
    },
    { id: 'dc-alarm', at: [0.45, -0.55], colour: 'red', label: 'DC1 ALARM' },
    ...SPEEDS.map((s, k) => ({
      id: `speed-${s}`,
      at: [-0.35 + k * 0.17, 0.6] as Point,
      colour: 'white' as const,
      label: `×${s}`,
    })),
  ],
  readouts: READOUTS.map(({ id, at }) => ({ id, at })),
  buttons: SPEEDS.map((s, k) => ({
    id: `speed/${s}`,
    at: [-0.35 + k * 0.17, 0.5] as Point,
    colour: 'white' as const,
    legend: `×${s}`,
  })),
  modes: [{ id: 'live', legend: 'READINGS' }],
};

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
export function hall3Reading(id: string, s: Hall3State): Reading | undefined {
  const r = hall3Readings(s);
  switch (id) {
    case 'hypoTank.li':
      return reading(r.hypoLitres, 'l', shortTag(id));
    case 'acidTank.li':
      return reading(r.acidLitres, 'l', shortTag(id));
    case 'dc.cl':
      return reading(r.free, 'mg/l', 'DC1 free chlorine', 2);
    case 'dc.ph':
      return reading(r.ph, 'pH', 'DC1 pH', 2);
    case 'dc.hypo':
      return reading(r.hypoOut * 100, '%', 'DC1 chlorine output', 0);
    case 'dc.acid':
      return reading(r.acidOut * 100, '%', 'DC1 pH output', 0);
    case 'flow':
      return reading(r.flow, 'm3/h', shortTag('discharge.meter'), 0);
    case 'swimmers':
      return reading(bathersNow(s), '', 'Swimmers in the water', 0);
  }
  return undefined;
}

/**
 * The board's lamps, readouts and chasers. `blink` is the stroke lamps'
 * phase: each lit for part of its pump's stroke.
 */
export function hall3MimicState(
  s: Hall3State,
  speed: TimeSpeed,
  blink = true,
): MimicState {
  const r = hall3Readings(s);
  const readouts: Record<string, Record<string, Reading>> = {};
  for (const { id } of READOUTS) {
    const value = hall3Reading(id, s);
    if (value) readouts[id] = { live: value };
  }
  const p = s.pumps;
  const alarm = s.controller.alarms.some(
    (a) => a.cleared === null && a.code !== 'ph-lockout',
  );
  return {
    lamps: {
      'sample.iso-open': s.open['sample.iso'],
      'sample.iso-shut': !s.open['sample.iso'],
      'dp1-stroke': p.hypochlorite.running && blink,
      'dp1-fault': p.hypochlorite.fault !== null,
      'dp2-stroke': p.acid.running && blink,
      'dp2-fault': p.acid.fault !== null,
      'p1-run': r.flow > 0,
      fs1: r.flowSwitch,
      'dc-alarm': alarm,
      ...Object.fromEntries(SPEEDS.map((x) => [`speed-${x}`, speed === x])),
    },
    readouts,
    flows: {
      hypoFill: flowState(s.open['hypoTank.fill'] ? 50 : 0),
      acidFill: flowState(s.open['acidTank.fill'] ? 50 : 0),
      hypoSuction: flowState(p.hypochlorite.running ? 20 : 0),
      hypoDose: flowState(p.hypochlorite.running ? 20 : 0),
      acidSuction: flowState(p.acid.running ? 20 : 0),
      acidDose: flowState(p.acid.running ? 20 : 0),
      suction: flowState(r.flow),
      discharge: flowState(r.flow),
      returnA: flowState(r.flow),
      returnB: flowState(r.flow),
      returnC: flowState(r.flow),
      overflow: flowState(r.flow),
      sample: flowState(r.sampleFlow),
      sampleDrain: flowState(r.sampleFlow),
    },
  };
}
