import { solveNetwork } from '../sim/hydraulics';
import type { NetLink, NetNode } from '../sim/hydraulics';

/**
 * A large pressure sand filter on a five-valve battery (scenario 3, the
 * commercial setup; `doc/prompts/026-scenario-filter-backwash.md`), after
 * the Olympic pool's 3 m filters. Its face pipework:
 *
 * - V1, inlet: supply to the top distributor;
 * - V2, outlet: the underdrain to the return;
 * - V3, backwash in: supply to the underdrain;
 * - V4, backwash out: the top to waste;
 * - V5, rinse: the underdrain to waste.
 *
 * A Penfold controller switches all five together (a five-gang), by mode:
 * SERVICE (V1, V2), BACKWASH (V3, V4), RINSE (V1, V5), OFF (none). On a
 * change of mode it shuts the supply first, drives the valves (their
 * actuators take `TRAVEL` seconds end to end), and opens the supply again
 * only when every valve is where it should be: no valve moves under flow.
 *
 * The water side is a small network (`solveNetwork`): the supply, the
 * top and bottom of the bed, the return and waste. The bed between top
 * and bottom passes either way: down in service and rinse, up in a
 * backwash. Its dirt adds to its resistance (less so lifted in a
 * backwash), and a backwash washes it out. Pure; heads in metres, flows
 * in m³/h.
 */

export type FilterMode = 'off' | 'service' | 'backwash' | 'rinse';
export const MODES: readonly FilterMode[] = [
  'off',
  'service',
  'backwash',
  'rinse',
];
export type ValveName = 'v1' | 'v2' | 'v3' | 'v4' | 'v5';
export const VALVES: readonly ValveName[] = ['v1', 'v2', 'v3', 'v4', 'v5'];

export const VALVE_ROLE: Record<ValveName, string> = {
  v1: 'INLET',
  v2: 'OUTLET',
  v3: 'BACKWASH IN',
  v4: 'BACKWASH OUT',
  v5: 'RINSE',
};

/** Which valves each mode opens. */
export const PATTERN: Record<FilterMode, readonly ValveName[]> = {
  off: [],
  service: ['v1', 'v2'],
  backwash: ['v3', 'v4'],
  rinse: ['v1', 'v5'],
};

/** An actuator's end-to-end travel, s. */
export const TRAVEL = 12;

/** Working figures for a 3 m filter (7 m², about 170 m³/h in service). */
export const BIG_FILTER = {
  /** The pump's discharge, m. */
  supplyHead: 20.4,
  /** The return's and waste's heads, m. */
  returnHead: 0,
  wasteHead: 0,
  /** Resistances, m per (m³/h)²: the supply main, each open valve, the clean bed, the return and waste runs. */
  supply: 1e-4,
  valve: 6e-5,
  bed: 8.3e-5,
  returnRun: 4e-4,
  wasteRun: 4e-4,
  /** The dirt that doubles the bed's resistance, kg; dirt in the water, g/m³ (a dirty pool, to see it in minutes). */
  dirtRef: 5,
  waterDirt: 20,
  /** A backwash's time constant at full flow, s. */
  washTime: 60,
  /** A backwash's full flow, m³/h. */
  washFlow: 170,
} as const;

export interface FiveValveState {
  mode: FilterMode;
  /** Each valve's opening, 0 shut to 1 open. */
  opening: Record<ValveName, number>;
  /** The supply (the pump) running: wanted on, and allowed by the controller. */
  supplyWanted: boolean;
  /** Dirt in the bed, kg. */
  dirt: number;
}

export const newFiveValve = (): FiveValveState => ({
  mode: 'service',
  opening: { v1: 1, v2: 1, v3: 0, v4: 0, v5: 0 },
  supplyWanted: true,
  dirt: 1.6 * BIG_FILTER.dirtRef,
});

/** Where each valve should be in a mode. */
const target = (mode: FilterMode, v: ValveName) =>
  PATTERN[mode].includes(v) ? 1 : 0;

/** Whether every valve has reached its mode's position. */
export const valvesSet = (s: FiveValveState) =>
  VALVES.every((v) => s.opening[v] === target(s.mode, v));

/** Whether the supply is actually on: wanted, in a mode that flows, with the valves set. */
export const supplyOn = (s: FiveValveState) =>
  s.supplyWanted && s.mode !== 'off' && valvesSet(s);

export const setMode = (
  s: FiveValveState,
  mode: FilterMode,
): FiveValveState => ({ ...s, mode });
export const setSupply = (s: FiveValveState, on: boolean): FiveValveState => ({
  ...s,
  supplyWanted: on,
});

export interface FiveValveFlows {
  /** Through each valve, m³/h, in its own direction (V1, V3 from the supply; V2 to the return; V4, V5 to waste). */
  valve: Record<ValveName, number>;
  /** Through the bed, top to bottom (+ down, − up), m³/h. */
  bed: number;
  supply: number;
  /** Heads at the top and bottom of the bed, as the gauges read them, bar; and the difference. */
  topBar: number;
  bottomBar: number;
  bedBar: number;
  /** Dirt in the waste water, g/m³. */
  wasteDirt: number;
}

const BAR = 1 / 10.2;

/** A valve's resistance at an opening (a butterfly's: steeply more as it shuts). */
const valveLink = (
  id: string,
  from: string,
  to: string,
  opening: number,
  extra = 0,
): NetLink =>
  opening < 0.02
    ? { id, kind: 'closed', from, to }
    : {
        id,
        kind: 'resistance',
        from,
        to,
        r: BIG_FILTER.valve / (opening * opening) + extra,
      };

export function fiveValveFlows(s: FiveValveState): FiveValveFlows {
  return faceFlows(s.opening, s.dirt, supplyOn(s));
}

/**
 * The flows through one filter's face from its valves' openings alone, the
 * supply on or off: as a battery has them whose valves are each commanded
 * on their own (the Olympic's, from its panels), with no controller
 * holding the supply off while they move.
 */
export function faceFlows(
  opening: Readonly<Record<ValveName, number>>,
  dirt: number,
  on: boolean,
): FiveValveFlows {
  const s = { opening, dirt };
  // With the supply off nothing drives any water: no flow anywhere (and
  // the solver, given a network with no head across it, is not asked).
  if (!on)
    return {
      valve: { v1: 0, v2: 0, v3: 0, v4: 0, v5: 0 },
      bed: 0,
      supply: 0,
      topBar: 0,
      bottomBar: 0,
      bedBar: 0,
      wasteDirt: 0,
    };
  const lifted = s.opening.v3 > 0.5 && s.opening.v4 > 0.5;
  const bedR =
    BIG_FILTER.bed * (1 + (lifted ? 0.2 : 1) * (s.dirt / BIG_FILTER.dirtRef));
  const nodes: NetNode[] = [
    { id: 'pump', head: BIG_FILTER.supplyHead },
    { id: 'supply' },
    { id: 'top' },
    { id: 'bottom' },
    { id: 'return', head: BIG_FILTER.returnHead },
    { id: 'waste', head: BIG_FILTER.wasteHead },
  ];
  const links: NetLink[] = [
    on
      ? {
          id: 'main',
          kind: 'resistance',
          from: 'pump',
          to: 'supply',
          r: BIG_FILTER.supply,
        }
      : { id: 'main', kind: 'closed', from: 'pump', to: 'supply' },
    valveLink('v1', 'supply', 'top', s.opening.v1),
    valveLink('v3', 'supply', 'bottom', s.opening.v3),
    valveLink('v2', 'bottom', 'return', s.opening.v2, BIG_FILTER.returnRun),
    valveLink('v4', 'top', 'waste', s.opening.v4, BIG_FILTER.wasteRun),
    valveLink('v5', 'bottom', 'waste', s.opening.v5, BIG_FILTER.wasteRun),
    { id: 'bed', kind: 'resistance', from: 'top', to: 'bottom', r: bedR },
  ];
  const sol = solveNetwork(nodes, links);
  // Below a trickle, nothing: a shut path's anchoring leak is not flow.
  const q = (id: string) =>
    Math.abs(sol.flows[id] ?? 0) < 0.05 ? 0 : sol.flows[id];
  const valve = {
    v1: q('v1'),
    v2: q('v2'),
    v3: q('v3'),
    v4: q('v4'),
    v5: q('v5'),
  };
  const toWaste = Math.max(0, valve.v4) + Math.max(0, valve.v5);
  const washing = lifted && valve.v4 > 0;
  return {
    valve,
    bed: q('bed'),
    supply: q('main'),
    topBar: on ? sol.heads.top * BAR : 0,
    bottomBar: on ? sol.heads.bottom * BAR : 0,
    bedBar: on ? Math.abs(sol.heads.top - sol.heads.bottom) * BAR : 0,
    wasteDirt: washing
      ? (s.dirt * 1000) / BIG_FILTER.washTime / (toWaste / 3600)
      : toWaste > 0
        ? BIG_FILTER.waterDirt
        : 0,
  };
}

/**
 * One step: the controller drives each valve toward its mode's position
 * at its actuator's rate (the supply held off until they are all there);
 * the bed takes dirt in service, and a backwash washes it out.
 */
export function stepFiveValve(s: FiveValveState, dt: number): FiveValveState {
  if (!(dt > 0)) return s;
  const opening = { ...s.opening };
  for (const v of VALVES) {
    const want = target(s.mode, v);
    const step = dt / TRAVEL;
    opening[v] =
      want > opening[v]
        ? Math.min(want, opening[v] + step)
        : Math.max(want, opening[v] - step);
  }
  const moved = { ...s, opening };
  const f = fiveValveFlows(moved);
  let dirt = moved.dirt;
  if (f.bed > 0 && s.mode === 'service')
    dirt += (BIG_FILTER.waterDirt * f.bed * dt) / 3600 / 1000;
  if (f.bed < 0)
    dirt *= Math.exp(
      -((-f.bed / BIG_FILTER.washFlow) * dt) / BIG_FILTER.washTime,
    );
  return { ...moved, dirt };
}
