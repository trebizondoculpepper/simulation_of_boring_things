import type { Object3D } from 'three';
import { partAudio, recording } from '../../core/audio/part-audio';
import type { SoundRecipe } from '../../core/audio/part-audio';
import type { UiSound } from '../../../../ui2d';
import {
  LEVELS,
  TOUCH_SOUNDS,
  balanced,
  createPicker,
} from '../logic/console-sounds';
import type { UsedSound } from '../logic/console-sounds';

/**
 * The bridge's console sounds as recordings (the owner, 2026-10-27): the
 * owner's own console sounds resynthesised by `resynth.py`
 * (`resources/sound/effects/resynthesized_bloops/`, `CREDITS.md`); which
 * answers what, and how loud, is `logic/console-sounds.ts`.
 */
const URLS: Record<UsedSound, URL> = {
  ack_trill: new URL(
    '../../../../../resources/sound/effects/resynthesized_bloops/ack_trill.mp3',
    import.meta.url,
  ),
  actioning: new URL(
    '../../../../../resources/sound/effects/resynthesized_bloops/actioning.mp3',
    import.meta.url,
  ),
  amber_alert: new URL(
    '../../../../../resources/sound/effects/resynthesized_bloops/amber_alert.mp3',
    import.meta.url,
  ),
  coming_out_of_warp: new URL(
    '../../../../../resources/sound/effects/resynthesized_bloops/coming_out_of_warp.mp3',
    import.meta.url,
  ),
  correct_entry: new URL(
    '../../../../../resources/sound/effects/resynthesized_bloops/correct_entry.mp3',
    import.meta.url,
  ),
  engines_online: new URL(
    '../../../../../resources/sound/effects/resynthesized_bloops/engines_online.mp3',
    import.meta.url,
  ),
  lock_out: new URL(
    '../../../../../resources/sound/effects/resynthesized_bloops/lock_out.mp3',
    import.meta.url,
  ),
  look_here: new URL(
    '../../../../../resources/sound/effects/resynthesized_bloops/look_here.mp3',
    import.meta.url,
  ),
  now_online: new URL(
    '../../../../../resources/sound/effects/resynthesized_bloops/now_online.mp3',
    import.meta.url,
  ),
  processing: new URL(
    '../../../../../resources/sound/effects/resynthesized_bloops/processing.mp3',
    import.meta.url,
  ),
  system_booting_up: new URL(
    '../../../../../resources/sound/effects/resynthesized_bloops/system_booting_up.mp3',
    import.meta.url,
  ),
  we_are_being_hailed: new URL(
    '../../../../../resources/sound/effects/resynthesized_bloops/we_are_being_hailed.mp3',
    import.meta.url,
  ),
};

/** `name` as a one-shot at `level` (a share of the reference loudness, `balanced`). */
export const consoleRecording = (name: UsedSound, level: number): SoundRecipe =>
  recording(URLS[name], balanced(name, level));

/** Play `name` at `level` from where `from` stands. */
export const playConsoleSound = (
  name: UsedSound,
  level: number,
  from?: Object3D,
) => partAudio.play(consoleRecording(name, level), from);

const pickTouch = createPicker(Math.random);

/**
 * A page turned (◄ or ►): just a little chirp, two quick rising blips,
 * quieter than a touch (the owner, 2026-10-28: the recording was too
 * disturbing for something done so often).
 */
export const PAGE_CHIRP: SoundRecipe = {
  tones: [
    { at: 0, hz: 2200, seconds: 0.025, level: 0.008, type: 'sine' },
    { at: 0.03, hz: 2900, seconds: 0.03, level: 0.008, type: 'sine' },
  ],
};

/** The recorded answer to a touch (the parody consoles' palette): its file chosen afresh each press; a page turned, a chirp. */
export const recordedTouchSound = (sound: UiSound): SoundRecipe =>
  sound === 'page'
    ? PAGE_CHIRP
    : consoleRecording(pickTouch(TOUCH_SOUNDS[sound]), LEVELS.touch);
