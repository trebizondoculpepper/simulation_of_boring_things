import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import { HALL_AIR, POOL_IDS, POOL_TARGET } from './pools';
import { AMBIENT, saturation, stepThermal, thermalParams } from './thermal';

const olympicLike = thermalParams({
  area: 1250,
  volume: 2500,
  evaporation: 0.162,
  hall: { w: 66, d: 40, h: 16.3 },
  water: 28,
  air: 29,
});

describe('the thermal model', () => {
  it('has the saturation vapour pressure of water about right', () => {
    expect(saturation(20)).toBeGreaterThan(2300);
    expect(saturation(20)).toBeLessThan(2400);
    expect(saturation(100)).toBeGreaterThan(100000);
  });

  it('holds a pool and its hall at their design temperatures with its heaters on', () => {
    let s = { water: 28, air: 29 };
    for (let h = 0; h < 48; h++)
      s = stepThermal(
        s,
        olympicLike,
        {
          heatWater: true,
          heatAir: true,
          ambient: AMBIENT,
          ventilated: true,
          madeUp: 0,
        },
        3600,
      );
    expect(s.water).toBeCloseTo(28, 0);
    expect(s.air).toBeCloseTo(29, 0);
  });

  it('settles everything near the outside’s temperature with nothing heated', () => {
    let s = { water: 28, air: 29 };
    for (let d = 0; d < 200; d++)
      s = stepThermal(
        s,
        olympicLike,
        {
          heatWater: false,
          heatAir: false,
          ambient: AMBIENT,
          ventilated: false,
          madeUp: 0,
        },
        86400,
      );
    expect(Math.abs(s.water - AMBIENT)).toBeLessThan(2);
    expect(Math.abs(s.air - AMBIENT)).toBeLessThan(2);
  });
});

describe('the pools’ heat in the world', () => {
  const ready = advance(newWorld(), 3600, 10);

  it('holds every pool and hall at its design temperature in ordinary running, its heating shown', () => {
    for (const id of POOL_IDS) {
      expect(ready.pools[id].temperature, id).toBeCloseTo(
        POOL_TARGET[id].temp,
        0,
      );
      expect(ready.pools[id].hallAir, id).toBeCloseTo(HALL_AIR[id], 0);
      expect(ready.pools[id].heating, id).toBeGreaterThan(0);
    }
  });

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
  });

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
  });
});
