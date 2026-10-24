/**
 * A motorised ball valve's travel (the owner, 2026-10-23: the foot spa's
 * valves made electric): a small geared motor turns the ball a quarter
 * turn at a steady speed, towards wherever the panel commands, and stops
 * at its end. Its motor runs only while it travels, so its sound
 * (`gear-motor`) runs up as it sets off, holds while it moves and runs
 * down as it arrives. A limit switch at each end reports it fully open or
 * fully shut; between them, neither. Pure; seconds.
 */

export interface MotorisedValveState {
  /** 0 shut to 1 fully open. */
  position: number;
  /** The panel's command: open. */
  command: boolean;
  /**
   * Whether its actuator has power: without it, its spring drives it shut
   * whatever it is commanded (spring-return, as every actuated valve is,
   * the owner, 2026-10-24). Powered unless said otherwise.
   */
  power?: boolean;
}

/** Where it is going: open if powered and commanded open, otherwise shut. */
export const motorGoal = (s: MotorisedValveState) =>
  (s.power ?? true) && s.command ? 1 : 0;

/**
 * A full stroke, seconds. Belimo's own small actuators take 35 to 90 s;
 * ours are quicker, so a player can watch one through.
 */
export const MOTOR_STROKE = 6;

export function newMotorisedValve(open = true): MotorisedValveState {
  return { position: open ? 1 : 0, command: open };
}

/** It travels at a steady speed towards its command, and stops there. */
export function stepMotorisedValve(
  s: MotorisedValveState,
  dt: number,
  stroke = MOTOR_STROKE,
): MotorisedValveState {
  if (!(dt > 0)) return s;
  const goal = motorGoal(s);
  const step = dt / stroke;
  const position =
    goal > s.position
      ? Math.min(goal, s.position + step)
      : Math.max(goal, s.position - step);
  return position === s.position ? s : { ...s, position };
}

/** Whether it is moving: driven by its motor, or sprung shut, somewhere it has not reached. */
export const motorRunning = (s: MotorisedValveState) =>
  s.position !== motorGoal(s);

/** What its limit switches say. */
export const motorLimits = (s: MotorisedValveState) => ({
  open: s.position >= 1,
  shut: s.position <= 0,
});

/** The gear motor's whine, Hz, as recorded (`gear-motor` in `machine-tones.ts`). */
export const MOTOR_HZ = 271;

/**
 * No two motors quite alike (the owner, 2026-10-23): each valve's motor
 * off the recorded whine by up to 10 Hz either way (2026-10-24), so
 * several running together are each heard apart. Fixed by its place in
 * its room, so one valve always sounds the same, and no two of the first
 * dozen share a pitch; Hz.
 */
const DETUNE = [1.5, -4, 6.5, -7.5, 4, -1.5, 9, -6, 5, -9, 10, -10];

export const motorDetune = (index: number) =>
  DETUNE[((index % DETUNE.length) + DETUNE.length) % DETUNE.length];

/** The rate its motor's tone is played at, for its detuning. */
export const motorRate = (index: number) => 1 + motorDetune(index) / MOTOR_HZ;

/**
 * Nor quite as quick (the owner, 2026-10-23): each valve's full stroke a
 * little longer or shorter than `MOTOR_STROKE`, within 10 %, by its place
 * in its room, as worn gearboxes and stiff balls make them; seconds.
 */
const STROKE_SPREAD = [
  0.04, -0.07, 0.09, -0.03, 0.06, -0.09, 0.02, -0.05, 0.1, -0.1, 0.07, -0.01,
];

export const motorStroke = (index: number) =>
  MOTOR_STROKE *
  (1 +
    STROKE_SPREAD[
      ((index % STROKE_SPREAD.length) + STROKE_SPREAD.length) %
        STROKE_SPREAD.length
    ]);
