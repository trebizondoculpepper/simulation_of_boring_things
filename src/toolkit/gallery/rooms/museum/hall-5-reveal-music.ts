import { recording } from '../../../components/core/audio/part-audio';
import type {
  SoundRecipe,
  Tone,
} from '../../../components/core/audio/part-audio';

/**
 * The skimmer reveal's music (`logic/skimmer-reveal.ts`): each cue a
 * recording where one has been supplied, as
 * `resources/sound/music/item-reveal/<cue>.mp3` (or `.ogg`; prompts in
 * `doc/prompts/music/item_reveal/`), or else a synthesised stand-in of
 * the same shape and length. Every stand-in is original: whole-tone
 * suspense, a brass-ish pickup into a held major chord.
 */

export type RevealCue =
  | 'reveal-suspense'
  | 'reveal-big-item'
  | 'reveal-fanfare'
  | 'reveal-fanfare-deflated'
  | 'skimmer-cleared';

const CLIPS = import.meta.glob(
  '../../../../../resources/sound/music/item-reveal/*.{mp3,ogg}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

/** A note's frequency, `n` semitones from A4. */
const note = (n: number) => 440 * 2 ** (n / 12);
// Semitones from A4.
const D3 = -19;
const D4 = -7;
const G2 = -26;
const G4 = -2;
const B4 = 2;
const D5 = 5;
const G5 = 10;
const B6 = 26;
const D7 = 29;
const G6 = 22;
const C5 = 3;
const E5 = 7;
const G3 = -14;
const C6 = 15;

type Timed = Tone & { at: number };

/** About 7.6 s: a low drone and a slow whole-tone climb, left hanging. */
function suspense(): Timed[] {
  const out: Timed[] = [
    { at: 0, hz: note(D3), seconds: 7.6, level: 0.05, type: 'sine' },
  ];
  for (let k = 0; k < 13; k++)
    out.push({
      at: k * 0.58,
      hz: note(D4 + k * 2),
      seconds: 0.64,
      level: 0.06 + k * 0.009,
      type: 'triangle',
    });
  return out;
}

/** The three-note pickup the fanfares share. */
const pickup = (): Timed[] =>
  [0, 0.11, 0.22].map((at, k) => ({
    at,
    hz: note([D5, D5, E5][k]),
    seconds: 0.09,
    level: 0.11,
    type: 'square' as const,
  }));

/** About 2.5 s: the pickup into a held G major chord, a sparkle on top. */
function fanfare(): Timed[] {
  return [
    ...pickup(),
    ...[G4, B4, D5, G5].map((n) => ({
      at: 0.34,
      hz: note(n),
      seconds: 2.0,
      level: 0.07,
      type: 'sawtooth' as const,
    })),
    { at: 0.34, hz: note(G2), seconds: 1.6, level: 0.1, type: 'triangle' },
    ...[G6, B6, D7].map((n, k) => ({
      at: 0.4 + k * 0.08,
      hz: note(n),
      seconds: 0.5,
      level: 0.04,
      type: 'sine' as const,
    })),
  ];
}

/** About 2.5 s: the pickup, a chord that gives up, sliding down to one low note. */
function deflated(): Timed[] {
  const out: Timed[] = [
    ...pickup(),
    ...[G4, B4, D5].map((n) => ({
      at: 0.34,
      hz: note(n),
      seconds: 0.45,
      level: 0.07,
      type: 'sawtooth' as const,
    })),
  ];
  for (let k = 0; k < 6; k++)
    out.push({
      at: 0.8 + k * 0.14,
      hz: note(G4 - k),
      seconds: 0.16,
      level: 0.08 - k * 0.006,
      type: 'sawtooth',
    });
  out.push({
    at: 1.7,
    hz: note(G2),
    seconds: 0.8,
    level: 0.1,
    type: 'sawtooth',
  });
  return out;
}

/** About 3 s: a bright run up, two chords, done. */
function cleared(): Timed[] {
  const out: Timed[] = [C5, E5, G5, C6].map((n, k) => ({
    at: k * 0.08,
    hz: note(n),
    seconds: 0.2,
    level: 0.08,
    type: 'triangle' as const,
  }));
  for (const n of [G3, D5, G4])
    out.push({
      at: 0.4,
      hz: note(n),
      seconds: 0.3,
      level: 0.06,
      type: 'sawtooth',
    });
  for (const n of [C5 - 12, E5, G5, C6])
    out.push({
      at: 0.75,
      hz: note(n),
      seconds: 1.6,
      level: 0.06,
      type: 'sawtooth',
    });
  return out;
}

const STAND_INS: Record<RevealCue, () => Timed[]> = {
  'reveal-suspense': suspense,
  'reveal-big-item': fanfare,
  'reveal-fanfare': fanfare,
  'reveal-fanfare-deflated': deflated,
  'skimmer-cleared': cleared,
};

/** A cue's sound: its recording if supplied, else its stand-in. */
export function revealCue(cue: RevealCue): SoundRecipe {
  const key = Object.keys(CLIPS).find((k) =>
    k.slice(k.lastIndexOf('/') + 1).startsWith(`${cue}.`),
  );
  return key
    ? recording(new URL(CLIPS[key], location.href), 1)
    : { tones: STAND_INS[cue]() };
}
