/**
 * Displays drawn only within reading distance (the owner, 2026-10-29:
 * "there's no point in rendering a display as anything more than a flat
 * rectangle … unless you're literally within 5 meters of it, or maybe
 * eight"): beyond `DISPLAY_REACH` metres a display shows one flat colour,
 * its own average, and its redraws are not uploaded; within it, it shows
 * what it shows, if it is also seen from in front, near enough its normal
 * for its kind, and large enough to read. `DISPLAY_LEAVE` is the margin it
 * must go past to go flat again, so it does not flicker at the edge.
 */
export const DISPLAY_REACH = 8;
export const DISPLAY_LEAVE = 1;

/**
 * The kinds of screen, each seen as its technology allows (the owner,
 * 2026-10-29): `lcd` (a twisted-nematic panel, washing out to its
 * background well off its normal), `crt`, `plasma`, `vfd`, `led` and
 * `nixie` (emitting their own light, readable at wider angles), `printed`
 * (a canvas that is not a screen: a dial face, a chart, a label), and
 * `lcars`, the bridge's touch screens, and `ui`, the game's own panels,
 * which are always drawn in full.
 */
export type DisplayKind =
  | 'lcd'
  | 'crt'
  | 'plasma'
  | 'vfd'
  | 'led'
  | 'nixie'
  | 'printed'
  | 'lcars'
  | 'ui';

/**
 * How a kind of screen is seen: drawn in full only within `reach` metres,
 * subtending more than `minSubtended` degrees, and in front of its face;
 * fading up from flat at `maxOffNormal` degrees off its face's normal to
 * full at `fullOffNormal`. `always` is never flattened.
 */
export interface DisplayProfile {
  always: boolean;
  reach: number;
  minSubtended: number;
  maxOffNormal: number;
  fullOffNormal: number;
}

const seen = (maxOffNormal: number, fullOffNormal: number): DisplayProfile => ({
  always: false,
  reach: DISPLAY_REACH,
  minSubtended: 1,
  maxOffNormal,
  fullOffNormal,
});
const ALWAYS: DisplayProfile = { ...seen(90, 90), always: true };

export const DISPLAY_PROFILES: Record<DisplayKind, DisplayProfile> = {
  lcd: seen(70, 65),
  crt: seen(85, 80),
  plasma: seen(85, 80),
  vfd: seen(85, 80),
  led: seen(85, 80),
  nixie: seen(85, 80),
  printed: seen(90, 88),
  lcars: ALWAYS,
  ui: ALWAYS,
};

/**
 * A room's own limits on its displays (the owner, 2026-10-29: a very
 * complicated room may draw fewer screens): a shorter reach, a larger
 * angle a display must subtend, or a narrower view off its normal. Each
 * only tightens a kind's profile, never loosens it; a screen always drawn
 * in full stays so.
 */
export interface RoomDisplayLimits {
  reach?: number;
  minSubtended?: number;
  /** Degrees taken off a kind's viewing angles (its fade moves with them). */
  narrowBy?: number;
}

/** A kind's profile under a room's limits. */
export function withinRoomLimits(
  profile: DisplayProfile,
  limits: RoomDisplayLimits | undefined,
): DisplayProfile {
  if (!limits || profile.always) return profile;
  const narrow = Math.max(0, limits.narrowBy ?? 0);
  return {
    always: false,
    reach: Math.min(profile.reach, limits.reach ?? Infinity),
    minSubtended: Math.max(profile.minSubtended, limits.minSubtended ?? 0),
    maxOffNormal: profile.maxOffNormal - narrow,
    fullOffNormal: profile.fullOffNormal - narrow,
  };
}

/** The fade's steps, each one upload. */
export const DISPLAY_FADE_STEPS = 4;

/** How a display is seen: distance, angle off its face's normal (null if it has no flat face), and angle subtended. */
export interface DisplaySighting {
  metres: number;
  /** Degrees from the face's normal; over 90 is behind it. */
  offNormal: number | null;
  /** Degrees across its face as seen. */
  subtended: number;
}

/**
 * How much of a display is drawn, from 0 (flat) to 1 (in full), given
 * whether any of it was: none unless within its kind's reach, in front of
 * its face and big enough to read (each with a margin to pass before it
 * goes flat again, so it does not flicker at an edge); then faded up by
 * its angle off its face's normal, in whole steps.
 */
export function displayVisibility(
  wasShown: boolean,
  { metres, offNormal, subtended }: DisplaySighting,
  profile: DisplayProfile = DISPLAY_PROFILES.lcd,
): number {
  if (profile.always) return 1;
  const margin = wasShown ? 1 : 0;
  if (metres >= profile.reach + margin * DISPLAY_LEAVE) return 0;
  if (subtended <= profile.minSubtended * (1 - margin * 0.2)) return 0;
  if (offNormal === null) return 1;
  if (offNormal >= 90) return 0;
  const span = profile.maxOffNormal - profile.fullOffNormal;
  const t = span > 0 ? (profile.maxOffNormal - offNormal) / span : 1;
  const clamped = Math.max(0, Math.min(1, t));
  return Math.round(clamped * DISPLAY_FADE_STEPS) / DISPLAY_FADE_STEPS;
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
