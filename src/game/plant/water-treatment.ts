import {
  CONSERVED,
  mixWaters,
  readings,
  stepChemistry,
  waterFrom,
} from '../water/pool-chemistry';
import type { Additions, PoolChemistry } from '../water/pool-chemistry';
import { POOL_CELL_SHARES, exchangeRing } from '../water/circuit';
import { CAPACITY, STAY } from '../bathers';
import { POOL_IDS, poolArea, poolTankCapacity, poolVolume } from './pools';
import type { PoolId, PoolWaterState, PoolsState } from './pools';
import type { Chemical } from './chemicals';

/**
 * Each pool's water treatment in the world (mission 101, stage 1): its
 * circuit's chemistry, the water-chemistry model's (`water/pool-chemistry.ts`,
 * `doc/research/water-chemistry-models.md`), its dosing controller and its
 * dosing pumps. Pure.
 *
 * Each circuit is two zones (the owner, 2026-10-28): its balance tank, and
 * its pool as three cells in series (its mixing lag, `water/circuit.ts`).
 * The circulation carries the water round them at the flow the world's
 * hydraulics give; the make-up comes into the tank at the mains'
 * composition; evaporation leaves the pool; whatever goes to waste
 * (backwash, a drain-down, a spa's filter wash, an overflow) takes the
 * water as it is. The controller's doses go into the return, the pool's
 * first cell; its sample is the tank's water, through its cell's lag. The
 * pool's readings, as bathers meet it and a poolside test reads it, are
 * its far cell's (`poolReadings`).
 *
 * The controller (after the bench's, `chemistry-bench.ts`): PI on free
 * chlorine, P on pH, its sensors ideal for now (the owner, 2026-10-28:
 * "For now, let's cheat"), and the pH lockout of chlorine dosing (W&T's
 * DEPOLOX: setpoint ± its switch-off range). Its outputs, 0 to 1, set its
 * pumps' rates, each capped at its pump's own maximum; a pump doses only
 * while its pool may be dosed with its chemical (circulating, its room's
 * chemical service, its day tank's stock and open path: `dosedByPool`).
 *
 * The chemistry is stepped on its own clock, every `CHEMISTRY_TICK` of
 * world time, with the flows and doses of the world's steps between summed
 * (`pending`): every process in it is exact over its step, and the world's
 * 0.1 s step would cost a hundred times as much for nothing.
 */

/** How often the chemistry is stepped, world seconds. */
export const CHEMISTRY_TICK = 10;

/** Each pool's dosing pumps' most, l/h: the pumps the rooms draw. */
export const DOSING_PUMPS: Record<PoolId, Record<Chemical, number>> = {
  // The lounge's and the Olympic's hypochlorite boards: DMX 1602 solenoid
  // pumps, 2.1 l/h (`diaphragm-pump.ts`); their acid, a DDS 7.5-16, 7.5 l/h.
  // The Olympic's is undersized (the bench: about 12.5 l/h): the owner,
  // 2026-10-28, keeps it, to see how it goes wrong (mission 101).
  pool_01: { hypochlorite: 2.1, acid: 7.5 },
  pool_02: { hypochlorite: 2.1, acid: 7.5 },
  // The spa cabinets' peristaltic heads, at the bench's sizes (their real
  // models unchosen: mission 101, question 8).
  pool_03: { hypochlorite: 0.5, acid: 0.5 },
  pool_04: { hypochlorite: 0.1, acid: 0.1 },
};

/**
 * The chemicals' strengths, g/l, fixed for now (stage 1): 14 % sodium
 * hypochlorite as 140 g/l of available chlorine; 10 % hydrochloric acid
 * (w/w at 1.048) as 104.8 g/l HCl; and the chlorate a fresh hypochlorite
 * carries, g per g of available chlorine (the bench's, _invented_).
 */
export const STRENGTH = { hypochlorite: 140, acid: 104.8, chlorate: 0.02 };

/** The controllers' settings, every pool's alike. */
export const CONTROLLER = {
  /** Free chlorine's setpoint at the sample, mg/l: the pool's far side runs about 0.15 above it. */
  chlorineSet: 1.3,
  /** Its proportional band, mg/l, and integral time, h: the bench's tuning for the mixing lag's dead time. */
  chlorineBand: 0.5,
  chlorineIntegral: 6,
  /** pH's setpoint and proportional band. */
  pHSet: 7.3,
  pHBand: 0.3,
  /** Chlorine dosing stops with pH this far either side of its setpoint (DEPOLOX's switch-off range). */
  pHLockout: 0.4,
  /** The sample cell's lag, s. */
  sampleLag: 60,
} as const;

/** A wader's feet in the footbath, as a share of a bather's load: the bench's six bather-equivalents a day over about 2,000 waders, _invented_. */
export const WADER_SHARE = 0.003;

/** The mains' water: the bench's moderately hard supply (mission 101, question 5). */
export const MAINS = {
  ph: 7.6,
  alkalinity: 150,
  hardness: 200,
  tds: 350,
  temperature: 10,
  freeChlorine: 0.3,
  sulphate: 40,
} as const;

/** The hall's air's CO₂, ppm (the bench's: a busy indoor hall). */
const HALL_CO2 = 800;

/** A dosing controller's state: its sample cell's water, its integral, and its outputs held since its last step. */
export interface DosingControl {
  cell: { freeChlorine: number; ph: number };
  /** Chlorine's integral, mg/l (bounded by its band). */
  integral: number;
  /** Its outputs, 0 to 1. */
  hypochlorite: number;
  acid: number;
  /** Chlorine dosing stopped by the pH lockout. */
  lockout: boolean;
}

/** One pool's circuit: its tank's water, its pool's three cells (return side first), its controller. */
export interface CircuitWater {
  tank: PoolChemistry;
  pool: PoolChemistry[];
  control: DosingControl;
}

/** What has happened to a circuit since its chemistry was last stepped. */
export interface PendingFlows {
  /** World seconds. */
  seconds: number;
  /** Water circulated, m³, and of it through lit UV (or ozone), m³. */
  circulated: number;
  treated: number;
  /** Make-up into the tank, m³; evaporated from the pool, m³. */
  madeUp: number;
  evaporated: number;
  /** Bathers in the water times seconds. */
  batherSeconds: number;
  /** Litres pumped of each chemical. */
  hypochlorite: number;
  acid: number;
}

export interface WaterTreatment {
  circuits: Record<PoolId, CircuitWater>;
  pending: Record<PoolId, PendingFlows>;
}

const nothingPending = (): PendingFlows => ({
  seconds: 0,
  circulated: 0,
  treated: 0,
  madeUp: 0,
  evaporated: 0,
  batherSeconds: 0,
  hypochlorite: 0,
  acid: 0,
});

/**
 * Each pool's water as it settles over months of its normal day: its slow
 * species, and its controller's integral, from the bench's 120-day steady
 * state of the game's pools with the world's pumps and controller
 * (`chemistry-bench.ts` `GAME_POOLS`, `GAME_PLANTS`; checked by
 * `water-treatment.slow.test.ts`). A new pool would be filled at
 * alkalinity 120; a working one has lost most of it to CO₂ loss and acid
 * (`water-chemistry-models.md` §8), and the spas, which degas fastest, the
 * most: starting a footbath at 120 drove its pH up 0.2 in half a minute.
 * The Olympic's integral is wound up: its pump is too small (mission 101).
 */
export const SETTLED: Record<
  PoolId,
  {
    alkalinity: number;
    hardness: number;
    tds: number;
    sulphate: number;
    chlorate: number;
    integral: number;
  }
> = {
  pool_01: {
    alkalinity: 50.7,
    hardness: 213.7,
    tds: 769,
    sulphate: 42.8,
    chlorate: 3.3,
    integral: 0.148,
  },
  pool_02: {
    alkalinity: 68.4,
    hardness: 213.9,
    tds: 737,
    sulphate: 45,
    chlorate: 2.5,
    integral: 0.5,
  },
  pool_03: {
    alkalinity: 34.4,
    hardness: 206.7,
    tds: 739,
    sulphate: 41.3,
    chlorate: 3,
    integral: -0.067,
  },
  pool_04: {
    alkalinity: 16.3,
    hardness: 230.4,
    tds: 954,
    sulphate: 46.1,
    chlorate: 4.7,
    integral: 0.073,
  },
};

/**
 * A pool's circuit with these readings (the start of a game, and a
 * migrated save's present readings): its settled water (`SETTLED`), its
 * free chlorine and pH as given, its combined chlorine as organic
 * chloramine, no bathers' load yet; the tank's water the pool's; its
 * controller at its settled integral.
 */
export function nominalCircuit(
  id: PoolId,
  r: {
    ph: number;
    freeChlorine: number;
    combinedChlorine: number;
    temperature: number;
  },
): CircuitWater {
  const water: PoolChemistry = {
    ...waterFrom({
      ph: r.ph,
      alkalinity: SETTLED[id].alkalinity,
      hardness: SETTLED[id].hardness,
      tds: SETTLED[id].tds,
      temperature: r.temperature,
      freeChlorine: Math.max(0, r.freeChlorine),
      sulphate: SETTLED[id].sulphate,
    }),
    chlorate: SETTLED[id].chlorate,
    organicChloramine: Math.max(0, r.combinedChlorine),
  };
  const control: DosingControl = {
    cell: { freeChlorine: water.freeChlorine, ph: water.ph },
    integral: SETTLED[id].integral,
    hypochlorite: 0,
    acid: 0,
    lockout: false,
  };
  return {
    tank: { ...water },
    pool: POOL_CELL_SHARES.map(() => ({ ...water })),
    // Its outputs as its readings call for them now.
    control: stepControl(control, water, true, 0),
  };
}

/** Every pool's circuit, nominal, with its present readings. */
export function newWaterTreatment(pools: PoolsState): WaterTreatment {
  const circuits = {} as Record<PoolId, CircuitWater>;
  const pending = {} as Record<PoolId, PendingFlows>;
  for (const id of POOL_IDS) {
    circuits[id] = nominalCircuit(id, pools[id]);
    pending[id] = nothingPending();
  }
  return { circuits, pending };
}

/** A pool's water as bathers meet it and a poolside test reads it: its far cell's. */
export const farSide = (c: CircuitWater) => c.pool[c.pool.length - 1];

/** What the world's pool readings are, from the model: its far side's pH, free and combined chlorine and redox. */
export function poolReadings(
  c: CircuitWater,
  temperature: number,
): Pick<PoolWaterState, 'ph' | 'freeChlorine' | 'combinedChlorine' | 'redox'> {
  const w = farSide(c);
  const r = readings(w, temperature);
  return {
    ph: w.ph,
    freeChlorine: w.freeChlorine,
    combinedChlorine: r.combinedChlorine,
    redox: Math.max(0, Math.min(999, r.redox)),
  };
}

/**
 * The pools with their readings from their circuits: each only where its
 * circuit has changed since `before` (the pools carry their readings on
 * from step to step, and a circuit steps once in `CHEMISTRY_TICK`).
 */
export function withWaterReadings(
  pools: PoolsState,
  treatment: WaterTreatment,
  before?: WaterTreatment,
): PoolsState {
  const out = { ...pools };
  for (const id of POOL_IDS)
    if (before?.circuits[id] !== treatment.circuits[id])
      out[id] = {
        ...pools[id],
        ...poolReadings(treatment.circuits[id], pools[id].temperature),
      };
  return out;
}

/**
 * A pool's dosing pumps' rates now, l/h: its controller's outputs times
 * each pump's most, while its pool may be dosed with that chemical
 * (`allowed`: `dosedByPool`'s volume for it), none otherwise.
 */
export function pumpRates(
  control: DosingControl,
  id: PoolId,
  allowed: Partial<Record<Chemical, number>> | undefined,
): Record<Chemical, number> {
  const pumps = DOSING_PUMPS[id];
  const on = (c: Chemical) => (allowed?.[c] ?? 0) > 0;
  return {
    hypochlorite: on('hypochlorite')
      ? Math.min(1, Math.max(0, control.hypochlorite)) * pumps.hypochlorite
      : 0,
    acid: on('acid') ? Math.min(1, Math.max(0, control.acid)) * pumps.acid : 0,
  };
}

/** Every pool's pumps' rates now, l/h (as `pumpRates`). */
export function allPumpRates(
  treatment: WaterTreatment,
  dosed: Partial<Record<PoolId, Record<Chemical, number>>>,
): Record<PoolId, Record<Chemical, number>> {
  const out = {} as Record<PoolId, Record<Chemical, number>>;
  for (const id of POOL_IDS)
    out[id] = pumpRates(treatment.circuits[id].control, id, dosed[id]);
  return out;
}

/** What a world step tells a circuit: its flows and its doses during the step. */
export interface StepFlows {
  /** The circulation's flow, m³/h, and whether its UV (or ozone) is lit. */
  flow: number;
  treated: boolean;
  /** Make-up into the tank, and evaporated from the pool, m³, during the step. */
  madeUp: number;
  evaporated: number;
  /** Bathers in the water. */
  bathers: number;
  /** The pumps' rates during the step, l/h. */
  pumps: Record<Chemical, number>;
}

/** The chemistry's dosing summed over a world step of `dt` seconds. */
function accumulate(p: PendingFlows, f: StepFlows, dt: number): PendingFlows {
  const hours = dt / 3600;
  return {
    seconds: p.seconds + dt,
    circulated: p.circulated + f.flow * hours,
    treated: p.treated + (f.treated ? f.flow * hours : 0),
    madeUp: p.madeUp + Math.max(0, f.madeUp),
    evaporated: p.evaporated + Math.max(0, f.evaporated),
    batherSeconds: p.batherSeconds + Math.max(0, f.bathers) * dt,
    hypochlorite: p.hypochlorite + f.pumps.hypochlorite * hours,
    acid: p.acid + f.pumps.acid * hours,
  };
}

/** A water with every species but pH scaled (evaporation concentrating it), its pH solved again. */
function concentrate(
  w: PoolChemistry,
  factor: number,
  temperature: number,
): PoolChemistry {
  if (!(factor > 0) || factor === 1) return w;
  const out = { ...w };
  for (const k of CONSERVED) out[k] = w[k] * factor;
  return mixWaters([{ water: out, volume: 1 }], temperature);
}

/** A zone this small is treated as empty: it neither reacts nor mixes. */
const EMPTY = 0.01;

/**
 * One circuit's chemistry over its pending flows: make-up mixed into the
 * tank, evaporation concentrating the pool, each zone's reactions (its
 * bathers by its volume, the dose into the return side, UV on the tank's
 * way out), the circulation round the ring, and its controller.
 */
export function stepCircuit(
  c: CircuitWater,
  id: PoolId,
  p: PendingFlows,
  pool: Pick<PoolWaterState, 'level' | 'balance' | 'temperature'>,
): CircuitWater {
  const dt = p.seconds;
  if (!(dt > 0)) return c;
  const hours = dt / 3600;
  const T = pool.temperature;
  const area = poolArea(id);
  const vPool = Math.max(0, poolVolume(id) + pool.level * area);
  const vTank = Math.max(0, pool.balance * poolTankCapacity(id));
  const flow = p.circulated / hours;
  const mains = waterFrom(MAINS);
  // The make-up into the tank: its water now is what was there and what came in.
  let tank =
    p.madeUp > 0
      ? mixWaters(
          [
            { water: c.tank, volume: Math.max(0, vTank - p.madeUp) },
            { water: mains, volume: p.madeUp },
          ],
          T,
        )
      : c.tank;
  // Evaporation leaves the pool's salts behind.
  const cells = c.pool.map((w) =>
    vPool > EMPTY && p.evaporated > 0
      ? concentrate(w, (vPool + p.evaporated) / vPool, T)
      : w,
  );
  // Each zone's reactions.
  const bathers = p.batherSeconds / dt;
  const share = id === 'pool_04' ? WADER_SHARE : 1;
  const visitHours = STAY[id] / 3600;
  const agitation = Math.min(1, (2 * bathers) / Math.max(1, CAPACITY[id]));
  const common = { temperature: T, mains, airCo2: HALL_CO2 };
  const hypo = p.hypochlorite * STRENGTH.hypochlorite;
  const dosed: Additions = {
    hypochlorite: hypo,
    chlorate: hypo * STRENGTH.chlorate,
    hcl: p.acid * STRENGTH.acid,
  };
  const reacted = cells.map((w, i) => {
    const v = vPool * POOL_CELL_SHARES[i];
    if (!(v > EMPTY)) return w;
    return stepChemistry(
      w,
      {
        ...common,
        volume: v,
        surface: area * POOL_CELL_SHARES[i],
        circulation: flow * POOL_CELL_SHARES[i],
        added: i === 0 ? dosed : {},
        bathers: bathers * share * POOL_CELL_SHARES[i],
        visitHours,
        agitation,
      },
      dt,
    ).water;
  });
  if (vTank > EMPTY)
    tank = stepChemistry(
      tank,
      {
        ...common,
        volume: vTank,
        surface: 0,
        circulation: flow,
        uvFlow: p.treated / hours,
      },
      dt,
    ).water;
  // The circulation: tank → return side → far side → over the weir to the tank.
  const ring =
    vPool > EMPTY && vTank > EMPTY && flow > 0
      ? exchangeRing(
          [tank, ...reacted],
          [vTank, ...POOL_CELL_SHARES.map((s) => s * vPool)],
          flow,
          hours,
          T,
        )
      : [tank, ...reacted];
  const next = { ...c, tank: ring[0], pool: ring.slice(1) };
  return { ...next, control: stepControl(c.control, next.tank, flow > 0, dt) };
}

/**
 * The controller `dt` seconds on: its cell's water following the sample
 * (the tank's) while the water circulates; PI on chlorine and P on pH from
 * its cell; chlorine locked out with pH out of its range; its integral
 * held while it cannot dose (no circulation, or locked out).
 */
export function stepControl(
  s: DosingControl,
  sample: PoolChemistry,
  circulating: boolean,
  dt: number,
): DosingControl {
  const C = CONTROLLER;
  const lag = circulating ? 1 - Math.exp(-dt / C.sampleLag) : 0;
  const cell = {
    freeChlorine:
      s.cell.freeChlorine + (sample.freeChlorine - s.cell.freeChlorine) * lag,
    ph: s.cell.ph + (sample.ph - s.cell.ph) * lag,
  };
  const lockout = Math.abs(cell.ph - C.pHSet) > C.pHLockout;
  const error = C.chlorineSet - cell.freeChlorine;
  const integral =
    circulating && !lockout
      ? Math.min(
          C.chlorineBand,
          Math.max(
            -C.chlorineBand,
            s.integral + (error * dt) / 3600 / C.chlorineIntegral,
          ),
        )
      : s.integral;
  const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
  return {
    cell,
    integral,
    hypochlorite:
      circulating && !lockout
        ? clamp01((error + integral) / C.chlorineBand)
        : 0,
    acid: circulating ? clamp01((cell.ph - C.pHSet) / C.pHBand) : 0,
    lockout,
  };
}

/**
 * The pools' water treatment a world step of `dt` seconds on: the step's
 * flows and doses summed, and each circuit's chemistry stepped once it has
 * `CHEMISTRY_TICK` of them (`pools` the pools as they are after the step).
 */
export function stepWaterTreatment(
  t: WaterTreatment,
  flows: Record<PoolId, StepFlows>,
  dt: number,
  pools: PoolsState,
): WaterTreatment {
  const circuits = { ...t.circuits };
  const pending = { ...t.pending };
  for (const id of POOL_IDS) {
    const p = accumulate(t.pending[id] ?? nothingPending(), flows[id], dt);
    if (p.seconds + 1e-9 < CHEMISTRY_TICK) {
      pending[id] = p;
      continue;
    }
    circuits[id] = stepCircuit(t.circuits[id], id, p, pools[id]);
    pending[id] = nothingPending();
  }
  return { circuits, pending };
}

/** What each pool's pumps draw from its day tanks, litres a second, from their rates in l/h. */
export function pumpDraw(
  pumps: Record<PoolId, Record<Chemical, number>>,
): Partial<Record<PoolId, Record<Chemical, number>>> {
  const out: Partial<Record<PoolId, Record<Chemical, number>>> = {};
  for (const id of POOL_IDS)
    if (pumps[id].hypochlorite > 0 || pumps[id].acid > 0)
      out[id] = {
        hypochlorite: pumps[id].hypochlorite / 3600,
        acid: pumps[id].acid / 3600,
      };
  return out;
}
