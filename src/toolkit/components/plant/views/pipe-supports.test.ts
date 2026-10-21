import { describe, expect, it } from 'vite-plus/test';
import { hangerPoints, SUPPORT_SPACING } from './pipe-supports';

describe('pipe supports', () => {
  it('hang a level length at most 1.5 m apart, clear of its bends, and none on a riser', () => {
    const points = [
      [0, 1, 0],
      [0, 3, 0],
      [6, 3, 0],
    ] as const;
    const at = hangerPoints(points);
    // None on the riser.
    expect(at.every((h) => h.at[1] === 3)).toBe(true);
    const xs = at.map((h) => h.at[0]).sort((a, b) => a - b);
    expect(xs[0]).toBeGreaterThanOrEqual(0.3 - 1e-9);
    expect(xs[xs.length - 1]).toBeLessThanOrEqual(5.7 + 1e-9);
    for (let i = 1; i < xs.length; i++)
      expect(xs[i] - xs[i - 1]).toBeLessThanOrEqual(SUPPORT_SPACING + 1e-9);
  });
});
