import {
  ALARM_SOUND,
  LEVELS,
} from '../../components/sound/logic/console-sounds';

/**
 * The bridge's alarm bleep (the owner, 2026-10-27: "when we have an alert
 * or an alarm running, there should be a more persistent, more regular
 * bleeping, like every 10 seconds, the sound should come from the center
 * console where I have to clear the alarm"): while any alarm is
 * unaccepted and the walker is on the bridge, the owner's `amber_alert`
 * console sound, resynthesised (`console-sounds.ts`, `ALARM_SOUND`), from
 * Central Control at once and then every `every` seconds; it stops on
 * ACCEPT, and starts again at once when a new alarm comes in. Pure.
 */

export const ALARM_BLEEP = {
  /** Seconds between bleeps. */
  every: 10,
  /** Its file (the owner's, 2026-10-27: no synthesised tones). */
  sound: ALARM_SOUND,
  /** Its level, a share of the reference loudness: well above the chatter. */
  level: LEVELS.alarm,
} as const;

export function createAlarmBleep(every: number = ALARM_BLEEP.every) {
  let active = false;
  /** Seconds to the next bleep; 0 to bleep at once. */
  let left = 0;
  return {
    /** Whether the walker is on the bridge to hear it. */
    setActive(on: boolean) {
      active = on;
      if (!on) left = 0;
    },
    /** `delta` seconds on, with or without an unaccepted alarm: whether to bleep now. */
    step(delta: number, unaccepted: boolean): boolean {
      if (!active || !unaccepted) {
        left = 0;
        return false;
      }
      left -= delta;
      if (left > 1e-9) return false;
      left = every;
      return true;
    },
  };
}
