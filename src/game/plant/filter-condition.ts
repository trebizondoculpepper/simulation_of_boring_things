/**
 * What a sand filter is doing, and how it seems, for its description (the
 * owner, 2026-10-28: "the tank is filtering, and seems clean"): read from
 * its bed as the world has it (`ideal-filter.ts`). Pure.
 *
 * - Backwashing while water runs up through its bed; rinsing while it runs
 *   down through a bed still unsettled from its wash; filtering while it
 *   runs down through a settled bed; standing while nothing runs.
 * - Its dirt against its bed's reference (the dirt that doubles its
 *   resistance): clean below the reference, dirty below twice it, very
 *   dirty beyond; its sand pitted once it has fissured (channelled) enough
 *   to show in its sight glass.
 */

export type FilterActivity =
  | 'backwashing'
  | 'rinsing'
  | 'filtering'
  | 'standing';
export type FilterDirt = 'clean' | 'dirty' | 'very-dirty';

export interface FilterCondition {
  activity: FilterActivity;
  dirt: FilterDirt;
  pitted: boolean;
}

/** Under this flow either way, m³/h, a bed is standing. */
const STILL = 0.5;
/** A bed this unsettled or more is still rinsing after its wash. */
const UNSETTLED = 0.05;
/** Fissuring from which its sand shows pitted. */
const PITTED = 0.2;

export function filterCondition(bed: {
  /** Down through it (+, service) or up (−, backwash), m³/h. */
  flow: number;
  /** Its dirt as a share of its reference. */
  dirt: number;
  fissuring: number;
  unsettled: number;
}): FilterCondition {
  const activity: FilterActivity =
    bed.flow < -STILL
      ? 'backwashing'
      : bed.flow > STILL
        ? bed.unsettled > UNSETTLED
          ? 'rinsing'
          : 'filtering'
        : 'standing';
  const dirt: FilterDirt =
    bed.dirt < 1 ? 'clean' : bed.dirt < 2 ? 'dirty' : 'very-dirty';
  return { activity, dirt, pitted: bed.fissuring >= PITTED };
}

/** How it seems, as its sight glass would tell an operator: "seems clean". */
function seems(c: FilterCondition): string {
  const dirt = {
    clean: 'seems clean',
    dirty: 'seems dirty',
    'very-dirty': 'seems very dirty',
  }[c.dirt];
  return c.pitted ? `${dirt} and the sand is pitted` : dirt;
}

/**
 * Its state in a sentence's words: "backwashing", "rinsing", "filtering,
 * and seems clean", "filtering, but seems dirty", "filtering, but seems
 * very dirty and the sand is pitted", "standing, and seems clean".
 */
export function filterConditionWords(c: FilterCondition): string {
  if (c.activity === 'backwashing' || c.activity === 'rinsing')
    return c.activity;
  const fine = c.dirt === 'clean' && !c.pitted;
  return `${c.activity}, ${fine ? 'and' : 'but'} ${seems(c)}`;
}
