import { PC_POST_CUE, computerCueSound } from './computer-cues';
import { tone } from '../../core/audio/part-audio';

/**
 * How loud a screen's ready beep is: clear over the machine's own hum
 * (its tones play at 0.045 to 0.07), as a little speaker on a board would
 * be, even through a closed door.
 */
export const READY_BEEP_LEVEL = 0.06;

/**
 * The beep a screen gives once it has booted, after its POST: the PC POST
 * cue (`src/toolkit/components/sound/audio/computer-cues.ts`), a short square-wave check, at `hz`.
 */
export const bootBeep = (hz: number) =>
  tone({ hz, seconds: 0.11, level: READY_BEEP_LEVEL, type: 'square' });

/** The operator terminal's ready signal: the PC POST cue itself, as loud. */
export const postBeep = computerCueSound(
  PC_POST_CUE,
  READY_BEEP_LEVEL / PC_POST_CUE.notes[0].level,
);
