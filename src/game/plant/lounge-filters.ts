import type { LoungeFlows } from './lounge-valves';

/**
 * The lounge's two filter beds (the owner, 2026-10-25: a filter cycle
 * should leave the filters cleaner): each takes the dirt in the water it
 * filters down through it in service, and a backwash up through it washes
 * it out, as the Olympic's battery does (`olympic-battery.ts`), scaled to
 * a Ø1.2 m bed. Dirt adds to the bed's resistance, so a loaded filter's
 * pressure difference rises, and a backwash brings it down. Pure; dirt kg,
 * flows m³/h, times s.
 */

export const LOUNGE_FILTER = {
  /** The dirt that doubles a clean bed's resistance, kg (a Ø1.2 m bed: about a fifth of the Olympic's 7 m²). */
  dirtRef: 1.2,
  /** Dirt in the pool's water, g/m³: as the Olympic's. */
  waterDirt: 1,
  /** A backwash's time constant at full flow, s, and its full flow, m³/h. */
  washTime: 60,
  washFlow: 34,
  /** A clean bed's pressure difference at its 45 m³/h design flow, bar. */
  cleanDp: 0.34,
} as const;

export interface LoungeFiltersState {
  dirt: [number, number];
}

/**
 * A new game's beds: lightly loaded, 0.54 bar at design flow, under the
 * 0.7 bar alarm (`FILTER_DP_LIMIT`), which they reach after about twelve
 * hours' service: a backwash falls due in the first day, as maintenance.
 */
export const newLoungeFilters = (): LoungeFiltersState => ({
  dirt: [0.6 * LOUNGE_FILTER.dirtRef, 0.6 * LOUNGE_FILTER.dirtRef],
});

/** The beds `dt` seconds on, by what flows through each: down in service, up in a backwash. */
export function stepLoungeFilters(
  s: LoungeFiltersState,
  flows: LoungeFlows,
  dt: number,
): LoungeFiltersState {
  if (!(dt > 0)) return s;
  const F = LOUNGE_FILTER;
  const dirt = s.dirt.map((d, i) => {
    const service = Math.max(0, flows.filters[i]);
    const wash = flows.backwash[i];
    if (wash > 0) return d * Math.exp(-((wash / F.washFlow) * dt) / F.washTime);
    return d + (F.waterDirt * service * dt) / 3600 / 1000;
  }) as [number, number];
  return { dirt };
}

/** Each bed's pressure difference in service, bar: its flow's square, and its dirt. */
export const loungeFilterDp = (s: LoungeFiltersState, flows: LoungeFlows) =>
  s.dirt.map((d, i) => {
    const q = Math.max(0, flows.filters[i]) / 45;
    return LOUNGE_FILTER.cleanDp * q * q * (1 + d / LOUNGE_FILTER.dirtRef);
  });
