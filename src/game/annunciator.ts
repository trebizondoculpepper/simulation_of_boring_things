import { ANNUNCIATOR_ALARMS } from '../toolkit/gallery/logic/control-room-demo';
import type { AlarmId } from '../toolkit/gallery/logic/control-room-demo';

/**
 * The control room's alarm annunciator in the world (the owner,
 * 2026-10-27: "if I've cleared the alarm, when I return to the room, the
 * alarm should remain cleared ... and that should also clear it on the
 * annunciator consoles in the rest of the world"). One state for every
 * annunciator and console showing the plant's alarms (`ANNUNCIATOR_ALARMS`):
 * the old control room's board, the bridge's CR-CP2 and Central Control
 * and its viewscreen; ACCEPT or RESET at any of them is done for all, and
 * kept across rooms and reloads. Pure.
 *
 * ISA sequence M, as those boards had it: an alarm coming in flashes (and
 * sounds) until it is accepted, then burns steady; an accepted window whose
 * alarm has cleared stays lit until RESET puts it out, so the operator
 * sees what tripped; an alarm that clears before it is accepted keeps
 * flashing until it is, so none passes unseen. The world senses the
 * plant's alarms every step (`stepWorld`), whichever room the walker is in.
 */

export type AlarmWindow = 'off' | 'flashing' | 'steady';

export interface AnnunciatorState {
  /** Each alarm's window. */
  windows: Record<AlarmId, AlarmWindow>;
  /** Each alarm's condition when last sensed. */
  present: Record<AlarmId, boolean>;
}

const each = <T>(value: T) =>
  Object.fromEntries(ANNUNCIATOR_ALARMS.map((id) => [id, value])) as Record<
    AlarmId,
    T
  >;

export function newAnnunciator(): AnnunciatorState {
  return { windows: each<AlarmWindow>('off'), present: each(false) };
}

/**
 * The plant's alarms now (`present`, the ids that are in): a window whose
 * alarm comes in while it is dark starts flashing. The same state back
 * when nothing has changed.
 */
export function senseAlarms(
  state: AnnunciatorState,
  present: readonly AlarmId[],
): AnnunciatorState {
  let windows = state.windows;
  let was = state.present;
  for (const id of ANNUNCIATOR_ALARMS) {
    const on = present.includes(id);
    if (on && !was[id] && windows[id] === 'off') {
      if (windows === state.windows) windows = { ...windows };
      windows[id] = 'flashing';
    }
    if (on !== was[id]) {
      if (was === state.present) was = { ...was };
      was[id] = on;
    }
  }
  return windows === state.windows && was === state.present
    ? state
    : { windows, present: was };
}

/** ACCEPT: the flashing windows (only `alarms`, if given) go steady. */
export function acceptAlarms(
  state: AnnunciatorState,
  alarms?: readonly AlarmId[],
): AnnunciatorState {
  const which = ANNUNCIATOR_ALARMS.filter(
    (id) =>
      state.windows[id] === 'flashing' && (!alarms || alarms.includes(id)),
  );
  if (!which.length) return state;
  const windows = { ...state.windows };
  for (const id of which) windows[id] = 'steady';
  return { ...state, windows };
}

/** RESET: accepted windows whose alarms have cleared go dark. */
export function resetAlarms(state: AnnunciatorState): AnnunciatorState {
  const which = ANNUNCIATOR_ALARMS.filter(
    (id) => state.windows[id] === 'steady' && !state.present[id],
  );
  if (!which.length) return state;
  const windows = { ...state.windows };
  for (const id of which) windows[id] = 'off';
  return { ...state, windows };
}

/** The alarms not yet accepted: their windows flashing. */
export const unacceptedAlarms = (state: AnnunciatorState): AlarmId[] =>
  ANNUNCIATOR_ALARMS.filter((id) => state.windows[id] === 'flashing');
