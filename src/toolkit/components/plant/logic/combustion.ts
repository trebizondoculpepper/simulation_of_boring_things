import type { BoilerState } from './boiler-house';

/**
 * The boiler house's combustion and ventilation, as logic: what its
 * Penfold panel shows and interlocks. Pure.
 *
 * - **Flue temperatures.** A condensing boiler's flue gas leaves a few
 *   degrees above its return water, more at high fire, and more again as
 *   its heat exchanger fouls: a flue running hot is a boiler wasting gas,
 *   and wants cleaning. Idle, the flue cools to the room.
 * - **Ventilation.** The boiler house's combustion air fan, on HAND · OFF
 *   · AUTO, is proven by its air pressure switch a few seconds after it
 *   starts. The boilers are permitted to fire only while it is proven and
 *   no carbon monoxide alarm is in.
 * - **Carbon monoxide.** Boilers firing without their combustion air
 *   spill: CO builds in the room. At the alarm level the panel latches
 *   its CO alarm and inhibits the boilers until the air is clear and
 *   someone presses RESET.
 */

export const HAND = 0,
  OFF = 1,
  AUTO = 2;

/** Seconds the air pressure switch takes to prove the fan. */
export const PROVE_SECONDS = 5;
/** Above this a flue is running hot, °C. */
export const FLUE_HIGH = 85;
/** Carbon monoxide levels, ppm: the alarm, and clear enough to reset. */
export const CO_ALARM = 100;
export const CO_CLEAR = 30;
/** The boiler house's still air, °C. */
const ROOM = 24;

export interface Ventilation {
  /** The fan's HAND · OFF · AUTO selector. */
  hoa: number;
  /** Seconds it has run since it last started. */
  running: number;
}

export interface CombustionState {
  /** Each boiler's flue gas temperature, and the common header's, °C. */
  flues: number[];
  header: number;
  vent: Ventilation;
  /** Carbon monoxide in the room, ppm. */
  co: number;
  /** The CO alarm, latched until reset. */
  coAlarm: boolean;
}

export function newCombustion(boilers = 2): CombustionState {
  return {
    flues: Array.from({ length: boilers }, () => ROOM),
    header: ROOM,
    vent: { hoa: AUTO, running: 30 },
    co: 0,
    coAlarm: false,
  };
}

/** Whether the fan runs: in HAND, or in AUTO. */
export const fanRuns = (vent: Ventilation) => vent.hoa !== OFF;
/** Whether the air pressure switch proves it. */
export const fanProven = (vent: Ventilation) =>
  fanRuns(vent) && vent.running >= PROVE_SECONDS;
/** Whether the boilers may fire. */
export const boilersPermitted = (c: CombustionState) =>
  fanProven(c.vent) && !c.coAlarm;

/** Where a boiler's flue gas is heading, °C. */
export function flueTarget(boiler: BoilerState, fouling = 0) {
  if (boiler.code !== 3) return ROOM;
  return boiler.return + 6 + boiler.rate * 10 + fouling * 45;
}

/** The state `delta` seconds on. `fouling` is each boiler's, 0 to 1. */
export function stepCombustion(
  c: CombustionState,
  boilers: readonly BoilerState[],
  fouling: readonly number[],
  delta: number,
): CombustionState {
  const k = Math.min(1, delta * 0.15);
  const flues = c.flues.map(
    (t, i) => t + (flueTarget(boilers[i], fouling[i] ?? 0) - t) * k,
  );
  // The header carries the firing boilers' gas, a little cooled.
  const lit = boilers.flatMap((b, i) => (b.code === 3 ? [flues[i]] : []));
  const into = lit.length
    ? lit.reduce((n, t) => n + t, 0) / lit.length - 3
    : ROOM;
  const header = c.header + (into - c.header) * k;
  const vent = {
    ...c.vent,
    running: fanRuns(c.vent) ? c.vent.running + delta : 0,
  };
  // Spillage while firing without air; cleared by the fan when it runs.
  const spilling = lit.length > 0 && !fanProven(vent);
  const co = Math.max(
    0,
    c.co +
      (spilling ? 12 * lit.length * delta : 0) -
      (fanRuns(vent) ? c.co * 0.08 * delta : c.co * 0.005 * delta),
  );
  return {
    flues,
    header,
    vent,
    co,
    coAlarm: c.coAlarm || co >= CO_ALARM,
  };
}

/** Turn the fan's selector. */
export const setFan = (c: CombustionState, hoa: number): CombustionState =>
  c.vent.hoa === hoa ? c : { ...c, vent: { ...c.vent, hoa } };

/** RESET: the CO alarm clears once the air is clear. */
export const resetCombustion = (c: CombustionState): CombustionState =>
  c.coAlarm && c.co < CO_CLEAR ? { ...c, coAlarm: false } : c;
