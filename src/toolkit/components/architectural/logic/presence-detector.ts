/**
 * A high-bay presence detector, after CP Electronics' EBDHS-PRM: a PIR
 * under the roof that sees movement within a circle on the floor below it
 * and holds its lighting zone on for a time-out after it last saw any
 * (`doc/research/warehouse-lighting-control.md`). Its footprint is 40 m
 * across from 15 m up, so its radius on the floor is about 1.33 times its
 * height (an estimate from the datasheet's drawing; a real pattern is not
 * an exact cone). Pure logic, metres.
 */

/** The detector's radius on the floor, per metre of its height. */
export const DETECTOR_REACH = 20 / 15;
/** Its time-out as installed in a warehouse, seconds. */
export const DETECTOR_TIMEOUT = 15 * 60;

export interface PresenceDetector {
  x: number;
  z: number;
  /** Its height over the floor. */
  height: number;
}

/** Whether a detector sees someone standing at (x, z). */
export function detects(detector: PresenceDetector, x: number, z: number) {
  return (
    Math.hypot(x - detector.x, z - detector.z) <=
    detector.height * DETECTOR_REACH
  );
}
