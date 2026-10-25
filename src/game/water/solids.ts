/**
 * A pool's suspended solids (prompt 070's world stage, the owner,
 * 2026-10-25): the one value of its water's condition the world carries so
 * far, as a well-mixed body. Its bathers, and the hall's dust, bring
 * dirt in; its circulation takes the water through its filters, which
 * give back what they let pass: every pool's beds are the ideal filter's
 * (`ideal-filter.ts`), so what they keep is what their beds catch. Pure;
 * g/m³, m³, m³/h, seconds.
 */

/** Solids a bather brings into the water, g an hour (skin, hair, lint, grit). */
export const BATHER_SOLIDS = 3;
/**
 * Solids settling on the water whether or not anyone swims, g per m² of
 * its surface an hour: the hall's airborne dust, and what the deck's
 * traffic and cleaning wash in. A quiet pool's water settles at about
 * 0.6 g/m³ on it, not clear.
 */
export const AREA_SOLIDS = 0.3;
/** A clean pool's suspended solids, g/m³ (`WATERS.pool`). */
export const CLEAN_SOLIDS = 1;

export interface SolidsInputs {
  /** Bathers in the water. */
  bathers: number;
  /** Its water's surface, m². */
  area?: number;
  /** Its water's volume, m³. */
  volume: number;
  /** Through its filters now, m³/h. */
  flow: number;
  /** What its filters give back, g/m³, from what reaches them. */
  passes: (solids: number) => number;
}

/** Its solids `dt` seconds on: what bathers bring, less what its filters keep. */
export function stepSolids(solids: number, i: SolidsInputs, dt: number) {
  if (!(dt > 0) || !(i.volume > 0)) return solids;
  const hours = dt / 3600;
  const brought =
    (i.bathers * BATHER_SOLIDS + (i.area ?? 0) * AREA_SOLIDS) * hours;
  const kept = i.flow * (solids - i.passes(solids)) * hours;
  return Math.max(0, solids + (brought - kept) / i.volume);
}
