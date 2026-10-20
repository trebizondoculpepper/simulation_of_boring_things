import { describe, expect, it } from 'vite-plus/test';
import {
  inFront,
  jointOf,
  openJoint,
  registerJoint,
  throughDoor,
} from './door-joins';
import type { Joint } from './door-joins';

// A corridor door facing south (into the corridor, +z) at (10, -2), and a
// room's door facing east (into the room, +x) at (-5, 3).
const corridor = { x: 10, z: -2, yaw: 0 };
const room = { x: -5, z: 3, yaw: Math.PI / 2 };

describe('a doorway between two rooms drawn apart', () => {
  it('puts what is in front of one door behind the other', () => {
    // A metre into the corridor, facing the door (north).
    const p = throughDoor(corridor, room, { x: 10, z: -1, yaw: 0 });
    expect(inFront(corridor, 10, -1)).toBeCloseTo(1);
    expect(inFront(room, p.x, p.z)).toBeCloseTo(-1);
    // Still facing the doorway: into the room, east.
    expect(Math.sin(p.yaw)).toBeCloseTo(1);
    expect(Math.cos(p.yaw)).toBeCloseTo(0);
  });

  it('keeps a step to the side on the same side of the walker', () => {
    // Facing the door, a step to the corridor door's right (east)...
    const p = throughDoor(corridor, room, { x: 10.5, z: -1, yaw: 0 });
    // ...is, facing east into the room, still on the right: south.
    expect(p.z).toBeGreaterThan(room.z);
  });

  it('comes back the way it went', () => {
    const pose = { x: 9.3, z: -0.4, yaw: 0.7 };
    const there = throughDoor(corridor, room, pose);
    const back = throughDoor(room, corridor, there);
    expect(back.x).toBeCloseTo(pose.x);
    expect(back.z).toBeCloseTo(pose.z);
    expect(Math.cos(back.yaw - pose.yaw)).toBeCloseTo(1);
  });

  it('knows which door of a room is open', () => {
    let open = false;
    const joint: Joint = {
      frame: room,
      open: () => open,
      angle: () => 0,
      swingTo() {},
      opening: () => ({ minX: 0, maxX: 0, minZ: 0, maxZ: 0 }),
      see() {},
      peek() {},
    };
    const withdraw = registerJoint('dev1', 'dev_corridor', joint);
    expect(jointOf('dev1', 'dev_corridor')).toBe(joint);
    expect(openJoint('dev1')).toBeNull();
    open = true;
    expect(openJoint('dev1')).toBe('dev_corridor');
    withdraw();
    expect(jointOf('dev1', 'dev_corridor')).toBeNull();
  });
});
