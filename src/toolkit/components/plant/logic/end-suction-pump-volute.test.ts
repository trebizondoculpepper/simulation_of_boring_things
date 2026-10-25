import { describe, expect, it } from 'vite-plus/test';
import {
  VOLUTE,
  VOLUTE_END,
  VOLUTE_START,
  voluteOutline,
  voluteRadius,
} from './end-suction-pump';

/** Whether segments ab and cd cross (not at shared ends). */
const cross = ([a, b]: [number, number][], [c, d]: [number, number][]) => {
  const o = (p: number[], q: number[], r: number[]) =>
    Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
};

describe('the volute', () => {
  it('grows from the tongue’s radius to the outer over a full turn', () => {
    expect(voluteRadius(VOLUTE_START)).toBeCloseTo(VOLUTE.tongue);
    expect(voluteRadius(VOLUTE_END)).toBeCloseTo(VOLUTE.outer);
    expect(VOLUTE_END - VOLUTE_START).toBeGreaterThan(2 * Math.PI - 1);
  });

  it('is a simple closed outline, its throat under the discharge nozzle', () => {
    const pts = voluteOutline();
    const edges = pts.map((p, i) => [p, pts[(i + 1) % pts.length]]);
    for (let i = 0; i < edges.length; i++)
      for (let j = i + 2; j < edges.length; j++) {
        if (i === 0 && j === edges.length - 1) continue;
        expect(cross(edges[i], edges[j]), `${i}×${j}`).toBe(false);
      }
    // The nozzle (z 0.12, Ø0.16) stands within the throat.
    expect(VOLUTE.throat[0]).toBeLessThanOrEqual(0.12 - 0.08 + 1e-9);
    expect(VOLUTE.throat[1]).toBeGreaterThanOrEqual(0.12 + 0.08 - 1e-9);
  });
});
