/**
 * The piezo beep library (mission 100): one cheap piezo sounder behind a
 * panel, synthesised from scratch by `resources/sound/effects/piezo/
 * generate.py`, one file for every pitch, meaning and room. Which file
 * is which, which meanings loop and how long their cycles are, and how
 * loud each kind of event is played. Pure: the files' URLs are the audio
 * side's (`audio/piezo-recordings.ts`).
 *
 * Every file is equally loud while it sounds, and each room's version as
 * loud as the dry one with its tail added, so no per-file balancing is
 * needed: the caller gives its event's level (`PIEZO_LEVELS`).
 */

/**
 * The frequency the sounder is driven at: `low` (1.3 kHz, off resonance:
 * nasal, buzzy), `mid` (2.4 kHz: fuller, a little rough) or `high` (3.9
 * kHz, on resonance: nearly pure, piercing).
 */
export const PIEZO_PITCHES = ['low', 'mid', 'high'] as const;
export type PiezoPitch = (typeof PIEZO_PITCHES)[number];

/** The reverb rendered in: the room the device stands in, not the listener's. */
export const PIEZO_ROOMS = ['dry', 'small', 'large'] as const;
export type PiezoRoom = (typeof PIEZO_ROOMS)[number];

/** The cadences played once (`partAudio.play`). */
export const PIEZO_ONE_SHOTS = [
  /** One 35 ms chirp: a key pressed, a card presented. */
  'entry',
  /** Two 70 ms beeps: a value stored, a command accepted, a card accepted. */
  'confirm',
  /** One 0.3 s beep: a longer action finished, a mode change completed. */
  'done',
  /** Three 90 ms beeps: a key not allowed now, a limit reached. */
  'error',
  /** One 0.55 s tone: a wrong code, a card refused, LOCAL CONTROL ONLY. */
  'deny',
  /** One 0.15 s beep after 50 ms of silence: a controller online after its self-test. */
  'ready',
  /** Three 0.15 s beeps, 0.15 s apart: a controller's fault. */
  'fault',
  /** IEC 60601-1-8's high-priority burst of ten pulses: a grave alarm, repeated by the caller. */
  'priority-high',
  /** Three 0.2 s pulses: a caution, repeated by the caller. */
  'priority-medium',
] as const;
export type PiezoOneShot = (typeof PIEZO_ONE_SHOTS)[number];

/** The cadences held as seamless loops (`partAudio.hold`), and each one's cycle, seconds. */
export const PIEZO_LOOP_CYCLES = {
  /** One 60 ms beep a second: an entry or exit delay, a timed action. */
  countdown: 1,
  /** One 60 ms beep every 0.25 s: the last seconds of a countdown. */
  hurry: 1,
  /** 0.25 s on, 0.25 s off: a condition needing attention. */
  warning: 1,
  /** A warble, 62.5 ms at the pitch and 62.5 ms at 0.84 of it: an alarm until silenced. */
  alarm: 0.25,
} as const;
export type PiezoLoopMeaning = keyof typeof PIEZO_LOOP_CYCLES;
export const PIEZO_LOOPS = Object.keys(
  PIEZO_LOOP_CYCLES,
) as readonly PiezoLoopMeaning[];

/** Every meaning, one-shots then loops. */
export const PIEZO_MEANINGS = [...PIEZO_ONE_SHOTS, ...PIEZO_LOOPS] as const;
export type PiezoMeaning = PiezoOneShot | PiezoLoopMeaning;

/** Whether `meaning` is held as a loop. */
export const piezoLoops = (
  meaning: PiezoMeaning,
): meaning is PiezoLoopMeaning => meaning in PIEZO_LOOP_CYCLES;

/** The file's name, `piezo_<meaning>_<pitch>_<room>.mp3`. */
export const piezoFile = (
  meaning: PiezoMeaning,
  pitch: PiezoPitch,
  room: PiezoRoom,
): string => `piezo_${meaning}_${pitch}_${room}.mp3`;

/**
 * How loud each meaning is played, a share of the file's full level: a
 * key's chirp quieter than an alarm. The files sound at about −8 dB
 * K-weighted, so 0.12 is about as loud as the old `BEEP` (a 2700 Hz sine
 * at 0.04).
 */
export const PIEZO_LEVELS: Record<PiezoMeaning, number> = {
  entry: 0.12,
  confirm: 0.14,
  done: 0.14,
  ready: 0.14,
  error: 0.16,
  deny: 0.16,
  fault: 0.18,
  countdown: 0.14,
  hurry: 0.16,
  warning: 0.2,
  'priority-medium': 0.22,
  alarm: 0.24,
  'priority-high': 0.26,
};

/** A device's own sounder: its pitch and the room it stands in, set where it is built. */
export interface PiezoVoice {
  pitch?: PiezoPitch;
  room?: PiezoRoom;
  /** Its event's level, instead of `PIEZO_LEVELS`'. */
  level?: number;
}

/** What a voice comes to, its defaults filled: `high`, `dry`, its meaning's level. */
export const piezoChoice = (
  meaning: PiezoMeaning,
  voice: PiezoVoice = {},
): { file: string; level: number } => ({
  file: piezoFile(meaning, voice.pitch ?? 'high', voice.room ?? 'dry'),
  level: Math.max(0, Math.min(1, voice.level ?? PIEZO_LEVELS[meaning])),
});
