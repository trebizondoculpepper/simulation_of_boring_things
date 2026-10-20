import { effect } from '@preact/signals-core';
import { click, partAudio, recording, tone } from '../audio/part-audio';
import type { SoundRecipe } from '../audio/part-audio';
import { largeDoorMovement } from '../audio/door-sounds';
import type { PartEvent, PartListener } from '../logic/world/components';
import { beginPart } from './parts';
import type { Part } from './parts';

/**
 * Shared sounds and helpers for building fittings as parts (see
 * `parts.ts`): each part brings its look (its category's `views/`), what a
 * click on it does and its own sounds, and is bound to a world model (dev2's
 * and dev3's is `architectural/logic/building-services.ts`) by its props.
 * None decides anything for itself that the building would decide: a light
 * switch only throws its switch, and the model says whether the lights come
 * on.
 */

// ---- Sounds ------------------------------------------------------------------

export const asset = (file: string) =>
  new URL(`../audio/assets/${file}`, import.meta.url);

export const PRESS = recording(asset('button-press.wav'), 0.07);

export const DOOR_OPEN = largeDoorMovement;

export const DOOR_SHUT = largeDoorMovement;

export const KEY_TURN = click({
  band: 5200,
  q: 4,
  decay: 0.012,
  level: 0.45,
  repeat: [3, 0.035],
});

export const LOCKED = click({
  band: 900,
  q: 3,
  decay: 0.02,
  level: 0.5,
  repeat: [2, 0.05],
  thump: [80, 0.04],
});

export const CALL_POINT = click({
  band: 1600,
  q: 1.2,
  decay: 0.04,
  level: 0.6,
  thump: [110, 0.06],
});

export const CORD = click({ band: 2600, q: 2, decay: 0.02, level: 0.4 });

export const LID = click({ band: 1000, q: 1.5, decay: 0.04, level: 0.4 });

export const BEEP = tone({ hz: 2700, seconds: 0.08, level: 0.04 });

export const ERROR = tone({
  hz: 420,
  seconds: 0.25,
  level: 0.05,
  type: 'sawtooth',
});

export const CHIME = tone({
  hz: 880,
  seconds: 0.35,
  level: 0.05,
  type: 'sine',
  repeat: [2, 0.12],
});

/** A part's own events, for its sounds and its listeners. */
export function emitter() {
  const listeners = new Set<PartListener>();
  return {
    onEvent(listener: PartListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(event: PartEvent) {
      for (const listener of listeners) listener(event, undefined);
    },
  };
}

/** Play `sound` from `part` now, outside its event sounds. */
export const play = (sound: SoundRecipe, from: Part['object']) =>
  partAudio.play(sound, from);

/** Keep a view showing values from the model, as they change. */
export function show(a: ReturnType<typeof beginPart>, render: () => void) {
  a.disposers.push(effect(render));
}
