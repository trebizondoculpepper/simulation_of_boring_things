/**
 * A sand filter with a top-mount multiport valve (scenario 3, the simple
 * setup, `doc/prompts/026-scenario-filter-backwash.md`): one lever over a
 * dial chooses where the water goes.
 *
 * - FILTER: from the pump, down through the bed, back to the pool (RETURN).
 * - BACKWASH: from the pump, up through the bed, to WASTE: the bed lifts
 *   and its dirt washes out, the waste water murky at first, then clear.
 * - RINSE: down through the bed to WASTE, settling it before service.
 * - CLOSED: nothing passes.
 *
 * The bed holds the dirt it takes from the water, and the more it holds
 * the more it resists: its pressure drop rises, the flow falls, and the
 * gauge on the valve climbs. Moving the lever while water flows is the
 * classic mistake (it tears the valve's gasket): the model counts it.
 * Pure; heads in metres of water, flows in m³/h, dirt in grams.
 */

export type MultiportPosition = 'filter' | 'backwash' | 'rinse' | 'closed';
export const POSITIONS: readonly MultiportPosition[] = [
  'filter',
  'backwash',
  'rinse',
  'closed',
];
export const POSITION_LABEL: Record<MultiportPosition, string> = {
  filter: 'FILTER',
  backwash: 'BACKWASH',
  rinse: 'RINSE',
  closed: 'CLOSED',
};

/** Working figures, a 600 mm filter on a small pool's pump. */
export const FILTER_SPEC = {
  /** The supply's head (the pump's discharge, 2 bar), m. */
  supplyHead: 20.4,
  /** Head loss coefficients, m per (m³/h)²: pipework in, out, and the clean bed. */
  inlet: 0.018,
  outlet: 0.027,
  bed: 0.0064,
  /** The dirt that doubles the bed's resistance, g. */
  dirtRef: 500,
  /** Dirt in the pool's water, g/m³, taken out as it filters (a dirty pool, to see it in minutes). */
  waterDirt: 20,
  /** How quickly a backwash at full flow washes the dirt out: its time constant, s. */
  washTime: 45,
} as const;

/** Metres of water to bar. */
export const BAR = 1 / 10.2;

export interface FilterState {
  position: MultiportPosition;
  /** Dirt held in the bed, g. */
  dirt: number;
  /** Times the lever was moved while water flowed. */
  movedUnderFlow: number;
}

export interface FilterFlows {
  /** Through the filter, m³/h, and where it went. */
  flow: number;
  toReturn: number;
  toWaste: number;
  /** The bed's pressure drop, bar, and the valve's gauge (its inlet pressure), bar. */
  bedBar: number;
  gaugeBar: number;
  /** Dirt in the waste water, g/m³ (how murky it runs). */
  wasteDirt: number;
}

/** The bed's resistance with `dirt` in it; lifted in a backwash, its dirt adds little. */
const bedR = (dirt: number, position: MultiportPosition) =>
  FILTER_SPEC.bed *
  (1 + (position === 'backwash' ? 0.2 : 1) * (dirt / FILTER_SPEC.dirtRef));

/** The flows with the supply `on`, for the bed and valve as they are. */
export function filterFlows(s: FilterState, on: boolean): FilterFlows {
  const closed = !on || s.position === 'closed';
  const R = FILTER_SPEC.inlet + bedR(s.dirt, s.position) + FILTER_SPEC.outlet;
  // h = R Q², so Q = √(h / R).
  const flow = closed ? 0 : Math.sqrt(FILTER_SPEC.supplyHead / R);
  const bedHead = bedR(s.dirt, s.position) * flow * flow;
  const gaugeHead = on
    ? FILTER_SPEC.supplyHead - FILTER_SPEC.inlet * flow * flow
    : 0;
  const toWaste =
    s.position === 'backwash' || s.position === 'rinse' ? flow : 0;
  const washing = s.position === 'backwash' && flow > 0;
  return {
    flow,
    toReturn: s.position === 'filter' ? flow : 0,
    toWaste,
    bedBar: bedHead * BAR,
    gaugeBar: gaugeHead * BAR,
    wasteDirt: washing
      ? (s.dirt / FILTER_SPEC.washTime) * (3600 / flow)
      : s.position === 'rinse' && flow > 0
        ? FILTER_SPEC.waterDirt
        : 0,
  };
}

/** Move the lever to `position`; under flow it is counted as a mistake. */
export function moveLever(
  s: FilterState,
  position: MultiportPosition,
  on: boolean,
): FilterState {
  if (position === s.position) return s;
  const flowing = filterFlows(s, on).flow > 0;
  return {
    ...s,
    position,
    movedUnderFlow: s.movedUnderFlow + (flowing ? 1 : 0),
  };
}

/** One step: filtering takes dirt into the bed; backwashing washes it out. */
export function stepFilter(
  s: FilterState,
  on: boolean,
  dt: number,
): FilterState {
  const f = filterFlows(s, on);
  if (f.flow <= 0) return s;
  let dirt = s.dirt;
  if (s.position === 'filter')
    dirt += (FILTER_SPEC.waterDirt * f.flow * dt) / 3600;
  if (s.position === 'backwash') {
    // At full backwash flow its time constant; less flow, slower.
    const rate =
      f.flow /
      Math.sqrt(
        FILTER_SPEC.supplyHead /
          (FILTER_SPEC.inlet + FILTER_SPEC.bed + FILTER_SPEC.outlet),
      );
    dirt *= Math.exp(-(rate * dt) / FILTER_SPEC.washTime);
  }
  return { ...s, dirt };
}
