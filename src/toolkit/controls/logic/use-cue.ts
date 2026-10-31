/**
 * The crosshair's use cue (prompt 115 and its second part,
 * `doc/plans/115/push-pull-cue.md`): what a use will do to the thing under
 * the aim, and whether it will do anything. A knob turns (a use on its
 * left half anticlockwise, -1, on its right half clockwise, 1; a gamepad's
 * LB and RB down and up wherever it is aimed); a button is pushed; an
 * emergency stop that is in is pulled; anything else usable is used some
 * other way, shown by the plain ring. Green where the use will have a
 * consequence, red where it will not (an end stop, a latch, no power, an
 * interlock: the owner, 2026-10-31, "It provides feedback to the user to
 * explain that what they're about to do will have no consequence").
 */

/** What a use does, as the cue draws it. */
export type Gesture = 'turn' | 'push' | 'pull' | 'use';

/** A knob the aim can see: whether it would turn each way. */
export interface Turnable {
  canTurn(direction: -1 | 1): boolean;
}

/** What a marked thing says a use on it would do now. */
export type UseAnswer =
  | { gesture: 'push' | 'pull' | 'use'; possible: boolean }
  | {
      gesture: 'turn';
      direction: -1 | 1;
      possible: boolean;
      /**
       * A knob's two ways, for a gamepad's LB and RB. A turn by state (to
       * its other position whichever half is used) has none: it goes the
       * one way, whatever is pressed.
       */
      ways?: { down: boolean; up: boolean };
    };

/** The plain ring: usable, some other way. */
export const PLAIN_USE: UseAnswer = { gesture: 'use', possible: true };

/**
 * What the cue shows: one glyph (with the pad's A under it on a gamepad),
 * or a knob's two arrows, LB's and RB's.
 */
export type UseCue =
  | {
      kind: 'one';
      gesture: Gesture;
      /** A turn's way; 0 for anything else. */
      direction: -1 | 0 | 1;
      possible: boolean;
      /** The button that does it, shown under the glyph: a gamepad's A. */
      button: '' | 'A';
    }
  | { kind: 'both'; down: boolean; up: boolean };

/**
 * Which way a use at screen x `point` turns a knob whose centre is at
 * screen x `centre` (both projected, so a rotated panel still reads left
 * and right as the player sees them). Exactly at the centre turns it up.
 */
export const turnSide = (point: number, centre: number): -1 | 1 =>
  point < centre ? -1 : 1;

/** A knob's answer: the way the side aimed at turns it, and both ways. */
export function knobAnswer(
  knob: Turnable,
  point: number,
  centre: number,
): UseAnswer {
  const direction = turnSide(point, centre);
  return {
    gesture: 'turn',
    direction,
    possible: knob.canTurn(direction),
    ways: { down: knob.canTurn(-1), up: knob.canTurn(1) },
  };
}

/** The cue for an answer, for a pointer or a gamepad, or none. */
export function useCue(
  answer: UseAnswer | null,
  gamepad: boolean,
): UseCue | null {
  if (!answer) return null;
  if (answer.gesture === 'turn') {
    if (gamepad && answer.ways) return { kind: 'both', ...answer.ways };
    return {
      kind: 'one',
      gesture: 'turn',
      direction: answer.direction,
      possible: answer.possible,
      button: gamepad ? 'A' : '',
    };
  }
  return {
    kind: 'one',
    gesture: answer.gesture,
    direction: 0,
    possible: answer.possible,
    // The plain ring draws nothing, so labels nothing.
    button: gamepad && answer.gesture !== 'use' ? 'A' : '',
  };
}

/** Whether the ring shows the cue's use will work (green) or not (red). */
export function cueGoes(cue: UseCue): boolean {
  return cue.kind === 'both' ? cue.down || cue.up : cue.possible;
}

/** Where the cue's glyph stands: above the ring, up to its right, or none. */
export function cuePlace(cue: UseCue): 'above' | 'upper-right' | 'none' {
  if (cue.kind === 'both' || cue.gesture === 'turn') return 'above';
  return cue.gesture === 'use' ? 'none' : 'upper-right';
}

/** A short key for a cue, to redraw it only when it changes. */
export function useCueKey(cue: UseCue | null): string {
  if (!cue) return '';
  return cue.kind === 'both'
    ? `both:${+cue.down}${+cue.up}`
    : `${cue.gesture}:${cue.direction}:${+cue.possible}:${cue.button}`;
}
