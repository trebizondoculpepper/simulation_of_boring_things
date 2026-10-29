/**
 * The skimmer's item reveal (the owner, 2026-10-29), a parody of the
 * treasure-chest moment in a 1990s 3D adventure game: reaching into the
 * skimmer, the walker is held still and looks up, diagonally, while a
 * slow phrase builds suspense; the find appears above, turning, with a
 * fanfare and a banner ("You got a DEAD RAT!"); then the look comes back
 * down, the find is in the hands, and the walker is free to carry it to
 * the skip. Pure: where the look is, and what shows, at a time.
 */

/** Each stage's length, seconds: the music's (`doc/prompts/music/item_reveal`), the look's return. */
export interface RevealTiming {
  suspense: number;
  fanfare: number;
  settle: number;
}

export const REVEAL: RevealTiming = {
  suspense: 7.6,
  fanfare: 3.1,
  settle: 0.5,
};

/** How far the walker looks up while the find is shown, radians (about 35°). */
export const LOOK_UP = 0.6;
/** How long the find takes to pop into view, seconds. */
export const POP = 0.18;
/** How fast it turns, radians a second. */
export const SPIN = 2.2;

export type RevealPhase = 'suspense' | 'fanfare' | 'settle' | 'done';

export interface RevealFrame {
  phase: RevealPhase;
  /** The walker's look, radians up. */
  pitch: number;
  /** The find above the walker: its size (0 hidden, 1 full) and its turn. */
  size: number;
  spin: number;
  /** Whether the banner is up. */
  banner: boolean;
}

const ease = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The reveal `t` seconds after the reach, the walker having looked `from` radians up. */
export function revealFrame(
  t: number,
  from: number,
  timing: RevealTiming = REVEAL,
): RevealFrame {
  const { suspense, fanfare, settle } = timing;
  if (t < suspense)
    return {
      phase: 'suspense',
      pitch: lerp(from, LOOK_UP, ease(t / suspense)),
      size: 0,
      spin: 0,
      banner: false,
    };
  const shown = t - suspense;
  if (shown < fanfare) {
    // A small overshoot as it pops in, as treasure does.
    const pop = Math.min(1, shown / POP);
    return {
      phase: 'fanfare',
      pitch: LOOK_UP,
      size: pop < 1 ? pop * (1 + 0.25 * Math.sin(pop * Math.PI)) : 1,
      spin: shown * SPIN,
      banner: true,
    };
  }
  const back = shown - fanfare;
  if (back < settle)
    return {
      phase: 'settle',
      pitch: lerp(LOOK_UP, from, ease(back / settle)),
      size: 0,
      spin: 0,
      banner: false,
    };
  return { phase: 'done', pitch: from, size: 0, spin: 0, banner: false };
}

/**
 * The cue a find appears to (the owner, 2026-10-29): the big-item reveal
 * and the fanfare by turns, the `n`th reveal (from 0) the big item when
 * even; the last, more hair, a deflated fanfare.
 */
export const fanfareOf = (id: string, n: number) =>
  id === 'more-hair'
    ? 'reveal-fanfare-deflated'
    : n % 2 === 0
      ? 'reveal-big-item'
      : 'reveal-fanfare';

/** The banner's words. */
export const bannerLine = (got: string) => `You got ${got}!`;
