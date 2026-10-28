/**
 * A filter's sight glass, as it looks (the owner, 2026-10-23): the view
 * through the round window at the top of a sand bed, as a two-dimensional
 * picture that changes with the filter's state, for filters of any size.
 * After what operators look for (pool trade guidance on sand filters):
 *
 * - in service, clear water over a flat bed; the dirt it catches gathers
 *   in its top few centimetres as a grey-brown crust, darker the more it
 *   holds;
 * - left too long, the fouled top cracks and the water finds ways round
 *   it (channelling): the surface goes uneven, with valleys and ridges;
 * - in a backwash, the water comes up through the bed, the bed lifts and
 *   expands, its grains churn, the water over it clouds brown with the
 *   dirt coming out and clears as the dirt goes; air at its start shows as
 *   bubbles;
 * - in a rinse, the loose sand settles back onto the bed;
 * - stopped, all is still.
 *
 * `stepSightGlass` moves each of the picture's quantities toward what the
 * filter's state asks, each at its own rate, so one state blends into the
 * next instead of jumping. Pure.
 *
 * What is seen of it (the owner, 2026-10-23): the window is fitted with
 * the bed's surface at rest across its middle, sand below and water over
 * it; the water is black in a vessel with no light of its own, but for
 * the pale brown murk of a backwash (`views/sight-glass.ts`).
 */

export type GlassMode = 'stopped' | 'service' | 'backwash' | 'rinse';

export interface GlassInputs {
  mode: GlassMode;
  /** The dirt in the bed, as a share of what doubles its resistance (0 clean, 1 dirty, 2 very dirty). */
  dirt: number;
  /** How far the bed has channelled, 0 (flat) to 1 (badly). */
  channelling: number;
  /** How murky the water over the bed is, 0 (clear) to 1 (brown). */
  murk: number;
}

export interface GlassState {
  /** The bed's surface, as a share of the window's height from its bottom. */
  bed: number;
  /** The crust's thickness, as a share of the window's height, and its darkness, 0 to 1. */
  crust: number;
  crustDark: number;
  /** The surface's unevenness, 0 to 1. */
  rough: number;
  /** The water's murk, 0 to 1. */
  murk: number;
  /** How much the grains move, 0 to 1. */
  churn: number;
  /** Air coming through, 0 to 1. */
  bubbles: number;
  /** Seconds since the backwash began (for its first air), or −1. */
  washing: number;
}

/** The bed's surface at rest (across the window's middle, as it is fitted), and lifted in a backwash. */
export const BED_REST = 0.5;
export const BED_LIFTED = 0.66;

export const newGlass = (): GlassState => ({
  bed: BED_REST,
  crust: 0,
  crustDark: 0,
  rough: 0,
  murk: 0,
  churn: 0,
  bubbles: 0,
  washing: -1,
});

/** Move `from` toward `to` with time constant `tau`, s. */
const ease = (from: number, to: number, tau: number, dt: number) =>
  to + (from - to) * Math.exp(-dt / tau);

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** What the picture is heading for, in a state. */
export function glassTarget(i: GlassInputs) {
  // Plain to see (the owner, 2026-10-26: clean and dirty beds looked the
  // same): a full load (1) a thick dark crust, two a near-black one.
  const dirt = clamp(i.dirt / 1.2);
  const lifted = i.mode === 'backwash';
  return {
    bed: lifted ? BED_LIFTED : BED_REST,
    // Lifted, the crust breaks up into the churning bed.
    crust: lifted ? 0 : 0.02 + 0.16 * dirt,
    crustDark: lifted ? 0 : clamp(1.15 * dirt),
    rough: lifted ? 0.15 : clamp(i.channelling),
    murk: clamp(i.murk),
    churn: lifted ? 1 : i.mode === 'rinse' ? 0.25 : 0,
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
  };
}

/**
 * The bed's surface across the window, from its left (0) to its right
 * (1): its height there, as a share of the window, with the unevenness of
 * channelling (valleys, and a ridge at the wall) and the ripple of churning.
 */
export function surfaceAt(s: GlassState, x: number, time: number) {
  const valleys =
    s.rough *
    0.06 *
    (Math.sin(x * 9.4 + 1.3) * 0.6 + Math.sin(x * 23 + 0.4) * 0.4);
  const ridge = s.rough * 0.05 * Math.exp(-((x - 0.92) ** 2) / 0.004);
  const ripple = s.churn * 0.02 * Math.sin(x * 14 + time * 3.1);
  return s.bed + valleys + ridge + ripple;
}
