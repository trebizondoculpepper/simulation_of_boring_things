import { describe, expect, it } from 'vite-plus/test';
import {
  CORRIDOR_DOORS,
  corridorSolids,
  doorPlace,
  inCorridor,
  MAIN_CORRIDOR,
} from './main-corridor';

const blocked = (x: number, z: number) =>
  corridorSolids().some(
    (f) => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ,
  );

describe('the main corridor', () => {
  it('is an L: a leg east, a leg south, from the outside corner', () => {
    expect(inCorridor(1.5, 1.5)).toBe(true);
    expect(inCorridor(20, 1.5)).toBe(true);
    expect(inCorridor(1.5, 20)).toBe(true);
    // The inside of the L is the wet hall's, not the corridor's.
    expect(inCorridor(10, 10)).toBe(false);
  });

  it('has the four plant rooms off its outer walls and the wet hall off its inner ones', () => {
    const plant = CORRIDOR_DOORS.filter((d) => d.to.startsWith('plant_'));
    expect(plant.map((d) => d.to).sort()).toEqual([
      'plant_pool_01',
      'plant_pool_02',
      'plant_pool_03',
      'plant_pool_04',
    ]);
    for (const d of plant) expect(['north', 'west']).toContain(d.wall);
    for (const d of CORRIDOR_DOORS.filter((d) => d.to === 'wet_hall'))
      expect(['south', 'east']).toContain(d.wall);
  });

  it('walls the corridor in, open only at its doorways', () => {
    // Down the middle of both legs, clear.
    for (let s = 0.5; s < MAIN_CORRIDOR.leg - 0.5; s += 0.25) {
      expect(blocked(s, 1.5)).toBe(false);
      expect(blocked(1.5, s)).toBe(false);
    }
    for (const d of CORRIDOR_DOORS) {
      const p = doorPlace(d);
      // Just through the doorway: open; beside it in the wall: solid.
      const out = { x: p.x - p.into[0] * 0.1, z: p.z - p.into[1] * 0.1 };
      expect(blocked(out.x, out.z), `${d.to} doorway`).toBe(false);
      const beside =
        d.wall === 'north' || d.wall === 'south'
          ? { x: out.x + MAIN_CORRIDOR.opening, z: out.z }
          : { x: out.x, z: out.z + MAIN_CORRIDOR.opening };
      expect(blocked(beside.x, beside.z), `${d.to} wall`).toBe(true);
    }
    // The ends of the legs.
    expect(blocked(MAIN_CORRIDOR.leg + 0.1, 1.5)).toBe(true);
    expect(blocked(1.5, MAIN_CORRIDOR.leg + 0.1)).toBe(true);
  });
});

import { throughDoor } from './door-joins';
import { PLANT_ROOM, plantRoomFloorAt, plantRoomPlan } from './plant-rooms';
import { POOL_HALLS } from './pool-halls';

describe('passing between the main corridor and a plant room', () => {
  it('carries the walker through each plant room’s equipment doors onto its plant floor, and back', () => {
    const yawInto = {
      north: 0,
      south: Math.PI,
      west: Math.PI / 2,
      east: -Math.PI / 2,
    };
    for (const d of CORRIDOR_DOORS.filter((d) => d.to.startsWith('plant_'))) {
      const hall = d.to.replace('plant_', '') as keyof typeof POOL_HALLS;
      const plan = plantRoomPlan(POOL_HALLS[hall].plantDoor!.size);
      const p = doorPlace(d);
      const corridor = { x: p.x, z: p.z, y: 0, yaw: yawInto[d.wall] };
      const plant = {
        x: plan.equipment.x,
        z: plan.h + PLANT_ROOM.wall,
        y: plan.floor,
        yaw: Math.PI,
      };
      // Just through the doorway out of the corridor, walking out.
      const out = { x: p.x - p.into[0] * 0.3, z: p.z - p.into[1] * 0.3 };
      const yaw = Math.atan2(-p.into[0], p.into[1]);
      const there = throughDoor(corridor, plant, { ...out, yaw, y: 1.8 });
      expect(there.x).toBeCloseTo(plan.equipment.x);
      expect(there.z).toBeCloseTo(plant.z - 0.3);
      expect(there.y).toBeCloseTo(1.8 + plan.floor);
      // Facing north, into the plant room, on its plant floor.
      expect(-Math.cos(there.yaw)).toBeCloseTo(-1);
      expect(plantRoomFloorAt(plan, there.x, there.z)).toBe(plan.floor);
      const back = throughDoor(plant, corridor, there);
      expect(back.x).toBeCloseTo(out.x);
      expect(back.z).toBeCloseTo(out.z);
    }
  });
});
