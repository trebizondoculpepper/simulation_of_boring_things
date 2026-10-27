import type { BootPhase, UiSound } from '../../../../ui2d';

/**
 * The bridge's console sounds (the owner, 2026-10-27): the owner's own
 * console sounds, resynthesised (`resources/sound/effects/
 * resynthesized_bloops/`), heard as the consoles are touched, as their
 * displays boot, and as they chatter to themselves. Which file answers
 * which event, at what level, and how a room of displays booting at once
 * is kept from piling the same file up at the same instant. Pure: the
 * files' URLs are the audio side's (`audio/console-recordings.ts`).
 */

/** The resynthesised files, by name (each `<name>.mp3`). */
export type ConsoleSound =
  | 'ack_trill'
  | 'actioning'
  | 'amber_alert'
  | 'coming_out_of_warp'
  | 'component_failure'
  | 'correct_entry'
  | 'enemy_launch_detected'
  | 'engines_online'
  | 'inbound_call'
  | 'lock_out'
  | 'look_here'
  | 'now_online'
  | 'processing'
  | 'small_fault'
  | 'system_booting_up'
  | 'system_crash_failure'
  | 'transporter_activating'
  | 'urgent_alert'
  | 'we_are_being_hailed';

/** The files used so far (the alarm-like rest but `amber_alert` are kept for later). */
export const USED_SOUNDS = [
  'ack_trill',
  'actioning',
  'amber_alert',
  'coming_out_of_warp',
  'correct_entry',
  'engines_online',
  'lock_out',
  'look_here',
  'now_online',
  'processing',
  'system_booting_up',
  'we_are_being_hailed',
] as const satisfies readonly ConsoleSound[];
export type UsedSound = (typeof USED_SOUNDS)[number];

/**
 * Each used file's loudness: its mean level and its peak, dBFS (measured
 * with ffmpeg's volumedetect, 2026-10-27). Some are much quieter than
 * others (correct_entry about 17 dB under lock_out), so each is brought
 * to one loudness (`balanced`) before its event's level is applied.
 */
export const LOUDNESS: Record<UsedSound, { mean: number; peak: number }> = {
  ack_trill: { mean: -29.6, peak: -14.9 },
  actioning: { mean: -25.1, peak: -10.2 },
  amber_alert: { mean: -19.0, peak: -6.5 },
  coming_out_of_warp: { mean: -19.5, peak: -6.3 },
  correct_entry: { mean: -30.1, peak: -15.4 },
  engines_online: { mean: -22.3, peak: -8.2 },
  lock_out: { mean: -13.4, peak: -0.7 },
  look_here: { mean: -18.4, peak: -6.2 },
  now_online: { mean: -14.1, peak: -3.5 },
  processing: { mean: -18.6, peak: -0.4 },
  system_booting_up: { mean: -28.2, peak: -11.1 },
  we_are_being_hailed: { mean: -17.7, peak: -6.2 },
};

/** The mean level every file is brought to, dBFS. */
export const REFERENCE_DB = -20;

/**
 * The gain that plays `name` at `level` (a share of the reference
 * loudness): brought to `REFERENCE_DB` by its mean, never past full scale
 * at its peak.
 */
export function balanced(name: UsedSound, level: number): number {
  const { mean, peak } = LOUDNESS[name];
  const gain = Math.min(10 ** ((REFERENCE_DB - mean) / 20), 10 ** (-peak / 20));
  return gain * level;
}

/**
 * Each event's level, a share of the reference loudness: a touch about
 * as loud as the synthesised bleeps it replaces; each display's boot
 * cues quiet, there being some 25 of them; the main viewscreen's above
 * them; the chatter soft, from across the room; the alarm sounder well
 * above the chatter and a touch, to be heard across the bridge; a card
 * reader's accepted read about as a touch.
 */
export const LEVELS = {
  touch: 0.35,
  bootEach: 0.16,
  bootMain: 0.45,
  chatter: 0.25,
  alarm: 0.7,
  cardRead: 0.3,
} as const;

/**
 * The alarm sounder's file (the owner, 2026-10-27: "the dismissable alarm
 * noise"): heard from Central Control while any alarm is unaccepted, every
 * 10 s until ACCEPT (`gallery/logic/alarm-bleep.ts`). The world's alarms
 * are of one kind, so one file; `urgent_alert` is kept for a graver class
 * should the annunciator ever distinguish one.
 */
export const ALARM_SOUND: UsedSound = 'amber_alert';

/** A card reader's accepted read, on the bridge's doors: an accepted entry. */
export const CARD_READ_SOUND: UsedSound = 'correct_entry';

/**
 * Which files answer a touch, by the sound the press asks for: an
 * ordinary press, one of a couple so repeated presses differ; a command
 * carried out, an accepted entry; alarms accepted, a trill; a refusal
 * (LOCAL CONTROL ONLY, NOT YET MODELLED, a lock-out); a page change.
 */
export const TOUCH_SOUNDS: Record<UiSound, readonly UsedSound[]> = {
  confirm: ['processing', 'actioning'],
  done: ['correct_entry'],
  ack: ['ack_trill'],
  deny: ['lock_out'],
  page: ['look_here'],
  alert: ['look_here'],
};

/** The chatter's neutral set (never the alarm-like ones). */
export const CHATTER_SOUNDS: readonly UsedSound[] = [
  'ack_trill',
  'actioning',
  'processing',
  'correct_entry',
  'look_here',
  'now_online',
  'coming_out_of_warp',
  'we_are_being_hailed',
];

/**
 * What a display's boot is heard to say: only as its interface starts up,
 * drawing in after the emblem and the black (the owner, 2026-10-27: "the
 * boot noises should play when the LCARS interface starts up, and not when
 * the boot sequence starts"); the power rising and the emblem are silent.
 */
export const BOOT_SOUNDS = {
  /** Each display's interface starting up. */
  drawIn: ['now_online', 'processing', 'correct_entry', 'ack_trill'],
  /** The main viewscreen's interface starting up. */
  mainDrawIn: 'engines_online',
} as const satisfies {
  drawIn: readonly UsedSound[];
  mainDrawIn: UsedSound;
};

/**
 * A chooser among files: at random from `options`, never the one it gave
 * last from the same list when it has another.
 */
export function createPicker(random: () => number) {
  const last = new Map<readonly UsedSound[], UsedSound>();
  return (options: readonly UsedSound[]): UsedSound => {
    const before = last.get(options);
    const pool =
      options.length > 1 && before
        ? options.filter((o) => o !== before)
        : options;
    const pick = pool[Math.floor(random() * pool.length)];
    last.set(options, pick);
    return pick;
  };
}

/** The files a display's boot phase asks for: only as its interface starts to draw in. */
export function bootCue(
  phase: BootPhase,
  main: boolean,
): readonly UsedSound[] | null {
  if (phase !== 'draw') return null;
  return main ? [BOOT_SOUNDS.mainDrawIn] : BOOT_SOUNDS.drawIn;
}

/** The gaps a room's boot cues keep, seconds: between any two, and between two of the same file. */
export const BOOT_GAPS = { any: 0.3, same: 0.9 } as const;

/**
 * The gate a room's boot cues pass (the owner, 2026-10-27: some 25
 * displays booting within a few seconds): a cue is let through only if
 * none was heard in the last `any` seconds, nor the same file in the last
 * `same`; any other is dropped, not delayed. `always` cues (the main
 * viewscreen's) pass regardless, and still count.
 */
export function createCueGate(gaps: { any: number; same: number } = BOOT_GAPS) {
  let lastAny = -Infinity;
  const lastOf = new Map<UsedSound, number>();
  return (name: UsedSound, now: number, always = false): boolean => {
    const ok =
      always ||
      (now - lastAny >= gaps.any &&
        now - (lastOf.get(name) ?? -Infinity) >= gaps.same);
    if (ok) {
      lastAny = now;
      lastOf.set(name, now);
    }
    return ok;
  };
}
