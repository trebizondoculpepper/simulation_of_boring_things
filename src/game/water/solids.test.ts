import { describe, expect, it } from 'vite-plus/test';
import { BATHER_SOLIDS, stepSolids } from './solids';

describe('a pool’s suspended solids', () => {
  const capture = (c: number) => (s: number) => s * (1 - c);
  it('rise with bathers and nothing filtering', () => {
    const s = stepSolids(
      1,
      { bathers: 8, volume: 4, flow: 0, passes: capture(0.9) },
      3600,
    );
    expect(s).toBeCloseTo(1 + (8 * BATHER_SOLIDS) / 4, 6);
  });
  it('settle where the filter keeps what the bathers bring', () => {
    let s = 1;
    for (let t = 0; t < 48 * 60; t++)
      s = stepSolids(
        s,
        { bathers: 8, volume: 4, flow: 8, passes: capture(0.9) },
        60,
      );
    expect(s).toBeCloseTo((8 * BATHER_SOLIDS) / (8 * 0.9), 2);
  });
  it('fall with no bathers and the filter running', () => {
    const s = stepSolids(
      5,
      { bathers: 0, volume: 4, flow: 8, passes: capture(0.9) },
      600,
    );
    expect(s).toBeLessThan(5);
  });
});
