import { hoclFraction } from '../../../../game/water/pool-chemistry';
import { NOMINAL, slopeAt } from './dosing-controller';
import type { CellSignals } from './dosing-controller';

/**
 * A dosing controller's sample cell (prompt 105; the owner, 2026-10-28: "a
 * sample line of water, in and out"): sample water from the circulation
 * through its isolating valve and flow regulator, up a rotameter with a
 * reed-switch float (the flow switch), past its probe holders (free and,
 * on the Olympic's, total chlorine; pH; redox; a Pt1000), and away to the
 * balance tank; a manual sample tap for the DPD test. After ProMinent's
 * DGMa in-line probe housing (pool water with return: 20 to 60 l/h).
 *
 * The probes are ideal unless a fault is set (the owner's ruling for the
 * world, 2026-10-28: "for now, let's cheat"); for the bench, each may be
 * drifted (a chlorine probe's sensitivity and zero, a pH electrode's zero
 * and slope, a redox electrode's offset), so a calibration has something
 * to put right. With the sample stopped, the water in the cell stands and
 * the chlorine probe consumes its chlorine (a chlorine zero is taken so).
 * The pH electrode may be lifted out into a buffer. Pure.
 */

/** The water a cell is fed: its free and total chlorine, pH and temperature. */
export interface SampleWater {
  free: number;
  total: number;
  ph: number;
  temperature: number;
}

/** How far each probe is off: 1 and 0 for an ideal one. */
export interface ProbeErrors {
  /** The chlorine probes' sensitivity as a share of nominal, and their zero current, µA. */
  freeSensitivity: number;
  freeZeroUa: number;
  totalSensitivity: number;
  /** The pH electrode's zero (asymmetry), mV, and its slope as a share of Nernst's. */
  phZeroMv: number;
  phSlope: number;
  /** The redox electrode's offset, mV. */
  redoxMv: number;
}

export const IDEAL_PROBES: ProbeErrors = {
  freeSensitivity: 1,
  freeZeroUa: 0,
  totalSensitivity: 1,
  phZeroMv: 0,
  phSlope: 1,
  redoxMv: 0,
};

/**
 * A week or two left alone (`pool-dosing-and-water-chemistry.md` §3.1's
 * invented drifts): the chlorine probe 30 % less sensitive, its zero a
 * little up; the pH electrode's zero 18 mV off (it reads about 0.3 low),
 * its slope 94 %; redox 25 mV low.
 */
export const DRIFTED_PROBES: ProbeErrors = {
  freeSensitivity: 0.7,
  freeZeroUa: 0.6,
  totalSensitivity: 0.75,
  phZeroMv: 18,
  phSlope: 0.94,
  redoxMv: -25,
};

/** Where the pH electrode is: in its holder, or lifted out into a buffer. */
export type PhProbePlace = 'cell' | 4 | 7;

export interface SampleCellState {
  /** Its isolating valve; its regulator, 0 (shut) to 1 (fully open). */
  valveOpen: boolean;
  regulator: number;
  /** The water standing in it now. */
  water: SampleWater;
  probes: ProbeErrors;
  phProbe: PhProbePlace;
  /** Whether it has the Olympic's total-chlorine and redox probes. */
  total: boolean;
  redox: boolean;
}

/** The cell's sizes: its most flow at the line's pressure, l/h; its flow switch's point; its water's volume, l. */
export const CELL = {
  maxFlow: 60,
  switchAt: 20,
  volume: 0.5,
  /** The sample line's own lag, s (its run from the tapping). */
  lineLag: 30,
  /** Standing, the chlorine probe consumes the cell's chlorine in about this, s. */
  standing: 240,
} as const;

export function newSampleCell(
  water: SampleWater,
  options: { total?: boolean; redox?: boolean } = {},
): SampleCellState {
  return {
    valveOpen: true,
    regulator: 0.65,
    water,
    probes: IDEAL_PROBES,
    phProbe: 'cell',
    total: options.total ?? true,
    redox: options.redox ?? true,
  };
}

/** Its flow now, l/h: none with its valve shut. */
export const cellFlow = (c: SampleCellState) =>
  c.valveOpen ? CELL.maxFlow * Math.max(0, Math.min(1, c.regulator)) : 0;

/** Its flow switch: made with the float above its switch point. */
export const flowOk = (c: SampleCellState) => cellFlow(c) >= CELL.switchAt;

/**
 * The cell `dt` seconds on: with flow, its water following the sample
 * through the line's lag and its own volume's; without, standing, its
 * chlorine consumed by the probe.
 */
export function stepSampleCell(
  c: SampleCellState,
  sample: SampleWater,
  dt: number,
): SampleCellState {
  if (!(dt > 0)) return c;
  const flow = cellFlow(c);
  const w = c.water;
  if (flow > 0) {
    const tau = CELL.lineLag + (CELL.volume / flow) * 3600;
    const k = 1 - Math.exp(-dt / tau);
    return {
      ...c,
      water: {
        free: w.free + (sample.free - w.free) * k,
        total: w.total + (sample.total - w.total) * k,
        ph: w.ph + (sample.ph - w.ph) * k,
        temperature: w.temperature + (sample.temperature - w.temperature) * k,
      },
    };
  }
  const k = Math.exp(-dt / CELL.standing);
  const free = w.free * k;
  // The combined chlorine stays; only the free is consumed.
  return { ...c, water: { ...w, free, total: w.total - (w.free - free) } };
}

/** Redox at the cell's water, mV against Ag/AgCl: the chemistry model's curve (`readings`). */
export const redoxOf = (free: number, ph: number, temperature: number) =>
  786 + 80 * Math.log10(free * hoclFraction(ph, temperature) + 1e-4);

/** What its probes give the controller. */
export function cellSignals(c: SampleCellState): CellSignals {
  const w = c.water;
  const p = c.probes;
  const T = w.temperature;
  const phSeen = c.phProbe === 'cell' ? w.ph : c.phProbe;
  return {
    freeUa: w.free * NOMINAL.chlorineUa * p.freeSensitivity + p.freeZeroUa,
    totalUa: c.total
      ? w.total * NOMINAL.chlorineUa * p.totalSensitivity + p.freeZeroUa
      : null,
    phMv: p.phZeroMv - (phSeen - 7) * slopeAt(NOMINAL.nernst * p.phSlope, T),
    redoxMv: c.redox ? redoxOf(w.free, w.ph, T) + p.redoxMv : null,
    temperature: T,
    flowOk: flowOk(c),
  };
}

/**
 * A sample drawn at its tap and tested by hand: DPD 1 (free), DPD 3
 * (total) and phenol red (pH), each to its photometer's resolution. The
 * tap draws the cell's water, so a standing cell's sample shows its
 * consumed chlorine, as the real one would.
 */
export interface TestResult {
  dpd1: number;
  dpd3: number;
  phenolRed: number;
}

export function testSample(c: SampleCellState): TestResult {
  const r = (v: number, step: number) => Math.round(v / step) * step;
  return {
    dpd1: r(Math.max(0, c.water.free), 0.01),
    dpd3: r(Math.max(0, c.water.total), 0.01),
    phenolRed: r(c.water.ph, 0.1),
  };
}
