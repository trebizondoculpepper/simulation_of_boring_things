import { describe, expect, it } from 'vite-plus/test';
import { layoutCorridor } from '../../components/architectural/logic/corridor-path';
import {
  carry,
  intoCorridor,
  joints,
  legPieces,
  LOOP_LEGS,
  roomCorridors,
} from './pool-loop';

describe('the pool loop', () => {
  it('joins the rooms in a ring, through the Olympic pool twice', () => {
    expect(LOOP_LEGS.map((l) => l.from)).toEqual([
      'pool_01',
      'pool_02',
      'pool_03',
      'pool_04',
      'pool_02_gallery',
    ]);
    LOOP_LEGS.forEach((leg, i) =>
      expect(leg.to).toBe(LOOP_LEGS[(i + 1) % LOOP_LEGS.length].from),
    );
  });

  it('never makes a corridor of two straights, and keeps it the same', () => {
    for (let seed = 0; seed < 500; seed++) {
      const [a, b] = legPieces(seed);
      expect(a.kind === 'straight' && b.kind === 'straight').toBe(false);
    }
    expect(legPieces(42)).toEqual(legPieces(42));
  });

  it('lays each arriving corridor to end at its room’s way in, heading into it', () => {
    for (const leg of LOOP_LEGS) {
      const { arriving } = roomCorridors(leg.to);
      const { end } = layoutCorridor(leg.pieces, arriving.start);
      const { entry } = joints(leg.to);
      expect(end.x).toBeCloseTo(entry.x);
      expect(end.z).toBeCloseTo(entry.z);
      expect(end.y).toBeCloseTo(entry.y);
      expect(end.heading).toBe((entry.out + 2) % 4);
    }
  });

  it('carries a walker from a corridor in one room to the same place in the next', () => {
    for (const leg of LOOP_LEGS) {
      const a = roomCorridors(leg.from).leaving;
      const b = roomCorridors(leg.to).arriving;
      // A metre in, on the middle line, facing along it.
      const yaw = [Math.PI / 2, 0, -Math.PI / 2, Math.PI][a.start.heading];
      const dir = [
        [1, 0],
        [0, -1],
        [-1, 0],
        [0, 1],
      ][a.start.heading];
      const pose = {
        x: a.start.x + dir[0],
        z: a.start.z + dir[1],
        y: a.start.y,
        yaw,
      };
      const there = carry(pose, a, b);
      expect(intoCorridor(b, there.x, there.z)).toBeCloseTo(1);
      expect(there.y).toBeCloseTo(b.start.y);
      // Still facing along the corridor.
      const facing = [Math.sin(there.yaw), -Math.cos(there.yaw)];
      const bDir = [
        [1, 0],
        [0, -1],
        [-1, 0],
        [0, 1],
      ][b.start.heading];
      expect(facing[0]).toBeCloseTo(bDir[0]);
      expect(facing[1]).toBeCloseTo(bDir[1]);
    }
  });
});

import {
  corridorFloorAt,
  corridorFootprints,
  pieceLength,
} from '../../components/architectural/logic/corridor-path';
import type { PlacedPiece } from '../../components/architectural/logic/corridor-path';
import { galleryPlan, hallFloorAt, hallSolids, POOL_HALLS } from './pool-halls';
import { HAND_OVER } from './pool-loop';
import type { CorridorCopy, LoopRoom } from './pool-loop';

const DIR = [
  [1, 0],
  [0, -1],
  [-1, 0],
  [0, 1],
] as const;

/** A room's scene as the walker meets it: its walls and its floor. */
function scene(room: LoopRoom) {
  const { leaving, arriving } = roomCorridors(room);
  const corridors = [...leaving.placed, ...arriving.placed];
  const g = galleryPlan(POOL_HALLS.pool_02)!;
  const gallery = room === 'pool_02_gallery';
  const walls = [
    ...(gallery
      ? [
          { minX: g.x0, maxX: g.x1, minZ: g.z - 1.6, maxZ: g.z - 0.6 },
          { minX: g.x0, maxX: g.x1, minZ: g.z + 0.6, maxZ: g.z + 1.6 },
        ]
      : hallSolids(POOL_HALLS[room as 'pool_01'])),
    ...corridorFootprints(corridors),
  ];
  return {
    leaving,
    arriving,
    blocked: (x: number, z: number) =>
      walls.some((f) => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ),
    floor: (x: number, z: number) =>
      corridorFloorAt(corridors, x, z) ??
      (gallery ? g.floor : hallFloorAt(POOL_HALLS[room as 'pool_01'], x, z)),
  };
}

/** Points every 5 cm down a corridor copy's middle, turns by their middles. */
function middle(copy: CorridorCopy) {
  const corners: [number, number][] = [[copy.start.x, copy.start.z]];
  for (const p of copy.placed as PlacedPiece[]) {
    const [dx, dz] = DIR[p.heading];
    if (p.piece.kind === 'straight' || p.piece.kind === 'stairs') {
      const L = pieceLength(p.piece);
      corners.push([p.x + dx * L, p.z + dz * L]);
    } else {
      corners.push([p.x + dx * 0.6, p.z + dz * 0.6]);
      const out = DIR[(p.heading + (p.piece.kind === 'left' ? 1 : 3)) % 4];
      corners.push([
        p.x + dx * 0.6 + out[0] * 0.6,
        p.z + dz * 0.6 + out[1] * 0.6,
      ]);
    }
  }
  const points: [number, number][] = [];
  for (let i = 1; i < corners.length; i++) {
    const [ax, az] = corners[i - 1];
    const [bx, bz] = corners[i];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 0.05));
    for (let k = 0; k < n; k++)
      points.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  points.push(corners[corners.length - 1]);
  return points;
}

describe('walking the pool loop', () => {
  it('walks every leg cleanly: out of a room, along its corridor, and into the next', () => {
    for (const leg of LOOP_LEGS) {
      const here = scene(leg.from);
      const there = scene(leg.to);
      const route = middle(here.leaving);
      const s = here.leaving.start;
      const [dx, dz] = DIR[s.heading];
      // From 2 m inside the room, up to the way out.
      const approach: [number, number][] = Array.from(
        { length: 40 },
        (_, k) => [s.x - dx * (2 - k * 0.05), s.z - dz * (2 - k * 0.05)],
      );
      let last = here.floor(...approach[0]);
      let handed = false;
      let inScene = here;
      for (const [x0, z0] of [...approach, ...route]) {
        let [x, z] = [x0, z0];
        if (!handed) {
          const along = intoCorridor(here.leaving, x, z);
          if (along !== null && along > HAND_OVER.onward && along < 1.5) {
            handed = true;
            inScene = there;
          }
        }
        if (handed) {
          const p = carry({ x, z, y: 0, yaw: 0 }, here.leaving, there.arriving);
          [x, z] = [p.x, p.z];
        }
        expect(
          inScene.blocked(x, z),
          `${leg.from}→${leg.to} at ${x.toFixed(2)}, ${z.toFixed(2)}`,
        ).toBe(false);
        // Heights in the leaving copy's frame: the arriving copy is the
        // same corridor, set at another level in its own scene.
        const y =
          inScene.floor(x, z) -
          (handed ? there.arriving.start.y - here.leaving.start.y : 0);
        expect(
          Math.abs(y - last),
          `${leg.from}→${leg.to} step at ${x}, ${z}`,
        ).toBeLessThan(0.2);
        last = y;
      }
      expect(handed).toBe(true);
      // And on 2 m into the next room, past its way in.
      const e = joints(leg.to).entry;
      const [ix, iz] = DIR[(e.out + 2) % 4];
      for (let k = 0; k <= 40; k++) {
        const x = e.x + ix * k * 0.05;
        const z = e.z + iz * k * 0.05;
        expect(there.blocked(x, z), `into ${leg.to} at ${x}, ${z}`).toBe(false);
        const y =
          there.floor(x, z) - (there.arriving.start.y - here.leaving.start.y);
        expect(Math.abs(y - last)).toBeLessThan(0.2);
        last = y;
      }
    }
  });
});
