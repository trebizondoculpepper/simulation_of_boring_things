/**
 * The jacuzzi's jets and air, in the world: worked from its plant room's
 * cabinet (an illuminated button for each, pressed to start and to stop)
 * and from the plate on the wall by the tub (START runs both for ten
 * minutes, STOP stops both at once), and shown alike on both and in the
 * tub. Each runs only while the jacuzzi circulates. Pure.
 */

/** How long the wall plate's START runs the jets and the air, seconds. */
export const JACUZZI_CYCLE = 600;

export interface JacuzziState {
  /** Called for: the jets' pump, the air blower. */
  jets: boolean;
  air: boolean;
  /** When the wall plate's cycle ends, world seconds; -1 for none. */
  until: number;
}

export const newJacuzzi = (): JacuzziState => ({
  jets: false,
  air: false,
  until: -1,
});

export type JacuzziAction =
  /** A cabinet button pressed: that one started, or stopped. */
  | { act: 'toggle'; what: 'jets' | 'air' }
  /** The wall plate's START: both for a cycle. */
  | { act: 'start' }
  /** The wall plate's STOP: both stopped. */
  | { act: 'stop' };

export function actOnJacuzzi(
  j: JacuzziState,
  a: JacuzziAction,
  time: number,
): JacuzziState {
  if (a.act === 'start')
    return { jets: true, air: true, until: time + JACUZZI_CYCLE };
  if (a.act === 'stop') return newJacuzzi();
  const next = { ...j, [a.what]: !j[a.what] };
  // Both stopped by hand: no cycle left to run out.
  return next.jets || next.air ? next : newJacuzzi();
}

/** `dt` seconds on, at world time `time`: the wall plate's cycle runs out. */
export const stepJacuzzi = (j: JacuzziState, time: number): JacuzziState =>
  j.until >= 0 && time >= j.until ? newJacuzzi() : j;

/** What runs: each called for, while the jacuzzi circulates. */
export const jacuzziRunning = (j: JacuzziState, circulating: boolean) => ({
  jets: circulating && j.jets,
  air: circulating && j.air,
});
