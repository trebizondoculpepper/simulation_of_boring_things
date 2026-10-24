/**
 * How much of a sound gets out past a door, by how far it stands open
 * (the owner, 2026-10-23): all of it while the door is open more than
 * about 20 degrees; then, as it closes the last 20 degrees, less and less,
 * evenly in decibels, to 20 dB down when it is shut. Pure: an angle in
 * degrees from shut, a gain from 0.1 to 1.
 */

/** Open this far, a door lets everything out, degrees. */
export const DOOR_FULL_AT = 20;
/**
 * Shut, it holds the sound this far down, decibels: a sheet-steel cabinet
 * door, enough that its machines are still heard running (the owner,
 * 2026-10-24: -15 dB at most).
 */
export const DOOR_SHUT_DB = -15;

/** The gain of a sound heard past a door open `degrees` from shut. */
export function doorGain(degrees: number): number {
  const open = Math.max(0, Math.min(DOOR_FULL_AT, degrees));
  const db = DOOR_SHUT_DB * (1 - open / DOOR_FULL_AT);
  return 10 ** (db / 20);
}
