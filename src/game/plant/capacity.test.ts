import { describe, expect, it } from 'vite-plus/test';
import { balanceTankArea, capacities } from './capacity';

describe('whether the plant rooms are big enough', () => {
  it('gives every room floor enough for its equipment, with room to work', () => {
    for (const c of capacities())
      expect(
        c.used,
        `${c.room}: ${c.required.toFixed(0)} of ${c.floor.toFixed(0)} m²`,
      ).toBeLessThanOrEqual(0.85);
  });

  it('wastes no great hall on a little plant: every room with equipment is used at least a little', () => {
    for (const c of capacities().filter((x) => x.required > 0))
      expect(c.used, c.room).toBeGreaterThan(0.08);
  });

  it('sizes balance tanks for their pools', () => {
    expect(balanceTankArea(1600)).toBeGreaterThan(balanceTankArea(30));
    // The Reservoir's: 80 m³, 4 m tall, a metre round: about 42 m².
    expect(balanceTankArea(1600)).toBeCloseTo(42, 0);
  });
});
