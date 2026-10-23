import type { GlassInputs } from './sight-glass';

/**
 * What a sand filter's bed shows over time, for its sight glass
 * (`sight-glass.ts`). After the owner (2026-10-23), the bed needs to know
 * no more than this:
 *
 * - how much dirt it holds, which comes of the water's dirt it is
 *   exposed to (its filter's own model counts it), or, where a model
 *   gives only that, its pressure difference;
 * - the time since it was last washed: its surface pits and channels as a
 *   function of that time, none for the first days, then more and more;
 * - which way the water goes through it: down, it filters; up, it lifts
 *   (a backwash, by any name). Water going up through it is a wash, and
 *   starts its clock again.
 *
 * Pure; seconds.
 */

export interface BedLook {
  /** Seconds since the bed was last washed (water up through it). */
  sinceWash: number;
}

const DAY = 86400;
/** Its surface starts to pit after this long unwashed, and is fully channelled by this. */
export const PITS_AFTER = 5 * DAY;
export const CHANNELLED_BY = 14 * DAY;

export const newBedLook = (sinceWash = 0): BedLook => ({ sinceWash });

/** Step the bed's clock: `bedFlow` through it, m³/h, + down, − up (washing it). */
export function stepBedLook(
  look: BedLook,
  bedFlow: number,
  dt: number,
): BedLook {
  if (!(dt > 0)) return look;
  return { sinceWash: bedFlow < -1 ? 0 : look.sinceWash + dt };
}

/** How far its surface has channelled, 0 to 1: a function of the time since it was washed. */
export const channellingOf = (look: BedLook) =>
  Math.min(
    1,
    Math.max(0, (look.sinceWash - PITS_AFTER) / (CHANNELLED_BY - PITS_AFTER)),
  );

/**
 * The sight glass's inputs for a bed: its dirt, its channelling, the way
 * the water goes through it, and the murk of the water over it (its
 * filter's model's, if it has one, or else as much as water coming up
 * through so much dirt carries).
 */
export function bedGlass(
  look: BedLook,
  { bedFlow, dirt, murk }: { bedFlow: number; dirt: number; murk?: number },
): GlassInputs {
  const mode =
    Math.abs(bedFlow) < 1 ? 'stopped' : bedFlow < 0 ? 'backwash' : 'service';
  return {
    mode,
    dirt,
    channelling: channellingOf(look),
    murk: murk ?? (mode === 'backwash' ? Math.min(1, dirt / 1.5) : 0),
  };
}

/** A bed's dirt from its pressure difference: the share by which it exceeds what it drops clean. */
export const dirtFromDp = (dpBar: number, cleanBar: number) =>
  cleanBar > 0 ? Math.max(0, dpBar / cleanBar - 1) : 0;
