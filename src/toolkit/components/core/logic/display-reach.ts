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
/** A giant LED readout's reach: any hall, end to end. */
export const GIANT_LED_REACH = 30;
export const DISPLAY_LEAVE = 1;

/**
 * The kinds of screen, each seen as its technology allows (the owner,
 * 2026-10-29): `lcd` (a twisted-nematic panel, washing out to its
 * background well off its normal), `crt`, `plasma`, `vfd`, `led` and
 * `nixie` (emitting their own light, readable at wider angles),
 * `giant-led` (a wall-sized LED readout, its digits a hand high, meant to
 * be read across a whole hall: Hall 1's TI5, the owner, 2026-10-30), `touch`
 * (a modern touch screen's panel, readable widely), `printed`
 * (a canvas that is not a screen: a dial face, a chart, a label), and
 * `lcars`, the bridge's touch screens (a touch screen of their own kind,
 * with properties no other has), and `ui`, the game's own panels,
 * which are always drawn in full.
 */
export type DisplayKind =
  | 'lcd'
  | 'crt'
  | 'plasma'
  | 'vfd'
  | 'led'
  | 'giant-led'
  | 'nixie'
  | 'touch'
  | 'printed'
  | 'lcars'
  | 'ui';

/**
 * How a kind of screen is seen: drawn in full only within `reach` metres,
 * subtending more than `minSubtended` degrees, and in front of its face;
 * fading up from flat at `maxOffNormal` degrees off its face's normal to
 * full at `fullOffNormal`. `always` is never flattened. `maxHz` is the
 * most times a second it shows a new picture (the owner, 2026-10-29: a
 * CRT about 25, a 1990s two-line LCD about 5; more is both wasted work
 * and unrealistic): a redraw sooner than that waits its turn.
 */
export interface DisplayProfile {
  always: boolean;
  maxHz: number;
  reach: number;
  minSubtended: number;
  maxOffNormal: number;
  fullOffNormal: number;
  /** How its picture washes out off its normal, drawn per pixel by its material (`LCD_WASH`); none if left out. */
  wash?: LcdWash;
}

/**
 * How a twisted-nematic panel washes out off its normal (the owner,
 * 2026-10-31: "very washed out … you may still see some of the colour, but
 * not all of it, as the backlight filters through"). Within `across`
 * degrees either side, `above` degrees from above and `below` from below
 * (an ellipse between them) its picture is whole; its wash comes in over
 * the next `spread` times as far again, eased, to at most `most`. Washed
 * fully, it loses `desaturate` of its saturation and `contrast` of its
 * contrast, collapsing towards `lift` of its white: lighter and greyer,
 * its hues still faintly there.
 */
export interface LcdWash {
  across: number;
  above: number;
  below: number;
  spread: number;
  most: number;
  desaturate: number;
  contrast: number;
  lift: number;
}

export const LCD_WASH: LcdWash = {
  across: 30,
  above: 18,
  below: 12,
  spread: 1.0,
  most: 0.92,
  desaturate: 0.45,
  contrast: 0.62,
  lift: 0.6,
};

const DEGREES = 180 / Math.PI;

/**
 * The angles a panel is seen at, degrees, from the way to the eye in its
 * own frame (x right, y up, z out of its face): across (either side, so
 * never negative) and up (negative from below).
 */
export function lcdViewAngles(
  x: number,
  y: number,
  z: number,
): { across: number; up: number } {
  const out = Math.max(z, 1e-4);
  return {
    across: Math.atan2(Math.abs(x), out) * DEGREES,
    up: Math.atan2(y, out) * DEGREES,
  };
}

/** How washed out a panel looks seen at these angles, 0 (whole) to `most`. */
export function lcdWashAmount(
  across: number,
  up: number,
  wash: LcdWash = LCD_WASH,
): number {
  const a = Math.abs(across) / wash.across;
  const v = up >= 0 ? up / wash.above : -up / wash.below;
  const t = Math.max(0, Math.min(1, (Math.hypot(a, v) - 1) / wash.spread));
  return wash.most * t * t * (3 - 2 * t);
}

/**
 * A colour (0..1, of the panel's white) washed out by `amount`: its
 * saturation, then its contrast, lost towards a light grey.
 */
export function lcdWashed(
  [r, g, b]: readonly [number, number, number],
  amount: number,
  wash: LcdWash = LCD_WASH,
): [number, number, number] {
  const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const d = amount * wash.desaturate;
  const k = amount * wash.contrast;
  return [r, g, b].map((c) => {
    const flat = c + (grey - c) * d;
    return flat + (wash.lift - flat) * k;
  }) as [number, number, number];
}

const seen = (
  maxHz: number,
  maxOffNormal: number,
  fullOffNormal: number,
): DisplayProfile => ({
  always: false,
  maxHz,
  reach: DISPLAY_REACH,
  minSubtended: 1,
  maxOffNormal,
  fullOffNormal,
});
const always = (maxHz: number): DisplayProfile => ({
  ...seen(maxHz, 90, 90),
  always: true,
});

export const DISPLAY_PROFILES: Record<DisplayKind, DisplayProfile> = {
  // Its narrow angle is its wash's (`LCD_WASH`); flat only near grazing.
  // Flat sooner than realism asks, at 60–65° (the owner, 2026-10-31): an
  // LCD seen that far off is washed out anyway, and a flat one costs no
  // redraws or uploads.
  lcd: { ...seen(5, 65, 60), wash: LCD_WASH },
  crt: seen(25, 85, 80),
  plasma: seen(30, 85, 80),
  vfd: seen(10, 85, 80),
  led: seen(10, 85, 80),
  'giant-led': { ...seen(10, 85, 80), reach: GIANT_LED_REACH },
  nixie: seen(5, 85, 80),
  touch: seen(30, 85, 80),
  printed: seen(Infinity, 90, 88),
  lcars: always(30),
  ui: always(Infinity),
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
    ...profile,
    reach: Math.min(profile.reach, limits.reach ?? Infinity),
    minSubtended: Math.max(profile.minSubtended, limits.minSubtended ?? 0),
    maxOffNormal: profile.maxOffNormal - narrow,
    fullOffNormal: profile.fullOffNormal - narrow,
  };
}

/** Whether a display last shown at `last` ms may show a new picture at `now`. */
export function mayRefresh(profile: DisplayProfile, last: number, now: number) {
  return now - last >= 1000 / profile.maxHz;
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

/**
 * Which lettering of a static sign is drawn (the owner, 2026-10-29: never
 * worth drawing a line of text that covers too few pixels on the screen,
 * which depends on the screen, the view and the angle it is seen at, not
 * on a fixed distance): lettering is drawn once its height would cover
 * `SIGN_MIN_PIXELS` on the screen, seen as it is (its distance, the
 * camera's field of view and zoom, the screen's height in pixels, and how
 * obliquely its face is seen); a sign whose lettering would all be
 * smaller shows only its regions of colour. The smallest size drawn is
 * stepped on `SIGN_CUTOFFS` (metres), each step one drawing of the sign.
 */
export const SIGN_MIN_PIXELS = 5;
export const SIGN_CUTOFFS = [0, 0.005, 0.01, 0.02, 0.04, 0.08, 0.16, 0.32];

/** How a sign is seen, for its lettering. */
export interface SignView {
  metres: number;
  /** The camera's vertical field of view, degrees, and zoom. */
  fov: number;
  zoom: number;
  /** The screen's height, pixels. */
  screenPixels: number;
  /** Degrees off its face's normal, or null if it has no flat face. */
  offNormal: number | null;
}

/** The smallest lettering (metres) that covers `SIGN_MIN_PIXELS` on the screen, seen so. */
export function smallestReadable(v: SignView): number {
  const halfHeight =
    (v.metres * Math.tan((v.fov * Math.PI) / 360)) / Math.max(v.zoom, 1e-6);
  const pixelsPerMetre = v.screenPixels / (2 * halfHeight);
  const slant =
    v.offNormal === null
      ? 1
      : Math.max(0.05, Math.cos((Math.min(v.offNormal, 90) * Math.PI) / 180));
  return SIGN_MIN_PIXELS / (pixelsPerMetre * slant);
}

/**
 * The step of `SIGN_CUTOFFS` a sign is drawn at, needing lettering of
 * `need` metres to be read, given the step it was at: the largest cutoff
 * not above `need` (so it shows a little more, never less, than can be
 * read); going to less detail only once 15% past a step, so it does not
 * flicker there.
 */
export function signStep(was: number, need: number): number {
  let step = 0;
  for (let k = 0; k < SIGN_CUTOFFS.length; k++)
    if (SIGN_CUTOFFS[k] <= need) step = k;
  if (step > was && need < SIGN_CUTOFFS[step] * 1.15)
    step = Math.max(was, step - 1);
  return step;
}

/** The size in pixels a CSS font string gives, or null. */
export function fontPixels(font: string): number | null {
  const m = /(\d+(?:\.\d+)?)px/.exec(font);
  return m ? Number(m[1]) : null;
}

/** Whether lettering in `font` is drawn with cutoff `cutoff` (metres), on a sign of `pixelsPerMetre`. */
export function letteringShown(
  cutoff: number,
  font: string,
  pixelsPerMetre: number,
): boolean {
  if (cutoff <= 0) return true;
  const px = fontPixels(font);
  return px !== null && px / pixelsPerMetre >= cutoff;
}
