import {
  WATERS,
  doseHypochlorite,
  heat,
  irradiate,
} from '../../../game/water/water-condition';
import type { WaterCondition } from '../../../game/water/water-condition';
import {
  commandProcess,
  newFilterRig,
  rigFlows,
  stepFilterRig,
} from '../../../game/plant/ideal-filter';
import type { FilterRig } from '../../../game/plant/ideal-filter';

/**
 * The water bench (dev41, the owner, 2026-10-25; prompt 070): each of the
 * water's machines on a line of its own, an ideal source through it to an
 * ideal outlet, so each can be seen to do what it should to the water:
 * dirty water through an ideal filter comes out cleaner, clean water
 * through an ideal boiler hotter, through an ideal dosing station more
 * chlorinated, pool water through a UV unit with fewer chloramines. Each
 * line's pump runs or stops; each machine has a setting, turned up and
 * down. Pure.
 */

export type BenchMachine = 'filter' | 'boiler' | 'dosing' | 'uv';
export const BENCH_MACHINES: readonly BenchMachine[] = [
  'filter',
  'boiler',
  'dosing',
  'uv',
];

/** Each line: its source's water, its machine's name, its setting's steps and unit. */
export const BENCH = {
  filter: {
    title: 'IDEAL FILTER',
    source: WATERS.dirty,
    sourceName: 'DIRTY WATER',
    settings: [0],
    unit: '',
  },
  boiler: {
    title: 'IDEAL BOILER',
    source: WATERS.clean,
    sourceName: 'CLEAN WATER',
    settings: [0, 50, 100, 200, 400],
    unit: 'kW',
  },
  dosing: {
    title: 'IDEAL DOSING STATION',
    source: WATERS.clean,
    sourceName: 'CLEAN WATER',
    settings: [0, 0.5, 1, 2, 5],
    unit: 'mg/l',
  },
  uv: {
    title: 'IDEAL UV UNIT',
    source: { ...WATERS.pool, combinedChlorine: 0.6 },
    sourceName: 'POOL WATER',
    settings: [0, 0.25, 0.5, 1],
    unit: 'dose',
  },
} as const satisfies Record<
  BenchMachine,
  {
    title: string;
    source: WaterCondition;
    sourceName: string;
    settings: readonly number[];
    unit: string;
  }
>;

/** Each line's pump's flow, m³/h. */
export const BENCH_FLOW = 20;
/** The ideal boiler's primary: the hottest it can make the water, °C. */
export const BOILER_PRIMARY = 82;

export interface BenchLine {
  running: boolean;
  /** Its setting's step. */
  step: number;
}

export interface Bench {
  lines: Record<BenchMachine, BenchLine>;
  /** The filter line's filter: the ideal filter, in service on its dirty water. */
  filter: FilterRig;
}

export function newBench(): Bench {
  const filter = commandProcess(
    { ...newFilterRig({ diameter: 1 }), dirtySource: WATERS.dirty.solids },
    'service',
  );
  return {
    lines: Object.fromEntries(
      BENCH_MACHINES.map((m) => [m, { running: false, step: 0 }]),
    ) as Record<BenchMachine, BenchLine>,
    filter,
  };
}

export type BenchAction =
  | { line: BenchMachine; act: 'run' }
  | { line: BenchMachine; act: 'up' | 'down' };

export function actOnBench(b: Bench, a: BenchAction): Bench {
  const line = b.lines[a.line];
  const steps = BENCH[a.line].settings.length;
  const next: BenchLine =
    a.act === 'run'
      ? { ...line, running: !line.running }
      : {
          ...line,
          step: Math.max(
            0,
            Math.min(steps - 1, line.step + (a.act === 'up' ? 1 : -1)),
          ),
        };
  return { ...b, lines: { ...b.lines, [a.line]: next } };
}

/** A line's setting now. */
export const settingOf = (b: Bench, m: BenchMachine) =>
  BENCH[m].settings[b.lines[m].step];

/** What a line's machine gives, from what goes in, its flow and its setting. */
export function benchOut(
  b: Bench,
  m: BenchMachine,
): {
  in: WaterCondition;
  out: WaterCondition;
  flow: number;
} {
  const source = BENCH[m].source;
  const running = b.lines[m].running;
  if (m === 'filter') {
    // The ideal filter, its servos opened by its pump: what it gives.
    const f = rigFlows(b.filter);
    return { in: f.supply, out: f.outlet, flow: f.toOutlet };
  }
  const flow = running ? BENCH_FLOW : 0;
  const s = settingOf(b, m);
  const out =
    m === 'boiler'
      ? heat(source, s, flow, BOILER_PRIMARY)
      : m === 'dosing'
        ? doseHypochlorite(source, s)
        : irradiate(source, s);
  return { in: source, out: flow ? out : source, flow };
}

/** The bench `dt` seconds on: the filter line's filter runs while its pump does. */
export function stepBench(b: Bench, dt: number): Bench {
  const run = b.lines.filter.running;
  const wanted = commandProcess(b.filter, run ? 'service' : 'off');
  return { ...b, filter: stepFilterRig(wanted, dt) };
}
