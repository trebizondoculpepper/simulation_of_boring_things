import { describe, expect, it } from 'vite-plus/test';
import {
  SHELL_ROOMS,
  SHELL_WALL,
  shellDoorPlace,
  shellOpening,
  shellSolids,
  throughShellDoor,
  WET_HALL,
  wetHallFloorAt,
  wetHallRails,
  wetHallRamp,
  wetHallRoom,
} from './shell-rooms';
import type { ShellRoomId } from './shell-rooms';
import { throughDoor } from './door-joins';
import {
  CORRIDOR_SECTION,
  galleryOfficeDoor,
  galleryPlan,
  POOL_HALLS,
  throughGalleryOfficeDoor,
} from './pool-halls';
import { PLANT_DOORWAY, PLANT_SILL } from './plant-rooms';

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

describe('the engineer’s office’s door to the underwater gallery', () => {
  const office = SHELL_ROOMS.engineers_office;
  const door = office.doors.find((d) => d.to === 'pool_02_gallery')!;
  const plan = galleryPlan(POOL_HALLS.pool_02)!;
  const way = galleryOfficeDoor(plan);
  const here = shellDoorPlace(office, door).frame;
  const there = way.frame;

  it('is a single leaf in the middle of the office’s east wall, as wide as the gallery’s', () => {
    expect(door.wall).toBe('east');
    expect(door.at).toBe(0);
    expect(shellOpening(door)).toBe(PLANT_DOORWAY);
    expect(shellOpening(door)).toBe(way.opening);
    // The two rooms share the one wall: each as thick as the other.
    expect(SHELL_WALL).toBe(CORRIDOR_SECTION.wall);
    // Its frame on the wall's outer face, facing west into the office.
    expect(here.x).toBeCloseTo(office.w / 2 + SHELL_WALL);
    expect(here.z).toBeCloseTo(0);
    expect(here.yaw).toBeCloseTo(-Math.PI / 2);
    // Still entered first from the main corridor.
    expect(office.doors[0].to).toBe('main_corridor');
  });

  it('leads from the office into the gallery’s middle, facing the windows', () => {
    // Walking east through the doorway, just past the office's wall.
    const pose = { x: here.x + 0.3, z: 0, yaw: Math.PI / 2, y: 1.6 };
    expect(throughShellDoor(office, door, pose.x, pose.z)).toBe(true);
    const inside = throughDoor(here, there, pose);
    // In the gallery, by its middle, facing south to the windows.
    expect(inside.x).toBeCloseTo(way.x);
    expect(inside.z).toBeGreaterThan(way.line);
    expect(inside.z).toBeLessThan(plan.z + CORRIDOR_SECTION.width / 2);
    expect(Math.sin(inside.yaw)).toBeCloseTo(0);
    // Forward is (sin yaw, −cos yaw): south, +z.
    expect(-Math.cos(inside.yaw)).toBeCloseTo(1);
    // On the doorway's sill, over the gallery's fillet: its floor's
    // level, the office's floor.
    expect(inside.y).toBeCloseTo(1.6 + plan.floor + PLANT_SILL);
    // Not straight back out again.
    expect(throughGalleryOfficeDoor(way, inside.x, inside.z)).toBe(false);
  });

  it('leads from the gallery back into the office, facing into it', () => {
    // Walking north through the doorway, just past the gallery's wall.
    const pose = {
      x: way.x,
      z: way.line - way.wall - 0.1,
      yaw: 0,
      // Standing on its sill.
      y: plan.floor + PLANT_SILL + 1.6,
    };
    expect(throughGalleryOfficeDoor(way, pose.x, pose.z)).toBe(true);
    const inside = throughDoor(there, here, pose);
    expect(Math.abs(inside.x)).toBeLessThan(office.w / 2);
    expect(inside.z).toBeCloseTo(0);
    // Facing west, into the office, on its floor.
    expect(Math.sin(inside.yaw)).toBeCloseTo(-1);
    expect(inside.y).toBeCloseTo(1.6);
    expect(throughShellDoor(office, door, inside.x, inside.z)).toBe(false);
    // And back again to where it was.
    const back = throughDoor(here, there, inside);
    expect(back.x).toBeCloseTo(pose.x);
    expect(back.z).toBeCloseTo(pose.z);
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
