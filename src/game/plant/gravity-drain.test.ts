import { describe, expect, it } from 'vite-plus/test';
import { drainFlow, stepDrain, timeToEmpty } from './gravity-drain';
import type { DrainPipe, DrainTank } from './gravity-drain';

/** A 1000 L IBC on a plinth, its floor 0.5 m above the pipe's end; DN50, K = 6. */
const tank: DrainTank = { area: 1.1 * 0.92, depth: 0.93, floorAbove: 0.5 };
const pipe: DrainPipe = { bore: 0.05, K: 6 };

describe('a tank drained by gravity', () => {
  it('flows fastest full and slows as it empties', () => {
    const full = drainFlow(tank, pipe, 1);
    const half = drainFlow(tank, pipe, 0.5);
    const low = drainFlow(tank, pipe, 0.05);
    expect(full).toBeGreaterThan(half);
    expect(half).toBeGreaterThan(low);
    // About 4.3 l/s full: √(2 · 9.81 · 1.43 / 6) · π · 0.05² / 4.
    expect(full * 1000).toBeCloseTo(4.25, 1);
  });

  it('carries nothing with the valve shut', () => {
    expect(stepDrain(tank, pipe, 1, false, 60)).toEqual({
      level: 1,
      out: 0,
      flow: 0,
    });
  });

  it('empties completely, all of it to the drain, in the time the formula gives', () => {
    let level = 1;
    let out = 0;
    let t = 0;
    while (level > 0 && t < 3600) {
      const step = stepDrain(tank, pipe, level, true, 1 / 60);
      level = step.level;
      out += step.out;
      t += 1 / 60;
    }
    expect(level).toBe(0);
    expect(out).toBeCloseTo(tank.area * tank.depth, 6);
    expect(t).toBeCloseTo(timeToEmpty(tank, pipe, 1), -1);
  });

  it('takes the same water whether stepped finely or coarsely', () => {
    const fine = { level: 1, out: 0 };
    for (let k = 0; k < 600; k++) {
      const s = stepDrain(tank, pipe, fine.level, true, 0.1);
      fine.level = s.level;
      fine.out += s.out;
    }
    const coarse = stepDrain(tank, pipe, 1, true, 60);
    expect(coarse.out).toBeCloseTo(fine.out, 3);
  });
});
