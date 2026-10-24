import { signal } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import { machineTone } from '../../sound/audio/machine-tones';

/** Shared drain programme for the jacuzzi, footbath and drain demonstration. */
export const drainGurgle = (level: number | ReadonlySignal<number> = 0.08) =>
  machineTone('drain-gurgle', signal(1), level);
