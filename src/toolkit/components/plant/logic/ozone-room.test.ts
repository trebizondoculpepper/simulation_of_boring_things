import { describe, expect, it } from 'vite-plus/test';
import { OFF, ozoneRoom } from './ozone-room';

/** Run the room on for `seconds`, a frame at a time. */
const run = (room: ReturnType<typeof ozoneRoom>, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.25) room.step(0.25);
  return room.shown();
};

describe('the ozone room, as its machines work it', () => {
  it('is dark until its mains is on, waits for START, then makes ozone', () => {
    const room = ozoneRoom();
    expect(run(room, 5).powered).toBe(false);
    room.generatorControls.mains(true);
    const waiting = run(room, 5);
    expect(waiting.producing).toBe(false);
    expect(waiting.message[1]).toBe('STANDBY');
    room.generatorControls.start();
    const running = run(room, 30);
    expect(running.producing).toBe(true);
    expect(running.output).toBeCloseTo(160, 0);
    expect(running.booster).toBe(0);
    expect(running.vacuum).toBeLessThan(0);
    expect(running.residualAfter).toBeLessThan(0.05);
  });

  it('follows its output setting', () => {
    const room = ozoneRoom();
    room.generatorControls.mains(true);
    room.generatorControls.start();
    room.generatorControls.setpoint(0.5);
    expect(run(room, 30).output).toBeCloseTo(80, 0);
  });

  it('stops with the booster OFF, and runs again in AUTO', () => {
    const room = ozoneRoom();
    room.generatorControls.mains(true);
    room.generatorControls.start();
    run(room, 30);
    room.booster(OFF);
    const off = run(room, 5);
    expect(off.producing).toBe(false);
    expect(off.booster).toBe(1);
    room.booster(2);
    expect(run(room, 5).producing).toBe(true);
  });

  it('trips on its cabinet door, shows the code, and RESET restarts it once shut', () => {
    const room = ozoneRoom();
    room.generatorControls.mains(true);
    room.generatorControls.start();
    run(room, 30);
    room.fault('doorOpen', true);
    const open = run(room, 3);
    expect(open.tripped).toBe(true);
    expect(open.message[1]).toBe('E5 DOOR OPEN');
    room.fault('doorOpen', false);
    expect(run(room, 3).tripped).toBe(true);
    room.generatorControls.reset();
    expect(run(room, 5).producing).toBe(true);
  });

  it('a leaking joint fills the room until the monitor stops the plant', () => {
    const room = ozoneRoom();
    room.generatorControls.mains(true);
    room.generatorControls.start();
    run(room, 30);
    room.fault('leak', true);
    let shown = run(room, 1);
    for (let i = 0; i < 3600 && !shown.roomAlarm; i++) shown = run(room, 1);
    expect(shown.roomAlarm).toBe(true);
    expect(shown.roomPpm).toBeGreaterThanOrEqual(0.2);
    expect(run(room, 5).producing).toBe(false);
  });
});
