import { describe, expect, it } from 'vite-plus/test';
import { throughDoor } from './door-joins';
import { DEV_ROOM_NAMES, ROOMS, resolveRoomId } from './dev-room-links';
import {
  HALL_BRIEFS,
  MUSEUM_ARCH,
  MUSEUM_HALLS,
  MUSEUM_SIZES,
  archToSee,
  crossedInto,
  hallArches,
  hallColumns,
  hallSolids,
  nextHall,
  previousHall,
  sharedWallWidth,
  startOf,
  toMuseum,
} from './museum-plan';
import type { MuseumHallId } from './museum-plan';
import { overlaps } from '../../controls/logic/walk-collision';

const archTo = (from: MuseumHallId, to: MuseumHallId) => {
  const a = hallArches(from).find((x) => x.to === to);
  if (!a) throw new Error(`${from} has no archway to ${to}`);
  return a;
};

describe('the pool science museum', () => {
  it('has five halls, each reached by its own link and named', () => {
    expect(MUSEUM_HALLS).toEqual([
      'museum1',
      'museum2',
      'museum3',
      'museum4',
      'museum5',
    ]);
    for (const id of MUSEUM_HALLS) {
      expect(ROOMS).toContain(id);
      expect(resolveRoomId(id)).toBe(id);
      expect(DEV_ROOM_NAMES[id]).toContain(HALL_BRIEFS[id].title.toUpperCase());
    }
  });

  it('joins each hall to the next through its north wall and back through its south', () => {
    for (const id of MUSEUM_HALLS) {
      const next = nextHall(id);
      const last = previousHall(id);
      const arches = hallArches(id);
      expect(arches.length).toBe((next ? 1 : 0) + (last ? 1 : 0));
      if (next) {
        expect(archTo(id, next).wall).toBe('north');
        // And the hall beyond has its archway back.
        expect(archTo(next, id).wall).toBe('south');
      }
      if (last) expect(archTo(id, last).wall).toBe('south');
    }
  });

  it('puts both sides of each archway at the same place in the museum, facing each other', () => {
    for (const id of MUSEUM_HALLS) {
      const next = nextHall(id);
      if (!next) continue;
      const near = archTo(id, next).frame;
      const far = archTo(next, id).frame;
      const a = toMuseum(id, near.x, near.z);
      const b = toMuseum(next, far.x, far.z);
      expect(a.x).toBeCloseTo(b.x, 9);
      expect(a.z).toBeCloseTo(b.z, 9);
      expect(Math.abs(Math.cos(near.yaw - far.yaw))).toBeCloseTo(1, 9);
      expect(Math.cos(near.yaw - far.yaw)).toBeCloseTo(-1, 9);
      // Both halls build the shared wall alike.
      expect(sharedWallWidth(id, next)).toBe(sharedWallWidth(next, id));
    }
  });

  it('carries a visitor through each archway to where they are in the museum, both ways', () => {
    const poses = [
      { x: 0, z: 0, yaw: 0 },
      { x: 1.2, z: 0.4, yaw: 0.7 },
      { x: -1.5, z: -0.2, yaw: 3 },
      { x: 0.3, z: 2.5, yaw: -1.2 },
    ];
    for (const id of MUSEUM_HALLS) {
      for (const arch of hallArches(id)) {
        const back = archTo(arch.to, id);
        for (const offset of poses) {
          const pose = {
            x: arch.frame.x + offset.x,
            z: arch.frame.z + offset.z,
            yaw: offset.yaw,
          };
          const there = throughDoor(arch.frame, back.frame, pose);
          const here = toMuseum(id, pose.x, pose.z);
          const beyond = toMuseum(arch.to, there.x, there.z);
          expect(beyond.x).toBeCloseTo(here.x, 9);
          expect(beyond.z).toBeCloseTo(here.z, 9);
          // Facing the same way: the halls are not turned.
          expect(Math.cos(there.yaw - pose.yaw)).toBeCloseTo(1, 9);
          // And back again.
          const home = throughDoor(back.frame, arch.frame, there);
          expect(home.x).toBeCloseTo(pose.x, 9);
          expect(home.z).toBeCloseTo(pose.z, 9);
        }
      }
    }
  });

  it('hands over on crossing an archway’s middle, and only there', () => {
    for (const id of MUSEUM_HALLS) {
      for (const arch of hallArches(id)) {
        const z = arch.frame.z;
        const into = arch.wall === 'north' ? -1 : 1;
        expect(
          crossedInto(
            id,
            { x: 0.5, z: z - into * 0.05 },
            { x: 0.5, z: z + into * 0.05 },
          ),
        ).toBe(arch.to);
        // Walking back towards the hall is no crossing.
        expect(
          crossedInto(
            id,
            { x: 0.5, z: z + into * 0.05 },
            { x: 0.5, z: z - into * 0.05 },
          ),
        ).toBe(null);
        // Nor beside the archway.
        expect(
          crossedInto(
            id,
            { x: MUSEUM_ARCH.w, z: z - into * 0.05 },
            { x: MUSEUM_ARCH.w, z: z + into * 0.05 },
          ),
        ).toBe(null);
      }
    }
  });

  it('stops a visitor at an archway until the hall beyond is seen through it', () => {
    for (const id of MUSEUM_HALLS) {
      for (const arch of hallArches(id)) {
        const into = arch.wall === 'north' ? -1 : 1;
        const beyond = { x: 0, z: arch.frame.z + into * 0.1 };
        const blocked = (solids: ReturnType<typeof hallSolids>) =>
          solids.some((s) => overlaps(s, beyond.x, beyond.z, 0.17));
        expect(blocked(hallSolids(id))).toBe(true);
        expect(blocked(hallSolids(id, { [arch.to]: true }))).toBe(false);
      }
    }
  });

  it('keeps the line through the archways clear, and starts each visitor on the floor', () => {
    for (const id of MUSEUM_HALLS) {
      const { d } = MUSEUM_SIZES[id];
      const solids = hallSolids(id);
      for (let z = -d / 2 + 0.3; z < d / 2 - 0.3; z += 0.25)
        expect(solids.some((s) => overlaps(s, 0, z, 0.17))).toBe(false);
      const s = startOf(id);
      expect(solids.some((f) => overlaps(f, s.x, s.z, 0.17))).toBe(false);
      for (const c of hallColumns(id))
        expect(Math.abs(c.x)).toBeGreaterThan(MUSEUM_ARCH.w / 2 + 1);
    }
  });

  it('sees through the archway the visitor is at, or looking towards', () => {
    const id: MuseumHallId = 'museum3';
    const { d } = MUSEUM_SIZES[id];
    // In the middle: north (yaw 0) or south (yaw π).
    expect(archToSee(id, { x: 0, z: 0, yaw: 0 })).toBe('museum4');
    expect(archToSee(id, { x: 0, z: 0, yaw: Math.PI })).toBe('museum2');
    // Close to the north archway, looking back: still the north one.
    expect(archToSee(id, { x: 0, z: -d / 2 + 0.5, yaw: Math.PI })).toBe(
      'museum4',
    );
    // The ends have one each.
    expect(archToSee('museum1', { x: 0, z: 0, yaw: Math.PI })).toBe('museum2');
    expect(archToSee('museum5', { x: 0, z: 0, yaw: 0 })).toBe('museum4');
  });
});
