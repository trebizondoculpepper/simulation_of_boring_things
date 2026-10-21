import { serviceAvailable } from './services';
import type { PlantServices, ServiceRoom } from './services';

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
      },
    ]),
  ) as PoolsState;
}

const approach = (value: number, target: number, rate: number, dt: number) =>
  value + (target - value) * Math.min(1, rate * dt);
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/** A deliberately compact operating model: each pool is a separate water
 * circuit, fed by its plant room and the shared make-up, boiler, air and
 * chemical services. Loss of a feeder affects both its flow and readings.
 * `dt` is seconds and the state remains plain saveable data. */
export function stepPools(
  pools: PoolsState,
  plant: PlantServices,
  dt: number,
): PoolsState {
  const next = {} as PoolsState;
  for (const id of POOL_IDS) {
    const room = `plant_${id}` as ServiceRoom;
    const old = pools[id];
    const circulation =
      serviceAvailable(plant, room, 'power') &&
      serviceAvailable(plant, room, 'water');
    const heat = circulation && serviceAvailable(plant, room, 'heat');
    const dosing = circulation && serviceAvailable(plant, room, 'chemical');
    const makeup = serviceAvailable(plant, 'wet_hall', 'water');
    const flow = approach(
      old.flow,
      circulation ? TARGET[id].flow : 0,
      0.08,
      dt,
    );
    const balance = clamp(
      old.balance +
        (makeup ? 0.000004 : -0.00004) * dt -
        (circulation ? 0.000002 : 0),
      0,
      1,
    );
    const level = clamp(
      old.level +
        (circulation ? 0.000001 : -0.000008) * dt +
        (makeup ? 0.000001 : 0),
      -0.5,
      0.04,
    );
    const temperature = approach(
      old.temperature,
      heat ? TARGET[id].temp : 20,
      heat ? 0.0006 : 0.00008,
      dt,
    );
    const freeChlorine = clamp(
      old.freeChlorine +
        (dosing ? (1.4 - old.freeChlorine) * 0.001 : -0.0003) * dt,
      0,
      5,
    );
    const ph = clamp(
      old.ph + (dosing ? (7.4 - old.ph) * 0.001 : 0.00006) * dt,
      6,
      9,
    );
    const combinedChlorine = clamp(
      old.combinedChlorine + (circulation ? -0.000002 : 0.000006) * dt,
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
    };
  }
  return next;
}
