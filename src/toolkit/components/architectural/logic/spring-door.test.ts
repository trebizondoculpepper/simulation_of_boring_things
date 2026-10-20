import { describe, expect, it } from 'vite-plus/test';
import {
  DOOR_CLOSE_SECONDS,
  DOOR_DWELL_SECONDS,
  DOOR_OPEN_ANGLE,
  DOOR_OPEN_SECONDS,
  createSpringDoor,
} from './spring-door';

const run = (
  door: ReturnType<typeof createSpringDoor>,
  s: number,
  held = false,
) => {
  for (let t = 0; t < s; t += 1 / 60) door.step(1 / 60, held);
};

describe('a double-action spring door', () => {
  it('swings open away from whoever pushes it, either way', () => {
    const door = createSpringDoor();
    expect(door.open).toBe(false);
    door.push(1);
    expect(door.open).toBe(true);
    run(door, DOOR_OPEN_SECONDS + 0.1);
    expect(door.angle).toBeCloseTo(DOOR_OPEN_ANGLE);
    const other = createSpringDoor();
    other.push(-1);
    run(other, DOOR_OPEN_SECONDS + 0.1);
    expect(other.angle).toBeCloseTo(-DOOR_OPEN_ANGLE);
  });

  it('eases shut slowly on its spring once let go', () => {
    const door = createSpringDoor();
    door.push(1);
    run(door, DOOR_OPEN_SECONDS + DOOR_DWELL_SECONDS + 0.2);
    expect(door.angle).toBeGreaterThan(DOOR_OPEN_ANGLE * 0.9);
    run(door, DOOR_CLOSE_SECONDS * 0.4);
    expect(door.angle).toBeGreaterThan(0);
    expect(door.angle).toBeLessThan(DOOR_OPEN_ANGLE * 0.9);
    run(door, DOOR_CLOSE_SECONDS * 2);
    expect(door.angle).toBe(0);
    expect(door.open).toBe(false);
  });

  it('stays open while someone stands in its doorway', () => {
    const door = createSpringDoor();
    door.push(1);
    run(
      door,
      DOOR_OPEN_SECONDS + DOOR_DWELL_SECONDS + DOOR_CLOSE_SECONDS * 2,
      true,
    );
    expect(door.angle).toBeCloseTo(DOOR_OPEN_ANGLE);
  });

  it('snaps shut at once', () => {
    const door = createSpringDoor();
    door.push(-1);
    run(door, 0.3);
    door.snapShut();
    expect(door.angle).toBe(0);
    expect(door.open).toBe(false);
  });
});
