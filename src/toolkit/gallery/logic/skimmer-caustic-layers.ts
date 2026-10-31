/**
 * The skimmer's caustics in two layers during its film (the owner,
 * 2026-10-31): an outer ring of shafts rising from the skimmer's rim, at
 * the deck, and an inner ring rising from the rim of the basket inside it,
 * smaller, lower, paler and a little out of step, so the two read as
 * separate layers. Both rise and fade with the film's `rise` and `glow`
 * (`skimmer-cinematic.ts`). Pure: the layers' shapes, and each layer's
 * state at a moment of the film. Metres from the skimmer's middle, the
 * deck at y 0.
 */

export interface CausticLayer {
  name: string;
  /** The ring's radius, and the height its shafts stand on. */
  radius: number;
  base: number;
  /** How many shafts, the tallest and shortest, the widest base. */
  count: number;
  tallest: number;
  shortest: number;
  width: number;
  colour: string;
  /** Its brightness against the film's glow (0–1). */
  brightness: number;
  /** Seconds its shimmer runs ahead of the other's, so the two never pulse together. */
  lead: number;
}

/** The well's opening (`skimmer-well.ts`'s default), its basket within it, and the basket's rim below the deck. */
export const SKIMMER_OPENING = 0.13;
export const BASKET_RADIUS = SKIMMER_OPENING * 0.9;
export const BASKET_RIM_Y = -0.17;

export const OUTER_CAUSTICS: CausticLayer = {
  name: 'outer',
  radius: 0.135,
  base: 0,
  count: 28,
  tallest: 1.5,
  shortest: 0.55,
  width: 0.07,
  colour: '#ffc44a',
  brightness: 1,
  lead: 0,
};

export const INNER_CAUSTICS: CausticLayer = {
  name: 'inner',
  radius: BASKET_RADIUS * 0.97,
  base: BASKET_RIM_Y,
  count: 18,
  tallest: 1.15,
  shortest: 0.45,
  width: 0.05,
  colour: '#fff0a8',
  brightness: 0.8,
  lead: 0.73,
};

export const CAUSTIC_LAYERS: readonly CausticLayer[] = [
  OUTER_CAUSTICS,
  INNER_CAUSTICS,
];

/** A layer's shimmer time, how far risen and how bright, at film time `t`. */
export function causticLayerFrame(
  layer: CausticLayer,
  t: number,
  rise: number,
  glow: number,
) {
  return {
    time: t + layer.lead,
    rise,
    glow: glow * layer.brightness,
  };
}
