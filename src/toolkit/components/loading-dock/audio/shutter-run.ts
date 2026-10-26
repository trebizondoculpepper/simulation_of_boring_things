import { recordedLoop } from '../../core/audio/recorded-loop';

/**
 * A roller shutter running (the owner, 2026-10-26): a recording of an
 * electric metal roller shutter, its motor's hum and gear whine and its
 * laths' clatter onto the barrel together, an 8-second loop (its source
 * and edits in `CREDITS.md` and `assets/README.md`). Played while it runs.
 */
export const SHUTTER_RUN = recordedLoop(
  new URL('./assets/shutter-run.wav', import.meta.url),
  0.6,
);
