import type { Footprint } from './walk-collision';

/**
 * Climbing ladders by looking the way to go: inside a ladder's zone (the
 * space in front of its rungs, inside its cage), walking forward or back
 * while looking up or down climbs it, up or down; level, the walker walks
 * as ever, to step on or off. The walker never goes below the ladder's
 * foot or above its head, and part way up it cannot step out of the zone,
 * only climb on or back. Pure: scene units.
 */

export interface LadderZone extends Footprint {
  /** The floor at its foot and the landing at its head. */
  bottom: number;
  top: number;
}

/** How far the eye's pitch must be from level, radians, before it climbs. */
export const CLIMB_LOOK = 0.15;
/** Climbing speed, metres a second. */
export const CLIMB_METRES_PER_SECOND = 0.9;

/** The zone (x, z) is in, if any. */
export const ladderAt = (zones: readonly LadderZone[], x: number, z: number) =>
  zones.find((l) => x >= l.minX && x <= l.maxX && z >= l.minZ && z <= l.maxZ) ??
  null;

/**
 * The walker's floor `dt` seconds on, climbing `zone` from `y`: `ahead`
 * the forward input (−1 to 1), `pitch` the eye's (up positive). Up or
 * down only when looking that way; clamped to the ladder's two ends.
 */
export function climb(
  zone: LadderZone,
  y: number,
  ahead: number,
  pitch: number,
  dt: number,
  metre: number,
): number {
  const way = pitch > CLIMB_LOOK ? 1 : pitch < -CLIMB_LOOK ? -1 : 0;
  const next = y + way * ahead * CLIMB_METRES_PER_SECOND * metre * dt;
  return Math.min(zone.top, Math.max(zone.bottom, next));
}

/** Whether a walker at `y` is part way up `zone`: off both its ends. */
export const onRungs = (zone: LadderZone, y: number, metre: number) =>
  y > zone.bottom + 0.02 * metre && y < zone.top - 0.02 * metre;

/**
 * Where a walker part way up a ladder may move to: held inside its zone,
 * `radius` in from its edges, so it cannot step off into the air.
 */
export function holdOnRungs(
  zone: LadderZone,
  x: number,
  z: number,
  radius: number,
) {
  const inX = Math.max(zone.minX + radius, zone.maxX - radius);
  const inZ = Math.max(zone.minZ + radius, zone.maxZ - radius);
  return {
    x: Math.min(inX, Math.max(Math.min(zone.minX + radius, inX), x)),
    z: Math.min(inZ, Math.max(Math.min(zone.minZ + radius, inZ), z)),
  };
}
