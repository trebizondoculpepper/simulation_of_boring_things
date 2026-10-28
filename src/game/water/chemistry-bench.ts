import {
  acidFor,
  mixWaters,
  readings,
  stepChemistry,
  waterFrom,
  MOLAR,
} from './pool-chemistry';
import { POOLS } from '../plant-sizing/pools.config';
import { ASSUME, sizePlant } from '../plant-sizing/sizing';
import { BALANCE_TANK, volumeOf } from '../plant/balance-tank';
import { JACUZZI_BALANCE_TANK } from '../plant/spa-balance-tank';
import { POOL_IDS, POOL_TARGET } from '../plant/pools';
import type {
  Additions,
  ChemistryFluxes,
  PoolChemistry,
  WaterSpec,
} from './pool-chemistry';

/**
 * The water-chemistry bench (the owner, 2026-10-28: "test the chemistry
 * model in an abstract way before installing it into the game"): an
 * abstract pool, its circulation, an ideal dosing controller and its two
 * pumps, bathers on a daily timetable and fresh water by PWTAG's 30 litres
 * a bather, stepped through scripted scenarios. Each scenario runs in three
 * phases (the owner): a steady state, checked to be steady; a problem a
 * real pool has; and the recommended treatment, its result checked against
 * thresholds from PWTAG or standard practice. Pure and headless: run by the
 * tests beside it and by `scripts/chemistry-bench-report.test.ts`, which
 * draws the charts. Nothing here is in the world.
 *
 * The circuit is either one well-mixed volume (the model the game would
 * use) or two, the pool and its balance tank, exchanging the circulation's
 * flow, so the bench can show what the single volume gets wrong.
 */

// ---- The pool, its plant and its day ---------------------------------------------

export interface BenchPool {
  name: string;
  /** The pool's water, m³, and its balance tank's, m³: the circuit holds both. */
  volume: number;
  balanceTank: number;
  /** Water surface, m², and mean depth, m. */
  surface: number;
  temperature: number;
  /** Circulation, m³/h. */
  circulation: number;
  /** Bathers a day, the most in the water at once, and a visit's length, h. */
  bathersPerDay: number;
  maxBathers: number;
  visitHours: number;
  /** Fresh water a bather, m³ (PWTAG: 30 litres), and evaporation, m³ a day. */
  freshPerBather: number;
  evaporation: number;
  /** The hall's air, ppm CO₂. */
  airCo2: number;
  /** The mains' water, as a test kit gives it. */
  mains: WaterSpec;
  /** The pool's water when first filled and balanced. */
  start: WaterSpec;
}

/** A 25 m community pool: 25 × 12.5 m, 1.5 m mean depth, a three-hour turnover, UV on. */
export const POOL_25M: BenchPool = {
  name: '25 m pool',
  volume: 470,
  balanceTank: 30,
  surface: 312.5,
  temperature: 28,
  circulation: 500 / 3,
  bathersPerDay: 600,
  maxBathers: 115,
  visitHours: 1,
  freshPerBather: 0.03,
  evaporation: 1.5,
  airCo2: 800,
  // A moderately hard supply (the owner has not chosen; `water-chemistry-models.md` §9).
  mains: {
    ph: 7.6,
    alkalinity: 150,
    hardness: 200,
    tds: 350,
    temperature: 10,
    freeChlorine: 0.3,
    sulphate: 40,
  },
  start: {
    ph: 7.3,
    alkalinity: 120,
    hardness: 200,
    tds: 800,
    temperature: 28,
    freeChlorine: 1.5,
    sulphate: 60,
  },
};

export interface Plant {
  /** Hypochlorite's strength, g/l available chlorine, and its pump's full rate, l/h. */
  hypoStrength: number;
  hypoPump: number;
  /** Chlorate in the hypochlorite, g per g of available chlorine (a fresh product: _invented_ 0.02). */
  hypoChlorate: number;
  /** Acid's strength, g/l HCl (10 % w/w at 1.048), and its pump's full rate, l/h. */
  acidStrength: number;
  acidPump: number;
  /** Setpoints: free chlorine, mg/l, and pH. */
  fcSetpoint: number;
  phSetpoint: number;
  /** Proportional bands (full output this far from setpoint) and chlorine's integral time, h. */
  fcBand: number;
  fcIntegral: number;
  phBand: number;
  /** The sample cell's lag, s (`water-sampling.md`: a minute or so). */
  sampleLag: number;
  /** Faults and settings a scenario changes. */
  hypoFailed: boolean;
  acidFailed: boolean;
  /** The acid pump stuck at full (a controller fault). */
  acidStuck: boolean;
  /** Controllers isolated (as for superchlorination, TN23). */
  isolated: boolean;
  uv: boolean;
  /** Bathers, and fresh water, as multiples of the pool's day. */
  batherFactor: number;
  freshFactor: number;
  /** Pool closed: no bathers. */
  closed: boolean;
}

export const PLANT: Plant = {
  hypoStrength: 140,
  hypoPump: 4,
  hypoChlorate: 0.02,
  acidStrength: 104.8,
  acidPump: 4,
  fcSetpoint: 1.5,
  phSetpoint: 7.3,
  fcBand: 0.3,
  fcIntegral: 0.5,
  phBand: 0.3,
  sampleLag: 60,
  hypoFailed: false,
  acidFailed: false,
  acidStuck: false,
  isolated: false,
  uv: true,
  batherFactor: 1,
  freshFactor: 1,
  closed: false,
};

/** The share of the day's bathers in the water at an hour of the day: open 06:30 to 22:00, busiest 17:00 to 20:00. */
export function batherProfile(hourOfDay: number): number {
  const h = ((hourOfDay % 24) + 24) % 24;
  if (h < 6.5 || h >= 22) return 0;
  return h >= 17 && h < 20 ? 2 : 1;
}
/** The profile's integral over a day, hours. */
const PROFILE_HOURS = (17 - 6.5) * 1 + 3 * 2 + 2 * 1;

// ---- The bench's state -----------------------------------------------------------

export type Circuit = 'one' | 'two';

export interface BenchState {
  /** Hours since the run began. */
  t: number;
  /** The pool's water (the whole circuit's, with one volume). */
  pool: PoolChemistry;
  /** The balance tank's, with two volumes. */
  tank: PoolChemistry | null;
  plant: Plant;
  /** The sample cell's water: its chlorine and pH, lagging the sample. */
  cell: { fc: number; ph: number };
  /** The chlorine controller's integral. */
  integral: number;
  /** Litres pumped so far. */
  hypoLitres: number;
  acidLitres: number;
  /** Controller outputs, 0 to 1, at the last step. */
  hypoOut: number;
  acidOut: number;
  /** Hand doses waiting to be added, by where. */
  pending: { where: 'pool' | 'tank'; added: Additions }[];
  /** Fluxes summed since the start. */
  fluxes: ChemistryFluxes;
}

export function newBench(
  pool: BenchPool,
  plant: Plant = PLANT,
  circuit: Circuit = 'two',
): BenchState {
  const water = waterFrom(pool.start);
  return {
    t: 0,
    pool: water,
    tank: circuit === 'two' ? { ...water } : null,
    plant,
    cell: { fc: water.freeChlorine, ph: water.ph },
    integral: 0,
    hypoLitres: 0,
    acidLitres: 0,
    hypoOut: 0,
    acidOut: 0,
    pending: [],
    fluxes: {
      chlorineReduced: 0,
      trichloramineToAir: 0,
      nitrogenGas: 0,
      nitrogenToAir: 0,
      co2ToAir: 0,
    },
  };
}

const sumFluxes = (
  a: ChemistryFluxes,
  b: ChemistryFluxes,
): ChemistryFluxes => ({
  chlorineReduced: a.chlorineReduced + b.chlorineReduced,
  trichloramineToAir: a.trichloramineToAir + b.trichloramineToAir,
  nitrogenGas: a.nitrogenGas + b.nitrogenGas,
  nitrogenToAir: a.nitrogenToAir + b.nitrogenToAir,
  co2ToAir: a.co2ToAir + b.co2ToAir,
});

/** The bathers in the water at time `t` hours. */
export function bathersAt(pool: BenchPool, plant: Plant, t: number): number {
  if (plant.closed) return 0;
  return (
    (pool.bathersPerDay *
      pool.visitHours *
      plant.batherFactor *
      batherProfile(t)) /
    PROFILE_HOURS
  );
}

/** Hand doses into the circuit: they go in at the next step. */
export const handDose = (
  s: BenchState,
  added: Additions,
  where: 'pool' | 'tank' = 'tank',
): BenchState => ({
  ...s,
  pending: [...s.pending, { where, added }],
});

const addInto = (a: Additions, b: Additions): Additions => {
  const out: Additions = { ...a };
  for (const [k, v] of Object.entries(b) as [keyof Additions, number][])
    out[k] = (out[k] ?? 0) + v;
  return out;
};

/**
 * The bench `dt` seconds on: the controller reads its cell and sets its
 * pumps; what they pump, the hand doses, the bathers and the fresh water
 * go in; the water reacts; with two volumes the pool and balance tank
 * exchange the circulation's flow, exactly.
 */
export function stepBench(
  s: BenchState,
  pool: BenchPool,
  dt: number,
): BenchState {
  const p = s.plant;
  const hours = dt / 3600;
  // The controller: PI on chlorine, P on pH, from the cell's readings.
  const fcError = p.fcSetpoint - s.cell.fc;
  const integral = p.isolated
    ? 0
    : Math.min(
        p.fcBand,
        Math.max(-p.fcBand, s.integral + (fcError * hours) / p.fcIntegral),
      );
  const hypoOut = p.isolated
    ? 0
    : Math.min(1, Math.max(0, (fcError + integral) / p.fcBand));
  const acidOut = p.acidStuck
    ? 1
    : p.isolated
      ? 0
      : Math.min(1, Math.max(0, (s.cell.ph - p.phSetpoint) / p.phBand));
  const hypoL = p.hypoFailed ? 0 : hypoOut * p.hypoPump * hours;
  const acidL = p.acidFailed ? 0 : acidOut * p.acidPump * hours;
  const dosed: Additions = {
    hypochlorite: hypoL * p.hypoStrength,
    chlorate: hypoL * p.hypoStrength * p.hypoChlorate,
    hcl: acidL * p.acidStrength,
  };
  let toPool: Additions = dosed;
  let toTank: Additions = {};
  for (const d of s.pending)
    if (d.where === 'pool' || !s.tank) toPool = addInto(toPool, d.added);
    else toTank = addInto(toTank, d.added);

  const bathers = bathersAt(pool, p, s.t);
  const agitation = Math.min(1, (2 * bathers) / pool.maxBathers);
  const visitsPerHour = bathers / pool.visitHours;
  const fresh = visitsPerHour * hours * pool.freshPerBather * p.freshFactor;
  const evap = (pool.evaporation * hours) / 24;
  const mains = waterFrom(pool.mains);
  const uvFlow = p.uv ? pool.circulation : 0;
  const common = { temperature: pool.temperature, mains, airCo2: pool.airCo2 };

  let poolWater: PoolChemistry;
  let tankWater: PoolChemistry | null = null;
  let fluxes = s.fluxes;
  const visit = { bathers, visitHours: pool.visitHours, agitation };
  if (!s.tank) {
    // One volume: the pool and its tank as one well-mixed body.
    const V = pool.volume + pool.balanceTank;
    const r = stepChemistry(
      s.pool,
      {
        ...common,
        ...visit,
        volume: V,
        surface: pool.surface,
        circulation: pool.circulation,
        added: addInto(toPool, toTank),
        freshWater: fresh,
        evaporationMakeUp: evap,
        uvFlow,
      },
      dt,
    );
    poolWater = r.water;
    fluxes = sumFluxes(fluxes, r.fluxes);
  } else {
    // Two zones (the owner, 2026-10-28): the pool, with its bathers and
    // its surface, dosed through its return; the balance tank, which takes
    // the make-up, the hand doses, and passes the plant (UV) on its way out.
    const vPool = pool.volume;
    const vTank = pool.balanceTank;
    const rp = stepChemistry(
      s.pool,
      {
        ...common,
        ...visit,
        volume: vPool,
        surface: pool.surface,
        circulation: pool.circulation,
        added: toPool,
      },
      dt,
    );
    const rt = stepChemistry(
      s.tank,
      {
        ...common,
        volume: vTank,
        surface: 0,
        circulation: pool.circulation,
        added: toTank,
        freshWater: fresh,
        evaporationMakeUp: evap,
        uvFlow,
      },
      dt,
    );
    fluxes = sumFluxes(sumFluxes(fluxes, rp.fluxes), rt.fluxes);
    // The circulation: overflow pool → tank, return tank → pool, at Q. For
    // each species the difference between them decays as e^(−Q(1/Vp + 1/Vt)t)
    // about their volume-weighted mean, exactly.
    const keep = Math.exp(-pool.circulation * hours * (1 / vPool + 1 / vTank));
    const mixed = mixWaters(
      [
        { water: rp.water, volume: vPool },
        { water: rt.water, volume: vTank },
      ],
      pool.temperature,
    );
    const toward = (w: PoolChemistry): PoolChemistry => {
      const out = { ...w };
      for (const k of Object.keys(w) as (keyof PoolChemistry)[])
        if (k !== 'ph') out[k] = mixed[k] + (w[k] - mixed[k]) * keep;
      return out;
    };
    const settle = (w: PoolChemistry) =>
      mixWaters([{ water: w, volume: 1 }], pool.temperature);
    poolWater = settle(toward(rp.water));
    tankWater = settle(toward(rt.water));
  }
  // The sample: from the pump's suction, the balance tank's water (one volume: the pool's), through the cell's lag.
  const sample = tankWater ?? poolWater;
  const lag = 1 - Math.exp(-dt / Math.max(1e-6, p.sampleLag));
  const cell = {
    fc: s.cell.fc + (sample.freeChlorine - s.cell.fc) * lag,
    ph: s.cell.ph + (sample.ph - s.cell.ph) * lag,
  };
  return {
    ...s,
    t: s.t + hours,
    pool: poolWater,
    tank: tankWater,
    cell,
    integral,
    hypoLitres: s.hypoLitres + hypoL,
    acidLitres: s.acidLitres + acidL,
    hypoOut: p.hypoFailed ? 0 : hypoOut,
    acidOut: p.acidFailed ? 0 : acidOut,
    pending: [],
    fluxes,
  };
}

// ---- Scenarios -------------------------------------------------------------------

/** One sample of a run, every `sampleEvery` hours. */
export interface Sample {
  t: number;
  freeChlorine: number;
  combined: number;
  chloramine: number;
  organicChloramine: number;
  trichloramine: number;
  ammonia: number;
  urea: number;
  ph: number;
  alkalinity: number;
  carbonate: number;
  hardness: number;
  tds: number;
  sulphate: number;
  chlorate: number;
  thiosulphate: number;
  langelier: number;
  csi: number;
  hocl: number;
  bathers: number;
  hypoLitres: number;
  acidLitres: number;
  hypoOut: number;
  acidOut: number;
  /** The balance tank's free chlorine and pH, with two volumes. */
  tankFreeChlorine?: number;
  tankPh?: number;
}

export function sampleOf(s: BenchState, pool: BenchPool): Sample {
  const w = s.pool;
  const r = readings(w, pool.temperature);
  return {
    t: s.t,
    freeChlorine: w.freeChlorine,
    combined: r.combinedChlorine,
    chloramine: w.chloramine,
    organicChloramine: w.organicChloramine,
    trichloramine: w.trichloramine,
    ammonia: w.ammonia,
    urea: w.urea,
    ph: w.ph,
    alkalinity: w.alkalinity,
    carbonate: w.carbonate,
    hardness: w.hardness,
    tds: w.tds,
    sulphate: w.sulphate,
    chlorate: w.chlorate,
    thiosulphate: w.thiosulphate,
    langelier: r.langelier,
    csi: r.csi,
    hocl: r.hocl,
    bathers: bathersAt(pool, s.plant, s.t),
    hypoLitres: s.hypoLitres,
    acidLitres: s.acidLitres,
    hypoOut: s.hypoOut,
    acidOut: s.acidOut,
    ...(s.tank
      ? { tankFreeChlorine: s.tank.freeChlorine, tankPh: s.tank.ph }
      : {}),
  };
}

/** Something done at an hour of a run: a fault, a hand dose, a setting changed. */
export interface BenchEvent {
  at: number;
  label: string;
  /** Which phase it opens, for the charts. */
  phase?: 'problem' | 'treatment';
  apply: (s: BenchState, pool: BenchPool) => BenchState;
}

export interface Check {
  name: string;
  /** What should happen, and the source that says so. */
  expected: string;
  source: string;
  /** The threshold checked, in words. */
  threshold: string;
  /** What the run gave, in words. */
  measured: string;
  pass: boolean;
}

export interface Run {
  samples: Sample[];
  events: { at: number; label: string; phase?: 'problem' | 'treatment' }[];
  final: BenchState;
}

/** Runs a bench from `start` for `hours`, applying events at their hours, sampling as it goes. */
export function runBench(
  start: BenchState,
  pool: BenchPool,
  hours: number,
  events: readonly BenchEvent[] = [],
  dt = 60,
  sampleEvery = 0.25,
): Run {
  let s = start;
  const t0 = s.t;
  const queue = [...events].sort((a, b) => a.at - b.at);
  const samples: Sample[] = [sampleOf(s, pool)];
  let nextSample = t0 + sampleEvery;
  const steps = Math.round((hours * 3600) / dt);
  for (let n = 0; n < steps; n++) {
    while (queue.length && queue[0].at <= s.t - t0 + 1e-9)
      s = queue.shift()!.apply(s, pool);
    s = stepBench(s, pool, dt);
    if (s.t >= nextSample - 1e-9) {
      samples.push(sampleOf(s, pool));
      nextSample += sampleEvery;
    }
  }
  return {
    samples,
    events: events.map((e) => ({
      at: t0 + e.at,
      label: e.label,
      phase: e.phase,
    })),
    final: s,
  };
}

const warmCache = new Map<string, BenchState>();

/**
 * A bench brought to its steady state: `days` of its normal day from its
 * first fill (the slow species, alkalinity, TDS and chlorate, take weeks).
 * Kept, so scenarios on the same pool and plant share it.
 */
export function warmedUp(
  pool: BenchPool,
  plant: Plant = PLANT,
  circuit: Circuit = 'two',
  days = 120,
): BenchState {
  const key = JSON.stringify([pool, plant, circuit, days]);
  const hit = warmCache.get(key);
  if (hit) return hit;
  const run = runBench(
    newBench(pool, plant, circuit),
    pool,
    days * 24,
    [],
    120,
    24,
  );
  const s = { ...run.final, t: 0 };
  warmCache.set(key, s);
  return s;
}

// ---- Measures over a run ---------------------------------------------------------

export const within = (samples: readonly Sample[], from: number, to: number) =>
  samples.filter((x) => x.t >= from - 1e-9 && x.t <= to + 1e-9);
export const mean = (xs: readonly number[]) =>
  xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
export const maxOf = (xs: readonly number[]) =>
  xs.reduce((a, b) => Math.max(a, b), -Infinity);
export const minOf = (xs: readonly number[]) =>
  xs.reduce((a, b) => Math.min(a, b), Infinity);
/** The first sample time at or after `from` when `test` holds, or Infinity. */
export function firstTime(
  samples: readonly Sample[],
  from: number,
  test: (x: Sample) => boolean,
): number {
  for (const x of samples) if (x.t >= from - 1e-9 && test(x)) return x.t;
  return Infinity;
}

/**
 * Is the first `hours` of a run steady (the owner: "check that it really
 * is steady first")? Its second day's means against its first's: free
 * chlorine within 0.05 mg/l, combined within 0.05, pH within 0.02,
 * alkalinity within 2 mg/l, TDS within 1 %.
 */
export function steadyCheck(samples: readonly Sample[]): Check {
  const a = within(samples, 0, 24);
  const b = within(samples, 24, 48);
  const d = (k: keyof Sample) =>
    Math.abs(
      mean(b.map((x) => x[k] as number)) - mean(a.map((x) => x[k] as number)),
    );
  const dFc = d('freeChlorine');
  const dCc = d('combined');
  const dPh = d('ph');
  const dTa = d('alkalinity');
  const dTds = d('tds') / mean(a.map((x) => x.tds));
  return {
    name: 'steady state',
    expected:
      'The pool at its normal day repeats itself day after day before the problem is applied.',
    source: 'the owner, 2026-10-28',
    threshold:
      'day 2 against day 1 means: FC ±0.05, CC ±0.05 mg/l, pH ±0.02, TA ±2 mg/l, TDS ±1 %',
    measured: `ΔFC ${dFc.toFixed(3)}, ΔCC ${dCc.toFixed(3)}, ΔpH ${dPh.toFixed(3)}, ΔTA ${dTa.toFixed(2)}, ΔTDS ${(dTds * 100).toFixed(2)} %`,
    pass: dFc <= 0.05 && dCc <= 0.05 && dPh <= 0.02 && dTa <= 2 && dTds <= 0.01,
  };
}

// ---- The scenarios -----------------------------------------------------------------

export interface Scenario {
  id: string;
  title: string;
  pool: BenchPool;
  plant?: Partial<Plant>;
  /** Hours: the steady phase is 0 to 48; the problem and treatment come after. */
  hours: number;
  events: BenchEvent[];
  /** Its checks, from the run. */
  checks: (run: Run) => Check[];
}

const set =
  (change: Partial<Plant>) =>
  (s: BenchState): BenchState => ({ ...s, plant: { ...s.plant, ...change } });

const STEADY = 48;
/** Events every `interval` hours from `from` to `to`. */
const every = (
  from: number,
  to: number,
  interval: number,
  e: Omit<BenchEvent, 'at'>,
): BenchEvent[] => {
  const out: BenchEvent[] = [];
  for (let t = from; t <= to + 1e-9; t += interval) out.push({ ...e, at: t });
  return out;
};
/** TN23's two-hourly check by hand: phenol red, and acid into the balance tank if pH is over `ph`. */
const handAcidIfOver =
  (over: number, to: number) => (s: BenchState, pool: BenchPool) =>
    s.pool.ph > over
      ? handDose(s, {
          hcl: acidFor(
            s.pool,
            to,
            pool.volume + pool.balanceTank,
            pool.temperature,
          ),
        })
      : s;
/** The same change to the water in every zone. */
const changeWater = (
  s: BenchState,
  f: (w: PoolChemistry) => PoolChemistry,
): BenchState => ({
  ...s,
  pool: f(s.pool),
  tank: s.tank ? f(s.tank) : null,
});
/** Grams to raise (or lower) something by `perM3` grams a cubic metre in the whole circuit. */
const grams = (pool: BenchPool, perM3: number) =>
  perM3 * (pool.volume + pool.balanceTank);
const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : 'never');
const hoursAfter = (t: number, from: number) =>
  Number.isFinite(t) ? `${(t - from).toFixed(1)} h` : 'never';

export const SCENARIOS: Scenario[] = [
  {
    id: 'combined-chlorine',
    title:
      'High combined chlorine: a heavy week with the UV failed; superchlorination and dilution',
    pool: POOL_25M,
    hours: STEADY + 96 + 48,
    events: [
      {
        at: STEADY,
        label: 'UV fails; bathers ×2.5',
        phase: 'problem',
        apply: set({ uv: false, batherFactor: 2.5 }),
      },
      {
        at: STEADY + 96,
        label: 'closed; UV back; superchlorinate to 10 mg/l; fresh water ×4',
        phase: 'treatment',
        apply: (s, pool) =>
          handDose(
            set({
              uv: true,
              batherFactor: 1,
              closed: true,
              freshFactor: 4,
              fcSetpoint: 10,
              fcBand: 2,
            })(s),
            {
              hypochlorite: grams(pool, 8.5),
            },
          ),
      },
      {
        at: STEADY + 96 + 24,
        label: 'setpoint back to 1.5; reopened',
        apply: set({
          fcSetpoint: 1.5,
          fcBand: 0.3,
          closed: false,
          freshFactor: 1,
        }),
      },
    ],
    checks: (run) => {
      const problemEnd = STEADY + 96;
      const peak = maxOf(
        within(run.samples, STEADY, problemEnd).map((x) => x.combined),
      );
      const back = firstTime(run.samples, problemEnd, (x) => x.combined < 0.5);
      const after = within(run.samples, problemEnd + 24, problemEnd + 48);
      const ccAfter = maxOf(after.map((x) => x.combined));
      const halfFc = after.every((x) => x.combined <= 0.5 * x.freeChlorine);
      return [
        {
          name: 'the problem appears',
          expected:
            'Without UV and with heavy bathing, combined chlorine climbs past PWTAG’s 1 mg/l.',
          source:
            'PWTAG CoP §9.7 (combined ≤ 1 mg/l, < ½ free); §3.5 (UV reduces chloramines)',
          threshold:
            'combined chlorine peaks above 1.0 mg/l in the problem phase',
          measured: `peak ${fmt(peak)} mg/l`,
          pass: peak > 1,
        },
        {
          name: 'superchlorination clears it',
          expected:
            'Raised free chlorine, UV and dilution bring combined chlorine down within the day.',
          source: 'PWTAG TN23; CoP §9.7, §3.6',
          threshold:
            'combined chlorine below 0.5 mg/l within 24 h of treatment',
          measured: `below 0.5 after ${hoursAfter(back, problemEnd)}`,
          pass: back - problemEnd <= 24,
        },
        {
          name: 'and it stays clear when reopened',
          expected:
            'Back at normal setpoint and bathing, combined chlorine stays under 1 mg/l and under half the free.',
          source: 'PWTAG CoP §9.7',
          threshold:
            'combined ≤ 1.0 mg/l and ≤ ½ free chlorine through the day after reopening',
          measured: `max ${fmt(ccAfter)} mg/l; under half free: ${halfFc ? 'yes' : 'no'}`,
          pass: ccAfter <= 1 && halfFc,
        },
      ];
    },
  },
  {
    id: 'low-alkalinity',
    title: 'Low alkalinity, the pH bouncing; sodium bicarbonate',
    pool: POOL_25M,
    hours: STEADY + 48 + 72,
    events: [
      {
        at: STEADY,
        label:
          'alkalinity drained to about 40 (acid by hand, as after weeks of acid dosing)',
        phase: 'problem',
        apply: (s, pool) => {
          const drop = Math.max(0, s.pool.alkalinity - 40);
          return handDose(s, { hcl: grams(pool, drop * 0.73) });
        },
      },
      {
        at: STEADY + 48,
        label:
          'sodium bicarbonate to raise alkalinity to 120 (1.68 g/m³ per mg/l)',
        phase: 'treatment',
        apply: (s, pool) =>
          handDose(s, {
            bicarbonate: grams(
              pool,
              Math.max(0, 120 - s.pool.alkalinity) * 1.68,
            ),
          }),
      },
    ],
    checks: (run) => {
      // The problem's second day, after the drained water has recovered from the acid itself.
      const prob = within(run.samples, STEADY + 24, STEADY + 48);
      const treat = within(run.samples, STEADY + 48 + 24, STEADY + 48 + 72);
      const steady = within(run.samples, 0, STEADY);
      const range = (xs: Sample[]) => {
        // the day-to-day swing: the mean of each day's (max − min)
        const days = [0, 24].map((o) =>
          xs.filter((x) => x.t >= xs[0].t + o && x.t < xs[0].t + o + 24),
        );
        return mean(
          days
            .filter((d) => d.length)
            .map((d) => maxOf(d.map((x) => x.ph)) - minOf(d.map((x) => x.ph))),
        );
      };
      const taProb = mean(prob.map((x) => x.alkalinity));
      const taTreat = mean(treat.map((x) => x.alkalinity));
      const swingProb = range(prob);
      const swingTreat = range(treat);
      const swingSteady = range(steady);
      const phTreat = mean(treat.map((x) => x.ph));
      return [
        {
          name: 'alkalinity is low',
          expected: 'Alkalinity below PWTAG’s 80 mg/l.',
          source: 'PWTAG CoP §9.9 (80–200 mg/l, "to ensure … a stable pH")',
          threshold: 'mean alkalinity in the problem phase < 80 mg/l',
          measured: `${fmt(taProb, 0)} mg/l`,
          pass: taProb < 80,
        },
        {
          name: 'the pH swings more with less buffer',
          expected:
            'Low alkalinity lets the pH move further for the same loads.',
          source: '`pool-dosing-and-water-chemistry.md` §2.4 (buffering)',
          threshold:
            'daily pH swing in the problem phase larger than at steady state',
          measured: `swing ${fmt(swingProb, 3)} against ${fmt(swingSteady, 3)} at steady state`,
          pass: swingProb > swingSteady,
        },
        {
          name: 'bicarbonate restores it',
          expected:
            'Bicarbonate raises alkalinity to its dose with little change of pH, and the swing narrows.',
          source: 'PWTAG CoP §9.9; `pool-dosing-and-water-chemistry.md` §5.1',
          threshold:
            'alkalinity 100–140 mg/l, pH 7.2–7.4, swing smaller than in the problem phase',
          measured: `TA ${fmt(taTreat, 0)}, pH ${fmt(phTreat)}, swing ${fmt(swingTreat, 3)}`,
          pass:
            taTreat >= 100 &&
            taTreat <= 140 &&
            phTreat >= 7.2 &&
            phTreat <= 7.4 &&
            swingTreat < swingProb,
        },
      ];
    },
  },
  {
    id: 'high-ph',
    title: 'High pH: the acid pump fails; acid restored',
    pool: POOL_25M,
    hours: STEADY + 48 + 24,
    events: [
      {
        at: STEADY,
        label: 'acid pump fails',
        phase: 'problem',
        apply: set({ acidFailed: true }),
      },
      {
        at: STEADY + 48,
        label: 'acid pump repaired',
        phase: 'treatment',
        apply: set({ acidFailed: false }),
      },
    ],
    checks: (run) => {
      const peak = maxOf(
        within(run.samples, STEADY, STEADY + 48).map((x) => x.ph),
      );
      const back = firstTime(run.samples, STEADY + 48, (x) => x.ph <= 7.4);
      const prob = within(run.samples, STEADY, STEADY + 48);
      const at = prob.reduce((m, x) => (x.ph > m.ph ? x : m), prob[0]);
      const before = mean(
        within(run.samples, 0, STEADY).map((x) => x.hocl / x.freeChlorine),
      );
      const share = at.hocl / at.freeChlorine;
      const e =
        1.18e-4 * (POOL_25M.temperature + 273.15) ** 2 -
        7.86e-2 * (POOL_25M.temperature + 273.15) +
        20.5;
      const textbook = 1 / (1 + 10 ** (at.ph - e));
      return [
        {
          name: 'pH rises without acid',
          expected: 'CO₂ loss drives pH up towards 8 and beyond without acid.',
          source: 'Wojtowicz 2001; PWTAG CoP §9.8 (7.0–7.4)',
          threshold: 'pH passes 7.6 within 48 h',
          measured: `peak ${fmt(peak)}`,
          pass: peak > 7.6,
        },
        {
          name: 'HOCl’s share falls with it, as speciation says',
          expected:
            'At higher pH less of the free chlorine is HOCl, by α = 1/(1 + 10^(pH − pKa)).',
          source:
            'PWTAG CoP §6 ("each 0.5 increase in pH … doubles the chlorine needed"); Morris 1966 via the EPA simulator',
          threshold:
            'HOCl share at the peak pH within 0.05 of the textbook α (the model’s Davies activity correction moves it about 0.03), and below the steady share',
          measured: `share ${fmt(share, 3)} at pH ${fmt(at.ph)} (textbook ${fmt(textbook, 3)}); steady ${fmt(before, 3)}`,
          pass: Math.abs(share - textbook) <= 0.05 && share < before,
        },
        {
          name: 'acid brings it back',
          expected: 'With the acid pump back, pH returns to range.',
          source: 'PWTAG CoP §9.8',
          threshold: 'pH ≤ 7.4 within 12 h',
          measured: `${hoursAfter(back, STEADY + 48)}`,
          pass: back - (STEADY + 48) <= 12,
        },
      ];
    },
  },
  {
    id: 'acid-overdose',
    title: 'Low pH: the acid pump stuck at full overnight; stop acid, soda ash',
    pool: POOL_25M,
    hours: STEADY + 12 + 48,
    events: [
      {
        at: STEADY,
        label: 'acid pump stuck at full (00:00)',
        phase: 'problem',
        apply: set({ acidStuck: true }),
      },
      {
        at: STEADY + 10,
        label:
          'acid stopped; soda ash to restore alkalinity to 110 (1.06 g/m³ per mg/l)',
        phase: 'treatment',
        apply: (s, pool) =>
          handDose(set({ acidStuck: false, acidFailed: true })(s), {
            sodaAsh: grams(pool, Math.max(0, 110 - s.pool.alkalinity) * 1.06),
          }),
      },
      {
        at: STEADY + 22,
        label: 'acid pump back in auto',
        apply: set({ acidFailed: false }),
      },
    ],
    checks: (run) => {
      const low = minOf(
        within(run.samples, STEADY, STEADY + 10).map((x) => x.ph),
      );
      const taLow = minOf(
        within(run.samples, STEADY, STEADY + 10).map((x) => x.alkalinity),
      );
      const after = within(run.samples, STEADY + 34, STEADY + 58);
      const ph = mean(after.map((x) => x.ph));
      const ta = mean(after.map((x) => x.alkalinity));
      return [
        {
          name: 'the overdose',
          expected:
            'Acid at full for hours drops pH below 7.0 and drains alkalinity.',
          source:
            '`pool-dosing-and-water-chemistry.md` §3.3 (pH electrode reads high: acid at full)',
          threshold: 'pH < 7.0 within 12 h',
          measured: `min pH ${fmt(low)}, min TA ${fmt(taLow, 0)} mg/l`,
          pass: low < 7,
        },
        {
          name: 'soda ash recovers it',
          expected:
            'Stopping acid and adding soda ash brings pH and alkalinity back.',
          source:
            'PWTAG CoP glossary (soda ash); `pool-dosing-and-water-chemistry.md` §5.1',
          threshold: 'the day after: pH 7.2–7.5, alkalinity ≥ 80 mg/l',
          measured: `pH ${fmt(ph)}, TA ${fmt(ta, 0)}`,
          pass: ph >= 7.2 && ph <= 7.5 && ta >= 80,
        },
      ];
    },
  },
  {
    id: 'low-hardness',
    title: 'Low calcium hardness, aggressive water; calcium chloride',
    pool: {
      ...POOL_25M,
      mains: { ...POOL_25M.mains, hardness: 40, alkalinity: 40 },
    },
    hours: STEADY + 24 + 48,
    events: [
      {
        at: STEADY,
        label: 'refilled a third from soft mains (hardness 40, alkalinity 40)',
        phase: 'problem',
        apply: (s, pool) => {
          const soft = waterFrom({
            ...pool.mains,
            temperature: pool.temperature,
          });
          const water = mixWaters(
            [
              { water: s.pool, volume: (2 * pool.volume) / 3 },
              { water: soft, volume: pool.volume / 3 },
            ],
            pool.temperature,
          );
          // Hardness lost to softened make-up over the months before (the problem as found).
          return changeWater(s, () => ({ ...water, hardness: 50 }));
        },
      },
      {
        at: STEADY + 24,
        label:
          'calcium chloride to 150 (1.11 g/m³ per mg/l); bicarbonate to alkalinity 100',
        phase: 'treatment',
        apply: (s, pool) =>
          handDose(s, {
            calciumChloride: grams(
              pool,
              Math.max(0, 150 - s.pool.hardness) * 1.11,
            ),
            bicarbonate: grams(
              pool,
              Math.max(0, 100 - s.pool.alkalinity) * 1.68,
            ),
          }),
      },
    ],
    checks: (run) => {
      const prob = within(run.samples, STEADY + 1, STEADY + 24);
      const after = within(run.samples, STEADY + 48, STEADY + 72);
      const lsiProb = mean(prob.map((x) => x.langelier));
      const lsiAfter = mean(after.map((x) => x.langelier));
      const chAfter = mean(after.map((x) => x.hardness));
      return [
        {
          name: 'the water is aggressive',
          expected:
            'Soft, low-alkalinity water has a strongly negative balance index: it etches grout.',
          source:
            'PWTAG CoP §9.10, §9.13; Langelier index (`pool-dosing-and-water-chemistry.md` §2.5)',
          threshold: 'Langelier index < −0.5',
          measured: `LSI ${fmt(lsiProb)}`,
          pass: lsiProb < -0.5,
        },
        {
          name: 'calcium chloride balances it',
          expected:
            'Hardness raised to 150 and alkalinity to 100 bring the index back near zero.',
          source: 'PWTAG CoP §9.10 (80–200 mg/l); §9.13',
          threshold: 'hardness 140–160 mg/l, Langelier index −0.5 to +0.5',
          measured: `CH ${fmt(chAfter, 0)}, LSI ${fmt(lsiAfter)}`,
          pass:
            chAfter >= 140 &&
            chAfter <= 160 &&
            lsiAfter >= -0.5 &&
            lsiAfter <= 0.5,
        },
      ];
    },
  },
  {
    id: 'high-tds',
    title:
      'High TDS after months of too little dilution; dilution with fresh water',
    pool: POOL_25M,
    hours: STEADY + 24 + 24 * 21,
    events: [
      {
        at: STEADY,
        label:
          'TDS found at 1,600 above the mains (months of too little backwashing)',
        phase: 'problem',
        apply: (s, pool) =>
          changeWater(s, (w) => ({ ...w, tds: pool.mains.tds + 1600 })),
      },
      {
        at: STEADY + 24,
        label: 'fresh water ×4 (120 litres a bather) for three weeks',
        phase: 'treatment',
        apply: set({ freshFactor: 4 }),
      },
    ],
    checks: (run) => {
      const t0 = STEADY + 24;
      const end = run.samples[run.samples.length - 1];
      const at0 = within(run.samples, t0, t0)[0] ?? run.samples[0];
      const freshPerDay =
        (POOL_25M.bathersPerDay * POOL_25M.freshPerBather * 4) /
        (POOL_25M.volume + POOL_25M.balanceTank);
      const steadyTds = mean(within(run.samples, 0, STEADY).map((x) => x.tds));
      // Hand calculation: with four times the fresh water the steady excess over the
      // mains is a quarter (the same salts in, four times the water out), and TDS
      // relaxes towards it as e^(−Qt/V).
      const newSteady =
        POOL_25M.mains.tds + (steadyTds - POOL_25M.mains.tds) / 4;
      const predicted =
        newSteady +
        (at0.tds - newSteady) * Math.exp(-freshPerDay * ((end.t - t0) / 24));
      const target = firstTime(
        run.samples,
        t0,
        (x) => x.tds <= POOL_25M.mains.tds + 1000,
      );
      return [
        {
          name: 'dilution brings TDS within PWTAG’s limit',
          expected:
            'TDS falls exponentially with the fresh water, e^(−Qt/V), to within 1,000 mg/l of the mains.',
          source: 'PWTAG CoP §9.11, §3.6',
          threshold: 'TDS ≤ mains + 1,000 within 21 days',
          measured: `reached after ${hoursAfter(target, t0)}; ${fmt(end.tds, 0)} mg/l at the end`,
          pass: target - t0 <= 21 * 24,
        },
        {
          name: 'at the rate dilution predicts',
          expected:
            'The fall matches the exponential law towards the new, lower steady level (evaporation’s make-up ignored).',
          source: '`pool-dosing-and-water-chemistry.md` §2.6',
          threshold: 'final TDS within 10 % of the hand calculation',
          measured: `${fmt(end.tds, 0)} against ${fmt(predicted, 0)} predicted`,
          pass: Math.abs(end.tds - predicted) / predicted <= 0.1,
        },
      ];
    },
  },
  {
    id: 'dechlorination',
    title:
      'Chlorine too high after a shock: sodium thiosulphate before reopening',
    pool: POOL_25M,
    hours: STEADY + 14 + 12,
    events: [
      {
        at: STEADY,
        label:
          'closed, controllers isolated; shocked to 20 mg/l (TN23: diarrhoea)',
        phase: 'problem',
        apply: (s, pool) =>
          handDose(set({ isolated: true, closed: true, uv: false })(s), {
            hypochlorite: grams(pool, Math.max(0, 20 - s.pool.freeChlorine)),
          }),
      },
      ...every(STEADY, STEADY + 12, 2, {
        label: 'two-hourly test: acid by hand to pH 7.4 if over 7.5',
        apply: handAcidIfOver(7.5, 7.4),
      }),
      {
        at: STEADY + 13,
        label:
          'thiosulphate to bring it to 2 mg/l (TN23: 5 g/m³ per mg/l, slightly under)',
        phase: 'treatment',
        apply: (s, pool) =>
          handDose(s, {
            thiosulphate: grams(
              pool,
              5 * Math.max(0, s.pool.freeChlorine - 2.2),
            ),
          }),
      },
      {
        at: STEADY + 14,
        label: 'controllers back; UV on; acid by hand to pH 7.4',
        apply: (st, pool) =>
          handAcidIfOver(7.5, 7.4)(
            set({ isolated: false, uv: true })(st),
            pool,
          ),
      },
      {
        at: STEADY + 16,
        label: 'tested in range; reopened',
        apply: set({ closed: false }),
      },
    ],
    checks: (run) => {
      const hold = within(run.samples, STEADY + 0.5, STEADY + 13);
      const fcHold = minOf(hold.map((x) => x.freeChlorine));
      const after = within(run.samples, STEADY + 13.75, STEADY + 14);
      const fcAfter = mean(after.map((x) => x.freeChlorine));
      const thioLeft = maxOf(after.map((x) => x.thiosulphate));
      const phBefore = mean(
        within(run.samples, STEADY + 12.5, STEADY + 13).map((x) => x.ph),
      );
      const phAfter = mean(after.map((x) => x.ph));
      const back = firstTime(run.samples, STEADY + 14, (x) => x.ph <= 7.5);
      const so4 =
        mean(after.map((x) => x.sulphate)) -
        mean(within(run.samples, STEADY - 1, STEADY).map((x) => x.sulphate));
      return [
        {
          name: 'the shock holds',
          expected:
            'Free chlorine stays high through the contact time, with pH held by hand at 7.5 or lower.',
          source:
            'PWTAG TN23 (20 mg/l for 13 h; test two-hourly; pH to 7.5 or lower)',
          threshold: 'free chlorine ≥ 15 mg/l from 30 min to 13 h',
          measured: `min ${fmt(fcHold, 1)} mg/l`,
          pass: fcHold >= 15,
        },
        {
          name: 'thiosulphate brings it down',
          expected:
            'PWTAG’s 5 g/m³ per mg/l, slightly under-dosed, leaves a little free chlorine and no thiosulphate.',
          source: 'PWTAG TN23',
          threshold:
            'free chlorine 1–3 mg/l, and thiosulphate under 1 % of its dose, within an hour',
          measured: `FC ${fmt(fcAfter)}, thiosulphate ${fmt(thioLeft, 3)} mg/l, sulphate +${fmt(so4, 1)} mg/l`,
          pass: fcAfter >= 1 && fcAfter <= 3 && thioLeft < 0.01 * 5 * 16,
        },
        {
          name: 'pH after dechlorination (a finding, not a pass mark)',
          expected:
            'Thiosulphate going mostly to tetrathionate (as TN23’s dose implies) takes up acid, and the hypochlorite’s alkalinity stays behind: pH rises.',
          source: 'stoichiometry: 2 S₂O₃²⁻ + OCl⁻ + H₂O → S₄O₆²⁻ + Cl⁻ + 2 OH⁻',
          threshold: 'recorded',
          measured: `pH ${fmt(phBefore)} before, ${fmt(phAfter)} after`,
          pass: true,
        },
        {
          name: 'reopened in range',
          expected:
            'Reopen only when free chlorine and pH are back in range: acid by hand brings pH back.',
          source: 'PWTAG TN23',
          threshold: 'pH ≤ 7.5 within 2 h of the acid, before reopening',
          measured: `${hoursAfter(back, STEADY + 14)}`,
          pass: back - (STEADY + 14) <= 2,
        },
      ];
    },
  },
  {
    id: 'weak-delivery',
    title:
      'A weak hypochlorite delivery (100 g/l, not 140): the loop compensates',
    pool: POOL_25M,
    hours: STEADY + 72,
    events: [
      {
        at: STEADY,
        label: 'day tank now 100 g/l',
        phase: 'problem',
        apply: set({ hypoStrength: 100 }),
      },
    ],
    checks: (run) => {
      const litresPerDay = (from: number) => {
        const a = within(run.samples, from, from)[0];
        const b = within(run.samples, from + 24, from + 24)[0];
        return b.hypoLitres - a.hypoLitres;
      };
      const before = litresPerDay(STEADY - 24);
      const afterL = litresPerDay(STEADY + 48);
      const fcAfter = within(run.samples, STEADY + 24, STEADY + 72).map(
        (x) => x.freeChlorine,
      );
      const ratio = afterL / before;
      return [
        {
          name: 'chlorine held',
          expected:
            'A closed loop doses by what it measures, so the water is unchanged.',
          source: '`pool-dosing-and-water-chemistry.md` §4',
          threshold: 'free chlorine 1.0–2.0 mg/l throughout the two days after',
          measured: `${fmt(minOf(fcAfter))} to ${fmt(maxOf(fcAfter))} mg/l`,
          pass: minOf(fcAfter) >= 1 && maxOf(fcAfter) <= 2,
        },
        {
          name: 'consumption rises by the strength ratio',
          expected:
            'Litres a day rise by 140/100 = 1.40 while the bathers are the same.',
          source: '`pool-dosing-and-water-chemistry.md` §4',
          threshold: 'litres a day × 1.35–1.45',
          measured: `${fmt(before, 1)} → ${fmt(afterL, 1)} l/day (× ${fmt(ratio)})`,
          pass: ratio >= 1.35 && ratio <= 1.45,
        },
      ];
    },
  },
  {
    id: 'loss-of-dosing',
    title: 'Loss of dosing: the hypochlorite pump fails for 12 hours; restored',
    pool: POOL_25M,
    hours: STEADY + 12 + 24,
    events: [
      {
        at: STEADY + 8,
        label: 'hypochlorite pump fails (08:00)',
        phase: 'problem',
        apply: set({ hypoFailed: true }),
      },
      {
        at: STEADY + 20,
        label: 'pump repaired (20:00)',
        phase: 'treatment',
        apply: set({ hypoFailed: false }),
      },
    ],
    checks: (run) => {
      const low = minOf(
        within(run.samples, STEADY + 8, STEADY + 20).map((x) => x.freeChlorine),
      );
      const below = firstTime(
        run.samples,
        STEADY + 8,
        (x) => x.freeChlorine < 0.75,
      );
      const back = firstTime(
        run.samples,
        STEADY + 20,
        (x) => x.freeChlorine >= 1.3,
      );
      return [
        {
          name: 'chlorine falls with the bathers’ demand',
          expected:
            'Without dosing, a busy day’s demand uses the free chlorine up within hours.',
          source:
            'Berg et al. 2019 (about 4 g Cl₂ a bather); PWTAG CoP §9.5 (minimum 0.75 mg/l)',
          threshold: 'free chlorine below 0.75 mg/l within 12 h',
          measured: `below 0.75 after ${hoursAfter(below, STEADY + 8)}; min ${fmt(low)} mg/l`,
          pass: below - (STEADY + 8) <= 12,
        },
        {
          name: 'and recovers when dosing returns',
          expected:
            'The controller at full output restores the setpoint, as fast as its pump allows.',
          source: '`pool-dosing-and-water-chemistry.md` §3.2',
          threshold: 'free chlorine ≥ 1.3 mg/l within 4 h of the repair',
          measured: `${hoursAfter(back, STEADY + 20)}`,
          pass: back - (STEADY + 20) <= 4,
        },
      ];
    },
  },
  {
    id: 'faecal-incident',
    title:
      'A diarrhoeal faecal incident: close, raise chlorine, hold pH ≤ 7.5, filter, dechlorinate',
    pool: POOL_25M,
    hours: STEADY + 16 + 8,
    events: [
      {
        at: STEADY,
        label:
          'diarrhoeal release: closed; UV bypassed; controller setpoint 20 mg/l, pH 7.2',
        phase: 'problem',
        apply: (s, pool) =>
          handDose(
            set({
              closed: true,
              uv: false,
              fcSetpoint: 20,
              fcBand: 3,
              phSetpoint: 7.2,
            })(s),
            {
              hypochlorite: grams(pool, Math.max(0, 20 - s.pool.freeChlorine)),
            },
          ),
      },
      ...every(STEADY, STEADY + 12, 2, {
        label: 'two-hourly test: acid by hand to pH 7.2 if over 7.4',
        apply: handAcidIfOver(7.4, 7.2),
      }),
      {
        at: STEADY + 13.5,
        label: 'contact time done: setpoint 1.5; thiosulphate to 2.2 mg/l',
        phase: 'treatment',
        apply: (s, pool) =>
          handDose(set({ fcSetpoint: 1.5, fcBand: 0.3, phSetpoint: 7.3 })(s), {
            thiosulphate: grams(
              pool,
              5 * Math.max(0, s.pool.freeChlorine - 2.2),
            ),
          }),
      },
      {
        at: STEADY + 15,
        label: 'UV back; reopened',
        apply: set({ uv: true, closed: false }),
      },
    ],
    checks: (run) => {
      const hold = within(run.samples, STEADY, STEADY + 13.5);
      let ct = 0;
      for (let n = 1; n < hold.length; n++)
        ct += hold[n].freeChlorine * (hold[n].t - hold[n - 1].t) * 60;
      const phMax = maxOf(
        within(run.samples, STEADY + 2.5, STEADY + 13.5).map((x) => x.ph),
      );
      const phShock = maxOf(
        within(run.samples, STEADY, STEADY + 2).map((x) => x.ph),
      );
      const turnovers =
        (13.5 * POOL_25M.circulation) /
        (POOL_25M.volume + POOL_25M.balanceTank);
      const reopen = within(run.samples, STEADY + 15, STEADY + 16);
      const fcReopen = mean(reopen.map((x) => x.freeChlorine));
      return [
        {
          name: 'the contact time is reached',
          expected:
            'Free chlorine × time reaches the Cryptosporidium remediation value.',
          source:
            'PWTAG TN23 (20 mg/l, 13 h); CDC (15,300 mg·min/l at pH ≤ 7.5)',
          threshold: 'CT ≥ 15,300 mg·min/l before dechlorination',
          measured: `CT ${fmt(ct, 0)} mg·min/l`,
          pass: ct >= 15300,
        },
        {
          name: 'pH held down',
          expected: 'Acid keeps pH at 7.5 or lower so the chlorine works.',
          source: 'PWTAG TN23 ("bring pH down to 7.5 or lower")',
          threshold:
            'pH ≤ 7.5 from the first two-hourly acid (2.5 h) to the end of the contact time',
          measured: `max pH ${fmt(phMax)} (the shock itself raised it to ${fmt(phShock)})`,
          pass: phMax <= 7.5,
        },
        {
          name: 'the water is filtered meanwhile',
          expected:
            'The filters run throughout: the whole volume passes them several times (the model shows turnovers, not oocysts).',
          source: 'PWTAG CoP §8 (filters running; coagulation)',
          threshold: '≥ 4 turnovers during the contact time',
          measured: `${fmt(turnovers, 1)} turnovers`,
          pass: turnovers >= 4,
        },
        {
          name: 'reopened in range',
          expected:
            'After dechlorination the water is back in range for bathing.',
          source: 'PWTAG TN23; CoP §9.5',
          threshold: 'free chlorine 1–3 mg/l on reopening',
          measured: `FC ${fmt(fcReopen)} mg/l`,
          pass: fcReopen >= 1 && fcReopen <= 3,
        },
      ];
    },
  },
];

export interface ScenarioResult {
  scenario: Scenario;
  run: Run;
  checks: Check[];
}

/** One scenario run from its steady state: the steady check, then its own. */
export function runScenario(sc: Scenario, dt = 60): ScenarioResult {
  const start0 = warmedUp(sc.pool, PLANT);
  const start = { ...start0, plant: { ...start0.plant, ...sc.plant } };
  const run = runBench(start, sc.pool, sc.hours, sc.events, dt);
  return {
    scenario: sc,
    run,
    checks: [steadyCheck(run.samples), ...sc.checks(run)],
  };
}

/** Grams of available chlorine a litre of product at a strength holds (for reports). */
export const molesOfChlorine = (grams: number) => grams / MOLAR.Cl2;

// ---- The game's four pools ---------------------------------------------------------

/**
 * The game's pools as the bench's, from the world's own data, read and not
 * changed (`plant/pools.ts`, `plant-sizing`, `balance-tank.ts`,
 * `spa-balance-tank.ts`): each body's volume and surface, its balance tank
 * (the lounge's as sized, the Olympic's as built to its weir, the jacuzzi's
 * GRP cylinder, the footbath's surge vessel), its circulation and
 * temperature as the world runs them, its evaporation. Bathers a day are
 * the earlier note's (`pool-water-chemistry-and-biology.md` §3.2); the
 * footbath's are bather-equivalents of feet, _invented_.
 */
export function gamePools(data: {
  bodies: Record<
    string,
    {
      name: string;
      area: number;
      volume: number;
      evaporation: number;
      tank: number;
    }
  >;
  target: Record<string, { temp: number; flow: number }>;
}): Record<string, BenchPool> {
  const people: Record<string, { perDay: number; max: number; visit: number }> =
    {
      pool_01: { perDay: 370, max: 70, visit: 1 },
      pool_02: { perDay: 1650, max: 310, visit: 1 },
      pool_03: { perDay: 50, max: 8, visit: 0.25 },
      pool_04: { perDay: 6, max: 2, visit: 0.1 },
    };
  const out: Record<string, BenchPool> = {};
  for (const [id, b] of Object.entries(data.bodies)) {
    const t = data.target[id];
    const who = people[id];
    out[id] = {
      ...POOL_25M,
      name: b.name,
      volume: b.volume,
      balanceTank: b.tank,
      surface: b.area,
      temperature: t.temp,
      circulation: t.flow,
      bathersPerDay: who.perDay,
      maxBathers: who.max,
      visitHours: who.visit,
      evaporation: b.evaporation * 24,
      start: {
        ...POOL_25M.start,
        temperature: t.temp,
        freeChlorine: id === 'pool_03' ? 4 : 1.5,
      },
    };
  }
  return out;
}

/**
 * Each game pool's plant for the bench: its pumps sized at about twice
 * the bench's own average need, since the game's are not yet sized by
 * demand (`pool-dosing-and-water-chemistry.md` §3.4, question 9); the
 * jacuzzi held at 4 mg/l (HSG282: 3 to 5).
 */
export const GAME_PLANTS: Record<string, Partial<Plant>> = {
  pool_01: { hypoPump: 3, acidPump: 3 },
  pool_02: { hypoPump: 12.5, acidPump: 12.5 },
  pool_03: { hypoPump: 0.5, acidPump: 0.5, fcSetpoint: 4, fcBand: 0.5 },
  pool_04: { hypoPump: 0.1, acidPump: 0.1 },
};

// ---- One zone against two -----------------------------------------------------------

export interface CircuitComparison {
  id: string;
  title: string;
  /** The largest differences, pool zone against the single volume, over the run. */
  freeChlorine: number;
  ph: number;
  combined: number;
  alkalinity: number;
  /** Checks that pass with one zone, and with two. */
  passOne: number;
  passTwo: number;
  of: number;
}

/** A scenario run with the circuit as one volume and as two zones, and how far apart they come. */
export function compareCircuits(sc: Scenario): CircuitComparison {
  const runOn = (circuit: Circuit) => {
    const w = warmedUp(sc.pool, PLANT, circuit);
    const start = { ...w, plant: { ...w.plant, ...sc.plant } };
    const run = runBench(start, sc.pool, sc.hours, sc.events);
    return { run, checks: [steadyCheck(run.samples), ...sc.checks(run)] };
  };
  const one = runOn('one');
  const two = runOn('two');
  const n = Math.min(one.run.samples.length, two.run.samples.length);
  const diff = (k: keyof Sample) => {
    let m = 0;
    for (let i = 0; i < n; i++)
      m = Math.max(
        m,
        Math.abs(
          (one.run.samples[i][k] as number) - (two.run.samples[i][k] as number),
        ),
      );
    return m;
  };
  return {
    id: sc.id,
    title: sc.title,
    freeChlorine: diff('freeChlorine'),
    ph: diff('ph'),
    combined: diff('combined'),
    alkalinity: diff('alkalinity'),
    passOne: one.checks.filter((c) => c.pass).length,
    passTwo: two.checks.filter((c) => c.pass).length,
    of: two.checks.length,
  };
}

/**
 * A hand dose into the balance tank (the owner: it should be seen reaching
 * the pool): bicarbonate for +20 mg/l alkalinity into the steady 25 m
 * pool's tank, with two zones and with one, sampled every minute.
 */
export function handDoseThroughTank(pool: BenchPool = POOL_25M): {
  one: Run;
  two: Run;
} {
  const ev: BenchEvent[] = [
    {
      at: 1,
      label: 'bicarbonate into the balance tank (+20 mg/l over the circuit)',
      phase: 'treatment',
      apply: (s, p) =>
        handDose(s, { bicarbonate: grams(p, 20 * 1.68) }, 'tank'),
    },
  ];
  const go = (c: Circuit) =>
    runBench(warmedUp(pool, PLANT, c), pool, 4, ev, 10, 1 / 60);
  return { one: go('one'), two: go('two') };
}

/** The dosing loop's answer to a setpoint step (1.5 to 2.0 mg/l) with one zone and with two. */
export function setpointStep(pool: BenchPool = POOL_25M): {
  one: Run;
  two: Run;
} {
  const ev: BenchEvent[] = [
    {
      at: 1,
      label: 'chlorine setpoint 1.5 → 2.0 mg/l',
      phase: 'treatment',
      apply: set({ fcSetpoint: 2 }),
    },
  ];
  const go = (c: Circuit) =>
    runBench(warmedUp(pool, PLANT, c), pool, 6, ev, 10, 1 / 60);
  return { one: go('one'), two: go('two') };
}

/** The world's own numbers for its pools, derived as `plant/pools.ts` derives them (read, not changed). */
export function gamePoolData() {
  const circuits = sizePlant(POOLS).circuits;
  const bodies: Record<
    string,
    {
      name: string;
      area: number;
      volume: number;
      evaporation: number;
      tank: number;
    }
  > = {};
  for (const id of POOL_IDS) {
    const a = POOLS.find((x) => x.room === id)!;
    const c = circuits.find((x) => x.attraction === a.id)!;
    const packaged = c.flow < ASSUME.packageBelow;
    bodies[id] = {
      name: c.body.name,
      area: c.body.area,
      volume: c.body.volume,
      evaporation: c.evaporation / 1000,
      tank: packaged ? Math.max(0.5, c.body.volume * 0.3) : c.balanceTank,
    };
  }
  bodies.pool_03.tank = JACUZZI_BALANCE_TANK.volume;
  bodies.pool_02.tank = volumeOf(BALANCE_TANK.weir);
  return {
    bodies,
    target: POOL_TARGET as Record<string, { temp: number; flow: number }>,
  };
}

export const GAME_POOLS = gamePools(gamePoolData());
