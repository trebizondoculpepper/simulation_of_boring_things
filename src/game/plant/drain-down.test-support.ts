import { advance, applyAction } from '../world';
import type { World } from '../world';
import { poolDepth } from './pools';
import type { PoolId } from './pools';

/**
 * The drain-down runbook, run on the model: close the pool's make-up,
 * open its drain-down valves, and let the pumps take it to the sewer at
 * the consented rate until it is empty; then refill it.
 */
export const drainDown = (w: World, pool: PoolId) =>
  applyAction(applyAction(w, { type: 'pool/make-up', pool, open: false }), {
    type: 'pool/drain-down',
    pool,
    open: true,
  });

/** Hours until `pool` is empty, stepping a minute at a time (or `limit`). */
export function hoursToEmpty(w: World, pool: PoolId, limit = 400) {
  for (let h = 0; h < limit * 60; h++) {
    if (w.pools[pool].level <= -poolDepth(pool) + 1e-6)
      return { hours: h / 60, w };
    w = advance(w, 60, 60);
  }
  return { hours: Infinity, w };
}
