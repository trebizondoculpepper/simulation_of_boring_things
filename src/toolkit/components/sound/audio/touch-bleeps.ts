import type { SoundRecipe } from '../../core/audio/part-audio';
import type { UiSound } from '../../../../ui2d';

/**
 * The touch panels' bleeps (mission 093): the game's own synthesised
 * tones, a small family a touch screen answers with. CONFIRM, a quick
 * rising pair; DENY, a low falling pair, buzzier; PAGE, a little
 * three-note run up; ALERT, a two-tone warble. Short and soft, sine and
 * triangle waves, so a bank of panels never shrieks. DONE (a command
 * carried out) and ACK (alarms accepted) are CONFIRM with a third note.
 * The parody consoles answer with recordings instead
 * (`console-recordings.ts`).
 */
export type TouchBleep = UiSound;

const LEVEL = 0.05;

export const TOUCH_BLEEPS: Record<TouchBleep, SoundRecipe> = {
  confirm: {
    tones: [
      { at: 0, hz: 1318, seconds: 0.045, level: LEVEL, type: 'sine' },
      { at: 0.05, hz: 1760, seconds: 0.06, level: LEVEL, type: 'sine' },
    ],
  },
  done: {
    tones: [
      { at: 0, hz: 1318, seconds: 0.045, level: LEVEL, type: 'sine' },
      { at: 0.05, hz: 1760, seconds: 0.045, level: LEVEL, type: 'sine' },
      { at: 0.1, hz: 2093, seconds: 0.06, level: LEVEL, type: 'sine' },
    ],
  },
  ack: {
    tones: [
      { at: 0, hz: 1760, seconds: 0.045, level: LEVEL, type: 'sine' },
      { at: 0.05, hz: 1318, seconds: 0.045, level: LEVEL, type: 'sine' },
      { at: 0.1, hz: 1760, seconds: 0.06, level: LEVEL, type: 'sine' },
    ],
  },
  deny: {
    tones: [
      { at: 0, hz: 523, seconds: 0.09, level: LEVEL * 0.8, type: 'triangle' },
      { at: 0.1, hz: 349, seconds: 0.14, level: LEVEL * 0.8, type: 'triangle' },
    ],
  },
  page: {
    tones: [
      { at: 0, hz: 988, seconds: 0.035, level: LEVEL, type: 'sine' },
      { at: 0.04, hz: 1319, seconds: 0.035, level: LEVEL, type: 'sine' },
      { at: 0.08, hz: 1976, seconds: 0.05, level: LEVEL, type: 'sine' },
    ],
  },
  alert: {
    tones: [0, 1, 2, 3].map((i) => ({
      at: i * 0.12,
      hz: i % 2 ? 784 : 1046,
      seconds: 0.11,
      level: LEVEL * 0.9,
      type: 'triangle' as const,
    })),
  },
};

/** The synthesised answer to a touch (every touch surface's, unless it has its own). */
export const synthTouchSound = (sound: UiSound): SoundRecipe =>
  TOUCH_BLEEPS[sound];
