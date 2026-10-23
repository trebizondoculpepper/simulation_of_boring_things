import { footbathLineup } from './identification';
import type { Block } from '../sim/blocks';
import { poolDepth } from './pools';
import type { PoolWaterState } from './pools';

/**
 * Whether the foot spa's water is running away down its drain (the owner,
 * 2026-10-23: heard gurgling into its tundish): lined up to drain, its
 * return shut and its drain-down open, the cabinet's pump powered and its
 * isolator on to push it there, the pump not tripped, and water still in
 * the bath.
 */
export function footbathDischarging(
  plant: Block,
  pool: Pick<PoolWaterState, 'level' | 'tripped'>,
  isolatorOn: boolean,
): boolean {
  const lineup = footbathLineup(plant);
  return (
    lineup.draining &&
    lineup.powered &&
    isolatorOn &&
    !pool.tripped &&
    pool.level > -poolDepth('pool_04') + 0.001
  );
}
