import { describe, expect, it } from 'vite-plus/test';
import {
  OVERFLOW_MAX_SPEED,
  decodeFlow,
  flowMapTexels,
  flowPhases,
  overflowFlow,
} from './flow-map';

describe('flow-map water', () => {
  it('keeps its two copies half a cycle apart, showing each only away from its restart', () => {
    for (const t of [0, 0.3, 0.75, 1.9]) {
      const { first, second, weight } = flowPhases(t, 1);
      expect((second - first + 1) % 1).toBeCloseTo(0.5, 9);
      // At the first's restart the second carries it all; at the second's, none.
      if (first < 0.01) expect(weight).toBeCloseTo(1, 1);
      if (Math.abs(first - 0.5) < 0.01) expect(weight).toBeCloseTo(0, 1);
    }
  });

  it('runs the overflow outward, quickening into the grating', () => {
    expect(overflowFlow(0.2, 0)[1]).toBeGreaterThan(0);
    expect(overflowFlow(0.2, 1)[1]).toBeGreaterThan(
      overflowFlow(0.2, 0)[1] * 3,
    );
    expect(Math.abs(overflowFlow(0.2, 0.5)[0])).toBeLessThan(
      overflowFlow(0.2, 0.5)[1],
    );
  });

  it('stores the flow in its texels to within a byte', () => {
    const data = flowMapTexels(8, 8);
    const [u, v] = [(3 + 0.5) / 8, (5 + 0.5) / 8];
    const i = (5 * 8 + 3) * 4;
    const [du, dv] = decodeFlow(data[i], data[i + 1]);
    const [fu, fv] = overflowFlow(u, v);
    const step = (2 * OVERFLOW_MAX_SPEED) / 255;
    expect(Math.abs(du - fu)).toBeLessThanOrEqual(step);
    expect(Math.abs(dv - fv)).toBeLessThanOrEqual(step);
  });
});
