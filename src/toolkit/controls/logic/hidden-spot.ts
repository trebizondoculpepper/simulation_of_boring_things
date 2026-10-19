/**
 * Where to put something so that it appears without being seen to appear:
 * out of the player's view, behind them, for a thing that "was there all
 * along". Pure logic; metres, on the floor plan.
 */

export interface PlanPoint {
  x: number;
  z: number;
}

/** How far outside the edge of the view, radians, a hidden thing keeps. */
export const HIDDEN_MARGIN = (20 * Math.PI) / 180;

/** How far off the line of sight `point` is, from `eye` looking `facing`. */
export function offSight(eye: PlanPoint, facing: PlanPoint, point: PlanPoint) {
  const a =
    Math.atan2(point.x - eye.x, point.z - eye.z) -
    Math.atan2(facing.x, facing.z);
  const wrapped = Math.abs(a) % (Math.PI * 2);
  return Math.min(wrapped, Math.PI * 2 - wrapped);
}

/**
 * Of the `candidates` (each the middle of a thing `size` long in x and
 * wide in z), the best place to put it unseen: every corner further off
 * the line of sight than `halfView` (half the horizontal field of view)
 * and `HIDDEN_MARGIN`, its middle at least `near` from the eye, and, of
 * those, the one nearest to straight behind at about `ideal` away, so it
 * is close enough to be found by turning round. Null if none is hidden.
 */
export function hiddenSpot({
  eye,
  facing,
  halfView,
  size,
  candidates,
  near = 1.8,
  ideal = 3,
}: {
  eye: PlanPoint;
  facing: PlanPoint;
  halfView: number;
  size: PlanPoint;
  candidates: readonly PlanPoint[];
  near?: number;
  ideal?: number;
}): PlanPoint | null {
  let best: PlanPoint | null = null;
  let bestScore = -Infinity;
  for (const spot of candidates) {
    const distance = Math.hypot(spot.x - eye.x, spot.z - eye.z);
    if (distance < near) continue;
    const corners = [-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) => ({
        x: spot.x + (sx * size.x) / 2,
        z: spot.z + (sz * size.z) / 2,
      })),
    );
    const nearest = Math.min(
      ...corners.map((corner) => offSight(eye, facing, corner)),
    );
    if (nearest <= halfView + HIDDEN_MARGIN) continue;
    const score =
      offSight(eye, facing, spot) - 0.4 * Math.abs(distance - ideal);
    if (score > bestScore) {
      best = spot;
      bestScore = score;
    }
  }
  return best;
}
