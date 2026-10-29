import type { Point } from './mimic';

/**
 * A mimic line's LED chaser (prompt 066): small LEDs set along a printed
 * line, one lit in every four, the pattern stepping along the line in the
 * way its flow runs, and dark where nothing flows. Its pace is real time,
 * not the simulation's, so it reads the same at any game speed. Pure.
 */

/** Which way a line's flow runs: along its points, against them, or not at all. */
export type FlowState = 'forward' | 'back' | 'still';

/** The LEDs' pitch along a line, and their size across, metres. */
export const CHASER_PITCH = 0.025;
export const CHASER_SIZE = 0.006;
/** One LED lit in every so many. */
export const CHASER_GROUP = 4;
/** Real seconds between the pattern's steps. */
export const CHASER_STEP = 0.12;
/** Flows under this, m³/h, show as still. */
export const CHASER_THRESHOLD = 1;

/** A signed flow, m³/h, as a chaser shows it: positive runs along the line. */
export const flowState = (flow: number): FlowState =>
  Math.abs(flow) < CHASER_THRESHOLD ? 'still' : flow > 0 ? 'forward' : 'back';

/** The LEDs' centres along a line's points, at the chaser's pitch (or `pitch`), from its start. */
export function chaserPositions(
  points: readonly Point[],
  pitch = CHASER_PITCH,
): Point[] {
  const out: Point[] = [];
  let carry = pitch / 2;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const length = Math.hypot(bx - ax, by - ay);
    let d = carry;
    for (; d <= length; d += pitch) {
      const t = d / length;
      out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
    carry = d - length;
  }
  return out;
}

/** The pattern's step at `seconds` of real time. */
export const chaserPhase = (seconds: number): number =>
  Math.floor(seconds / CHASER_STEP);

/** Whether the line's `index`th LED is lit at `phase`, for its flow. */
export function chaserLit(
  index: number,
  phase: number,
  state: FlowState,
): boolean {
  if (state === 'still') return false;
  const shift = state === 'forward' ? phase : -phase;
  const m = (((index - shift) % CHASER_GROUP) + CHASER_GROUP) % CHASER_GROUP;
  return m === 0;
}
