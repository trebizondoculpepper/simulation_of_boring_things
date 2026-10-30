/**
 * The museum's level of detail (the owner, 2026-10-30): which version of a
 * component is drawn, and at what resolution a neighbouring hall seen
 * through its doorway is drawn. Pure logic, no Three.js.
 */

/** Beyond this, metres from the eye, a component is drawn low poly. */
export const LOD_FAR = 30;
/** Within this, metres, a low-poly component comes back full (hysteresis). */
export const LOD_NEAR = 28;
/** A neighbouring hall at or beyond this, metres from its doorway, is drawn at a quarter. */
export const SCALE_FAR = 5;
/** A neighbouring hall at or within this, metres from its doorway, is drawn in full. */
export const SCALE_NEAR = 2;
/** The fewest resolution steps between a quarter and full, so targets are not resized every frame. */
export const SCALE_STEPS = 24;

/**
 * The share of full resolution a neighbouring hall is drawn at, `d` metres
 * from the centre of its doorway: a quarter from 5 m out, full within 2 m,
 * smoothstep between, so it never jumps.
 */
export function neighbourScale(d: number): number {
  const t = Math.min(
    1,
    Math.max(0, (SCALE_FAR - d) / (SCALE_FAR - SCALE_NEAR)),
  );
  return 0.25 + 0.75 * (3 * t * t - 2 * t * t * t);
}

/** `neighbourScale` rounded to one of `SCALE_STEPS` steps from a quarter to full. */
export function quantisedScale(d: number, steps = SCALE_STEPS): number {
  const s = neighbourScale(d);
  const k = Math.round(((s - 0.25) / 0.75) * steps);
  return 0.25 + (0.75 * k) / steps;
}

/** How a hall stands to the hall walked in. */
export type HallTier = 'own' | 'neighbour' | 'beyond';

/** A hall's tier, given the walker's hall and the halls joined to it by doorways. */
export function hallTier(
  hall: string,
  walkerHall: string,
  joined: readonly string[],
): HallTier {
  if (hall === walkerHall) return 'own';
  return joined.includes(hall) ? 'neighbour' : 'beyond';
}

/**
 * Whether a component is drawn low poly: always in a hall beyond the
 * neighbours; elsewhere beyond 30 m, coming back only within 28 m so it
 * does not flicker at the edge.
 */
export function useLowPoly(
  distance: number,
  tier: HallTier,
  wasLow: boolean,
): boolean {
  if (tier === 'beyond') return true;
  return wasLow ? distance > LOD_NEAR : distance > LOD_FAR;
}

/**
 * What is always drawn the same way, at any distance and in any tier,
 * never swapped, hidden or popped in (the owner, 2026-10-30): the black
 * boxes of Halls 7 and 8, the archway and hall-title signs, and anything
 * already cheap (shells, walls, floors, flat signs and banners). Matched
 * against a component's name, ignoring case.
 */
export const LOD_EXEMPT = [
  'black box',
  'blackbox',
  'shell',
  'wall',
  'floor',
  'ceiling',
  'sign',
  'title',
  'banner',
  'placard',
  'poster',
] as const;

/** Whether a component, by its name, is exempt from level of detail. */
export function lodExempt(name: string): boolean {
  const n = name.toLowerCase();
  return LOD_EXEMPT.some((word) => n.includes(word));
}
