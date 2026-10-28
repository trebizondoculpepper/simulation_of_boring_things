import type {
  MimicSpec,
  MimicState,
  Point,
  Reading,
} from '../../components/industrial-control/logic/mimic';
import { flowState } from '../../components/industrial-control/logic/mimic-chaser';
import {
  hall9Readings,
  p1Called,
  shortTag,
} from '../../../game/plant/museum-9-plant';
import type { Hall9State } from '../../../game/plant/museum-9-plant';

/**
 * Hall 9's mimic (107e): "The map of the whole plant", a Penfold board,
 * the largest in the museum. Left to right: the heat (gas, boiler B1, its
 * primary pump P2 and the motorised valve HX1-V2 to the exchanger); the
 * water (the exchanger and its bypass, the filter F1, the pump P1 and its
 * strainer ST1, the balance tank and the pool), the return main over the
 * top past the sample tapping and the injections; the chemistry under it
 * (the sample cell and the two dosing pumps and day tanks). Every line
 * chases its flow; every machine's state on its lamps; the instruments
 * repeated on its readouts; the valve's lens. Its only buttons are what
 * the desk may work (CLAUDE.md, local-only controls): P1 and P2 START and
 * STOP, and HX1-V2 OPEN and SHUT. It shows only what the plant's own
 * instruments show. Pure.
 */

const WATER = '#2a5f9e';
const HEAT = '#c0392b';
const GAS = '#d4a017';
const HYPO = '#c9a227';
const ACID = '#b0392b';
const SAMPLE = '#3e8f6a';

const line = (flow: string, points: Point[], colour: string) => ({
  colour,
  points,
  flow: { id: flow },
});

const Y = -0.05;
const TOP = 0.2;
const CHEM = -0.42;

const READOUTS: readonly { id: string; legend: string }[] = [
  { id: 'ft1', legend: `${shortTag('filtered.meter')} m³/h` },
  { id: 'pi1', legend: `${shortTag('pump.suction.pi')} bar` },
  { id: 'pdi1', legend: `${shortTag('filter.pdi')} bar` },
  { id: 'ti5', legend: `${shortTag('pool.ti')} °C` },
  { id: 'ti3', legend: `${shortTag('boilerFlow.ti')} °C` },
  { id: 'cl', legend: 'DC1 Cl' },
  { id: 'ph', legend: 'DC1 pH' },
  { id: 'li1', legend: `${shortTag('hypoTank.li')} l` },
];
const readoutAt = (k: number): Point => [-0.35 + k * 0.235, 0.45];

export const MIMIC_READOUTS = READOUTS.map((r) => r.id);

export const HALL9_MIMIC: MimicSpec = {
  title: 'THE MAP OF THE WHOLE PLANT',
  width: 3.2,
  height: 1.5,
  lines: [
    line(
      'gas',
      [
        [-1.5, -0.25],
        [-1.3, -0.25],
        [-1.3, 0.09],
      ],
      GAS,
    ),
    line(
      'primaryFlow',
      [
        [-1.24, 0.15],
        [-0.45, 0.15],
        [-0.45, 0.01],
      ],
      HEAT,
    ),
    line(
      'primaryReturn',
      [
        [-0.51, Y + 0.03],
        [-0.7, Y + 0.03],
        [-0.7, 0.3],
        [-1.3, 0.3],
        [-1.3, 0.21],
      ],
      HEAT,
    ),
    line(
      'overflow',
      [
        [1.19, Y],
        [1.01, Y],
      ],
      WATER,
    ),
    line(
      'suction',
      [
        [0.89, Y],
        [0.73, Y],
      ],
      WATER,
    ),
    line(
      'strained',
      [
        [0.67, Y],
        [0.47, Y],
      ],
      WATER,
    ),
    line(
      'discharge',
      [
        [0.37, Y],
        [0.07, Y],
      ],
      WATER,
    ),
    line(
      'filtered',
      [
        [-0.07, Y],
        [-0.39, Y],
      ],
      WATER,
    ),
    line(
      'hxBypass',
      [
        [-0.2, Y],
        [-0.2, -0.2],
        [-0.6, -0.2],
        [-0.6, Y],
      ],
      WATER,
    ),
    line(
      'heated',
      [
        [-0.51, Y - 0.03],
        [-0.6, Y - 0.03],
        [-0.6, TOP],
        [1.22, TOP],
        [1.22, 0.1],
      ],
      WATER,
    ),
    line(
      'backwash',
      [
        [0.0, -0.12],
        [0.0, -0.3],
        [-0.35, -0.3],
      ],
      WATER,
    ),
    line(
      'sample',
      [
        [0.3, TOP],
        [0.3, CHEM + 0.13],
        [0.1, CHEM + 0.13],
        [0.1, CHEM + 0.04],
      ],
      SAMPLE,
    ),
    line(
      'hypoDose',
      [
        [0.47, CHEM],
        [0.47, -0.3],
        [0.95, -0.3],
        [0.95, TOP],
      ],
      HYPO,
    ),
    line(
      'hypoFill',
      [
        [0.7, CHEM],
        [0.6, CHEM],
      ],
      HYPO,
    ),
    line(
      'acidDose',
      [
        [0.97, CHEM],
        [1.05, CHEM],
        [1.05, TOP],
      ],
      ACID,
    ),
    line(
      'acidFill',
      [
        [1.25, CHEM],
        [1.15, CHEM],
      ],
      ACID,
    ),
  ],
  shapes: [
    {
      symbol: 'boiler',
      at: [-1.3, 0.15],
      size: 0.12,
      label: shortTag('boiler'),
    },
    {
      symbol: 'pump',
      at: [-1.0, 0.3],
      size: 0.08,
      label: shortTag('primaryPump'),
    },
    {
      symbol: 'valve',
      at: [-0.7, 0.15],
      size: 0.045,
      indicator: { open: 'mv-open', shut: 'mv-shut' },
    },
    { symbol: 'hx', at: [-0.45, Y], size: 0.12, label: shortTag('hx') },
    {
      symbol: 'valve',
      at: [-0.4, -0.2],
      size: 0.04,
      indicator: { open: 'bypass-open', shut: 'bypass-shut' },
    },
    { symbol: 'filter', at: [0.0, Y], size: 0.14, label: shortTag('filter') },
    { symbol: 'pump', at: [0.42, Y], size: 0.1, label: shortTag('poolPump') },
    { symbol: 'filter', at: [0.7, Y], size: 0.06, label: shortTag('strainer') },
    {
      symbol: 'tank',
      at: [0.95, Y],
      size: 0.12,
      label: shortTag('balanceTank'),
    },
    { symbol: 'pool', at: [1.32, 0.0], size: 0.26, label: shortTag('pool') },
    {
      symbol: 'filter',
      at: [0.1, CHEM],
      size: 0.07,
      label: shortTag('sampleCell'),
    },
    {
      symbol: 'pump',
      at: [0.47, CHEM],
      size: 0.06,
      label: shortTag('hypoPump'),
    },
    {
      symbol: 'tank',
      at: [0.72, CHEM],
      size: 0.08,
      label: shortTag('hypoTank'),
    },
    {
      symbol: 'pump',
      at: [0.97, CHEM],
      size: 0.06,
      label: shortTag('acidPump'),
    },
    {
      symbol: 'tank',
      at: [1.25, CHEM],
      size: 0.08,
      label: shortTag('acidTank'),
    },
  ],
  labels: [
    { text: 'GAS', at: [-1.45, -0.2], size: 0.6 },
    { text: 'HEAT', at: [-1.0, -0.45], size: 0.8 },
    { text: 'CHEMISTRY', at: [0.75, -0.62], size: 0.6 },
    { text: 'TO DRAIN', at: [-0.3, -0.36], size: 0.45 },
  ],
  lamps: [
    { id: 'b1-burner', at: [-1.45, 0.32], colour: 'green', label: 'BURNER' },
    { id: 'b1-lockout', at: [-1.45, 0.08], colour: 'red', label: 'LOCKOUT' },
    { id: 'p2-run', at: [-0.8, 0.38], colour: 'green', label: 'P2 RUN' },
    { id: 'tc1-call', at: [-0.2, 0.3], colour: 'amber', label: 'TC1 CALL' },
    { id: 'fs1', at: [-0.2, 0.08], colour: 'green', label: shortTag('hx.fs') },
    { id: 'p1-run', at: [0.33, 0.1], colour: 'green', label: 'P1 RUN' },
    { id: 'p1-trip', at: [0.52, 0.1], colour: 'red', label: 'P1 TRIP' },
    { id: 'fs2', at: [0.1, -0.6], colour: 'green', label: shortTag('cell.fs') },
    { id: 'dp1-fault', at: [0.35, -0.6], colour: 'red', label: 'DP1 FAULT' },
    { id: 'dp2-fault', at: [1.1, -0.62], colour: 'red', label: 'DP2 FAULT' },
  ],
  readouts: READOUTS.map((r, k) => ({ id: r.id, at: readoutAt(k) })),
  buttons: [
    { id: 'p2/start', at: [-1.12, 0.47], colour: 'green', legend: 'START' },
    { id: 'p2/stop', at: [-0.92, 0.47], colour: 'red', legend: 'STOP' },
    { id: 'mv/open', at: [-0.85, -0.02], colour: 'green', legend: 'OPEN' },
    { id: 'mv/shut', at: [-0.68, -0.02], colour: 'red', legend: 'SHUT' },
    { id: 'p1/start', at: [0.33, -0.24], colour: 'green', legend: 'START' },
    { id: 'p1/stop', at: [0.53, -0.24], colour: 'red', legend: 'STOP' },
  ],
  modes: [{ id: 'live', legend: 'READINGS' }],
};

/** A desk button's action, by its id. */
export function mimicCommand(
  id: string,
):
  | { type: 'desk-p1'; run: boolean }
  | { type: 'desk-p2'; run: boolean }
  | { type: 'desk-mv'; command: 'open' | 'shut' }
  | null {
  switch (id) {
    case 'p1/start':
      return { type: 'desk-p1', run: true };
    case 'p1/stop':
      return { type: 'desk-p1', run: false };
    case 'p2/start':
      return { type: 'desk-p2', run: true };
    case 'p2/stop':
      return { type: 'desk-p2', run: false };
    case 'mv/open':
      return { type: 'desk-mv', command: 'open' };
    case 'mv/shut':
      return { type: 'desk-mv', command: 'shut' };
  }
  return null;
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
export function hall9Reading(id: string, s: Hall9State): Reading | undefined {
  const r = hall9Readings(s);
  switch (id) {
    case 'ft1':
      return reading(r.flow, 'm3/h', shortTag('filtered.meter'), 0);
    case 'pi1':
      return reading(r.pi1, 'bar', shortTag('pump.suction.pi'), 2);
    case 'pdi1':
      return reading(r.pdi1, 'bar', shortTag('filter.pdi'), 2);
    case 'ti5':
      return reading(r.ti.ti5, 'C', shortTag('pool.ti'), 1);
    case 'ti3':
      return reading(r.ti.ti3, 'C', shortTag('boilerFlow.ti'), 0);
    case 'cl':
      return reading(r.free, 'mg/l', 'DC1 free chlorine', 2);
    case 'ph':
      return reading(r.ph, 'pH', 'DC1 pH', 2);
    case 'li1':
      return reading(r.li1, 'l', shortTag('hypoTank.li'), 0);
  }
  return undefined;
}

/** The board's lamps, readouts and chasers. */
export function hall9MimicState(s: Hall9State): MimicState {
  const r = hall9Readings(s);
  const readouts: Record<string, Record<string, Reading>> = {};
  for (const { id } of READOUTS) {
    const v = hall9Reading(id, s);
    if (v) readouts[id] = { live: v };
  }
  const b = s.heat.boiler;
  const wash =
    s.water.opening['filter.backwash-out.iso'] > 0 ||
    s.water.opening['filter.rinse.iso'] > 0;
  return {
    lamps: {
      'b1-burner': b.code === 3,
      'b1-lockout': b.lockout !== null,
      'p2-run': r.p2Running,
      'tc1-call': r.tc1Calling,
      fs1: r.fs1,
      'p1-run': r.p1Running,
      'p1-trip': s.starter.tripped || s.water.tripped,
      fs2: r.fs2,
      'dp1-fault': r.dp1Fault,
      'dp2-fault': r.dp2Fault,
      'mv-open': r.mv > 0.95,
      'mv-shut': r.mv < 0.05,
      'bypass-open': s.hxBypass > 0,
      'bypass-shut': s.hxBypass === 0,
    },
    readouts,
    flows: {
      gas: flowState(r.gasFlow * 10),
      primaryFlow: flowState(r.p2Running ? 50 * Math.max(0.1, r.mv) : 0),
      primaryReturn: flowState(r.p2Running ? 50 : 0),
      overflow: flowState(r.flow),
      suction: flowState(p1Called(s) ? r.flow : 0),
      strained: flowState(r.flow),
      discharge: flowState(r.flow),
      filtered: flowState(r.flow),
      hxBypass: flowState(s.hxBypass > 0 ? r.flow : 0),
      heated: flowState(r.flow),
      backwash: flowState(wash && r.p1Running ? 100 : 0),
      sample: flowState(r.sampleFlow),
      hypoDose: flowState(r.dp1Running ? 20 : 0),
      hypoFill: flowState(s.chem.open['hypoTank.fill'] ? 50 : 0),
      acidDose: flowState(r.dp2Running ? 20 : 0),
      acidFill: flowState(s.chem.open['acidTank.fill'] ? 50 : 0),
    },
  };
}
