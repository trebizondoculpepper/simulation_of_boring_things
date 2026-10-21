import { describe, expect, it } from 'vite-plus/test';
import {
  SHELL_ROOMS,
  shellDoorPlace,
  shellSolids,
  WET_HALL,
  wetHallFloorAt,
  wetHallRails,
  wetHallRamp,
  wetHallRoom,
} from './shell-rooms';
import type { ShellRoomId } from './shell-rooms';
import { throughDoor } from './door-joins';

const blockedBy = (
  solids: ReturnType<typeof shellSolids>,
  x: number,
  z: number,
) => solids.some((f) => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ);

describe('the shell rooms', () => {
  it('are walled in but for their doorways', () => {
    for (const spec of Object.values(SHELL_ROOMS)) {
      const solids = shellSolids(spec);
      expect(blockedBy(solids, 0, 0)).toBe(false);
      for (const door of spec.doors) {
        const p = shellDoorPlace(spec, door);
        expect(
          blockedBy(
            solids,
            p.outer.x + p.into[0] * 0.1,
            p.outer.z + p.into[1] * 0.1,
          ),
        ).toBe(false);
      }
    }
  });

  it('put the chemical stores off the loading bay’s opposite walls, and join them both ways', () => {
    const bay = SHELL_ROOMS.loading_bay;
    const walls = bay.doors
      .filter((d) => d.to !== 'main_corridor')
      .map((d) => d.wall);
    expect(walls.sort()).toEqual(['east', 'west']);
    for (const to of ['hypo_store', 'acid_store'] as ShellRoomId[]) {
      const store = SHELL_ROOMS[to];
      const here = shellDoorPlace(
        bay,
        bay.doors.find((d) => d.to === to)!,
      ).frame;
      const there = shellDoorPlace(store, store.doors[0]).frame;
      // Out of the bay through its door, into the store, and back.
      const pose = {
        x: here.x - Math.sin(here.yaw) * 0.3,
        z: here.z - Math.cos(here.yaw) * 0.3,
        yaw: 0,
      };
      const inside = throughDoor(here, there, pose);
      expect(Math.abs(inside.x)).toBeLessThan(store.w / 2);
      expect(Math.abs(inside.z)).toBeLessThan(store.d / 2 + 0.5);
      const back = throughDoor(there, here, inside);
      expect(back.x).toBeCloseTo(pose.x);
      expect(back.z).toBeCloseTo(pose.z);
    }
  });
});

describe('the wet hall', () => {
  const R = wetHallRoom().w / 2;

  it('is half a storey down, entered on landings at the corridor’s level', () => {
    expect(wetHallFloorAt(0, 0)).toBe(-WET_HALL.drop);
    expect(wetHallFloorAt(R - 0.3, 0)).toBe(0);
    // Where the north and south doorways were, the hall's floor.
    expect(wetHallFloorAt(0, -R + 0.3)).toBe(-WET_HALL.drop);
    expect(wetHallFloorAt(0, R - 0.3)).toBe(-WET_HALL.drop);
    expect(wetHallFloorAt(-R + 0.3, WET_HALL.ramp.door)).toBe(0);
  });

  it('goes down its stair a riser at a time', () => {
    for (const [dx, dz] of [[-1, 0]]) {
      let last = 0;
      for (let s = R - 0.3; s > 0; s -= 0.02) {
        const y = wetHallFloorAt(-dx * s, -dz * s);
        expect(last - y).toBeLessThanOrEqual(
          WET_HALL.drop / WET_HALL.stair.risers + 1e-9,
        );
        last = y;
      }
      expect(last).toBe(-WET_HALL.drop);
    }
  });

  it('has a trolley ramp at no steeper than 1:12, walked smoothly from the west door to the floor', () => {
    const r = wetHallRamp();
    expect(r.gradient).toBeLessThanOrEqual(1 / 12 + 1e-6);
    const path: [number, number][] = [];
    const x1 = (r.first.minX + r.first.maxX) / 2;
    const x2 = (r.second.minX + r.second.maxX) / 2;
    for (let z = WET_HALL.ramp.door; z <= R - 0.9; z += 0.05)
      path.push([x1, z]);
    for (let x = x1; x <= x2; x += 0.05) path.push([x, R - 0.9]);
    for (let z = R - 0.9; z >= r.second.z1 - 1; z -= 0.05) path.push([x2, z]);
    let last = wetHallFloorAt(...path[0]);
    expect(last).toBe(0);
    const rails = wetHallRails();
    for (const [x, z] of path) {
      const y = wetHallFloorAt(x, z);
      expect(Math.abs(y - last)).toBeLessThan(0.02);
      expect(
        rails.some((f) => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ),
      ).toBe(false);
      last = y;
    }
    expect(last).toBe(-WET_HALL.drop);
  });
});
