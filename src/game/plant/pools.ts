import { ROOM_SERVICES, serviceAvailable } from './services';
import type { IsolatorName, PlantServices, ServiceRoom } from './services';
import { stepWater } from '../water/water-balance';
import type { PoolWater } from '../water/water-balance';
import { POOLS } from '../plant-sizing/pools.config';
import { ASSUME, sizePlant } from '../plant-sizing/sizing';
import { phTarget } from './chemicals';
import { BALANCE_TANK, volumeOf } from './balance-tank';
import { AMBIENT, stepThermal, thermalParams } from './thermal';
import type { ThermalParams } from './thermal';
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
  /** Its hall's air temperature, °C. */
  hallAir: number;
  /** The heat its water's and its hall's heaters are giving now, kW (`thermal.ts`). */
  heating: number;
  /** Whether it is being drained down to the sewer (its drain-down valves open). */
  drainDown: boolean;
  /** Its water's thermostat's setting, °C: its design temperature until someone sets it (`pool/setpoint`). */
  setpoint: number;
  /** Whether its make-up valve is open, to take water from the wet hall. */
  makeUp: boolean;
}

export type PoolsState = Record<PoolId, PoolWaterState>;

/**
 * Each pool hall's design air temperature, °C: a pool hall's about 1 °C
 * over its water, to keep evaporation down (the lounge, the Olympic); a
 * spa's room and the footbath passage kept comfortably warm, not at the
 * spa water's 37 °C.
 */
export const HALL_AIR: Record<PoolId, number> = {
  pool_01: 31,
  pool_02: 29,
  pool_03: 30,
  pool_04: 28,
};
/**
 * Each pool hall, metres: length, breadth and mean height (the plant
 * sizing's hall volumes): the lounge 28 × 20 under a 7 m roof; the
 * Olympic 66 × 40 under a roof sloping from 9 to 23.6 m; the jacuzzi room
 * 10 × 8 × 9; the footbath passage 4 × 9 × 3.
 */
const HALL_SHAPE: Record<PoolId, { w: number; d: number; h: number }> = {
  pool_01: { w: 28, d: 20, h: 7 },
  pool_02: { w: 66, d: 40, h: 16.3 },
  pool_03: { w: 10, d: 8, h: 9 },
  pool_04: { w: 4, d: 9, h: 3 },
};

/** Each pool's design temperature, °C, and circulation, m³/h. */
export const POOL_TARGET: Record<PoolId, { temp: number; flow: number }> = {
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
        // The Olympic's tank at its working depth (Dev28's start, 3.1 m), the others' at their floats.
        balance: id === 'pool_02' ? 3.1 / BALANCE_TANK.weir : 0.68,
        temperature: POOL_TARGET[id].temp,
        setpoint: POOL_TARGET[id].temp,
        ph: 7.4,
        freeChlorine: 1.4,
        combinedChlorine: 0.12,
        redox: 720,
        flow: POOL_TARGET[id].flow,
        tripped: false,
        hallAir: HALL_AIR[id],
        heating: 0,
        drainDown: false,
        makeUp: true,
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
      depth: c.body.volume / c.body.area,
    };
  }
  // The Olympic's tank as built (Dev28, `balance-tank.ts`): cast concrete,
  // its weir at 4.0 m, the plant floor over it a storey below the deck; its
  // make-up the 30 m³/h of its 54 mm feed, switched by its own level band
  // (`world.ts`); LOW LOW at 1.0 m.
  const T = BALANCE_TANK;
  out.pool_02 = {
    ...out.pool_02,
    tank: volumeOf(T.weir),
    tankDepth: T.weir,
    tankBelow: T.weir,
    makeUpRate: T.makeup,
    float: T.makeupOn / T.weir,
    lowLow: T.lowLow / T.weir,
  };
  return out;
})();

/** The Olympic's tank's water depth, m, from its balance (its share of the water to the weir). */
export const olympicTankLevel = (balance: number) =>
  balance * BALANCE_TANK.weir;

/** Each pool's mean depth, m: empty with its surface this far below its lip. */
export const poolDepth = (id: PoolId) => WATER[id].depth;

/** The foot spa cabinet's low-water cutout: tank low-low, or an empty bath while pumping to drain. */
export const footbathPumpStarved = (
  pool: Pick<PoolWaterState, 'level' | 'tripped'>,
  draining: boolean,
) => pool.tripped || (draining && pool.level <= -poolDepth('pool_04') + 0.001);

/** Whether this pool's balance tank float is calling for fresh water. */
export const poolMakeUpCalling = (
  id: PoolId,
  pool: Pick<PoolWaterState, 'balance'>,
) => pool.balance < WATER[id].float;
/** Each pool's volume brimming, m³, and its surface's area, m². */
export const poolVolume = (id: PoolId) => WATER[id].volume;
export const poolArea = (id: PoolId) => WATER[id].area;

/** Each pool and its hall's thermal parameters (`thermal.ts`). */
const HEAT: Record<PoolId, ThermalParams> = Object.fromEntries(
  POOL_IDS.map((id) => [
    id,
    thermalParams({
      area: WATER[id].area,
      volume: WATER[id].volume,
      evaporation: WATER[id].evaporation,
      hall: HALL_SHAPE[id],
      water: POOL_TARGET[id].temp,
      air: HALL_AIR[id],
    }),
  ]),
) as Record<PoolId, ThermalParams>;

const approach = (value: number, target: number, rate: number, dt: number) =>
  value + (target - value) * Math.min(1, rate * dt);
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * Whether a pool's water is circulating, and so treated and dosed: its
 * room has power, one of its pumps' isolators is on, and its pumps have
 * not tripped. The pumps move the pool's own water: the mains has no say.
 */
export function circulating(
  old: PoolWaterState,
  plant: PlantServices,
  id: PoolId,
): boolean {
  const room = `plant_${id}` as ServiceRoom;
  return (
    serviceAvailable(plant, room, 'power') &&
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
  /**
   * The share of each pool's make-up rate the wet hall's booster set
   * gives (`wet-hall.ts`); by default, all of it while the wet hall has
   * water, none without.
   */
  makeUp?: number,
  /** The outside's temperature, °C. */
  ambient = AMBIENT,
): PoolsState {
  return stepPoolsWater(pools, plant, dt, time, stock, makeUp, ambient).pools;
}

/**
 * What the pools' make-ups call for now, m³/h: each whose balance tank is
 * below its float, or, where a pool's own control says (`calling`: the
 * Olympic's), as it says.
 */
export function makeUpDemand(
  pools: PoolsState,
  calling: Partial<Record<PoolId, boolean>> = {},
): number {
  return POOL_IDS.reduce(
    (sum, id) =>
      sum +
      ((calling[id] ?? poolMakeUpCalling(id, pools[id]))
        ? WATER[id].makeUpRate
        : 0),
    0,
  );
}

/**
 * The pools `dt` seconds on (as `stepPools`), with the water they drew
 * from the make-up main and backwashed to waste during the step, m³.
 */
export function stepPoolsWater(
  pools: PoolsState,
  plant: PlantServices,
  dt: number,
  time = 0,
  stock: ChemicalStock = ALL_STOCKED,
  makeUp?: number,
  ambient = AMBIENT,
  /**
   * What the sewer will take from pools draining down now, m³/h: the
   * site's consent, less the backwash's discharge; shared among them.
   */
  sewer = 0,
  footbath?: {
    makeUpOpen: boolean;
    draining: boolean;
    returning: boolean;
    powered: boolean;
  },
  /**
   * The Olympic's circulation by its own plant's model (`olympic-battery.ts`),
   * given whether its pumps run: what reaches the pool, and what goes to
   * waste, m³/h. Without it, its design flow and a day's backwash.
   */
  olympic?: (running: boolean) => {
    toPool: number;
    toWaste: number;
    /** Whether its make-up control calls for water. */
    makeUpCalling: boolean;
  },
): {
  pools: PoolsState;
  drawn: number;
  backwashed: number;
  /** Pumped to the sewer by pools draining down, m³. */
  drained: number;
} {
  const share =
    makeUp ?? (serviceAvailable(plant, 'wet_hall', 'water') ? 1 : 0);
  let drawn = 0;
  let backwashed = 0;
  let drained = 0;
  // The pools draining down now, sharing what the sewer will take.
  const draining = POOL_IDS.filter(
    (id) =>
      (id === 'pool_04' && footbath
        ? footbath.draining
        : pools[id].drainDown) &&
      circulating(pools[id], plant, id) &&
      (id !== 'pool_04' ||
        !footbath ||
        !footbathPumpStarved(pools[id], footbath.draining)) &&
      (id !== 'pool_04' || !footbath || footbath.powered),
  );
  const drainRate = draining.length ? sewer / draining.length : 0;
  const next = {} as PoolsState;
  for (const id of POOL_IDS) {
    const room = `plant_${id}` as ServiceRoom;
    const old = pools[id];
    const drainDown =
      id === 'pool_04' && footbath ? footbath.draining : old.drainDown;
    const makeUpOpen =
      id === 'pool_04' && footbath ? footbath.makeUpOpen : old.makeUp;
    // The pumps run if the room has power, and one of them, or
    // the pool's cabinet, is not isolated; and not tripped.
    const circulation =
      circulating(old, plant, id) &&
      (id !== 'pool_04' ||
        !footbath ||
        !footbathPumpStarved(old, footbath.draining)) &&
      (id !== 'pool_04' || !footbath || footbath.powered);
    // UV and ozone, where they are isolated, break down the combined
    // chlorine (the chloramines) as the water passes.
    const uv =
      circulation &&
      (!(id in TREATED_BY) ||
        TREATED_BY[id]!.some((name) => plant.isolators[name]));
    // The Olympic's battery, if its model is given: what its valves let through.
    const battery = id === 'pool_02' && olympic ? olympic(circulation) : null;
    const heat = circulation && serviceAvailable(plant, room, 'heat');
    const dosing = circulation && serviceAvailable(plant, room, 'chemical');
    // Each chemical dosed only while its store has some.
    const hypochlorite = dosing && stock.hypochlorite;
    const acid = dosing && stock.acid;
    // Its treatment's flow: none while it is drained down to the sewer.
    const flow = approach(
      old.flow,
      circulation &&
        !drainDown &&
        (id !== 'pool_04' || !footbath || footbath.returning)
        ? (battery?.toPool ?? POOL_TARGET[id].flow)
        : 0,
      0.08,
      dt,
    );
    // Its water: the tested balance of pool and tank (`water-balance.ts`),
    // a step on, its make-up open at the share the booster set gives.
    const params = { ...WATER[id], makeUpRate: WATER[id].makeUpRate * share };
    const water = stepWater(
      params,
      {
        time: time / 3600,
        level: old.level,
        tankVolume: old.balance * params.tank,
        pumps:
          circulation &&
          (id !== 'pool_04' ||
            !footbath ||
            footbath.draining ||
            footbath.returning),
        tripped: old.tripped,
        // Its make-up valve open, and the wet hall giving water.
        makeUpOpen: share > 0 && makeUpOpen,
        drainDown,
        drainRate,
        drained: 0,
        spilt: 0,
        backwashed: 0,
        evaporated: 0,
        madeUp: 0,
        ...(battery
          ? {
              pumpFlow: battery.toPool,
              toWaste: battery.toWaste,
              makeUpCalling: battery.makeUpCalling,
            }
          : {}),
      },
      dt / 3600,
      // Sub-steps of at most 5 s. Not that a small pool fills fast (the
      // footbath takes most of an hour from empty), but its level settles
      // on its overflow lip within seconds (the jacuzzi's in about 6 s),
      // and a longer step overshoots it.
      Math.min(dt, 5) / 3600,
    );
    drawn += water.madeUp;
    backwashed += water.backwashed;
    drained += water.drained;
    // Tripped on low-low, the pumps restart once the tank has recovered.
    const balance = water.tankVolume / params.tank;
    const tripped = water.tripped && balance < params.float * 0.8;
    const level = water.level;
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
    // The water's and the hall's heat (`thermal.ts`): the water heated
    // while it circulates and the heating is on; the hall's air while its
    // air handling and the heating are on (the footbath passage has no air
    // handling of its own).
    const hasAir = (ROOM_SERVICES[room] as readonly string[]).includes('air');
    const handled = hasAir ? serviceAvailable(plant, room, 'air') : true;
    const heatAir = handled && serviceAvailable(plant, room, 'heat');
    const thermal = stepThermal(
      { water: old.temperature, air: old.hallAir },
      HEAT[id],
      {
        heatWater: heat,
        heatAir,
        ambient,
        // Its air handling running; the footbath passage, which has none of
        // its own, its extract while its room has power.
        ventilated: hasAir
          ? serviceAvailable(plant, room, 'air')
          : serviceAvailable(plant, room, 'power'),
        madeUp: water.madeUp,
        waterSet: old.setpoint ?? POOL_TARGET[id].temp,
      },
      dt,
    );
    const temperature = thermal.water;
    const hallAir = thermal.air;
    const heating = (thermal.waterHeat + thermal.airHeat) / 1000;
    next[id] = {
      level,
      balance,
      temperature,
      hallAir,
      heating,
      ph,
      freeChlorine,
      combinedChlorine,
      redox: clamp(620 + freeChlorine * 72 - (ph - 7.4) * 45, 0, 999),
      flow,
      tripped,
      drainDown,
      makeUp: makeUpOpen,
      setpoint: old.setpoint ?? POOL_TARGET[id].temp,
    };
  }
  return { pools: next, drawn, backwashed, drained };
}
