import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import { poolArea } from './pools';
import { drainDown, hoursToEmpty } from './drain-down.test-support';

describe('draining a pool down', () => {
  const ready = advance(newWorld(), 600, 10);

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
