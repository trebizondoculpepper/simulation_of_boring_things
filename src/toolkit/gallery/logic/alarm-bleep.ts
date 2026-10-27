/**
 * The bridge's alarm bleep (the owner, 2026-10-27: "when we have an alert
 * or an alarm running, there should be a more persistent, more regular
 * bleeping, like every 10 seconds, the sound should come from the center
 * console where I have to clear the alarm"): while any alarm is
 * unaccepted and the walker is on the bridge, a two-tone bleep from
 * Central Control at once and then every `every` seconds; it stops on
 * ACCEPT, and starts again at once when a new alarm comes in. Pure.
 */

export const ALARM_BLEEP = {
  /** Seconds between bleeps. */
  every: 10,
  /** Its tones: a high-low pair, twice, louder than the consoles' chatter. */
  tones: [0, 1, 2, 3].map((i) => ({
    at: Math.floor(i / 2) * 0.42 + (i % 2) * 0.16,
    hz: i % 2 ? 1047 : 1397,
    seconds: 0.14,
    level: 0.1,
    type: 'triangle' as const,
  })),
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
