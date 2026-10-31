import { readings } from '../water/pool-chemistry';
import type { PoolChemistry } from '../water/pool-chemistry';
import { worldClock } from '../events/game-event';
import { farSide } from './water-treatment';
import type { CircuitWater } from './water-treatment';
import type { PoolId } from './pools';
import { POOL_TITLES } from './hand-dose';

/**
 * A poolside test kit (the owner, 2026-10-31): the stand-in, until the
 * test-kit items are designed, for a lifeguard dipping a sample from the
 * pool's far side (`water-treatment.ts` `farSide`, as bathers meet it, not
 * the Trio's sample from the tank) and reading it as the kit's methods
 * do: each to its resolution, within its range, and with a small error
 * within its tolerance, seeded by the pool and the minute so the same
 * test at the same time reads the same. It changes nothing. Pure.
 */

export interface KitMethod {
  label: string;
  /** Its resolution and its tolerance (the most its error may be, before rounding), in its unit. */
  step: number;
  tolerance: number;
  /** What it can read; outside it, "below" or "above" its end. */
  min: number;
  max: number;
  unit: string;
}

export type KitTest =
  | 'freeChlorine'
  | 'totalChlorine'
  | 'ph'
  | 'alkalinity'
  | 'hardness'
  | 'cyanuric'
  | 'temperature'
  | 'tds';

export const KIT: Record<KitTest, KitMethod> = {
  freeChlorine: {
    label: 'Free chlorine (DPD 1)',
    step: 0.1,
    tolerance: 0.1,
    min: 0,
    max: 5,
    unit: 'mg/l',
  },
  totalChlorine: {
    label: 'Total chlorine (DPD 3)',
    step: 0.1,
    tolerance: 0.1,
    min: 0,
    max: 5,
    unit: 'mg/l',
  },
  ph: {
    label: 'pH (phenol red)',
    step: 0.1,
    tolerance: 0.1,
    min: 6.8,
    max: 8.2,
    unit: '',
  },
  alkalinity: {
    label: 'Alkalinity (titration)',
    step: 10,
    tolerance: 10,
    min: 0,
    max: 400,
    unit: 'mg/l',
  },
  hardness: {
    label: 'Calcium hardness',
    step: 25,
    tolerance: 25,
    min: 0,
    max: 1000,
    unit: 'mg/l',
  },
  cyanuric: {
    label: 'Cyanuric acid (turbidity)',
    step: 5,
    tolerance: 5,
    min: 15,
    max: 100,
    unit: 'mg/l',
  },
  temperature: {
    label: 'Temperature',
    step: 0.1,
    tolerance: 0.2,
    min: 0,
    max: 50,
    unit: '°C',
  },
  tds: {
    label: 'TDS (meter)',
    step: 50,
    tolerance: 50,
    min: 0,
    max: 9950,
    unit: 'mg/l',
  },
};

/** A test's result: its value as read, or which end of its range it is past. */
export interface KitReading {
  value: number;
  /** Past an end of its range: `value` is that end. */
  beyond?: 'below' | 'above';
}

export interface TestKitResult {
  pool: PoolId;
  time: number;
  readings: Record<KitTest, KitReading>;
  /** Combined chlorine, DPD 3 less DPD 1, as read. */
  combined: number;
}

/** A seed from words: FNV-1a. */
function seedOf(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32: numbers in [0, 1) from a seed. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rounded to `step`, without the float's dust. */
const toStep = (v: number, step: number) =>
  Number((Math.round(v / step) * step).toFixed(6));

/** One test's reading of `truth`: off by up to its tolerance (`u` from −1 to 1), to its resolution, within its range. */
export function readWith(m: KitMethod, truth: number, u: number): KitReading {
  const v = toStep(truth + u * m.tolerance, m.step);
  if (v < m.min) return { value: m.min, beyond: 'below' };
  if (v > m.max) return { value: m.max, beyond: 'above' };
  return { value: v };
}

/** A test kit's reading of a water at `temperature`, seeded by `seed`. */
export function readKit(
  w: PoolChemistry,
  temperature: number,
  seed: string,
): Omit<TestKitResult, 'pool' | 'time'> {
  const next = random(seedOf(seed));
  const u = () => next() * 2 - 1;
  const r = readings(w, temperature);
  const free = readWith(KIT.freeChlorine, w.freeChlorine, u());
  // DPD 3 goes into the same cell after DPD 1: never less than it read.
  const totalRead = readWith(KIT.totalChlorine, r.totalChlorine, u());
  const total =
    totalRead.value < free.value && !free.beyond
      ? { value: free.value }
      : totalRead;
  const out: Record<KitTest, KitReading> = {
    freeChlorine: free,
    totalChlorine: total,
    ph: readWith(KIT.ph, w.ph, u()),
    alkalinity: readWith(KIT.alkalinity, w.alkalinity, u()),
    hardness: readWith(KIT.hardness, w.hardness, u()),
    cyanuric: readWith(KIT.cyanuric, w.cyanuric, u()),
    temperature: readWith(KIT.temperature, temperature, u()),
    tds: readWith(KIT.tds, w.tds, u()),
  };
  return {
    readings: out,
    combined: toStep(Math.max(0, total.value - free.value), 0.1),
  };
}

/** A test kit taken from a pool's far side at world time `time` (seconds): the same pool and minute read the same. */
export function testKit(
  id: PoolId,
  circuit: CircuitWater,
  temperature: number,
  time: number,
): TestKitResult {
  const minute = Math.floor(Math.max(0, time) / 60);
  return {
    pool: id,
    time,
    ...readKit(farSide(circuit), temperature, `${id}|${minute}`),
  };
}

/** A reading as the kit shows it: `1.3 mg/l`, `below 6.8`, `above 5.0 mg/l`. */
export function kitText(test: KitTest, r: KitReading) {
  const m = KIT[test];
  const decimals = m.step < 1 ? 1 : 0;
  const v = r.value.toFixed(decimals);
  const unit = m.unit ? (m.unit === '°C' ? ' °C' : ` ${m.unit}`) : '';
  return `${r.beyond ? `${r.beyond} ` : ''}${v}${unit}`;
}

const ORDER: readonly KitTest[] = [
  'freeChlorine',
  'totalChlorine',
  'ph',
  'alkalinity',
  'hardness',
  'cyanuric',
  'temperature',
  'tds',
];

/** The kit's results as a block of lines, its heading first. */
export function formatTestKit(t: TestKitResult): string[] {
  const lines = [
    `Test kit · ${POOL_TITLES[t.pool]} (${t.pool}) · ${worldClock(t.time).slice(0, 5)}`,
  ];
  for (const test of ORDER) {
    const text = kitText(test, t.readings[test]);
    const extra =
      test === 'totalChlorine'
        ? `${' '.repeat(Math.max(1, 11 - text.length))}combined ${t.combined.toFixed(1)}`
        : '';
    lines.push(`  ${KIT[test].label.padEnd(28)}${text}${extra}`);
  }
  return lines;
}

/** The kit's results in a line, for the log. */
export function testKitSummary(t: TestKitResult) {
  const r = t.readings;
  const v = (k: KitTest) => kitText(k, r[k]).replace(/ (mg\/l|°C)$/, '');
  return `test kit taken: free chlorine ${v('freeChlorine')}, total ${v('totalChlorine')}, pH ${v('ph')}, alkalinity ${v('alkalinity')}, hardness ${v('hardness')}, TDS ${v('tds')}, ${v('temperature')} °C`;
}
