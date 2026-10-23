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
}

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
  const goal = s.command ? 1 : 0;
  const step = dt / stroke;
  const position =
    goal > s.position
      ? Math.min(goal, s.position + step)
      : Math.max(goal, s.position - step);
  return position === s.position ? s : { ...s, position };
}

/** Whether its motor is running: commanded somewhere it has not reached. */
export const motorRunning = (s: MotorisedValveState) =>
  s.position !== (s.command ? 1 : 0);

/** What its limit switches say. */
export const motorLimits = (s: MotorisedValveState) => ({
  open: s.position >= 1,
  shut: s.position <= 0,
});

/** The gear motor's whine, Hz, as recorded (`gear-motor` in `machine-tones.ts`). */
export const MOTOR_HZ = 271;

/**
 * No two motors quite alike (the owner, 2026-10-23): each valve's motor a
 * few hertz off the recorded whine, so several running together are each
 * heard apart. Fixed by its place in its room, so one valve always sounds
 * the same, and no two of the first dozen share a pitch; Hz.
 */
const DETUNE = [1, -2.5, 4, -4.5, 2.5, -1, 5.5, -3.5, 3, -5.5, 6, -6];

export const motorDetune = (index: number) =>
  DETUNE[((index % DETUNE.length) + DETUNE.length) % DETUNE.length];

/** The rate its motor's tone is played at, for its detuning. */
export const motorRate = (index: number) => 1 + motorDetune(index) / MOTOR_HZ;
