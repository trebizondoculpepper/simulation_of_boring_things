import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * What stops a walker at a doorway between two scenes (a door the app sees
 * through, `door-joins.ts`): the leaf, across the wall's thickness, while
 * the door is near shut, but never where the walker already stands (the
 * door is held open while someone is in it, and a walker is never shut in
 * a wall); and, until the room beyond is seen through it, a stop just past
 * the doorway, so no one walks out into nothing. Pure.
 */
export function doorwayStops(
  {
    inside,
    shut,
    seen,
  }: {
    /** Whether the walker is in the doorway (its footprint, plus its radius). */
    inside: boolean;
    /** Whether the door is near enough shut to bar the way. */
    shut: boolean;
    /** Whether the room beyond is seen through the doorway. */
    seen: boolean;
  },
  leaf: Footprint,
  beyond: Footprint,
): Footprint[] {
  return [...(shut && !inside ? [leaf] : []), ...(seen ? [] : [beyond])];
}

/** Whether a walker of `radius` at (x, z) overlaps `area`. */
export const overlaps = (
  area: Footprint,
  x: number,
  z: number,
  radius: number,
) =>
  x > area.minX - radius &&
  x < area.maxX + radius &&
  z > area.minZ - radius &&
  z < area.maxZ + radius;
