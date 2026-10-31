import { bedSizing, filterActivity } from './ideal-filter';
import type {
  FilterActivity,
  FilterPorts,
  IdealFilterSpec,
  IdealFilterState,
} from './ideal-filter';

/**
 * What a sand filter is doing, and how it seems, for its description (the
 * owner, 2026-10-28: "the tank is filtering, and seems clean"): read from
 * its bed as the world has it (`ideal-filter.ts`). Pure.
 *
 * - Backwashing while water runs up through its bed; rinsing while it runs
 *   down through it to waste, a rinse (its valves set so, as an operator
 *   sees them); filtering while it runs down through it back to the pool,
 *   even a bed still unsettled from its wash (the owner, 2026-10-28: put
 *   straight back into service without a rinse, it is not rinsing);
 *   standing while nothing runs.
 * - Its dirt against its bed's reference (the dirt that doubles its
 *   resistance): clean below the reference, dirty below twice it, very
 *   dirty beyond; its sand pitted once it has fissured (channelled) enough
 *   to show in its sight glass.
 */

export type { FilterActivity };
export type FilterDirt = 'clean' | 'dirty' | 'very-dirty';

export interface FilterCondition {
  activity: FilterActivity;
  dirt: FilterDirt;
  pitted: boolean;
}

/** Fissuring from which its sand shows pitted. */
const PITTED = 0.2;

export function filterCondition(bed: {
  /** The flows at its ports, as its plumbing gives them (`FilterPorts`). */
  ports: FilterPorts;
  /** Its dirt as a share of its reference. */
  dirt: number;
  fissuring: number;
  unsettled: number;
}): FilterCondition {
  const activity = filterActivity(bed.ports);
  const dirt: FilterDirt =
    bed.dirt < 1 ? 'clean' : bed.dirt < 2 ? 'dirty' : 'very-dirty';
  return { activity, dirt, pitted: bed.fissuring >= PITTED };
}

/** Any filter's condition, from the one model: its size, its bed, the flows at its ports. */
export const filterConditionOf = (
  spec: IdealFilterSpec,
  bed: IdealFilterState,
  ports: FilterPorts,
): FilterCondition =>
  filterCondition({
    ports,
    dirt: bed.dirt / bedSizing(spec, bed).dirtRef,
    fissuring: bed.fissuring,
    unsettled: bed.unsettled,
  });

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
