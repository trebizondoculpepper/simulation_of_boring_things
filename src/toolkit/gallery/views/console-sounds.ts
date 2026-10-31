import type { Object3D } from 'three';
import { partAudio, recording } from '../../components/core/audio/part-audio';
import {
  CONSOLE_SOUNDS,
  challengeSound,
  createSoundPicker,
} from '../logic/console-sounds';
import type { ChallengeMoment, ConsoleSound } from '../logic/console-sounds';

/** The Frutiger Aero sounds, by file name without `.ogg`, bundled as Vite assets. */
const FILES = Object.fromEntries(
  Object.entries(
    import.meta.glob(
      '../../../../resources/sound/effects/frutiger-aero/*.ogg',
      {
        eager: true,
        query: '?url',
        import: 'default',
      },
    ) as Record<string, string>,
  ).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]),
);

/**
 * The dosing console's sounds, played from `from` (the console): `play`
 * for a press, `watch` once a step with the challenge engine's game, which
 * sounds the hold beginning and breaking, won and lost, once each.
 */
export function createConsoleSounds(from?: () => Object3D | undefined) {
  const pick = createSoundPicker();
  let seen: ChallengeMoment | null = null;
  const play = (kind: ConsoleSound) => {
    const url = FILES[pick(kind)];
    if (!url) return;
    partAudio.play(
      recording(new URL(url, location.href), CONSOLE_SOUNDS[kind].level),
      from?.(),
    );
  };
  return {
    play,
    watch(g: ChallengeMoment) {
      const now = { card: g.card, heldSince: g.heldSince, outcome: g.outcome };
      const kind = seen ? challengeSound(seen, now) : null;
      seen = now;
      if (kind) play(kind);
    },
  };
}
