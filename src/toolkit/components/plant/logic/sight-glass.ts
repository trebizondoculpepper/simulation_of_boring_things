/**
 * A filter's sight glass, as it looks (the owner, 2026-10-23, and again
 * 2026-10-31): the view through the round window at the top of a sand
 * bed, a two-dimensional picture standing for a three-dimensional view
 * into an unlit tank, for filters of any size. From the bottom up:
 *
 * 1. the compacted sand of the bed, pressed against the glass, its grains
 *    sharp;
 * 2. a line where the sand's surface meets the glass;
 * 3. behind and above it, the sand's surface seen receding into the tank,
 *    lit a little near the glass by what light comes through it, fading
 *    to black as it goes back into the dark; the water over it dark;
 * 4. dirty, the line thickens into a band of brown, then near-black,
 *    sludge on the surface and in the top of the sand, thicker and darker
 *    the dirtier the bed; the receding surface takes its colour too.
 *
 * Left too long, the fouled top cracks and the water short-circuits it
 * (channelling, the model's fissuring): the surface pits, with cavities
 * and craters in it, dips in the line where they meet the glass, darker
 * hollows in the receding surface, and the grime working down into them
 * as tongues reaching into the sand below the line.
 *
 * In a backwash the water comes up through the bed: the bed lifts and
 * fluidises, its surface blurs away, its grains swirl in water clouded
 * brown with the dirt coming out, the sludge band disperses, and the
 * water clears as the dirt goes; air at its start shows as bubbles. In a
 * rinse the loose sand settles back. A bed that has lost sand shows its
 * surface lower; a vessel drained down, or with air in its top, shows the
 * water's level, with air over it.
 *
 * `stepSightGlass` moves each of the picture's quantities toward what the
 * filter's state asks, each at its own rate, so one state blends into the
 * next instead of jumping; `glassLayers` turns the state into the
 * picture's layers (heights as shares of the window from its bottom,
 * colours), for the view (`views/sight-glass.ts`) to draw. Pure.
 */

export type GlassMode = 'stopped' | 'service' | 'backwash' | 'rinse';

export interface GlassInputs {
  mode: GlassMode;
  /** The dirt in the bed, as a share of what doubles its resistance (0 clean, 1 dirty, 2 very dirty). */
  dirt: number;
  /** How far the bed has channelled (the model's fissuring), 0 (flat) to 1 (badly pitted). */
  channelling: number;
  /** How murky the water over the bed is, 0 (clear) to 1 (brown). */
  murk: number;
  /** The share of its sand the bed still has, 0 to 1 (all of it unless given): less, its surface lower. */
  sand?: number;
  /** The water's level in the window, as a share of its height from the bottom (full unless given): air over it. */
  water?: number;
}

export interface GlassState {
  /** The bed's surface, as a share of the window's height from its bottom. */
  bed: number;
  /** The sludge band's thickness, as a share of the window's height, and its darkness, 0 to 1. */
  crust: number;
  crustDark: number;
  /** How pitted the surface is, 0 to 1. */
  rough: number;
  /** The water's murk, 0 to 1. */
  murk: number;
  /** How much the grains move (the bed fluidised), 0 to 1. */
  churn: number;
  /** Air coming through, 0 to 1. */
  bubbles: number;
  /** Seconds since the backwash began (for its first air), or −1. */
  washing: number;
  /** The water's level in the window, 0 to 1 (1 or more, full). */
  water: number;
}

/** The bed's surface at rest (a little below the window's middle, as it is fitted, its receding surface above), and lifted in a backwash. */
export const BED_REST = 0.42;
export const BED_LIFTED = 0.62;
/** How far the surface falls, in window heights, for all the sand lost: a tenth lost drops it 0.15. */
export const SAND_DROP = 1.5;
/** The receding surface's height in the window, above the line, seen from a little above. */
export const RECEDE = 0.2;

export const newGlass = (): GlassState => ({
  bed: BED_REST,
  crust: 0,
  crustDark: 0,
  rough: 0,
  murk: 0,
  churn: 0,
  bubbles: 0,
  washing: -1,
  water: 1,
});

/** Move `from` toward `to` with time constant `tau`, s. */
const ease = (from: number, to: number, tau: number, dt: number) =>
  to + (from - to) * Math.exp(-dt / tau);

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** What the picture is heading for, in a state. */
export function glassTarget(i: GlassInputs) {
  // Plain to see (the owner, 2026-10-26: clean and dirty beds looked the
  // same), and growing on past a full load (the owner, 2026-10-31: the
  // dirtier, the thicker and darker): a thin line clean, a brown band at
  // one, a thick near-black one at two and beyond.
  const dirt = clamp(i.dirt / 2.2);
  const lifted = i.mode === 'backwash';
  const lost = 1 - clamp(i.sand ?? 1);
  const rest = Math.max(0.06, BED_REST - lost * SAND_DROP);
  return {
    bed: lifted ? Math.max(rest + 0.12, BED_LIFTED - lost * SAND_DROP) : rest,
    // Lifted, the sludge breaks up into the swirling bed.
    crust: lifted ? 0 : 0.012 + 0.2 * dirt,
    crustDark: lifted ? 0 : clamp(0.05 + 0.95 * dirt),
    // Lifted, its pits are gone with its surface; settled again, the
    // model's fissuring says how far they come back.
    rough: lifted ? 0 : clamp(i.channelling),
    murk: clamp(i.murk),
    churn: lifted ? 1 : i.mode === 'rinse' ? 0.25 : 0,
    water: clamp(i.water ?? 1.2, 0, 1.2),
  };
}

/**
 * The picture already settled on what `i` asks: as a glass looks that has
 * shown this state a while. A glass built with its room starts here, not
 * from a clean bed easing toward its own dirt over the first half minute
 * (which also redrew it fifteen times a second for that long, mission 094).
 */
export function settledGlass(i: GlassInputs): GlassState {
  const t = glassTarget(i);
  return {
    ...t,
    bubbles: 0,
    washing: i.mode === 'backwash' ? 6 : -1,
  };
}

export function stepSightGlass(
  s: GlassState,
  i: GlassInputs,
  dt: number,
): GlassState {
  if (!(dt > 0)) return s;
  const t = glassTarget(i);
  const washing =
    i.mode === 'backwash' ? (s.washing < 0 ? 0 : s.washing + dt) : -1;
  // Air in the first few seconds of a backwash, then gone.
  const air = washing >= 0 && washing < 6 ? 1 - washing / 6 : 0;
  return {
    // The bed lifts in a few seconds, settles more slowly.
    bed: ease(s.bed, t.bed, t.bed > s.bed ? 3 : 8, dt),
    crust: ease(s.crust, t.crust, 6, dt),
    crustDark: ease(s.crustDark, t.crustDark, 6, dt),
    rough: ease(s.rough, t.rough, 4, dt),
    // The water clouds fast, and clears as fast as what feeds it clears.
    murk: ease(s.murk, t.murk, t.murk > s.murk ? 1.5 : 4, dt),
    churn: ease(s.churn, t.churn, 2, dt),
    bubbles: ease(s.bubbles, air, 0.8, dt),
    washing,
    // A vessel drains down, or fills, over some seconds.
    water: ease(s.water ?? 1, t.water, 5, dt),
  };
}

/**
 * The pits a channelled surface opens, the same in every glass: each at
 * `x` across the window (0 left, 1 right), `back` into the tank (0 at
 * the glass, 1 lost in the dark), `w` its width at the glass, and `from`
 * the pitting at which it opens (the model's fissuring; its condition
 * calls the sand pitted from 0.2, `filter-condition.ts`), and `reach`.
 */
export const PITS: readonly {
  x: number;
  back: number;
  w: number;
  from: number;
  /** How far, for its size, the grime runs down from it into the sand, if it meets the glass. */
  reach: number;
}[] = [
  { x: 0.34, back: 0, w: 0.07, from: 0.12, reach: 1 },
  { x: 0.62, back: 0.22, w: 0.1, from: 0.15, reach: 0 },
  { x: 0.18, back: 0.45, w: 0.08, from: 0.25, reach: 0 },
  { x: 0.74, back: 0, w: 0.09, from: 0.3, reach: 0.7 },
  { x: 0.47, back: 0.6, w: 0.09, from: 0.4, reach: 0 },
  { x: 0.86, back: 0.35, w: 0.07, from: 0.5, reach: 0 },
  { x: 0.12, back: 0, w: 0.05, from: 0.6, reach: 0.45 },
  { x: 0.55, back: 0, w: 0.06, from: 0.7, reach: 0.8 },
  { x: 0.3, back: 0.75, w: 0.08, from: 0.8, reach: 0 },
];

/** How open each pit is, 0 to 1, at a pitting: growing from its `from` to full 0.3 beyond. */
export const pitOpening = (rough: number, from: number) =>
  clamp((rough - from) / 0.3);

/**
 * The bed's surface where it meets the glass, from the window's left (0)
 * to its right (1): its height there, as a share of the window, dipping
 * where a pit at the glass breaks it, gently uneven as it pits, and
 * rippling as the bed churns.
 */
export function surfaceAt(s: GlassState, x: number, time: number) {
  let dips = 0;
  for (const p of PITS) {
    if (p.back > 0.05) continue;
    const open = pitOpening(s.rough, p.from);
    if (open > 0) dips += open * 0.06 * Math.exp(-(((x - p.x) / p.w) ** 2));
  }
  const uneven =
    s.rough *
    0.012 *
    (Math.sin(x * 9.4 + 1.3) * 0.6 + Math.sin(x * 23 + 0.4) * 0.4);
  const ripple = s.churn * 0.02 * Math.sin(x * 14 + time * 3.1);
  return s.bed - dips + uneven + ripple;
}

export type Rgb = [number, number, number];

/** The sand, clean, against the glass; the sludge, brown and near black; the water, black in the dark vessel and pale brown with a backwash's dirt. */
export const SAND: Rgb = [214, 184, 116];
export const SLUDGE_BROWN: Rgb = [118, 84, 46];
export const SLUDGE_BLACK: Rgb = [30, 23, 16];
export const DARK_WATER: Rgb = [6, 7, 8];
export const MURK: Rgb = [168, 138, 98];
/** Air over the water in an unlit vessel: as dark, a little greyer. */
export const AIR: Rgb = [8, 9, 11];

export const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb =>
  a.map((v, k) => v + (b[k] - v) * clamp(t)) as Rgb;

/** A tongue of grime running down from a pit at the glass into the sand: `x`, its width `w`, its `length` below the line, its `alpha`. */
export interface GrimeTongue {
  x: number;
  w: number;
  length: number;
  alpha: number;
}

/** A hollow in the receding surface: centred at `x`, `v` up the band (0 at the line, 1 at its top), `w` and `h` its half-sizes in window shares, `alpha` its darkness. */
export interface Hollow {
  x: number;
  v: number;
  w: number;
  h: number;
  alpha: number;
}

/**
 * The picture's layers, from a state: what the view draws, bottom up.
 * Heights are shares of the window from its bottom; colours 0–255.
 */
export interface GlassLayers {
  /** The sand below the line, its colour, and how packed it shows (1 compacted against the glass, less as it fluidises). */
  sand: Rgb;
  packed: number;
  /** The line's thickness where the surface meets the glass: a thin shadow clean, the sludge band dirty. */
  line: number;
  /** The sludge band below the line: its thickness, its colour, its opacity (gone as the bed fluidises). */
  sludge: number;
  sludgeColour: Rgb;
  sludgeAlpha: number;
  /** Tongues of grime from the pits at the glass down into the sand. */
  tongues: GrimeTongue[];
  /** The receding surface: its height above the line, its colour near the glass (lit a little), and how sharp it shows (0 blurred away by a backwash). */
  recede: number;
  surfaceNear: Rgb;
  surfaceSharp: number;
  /** The pits seen as darker hollows in it. */
  hollows: Hollow[];
  /** The water over the bed, and its murk's opacity. */
  water: Rgb;
  murk: number;
  /** The water's level in the window (1 or more: full), air over it. */
  level: number;
}

export function glassLayers(s: GlassState): GlassLayers {
  const fluid = clamp(s.churn);
  const dark = clamp(s.crustDark);
  const sludgeColour = mixRgb(SLUDGE_BROWN, SLUDGE_BLACK, dark);
  // The dirt on the surface colours what is seen of it receding, lit a
  // little at the glass.
  const surfaceNear = mixRgb(
    mixRgb(SAND, [0, 0, 0], 0.32),
    mixRgb(sludgeColour, [0, 0, 0], 0.2),
    clamp(0.25 + dark * 0.9) * clamp(s.crust / 0.04),
  );
  const tongues: GrimeTongue[] = [];
  const hollows: Hollow[] = [];
  for (const p of PITS) {
    const open = pitOpening(s.rough, p.from) * (1 - fluid);
    if (open <= 0) continue;
    if (p.back < 0.05)
      tongues.push({
        x: p.x,
        w: p.w,
        // The grime reaching down as far as the bed is fouled and pitted.
        length:
          s.crust * 0.6 + open * p.reach * (0.06 + 0.2 * clamp(s.crust / 0.1)),
        alpha: clamp(0.35 + 0.6 * dark) * open,
      });
    // Each hollow narrower and flatter the further back it lies.
    const far = 1 - p.back * 0.6;
    hollows.push({
      x: p.x,
      v: p.back,
      w: p.w * far * (0.6 + 0.4 * open),
      h: p.w * far * 0.3 * (0.5 + 0.5 * open),
      alpha: 0.85 * open,
    });
  }
  return {
    sand: mixRgb(SAND, SLUDGE_BROWN, clamp(s.crust * 0.8)),
    packed: 1 - 0.6 * fluid,
    line: 0.008 + s.crust * 0.15,
    sludge: s.crust,
    sludgeColour,
    sludgeAlpha: clamp(0.25 + dark) * (1 - fluid),
    tongues,
    recede: RECEDE * (1 - 0.6 * fluid),
    surfaceNear,
    surfaceSharp: 1 - fluid,
    hollows,
    water: DARK_WATER,
    murk: clamp(s.murk),
    level: s.water ?? 1,
  };
}

/**
 * What the picture shows, quantised (to a hundredth of the window): the
 * view draws again only when this changes, or while its grains move, so a
 * slowly loading bed redraws once in many minutes, not every frame.
 */
export const glassKey = (s: GlassState) =>
  [
    ...[s.bed, s.crust, s.crustDark, s.rough, s.murk].map((v) =>
      Math.round(v * 100),
    ),
    Math.round(Math.min(1, s.water ?? 1) * 100),
    // A rinse's settling sand, still: by tenths.
    Math.round(s.churn * 10),
  ].join();

/**
 * Whether the picture moves of itself: a bed fluidised in a backwash, its
 * grains swirling, or air rising. A rinse's few loose grains (a quarter
 * churned) are drawn still, so a bed left unsettled after a wash does not
 * redraw while nothing changes.
 */
export const glassMoving = (s: GlassState) => s.churn > 0.3 || s.bubbles > 0.02;
