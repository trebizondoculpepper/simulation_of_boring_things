import { describe, expect, it } from 'vite-plus/test';
import {
  PLANT_ROOM,
  PLANT_ROOM_SIZES,
  plantRoomFloorAt,
  plantRoomPlan,
  plantRoomSolids,
} from './plant-rooms';
import type { PlantRoomSize } from './plant-rooms';

const sizes = Object.keys(PLANT_ROOM_SIZES) as PlantRoomSize[];
const stairs = sizes;

describe('the plant rooms', () => {
  it('fit their stair down the east wall in every size', () => {
    for (const size of stairs) {
      const plan = plantRoomPlan(size);
      const stair = plan.stair;
      expect(stair.bottom).toBeLessThan(plan.h - 0.1);
      // Steep, as an industrial stair is, but no steeper than 42 degrees.
      expect(
        Math.atan2(stair.riser, PLANT_ROOM.stair.going),
      ).toBeLessThanOrEqual((42.5 * Math.PI) / 180);
    }
  });

  it('walks from the landing at deck level down the stair to the plant floor, a riser at a time', () => {
    for (const size of stairs) {
      const plan = {
        ...plantRoomPlan(size),
        stair: plantRoomPlan(size).stair!,
      };
      const x = (plan.stair.minX + plan.stair.maxX) / 2;
      let last = plantRoomFloorAt(plan, x, -plan.h + 0.5);
      expect(last).toBe(0);
      for (let z = -plan.h + 0.5; z < plan.stair.bottom + 0.5; z += 0.02) {
        const y = plantRoomFloorAt(plan, x, z);
        expect(Math.abs(y - last)).toBeLessThanOrEqual(plan.stair.riser + 1e-9);
        last = y;
      }
      expect(last).toBeCloseTo(plan.floor);
    }
  });

  it('rails the landing and the stair, so no one walks off or under them', () => {
    const plan = plantRoomPlan('medium');
    const walls = plantRoomSolids(plan);
    const blocked = (x: number, z: number) =>
      walls.some((f) => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ);
    // Off the landing's west edge, and off the stair's open side.
    expect(blocked(plan.landing.minX - 0.025, -plan.h + 0.5)).toBe(true);
    expect(blocked(plan.stair.minX - 0.025, plan.stair.top + 1)).toBe(true);
    // Down the middle of the stair, clear.
    expect(
      blocked((plan.stair.minX + plan.stair.maxX) / 2, plan.stair.top + 1),
    ).toBe(false);
  });

  it('keeps the large viewing gantry walkable across the full wall', () => {
    const plan = plantRoomPlan('large');
    const z = (plan.landing.minZ + plan.landing.maxZ) / 2;
    const solids = plantRoomSolids(plan);
    expect(plan.landing.minX).toBe(-plan.h);
    expect(plan.landing.maxX).toBe(plan.h);
    for (const x of [-plan.h + 0.3, 0, plan.h - 0.3]) {
      expect(plantRoomFloorAt(plan, x, z)).toBe(0);
      expect(
        solids.some(
          (f) => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ,
        ),
      ).toBe(false);
    }
  });
});

import { throughDoor } from './door-joins';
import { PLANT_SILL } from './plant-rooms';
import { POOL_HALLS } from './pool-halls';

describe('passing between a pool hall and its plant room', () => {
  it('carries the walker through the door, onto the landing, facing in, and back', () => {
    for (const hall of Object.values(POOL_HALLS)) {
      const at = hall.plantDoor;
      if (!at) continue;
      const plan = plantRoomPlan(at.size);
      const west = at.wall === 'west';
      const hallFrame = {
        x: ((west ? -1 : 1) * hall.w) / 2,
        z: at.z,
        y: PLANT_SILL,
        yaw: west ? Math.PI / 2 : -Math.PI / 2,
      };
      const plantFrame = {
        x: plan.door.x,
        z: -plan.h - PLANT_ROOM.wall,
        y: 0,
        yaw: 0,
      };
      // Just through the doorway from the hall, walking out of it.
      const out = west ? -1 : 1;
      const pose = {
        x: hallFrame.x + out * 0.3,
        z: at.z,
        yaw: west ? -Math.PI / 2 : Math.PI / 2,
        y: 2,
      };
      const there = throughDoor(hallFrame, plantFrame, pose);
      expect(there.x).toBeCloseTo(plan.door.x);
      expect(there.z).toBeCloseTo(plantFrame.z + 0.3);
      // Facing south, into the plant room; its eye a sill's height lower.
      expect(Math.sin(there.yaw)).toBeCloseTo(0);
      expect(-Math.cos(there.yaw)).toBeCloseTo(1);
      expect(there.y).toBeCloseTo(2 - PLANT_SILL);
      // And back again, to where it was.
      const back = throughDoor(plantFrame, hallFrame, there);
      expect(back.x).toBeCloseTo(pose.x);
      expect(back.z).toBeCloseTo(pose.z);
      // Where the walker arrives, in the doorway, the floor is the
      // landing's, not the plant floor a storey down.
      expect(plantRoomFloorAt(plan, there.x, there.z)).toBe(0);
      expect(plantRoomFloorAt(plan, there.x, -plan.h + 0.3)).toBe(0);
    }
  });
});
