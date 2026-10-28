import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import { POOL_TARGET } from './pools';

describe('the pools’ heat in the world', () => {
  const ready = advance(newWorld(), 3600, 10);

  it('brings a cooled pool back with the heating, at its heaters’ output', () => {
    let w = advance(
      applyAction(ready, {
        type: 'plant/feeder',
        room: 'boiler_house',
        on: false,
      }),
      24 * 3600,
      30,
    );
    w = applyAction(w, {
      type: 'plant/feeder',
      room: 'boiler_house',
      on: true,
    });
    const cold = w.pools.pool_03.temperature;
    w = advance(w, 3600, 10);
    expect(w.pools.pool_03.temperature).toBeGreaterThan(cold + 0.5);
    expect(w.pools.pool_03.heating).toBeGreaterThan(
      ready.pools.pool_03.heating,
    );
    w = advance(w, 2 * 24 * 3600, 30);
    expect(w.pools.pool_03.temperature).toBeCloseTo(
      POOL_TARGET.pool_03.temp,
      0,
    );
  });
});
