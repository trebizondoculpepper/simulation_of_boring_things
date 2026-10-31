/**
 * The crosshair's turn cue (prompt 115): what a use will do to the knob
 * under the aim. A use on a knob's left half turns it anticlockwise (down,
 * -1), on its right half clockwise (up, 1); a gamepad's LB and RB turn it
 * down and up wherever it is aimed. The cue is green where the turn would
 * move the knob and red where it would not (an end stop, or a latch).
 */

/** A knob the aim can see: whether it would turn each way. */
export interface Turnable {
  canTurn(direction: -1 | 1): boolean;
}

/** What the cue shows: one arrow for a pointer, both for a gamepad. */
export type TurnCue =
  | { kind: 'pointer'; direction: -1 | 1; possible: boolean }
  | { kind: 'pad'; down: boolean; up: boolean };

/**
 * Which way a use at screen x `point` turns a knob whose centre is at
 * screen x `centre` (both projected, so a rotated panel still reads left
 * and right as the player sees them). Exactly at the centre turns it up.
 */
export const turnSide = (point: number, centre: number): -1 | 1 =>
  point < centre ? -1 : 1;

/** The cue for an aimed knob, or none. */
export function turnCue(
  aimed: { knob: Turnable; point: number; centre: number } | null,
  gamepad: boolean,
): TurnCue | null {
  if (!aimed) return null;
  if (gamepad)
    return {
      kind: 'pad',
      down: aimed.knob.canTurn(-1),
      up: aimed.knob.canTurn(1),
    };
  const direction = turnSide(aimed.point, aimed.centre);
  return {
    kind: 'pointer',
    direction,
    possible: aimed.knob.canTurn(direction),
  };
}

/** A short key for a cue, to redraw it only when it changes. */
export function turnCueKey(cue: TurnCue | null): string {
  if (!cue) return '';
  return cue.kind === 'pad'
    ? `pad:${+cue.down}${+cue.up}`
    : `pointer:${cue.direction}:${+cue.possible}`;
}
