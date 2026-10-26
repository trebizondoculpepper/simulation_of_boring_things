import type { ReadonlySignal } from '@preact/signals-core';
import { recordedLoop } from '../../core/audio/recorded-loop';
import { recording } from '../../core/audio/part-audio';

/**
 * A roller shutter running (the owner, 2026-10-26): a recording of an
 * electric metal roller shutter, its motor's hum and gear whine and its
 * laths' clatter onto the barrel together, an 8-second loop (its source
 * and edits in `CREDITS.md` and `assets/README.md`). Played while it runs,
 * its loudness and pitch following the motor's speed, `speed` (0 to 1).
 */
export const shutterRun = (speed?: ReadonlySignal<number>) =>
  recordedLoop(
    new URL('./assets/shutter-run.wav', import.meta.url),
    0.6,
    speed,
  );

/**
 * The shutter coming to rest: the same recording's first take ending, the
 * curtain landing and its motor cutting out under its brake, matched in
 * level to the running loop.
 */
export const SHUTTER_STOP = recording(
  new URL('./assets/shutter-stop.wav', import.meta.url),
  0.6,
);
