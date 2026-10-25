import type { World } from '../world';
import { circulating } from './pools';
import type { PoolId } from './pools';
import type { IsolatorName } from './services';

/**
 * A pool's UV unit as the world has it: its lamp lit while its pool's
 * water circulates and its local isolator is closed. The world models no
 * lamp failure or other fault, so this is all that can be said of it: lit
 * or not, never "operational" (prompt 068). Pure.
 */

/** Each pool's UV unit's local isolator. */
export const UV_ISOLATORS: Partial<Record<PoolId, IsolatorName>> = {
  pool_01: 'Lounge UV unit isolator',
  pool_02: 'UV unit isolator',
};

/** Whether a pool's UV lamp is lit, as the world stands. */
export function uvLampOn(
  world: Pick<World, 'pools' | 'plant' | 'motors'>,
  pool: PoolId,
): boolean {
  const isolator = UV_ISOLATORS[pool];
  return (
    circulating(world.pools[pool], world.plant, pool, world.motors) &&
    (isolator ? world.plant.isolators[isolator] : true)
  );
}
