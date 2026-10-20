import { describe, expect, it } from 'vite-plus/test';
import { EDGE_PROFILES, selfIntersects } from './edge-profiles';

describe('the pool edge profiles', () => {
  it('are four, oldest first, each outline a simple polygon', () => {
    expect(EDGE_PROFILES.map((p) => p.era)).toEqual([
      '1940s',
      '1960s',
      '1980s',
      'Contemporary',
    ]);
    for (const p of EDGE_PROFILES) {
      expect(selfIntersects(p.solid), p.name).toBe(false);
      for (const w of p.water) expect(selfIntersects(w), p.name).toBe(false);
    }
  });

  it('bring the water up toward the deck decade by decade', () => {
    const levels = EDGE_PROFILES.map((p) => p.waterLevel);
    expect(levels[1]).toBeLessThan(levels[0]);
    expect(levels[2]).toBeGreaterThan(levels[0]);
    expect(levels[3]).toBe(0);
  });

  it('catches a crossed outline', () => {
    expect(
      selfIntersects([
        [0, 0],
        [1, 1],
        [1, 0],
        [0, 1],
      ]),
    ).toBe(true);
  });
});
