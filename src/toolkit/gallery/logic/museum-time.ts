import { SPEEDS } from '../../../game/plant/ideal-pool-plant';
import type { TimeSpeed } from '../../../game/plant/ideal-pool-plant';

export { SPEEDS };
export type { TimeSpeed };

/**
 * One clock for every hall of the museum (107-0, rule 2; the owner,
 * 2026-10-28): a hall's simulated time starts at now, the visitor's real
 * local time, runs at ×1, ×60, ×600 or ×3600 (dev51's `TimeSpeed`, shared),
 * and is set back to now by RESET and on every entry. Its model is stepped
 * in slices no longer than half a second of plant time, as dev51's is.
 * Each hall chooses how it shows the time; this only keeps it. Pure.
 */

/** The longest slice of plant time a model is stepped by, seconds. */
export const MAX_SLICE = 0.5;

/** The visitor's local time, seconds after their midnight, from a date. */
export const secondsOfDay = (d: Date) =>
  d.getHours() * 3600 +
  d.getMinutes() * 60 +
  d.getSeconds() +
  d.getMilliseconds() / 1000;

/** The visitor's local time now, seconds after their midnight. */
export const localNow = () => secondsOfDay(new Date());

export interface HallClock {
  /** The time of day it started at, seconds after midnight. */
  start: number;
  /** Plant seconds since it started. */
  seconds: number;
  speed: TimeSpeed;
}

/** A clock started at `now` (seconds after midnight), at ×1. */
export const newHallClock = (now: number): HallClock => ({
  start: now,
  seconds: 0,
  speed: 1,
});

/** The clock at another speed. */
export const setSpeed = (c: HallClock, speed: TimeSpeed): HallClock => ({
  ...c,
  speed,
});

/** Its time of day, seconds after midnight. */
export const timeOfDay = (c: HallClock) => (c.start + c.seconds) % 86400;

/** Its time of day as a display shows it: HH:MM:SS. */
export function hallClockText(c: HallClock) {
  const t = Math.floor(timeOfDay(c));
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(Math.floor(t / 3600))}:${two(Math.floor(t / 60) % 60)}:${two(t % 60)}`;
}

/**
 * The slices of plant time `real` seconds make at the clock's speed, each
 * no longer than `MAX_SLICE`: the model is stepped by each in turn.
 */
export function slices(c: HallClock, real: number): number[] {
  if (!(real > 0)) return [];
  let left = real * c.speed;
  const out: number[] = [];
  while (left > 1e-9) {
    const h = Math.min(left, MAX_SLICE);
    out.push(h);
    left -= h;
  }
  return out;
}

/** The clock `plant` seconds of plant time on. */
export const advance = (c: HallClock, plant: number): HallClock => ({
  ...c,
  seconds: c.seconds + Math.max(0, plant),
});

/**
 * A hall's exhibit model, as the museum drives it: built in its reset
 * state at a time of day, and stepped by a slice of plant time.
 */
export interface HallModel<S> {
  reset(now: number): S;
  step(state: S, plantSeconds: number): S;
}

/**
 * A hall's session (rule 1): its state from the moment the visitor steps
 * in, the clock at `now`. Walking in, and pressing RESET, both start one.
 */
export function hallSession<S>(model: HallModel<S>, now: number) {
  return { clock: newHallClock(now), state: model.reset(now) };
}

/** Run a session `real` seconds on: the clock and the model together. */
export function runSession<S>(
  model: HallModel<S>,
  session: { clock: HallClock; state: S },
  real: number,
) {
  let { state, clock } = session;
  for (const h of slices(clock, real)) {
    state = model.step(state, h);
    clock = advance(clock, h);
  }
  return { clock, state };
}
