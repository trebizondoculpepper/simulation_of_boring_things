import { serviceAvailable } from './services';
import type { IsolatorName, PlantServices, ServiceRoom } from './services';
import { stepWater } from '../water/water-balance';
import type { PoolWater } from '../water/water-balance';
import { POOLS } from '../plant-sizing/pools.config';
import { ASSUME, sizePlant } from '../plant-sizing/sizing';
import { phTarget } from './chemicals';
import type { Chemical } from './chemicals';

export type PoolId = 'pool_01' | 'pool_02' | 'pool_03' | 'pool_04';
export const POOL_IDS: readonly PoolId[] = [
  'pool_01',
  'pool_02',
  'pool_03',
  'pool_04',
];

export interface PoolWaterState {
  /** Surface relative to the pool's overflow lip, metres. */
  level: number;
  /** Balance tank fill, 0–1. */
  balance: number;
  temperature: number;
  ph: number;
  freeChlorine: number;
  combinedChlorine: number;
  redox: number;
  /** Flow through the treatment train, m³/h. */
  flow: number;
  /** Whether its pumps have tripped on the tank's low-low level. */
  tripped: boolean;
}

export type PoolsState = Record<PoolId, PoolWaterState>;

const TARGET: Record<PoolId, { temp: number; flow: number }> = {
  pool_01: { temp: 30, flow: 90 },
  pool_02: { temp: 28, flow: 620 },
  pool_03: { temp: 37, flow: 24 },
  pool_04: { temp: 34, flow: 12 },
};

export function newPools(): PoolsState {
  return Object.fromEntries(
    POOL_IDS.map((id) => [
      id,
      {
        level: 0.015,
        balance: 0.68,
        temperature: TARGET[id].temp,
        ph: 7.4,
        freeChlorine: 1.4,
        combinedChlorine: 0.12,
        redox: 720,
        flow: TARGET[id].flow,
        tripped: false,
      },
    ]),
  ) as PoolsState;
}

/** Each pool's pumps' isolators: any one on, and they can run. */
const ISOLATED_BY: Record<PoolId, readonly IsolatorName[]> = {
  pool_01: ['P-201A isolator', 'P-201B isolator'],
  pool_02: ['P-101A isolator', 'P-101B isolator'],
  pool_03: ['Jacuzzi cabinet isolator'],
  pool_04: ['Footbath cabinet isolator'],
};

/** The UV and ozone that break down a pool's chloramines, by their isolators. */
const TREATED_BY: Partial<Record<PoolId, readonly IsolatorName[]>> = {
  pool_01: ['Lounge UV unit isolator', 'Lounge ozone generator isolator'],
  pool_02: ['UV unit isolator', 'Ozone generator isolator'],
};

/** Each pool's water, by its circuit in the plant sizing. */
const WATER: Record<PoolId, PoolWater> = (() => {
  const circuits = sizePlant(POOLS).circuits;
  const out = {} as Record<PoolId, PoolWater>;
  for (const id of POOL_IDS) {
    const attraction = POOLS.find((a) => a.room === id)!;
    const c = circuits.find((x) => x.attraction === attraction.id)!;
    const packaged = c.flow < ASSUME.packageBelow;
    out[id] = {
      name: c.body.name,
      area: c.body.area,
      volume: c.body.volume,
      flow: c.flow,
      evaporation: c.evaporation / 1000,
      // A packaged set's surge vessel stands in for a tank.
      tank: packaged ? Math.max(0.5, c.body.volume * 0.3) : c.balanceTank,
      tankDepth: packaged ? 0.8 : 2,
      tankBelow: 0.2,
      mainDrainShare: 0.2,
      weirHead: 0.012,
      makeUpRate: Math.max(1, c.flow * 0.1),
      float: 0.68,
      lowLow: 0.1,
      backwash: c.body.volume * ASSUME.dilutionPerDay,
    };
  }
  return out;
})();

const approach = (value: number, target: number, rate: number, dt: number) =>
  value + (target - value) * Math.min(1, rate * dt);
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * Whether a pool's water is circulating, and so treated and dosed: its
 * room has power and water, one of its pumps' isolators is on, and its
 * pumps have not tripped.
 */
function circulating(
  old: PoolWaterState,
  plant: PlantServices,
  id: PoolId,
): boolean {
  const room = `plant_${id}` as ServiceRoom;
  return (
    serviceAvailable(plant, room, 'power') &&
    serviceAvailable(plant, room, 'water') &&
    ISOLATED_BY[id].some((name) => plant.isolators[name]) &&
    !old.tripped
  );
}

/** Whether each chemical is to be had: its store not run dry. */
export type ChemicalStock = Record<Chemical, boolean>;
const ALL_STOCKED: ChemicalStock = { hypochlorite: true, acid: true };

/**
 * The water being dosed with each chemical, m³: every pool whose water
 * circulates and whose room has its chemical feed, while the chemical is
 * in stock. The stores are drawn on by it (`chemicals.ts`).
 */
export function dosedVolumes(
  pools: PoolsState,
  plant: PlantServices,
  stock: ChemicalStock = ALL_STOCKED,
): Record<Chemical, number> {
  const out = { hypochlorite: 0, acid: 0 };
  for (const id of POOL_IDS) {
    const room = `plant_${id}` as ServiceRoom;
    if (
      !circulating(pools[id], plant, id) ||
      !serviceAvailable(plant, room, 'chemical')
    )
      continue;
    if (stock.hypochlorite) out.hypochlorite += WATER[id].volume;
    if (stock.acid) out.acid += WATER[id].volume;
  }
  return out;
}

/** A deliberately compact operating model: each pool is a separate water
 * circuit, fed by its plant room and the shared make-up, boiler, air and
 * chemical services. Loss of a feeder affects both its flow and readings.
 * `dt` is seconds and the state remains plain saveable data. */
export function stepPools(
  pools: PoolsState,
  plant: PlantServices,
  dt: number,
  /** The world's time, seconds: for the filters' daily backwash. */
  time = 0,
  /** Which dosing chemicals are in stock. */
  stock: ChemicalStock = ALL_STOCKED,
): PoolsState {
  const next = {} as PoolsState;
  for (const id of POOL_IDS) {
    const room = `plant_${id}` as ServiceRoom;
    const old = pools[id];
    // The pumps run if the room has power and water, and one of them, or
    // the pool's cabinet, is not isolated; and not tripped.
    const circulation = circulating(old, plant, id);
    // UV and ozone, where they are isolated, break down the combined
    // chlorine (the chloramines) as the water passes.
    const uv =
      circulation &&
      (!(id in TREATED_BY) ||
        TREATED_BY[id]!.some((name) => plant.isolators[name]));
    const heat = circulation && serviceAvailable(plant, room, 'heat');
    const dosing = circulation && serviceAvailable(plant, room, 'chemical');
    // Each chemical dosed only while its store has some.
    const hypochlorite = dosing && stock.hypochlorite;
    const acid = dosing && stock.acid;
    const makeup = serviceAvailable(plant, 'wet_hall', 'water');
    const flow = approach(
      old.flow,
      circulation ? TARGET[id].flow : 0,
      0.08,
      dt,
    );
    // Its water: the tested balance of pool and tank (`water-balance.ts`),
    // a step on, its make-up open while the wet hall supplies water.
    const params = WATER[id];
    const water = stepWater(
      params,
      {
        time: time / 3600,
        level: old.level,
        tankVolume: old.balance * params.tank,
        pumps: circulation,
        tripped: old.tripped,
        makeUpOpen: makeup,
        spilt: 0,
        backwashed: 0,
        evaporated: 0,
        madeUp: 0,
      },
      dt / 3600,
      // Sub-steps of at most 5 s. Not that a small pool fills fast (the
      // footbath takes most of an hour from empty), but its level settles
      // on its overflow lip within seconds (the jacuzzi's in about 6 s),
      // and a longer step overshoots it.
      Math.min(dt, 5) / 3600,
    );
    // Tripped on low-low, the pumps restart once the tank has recovered.
    const balance = water.tankVolume / params.tank;
    const tripped = water.tripped && balance < params.float * 0.8;
    const level = water.level;
    const temperature = approach(
      old.temperature,
      heat ? TARGET[id].temp : 20,
      heat ? 0.0006 : 0.00008,
      dt,
    );
    const freeChlorine = clamp(
      old.freeChlorine +
        (hypochlorite ? (1.4 - old.freeChlorine) * 0.001 : -0.0003) * dt,
      0,
      5,
    );
    // Held at 7.4 by both chemicals; pushed down by acid alone, up by
    // hypochlorite alone, over hours; drifting up slowly with neither.
    const ph = clamp(
      approach(
        old.ph,
        phTarget(hypochlorite, acid),
        hypochlorite && acid ? 0.001 : hypochlorite || acid ? 0.0001 : 0.00003,
        dt,
      ),
      6,
      9,
    );
    const combinedChlorine = clamp(
      old.combinedChlorine + (uv ? -0.000002 : 0.000006) * dt,
      0,
      2,
    );
    next[id] = {
      level,
      balance,
      temperature,
      ph,
      freeChlorine,
      combinedChlorine,
      redox: clamp(620 + freeChlorine * 72 - (ph - 7.4) * 45, 0, 999),
      flow,
      tripped,
    };
  }
  return next;
}
