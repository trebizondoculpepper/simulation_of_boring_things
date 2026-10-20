import type { SoundRecipe, Tone } from '../../core/audio/part-audio';

export type ComputerCue = {
  id: string;
  name: string;
  caption: string;
  notes: (Tone & { at: number })[];
};

const note = (
  at: number,
  hz: number,
  seconds: number,
  type: OscillatorType,
  level = 0.014,
) => ({ at, hz, seconds, type, level });

/** Chosen for the Automation Control operator terminal's ready signal. */
export const PC_POST_CUE: ComputerCue = {
  id: 'pc-post',
  name: 'PC POST',
  caption: 'Short square-wave check',
  notes: [note(0, 880, 0.11, 'square', 0.018)],
};

/** Alternatives to audition before choosing the cabinet's ready sound. */
export const COMPUTER_CUES: readonly ComputerCue[] = [
  {
    id: 'rough-low',
    name: 'ROUGH LOW',
    caption: 'One coarse speaker buzz',
    notes: [note(0, 280, 0.16, 'sawtooth')],
  },
  {
    id: 'rough-deep',
    name: 'ROUGH DEEP',
    caption: 'Lower and longer',
    notes: [note(0, 220, 0.22, 'sawtooth')],
  },
  PC_POST_CUE,
  {
    id: 'pc-low',
    name: 'PC LOW',
    caption: 'Lower square speaker',
    notes: [note(0, 440, 0.18, 'square', 0.018)],
  },
  {
    id: 'dry-tick',
    name: 'DRY TICK',
    caption: 'Brief high processor tick',
    notes: [note(0, 1200, 0.055, 'square', 0.017)],
  },
  {
    id: 'double-tick',
    name: 'DOUBLE TICK',
    caption: 'Two equal short pulses',
    notes: [
      note(0, 950, 0.05, 'square', 0.017),
      note(0.12, 950, 0.05, 'square', 0.017),
    ],
  },
  {
    id: 'ascending',
    name: 'ASCENDING',
    caption: 'Two notes, ready',
    notes: [note(0, 520, 0.09, 'square'), note(0.1, 780, 0.12, 'square')],
  },
  {
    id: 'descending',
    name: 'DESCENDING',
    caption: 'Two notes, warning',
    notes: [note(0, 740, 0.09, 'sawtooth'), note(0.1, 370, 0.15, 'sawtooth')],
  },
  {
    id: 'soft-bloop',
    name: 'SOFT BLOOP',
    caption: 'Rounded terminal response',
    notes: [note(0, 620, 0.15, 'triangle', 0.035)],
  },
  {
    id: 'low-bloop',
    name: 'LOW BLOOP',
    caption: 'Soft descending response',
    notes: [
      note(0, 390, 0.11, 'triangle', 0.035),
      note(0.095, 260, 0.13, 'triangle', 0.035),
    ],
  },
  {
    id: 'dyad',
    name: 'DYAD',
    caption: 'Two pitches together',
    notes: [
      note(0, 330, 0.17, 'square', 0.012),
      note(0, 495, 0.17, 'square', 0.012),
    ],
  },
  {
    id: 'chord',
    name: 'CHORD',
    caption: 'Three pitches together',
    notes: [
      note(0, 300, 0.2, 'sawtooth', 0.008),
      note(0, 450, 0.2, 'sawtooth', 0.008),
      note(0, 600, 0.2, 'sawtooth', 0.008),
    ],
  },
];

/** A cue as a part's sound, its notes `gain` times as loud as auditioned. */
export const computerCueSound = (cue: ComputerCue, gain = 1): SoundRecipe => ({
  tones: cue.notes.map((n) => ({ ...n, level: n.level * gain })),
});
