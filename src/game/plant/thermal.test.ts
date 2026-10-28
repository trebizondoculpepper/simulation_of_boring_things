import { describe, expect, it } from 'vite-plus/test';
import { advance, newWorld } from '../world';
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
});
