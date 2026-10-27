import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../../../game/world';
import {
  CONTROL_ROOM_MODES,
  corridorDoorTo,
  modeAction,
  modeKnobPlace,
  modePosition,
  settledDoorTo,
} from './control-room-mode';
import { CORRIDOR_DOORS, MAIN_CORRIDOR } from './main-corridor';

const controlDoor = CORRIDOR_DOORS.find((d) => d.to === 'control_room')!;

describe('the CONTROL ROOM MODE knob', () => {
  it('starts at OLD: left alone, the control room doors lead to the old control room', () => {
    const world = newWorld();
    expect(world.controlRoomMode).toBe('old');
    expect(corridorDoorTo(controlDoor, world.controlRoomMode)).toBe(
      'control_room',
    );
  });

  it('routes the control room doors by the mode: OLD to the old control room, NEW to the bridge', () => {
    expect(corridorDoorTo(controlDoor, 'old')).toBe('control_room');
    expect(corridorDoorTo(controlDoor, 'new')).toBe('bridge');
  });

  it('leaves every other door of the ring to its own room, whatever the mode', () => {
    for (const d of CORRIDOR_DOORS.filter((d) => d !== controlDoor))
      for (const mode of CONTROL_ROOM_MODES)
        expect(corridorDoorTo(d, mode)).toBe(d.to);
  });

  it('sets the world as it is turned, and shows the world’s mode', () => {
    let world = newWorld();
    expect(modePosition(world.controlRoomMode)).toBe(0);
    world = applyAction(world, modeAction(1));
    expect(world.controlRoomMode).toBe('new');
    expect(modePosition(world.controlRoomMode)).toBe(1);
    expect(corridorDoorTo(controlDoor, world.controlRoomMode)).toBe('bridge');
    world = applyAction(world, modeAction(0));
    expect(world.controlRoomMode).toBe('old');
    expect(corridorDoorTo(controlDoor, world.controlRoomMode)).toBe(
      'control_room',
    );
  });

  it('changes nothing turned to where it already is', () => {
    const world = newWorld();
    expect(applyAction(world, modeAction(0))).toBe(world);
  });

  it('changes where the doors lead only while they are shut', () => {
    expect(settledDoorTo('control_room', 'bridge', false)).toBe('bridge');
    expect(settledDoorTo('control_room', 'bridge', true)).toBe('control_room');
    expect(settledDoorTo('bridge', 'bridge', true)).toBe('bridge');
  });

  it('stands on the doors’ wall beside their card reader, clear of the doorway, at hand height', () => {
    const k = modeKnobPlace(controlDoor);
    expect(k.wall).toBe(controlDoor.wall);
    // The reader's middle is 1.16 m from the doorway's; the knob just beyond it.
    expect(k.at - controlDoor.at).toBeGreaterThan(
      MAIN_CORRIDOR.opening / 2 + 0.3,
    );
    expect(k.at - controlDoor.at).toBeLessThan(2);
    expect(k.at).toBeLessThan(MAIN_CORRIDOR.side);
    expect(k.height).toBeGreaterThan(1);
    expect(k.height).toBeLessThan(1.5);
  });
});
