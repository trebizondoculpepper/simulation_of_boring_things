import type { ControlRoomMode, WorldAction } from '../../../game/world';
import type { CorridorDoor } from './main-corridor';
import { MAIN_CORRIDOR } from './main-corridor';

/**
 * The CONTROL ROOM MODE knob (the owner, 2026-10-27): an old-fashioned
 * two-position rotary knob on the main corridor's wall beside the control
 * room doors, by their card reader, labelled in Dymo tape. At OLD (where
 * it starts, and where a player who ignores it leaves it) the doors lead
 * to the old control room; at NEW, to the bridge. An Easter egg. Pure.
 */

/** Its two positions, left to right, as its Dymo labels name them. */
export const CONTROL_ROOM_MODES: readonly ControlRoomMode[] = ['old', 'new'];

/** The knob's detent for a mode: 0 at OLD (left), 1 at NEW (right). */
export const modePosition = (mode: ControlRoomMode): 0 | 1 =>
  mode === 'new' ? 1 : 0;

/** What turning the knob to detent `position` asks of the world. */
export const modeAction = (position: number): WorldAction => ({
  type: 'control-room/mode',
  mode: position >= 1 ? 'new' : 'old',
});

/**
 * Where a corridor door leads, given the knob: the control room's doors
 * to the bridge at NEW, else the old control room; every other door to
 * its own room.
 */
export function corridorDoorTo(d: CorridorDoor, mode: ControlRoomMode) {
  return d.to === 'control_room' && mode === 'new' ? 'bridge' : d.to;
}

/**
 * Which room a doorway's joint should be registered to, given where it is
 * registered now and where the knob says: the knob's choice, but never
 * while the doors stand open (the room beyond is drawn through them), so
 * the room beyond changes only behind shut doors.
 */
export function settledDoorTo(
  registered: string,
  wanted: string,
  open: boolean,
): string {
  return open ? registered : wanted;
}

/**
 * Where the knob stands: on the control room doors' wall (the corridor's
 * east wall), just beyond the card reader to the right of the pair as the
 * corridor sees them (the reader 1.16 m from the doorway's middle), its
 * knob `height` above the floor, its plate clear above the dado (1.2 m).
 * `at` along the wall, as `CORRIDOR_DOORS`' `at`.
 */
export function modeKnobPlace(door: CorridorDoor) {
  return {
    wall: door.wall,
    at: door.at + MAIN_CORRIDOR.opening / 2 + 0.5,
    height: 1.4,
  };
}
