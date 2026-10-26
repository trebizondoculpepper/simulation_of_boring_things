import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import {
  INTO_THE_PIT,
  POOL_IDS,
  POOL_TARGET,
  poolArea,
  poolDepth,
  poolVolume,
} from './pools';
import type { PoolId } from './pools';
import { WET_HALL_PLANT } from './wet-hall';

/**
 * The drain-down runbook, run on the model: close the pool's make-up,
 * open its drain-down valves, and let the pumps take it to the sewer at
 * the consented rate until it is empty; then refill it.
 */
const drainDown = (w: World, pool: PoolId) =>
  applyAction(applyAction(w, { type: 'pool/make-up', pool, open: false }), {
    type: 'pool/drain-down',
    pool,
    open: true,
  });

/** Hours until `pool` is empty, stepping a minute at a time (or `limit`). */
function hoursToEmpty(w: World, pool: PoolId, limit = 400) {
  for (let h = 0; h < limit * 60; h++) {
    if (w.pools[pool].level <= -poolDepth(pool) + 1e-6)
      return { hours: h / 60, w };
    w = advance(w, 60, 60);
  }
  return { hours: Infinity, w };
}

describe('draining a pool down', () => {
  const ready = advance(newWorld(), 600, 10);

  it('empties each pool, one at a time: the big pools to the sewer at its consent, the spas into the backwash pit', () => {
    for (const pool of POOL_IDS) {
      const { hours, w } = hoursToEmpty(drainDown(ready, pool), pool);
      // The consent, 10 m³/h, or the pool's own pumps if they are slower;
      // the backwash's discharge takes the consent while it runs. A spa's
      // own drain line into the pit runs at its circulation's rate.
      const expected =
        poolVolume(pool) /
        (INTO_THE_PIT.has(pool)
          ? POOL_TARGET[pool].flow
          : WET_HALL_PLANT.sewerConsent);
      if (INTO_THE_PIT.has(pool))
        expect(w.wetHall.backwashTank, pool).toBeGreaterThan(
          poolVolume(pool) * 0.5,
        );
      expect(hours, pool).toBeGreaterThan(expected * 0.95);
      expect(hours, pool).toBeLessThan(expected * 1.25 + 0.2);
      expect(w.pools[pool].level, pool).toBeCloseTo(-poolDepth(pool), 6);
      // The other pools stay full.
      for (const other of POOL_IDS.filter((p) => p !== pool))
        expect(w.pools[other].level, other).toBeGreaterThan(-0.05);
    }
  }, 120_000);

  it('does not drain while its pumps cannot run', () => {
    const off = applyAction(drainDown(ready, 'pool_01'), {
      type: 'plant/feeder',
      room: 'plant_pool_01',
      on: false,
    });
    const later = advance(off, 3600, 60);
    // Only the gravity fall to its tank, not the sewer.
    expect(later.pools.pool_01.level).toBeGreaterThan(-0.25);
  });

  it('closes a pool to bathers once it is more than 15 cm down', () => {
    const w = advance(drainDown(ready, 'pool_01'), 3 * 3600, 60);
    expect(w.pools.pool_01.level).toBeLessThan(-0.15);
    expect(w.pools.pool_01.flow).toBeLessThan(1);
  });

  it('refills once the drain-down is shut and the make-up opened', () => {
    let w = hoursToEmpty(drainDown(ready, 'pool_04'), 'pool_04').w;
    w = applyAction(w, {
      type: 'pool/drain-down',
      pool: 'pool_04',
      open: false,
    });
    w = applyAction(w, { type: 'pool/make-up', pool: 'pool_04', open: true });
    w = advance(w, 6 * 3600, 30);
    expect(w.pools.pool_04.level).toBeGreaterThan(-0.02);
    expect(poolArea('pool_04')).toBeGreaterThan(0);
  });
});
