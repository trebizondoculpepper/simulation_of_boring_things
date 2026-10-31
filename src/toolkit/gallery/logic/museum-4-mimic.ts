import type {
  MimicSpec,
  MimicState,
  Point,
  Reading,
} from '../../components/industrial-control/logic/mimic';
import { flowState } from '../../components/industrial-control/logic/mimic-chaser';
import {
  DOSE_SECONDS,
  TANKS,
  readWater,
  shortTag,
  tankById,
} from '../../../game/plant/museum-4-lab';
import type { Hall4State, TankId } from '../../../game/plant/museum-4-lab';

/**
 * Hall 4's mimic (107d): "The map: where your chemicals go", a small
 * Penfold board above the dosing desk. Left to right (rule 5): the ten
 * tanks, each valve's lens lit while it doses, the header, the dosing pot,
 * the injection point on the pool's return, the pool, the swimmers'
 * arrow; repeats of free chlorine, pH and the balance index. No buttons:
 * everything is worked at the station. Pure.
 *
 * While a dose is delivered (the owner, 2026-10-29: "the map ... animates
 * when you start dosing"), the model's delivery, not the button, lights the
 * dosing tank's lamp and the pot's DOSING lamp, runs the chasers from that
 * tank along the header and the injection into the pool, and counts the
 * dose on DOSED; all go still and dark when the delivery ends.
 */

/** The chasers' LEDs on this board, big enough to see from the desk. */
const LED = 0.014;

const CHEM = '#c9a227';
const WATER = '#2a5f9e';

const CHEMICALS = TANKS.filter((t) => t.id !== 'fresh');
const tankX = (k: number) => -1.25 + k * 0.17;
const HEADER_Y = -0.3;
const valveAt = (id: TankId): Point =>
  id === 'fresh'
    ? [0.55, 0.18]
    : [tankX(CHEMICALS.findIndex((t) => t.id === id)), -0.18];

const READOUTS: readonly { id: string; at: Point; legend: string }[] = [
  { id: 'dose', at: [0.2, -0.55], legend: 'DOSED SO FAR' },
  {
    id: 'fc',
    at: [0.72, -0.55],
    legend: `${shortTag('meter.fc')} FREE CL mg/l`,
  },
  { id: 'ph', at: [0.97, -0.55], legend: `${shortTag('meter.ph')} pH` },
  { id: 'lsi', at: [1.22, -0.55], legend: `${shortTag('meter.lsi')} BALANCE` },
];
export const MIMIC_READOUTS = READOUTS.map((r) => r.id);

export const HALL4_MIMIC: MimicSpec = {
  title: 'THE MAP: WHERE YOUR CHEMICALS GO',
  width: 3.0,
  height: 1.4,
  lines: [
    ...CHEMICALS.map((t, k) => ({
      colour: CHEM,
      points: [
        [tankX(k), 0.0],
        [tankX(k), HEADER_Y],
      ] as Point[],
      flow: { id: `dose.${t.id}`, size: LED },
    })),
    {
      colour: CHEM,
      points: [
        [tankX(0), HEADER_Y],
        [0.15, HEADER_Y],
      ],
      flow: { id: 'header', size: LED },
    },
    {
      colour: CHEM,
      points: [
        [0.25, HEADER_Y],
        [0.45, HEADER_Y],
        [0.45, -0.1],
      ],
      flow: { id: 'injection', size: LED },
    },
    {
      colour: WATER,
      points: [
        [0.3, 0.18],
        [0.95, 0.18],
      ],
      flow: { id: 'dose.fresh', size: LED },
    },
    {
      colour: WATER,
      points: [
        [1.25, -0.25],
        [1.25, -0.05],
        [0.45, -0.05],
        [0.45, 0.0],
      ],
      flow: { id: 'circulation', size: LED },
    },
    {
      colour: WATER,
      points: [
        [0.45, 0.0],
        [0.45, 0.05],
        [0.95, 0.05],
      ],
      flow: { id: 'return', size: LED },
    },
  ],
  shapes: [
    ...CHEMICALS.map((t, k) => ({
      symbol: 'tank' as const,
      at: [tankX(k), 0.12] as Point,
      size: 0.1,
      label: t.code,
    })),
    {
      symbol: 'tank',
      at: [0.22, 0.18],
      size: 0.1,
      label: shortTag('tank.fresh'),
    },
    {
      symbol: 'cylinder',
      at: [0.2, HEADER_Y],
      size: 0.09,
      label: shortTag('pot'),
    },
    { symbol: 'pump', at: [0.85, -0.05], size: 0.09, label: shortTag('pump') },
    { symbol: 'pool', at: [1.18, 0.1], size: 0.32, label: shortTag('pool') },
    ...TANKS.map((t) => ({
      symbol: 'valve' as const,
      at: valveAt(t.id),
      size: 0.045,
      indicator: { open: `${t.id}-open`, shut: `${t.id}-shut` },
    })),
  ],
  labels: [
    { text: 'DOSING HEADER', at: [-0.5, -0.38], size: 0.45 },
    { text: 'INJECTION', at: [0.45, -0.17], size: 0.4 },
    { text: 'SWIMMERS IN', at: [1.05, 0.38], size: 0.45 },
    ...READOUTS.map((r) => ({
      text: r.legend,
      at: [r.at[0], r.at[1] + 0.065] as Point,
      size: 0.4,
    })),
  ],
  lamps: [
    { id: 'swimmers', at: [1.25, 0.38], colour: 'amber', label: 'GROUP' },
    { id: 'p1-run', at: [0.85, -0.2], colour: 'green', label: 'P1 RUN' },
    { id: 'pot-dosing', at: [0.05, -0.42], colour: 'amber', label: 'DOSING' },
    ...CHEMICALS.map((t, k) => ({
      id: `${t.id}-dosing`,
      at: [tankX(k), 0.24] as Point,
      colour: 'amber' as const,
    })),
    {
      id: 'fresh-dosing',
      at: [0.22, 0.3] as Point,
      colour: 'amber' as const,
    },
  ],
  readouts: READOUTS.map(({ id, at }) => ({ id, at })),
  modes: [{ id: 'live', legend: 'READINGS' }],
};

/** How much of the dose running has gone in so far, in its tank's unit; 0 when none. */
export function dosedSoFar(s: Hall4State): number {
  const d = s.delivering;
  if (!d) return 0;
  return d.amount * Math.min(1, Math.max(0, 1 - d.left / DOSE_SECONDS));
}

export function hall4Reading(id: string, s: Hall4State): Reading | undefined {
  if (id === 'dose') {
    const unit = s.delivering ? tankById(s.delivering.tank).unit : '';
    return {
      value: dosedSoFar(s),
      unit: unit === 'm3' ? 'm³' : unit,
      name: 'Dosed so far',
      places: 1,
    };
  }
  const r = readWater(s.bench.pool);
  const name = shortTag(`meter.${id}`);
  switch (id) {
    case 'fc':
      return { value: r.fc, unit: 'mg/l', name, places: 2 };
    case 'ph':
      return { value: r.ph, unit: 'pH', name, places: 2 };
    case 'lsi':
      return { value: r.lsi, unit: '', name, places: 2 };
  }
  return undefined;
}

/** The board's lamps, readouts and chasers. `groupLit` while a group of swimmers is arriving. */
export function hall4MimicState(
  s: Hall4State,
  groupLit = false,
  circulating = true,
): MimicState {
  const dosing = s.delivering?.tank ?? null;
  const readouts: Record<string, Record<string, Reading>> = {};
  for (const { id } of READOUTS) readouts[id] = { live: hall4Reading(id, s)! };
  const chem = dosing && dosing !== 'fresh' ? 100 : 0;
  return {
    lamps: {
      ...Object.fromEntries(
        TANKS.flatMap((t) => [
          [`${t.id}-open`, dosing === t.id],
          [`${t.id}-shut`, dosing !== t.id],
        ]),
      ),
      swimmers: groupLit || s.group > 0,
      'p1-run': true,
      'pot-dosing': chem > 0,
      ...Object.fromEntries(
        TANKS.map((t) => [`${t.id}-dosing`, dosing === t.id]),
      ),
    },
    readouts,
    flows: {
      ...Object.fromEntries(
        TANKS.map((t) => [
          `dose.${t.id}`,
          flowState(dosing === t.id ? 100 : 0),
        ]),
      ),
      header: flowState(chem),
      injection: flowState(chem),
      circulation: flowState(circulating ? 167 : 0),
      return: flowState(circulating ? 167 : 0),
    },
  };
}
