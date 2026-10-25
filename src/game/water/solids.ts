/**
 * A pool's suspended solids (prompt 070's world stage, the owner,
 * 2026-10-25): the one value of its water's condition the world carries so
 * far, as a well-mixed body. Its bathers bring dirt in; its circulation
 * takes the water through its filters, which give back what they let
 * pass. The spas' filters are the ideal filter (`spa-filter.ts`), their
 * capture their bed's; the big pools' filter beds, modelled for their
 * pressure and not yet for what they pass, keep `BIG_POOL_CAPTURE`. Pure;
 * g/m³, m³, m³/h, seconds.
 */

/** Solids a bather brings into the water, g an hour (skin, hair, lint, grit). */
export const BATHER_SOLIDS = 3;
/** The big pools' filters' share of the solids they take out. */
export const BIG_POOL_CAPTURE = 0.9;
/** A clean pool's suspended solids, g/m³ (`WATERS.pool`). */
export const CLEAN_SOLIDS = 1;

export interface SolidsInputs {
  /** Bathers in the water. */
  bathers: number;
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
  const brought = i.bathers * BATHER_SOLIDS * hours;
  const kept = i.flow * (solids - i.passes(solids)) * hours;
  return Math.max(0, solids + (brought - kept) / i.volume);
}
