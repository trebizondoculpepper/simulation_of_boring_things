/**
 * The worlds the title's attract sequence shows (the owner, 2026-10-24;
 * `doc/prompts/054-title-attract-sequence.md`): prepared just for it, never
 * the player's. Each is a world built from a new one by a few actions and
 * frozen, so it cannot be changed, and each shot starts from its own
 * afresh, the same every time, and runs on from it while it is seen
 * (filters turning, water moving) without ever being saved. Pure.
 */
import { advance, applyAction, newWorld } from './world';
import type { World, WorldAction } from './world';
import { poolDepth } from './plant/pools';
import type { PoolId } from './plant/pools';

export type AttractScenarioId = 'normal' | 'lights-out' | 'pools-drained';

/** A preset: what it is, and how it is made from a new world. */
interface Preset {
  title: string;
  make(): World;
}

/** A new world run on a minute, settled: everything on and running. */
const settled = () => advance(newWorld(), 60, 1);

const acting = (world: World, ...actions: WorldAction[]) =>
  actions.reduce(applyAction, world);

/** A pool drained to its floor, its drain-down shut again. */
const drained = (world: World, ...ids: PoolId[]): World => ({
  ...world,
  pools: {
    ...world.pools,
    ...Object.fromEntries(
      ids.map((id) => [
        id,
        { ...world.pools[id], level: -poolDepth(id), drainDown: false },
      ]),
    ),
  },
});

const PRESETS: Record<AttractScenarioId, Preset> = {
  normal: {
    title: 'Everything on and running',
    make: settled,
  },
  'lights-out': {
    title: 'The main lighting circuit switched off',
    make: () => acting(settled(), { type: 'lighting/supply', on: false }),
  },
  'pools-drained': {
    title: 'The lounge pool and the jacuzzi drained',
    make: () => drained(settled(), 'pool_01', 'pool_03'),
  },
};

/** Every preset's id, in a stable order. */
export const ATTRACT_SCENARIOS = Object.keys(PRESETS) as AttractScenarioId[];

/** What a preset is, for the shot list and the manual. */
export const attractScenarioTitle = (id: AttractScenarioId) =>
  PRESETS[id].title;

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
};

const made = new Map<AttractScenarioId, World>();

/** A preset's world: made once, frozen, the same thereafter. */
export function attractScenario(id: AttractScenarioId): World {
  let world = made.get(id);
  if (!world) {
    world = deepFreeze(PRESETS[id].make());
    made.set(id, world);
  }
  return world;
}
