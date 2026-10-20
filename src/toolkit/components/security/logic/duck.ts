/**
 * A rubber duck adrift on a pool: where it is, which way it faces and how
 * it bobs, at any moment. It wanders as if pushed about by the
 * inlets' jets and the circulation's currents, a sum of slow swings at
 * unrelated periods, so its path never repeats and never reaches the
 * pool's walls; it turns to face the way it drifts, and rides the
 * surface's little waves. It is a function of time alone, so any room
 * that wants to know where the duck is (the pool, a camera watching it
 * from another room) gets the same answer. Pure.
 */

export interface DuckPose {
  /** Across and along the pool, as fractions of its half width and half length, −1 to 1. */
  u: number;
  v: number;
  /** Which way it faces, radians about the vertical, 0 along +v. */
  heading: number;
  /** How high it rides, metres above the still water line. */
  bob: number;
  /** How it rocks: about its length (roll) and across it (pitch), radians. */
  roll: number;
  pitch: number;
}

/** The farthest it wanders from the pool's middle, as a fraction of each half size. */
export const DUCK_REACH = 0.8;

/** Each swing: its share of the reach, its period, s, and its phase. */
const ACROSS = [
  [0.6, 180, 1.3],
  [0.28, 79, 4.1],
  [0.12, 31, 0.7],
] as const;
const ALONG = [
  [0.55, 233, 2.2],
  [0.3, 101, 5.6],
  [0.15, 41, 3.3],
] as const;

/** How far the `n`th duck's swings are set apart from the first's: the golden angle, each swing its own multiple. */
const apart = (n: number, k: number) => n * 2.39996 * (k + 1);

const swing = (
  swings: readonly (readonly [number, number, number])[],
  t: number,
  n: number,
) =>
  swings.reduce(
    (sum, [share, period, phase], k) =>
      sum + share * Math.sin((2 * Math.PI * t) / period + phase + apart(n, k)),
    0,
  );

/** The rate of a swing, per second. */
const rate = (
  swings: readonly (readonly [number, number, number])[],
  t: number,
  n: number,
) =>
  swings.reduce(
    (sum, [share, period, phase], k) =>
      sum +
      ((share * 2 * Math.PI) / period) *
        Math.cos((2 * Math.PI * t) / period + phase + apart(n, k)),
    0,
  );

/**
 * The `n`th duck at `t` seconds, in a pool `halfWidth` by `halfLength`
 * metres: each duck its own path, the same swings set apart.
 */
export function duckAt(
  t: number,
  halfWidth: number,
  halfLength: number,
  n = 0,
): DuckPose {
  // Each duck at a pace of its own, so no two keep company for long.
  t = t * (1 + 0.137 * n) + 613 * n;
  const u = DUCK_REACH * swing(ACROSS, t, n);
  const v = DUCK_REACH * swing(ALONG, t, n);
  // Facing the way it drifts, in metres, not fractions.
  const heading = Math.atan2(
    rate(ACROSS, t, n) * halfWidth,
    rate(ALONG, t, n) * halfLength,
  );
  return {
    u,
    v,
    heading,
    bob: 0.012 * Math.sin(2.3 * t + n) + 0.006 * Math.sin(3.7 * t + 1 + n),
    roll: 0.06 * Math.sin(1.9 * t + 0.4 + 2 * n),
    pitch: 0.05 * Math.sin(2.7 * t + 2.1 + 3 * n),
  };
}

/** How far it has drifted between `t0` and `t1`, metres: its wake's strength. */
export function duckDrift(
  t0: number,
  t1: number,
  halfWidth: number,
  halfLength: number,
  n = 0,
): number {
  const a = duckAt(t0, halfWidth, halfLength, n);
  const b = duckAt(t1, halfWidth, halfLength, n);
  return Math.hypot((b.u - a.u) * halfWidth, (b.v - a.v) * halfLength);
}
