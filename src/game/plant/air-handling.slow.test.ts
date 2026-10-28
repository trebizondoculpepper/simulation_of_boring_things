import { describe, expect, it } from 'vite-plus/test';
import { advance } from '../world';
import { allOff, olympic, settled } from './air-handling.test-support';

describe('the air handling units in the world', () => {
  it('hold each hall at its design air and its humidity in the mid-fifties', () => {
    const w = advance(settled, 6 * 3600, 1);
    expect(w.pools.pool_02.hallAir).toBeCloseTo(29, 0);
    expect(w.pools.pool_01.hallAir).toBeCloseTo(31, 0);
    for (const id of ['pool_01', 'pool_02'] as const) {
      expect(w.pools[id].hallRh).toBeGreaterThan(53);
      expect(w.pools[id].hallRh).toBeLessThan(61);
    }
    // Hours of plant, simulated: allowed longer than the default.
  }, 30_000);

  it('leave the Olympic hall colder and damper with its nine units OFF, and no other hall', () => {
    const on = advance(settled, 6 * 3600, 1);
    const off = advance(allOff(settled), 6 * 3600, 1);
    expect(off.pools.pool_02.hallAir).toBeLessThan(
      on.pools.pool_02.hallAir - 3,
    );
    expect(off.pools.pool_02.hallRh).toBeGreaterThan(75);
    expect(off.pools.pool_01.hallAir).toBeCloseTo(on.pools.pool_01.hallAir, 6);
    expect(off.pools.pool_01.hallRh).toBeCloseTo(on.pools.pool_01.hallRh, 6);
    for (const u of olympic) expect(off.airHandling.units[u.tag].speed).toBe(0);
    // Hours of plant, simulated: allowed longer than the default.
  }, 30_000);
});
