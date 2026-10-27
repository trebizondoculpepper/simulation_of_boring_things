/**
 * The bridge's theme, cued (the owner, 2026-10-27): begun `delay` seconds
 * after it is cued (the first view's `THEME_AT`, after the doors shut),
 * then left to play `length` seconds and faded out unless the walker
 * leaves first, which fades it out. Cueing it again while it is cued or
 * playing changes nothing, so a trigger firing twice cannot cut it off;
 * only `leave` or its own end stops it. Pure but for the clock and the
 * player it is given.
 */
export interface ThemeCueIo {
  start(): void;
  /** Fade out (the walker leaving) or end. */
  stop(): void;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

/**
 * Seconds of the theme played (the owner, 2026-10-27): the whole track is
 * 2:06.8; it plays from the start and its 3 s fade begins here, silent by
 * 48 s (the stop is the player's fade, `THEME_FADE`, never a cut).
 */
export const THEME_LENGTH = 45;

export function createThemeCue(io: ThemeCueIo, length = THEME_LENGTH) {
  let state: 'idle' | 'cued' | 'playing' = 'idle';
  let timer = 0;
  const end = () => {
    state = 'idle';
    io.stop();
  };
  return {
    get state() {
      return state;
    },
    /** Play after `delay` seconds (0: at once), unless already cued or playing. */
    cue(delay = 0) {
      if (state !== 'idle') return;
      const begin = () => {
        state = 'playing';
        io.start();
        // Its end counted from when it actually starts.
        timer = io.setTimeout(end, length * 1000);
      };
      if (delay <= 0) begin();
      else {
        state = 'cued';
        timer = io.setTimeout(begin, delay * 1000);
      }
    },
    /** The walker gone: not begun if cued; faded out if playing. */
    leave() {
      io.clearTimeout(timer);
      if (state === 'playing') io.stop();
      state = 'idle';
    },
  };
}
