import type { LoungeFlows } from './lounge-valves';
import {
  LOUNGE_SIZE,
  bedPasses,
  filterSizing,
  stepFilterBed,
} from './ideal-filter';
import type { IdealFilterState } from './ideal-filter';

/**
 * The lounge's two filter beds, each the ideal filter (`ideal-filter.ts`,
 * the owner, 2026-10-25): a Ø1.2 m bed. In service each takes the dirt
 * the pool's water brings it (its suspended solids, `solids.ts`), keeping
 * what its bed catches; a backwash up through it lifts it and washes the
 * dirt out; back in service it settles, a just-lifted bed letting fines
 * past until it does; loaded and left unwashed it fissures and channels.
 * Its dirt adds to its resistance, so a loaded filter's pressure
 * difference rises, and a backwash brings it down. Pure; dirt kg, flows
 * m³/h, times s.
 */

export const LOUNGE_FILTER = {
  spec: LOUNGE_SIZE,
  /** A clean bed's pressure difference at its 45 m³/h design flow, bar. */
  cleanDp: 0.34,
} as const;

/** Its dirt reference: the dirt that doubles its resistance, kg. */
export const LOUNGE_DIRT_REF = filterSizing(LOUNGE_SIZE).dirtRef;

export interface LoungeFiltersState {
  dirt: [number, number];
  fissuring: [number, number];
  unsettled: [number, number];
}

/** One bed of the pair, as the ideal filter has it. */
export const loungeBed = (
  s: LoungeFiltersState,
  i: 0 | 1,
): IdealFilterState => ({
  dirt: s.dirt[i],
  fissuring: s.fissuring[i],
  unsettled: s.unsettled[i],
});

/**
 * A new game's beds: lightly loaded, settled and sound, 0.54 bar at design
 * flow, under the 0.7 bar alarm (`FILTER_DP_LIMIT`), which they reach in
 * the first day's service: a backwash falls due as maintenance.
 */
export const newLoungeFilters = (): LoungeFiltersState => ({
  dirt: [0.6 * LOUNGE_DIRT_REF, 0.6 * LOUNGE_DIRT_REF],
  fissuring: [0, 0],
  unsettled: [0, 0],
});

/**
 * The beds `dt` seconds on, by what flows through each (down in service,
 * up in a backwash) and the dirt in the pool's water, g/m³.
 */
export function stepLoungeFilters(
  s: LoungeFiltersState,
  flows: LoungeFlows,
  dt: number,
  dirt = 1,
): LoungeFiltersState {
  if (!(dt > 0)) return s;
  const beds = ([0, 1] as const).map((i) =>
    stepFilterBed(LOUNGE_SIZE, loungeBed(s, i), flows.filters[i], dirt, dt),
  );
  return {
    dirt: [beds[0].dirt, beds[1].dirt],
    fissuring: [beds[0].fissuring, beds[1].fissuring],
    unsettled: [beds[0].unsettled, beds[1].unsettled],
  };
}

/** What the pair gives back to the pool, g/m³, from water carrying `dirt`: each bed's, mixed. */
export const loungePasses = (s: LoungeFiltersState, dirt: number) =>
  (bedPasses(LOUNGE_SIZE, loungeBed(s, 0), dirt) +
    bedPasses(LOUNGE_SIZE, loungeBed(s, 1), dirt)) /
  2;

/** Each bed's pressure difference in service, bar: its flow's square, and its dirt. */
export const loungeFilterDp = (s: LoungeFiltersState, flows: LoungeFlows) =>
  s.dirt.map((d, i) => {
    const q = Math.max(0, flows.filters[i]) / 45;
    return LOUNGE_FILTER.cleanDp * q * q * (1 + d / LOUNGE_DIRT_REF);
  });
