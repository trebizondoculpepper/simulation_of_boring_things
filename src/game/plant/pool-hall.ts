import type { BlockKind } from '../sim/block-kind';
import {
  ACTIVITY_FACTOR,
  EVAPORATION_PER_DEGREE,
  LATENT_HEAT,
} from './evaporation';
import type { Activity } from './evaporation';
import { AIR_HEAT, GROUND, OUTSIDE, U } from './heat-loss';

/**
 * The pool rooms' side of the plant model, as black boxes: a pool and a
 * hall, each showing the plant only its ports (`doc/plant-model.md`).
 *
 * A pool takes heat from its heat exchanger and make-up water from the
 * break tank, and gives its temperature, its evaporation (the make-up
 * it needs, and the moisture its hall must lose) and its level. It loses
 * heat by evaporation, in proportion to its temperature
 * (`evaporation.ts`), and through its basin to the ground
 * (`heat-loss.ts`).
 *
 * A hall takes heat from its air handling unit and its pools'
 * evaporation, and gives its air's temperature and the moisture its air
 * handling must take out. It loses heat through its walls and roof to the
 * cold world, its floor to the ground, and in the air it changes.
 *
 * Both lose heat in proportion to their temperature, so with steady
 * inputs each settles exponentially towards a balance it can work out:
 * stepped by any length of time it lands exactly where stepping second
 * by second would, so a steady pool or hall sleeps and still reads
 * exactly. Pure; °C, kW, m³, hours inside, seconds at the ports.
 */

/** Water's heat, kWh per m³ per kelvin. */
const WATER_HEAT = 1.163;

/** A course towards a balance: where it heads, and how fast, per hour. */
interface Course {
  /** The temperature it settles at, °C. */
  balance: number;
  /** Its time constant, hours. */
  tau: number;
}

/** Where a course from `from` is after `hours`, and the average of its temperature over them. */
function along(course: Course, from: number, hours: number) {
  if (hours <= 0) return { temp: from, mean: from };
  const fade = Math.exp(-hours / course.tau);
  const temp = course.balance + (from - course.balance) * fade;
  const mean =
    course.balance +
    ((from - course.balance) * course.tau * (1 - fade)) / hours;
  return { temp, mean };
}

// ---- The pool -----------------------------------------------------------------

export interface PoolParams {
  /** Its surface and its basin's (floor and sides), m², and its volume when brim full, m³. */
  area: number;
  basin: number;
  volume: number;
  activity: Activity;
  /** Its water's temperature to begin with, °C. */
  start: number;
  /** The ground under it, °C. */
  ground: number;
}

export interface PoolState {
  temp: number;
  /** Its water, m³. */
  water: number;
  /** When its state was last worked out, s. */
  at: number;
}

/** Its losses' coefficients, kW per kelvin: evaporation's (against 0 °C) and its basin's (against the ground). */
function poolLosses(p: PoolParams) {
  const evaporation =
    p.area * EVAPORATION_PER_DEGREE * ACTIVITY_FACTOR[p.activity] * LATENT_HEAT;
  const basin = U.basin * p.basin;
  return { evaporation, basin };
}

/** The heat a pool needs to hold `temperature`, kW. */
export function poolHoldingHeat(p: PoolParams, temperature: number) {
  const { evaporation, basin } = poolLosses(p);
  return evaporation * temperature + basin * (temperature - p.ground);
}

function poolCourse(p: PoolParams, heat: number): Course {
  const { evaporation, basin } = poolLosses(p);
  const k = evaporation + basin;
  return {
    balance: (heat + basin * p.ground) / k,
    tau: (p.volume * WATER_HEAT) / k,
  };
}

/** Its evaporation at `temperature`, kg/h. */
const evaporationAt = (p: PoolParams, temperature: number) =>
  p.area *
  Math.max(0, temperature) *
  EVAPORATION_PER_DEGREE *
  ACTIVITY_FACTOR[p.activity];

function poolAfter(
  p: PoolParams,
  s: PoolState,
  heat: number,
  makeUp: number,
  seconds: number,
) {
  const hours = seconds / 3600;
  const { temp, mean } = along(poolCourse(p, heat), s.temp, hours);
  // Its water: made up, less what evaporated (at its mean temperature over the time).
  const water = Math.min(
    p.volume,
    s.water + (makeUp - evaporationAt(p, mean) / 1000) * hours,
  );
  return { temp, water };
}

function poolOutputs(p: PoolParams, temp: number, water: number) {
  return {
    temperature: temp,
    evaporation: evaporationAt(p, temp),
    // Below its brim, m (negative: down).
    level: (water - p.volume) / p.area,
    loss: poolHoldingHeat(p, temp),
  };
}

const num = (v: unknown) => (typeof v === 'number' ? v : 0);

export const POOL: BlockKind<PoolParams, PoolState> = {
  kind: 'pool',
  inputs: [
    { name: 'heat', unit: 'kW', about: 'from its heat exchanger' },
    { name: 'makeUp', unit: 'm³/h', about: 'from the break tank' },
  ],
  outputs: [
    { name: 'temperature', unit: '°C' },
    { name: 'evaporation', unit: 'kg/h' },
    { name: 'level', unit: 'm', about: 'below its brim' },
    { name: 'loss', unit: 'kW' },
  ],
  params: {
    area: 400,
    basin: 600,
    volume: 800,
    activity: 'calm',
    start: 28,
    ground: GROUND,
  },
  init: (p) => ({ temp: p.start, water: p.volume, at: 0 }),
  // Its state now, asleep or not: carried on exactly from when it last stepped.
  read(p, s, inputs, t) {
    const { temp, water } = poolAfter(
      p,
      s,
      num(inputs.heat),
      num(inputs.makeUp),
      t - s.at,
    );
    return poolOutputs(p, temp, water);
  },
  step(p, s, inputs, dt, t) {
    const { temp, water } = poolAfter(
      p,
      s,
      num(inputs.heat),
      num(inputs.makeUp),
      dt,
    );
    return {
      state: { temp, water, at: t },
      outputs: poolOutputs(p, temp, water),
      // Exact on any course its inputs hold it to: asleep until they change.
      sleep: { until: Infinity, hold: { heat: 0.5, makeUp: 0.002 } },
    };
  },
};

// ---- The hall -----------------------------------------------------------------

export interface HallParams {
  /** Its air, m³, and its fabric, m²: walls, and a roof and a floor of `roof` each. */
  air: number;
  walls: number;
  roof: number;
  /** Air changes an hour, and the share of their heat recovered. */
  changes: number;
  recovered: number;
  /** The heat its fabric stores, kWh per kelvin (concrete and tile soak up heat). */
  mass: number;
  outside: number;
  ground: number;
  start: number;
}

export interface HallState {
  temp: number;
  at: number;
}

function hallLosses(p: HallParams) {
  const toAir =
    U.wall * p.walls +
    U.roof * p.roof +
    p.air * p.changes * AIR_HEAT * (1 - p.recovered);
  const toGround = U.floor * p.roof;
  return { toAir, toGround };
}

/** The heat a hall needs to hold `temperature`, kW. */
export function hallHoldingHeat(p: HallParams, temperature: number) {
  const { toAir, toGround } = hallLosses(p);
  return (
    toAir * (temperature - p.outside) + toGround * (temperature - p.ground)
  );
}

function hallCourse(p: HallParams, heat: number): Course {
  const { toAir, toGround } = hallLosses(p);
  const k = toAir + toGround;
  return {
    balance: (heat + toAir * p.outside + toGround * p.ground) / k,
    tau: (p.air * AIR_HEAT + p.mass) / k,
  };
}

/** A concrete-and-tile fabric's stored heat, kWh per kelvin per m². */
export const FABRIC_MASS = 0.05;

export const HALL: BlockKind<HallParams, HallState> = {
  kind: 'pool-hall',
  inputs: [
    { name: 'heat', unit: 'kW', about: 'from its air handling unit' },
    { name: 'evaporation', unit: 'kg/h', about: 'from its pools' },
  ],
  outputs: [
    { name: 'temperature', unit: '°C' },
    {
      name: 'dehumidify',
      unit: 'kg/h',
      about: 'moisture its air handling must take out',
    },
    { name: 'loss', unit: 'kW' },
  ],
  params: {
    air: 5000,
    walls: 600,
    roof: 1000,
    changes: 4,
    recovered: 0.6,
    mass: FABRIC_MASS * 2600,
    outside: OUTSIDE,
    ground: GROUND,
    start: 29,
  },
  init: (p) => ({ temp: p.start, at: 0 }),
  read(p, s, inputs, t) {
    const { temp } = along(
      hallCourse(p, num(inputs.heat)),
      s.temp,
      (t - s.at) / 3600,
    );
    return {
      temperature: temp,
      dehumidify: num(inputs.evaporation),
      loss: hallHoldingHeat(p, temp),
    };
  },
  step(p, s, inputs, dt, t) {
    const { temp } = along(hallCourse(p, num(inputs.heat)), s.temp, dt / 3600);
    return {
      state: { temp, at: t },
      outputs: {
        temperature: temp,
        dehumidify: num(inputs.evaporation),
        loss: hallHoldingHeat(p, temp),
      },
      sleep: { until: Infinity, hold: { heat: 0.5, evaporation: 0.1 } },
    };
  },
};
