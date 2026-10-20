import { describe, expect, it } from 'vite-plus/test';
import { materialiseAt } from './materialise';

describe('materialising', () => {
  it('runs from nothing to whole over its duration, and no further', () => {
    expect(materialiseAt(-1, 2)).toBe(0);
    expect(materialiseAt(0, 2)).toBe(0);
    expect(materialiseAt(1, 2)).toBeCloseTo(0.5);
    expect(materialiseAt(2, 2)).toBe(1);
    expect(materialiseAt(9, 2)).toBe(1);
  });

  it('comes in slowly, quickens, and settles', () => {
    const steps = Array.from({ length: 11 }, (_, i) => materialiseAt(i, 10));
    for (let i = 1; i < steps.length; i++)
      expect(steps[i]).toBeGreaterThan(steps[i - 1]);
    const first = steps[1] - steps[0];
    const middle = steps[6] - steps[5];
    const end = steps[10] - steps[9];
    expect(first).toBeLessThan(middle);
    expect(end).toBeLessThan(middle);
  });

  it('is whole at once with no time to take', () => {
    expect(materialiseAt(0, 0)).toBe(1);
  });
});
