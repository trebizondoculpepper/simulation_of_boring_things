import type { Footprint } from './walk-collision';

/** A ladder joins two walkable floors. All positions are in scene units. */
export interface LadderZone extends Footprint {
  bottom: number;
  top: number;
  /** Where the player stands after leaving each end. */
  bottomExit: { x: number; z: number };
  topExit: { x: number; z: number };
  /** The position held while moving on the rungs. */
  rung: { x: number; z: number };
}

/** Climbing speed, metres a second. */
export const CLIMB_METRES_PER_SECOND = 0.9;
/** How close the player must stand to an end before Use mounts it. */
export const LADDER_USE_REACH_METRES = 0.9;

export type LadderEnd = 'bottom' | 'top';

/** Use only mounts an end at the player's current floor. */
export function ladderToUse(
  zones: readonly LadderZone[],
  x: number,
  y: number,
  z: number,
  metre: number,
): { zone: LadderZone; end: LadderEnd } | null {
  for (const zone of zones) {
    for (const end of ['bottom', 'top'] as const) {
      const floor = zone[end];
      const exit = end === 'bottom' ? zone.bottomExit : zone.topExit;
      if (
        Math.abs(y - floor) <= 0.3 * metre &&
        Math.hypot(x - exit.x, z - exit.z) <= LADDER_USE_REACH_METRES * metre
      )
        return { zone, end };
    }
  }
  return null;
}

/**
 * W climbs and S descends, regardless of where the player looks.
 */
export function climb(
  zone: LadderZone,
  y: number,
  ahead: number,
  dt: number,
  metre: number,
): number {
  const next =
    y + Math.max(-1, Math.min(1, ahead)) * CLIMB_METRES_PER_SECOND * metre * dt;
  return Math.min(zone.top, Math.max(zone.bottom, next));
}
