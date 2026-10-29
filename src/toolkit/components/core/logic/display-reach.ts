/**
 * Displays drawn only within reading distance (the owner, 2026-10-29:
 * "there's no point in rendering a display as anything more than a flat
 * rectangle … unless you're literally within 5 meters of it, or maybe
 * eight"): beyond `DISPLAY_REACH` metres a display shows one flat colour,
 * its own average, and its redraws are not uploaded; within it, it shows
 * what it shows, if it is also seen from in front, near enough its normal,
 * and large enough to read. `DISPLAY_LEAVE` is the margin it must go past to go flat
 * again, so it does not flicker at the edge.
 */
export const DISPLAY_REACH = 8;
export const DISPLAY_LEAVE = 1;

/**
 * The steepest view, from its face's normal, at which a display can be
 * read (the owner, 2026-10-29: an LCD seen well off its normal shows
 * little but its background), and the angle its face must subtend to be
 * read at all, both in degrees. A display seen from behind is never read.
 */
export const DISPLAY_MAX_OFF_NORMAL = 70;
export const DISPLAY_MIN_SUBTENDED = 1;

/** How a display is seen: distance, angle off its face's normal (null if it has no flat face), and angle subtended. */
export interface DisplaySighting {
  metres: number;
  /** Degrees from the face's normal; over 90 is behind it. */
  offNormal: number | null;
  /** Degrees across its face as seen. */
  subtended: number;
}

/**
 * Whether a display is drawn in full, given whether it was: within reach,
 * in front of its face and not too far off its normal, and big enough to
 * read; each with a margin to pass before it goes flat again, so it does
 * not flicker at an edge.
 */
export function displayInReach(
  wasInReach: boolean,
  { metres, offNormal, subtended }: DisplaySighting,
): boolean {
  const margin = wasInReach ? 1 : 0;
  if (metres >= DISPLAY_REACH + margin * DISPLAY_LEAVE) return false;
  if (offNormal !== null && offNormal >= DISPLAY_MAX_OFF_NORMAL + margin * 5)
    return false;
  return subtended > DISPLAY_MIN_SUBTENDED * (1 - margin * 0.2);
}

/**
 * A display needs a flat stand-in only once it has changed after it was
 * first drawn: a label drawn once costs nothing to keep, and going flat
 * and back would upload it twice for nothing.
 */
export function isLiveDisplay(updates: number): boolean {
  return updates >= 2;
}

/** The average of RGBA pixel data, as a CSS colour (alpha ignored). */
export function meanColour(data: ArrayLike<number>): string {
  let r = 0;
  let g = 0;
  let b = 0;
  const n = Math.floor(data.length / 4);
  if (n === 0) return 'rgb(0,0,0)';
  for (let i = 0; i < n * 4; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
}
