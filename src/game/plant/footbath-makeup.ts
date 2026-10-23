import type { World } from '../world';
import { footbathLineup } from './identification';
import { makeUpCalls } from './olympic-tank';
import { makeUpDemand, olympicTankLevel } from './pools';
import { makeUpShare } from './wet-hall';

/**
 * Whether fresh make-up water is entering the foot spa now (`doc/prompts/
 * 041-footspa-makeup-jets.md`): its make-up valve open, its balance tank's
 * float calling, and the wet hall's booster set able to supply it. Seen as
 * the streams and rings at its inlets. A stand-in, from the model as it
 * is committed, for `footbathFilling` in `world.ts`, which asks the same.
 */
export function footbathMakeUpEntering(world: World): boolean {
  if (!footbathLineup(world.identifiedPlant).makeUpOpen) return false;
  // Its own float calling: the demand with only it asking.
  const alone = makeUpDemand(world.pools, {
    pool_01: false,
    pool_02: false,
    pool_03: false,
  });
  if (alone <= 0) return false;
  const calling = makeUpCalls(
    world.olympicTank,
    olympicTankLevel(world.pools.pool_02.balance),
  );
  return (
    makeUpShare(
      world.wetHall,
      world.plant,
      makeUpDemand(world.pools, { pool_02: calling }),
    ) > 0
  );
}
