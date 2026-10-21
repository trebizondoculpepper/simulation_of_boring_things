/**
 * A pool-side shower with a self-closing push button (after Delabie's
 * TEMPOSTOP panels): a press opens the valve for a set run and it closes
 * itself, so no shower is left running; a press while it runs starts the
 * run again. The water is premixed to a safe temperature by a
 * thermostatic mixing valve behind the panel. Pure.
 */

export const SHOWER = {
  /** The timed run, seconds. */
  run: 30,
  /** The flow while it runs, litres a minute (a water-saving head). */
  flow: 9,
  /** The mixed water, °C. */
  mixed: 38,
} as const;

export interface ShowerState {
  /** Seconds of the run left: 0 is off. */
  left: number;
  /** Litres used since it was fitted. */
  used: number;
}

export const initialShower = (): ShowerState => ({ left: 0, used: 0 });

export const pressShower = (s: ShowerState): ShowerState => ({
  ...s,
  left: SHOWER.run,
});

export const running = (s: ShowerState) => s.left > 0;

export function stepShower(s: ShowerState, dt: number): ShowerState {
  const on = Math.min(dt, s.left);
  return {
    left: Math.max(0, s.left - dt),
    used: s.used + (on * SHOWER.flow) / 60,
  };
}
