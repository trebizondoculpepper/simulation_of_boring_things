import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import { POOL_IDS, POOL_TARGET } from './pools';

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
    // Some hours of the world: give it room under a full parallel run.
  }, 20_000);

  it('burns more heat to hold its pools in a cold snap, and less in a heatwave', () => {
    const cold = advance(
      applyAction(ready, { type: 'weather/ambient', celsius: -5 }),
      24 * 3600,
      30,
    );
    const hot = advance(
      applyAction(ready, { type: 'weather/ambient', celsius: 25 }),
      24 * 3600,
      30,
    );
    const total = (w: typeof ready) =>
      POOL_IDS.reduce((sum, id) => sum + w.pools[id].heating, 0);
    expect(total(cold)).toBeGreaterThan(total(ready) * 1.2);
    expect(total(hot)).toBeLessThan(total(ready));
    for (const id of POOL_IDS)
      expect(cold.pools[id].temperature, id).toBeCloseTo(
        POOL_TARGET[id].temp,
        0,
      );
    // Two days of the world: moved from `thermal.test.ts`, slow on CI.
  }, 20_000);

  it('cools small pools fast and big ones slowly with the heating off: the Olympic about a degree or two a day', () => {
    const off = advance(
      applyAction(ready, {
        type: 'plant/feeder',
        room: 'boiler_house',
        on: false,
      }),
      24 * 3600,
      30,
    );
    const fall = (id: (typeof POOL_IDS)[number]) =>
      POOL_TARGET[id].temp - off.pools[id].temperature;
    expect(fall('pool_02')).toBeGreaterThan(0.5);
    expect(fall('pool_02')).toBeLessThan(3);
    expect(fall('pool_03')).toBeGreaterThan(5);
    expect(fall('pool_03')).toBeGreaterThan(fall('pool_01'));
    expect(fall('pool_01')).toBeGreaterThan(fall('pool_02'));
    // A day of the world: moved from `thermal.test.ts`, slow on CI.
  }, 20_000);
});
