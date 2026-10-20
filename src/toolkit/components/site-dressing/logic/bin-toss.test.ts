import { describe, expect, it } from 'vite-plus/test';
import {
  BIN_LIP,
  BIN_REACH,
  BIN_MAGNET_REACH,
  aimsAtBin,
  distanceToBin,
  arcSeconds,
  binArc,
  binRest,
  overBin,
} from './bin-toss';
import type { BinShape } from './bin-toss';

/** A small seeded random number generator (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const bin = { x: 0, z: 0 };
const shape: BinShape = {
  halfX: 0.24,
  halfZ: 0.11,
  floor: 0.03,
  rim: 0.76,
  layer: 0.034,
  heap: 0.12,
};

describe('putting things in the bin', () => {
  it('measures the magnetic action from the nearest opening edge', () => {
    const size = { x: 1.8, z: 1.2 };
    expect(distanceToBin({ x: 2.9, z: 0 }, bin, size, 0)).toBeCloseTo(
      BIN_MAGNET_REACH,
    );
    expect(distanceToBin({ x: 0, z: 0 }, bin, size, 0)).toBe(0);
    expect(distanceToBin({ x: 3, z: 0 }, bin, size, 0)).toBeGreaterThan(
      BIN_MAGNET_REACH,
    );
  });
  it('takes what is let go of facing the bin, within a metre and a half', () => {
    // Standing a metre south of it, looking north at it.
    expect(aimsAtBin({ x: 0, z: 1 }, { x: 0, z: -1 }, bin)).toBe(true);
    expect(aimsAtBin({ x: 0, z: 1.45 }, { x: 0, z: -1 }, bin)).toBe(true);
    // Roughly facing is enough.
    expect(aimsAtBin({ x: 0, z: 1 }, { x: 0.5, z: -1 }, bin)).toBe(true);
  });

  it('lets it clatter to the floor from too far away, or facing elsewhere', () => {
    expect(aimsAtBin({ x: 0, z: BIN_REACH + 0.1 }, { x: 0, z: -1 }, bin)).toBe(
      false,
    );
    expect(aimsAtBin({ x: 0, z: 1 }, { x: 0, z: 1 }, bin)).toBe(false);
    expect(aimsAtBin({ x: 0, z: 1 }, { x: 1, z: 0 }, bin)).toBe(false);
    expect(aimsAtBin({ x: 0, z: 1 }, { x: 1, z: -0.5 }, bin)).toBe(false);
  });

  it('takes it from right over the bin, whichever way the player faces', () => {
    expect(aimsAtBin({ x: 0.1, z: 0.1 }, { x: 0, z: 1 }, bin)).toBe(true);
  });

  it('flies in a parabola from the hand to its place in the bin', () => {
    const from = { x: 0, y: 1.3, z: 1 };
    const to = { x: 0.05, y: 0.2, z: 0 };
    expect(binArc(from, to, 0)).toEqual({ x: 0, y: 1.3, z: 1 });
    const end = binArc(from, to, 1);
    expect(end.x).toBeCloseTo(0.05, 9);
    expect(end.y).toBeCloseTo(0.2, 9);
    expect(end.z).toBeCloseTo(0, 9);
    // It rises above the hand before it drops in, never above the lift.
    const heights = Array.from({ length: 101 }, (_, i) =>
      binArc(from, to, i / 100),
    ).map((p) => p.y);
    expect(Math.max(...heights)).toBeGreaterThan(1.3);
    expect(Math.max(...heights)).toBeLessThanOrEqual(1.3 + 0.25 + 1e-9);
    // One rise and one fall: a parabola.
    const top = heights.indexOf(Math.max(...heights));
    for (let i = 1; i <= top; i++)
      expect(heights[i]).toBeGreaterThanOrEqual(heights[i - 1]);
    for (let i = top + 1; i < heights.length; i++)
      expect(heights[i]).toBeLessThanOrEqual(heights[i - 1]);
    expect(arcSeconds(1.4)).toBeGreaterThan(arcSeconds(0.5));
  });

  it('fills up: each lands on the last, until the heap sticks out of the top', () => {
    const random = rng(3);
    const rests = Array.from({ length: 40 }, (_, i) =>
      binRest(i, shape, random),
    );
    for (let i = 1; i < rests.length; i++)
      expect(rests[i].y).toBeGreaterThanOrEqual(rests[i - 1].y);
    expect(rests[0].y).toBeCloseTo(shape.floor, 9);
    expect(rests.at(-1)!.y).toBeCloseTo(shape.rim + shape.heap, 9);
    for (const rest of rests) {
      expect(Math.abs(rest.x)).toBeLessThanOrEqual(shape.halfX);
      expect(Math.abs(rest.z)).toBeLessThanOrEqual(shape.halfZ);
    }
    // The last stand far more upright than the first.
    const tilt = (from: number, to: number) =>
      rests.slice(from, to).reduce((sum, r) => sum + r.tilt, 0) / (to - from);
    expect(tilt(30, 40)).toBeGreaterThan(tilt(0, 5) * 2);
  });
});

describe('letting go over a bin', () => {
  const skip = { x: 1.83, z: 1.22 };
  it('puts in whatever is let go of over it or at its rim', () => {
    expect(overBin({ x: 0.5, z: 0.3 }, { x: 0, z: 0 }, skip)).toBe(true);
    expect(
      overBin({ x: 0.915 + BIN_LIP - 0.01, z: 0 }, { x: 0, z: 0 }, skip),
    ).toBe(true);
    expect(
      overBin({ x: 0, z: 0.61 + BIN_LIP + 0.05 }, { x: 0, z: 0 }, skip),
    ).toBe(false);
    expect(overBin({ x: 3, z: 0 }, { x: 0, z: 0 }, skip)).toBe(false);
  });

  it('follows a bin turned on the floor', () => {
    // Turned a quarter turn, its length lies along z.
    const turned = Math.PI / 2;
    expect(overBin({ x: 0, z: 1.05 }, { x: 0, z: 0 }, skip, turned)).toBe(true);
    expect(overBin({ x: 1.05, z: 0 }, { x: 0, z: 0 }, skip, turned)).toBe(
      false,
    );
  });
});
