/**
 * The title logo's timing, placement and motion (pure; drawn by
 * `title-logo.ts`, and by `scripts/title-logo.ts` into the SVGs). The logo
 * is the vector `resources/images/title/the-pool-logo.svg`, drawn after the
 * owner's roundel (`doc/marketing/logos/05-circle-notext.png`): a dome of
 * pool water over its plant. Four seconds after the title screen opens the
 * logo draws in (unblurring as it fades in); two seconds after that the
 * title "The Pool" appears over the top of the dome, its feet dipping into
 * the water, reflected beneath itself; the water and the reflection ripple
 * gently, the sight glass swirls and the gauges' needles tremble, redrawn
 * at no more than 10 Hz.
 */

/** Seconds after the title screen opens when the logo begins to draw in. */
export const LOGO_REVEAL_AT_S = 4;
/**
 * Seconds the logo takes to draw in: over them it goes from heavily blurred
 * to sharp while it fades from nothing to full (the owner, 2026-10-29).
 */
export const LOGO_REVEAL_S = 2;
/** The blur, in CSS pixels, that a layer starts from as it appears. */
export const REVEAL_BLUR_PX = 24;
/** Seconds after the logo begins when the title appears. */
export const TITLE_AFTER_LOGO_S = 2;
/** Seconds after the title screen opens when the title appears. */
export const TITLE_AT_S = LOGO_REVEAL_AT_S + TITLE_AFTER_LOGO_S;
/** Seconds the title (and its reflection) takes to appear, as the logo does. */
export const TITLE_FADE_S = 2;

/** How often the ripple is redrawn, at most (the repo's display rule). */
export const RIPPLE_HZ = 10;
/** The ripple's largest sideways shift, in pixels of the logo's art. */
export const RIPPLE_AMPLITUDE_PX = 1.6;
/** The ripple's wavelength down the image, in pixels of the art. */
export const RIPPLE_WAVELENGTH_PX = 34;
/** Seconds for one ripple to pass. */
export const RIPPLE_PERIOD_S = 2.4;

/**
 * How far `scripts/title-logo.ts` lifts the logo's upper section (the water
 * dome and the tiled band) to close it in its keyline: the rim's measured
 * thickness, which the script prints. Everything in that section below is
 * placed where it was in the source, less this.
 */
export const SECTION_LIFT_PX = 8;

/**
 * In the art's pixels (760 × 743): the roundel's centre and inner radius
 * (inside its dark rim; as `scripts/title-logo.ts` measures them, less the
 * lift), and the band of water that ripples (the open
 * water and the waves, above the tiled edge).
 */
export const LOGO_ART = {
  width: 760,
  height: 743,
  centreX: 380,
  centreY: 382 - SECTION_LIFT_PX,
  innerRadius: 362,
  waterTop: 18 - SECTION_LIFT_PX,
  waterBottom: 312 - SECTION_LIFT_PX,
} as const;

/**
 * The title's lettering in the art's pixels: its size, and its baseline,
 * just below the water's upper surface line (`waterline`), so the letters'
 * feet dip into the water with the reflection carrying on below them (the
 * owner, 2026-10-29: 20% bigger than first drawn, and lower).
 */
export const TITLE_TEXT = {
  sizePx: 137,
  waterline: 250 - SECTION_LIFT_PX,
  baselineY: 258 - SECTION_LIFT_PX,
  /** How far below the baseline the reflection begins. */
  reflectionGapPx: 2,
  /** Its height as a share of the title's (foreshortened on the water). */
  reflectionScale: 0.6,
  /** Its opacity where it meets the title, fading to nothing below. */
  reflectionAlpha: 0.42,
} as const;

/** The ripple's frame at a time: changes at most `RIPPLE_HZ` times a second. */
export function rippleFrame(seconds: number): number {
  return Math.floor(Math.max(0, seconds) * RIPPLE_HZ);
}

/**
 * The sideways shift of the row at `y` (the art's pixels) in a ripple
 * frame, tapered to nothing at the top and bottom of the band `top`–`bottom`
 * so it never tears from the still parts of the picture.
 */
export function rippleShift(
  y: number,
  frame: number,
  top: number = LOGO_ART.waterTop,
  bottom: number = LOGO_ART.waterBottom,
): number {
  if (y <= top || y >= bottom) return 0;
  const t = frame / RIPPLE_HZ;
  const taper = Math.sin((Math.PI * (y - top)) / (bottom - top));
  const phase =
    (2 * Math.PI * y) / RIPPLE_WAVELENGTH_PX -
    (2 * Math.PI * t) / RIPPLE_PERIOD_S;
  return RIPPLE_AMPLITUDE_PX * taper * Math.sin(phase);
}

/**
 * The filter's sight glass (the owner, 2026-10-29): a round window on the
 * logo's filter vessel, between its two bands, in the art's pixels, through
 * which the water swirls over a bed of sand whose surface stirs.
 */
export const SIGHT_GLASS = {
  x: 173,
  y: 531,
  /** The glass itself, inside its bezel. */
  radius: 20,
  /** How many grains swirl in the water. */
  grains: 7,
  /** Seconds for the swirl to go once round. */
  swirlPeriodS: 4,
  /** The sand's surface, below the centre as a share of the radius. */
  sandLevel: 0.35,
  /** How far it rocks, likewise. */
  sandSwell: 0.08,
} as const;

export interface SightGlassView {
  /** The sand's surface, in the art's pixels below the glass's centre. */
  sandY: number;
  /** Its tilt, in pixels, from the left of the glass to the right. */
  sandTilt: number;
  /** The grains, offsets from the glass's centre in the art's pixels. */
  grains: { dx: number; dy: number }[];
}

/**
 * Seconds after which the sight glass and the gauges' needles repeat
 * exactly, so the animated SVG (`scripts/title-logo.ts`) can loop them
 * seamlessly: every period below divides it.
 */
export const LOOP_S = 16;

/** What the sight glass shows in a ripple frame (at most 10 a second). */
export function sightGlassView(frame: number): SightGlassView {
  const g = SIGHT_GLASS;
  const t = frame / RIPPLE_HZ;
  const turn = (2 * Math.PI * t) / g.swirlPeriodS;
  const sandY =
    g.radius * (g.sandLevel + g.sandSwell * Math.sin((2 * Math.PI * t) / 3.2));
  const sandTilt = g.radius * 0.18 * Math.sin((2 * Math.PI * t) / 2);
  const grains = Array.from({ length: g.grains }, (_, k) => {
    // Each on its own orbit in the water above the sand, some faster.
    const r = g.radius * (0.25 + 0.5 * ((k * 0.618) % 1));
    const a = turn * (1 + (k % 3) * 0.25) + (k * 2 * Math.PI) / g.grains;
    const dx = r * Math.cos(a);
    // Squashed vertically, and kept above the sand.
    const dy = Math.min(sandY - 2, r * 0.55 * Math.sin(a) - g.radius * 0.15);
    return { dx, dy };
  });
  return { sandY, sandTilt, grains };
}

/**
 * The logo's pressure gauges, in the art's pixels: centre, radius, and the
 * reading their needles tremble about (degrees, clockwise from east), and
 * the periods (seconds, dividing `LOOP_S`) of each needle's two wobbles, so
 * no two keep step.
 */
export const GAUGES = [
  { x: 276, y: 468, r: 15, angle: -60, periods: [2, 0.8] },
  { x: 445, y: 430, r: 16, angle: -150, periods: [3.2, 1.6] },
  { x: 493, y: 430, r: 16, angle: -100, periods: [1.6, 0.5] },
  { x: 541, y: 430, r: 16, angle: -45, periods: [4, 1] },
] as const;
/**
 * How far each needle wanders about its reading (slowly), and how much it
 * trembles on top (quickly, as a gauge's needle does with the pump), in
 * degrees: noticeable at the logo's size, never a sweep.
 */
export const NEEDLE_WANDER_DEG = 12;
export const NEEDLE_TREMBLE_DEG = 2;

/** Gauge `k`'s needle angle (degrees) in a ripple frame: its reading, wandering and trembling. */
export function gaugeNeedle(k: number, frame: number): number {
  const g = GAUGES[k]!;
  const t = frame / RIPPLE_HZ;
  const [slow, fast] = g.periods;
  return (
    g.angle +
    NEEDLE_WANDER_DEG * Math.sin((2 * Math.PI * t) / slow + 1.7 * k) +
    NEEDLE_TREMBLE_DEG * Math.sin((2 * Math.PI * t) / fast + 2.3 * k)
  );
}
