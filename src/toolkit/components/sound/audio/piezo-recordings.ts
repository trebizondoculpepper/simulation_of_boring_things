import type { Object3D } from 'three';
import { partAudio, recording } from '../../core/audio/part-audio';
import type { LoopRecipe, SoundRecipe } from '../../core/audio/part-audio';
import { recordedLoop } from '../../core/audio/recorded-loop';
import { piezoChoice } from '../logic/piezo-beeps';
import type {
  PiezoLoopMeaning,
  PiezoMeaning,
  PiezoOneShot,
  PiezoVoice,
} from '../logic/piezo-beeps';

/**
 * The piezo beep library's files (mission 100,
 * `resources/sound/effects/piezo/`), synthesised from scratch by its
 * `generate.py`; which is which, and how loud, is `logic/piezo-beeps.ts`.
 *
 * A device's sounder is its own: give it a pitch and the room it stands
 * in where it is built, and take the meaning from its event:
 *
 *     const keypad = { pitch: 'high', room: 'small' } as const;
 *     partAudio.play(piezoBeep('entry', keypad), key);   // or playPiezo
 *     part.holdWhile(counting, piezoLoop('countdown', keypad));
 */
const FILES = import.meta.glob<string>(
  '../../../../../resources/sound/effects/piezo/*.mp3',
  { eager: true, query: '?url', import: 'default' },
);

/** Each file's URL, by its name. */
const URLS = new Map(
  Object.entries(FILES).map(([path, url]) => [
    path.slice(path.lastIndexOf('/') + 1),
    url,
  ]),
);

/** The names of the files the build carries (for the tests). */
export const piezoFilesBundled = (): string[] => [...URLS.keys()];

const urlOf = (file: string): URL => {
  const url = URLS.get(file);
  if (!url) throw new Error(`No piezo beep ${file}`);
  return new URL(url, import.meta.url);
};

/** One URL a file, made once. */
const made = new Map<string, URL>();
const piezoUrl = (meaning: PiezoMeaning, voice?: PiezoVoice) => {
  const { file, level } = piezoChoice(meaning, voice);
  let url = made.get(file);
  if (!url) made.set(file, (url = urlOf(file)));
  return { url, level };
};

/** A piezo beep as a one-shot recipe (`partAudio.play`): defaults `high`, `dry`, its meaning's level. */
export function piezoBeep(
  meaning: PiezoOneShot,
  options?: PiezoVoice,
): SoundRecipe {
  const { url, level } = piezoUrl(meaning, options);
  return recording(url, level);
}

const loops = new Map<string, LoopRecipe>();

/** A looping piezo cadence, for `partAudio.hold` (or a part's `holdWhile`) while its condition lasts. */
export function piezoLoop(
  meaning: PiezoLoopMeaning,
  options?: PiezoVoice,
): LoopRecipe {
  const { url, level } = piezoUrl(meaning, options);
  // One recipe a file and level, so its decoded buffer is kept.
  const key = `${url.href}@${level}`;
  let recipe = loops.get(key);
  if (!recipe) loops.set(key, (recipe = recordedLoop(url, level)));
  return recipe;
}

/**
 * Play a one-shot from where `from` stands: the call for a key press,
 * `playPiezo('entry', { pitch: 'high', room: 'small' }, keyObject)`.
 */
export const playPiezo = (
  meaning: PiezoOneShot,
  voice?: PiezoVoice,
  from?: Object3D,
) => partAudio.play(piezoBeep(meaning, voice), from);

/**
 * A device's own sounder, its pitch and room fixed once: `sounder.key()`
 * on every key press, `sounder.play('error')` on a refusal,
 * `sounder.loop('alarm')` to hold.
 */
export function piezoSounder(voice: PiezoVoice, from?: Object3D) {
  return {
    key: () => playPiezo('entry', voice, from),
    play: (meaning: PiezoOneShot) => playPiezo(meaning, voice, from),
    beep: (meaning: PiezoOneShot) => piezoBeep(meaning, voice),
    loop: (meaning: PiezoLoopMeaning) => piezoLoop(meaning, voice),
  };
}
