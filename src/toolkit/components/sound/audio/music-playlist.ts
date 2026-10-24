import { effect } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import type { LoopRecipe } from '../../core/audio/part-audio';
import type { MusicSourceState } from '../logic/music-source';

/** Stream one track at a time through the shared spatial/master audio output. */
export function musicPlaylist(
  tracks: readonly { url: URL; title: string }[],
  volume: ReadonlySignal<number>,
  onTrack: (title: string) => void,
  transport?: ReadonlySignal<MusicSourceState>,
): LoopRecipe {
  let index = 0;
  let offset = 0;
  return (context, out) => {
    if (!tracks.length) return [];
    const audio = document.createElement('audio');
    audio.hidden = true;
    audio.dataset.zoneMusic = 'true';
    document.body.append(audio);
    audio.preload = 'none';
    const input = context.createMediaElementSource(audio);
    const gain = context.createGain();
    gain.gain.value = volume.value ** 2 * 0.7;
    input.connect(gain).connect(out);
    const unwatch = effect(() => {
      gain.gain.setTargetAtTime(
        volume.value ** 2 * 0.7,
        context.currentTime,
        0.08,
      );
    });
    let stopped = false;
    let awaitingGesture = false;
    const clearGesture = () => {
      document.removeEventListener('pointerdown', retry, true);
      document.removeEventListener('keydown', retry, true);
      awaitingGesture = false;
    };
    const attemptPlay = () => {
      void audio.play().catch((error: unknown) => {
        if (stopped) return;
        if ((error as { name?: string })?.name === 'NotAllowedError') {
          if (!awaitingGesture) {
            awaitingGesture = true;
            document.addEventListener('pointerdown', retry, true);
            document.addEventListener('keydown', retry, true);
          }
        } else console.warn('Music could not play.', error);
      });
    };
    const retry = () => {
      if (!stopped) attemptPlay();
    };
    const play = () => {
      audio.src = tracks[index].url.href;
      attemptPlay();
    };
    const seek = () => {
      if (offset > 0) audio.currentTime = offset;
    };
    const playing = () => {
      clearGesture();
      onTrack(tracks[index].title);
    };
    const next = () => {
      if (transport) return; // The model advances the source, even in other rooms.
      index = (index + 1) % tracks.length;
      offset = 0;
      play();
    };
    audio.addEventListener('loadedmetadata', seek);
    audio.addEventListener('ended', next);
    audio.addEventListener('playing', playing);
    let current = -1;
    const unwatchSource = transport
      ? effect(() => {
          const s = transport.value;
          if (current !== s.track) {
            current = s.track;
            index = Math.max(0, s.track) % tracks.length;
            offset = s.position;
            play();
          } else if (
            audio.readyState >= 2 &&
            Math.abs(audio.currentTime - s.position) > 3
          ) {
            audio.currentTime = s.position;
          }
        })
      : () => {};
    if (!transport) play();
    return [
      {
        stop() {
          stopped = true;
          clearGesture();
          offset = audio.currentTime;
          unwatch();
          unwatchSource();
          audio.removeEventListener('ended', next);
          audio.removeEventListener('loadedmetadata', seek);
          audio.removeEventListener('playing', playing);
          // Let the shared output's short fade finish before releasing the stream.
          window.setTimeout(() => {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
            audio.remove();
            input.disconnect();
            gain.disconnect();
          }, 500);
        },
      },
    ];
  };
}
