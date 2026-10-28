import { describe, expect, it } from 'vite-plus/test';
import { newPools, stepPools, stepPoolsWater } from './pools';
import { newPlantServices } from './services';
import type { PlantServices } from './services';

/** `days` of the pools under `plant`, a minute at a time. */
const run = (plant: PlantServices, days: number, start = newPools()) => {
  let pools = start;
  for (let t = 0; t < days * 24 * 60; t++)
    pools = stepPools(pools, plant, 60, t * 60);
  return pools;
};

describe('the pools as the world runs them', () => {
  it('hold steady, brimming, with everything on', () => {
    const pools = run(newPlantServices(), 3);
    for (const p of Object.values(pools)) {
      expect(p.level).toBeGreaterThan(0);
      expect(p.tripped).toBe(false);
    }
  });

  it('with the wet hall’s water off, trip the Olympic pool’s pumps within days and drop it below its lip', () => {
    const plant = newPlantServices();
    plant.sources.water = false;
    // Its pumps still fed: only the make-up is lost.
    const pools = run(
      {
        ...plant,
        sources: { ...plant.sources, water: true },
        feeders: { ...plant.feeders, wet_hall: false },
      },
      8,
    );
    expect(pools.pool_02.level).toBeLessThan(0);
  });

  it('stop the Olympic pool’s circulation when both its pumps are isolated, and run on either', () => {
    const plant = newPlantServices();
    const one = {
      ...plant,
      isolators: { ...plant.isolators, 'P-101A isolator': false },
    };
    expect(run(one, 0.1).pool_02.flow).toBeGreaterThan(100);
    const both = {
      ...one,
      isolators: { ...one.isolators, 'P-101B isolator': false },
    };
    expect(run(both, 0.1).pool_02.flow).toBeLessThan(10);
  });

  it('say the Olympic’s UV and ozone are out while both are isolated, for its chemistry', () => {
    // The chloramines' build-up itself is the chemistry's (mission 101,
    // `water-treatment.test.ts`); the pools tell it whether the UV is lit.
    const plant = newPlantServices();
    const off = {
      ...plant,
      isolators: {
        ...plant.isolators,
        'UV unit isolator': false,
        'Ozone generator isolator': false,
      },
    };
    const pools = newPools();
    expect(stepPoolsWater(pools, off, 1).flows.pool_02.uv).toBe(false);
    expect(stepPoolsWater(pools, plant, 1).flows.pool_02.uv).toBe(true);
  });

  it('stop the jacuzzi when its cabinet is isolated', () => {
    const plant = newPlantServices();
    const off = {
      ...plant,
      isolators: { ...plant.isolators, 'Jacuzzi cabinet isolator': false },
    };
    expect(run(off, 0.1).pool_03.flow).toBeLessThan(2);
  });
});
