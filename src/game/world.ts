/**
 * The game's one world state: everything that carries on whichever room
 * the player is in, and is saved (`save.ts`). Plain data (numbers,
 * strings, booleans, arrays and records), so it saves as it stands;
 * changed only by stepping it on with time or by applying an action.
 * Pure: rooms show it and act on it, but none owns any of it.
 *
 * For now it holds the clock and the remote-control demonstration of
 * dev14 and dev15: a button in one room, its lamp and reset in another.
 * The plant moves in here system by system.
 */

/** Bumped whenever the world's shape changes; `save.ts` migrates older saves. */
import { newPlantServices } from './plant/services';
import type {
  IsolatorName,
  PlantServices,
  ServiceRoom,
  Utility,
} from './plant/services';
import {
  HALL_AIR,
  POOL_IDS,
  POOL_TARGET,
  dosedVolumes,
  makeUpDemand,
  newPools,
  stepPoolsWater,
} from './plant/pools';
import {
  makeUpShare,
  newWetHall,
  resetBooster,
  stepWetHall,
} from './plant/wet-hall';
import type { WetHallState } from './plant/wet-hall';
import { newBathers, poolAppeal, stepBathers } from './bathers';
import { newLighting, zoneLit, zoneOfRoom } from './plant/lighting';
import { AMBIENT } from './plant/thermal';
import type { LightingState, LightingZoneId } from './plant/lighting';
import { fullOff, fullOn, slowStartAt, slowStartBegin } from './plant/startup';
import type { BathersState } from './bathers';
import {
  deliver,
  inStock,
  newChemicalStores,
  stepChemicalStores,
} from './plant/chemicals';
import type { Chemical, ChemicalStores } from './plant/chemicals';
import type { PoolId, PoolsState } from './plant/pools';
import {
  actOnGasZone,
  newGasZones,
  setGasLeak,
  stepGasZones,
} from './plant/gas';
import type { GasZoneAction, GasZoneId, GasZones } from './plant/gas';

export const WORLD_VERSION = 12;

export interface World {
  /** Seconds the world has run. */
  time: number;
  /** dev14's button, as dev15 shows it. */
  demo: {
    /** Whether the button is on. */
    on: boolean;
    /** How many times it has been switched on. */
    presses: number;
  };
  plant: PlantServices;
  pools: PoolsState;
  /** The dosing chemicals left in their stores, litres. */
  chemicals: ChemicalStores;
  /** The wet hall's break tank, booster set, meter and backwash tank. */
  wetHall: WetHallState;
  /** The pools' unseen bathers (`bathers.ts`). */
  bathers: BathersState;
  /** When SLOW START began, world seconds; -1 when none is under way. */
  startup: number;
  /** The lighting's switches: DB-LIGHTING and each zone's breaker (`lighting.ts`). */
  lighting: LightingState;
  /** The outside's temperature, °C: everything unheated settles to it (`thermal.ts`). */
  ambient: number;
  /** The toxic gas detection's rooms: their air, detectors and leaks (`gas.ts`). */
  gas: GasZones;
}

export function newWorld(): World {
  return {
    time: 0,
    demo: { on: false, presses: 0 },
    plant: newPlantServices(),
    pools: newPools(),
    chemicals: newChemicalStores(),
    wetHall: newWetHall(),
    bathers: newBathers(),
    startup: -1,
    lighting: newLighting(),
    ambient: AMBIENT,
    gas: newGasZones(),
  };
}

/** What a room may do to the world. */
export type WorldAction =
  | { type: 'demo/set'; on: boolean }
  | { type: 'demo/reset' }
  | { type: 'plant/source'; utility: Utility; on: boolean }
  | { type: 'plant/feeder'; room: ServiceRoom; on: boolean }
  | { type: 'plant/isolator'; name: IsolatorName; on: boolean }
  | { type: 'plant/delivery'; chemical: Chemical; litres: number }
  | { type: 'plant/booster-reset' }
  | { type: 'plant/full-off' }
  | { type: 'plant/full-on' }
  | { type: 'plant/slow-start' }
  | { type: 'weather/ambient'; celsius: number }
  | { type: 'lighting/supply'; on: boolean }
  | { type: 'lighting/zone'; zone: LightingZoneId; on: boolean }
  | { type: 'gas/leak'; zone: GasZoneId; gramsPerHour: number }
  | { type: 'gas/act'; zone: GasZoneId; act: GasZoneAction }
  /** The world run on at once, a second at a time: for trying things out. */
  | { type: 'time/skip'; seconds: number };

export function applyAction(world: World, action: WorldAction): World {
  switch (action.type) {
    case 'demo/set':
      if (world.demo.on === action.on) return world;
      return {
        ...world,
        demo: {
          on: action.on,
          presses: world.demo.presses + (action.on ? 1 : 0),
        },
      };
    case 'demo/reset':
      return world.demo.on
        ? { ...world, demo: { ...world.demo, on: false } }
        : world;
    case 'plant/source':
      return world.plant.sources[action.utility] === action.on
        ? world
        : {
            ...world,
            plant: {
              ...world.plant,
              sources: { ...world.plant.sources, [action.utility]: action.on },
            },
          };
    case 'plant/isolator':
      return world.plant.isolators[action.name] === action.on
        ? world
        : {
            ...world,
            plant: {
              ...world.plant,
              isolators: { ...world.plant.isolators, [action.name]: action.on },
            },
          };
    case 'plant/delivery':
      return {
        ...world,
        chemicals: deliver(world.chemicals, action.chemical, action.litres),
      };
    case 'time/skip':
      return action.seconds > 0 ? advance(world, action.seconds, 1) : world;
    case 'gas/leak': {
      const gas = setGasLeak(world.gas, action.zone, action.gramsPerHour);
      return gas === world.gas ? world : { ...world, gas };
    }
    case 'gas/act': {
      const gas = actOnGasZone(world.gas, action.zone, action.act);
      return gas === world.gas ? world : { ...world, gas };
    }
    case 'weather/ambient':
      return world.ambient === action.celsius
        ? world
        : { ...world, ambient: action.celsius };
    case 'lighting/supply':
      return world.lighting.supply === action.on
        ? world
        : { ...world, lighting: { ...world.lighting, supply: action.on } };
    case 'lighting/zone':
      return world.lighting.zones[action.zone] === action.on
        ? world
        : {
            ...world,
            lighting: {
              ...world.lighting,
              zones: { ...world.lighting.zones, [action.zone]: action.on },
            },
          };
    case 'plant/full-off':
      return { ...world, plant: fullOff(world.plant), startup: -1 };
    case 'plant/full-on':
      return {
        ...world,
        plant: fullOn(world.plant),
        wetHall: resetBooster(world.wetHall),
        lighting: newLighting(),
        startup: -1,
      };
    case 'plant/slow-start':
      return {
        ...world,
        plant: slowStartBegin(world.plant),
        startup: world.time,
      };
    case 'plant/booster-reset': {
      const wetHall = resetBooster(world.wetHall);
      return wetHall === world.wetHall ? world : { ...world, wetHall };
    }
    case 'plant/feeder':
      return world.plant.feeders[action.room] === action.on
        ? world
        : {
            ...world,
            plant: {
              ...world.plant,
              feeders: { ...world.plant.feeders, [action.room]: action.on },
            },
          };
  }
}

/** The world `delta` seconds on. */
export function stepWorld(world: World, delta: number): World {
  // SLOW START, closing the feeders in turn as it goes.
  if (world.startup >= 0) {
    const s = slowStartAt(world.plant, world.time - world.startup);
    world = { ...world, plant: s.plant, startup: s.done ? -1 : world.startup };
  }
  // What the stores have, as the step begins; the pools dose from it, and
  // the stores give what was dosed.
  const stock = {
    hypochlorite: inStock(world.chemicals, 'hypochlorite'),
    acid: inStock(world.chemicals, 'acid'),
  };
  // The make-up the booster set can give the pools' float valves calling.
  const share = makeUpShare(
    world.wetHall,
    world.plant,
    makeUpDemand(world.pools),
  );
  const water = stepPoolsWater(
    world.pools,
    world.plant,
    delta,
    world.time,
    stock,
    share,
    world.ambient,
  );
  return {
    ...world,
    time: world.time + delta,
    pools: water.pools,
    wetHall: stepWetHall(world.wetHall, world.plant, water, delta),
    bathers: stepBathers(world.bathers, world.time, delta, appealOf(world)),
    gas: stepGasZones(world.gas, world.plant, delta),
    chemicals: stepChemicalStores(
      world.chemicals,
      dosedVolumes(world.pools, world.plant, stock),
      delta,
    ),
  };
}

/** The world's fixed time step, seconds. */
export const STEP = 0.1;

/**
 * The world `seconds` on, in fixed steps, as when catching up on the time
 * the game was closed or its tab hidden.
 */
export function advance(world: World, seconds: number, step = STEP): World {
  let w = world;
  let left = seconds;
  while (left > 1e-9) {
    const d = Math.min(step, left);
    w = stepWorld(w, d);
    left -= d;
  }
  return w;
}

/** How much each pool is wanted now, as its bathers find it (`poolAppeal`). */
export function appealOf(world: World): Record<PoolId, number> {
  return Object.fromEntries(
    POOL_IDS.map((id) => {
      const p = world.pools[id];
      const zone = zoneOfRoom(id);
      return [
        id,
        poolAppeal({
          temperature: p.temperature,
          target: POOL_TARGET[id].temp,
          ph: p.ph,
          freeChlorine: p.freeChlorine,
          combinedChlorine: p.combinedChlorine,
          circulating: !p.tripped && p.flow > POOL_TARGET[id].flow / 2,
          hallAir: p.hallAir,
          hallTarget: HALL_AIR[id],
          // Its lights on: daylight is not enough.
          lit: !zone || zoneLit(world.plant, world.lighting, zone),
          spa: id === 'pool_03',
        }),
      ];
    }),
  ) as Record<PoolId, number>;
}
