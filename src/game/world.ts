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
import { newPools, stepPools } from './plant/pools';
import type { PoolsState } from './plant/pools';

export const WORLD_VERSION = 4;

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
}

export function newWorld(): World {
  return {
    time: 0,
    demo: { on: false, presses: 0 },
    plant: newPlantServices(),
    pools: newPools(),
  };
}

/** What a room may do to the world. */
export type WorldAction =
  | { type: 'demo/set'; on: boolean }
  | { type: 'demo/reset' }
  | { type: 'plant/source'; utility: Utility; on: boolean }
  | { type: 'plant/feeder'; room: ServiceRoom; on: boolean }
  | { type: 'plant/isolator'; name: IsolatorName; on: boolean };

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
  return {
    ...world,
    time: world.time + delta,
    pools: stepPools(world.pools, world.plant, delta, world.time),
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
