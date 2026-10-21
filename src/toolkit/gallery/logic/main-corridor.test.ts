import { describe, expect, it } from 'vite-plus/test';
import {
  CORRIDOR_DOORS,
  corridorSolids,
  corridorYaw,
  doorPlace,
  inCorridor,
  MAIN_CORRIDOR,
} from './main-corridor';
import { throughDoor } from './door-joins';
import { PLANT_ROOM, plantRoomFloorAt, plantRoomPlan } from './plant-rooms';
import { POOL_HALLS } from './pool-halls';
import {
  SHELL_ROOMS,
  shellDoorPlace,
  shellSolids,
  WET_HALL_DOORS,
  wetHallFloorAt,
  wetHallRoom,
} from './shell-rooms';
import type { ShellRoomId } from './shell-rooms';

const C = MAIN_CORRIDOR;
const blocked = (x: number, z: number) =>
  corridorSolids().some(
    (f) => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ,
  );

describe('the main corridor', () => {
  it('is a square ring round the wet hall’s block', () => {
    expect(inCorridor(2, 2)).toBe(true);
    expect(inCorridor(14, 2)).toBe(true);
    expect(inCorridor(26, 14)).toBe(true);
    expect(inCorridor(14, 26)).toBe(true);
    expect(inCorridor(2, 14)).toBe(true);
    // The middle is the wet hall's.
    expect(inCorridor(14, 14)).toBe(false);
  });

  it('can be walked all the way round, clear down the middle of every side', () => {
    const m = C.width / 2;
    for (let s = m; s <= C.side - m; s += 0.25) {
      expect(blocked(s, m)).toBe(false);
      expect(blocked(s, C.side - m)).toBe(false);
      expect(blocked(m, s)).toBe(false);
      expect(blocked(C.side - m, s)).toBe(false);
    }
  });

  it('opens every room of the plant off its outside walls, the wet hall off its inside', () => {
    const outside = CORRIDOR_DOORS.filter((d) => d.to !== 'wet_hall');
    expect(outside.map((d) => d.to).sort()).toEqual(
      [
        'plant_pool_01',
        'plant_pool_02',
        'plant_pool_03',
        'plant_pool_04',
        ...Object.keys(SHELL_ROOMS).filter(
          (k) => k !== 'hypo_store' && k !== 'acid_store',
        ),
      ].sort(),
    );
    for (const d of outside) expect(d.wall.startsWith('inner')).toBe(false);
    const wet = CORRIDOR_DOORS.filter((d) => d.to === 'wet_hall');
    expect(wet.map((d) => d.wall)).toEqual(['inner-east', 'inner-west']);
  });

  it('walls the corridor in, open only at its doorways', () => {
    for (const d of CORRIDOR_DOORS) {
      const p = doorPlace(d);
      const out = { x: p.x - p.into[0] * 0.1, z: p.z - p.into[1] * 0.1 };
      expect(blocked(out.x, out.z), `${d.to} doorway`).toBe(false);
      const beside = p.into[1]
        ? { x: out.x + C.opening, z: out.z }
        : { x: out.x, z: out.z + C.opening };
      expect(blocked(beside.x, beside.z), `${d.to} wall`).toBe(true);
    }
  });
});

/** The rooms off each outside wall, their frontages, as packed along it. */
const FRONTAGE: Record<string, number> = {
  plant_pool_01: 12,
  plant_pool_02: 22,
  plant_pool_03: 8,
  plant_pool_04: 5,
};
const frontage = (to: string) =>
  FRONTAGE[to] ?? SHELL_ROOMS[to as ShellRoomId].w + 0.4;

describe('the rooms off the ring', () => {
  it('each fits its frontage, none overlapping its neighbours or running past the corner', () => {
    for (const wall of ['north', 'east', 'south', 'west'] as const) {
      const rooms = CORRIDOR_DOORS.filter((d) => d.wall === wall)
        .map((d) => ({
          to: d.to,
          from: d.at - frontage(d.to) / 2,
          to_: d.at + frontage(d.to) / 2,
        }))
        .sort((a, b) => a.from - b.from);
      expect(rooms[0].from, wall).toBeGreaterThanOrEqual(-0.2);
      expect(rooms[rooms.length - 1].to_, wall).toBeLessThanOrEqual(
        C.side + 0.2,
      );
      for (let i = 1; i < rooms.length; i++)
        expect(rooms[i].from, `${rooms[i].to}`).toBeGreaterThanOrEqual(
          rooms[i - 1].to_ - 1e-9,
        );
    }
  });

  it('matches its plant rooms’ sizes to the frontage it gives them', () => {
    for (const hall of Object.keys(POOL_HALLS) as (keyof typeof POOL_HALLS)[]) {
      const size = POOL_HALLS[hall].plantDoor!.size;
      expect(plantRoomPlan(size).side).toBeLessThanOrEqual(
        FRONTAGE[`plant_${hall}`],
      );
    }
  });
});

const walkThrough = (
  corridor: { x: number; z: number; y: number; yaw: number },
  room: { x: number; z: number; y: number; yaw: number },
  p: ReturnType<typeof doorPlace>,
) => {
  const out = { x: p.x - p.into[0] * 0.3, z: p.z - p.into[1] * 0.3 };
  const yaw = Math.atan2(-p.into[0], p.into[1]);
  const there = throughDoor(corridor, room, { ...out, yaw, y: 1.8 });
  const back = throughDoor(room, corridor, there);
  expect(back.x).toBeCloseTo(out.x);
  expect(back.z).toBeCloseTo(out.z);
  return there;
};

describe('passing between the main corridor and the rooms off it', () => {
  it('carries the walker onto each plant room’s plant floor through its equipment doors, and back', () => {
    for (const d of CORRIDOR_DOORS.filter((d) => d.to.startsWith('plant_'))) {
      const hall = d.to.replace('plant_', '') as keyof typeof POOL_HALLS;
      const plan = plantRoomPlan(POOL_HALLS[hall].plantDoor!.size);
      const p = doorPlace(d);
      const there = walkThrough(
        { x: p.x, z: p.z, y: 0, yaw: corridorYaw(d) },
        {
          x: plan.equipment.x,
          z: plan.h + PLANT_ROOM.wall,
          y: plan.floor,
          yaw: Math.PI,
        },
        p,
      );
      expect(there.x).toBeCloseTo(plan.equipment.x);
      expect(there.y).toBeCloseTo(1.8 + plan.floor);
      expect(plantRoomFloorAt(plan, there.x, there.z)).toBe(plan.floor);
    }
  });

  it('carries the walker into each shell room through its doors, inside its walls, and back', () => {
    for (const d of CORRIDOR_DOORS.filter((d) => d.to in SHELL_ROOMS)) {
      const spec = SHELL_ROOMS[d.to as ShellRoomId];
      const door = spec.doors.find((x) => x.to === 'main_corridor')!;
      const f = shellDoorPlace(spec, door).frame;
      const p = doorPlace(d);
      const there = walkThrough(
        { x: p.x, z: p.z, y: 0, yaw: corridorYaw(d) },
        { ...f, y: 0 },
        p,
      );
      // Just inside its south wall, in no wall.
      expect(there.z).toBeLessThan(spec.d / 2 + 0.2);
      expect(
        shellSolids(spec).some(
          (s) =>
            there.x > s.minX &&
            there.x < s.maxX &&
            there.z > s.minZ &&
            there.z < s.maxZ,
        ),
      ).toBe(false);
    }
  });

  it('carries the walker through each of the wet hall’s two doorways onto its landing, at the corridor’s level', () => {
    const wet = CORRIDOR_DOORS.filter((d) => d.to === 'wet_hall');
    wet.forEach((d, i) => {
      const f = shellDoorPlace(wetHallRoom(), WET_HALL_DOORS[i]).frame;
      const p = doorPlace(d);
      const there = walkThrough(
        { x: p.x, z: p.z, y: 0, yaw: corridorYaw(d) },
        { ...f, y: 0 },
        p,
      );
      expect(there.y).toBeCloseTo(1.8);
      expect(wetHallFloorAt(there.x, there.z), d.wall).toBe(0);
      // And the hall's doorway is where the corridor's is, in the ring's
      // frame: the block's middle is the ring's.
      expect(f.x + C.side / 2).toBeCloseTo(p.x);
      expect(f.z + C.side / 2).toBeCloseTo(p.z);
    });
  });
});
