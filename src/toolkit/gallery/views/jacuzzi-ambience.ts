import { computed, effect, signal, untracked } from '@preact/signals-core';
import { partAudio } from '../../components/core/audio/part-audio';
import { musicPlaylist } from '../../components/sound/audio/music-playlist';
import { JACUZZI_MUSIC } from '../audio/jacuzzi-music';
import { bindJacuzziMusic } from './jacuzzi-music';

/** One listener-relative programme across both corridor copies and room handovers. */
export function createJacuzziAmbience() {
  const binding = bindJacuzziMusic();
  const approach = signal(0);
  const on = computed(
    () =>
      approach.value > 0 && binding.powered.value && binding.amplifier.value.on,
  );
  const volume = computed(() => binding.amplifier.value.volume);
  const programme = musicPlaylist(
    JACUZZI_MUSIC,
    volume,
    () => {},
    binding.source,
  );
  const owner = {};
  const stop = effect(() => {
    const enabled = on.value;
    untracked(() =>
      partAudio.hold(
        owner,
        enabled
          ? (context, out) => {
              const transmission = context.createGain();
              transmission.gain.value = approach.value;
              transmission.connect(out);
              const unwatch = effect(() => {
                transmission.gain.setTargetAtTime(
                  approach.value,
                  context.currentTime,
                  0.06,
                );
              });
              const sources = programme(context, transmission);
              return [
                {
                  stop(when) {
                    unwatch();
                    for (const source of sources) source.stop(when);
                    window.setTimeout(() => transmission.disconnect(), 600);
                  },
                },
              ];
            }
          : null,
      ),
    );
  });
  return {
    setGain(gain: number) {
      approach.value = gain;
    },
    dispose() {
      stop();
      partAudio.hold(owner, null);
    },
  };
}
