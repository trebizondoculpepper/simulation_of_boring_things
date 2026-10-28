import {
  dose,
  readings,
  stepChemistry,
  waterFrom,
} from '../../../../game/water/pool-chemistry';
import type { PoolChemistry } from '../../../../game/water/pool-chemistry';
import { MAINS, STRENGTH } from '../../../../game/plant/water-treatment';
import {
  PLANT_SETTINGS,
  newController,
  stepController,
} from './dosing-controller';
import type { ControllerState, DoseChannel } from './dosing-controller';
import {
  DRIFTED_PROBES,
  IDEAL_PROBES,
  cellSignals,
  newSampleCell,
  stepSampleCell,
  testSample,
} from './sample-cell';
import type {
  PhProbePlace,
  SampleCellState,
  SampleWater,
  TestResult,
} from './sample-cell';

/**
 * Dev44's dosing controller trial (prompt 105): each controller, the
 * Olympic's CX-7 and the Lounge's DC-1 pair, on a small demonstration
 * pool of its own, not the world's. Each pool is one well-mixed water of
 * the Lounge's size (139 m³, its surface and turnover) in the chemistry
 * model (`game/water/pool-chemistry.ts`), a steady few bathers using its
 * chlorine and the air taking its CO₂ (so its pH climbs); its sample line
 * to its controller's cell (`sample-cell.ts`) and back; its controller
 * (`dosing-controller.ts`) driving its two dosing pumps, whose delivered
 * litres (the pumps' own, in the room) are what reach the water.
 *
 * Faults to try, besides the cell's own valve and regulator: a slug of
 * soda ash (a pH excursion, locking chlorine out) or of acid; the
 * hypochlorite pump's suction valve shut (it strokes and delivers nothing,
 * so the chlorine sags and the maximum dosing time trips); the probes
 * drifted (as a fortnight unattended) or new; the pH electrode in a
 * buffer. The trial runs at a pace the station sets, the plant's time
 * many times the walker's. Pure.
 */

/** The demonstration water: the Lounge's (`pools.ts`: 138.9 m³). */
export const DEMO_POOL = {
  volume: 139,
  surface: 115,
  temperature: 29,
  /** A 2.5-hour turnover, m³/h. */
  circulation: 139 / 2.5,
  /** Bathers in the water all the while, and a visit's length, h. */
  bathers: 12,
  visitHours: 1,
  airCo2: 800,
} as const;

/** Each pump's most, l/h: the rooms' (DMX 1602 and DDS 7.5-16). */
export const DEMO_PUMPS: Record<DoseChannel, number> = {
  hypochlorite: 2.1,
  acid: 7.5,
};

/** The chemistry is stepped every this many plant seconds. */
export const DEMO_TICK = 10;

export type TrialSide = 'olympic' | 'lounge';

export interface SideState {
  water: PoolChemistry;
  cell: SampleCellState;
  controller: ControllerState;
  /** The hypochlorite pump's suction isolating valve. */
  hypoSuctionOpen: boolean;
  /** Litres each pump delivered, since the start; what is waiting to reach the water. */
  delivered: Record<DoseChannel, number>;
  pending: { seconds: number; hypochlorite: number; acid: number };
  /** The last sample tested by hand, and when (plant seconds). */
  test: (TestResult & { at: number }) | null;
}

export interface TrialState {
  /** Plant seconds a walker's second. */
  pace: number;
  olympic: SideState;
  lounge: SideState;
}

export const PACES = [1, 60, 600] as const;

/** The water a demo pool starts with: settled, at its setpoints. */
export function demoWater(): PoolChemistry {
  return waterFrom({
    ph: 7.3,
    alkalinity: 60,
    hardness: 210,
    tds: 750,
    temperature: DEMO_POOL.temperature,
    freeChlorine: 1.3,
    sulphate: 43,
  });
}

/** What a water gives a sample cell. */
export function sampleOf(w: PoolChemistry): SampleWater {
  const r = readings(w, DEMO_POOL.temperature);
  return {
    free: w.freeChlorine,
    total: r.totalChlorine,
    ph: w.ph,
    temperature: DEMO_POOL.temperature,
  };
}

function newSide(side: TrialSide): SideState {
  const water = demoWater();
  const cell = newSampleCell(sampleOf(water), {
    total: side === 'olympic',
    redox: side === 'olympic',
  });
  return {
    water,
    cell,
    controller: newController(PLANT_SETTINGS, cellSignals(cell), 0.1),
    hypoSuctionOpen: true,
    delivered: { hypochlorite: 0, acid: 0 },
    pending: { seconds: 0, hypochlorite: 0, acid: 0 },
    test: null,
  };
}

export const newControllerTrial = (): TrialState => ({
  pace: 60,
  olympic: newSide('olympic'),
  lounge: newSide('lounge'),
});

/** The pumps' demand from a side's controller: released, and its rate in l/h. */
export function pumpDemand(s: SideState, c: DoseChannel) {
  return {
    running: s.controller.release[c],
    rate: s.controller.yout[c] * DEMO_PUMPS[c],
  };
}

/**
 * A side `dt` plant seconds on, its pumps delivering at these rates
 * (l/h, as the pumps in the room run), and with these pump faults.
 */
export function stepSide(
  s: SideState,
  rates: Record<DoseChannel, number>,
  pumpFault: Record<DoseChannel, boolean>,
  dt: number,
): SideState {
  if (!(dt > 0)) return s;
  const litres = {
    hypochlorite: s.hypoSuctionOpen ? (rates.hypochlorite * dt) / 3600 : 0,
    acid: (rates.acid * dt) / 3600,
  };
  const pending = {
    seconds: s.pending.seconds + dt,
    hypochlorite: s.pending.hypochlorite + litres.hypochlorite,
    acid: s.pending.acid + litres.acid,
  };
  let water = s.water;
  let next = pending;
  if (pending.seconds >= DEMO_TICK) {
    const hypo = pending.hypochlorite * STRENGTH.hypochlorite;
    water = stepChemistry(
      water,
      {
        volume: DEMO_POOL.volume,
        temperature: DEMO_POOL.temperature,
        surface: DEMO_POOL.surface,
        circulation: DEMO_POOL.circulation,
        added: {
          hypochlorite: hypo,
          chlorate: hypo * STRENGTH.chlorate,
          hcl: pending.acid * STRENGTH.acid,
        },
        bathers: DEMO_POOL.bathers,
        visitHours: DEMO_POOL.visitHours,
        agitation: 0.2,
        airCo2: DEMO_POOL.airCo2,
        mains: waterFrom(MAINS),
      },
      pending.seconds,
    ).water;
    next = { seconds: 0, hypochlorite: 0, acid: 0 };
  }
  const cell = stepSampleCell(s.cell, sampleOf(water), dt);
  const controller = stepController(
    s.controller,
    { cell: cellSignals(cell), circulating: true, pumpFault },
    dt,
  );
  return {
    ...s,
    water,
    cell,
    controller,
    delivered: {
      hypochlorite: s.delivered.hypochlorite + litres.hypochlorite,
      acid: s.delivered.acid + litres.acid,
    },
    pending: next,
  };
}

/** The plant seconds a walker's `delta` brings, in steps of at most a second. */
export function plantSteps(pace: number, delta: number): number[] {
  const total = pace * Math.min(0.25, Math.max(0, delta));
  const n = Math.max(1, Math.ceil(total / 1));
  return Array.from({ length: n }, () => total / n);
}

// ---- The faults and the hand's work --------------------------------------------

/** A slug of soda ash (g) or acid (l of 10 % HCl) into a side's water, mixed at once. */
export function slug(s: SideState, what: 'soda-ash' | 'acid'): SideState {
  const water = dose(
    s.water,
    what === 'soda-ash' ? { sodaAsh: 1500 } : { hcl: 10 * STRENGTH.acid },
    DEMO_POOL.volume,
    DEMO_POOL.temperature,
  );
  return { ...s, water };
}

export const setProbesDrifted = (
  s: SideState,
  drifted: boolean,
): SideState => ({
  ...s,
  cell: { ...s.cell, probes: drifted ? DRIFTED_PROBES : IDEAL_PROBES },
});

export const probesDrifted = (s: SideState) => s.cell.probes !== IDEAL_PROBES;

export const setPhProbe = (s: SideState, at: PhProbePlace): SideState => ({
  ...s,
  cell: { ...s.cell, phProbe: at },
});

export const setSampleValve = (s: SideState, open: boolean): SideState => ({
  ...s,
  cell: { ...s.cell, valveOpen: open },
});

export const setRegulator = (s: SideState, opening: number): SideState => ({
  ...s,
  cell: { ...s.cell, regulator: Math.max(0, Math.min(1, opening)) },
});

export const setHypoSuction = (s: SideState, open: boolean): SideState => ({
  ...s,
  hypoSuctionOpen: open,
});

/** A sample drawn at the cell's tap and tested. */
export const drawSample = (s: SideState): SideState => ({
  ...s,
  test: { ...testSample(s.cell), at: s.controller.clock },
});
