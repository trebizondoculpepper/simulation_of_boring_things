import type { ConsoleEffect, ConsoleState } from './dosing-console';
import type { Outcome } from '../../../game/plant/museum-4-challenge';

/**
 * Hall 4's dosing console's sounds (Frutiger Aero, Kenney's Interface
 * Sounds in `resources/sound/effects/frutiger-aero/`, see its `notes.md`):
 * which sound each press and each turn of the challenge makes, and which
 * file plays it. Pure: the view loads the files and plays them.
 */
export type ConsoleSound =
  | 'touch'
  | 'tick'
  | 'level-on'
  | 'level-off'
  | 'refused'
  | 'start'
  | 'dose'
  | 'dose-refused'
  | 'reset-ask'
  | 'yes'
  | 'no'
  | 'in-range'
  | 'out-of-range'
  | 'won'
  | 'lost';

/** Each sound's files (any one may play) and level; modest, under the hall's narration. */
export const CONSOLE_SOUNDS: Record<
  ConsoleSound,
  { files: readonly string[]; level: number; inOrder?: boolean }
> = {
  touch: { files: ['touch-1', 'touch-2', 'touch-3'], level: 0.25 },
  tick: { files: ['tick-1', 'tick-2', 'tick-3'], level: 0.2 },
  'level-on': { files: ['level-switch-on'], level: 0.25 },
  'level-off': { files: ['level-switch-off'], level: 0.25 },
  refused: { files: ['touch-refused-1', 'touch-refused-2'], level: 0.2 },
  start: { files: ['start-1'], level: 0.3 },
  dose: { files: ['dose-1', 'dose-2', 'dose-3', 'dose-4'], level: 0.35 },
  'dose-refused': {
    files: ['dose-refused-1', 'dose-refused-2'],
    level: 0.25,
  },
  'reset-ask': { files: ['reset-ask'], level: 0.25 },
  yes: { files: ['accept-1', 'accept-2', 'accept-3', 'accept-4'], level: 0.25 },
  no: { files: ['dialog-close'], level: 0.25 },
  // Rising when played in order, one more each time the hold begins again.
  'in-range': {
    files: ['in-range-1', 'in-range-2', 'in-range-3'],
    level: 0.3,
    inOrder: true,
  },
  'out-of-range': { files: ['out-of-range'], level: 0.3 },
  won: { files: ['won-1', 'won-2'], level: 0.35 },
  lost: { files: ['lost-1', 'lost-2'], level: 0.3 },
};

/** The sound of pressing region `id`, from `before` to `after` (from `pressConsole`). */
export function pressSound(
  id: string,
  before: ConsoleState,
  after: ConsoleState,
  effect?: ConsoleEffect,
): ConsoleSound {
  // Nothing happened: something greyed out (DOSE before a pick).
  if (after === before && !effect) return 'refused';
  // The list's arrows tick as the size's do (the owner, 2026-10-31).
  if (id === 'chem-up' || id === 'chem-down')
    return after.chemical === before.chemical ? 'refused' : 'tick';
  if (id === 'size-up' || id === 'size-down')
    return after.size === before.size ? 'refused' : 'tick';
  switch (id) {
    case 'level-pro':
      return 'level-on';
    case 'level-journeyman':
      return 'level-off';
    case 'start':
      return 'start';
    case 'reset':
      return 'reset-ask';
    case 'reset-yes':
    case 'continue':
    case 'free-play':
    case 'retry':
      return 'yes';
    case 'reset-no':
    case 'abandon':
      return 'no';
  }
  return 'touch';
}

/** What the challenge sounds like, as the engine shows it. */
export interface ChallengeMoment {
  card: unknown;
  heldSince: number | null;
  outcome: Outcome;
}

/**
 * The sound of the challenge going from `a` to `b` in one step, or null:
 * one per transition (the hold beginning or breaking, won, lost), none
 * when a card starts, is reset or is left.
 */
export function challengeSound(
  a: ChallengeMoment,
  b: ChallengeMoment,
): ConsoleSound | null {
  if (!b.card || a.card !== b.card || a.outcome !== 'playing') return null;
  if (b.outcome === 'won') return 'won';
  if (b.outcome === 'failed') return 'lost';
  if (a.heldSince === null && b.heldSince !== null) return 'in-range';
  if (a.heldSince !== null && b.heldSince === null) return 'out-of-range';
  return null;
}

/**
 * A picker of each sound's file: in order where the sound says so, else at
 * random but never the same file twice running, so repeats don't drone.
 */
export function createSoundPicker(random: () => number = Math.random) {
  const last = new Map<ConsoleSound, number>();
  return (kind: ConsoleSound): string => {
    const { files, inOrder } = CONSOLE_SOUNDS[kind];
    const prev = last.get(kind) ?? -1;
    let i: number;
    if (inOrder) i = (prev + 1) % files.length;
    else if (files.length < 2) i = 0;
    else {
      i = Math.floor(random() * (files.length - 1));
      if (i >= prev && prev >= 0) i += 1;
    }
    last.set(kind, i);
    return files[i];
  };
}
