import { describe, expect, it } from 'vite-plus/test';
import { YARD, dockFloorAt, dockSteps, dockYardSolids } from './dock-yard';

const F = { wallZ: -6, thickness: 0.2, doorX: 0 };

describe('the loading dock, out to the yard', () => {
  it('stands on the dock inside, on the landing outside the door, on the tarmac beyond', () => {
    expect(dockFloorAt(F, 0, -3)).toBe(0);
    const { landing, flight } = dockSteps(F);
    expect(dockFloorAt(F, 0, (landing.minZ + landing.maxZ) / 2)).toBe(0);
    expect(dockFloorAt(F, 0, flight.minZ - 1)).toBe(YARD.level);
    expect(dockFloorAt(F, 5, -8)).toBe(YARD.level);
  });

  it('steps down the flight a riser at a time to the tarmac', () => {
    const { flight } = dockSteps(F);
    let last = 0;
    for (let z = flight.maxZ - 0.01; z > flight.minZ; z -= 0.05) {
      const y = dockFloorAt(F, 0, z);
      expect(y).toBeLessThanOrEqual(last);
      expect(last - y).toBeLessThanOrEqual(-YARD.level / YARD.risers + 1e-9);
      last = y;
    }
    expect(last).toBeCloseTo(YARD.level);
  });

  it('keeps the walker off the building from the yard, but not from inside', () => {
    const inside = (
      s: { minZ: number; maxZ: number; minX: number; maxX: number }[],
    ) =>
      s.some((r) => 0 >= r.minX && 0 <= r.maxX && -3 >= r.minZ && -3 <= r.maxZ);
    expect(inside(dockYardSolids(F, true))).toBe(true);
    expect(inside(dockYardSolids(F, false))).toBe(false);
  });
});
