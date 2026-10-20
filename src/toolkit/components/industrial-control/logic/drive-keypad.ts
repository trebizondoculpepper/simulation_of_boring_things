/**
 * An AC drive as its keypad (its human interface module) sees it: START
 * and STOP, a speed reference stepped up and down, a direction key, JOG,
 * and a SEL key stepping the display through its parameters (ESC goes
 * back to the first). The output frequency ramps to the reference while
 * running. Pure logic: the displays board's drive keypad works one.
 */

export const DRIVE_MAX_HZ = 60;
export const DRIVE_ACCEL_HZ_PER_SECOND = 10;
export const DRIVE_STEP_HZ = 1;
export const JOG_HZ = 10;
/** The motor's current at no load and at full load, amperes. */
const NO_LOAD_AMPS = 1.3;
const FULL_LOAD_AMPS = 3.4;

export const DRIVE_PARAMETERS = [
  'Out Freq',
  'Out Amps',
  'Speed RPM',
  'Freq Ref',
] as const;

export interface Drive {
  running: boolean;
  jogging: boolean;
  /** 1 forward, -1 reverse. */
  direction: 1 | -1;
  /** The speed reference, Hz. */
  reference: number;
  /** The output frequency, Hz, signed by direction. */
  frequency: number;
  /** Which parameter the display shows, an index into DRIVE_PARAMETERS. */
  parameter: number;
}

export function createDrive(): Drive {
  return {
    running: false,
    jogging: false,
    direction: 1,
    reference: 30,
    frequency: 0,
    parameter: 0,
  };
}

export type DriveKey =
  | 'start'
  | 'stop'
  | 'up'
  | 'down'
  | 'reverse'
  | 'jog'
  | 'sel'
  | 'esc'
  | 'enter';

/** A key pressed. JOG runs at the jog speed until the next key. */
export function pressDriveKey(drive: Drive, key: DriveKey) {
  if (key !== 'jog') drive.jogging = false;
  switch (key) {
    case 'start':
      drive.running = true;
      break;
    case 'stop':
      drive.running = false;
      break;
    case 'up':
      drive.reference = Math.min(DRIVE_MAX_HZ, drive.reference + DRIVE_STEP_HZ);
      break;
    case 'down':
      drive.reference = Math.max(0, drive.reference - DRIVE_STEP_HZ);
      break;
    case 'reverse':
      drive.direction = drive.direction === 1 ? -1 : 1;
      break;
    case 'jog':
      drive.jogging = !drive.running && !drive.jogging;
      break;
    case 'sel':
      drive.parameter = (drive.parameter + 1) % DRIVE_PARAMETERS.length;
      break;
    case 'esc':
      drive.parameter = 0;
      break;
    case 'enter':
      // Accepts the reference; it already applies as it is stepped.
      break;
  }
}

/** Ramp the output frequency toward its target, signed by direction. */
export function stepDrive(drive: Drive, seconds: number) {
  const speed = drive.running ? drive.reference : drive.jogging ? JOG_HZ : 0;
  const target = speed * drive.direction;
  const step = DRIVE_ACCEL_HZ_PER_SECOND * seconds;
  const f = drive.frequency;
  drive.frequency =
    Math.abs(target - f) <= step ? target : f + Math.sign(target - f) * step;
}

/** The motor's speed, rpm, from the output frequency (a 4-pole motor). */
export const driveRpm = (drive: Drive) => Math.abs(drive.frequency) * 30 * 0.97;

/** The two lines of the keypad's display. */
export function driveDisplay(drive: Drive): [string, string] {
  const f = Math.abs(drive.frequency);
  const status = drive.running
    ? 'Running'
    : drive.jogging
      ? 'Jogging'
      : f > 0
        ? 'Stopping'
        : 'Stopped';
  const amps =
    f > 0.1
      ? NO_LOAD_AMPS + (FULL_LOAD_AMPS - NO_LOAD_AMPS) * (f / DRIVE_MAX_HZ)
      : 0;
  const values = [
    `${f.toFixed(1)}Hz`,
    `${amps.toFixed(2)}A`,
    `${Math.round(driveRpm(drive))}`,
    `${drive.reference.toFixed(1)}Hz`,
  ];
  const arrow = drive.direction === 1 ? 'FWD' : 'REV';
  return [
    `${status.padEnd(12)}${arrow}`.slice(0, 16),
    DRIVE_PARAMETERS[drive.parameter].padEnd(
      16 - values[drive.parameter].length,
    ) + values[drive.parameter],
  ];
}
