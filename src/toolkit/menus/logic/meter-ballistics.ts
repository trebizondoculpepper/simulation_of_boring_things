/**
 * A moving-coil meter's ballistics, for the settings panel's meters
 * (mission 096; the owner, 2026-10-27: "the needle follows the knob after a
 * few seconds"). The movement is a damped spring: the needle swings after a
 * new reading, a touch past it, and settles within two or three seconds,
 * as a real meter's damped coil does, slowed here to be seen. Pure.
 */

export interface NeedleState {
  /** Where the needle points, 0 to 1 across the scale. */
  at: number;
  /** How fast it is moving, scale per second. */
  speed: number;
}

/** The movement's natural frequency (radians a second) and damping ratio. */
export const BALLISTICS = { omega: 2.6, damping: 0.72 } as const;

/** How near and how still the needle must be to count as settled. */
const REST = 0.0015;

/** The needle `delta` seconds on, swinging towards `target`. */
export function stepNeedle(
  needle: NeedleState,
  target: number,
  delta: number,
  { omega, damping } = BALLISTICS,
): NeedleState {
  let { at, speed } = needle;
  // Small fixed steps keep the spring stable after a long frame.
  let left = Math.min(Math.max(0, delta), 0.5);
  while (left > 0) {
    const dt = Math.min(left, 1 / 120);
    const pull = omega * omega * (target - at) - 2 * damping * omega * speed;
    speed += pull * dt;
    at += speed * dt;
    // The needle's stops at either end of the scale.
    if (at < -0.02) [at, speed] = [-0.02, 0];
    if (at > 1.02) [at, speed] = [1.02, 0];
    left -= dt;
  }
  return { at, speed };
}

/** Whether the needle has come to rest at `target` (so nothing need be drawn). */
export const needleSettled = (needle: NeedleState, target: number) =>
  Math.abs(needle.at - target) < REST && Math.abs(needle.speed) < REST;
