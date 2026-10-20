import { describe, expect, it } from 'vite-plus/test';
import { DUCK_REACH, duckAt, duckDrift } from './duck';

describe('a rubber duck adrift', () => {
  it('stays clear of the walls, however long it drifts', () => {
    for (let t = 0; t < 20000; t += 7.3) {
      const d = duckAt(t, 5, 10);
      expect(Math.abs(d.u)).toBeLessThanOrEqual(DUCK_REACH);
      expect(Math.abs(d.v)).toBeLessThanOrEqual(DUCK_REACH);
    }
  });

  it('is in the same place for every room that asks', () => {
    expect(duckAt(123.4, 5, 10)).toEqual(duckAt(123.4, 5, 10));
  });

  it('wanders the pool: it moves, slowly, and covers much of it', () => {
    const seen = new Set<string>();
    for (let t = 0; t < 7200; t += 5) {
      const d = duckAt(t, 5, 10);
      seen.add(`${Math.round(d.u * 4)},${Math.round(d.v * 4)}`);
      // A drifting duck: no faster than about half a metre a second.
      expect(duckDrift(t, t + 1, 5, 10)).toBeLessThan(0.5);
    }
    expect(duckDrift(0, 10, 5, 10)).toBeGreaterThan(0.5);
    expect(seen.size).toBeGreaterThan(25);
  });

  it('faces the way it drifts, and bobs a centimetre or so', () => {
    const t = 50;
    const a = duckAt(t, 5, 10);
    const b = duckAt(t + 0.1, 5, 10);
    const moved = Math.atan2((b.u - a.u) * 5, (b.v - a.v) * 10);
    expect(
      Math.abs(
        Math.atan2(Math.sin(moved - a.heading), Math.cos(moved - a.heading)),
      ),
    ).toBeLessThan(0.1);
    for (let s = 0; s < 60; s += 0.5)
      expect(Math.abs(duckAt(s, 5, 10).bob)).toBeLessThan(0.02);
  });

  it('sets each of four ducks on its own path, every one clear of the walls', () => {
    const pairs = [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ] as const;
    const apart = pairs.map(() => 0);
    const samples = Math.ceil(7200 / 11);
    for (let t = 0; t < 7200; t += 11) {
      const ducks = [0, 1, 2, 3].map((n) => duckAt(t, 5, 10, n));
      for (const d of ducks) {
        expect(Math.abs(d.u)).toBeLessThanOrEqual(DUCK_REACH);
        expect(Math.abs(d.v)).toBeLessThanOrEqual(DUCK_REACH);
      }
      pairs.forEach(([a, b], i) => {
        if (
          Math.hypot(
            (ducks[a].u - ducks[b].u) * 5,
            (ducks[a].v - ducks[b].v) * 10,
          ) > 1.5
        )
          apart[i]++;
      });
    }
    // Each pair mostly well apart, though they may meet now and then.
    for (const n of apart) expect(n / samples).toBeGreaterThan(0.85);
  });
});
