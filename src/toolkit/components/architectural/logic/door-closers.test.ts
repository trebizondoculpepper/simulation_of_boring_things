import { describe, expect, it } from 'vite-plus/test';
import {
  CLOSER,
  RISING_BUTT,
  SINGLE_ACTION_OPEN,
  createOverheadCloser,
  createRisingButtDoor,
} from './door-closers';

/** Run a door until it shuts, at 60 frames a second; the seconds it took. */
const untilShut = (door: { step(dt: number): unknown; angle: number }) => {
  let t = 0;
  while (door.angle > 0 && t < 30) {
    door.step(1 / 60);
    t += 1 / 60;
  }
  return t;
};
const openFully = (door: { push(): void; step(dt: number): unknown }) => {
  door.push();
  for (let i = 0; i < 60; i++) door.step(1 / 60);
};

describe('an overhead door closer', () => {
  it('opens when pushed, and closes on its own in about its two times', () => {
    const door = createOverheadCloser();
    openFully(door);
    expect(door.angle).toBeLessThan(SINGLE_ACTION_OPEN);
    const t = untilShut(door);
    expect(door.phase).toBe('shut');
    expect(t).toBeGreaterThan(CLOSER.latchSeconds + 0.5 * CLOSER.sweepSeconds);
    expect(t).toBeLessThan(CLOSER.latchSeconds + CLOSER.sweepSeconds + 0.5);
  });

  it('closes slower over its last degrees, and latches once', () => {
    const door = createOverheadCloser();
    openFully(door);
    // Sweep: how far a tenth of a second takes it at 45°.
    while (door.angle > Math.PI / 4) door.step(1 / 60);
    const a = door.angle;
    door.step(0.1);
    const sweep = a - door.angle;
    while (door.angle > CLOSER.latchAngle / 2) door.step(1 / 60);
    const b = door.angle;
    const event = door.step(0.1);
    const latch = b - door.angle;
    expect(event).toBeNull();
    expect(latch).toBeLessThan(sweep / 2);
    const events: unknown[] = [];
    for (let i = 0; i < 300; i++) events.push(door.step(1 / 60));
    expect(events.filter((e) => e === 'latch')).toHaveLength(1);
  });

  it('waits while someone stands in the doorway', () => {
    const door = createOverheadCloser();
    openFully(door);
    door.hold(true);
    const a = door.angle;
    for (let i = 0; i < 300; i++) door.step(1 / 60);
    expect(door.angle).toBe(a);
    door.hold(false);
    expect(untilShut(door)).toBeLessThan(10);
  });
});

describe('a door on rising butts', () => {
  it('rises as it opens, by the helix, and settles as it shuts', () => {
    const door = createRisingButtDoor();
    expect(door.lift).toBe(0);
    openFully(door);
    expect(door.lift).toBeGreaterThan(RISING_BUTT.lift * 0.8);
    expect(door.lift).toBeLessThanOrEqual(RISING_BUTT.lift);
    untilShut(door);
    expect(door.lift).toBe(0);
  });

  it('closes quicker than the closer, with a knock and no bounce', () => {
    const butt = createRisingButtDoor();
    const closer = createOverheadCloser();
    openFully(butt);
    openFully(closer);
    const events: unknown[] = [];
    let t = 0;
    while (butt.angle > 0 && t < 30) {
      events.push(butt.step(1 / 60));
      t += 1 / 60;
    }
    expect(t).toBeLessThan(untilShut(closer));
    expect(events.filter((e) => e === 'knock')).toHaveLength(1);
    for (let i = 0; i < 120; i++) butt.step(1 / 60);
    expect(butt.angle).toBe(0);
  });
});
