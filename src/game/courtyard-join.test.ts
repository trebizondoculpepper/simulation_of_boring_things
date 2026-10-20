import { describe, expect, it } from 'vite-plus/test';
import { LOOP_SIDE_IDS, doorway } from './dev-corridor-plan';
import {
  COURTYARD_DOORS,
  COURTYARD_HALF,
  JOIN_DEPTH,
  anchor,
  carry,
  inCourtyard,
  inJoinedDoorway,
  joinedWalls,
  toLocal,
  toWorld,
} from './courtyard-join';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import { slide } from '../toolkit/controls/logic/walk-collision';

const blocked = (walls: Footprint[], x: number, z: number) =>
  walls.some((w) => x > w.minX && x < w.maxX && z > w.minZ && z < w.maxZ);

describe('the courtyard joined to the corridor', () => {
  it.each(LOOP_SIDE_IDS)(
    'puts its %s door in the doorway of the corridor’s inner door on that side',
    (side) => {
      const a = anchor(side);
      const d = doorway({ side, t: 0, wall: 'inner' });
      const door = COURTYARD_DOORS.find((w) => w.side === side)!;
      const at = toWorld(a, door.x, door.z);
      expect(at.x).toBeCloseTo(d.x + d.out.x * JOIN_DEPTH);
      expect(at.z).toBeCloseTo(d.z + d.out.z * JOIN_DEPTH);
      // Its way in is the corridor door's way out.
      const inward = toWorld(a, door.x + door.inward.x, door.z + door.inward.z);
      expect(inward.x - at.x).toBeCloseTo(d.out.x);
      expect(inward.z - at.z).toBeCloseTo(d.out.z);
      // It lies inside the loop, clear of the corridor.
      const middle = toWorld(a, 0, 0);
      expect(Math.abs(middle.x) + COURTYARD_HALF).toBeLessThan(23.5);
      expect(Math.abs(middle.z) + COURTYARD_HALF).toBeLessThan(23.5);
    },
  );

  it('takes a point there and back', () => {
    const a = anchor('east');
    const w = toWorld(a, 2, -3);
    const back = toLocal(a, w.x, w.z);
    expect(back.x).toBeCloseTo(2);
    expect(back.z).toBeCloseTo(-3);
    expect(inCourtyard(a, w.x, w.z)).toBe(true);
    expect(inCourtyard(a, 0, -25)).toBe(false);
  });

  it('carries a pose with it to another door, unchanged in the courtyard', () => {
    const from = anchor('north');
    const to = anchor('west');
    const start = toWorld(from, 1, 2);
    // Facing north in the courtyard: forward is (sin yaw, −cos yaw).
    const moved = carry(from, to, { ...start, yaw: 0.3 });
    const local = toLocal(to, moved.x, moved.z);
    expect(local.x).toBeCloseTo(1);
    expect(local.z).toBeCloseTo(2);
    const forward = (yaw: number) => ({ x: Math.sin(yaw), z: -Math.cos(yaw) });
    const before = forward(0.3);
    const after = forward(moved.yaw);
    const there = toLocal(to, moved.x + after.x, moved.z + after.z);
    expect(there.x - local.x).toBeCloseTo(before.x);
    expect(there.z - local.z).toBeCloseTo(before.z);
  });

  it('can be walked into from the corridor only through the open door', () => {
    const a = anchor('south');
    const d = doorway({ side: 'south', t: 0, wall: 'inner' });
    // Points through the doorway, from the corridor into the courtyard.
    const path = [-0.3, 0.05, 0.2, 0.4, 0.8].map((k) => ({
      x: d.x + d.out.x * k,
      z: d.z + d.out.z * k,
    }));
    const shut = joinedWalls(a, null);
    expect(path.some((p) => blocked(shut, p.x, p.z))).toBe(true);
    const open = joinedWalls(a, 'south');
    expect(path.some((p) => blocked(open, p.x, p.z))).toBe(false);
    expect(inCourtyard(a, path[4].x, path[4].z)).toBe(true);
    // Another side's door leads nowhere while the courtyard is here.
    const n = doorway({ side: 'north', t: 0, wall: 'inner' });
    expect(blocked(joinedWalls(a, 'north'), n.x, n.z + 0.2)).toBe(false);
    expect(inCourtyard(a, n.x, n.z + 0.8)).toBe(false);
  });

  it('holds its door open while someone passes', () => {
    const a = anchor('west');
    const d = doorway({ side: 'west', t: 0, wall: 'inner' });
    expect(inJoinedDoorway(a, d.x - 0.3 * d.out.x, d.z)).toBe(true);
    expect(inJoinedDoorway(a, d.x + 0.6 * d.out.x, d.z)).toBe(true);
    expect(inJoinedDoorway(a, d.x - 2 * d.out.x, d.z)).toBe(false);
  });

  it.each(LOOP_SIDE_IDS)(
    'lets a walker through the open %s door, and only through it',
    (side) => {
      const a = anchor(side);
      const d = doorway({ side, t: 0, wall: 'inner' });
      /** Walk 3 m straight out of the corridor through the doorway. */
      const walk = (walls: Footprint[], offset = 0) => {
        let p = {
          x: d.x - d.out.x * 1.2 + (d.out.x === 0 ? offset : 0),
          z: d.z - d.out.z * 1.2 + (d.out.z === 0 ? offset : 0),
        };
        for (let i = 0; i < 60; i++)
          p = slide(walls, p.x, p.z, d.out.x * 0.05, d.out.z * 0.05, 0.25);
        return inCourtyard(a, p.x, p.z);
      };
      expect(walk(joinedWalls(a, side))).toBe(true);
      expect(walk(joinedWalls(a, null))).toBe(false);
      // Not past the door's edge.
      expect(walk(joinedWalls(a, side), 0.8)).toBe(false);
    },
  );
});
