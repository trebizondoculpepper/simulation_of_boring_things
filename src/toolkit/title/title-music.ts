import { signal } from '@preact/signals-core';
import { partAudio } from '../components/core/audio/part-audio';
import { musicPlaylist } from '../components/sound/audio/music-playlist';

/** Stream and repeat the owner's theme through the shared master volume. */
export function createTitleMusic() {
  const owner = {};
  const programme = musicPlaylist(
    [
      {
        url: new URL(
          '../../../resources/sound/music/title/Ripple Equilibrium - Suspended Circulation - Treblo.ogg',
          import.meta.url,
        ),
        title: 'Suspended Circulation — Treblo',
      },
    ],
    signal(0.5),
    () => {},
  );
  let playing = false;
  return {
    show() {
      if (playing) return;
      playing = true;
      // Heard through the attract sequence, whose rooms are hushed.
      partAudio.hold(owner, programme, undefined, { title: true });
    },
    hide() {
      if (!playing) return;
      playing = false;
      partAudio.hold(owner, null);
    },
  };
}
