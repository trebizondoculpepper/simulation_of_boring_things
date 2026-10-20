import { describe, expect, it } from 'vite-plus/test';
import {
  GHOST_MEAN,
  GHOST_MIN,
  GHOST_SD,
  ghostLevel,
  POP_CIRCLES,
  POP_SPREAD,
  bloom,
  ghostSeconds,
  popPattern,
} from './dazzle';

/** A seeded uniform random source. */
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

it('draws afterimages lasting about seven seconds, give or take two', () => {
  const random = seeded(7);
  const draws = Array.from({ length: 4000 }, () => ghostSeconds(random));
  const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
  const sd = Math.sqrt(
    draws.reduce((a, b) => a + (b - mean) ** 2, 0) / draws.length,
  );
  expect(mean).toBeCloseTo(GHOST_MEAN, 0);
  expect(Math.abs(sd - GHOST_SD)).toBeLessThan(0.2);
  expect(Math.min(...draws)).toBeGreaterThanOrEqual(GHOST_MIN);
});

it('fades an afterimage from full to nothing, never brightening', () => {
  expect(ghostLevel(0, 7)).toBe(1);
  expect(ghostLevel(7, 7)).toBe(0);
  expect(ghostLevel(9, 7)).toBe(0);
  let last = 1;
  for (let t = 0; t <= 7; t += 0.25) {
    const level = ghostLevel(t, 7);
    expect(level).toBeLessThanOrEqual(last);
    last = level;
  }
});

describe('a pop', () => {
  it('is one to four circles, each blooming out within three frames', () => {
    const counts = new Set<number>();
    for (let n = 0; n < 400; n++) {
      const circles = popPattern();
      counts.add(circles.length);
      expect(circles.length).toBeGreaterThanOrEqual(1);
      expect(circles.length).toBeLessThanOrEqual(POP_CIRCLES);
      for (const c of circles) {
        expect(c.frames).toBeGreaterThanOrEqual(1);
        expect(c.frames).toBeLessThanOrEqual(3);
        expect(c.radius).toBeGreaterThan(0);
        expect(Math.hypot(c.dx, c.dy)).toBeLessThanOrEqual(POP_SPREAD + 1e-9);
      }
      // The first is on the discharge itself.
      expect(circles[0].dx).toBe(0);
      expect(circles[0].dy).toBe(0);
    }
    expect([...counts].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it('is different every time', () => {
    const a = JSON.stringify(popPattern());
    const b = JSON.stringify(popPattern());
    expect(a).not.toBe(b);
  });

  it('is smaller when weaker', () => {
    const fixed = () => 0.5;
    expect(popPattern(0, fixed)[0].radius).toBeLessThan(
      popPattern(1, fixed)[0].radius,
    );
  });

  it('blooms quickly, fully out on its last frame', () => {
    expect(bloom(1, 3)).toBeGreaterThan(1 / 3);
    expect(bloom(3, 3)).toBe(1);
    expect(bloom(1, 1)).toBe(1);
  });
});
