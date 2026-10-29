import type {
  MimicSpec,
  MimicState,
  Point,
  Reading,
} from '../../components/industrial-control/logic/mimic';
import { flowState } from '../../components/industrial-control/logic/mimic-chaser';
import type { FlowState } from '../../components/industrial-control/logic/mimic-chaser';
import {
  PUMPS,
  PUMP_NOS,
  TANK,
  hall6Readings,
  isRunning,
  shortTag,
} from '../../../game/plant/museum-6-pumps';
import type { Hall6State, PumpNo } from '../../../game/plant/museum-6-pumps';

/**
 * Hall 6's mimic (107j): a Penfold board in the sponsor's colours. The
 * ideal reservoir along the bottom, the eleven pumps in a row above it
 * with their RUN lamps, each line chasing while its pump delivers, the
 * header along the top into the tank; the tank's level as a column of
 * lamps, LSH1 and TANK FULL · PUMPS LOCKED OUT, the overflow and the
 * drain with its valve's lenses; readouts of the tank's litres and the
 * total flow. No buttons: each pump is run at its own stand. Pure.
 */

const WATER = '#2a5f9e';
/** The chaser LEDs' blue, bright against the line's. */
export const CHASER = '#5ec8ff';
/** Its LEDs: that blue, and larger than the default, to read across the hall. */
const CHASE = { lit: CHASER, size: 0.012 } as const;
const x = (no: PumpNo) => -1.3 + (no - 1) * 0.21;
const PUMP_Y = -0.3;
const SOURCE_Y = -0.55;
const HEADER_Y = 0.15;
const TANK_AT: Point = [1.4, -0.2];
export const LEVEL_STEPS = [0.2, 0.4, 0.6, 0.8, 1] as const;

export const HALL6_MIMIC: MimicSpec = {
  title: 'GRUNDFLOW’S AMAZING WORLD OF PUMPS: WHERE THE WATER GOES',
  width: 3.6,
  height: 1.6,
  lines: [
    // The reservoir's main, in a length to each pump, each chasing with what passes it.
    {
      colour: WATER,
      points: [
        [-1.6, SOURCE_Y],
        [x(1), SOURCE_Y],
      ],
      flow: { id: 'main0', ...CHASE },
    },
    ...PUMPS.slice(1).map((p) => ({
      colour: WATER,
      points: [
        [x((p.no - 1) as PumpNo), SOURCE_Y],
        [x(p.no), SOURCE_Y],
      ] as Point[],
      flow: { id: `main${p.no - 1}`, ...CHASE },
    })),
    ...PUMPS.map((p) => ({
      colour: WATER,
      points: [
        [x(p.no), SOURCE_Y],
        [x(p.no), PUMP_Y - 0.05],
      ] as Point[],
      flow: { id: `suction${p.no}`, ...CHASE },
    })),
    ...PUMPS.map((p) => ({
      colour: WATER,
      points: [
        [x(p.no), PUMP_Y + 0.05],
        [x(p.no), HEADER_Y],
      ] as Point[],
      flow: { id: `delivery${p.no}`, ...CHASE },
    })),
    // The header, in a length from each pump to the next, then on to the tank.
    ...PUMPS.slice(1).map((p) => ({
      colour: WATER,
      points: [
        [x((p.no - 1) as PumpNo), HEADER_Y],
        [x(p.no), HEADER_Y],
      ] as Point[],
      flow: { id: `header${p.no - 1}`, ...CHASE },
    })),
    {
      colour: WATER,
      points: [
        [x(11), HEADER_Y],
        [TANK_AT[0], HEADER_Y],
        [TANK_AT[0], TANK_AT[1] + 0.16],
      ],
      flow: { id: 'fill', ...CHASE },
    },
    {
      colour: WATER,
      points: [
        [TANK_AT[0] - 0.08, TANK_AT[1] - 0.16],
        [TANK_AT[0] - 0.08, -0.6],
      ],
      flow: { id: 'drain', ...CHASE },
    },
    {
      colour: WATER,
      points: [
        [TANK_AT[0] + 0.1, TANK_AT[1] + 0.1],
        [1.62, TANK_AT[1] + 0.1],
        [1.62, -0.6],
      ],
      flow: { id: 'overflow', ...CHASE },
    },
  ],
  shapes: [
    { symbol: 'tank', at: [-1.68, SOURCE_Y], size: 0.1, label: 'CW1' },
    ...PUMPS.map((p) => ({
      symbol: 'pump' as const,
      at: [x(p.no), PUMP_Y] as Point,
      size: 0.08,
    })),
    { symbol: 'tank', at: TANK_AT, size: 0.28, label: shortTag('tank') },
    {
      symbol: 'valve',
      at: [TANK_AT[0] - 0.08, -0.47],
      size: 0.05,
      indicator: { open: 'drain-open', shut: 'drain-shut' },
    },
  ],
  labels: [
    ...PUMPS.map((p) => ({
      text: `P${p.no}`,
      at: [x(p.no) + 0.07, PUMP_Y + 0.1] as Point,
      size: 0.4,
    })),
    { text: 'IDEAL RESERVOIR', at: [-0.5, SOURCE_Y - 0.06], size: 0.4 },
    { text: 'INLET HEADER HD1', at: [0.3, HEADER_Y + 0.06], size: 0.4 },
    { text: 'TO DRAIN DR1', at: [1.5, -0.66], size: 0.4 },
    { text: 'LEVEL', at: [1.15, 0.33], size: 0.4 },
  ],
  lamps: [
    ...PUMPS.map((p) => ({
      id: `run-${p.no}`,
      at: [x(p.no), -0.68] as Point,
      colour: 'green' as const,
      label: 'RUN',
    })),
    ...LEVEL_STEPS.map((_step, k) => ({
      id: `level-${k}`,
      at: [1.05, -0.45 + k * 0.15] as Point,
      colour: 'white' as const,
    })),
    {
      id: 'lsh',
      at: [1.45, 0.4],
      colour: 'amber',
      label: shortTag('tank.lsh'),
    },
    {
      id: 'locked',
      at: [0.75, 0.42],
      colour: 'red',
      label: 'TANK FULL · LOCKED',
    },
  ],
  readouts: [
    { id: 'tank.lt', at: [1.4, 0.58] },
    { id: 'total', at: [0.85, 0.58] },
  ],
  modes: [{ id: 'live', legend: 'READINGS' }],
};

const reading = (
  value: number,
  unit: string,
  name: string,
  places = 0,
): Reading => ({
  value,
  unit,
  name,
  places,
});

/** Each readout's reading. */
export function hall6Reading(id: string, s: Hall6State): Reading | undefined {
  const r = hall6Readings(s);
  if (id === 'tank.lt') return reading(r.litres, 'L', shortTag('tank.lt'));
  if (id === 'total')
    return reading(r.total, 'm3/h', 'ALL PUMPS', r.total < 100 ? 1 : 0);
  return undefined;
}

/**
 * Which way each chased line runs, from the hall's state: the reservoir's
 * main up to the running pump, its suction and fill line, the header from
 * it to the tank, and the drain while the drain valve is open; every other
 * line still. Each length carries what passes it: the main from CW1 to
 * pump n all the pumps from n on, the header from pump n to n + 1 all the
 * pumps up to n. A delivery, however small, shows (at least the chaser's
 * threshold).
 */
export function hall6Flows(s: Hall6State): Record<string, FlowState> {
  const r = hall6Readings(s);
  const shown = (q: number) => flowState(q > 1e-9 ? Math.max(1, q) : 0);
  const flows: Record<string, FlowState> = {};
  let before = 0;
  for (const n of PUMP_NOS) {
    flows[`main${n - 1}`] = shown(r.total - before);
    flows[`suction${n}`] = shown(r.flow[n]);
    flows[`delivery${n}`] = shown(r.flow[n]);
    before += r.flow[n];
    if (n < 11) flows[`header${n}`] = shown(before);
  }
  flows.fill = shown(r.total);
  flows.drain = flowState(r.drainLps * 3.6);
  flows.overflow = flowState(0);
  return flows;
}

/** The board's state, from the hall's. */
export function hall6MimicState(s: Hall6State): MimicState {
  const r = hall6Readings(s);
  const share = s.litres / TANK.fullL;
  const readouts: Record<string, Record<string, Reading>> = {};
  for (const id of ['tank.lt', 'total'])
    readouts[id] = { live: hall6Reading(id, s)! };
  const flows = hall6Flows(s);
  return {
    lamps: {
      ...Object.fromEntries(PUMP_NOS.map((n) => [`run-${n}`, isRunning(s, n)])),
      ...Object.fromEntries(
        LEVEL_STEPS.map((step, k) => [`level-${k}`, share >= step - 1e-6]),
      ),
      lsh: r.high,
      locked: s.tripped,
      'drain-open': s.draining,
      'drain-shut': !s.draining,
    },
    readouts,
    flows,
  };
}
