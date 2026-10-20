import { describe, expect, it } from 'vite-plus/test';
import {
  LATENT_HEAT,
  evaporated,
  evaporationHeat,
  evaporationRate,
} from './evaporation';

describe('evaporation from a pool', () => {
  it('loses about a tenth of a kilogram per square metre an hour from a calm pool at 28 °C', () => {
    expect(evaporationRate(1, 28, 'calm')).toBeCloseTo(0.1, 9);
  });

  it('rises in proportion to the water’s temperature, and stops at freezing', () => {
    expect(evaporationRate(100, 30, 'calm')).toBeCloseTo(
      2 * evaporationRate(100, 15, 'calm'),
      9,
    );
    expect(evaporationRate(100, -2, 'calm')).toBe(0);
  });

  it('is low from still water and several times higher under slides', () => {
    const calm = evaporationRate(50, 30, 'calm');
    expect(evaporationRate(50, 30, 'still')).toBeLessThan(calm);
    expect(evaporationRate(50, 30, 'gushing')).toBeCloseTo(3 * calm, 9);
  });

  it('adds up tick by tick to the hour’s loss', () => {
    let kg = 0;
    for (let s = 0; s < 3600; s++) kg += evaporated(10, 28, 'calm', 1);
    expect(kg).toBeCloseTo(evaporationRate(10, 28, 'calm'), 6);
  });

  it('takes heat with it: about 0.68 kWh a kilogram', () => {
    expect(LATENT_HEAT).toBeCloseTo(0.68, 2);
    expect(evaporationHeat(10)).toBeCloseTo(6.8, 1);
  });
});
