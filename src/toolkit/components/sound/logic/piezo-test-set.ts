import {
  PIEZO_MEANINGS,
  PIEZO_PITCHES,
  PIEZO_ROOMS,
  piezoLoops,
} from './piezo-beeps';
import type {
  PiezoLoopMeaning,
  PiezoMeaning,
  PiezoOneShot,
  PiezoPitch,
  PiezoRoom,
} from './piezo-beeps';

/**
 * The piezo test set in dev7 (mission 100): a 27 mm sounder on a bench
 * controller, three selectors (PITCH, MEANING, ROOM) and a TEST button,
 * so the whole library can be heard in the game. Its selectors' detents
 * to the library's axes, what TEST does, and what its readout says.
 */
export interface PiezoTestSetting {
  pitch: PiezoPitch;
  meaning: PiezoMeaning;
  room: PiezoRoom;
}

/** The setting at each selector's detent (0 up). */
export const piezoSetting = (
  pitch: number,
  meaning: number,
  room: number,
): PiezoTestSetting => ({
  pitch: PIEZO_PITCHES[clampIndex(pitch, PIEZO_PITCHES.length)],
  meaning: PIEZO_MEANINGS[clampIndex(meaning, PIEZO_MEANINGS.length)],
  room: PIEZO_ROOMS[clampIndex(room, PIEZO_ROOMS.length)],
});

const clampIndex = (i: number, n: number) =>
  Math.max(0, Math.min(n - 1, Math.round(i)));

/**
 * What a press of TEST does: a one-shot is played once (and lights TEST
 * for `seconds`); a loop is held, or let go if already held.
 */
export type PiezoTestAction =
  | { play: PiezoOneShot; seconds: number }
  | { hold: PiezoLoopMeaning }
  | { release: true };

/** A one-shot's TEST lamp: lit about as long as the beep sounds. */
const ONE_SHOT_SECONDS: Record<PiezoOneShot, number> = {
  entry: 0.15,
  confirm: 0.25,
  done: 0.35,
  error: 0.45,
  deny: 0.6,
  ready: 0.25,
  fault: 0.8,
  'priority-high': 2.5,
  'priority-medium': 0.95,
  startup: 1.15,
};

export const piezoTestPress = (
  meaning: PiezoMeaning,
  holding: boolean,
): PiezoTestAction => {
  if (!piezoLoops(meaning))
    return { play: meaning, seconds: ONE_SHOT_SECONDS[meaning] };
  return holding ? { release: true } : { hold: meaning };
};

/** The readout's two lines: the setting, and what the sounder is doing. */
export const piezoReadout = (
  setting: PiezoTestSetting,
  sounding: boolean,
): [string, string] => [
  `${setting.meaning.toUpperCase()}`,
  `${setting.pitch.toUpperCase()} ${setting.room.toUpperCase()} ${
    sounding ? (piezoLoops(setting.meaning) ? 'HOLD' : 'BEEP') : 'IDLE'
  }`,
];
