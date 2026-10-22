/**
 * A switched fused connection unit (a fused spur), after the usual UK
 * 13 A plate: a double-pole switch, a cartridge fuse in a carrier, and a
 * red neon lit while its output is live. It feeds one appliance from a
 * ring, fused to suit it (3 A for a display). Pure.
 */

/** Its plate, metres: a single gang, 86 mm square, standing 10 mm off the wall. */
export const FUSED_SPUR = { plate: 0.086, depth: 0.01 } as const;

/** The fuse for a display of a few hundred watts, amperes. */
export const DISPLAY_FUSE = 3;

export interface FusedSpurState {
  /** Switched on. */
  on: boolean;
  /** Its fuse whole. */
  fuse: boolean;
}

/** Whether its output, and so its neon, is live: supplied, switched on, fused. */
export const spurLive = (supplied: boolean, s: FusedSpurState) =>
  supplied && s.on && s.fuse;
