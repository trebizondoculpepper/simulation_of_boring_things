import type { ReadonlySignal } from '@preact/signals-core';
import type { AmplifierState } from '../logic/amplifier';
import type { MusicSourceState } from '../logic/music-source';
export interface MusicBinding {
  source: ReadonlySignal<MusicSourceState>;
  amplifier: ReadonlySignal<AmplifierState>;
  powered: ReadonlySignal<boolean>;
  skip(): void;
  toggle(): void;
  volume(value: number): void;
}
