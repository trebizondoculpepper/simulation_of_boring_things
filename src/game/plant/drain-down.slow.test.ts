import { describe, expect, it } from 'vite-plus/test';
import { advance, newWorld } from '../world';
import {
  INTO_THE_PIT,
  POOL_IDS,
  POOL_TARGET,
  poolDepth,
  poolVolume,
} from './pools';
import { WET_HALL_PLANT } from './wet-hall';
import { drainDown, hoursToEmpty } from './drain-down.test-support';

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
});
