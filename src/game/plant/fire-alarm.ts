/**
 * A minimal fire alarm (the owner, 2026-10-26), the start of prompt 053's:
 * resettable manual call points, each latched when pressed until its key
 * resets it; while any is latched, its zone's sounders sound and its
 * beacons flash. Two zones so far, the wet hall's and the loading dock's.
 */

/** The call points, by id, and the zone each is in. */
export const CALL_POINTS = {
  'wh-mcp-1': 'wet_hall',
  'wh-mcp-2': 'wet_hall',
  'wh-mcp-3': 'wet_hall',
  // The loading dock's (prompt 073): by the corridor's doors and the acid
  // store's.
  'lb-mcp-1': 'loading_bay',
  'lb-mcp-2': 'loading_bay',
} as const;

export type CallPointId = keyof typeof CALL_POINTS;
export type FireZone = (typeof CALL_POINTS)[CallPointId];

export interface FireAlarmState {
  /** Each call point latched (pressed and not yet reset). */
  latched: Record<CallPointId, boolean>;
}

export type FireAlarmAction =
  | { act: 'press'; point: CallPointId }
  | { act: 'reset'; point: CallPointId };

export function newFireAlarm(): FireAlarmState {
  return {
    latched: Object.fromEntries(
      Object.keys(CALL_POINTS).map((id) => [id, false]),
    ) as Record<CallPointId, boolean>,
  };
}

export function actOnFireAlarm(
  state: FireAlarmState,
  action: FireAlarmAction,
): FireAlarmState {
  return {
    latched: { ...state.latched, [action.point]: action.act === 'press' },
  };
}

/** Whether a zone is in alarm: any of its call points latched. */
export function zoneInAlarm(state: FireAlarmState, zone: FireZone): boolean {
  return (Object.keys(CALL_POINTS) as CallPointId[]).some(
    (id) => CALL_POINTS[id] === zone && state.latched[id],
  );
}
