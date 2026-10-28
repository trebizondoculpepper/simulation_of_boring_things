/**
 * A location's annunciator (mission 099; the owner, 2026-10-28: "an
 * annunciator for each major location"): the windows of one place's
 * faults, the lounge pool's, the Olympic's, the wet hall's, each shown on
 * a board in its own place and on its twin in the old control room, one
 * state in the world for both, so ACCEPT or RESET at either is done at
 * both. The sequence every one of them follows, over its own list of
 * alarms. Pure.
 *
 * ISA sequence M with first-out: an alarm coming in flashes until it is
 * accepted, then burns steady; an accepted window whose alarm has cleared
 * stays lit until RESET, so the operator sees what tripped; an alarm that
 * clears before it is accepted keeps flashing until it is, so none passes
 * unseen; and the first alarm to come in while every window was dark is
 * the first-out, its window flashing faster than the rest, so a cascade
 * (a pump trip, then low flow, then the dosing inhibited) shows what
 * began it.
 */

export type LocationWindow = 'off' | 'flashing' | 'steady';

export interface LocationAnnunciatorState<Id extends string = string> {
  windows: Record<Id, LocationWindow>;
  present: Record<Id, boolean>;
  /** The first alarm in while every window was dark, until its window goes out. */
  firstOut: Id | null;
}

const each = <Id extends string, T>(ids: readonly Id[], value: T) =>
  Object.fromEntries(ids.map((id) => [id, value])) as Record<Id, T>;

/** Every window dark, no alarm present. */
export const newLocationAnnunciator = <Id extends string>(
  ids: readonly Id[],
): LocationAnnunciatorState<Id> => ({
  windows: each<Id, LocationWindow>(ids, 'off'),
  present: each(ids, false),
  firstOut: null,
});

/**
 * The alarms present now (`present`, in the order they are listed, which
 * decides the first-out in a tie): a dark window whose alarm comes in
 * starts flashing. The same state back when nothing has changed.
 */
export function senseLocationAlarms<Id extends string>(
  ids: readonly Id[],
  state: LocationAnnunciatorState<Id>,
  present: readonly Id[],
): LocationAnnunciatorState<Id> {
  const allDark = ids.every((id) => (state.windows[id] ?? 'off') === 'off');
  const newcomers = present.filter((id) => !state.present[id]);
  let changed = false;
  const windows = { ...state.windows };
  const was = { ...state.present };
  let firstOut = state.firstOut;
  for (const id of ids) {
    const on = present.includes(id);
    if (on && !was[id] && (windows[id] ?? 'off') === 'off') {
      windows[id] = 'flashing';
      if (allDark && !firstOut) firstOut = newcomers[0] ?? id;
      changed = true;
    }
    if (on !== Boolean(was[id])) {
      was[id] = on;
      changed = true;
    }
  }
  return changed ? { windows, present: was, firstOut } : state;
}

/** ACCEPT: flashing windows go steady. */
export function acceptLocationAlarms<Id extends string>(
  ids: readonly Id[],
  state: LocationAnnunciatorState<Id>,
): LocationAnnunciatorState<Id> {
  if (!ids.some((id) => state.windows[id] === 'flashing')) return state;
  const windows = { ...state.windows };
  for (const id of ids) if (windows[id] === 'flashing') windows[id] = 'steady';
  return { ...state, windows };
}

/** RESET: accepted windows whose alarms have cleared go dark; the first-out with its window. */
export function resetLocationAlarms<Id extends string>(
  ids: readonly Id[],
  state: LocationAnnunciatorState<Id>,
): LocationAnnunciatorState<Id> {
  const which = ids.filter(
    (id) => state.windows[id] === 'steady' && !state.present[id],
  );
  if (!which.length) return state;
  const windows = { ...state.windows };
  for (const id of which) windows[id] = 'off';
  const firstOut =
    state.firstOut && windows[state.firstOut] !== 'off' ? state.firstOut : null;
  return { ...state, windows, firstOut };
}
