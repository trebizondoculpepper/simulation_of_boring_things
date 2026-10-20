/**
 * An alarm annunciator's sequence (ISA 18.1, sequence A): a window whose
 * alarm comes in flashes until it is acknowledged, then burns steady
 * until its alarm clears, then goes dark. An alarm that clears before it
 * is acknowledged keeps flashing until it is, so no alarm passes unseen.
 * TEST lights every window while it is held.
 *
 * With `manualReset` it follows ISA sequence M instead: an acknowledged
 * window stays lit steady after its alarm clears, until RESET puts it out,
 * so the operator sees what tripped; RESET does nothing to a window whose
 * alarm is still present.
 */

export type WindowState = 'off' | 'flashing' | 'steady';

export interface Annunciator {
  /** Each window's state, before TEST. */
  readonly states: readonly WindowState[];
  /** Feed each window's alarm condition; call every step. */
  sense(alarms: readonly boolean[]): void;
  /**
   * Acknowledge: flashing windows go steady, or dark if clear; only those
   * in `windows`, if given.
   */
  acknowledge(windows?: readonly number[]): void;
  /** Put out acknowledged windows whose alarms have cleared (sequence M). */
  reset(): void;
  /** Whether TEST is held. */
  test: boolean;
  /** What each window shows now: lit, and whether it is in its flash. */
  lit(seconds: number): boolean[];
}

/** How many times a second a flashing window blinks. */
export const FLASH_HZ = 2.5;

export function createAnnunciator(
  windows: number,
  { manualReset = false } = {},
): Annunciator {
  const states: WindowState[] = Array.from({ length: windows }, () => 'off');
  const alarmed: boolean[] = Array.from({ length: windows }, () => false);
  return {
    states,
    test: false,
    sense(alarms) {
      for (let i = 0; i < windows; i++) {
        const on = alarms[i] ?? false;
        if (on && !alarmed[i] && states[i] === 'off') states[i] = 'flashing';
        if (!on && states[i] === 'steady' && !manualReset) states[i] = 'off';
        alarmed[i] = on;
      }
    },
    acknowledge(which) {
      for (let i = 0; i < windows; i++)
        if (states[i] === 'flashing' && (!which || which.includes(i)))
          states[i] = alarmed[i] || manualReset ? 'steady' : 'off';
    },
    reset() {
      for (let i = 0; i < windows; i++)
        if (states[i] === 'steady' && !alarmed[i]) states[i] = 'off';
    },
    lit(seconds) {
      const blink = Math.floor(seconds * FLASH_HZ * 2) % 2 === 0;
      return states.map(
        (state) =>
          this.test || state === 'steady' || (state === 'flashing' && blink),
      );
    },
  };
}
