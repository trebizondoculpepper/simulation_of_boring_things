import { describe, expect, it } from 'vite-plus/test';
import { throughDoor } from './door-joins';
import { DEV_ROOM_NAMES, ROOMS, resolveRoomId } from './dev-room-links';
import {
  COURTYARD,
  HALL_BRIEFS,
  MUSEUM_EXHIBITS,
  MUSEUM_HALLS,
  MUSEUM_JOINS,
  MUSEUM_WALL,
  archToSee,
  beyondAt,
  crossedInto,
  hallArches,
  hallAxes,
  hallBounds,
  hallColumns,
  hallOrigin,
  hallSolids,
  hallWalls,
  nextHall,
  previousHall,
  startOf,
  toMuseum,
  wallWindows,
} from './museum-plan';
import type { MuseumHallId, Rect } from './museum-plan';
import { overlaps } from '../../controls/logic/walk-collision';

const archTo = (from: MuseumHallId, to: MuseumHallId) => {
  const a = hallArches(from).find((x) => x.to === to);
  if (!a) throw new Error(`${from} has no archway to ${to}`);
  return a;
};
const overlapArea = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)) *
  Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));

describe('the pool science museum', () => {
  it('has the welcome and five halls, each reached by its own link and named', () => {
    expect(MUSEUM_HALLS).toEqual([
      'museum0',
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
      expect(DEV_ROOM_NAMES[id]).toContain('PLANTROOMS');
    }
  });

  it('rings the courtyard with the five halls, the welcome on the street, none overlapping', () => {
    for (const a of MUSEUM_HALLS) {
      expect(overlapArea(hallBounds(a), COURTYARD)).toBe(0);
      for (const b of MUSEUM_HALLS)
        if (a !== b) expect(overlapArea(hallBounds(a), hallBounds(b))).toBe(0);
    }
    // The ring's halls together are the square less the courtyard.
    const ring = MUSEUM_EXHIBITS.reduce((sum, id) => {
      const r = hallBounds(id);
      return sum + (r.maxX - r.minX) * (r.maxZ - r.minZ);
    }, 0);
    const square = 46 * 46 - (COURTYARD.maxX - COURTYARD.minX) ** 2;
    expect(ring).toBeCloseTo(square, 9);
    // Each exhibit hall has a wall onto the courtyard (Museum 5's only a short one).
    for (const id of MUSEUM_EXHIBITS)
      expect(
        hallWalls(id).some(
          (w) =>
            [0.25, 0.5, 0.75].some(
              (f) => beyondAt(w, w.from + f * (w.to - w.from)) === 'courtyard',
            ) ||
            beyondAt(w, w.from + 1) === 'courtyard' ||
            beyondAt(w, w.to - 1) === 'courtyard',
        ),
      ).toBe(true);
  });

  it('leads from the welcome round the ring, and from Museum 5 back to Museum 1', () => {
    expect(MUSEUM_JOINS.map(([a, b]) => `${a}>${b}`)).toEqual([
      'museum0>museum1',
      'museum1>museum2',
      'museum2>museum3',
      'museum3>museum4',
      'museum4>museum5',
      'museum5>museum1',
    ]);
    expect(nextHall('museum0')).toBe('museum1');
    expect(nextHall('museum5')).toBe('museum1');
    expect(previousHall('museum1')).toBe('museum0');
    expect(previousHall('museum0')).toBe(null);
    for (const [a, b] of MUSEUM_JOINS) {
      expect(archTo(a, b).onward).toBe(true);
      expect(archTo(b, a).onward).toBe(false);
    }
    // The welcome's is a doorway; the rest archways.
    expect(archTo('museum0', 'museum1').kind).toBe('door');
    expect(archTo('museum1', 'museum0').kind).toBe('door');
    expect(archTo('museum2', 'museum3').kind).toBe('arch');
  });

  it('turns the route 90° at each corner, and goes straight on from Museum 5 into Museum 1', () => {
    const turns = MUSEUM_JOINS.map(([a, b]) => {
      const p = hallAxes(a).along;
      const q = hallAxes(b).along;
      return Math.round(p[0] * q[0] + p[1] * q[1]) + 0;
    });
    // museum0>1 turns (north, then west), 1>2, 2>3, 3>4, 4>5 turn, 5>1 straight.
    expect(turns).toEqual([0, 0, 0, 0, 0, 1]);
  });

  it('puts both sides of each doorway at the same place in the museum, facing each other', () => {
    for (const [a, b] of MUSEUM_JOINS) {
      const near = archTo(a, b);
      const far = archTo(b, a);
      expect(near.at).toEqual(far.at);
      const pa = toMuseum(a, near.frame.x, near.frame.z);
      const pb = toMuseum(b, far.frame.x, far.frame.z);
      expect(pa.x).toBeCloseTo(pb.x, 9);
      expect(pa.z).toBeCloseTo(pb.z, 9);
      expect(Math.cos(near.frame.yaw - far.frame.yaw)).toBeCloseTo(-1, 9);
      // Into each its own room.
      const oa = hallOrigin(a);
      expect(
        near.into[0] * (oa.x - near.at.x) + near.into[1] * (oa.z - near.at.z),
      ).toBeGreaterThan(0);
    }
  });

  it('carries a visitor through every doorway, the corners too, to where they are in the museum, both ways', () => {
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
          // Facing the same way: no room is turned, so a heading carries round the corners.
          expect(Math.cos(there.yaw - pose.yaw)).toBeCloseTo(1, 9);
          const home = throughDoor(back.frame, arch.frame, there);
          expect(home.x).toBeCloseTo(pose.x, 9);
          expect(home.z).toBeCloseTo(pose.z, 9);
        }
      }
    }
  });

  it('hands over on crossing a doorway’s middle, and only there', () => {
    for (const id of MUSEUM_HALLS) {
      for (const arch of hallArches(id)) {
        const at = (ahead: number, side: number) => ({
          x: arch.frame.x + arch.into[0] * ahead + arch.into[1] * side,
          z: arch.frame.z + arch.into[1] * ahead - arch.into[0] * side,
        });
        expect(crossedInto(id, at(0.05, 0.3), at(-0.05, 0.3))).toBe(arch.to);
        expect(crossedInto(id, at(-0.05, 0.3), at(0.05, 0.3))).toBe(null);
        expect(crossedInto(id, at(0.05, arch.w), at(-0.05, arch.w))).toBe(null);
      }
    }
  });

  it('stops a visitor at a doorway until the room beyond is seen through it', () => {
    for (const id of MUSEUM_HALLS) {
      for (const arch of hallArches(id)) {
        const beyond = {
          x: arch.frame.x - arch.into[0] * 0.1,
          z: arch.frame.z - arch.into[1] * 0.1,
        };
        const blocked = (solids: ReturnType<typeof hallSolids>) =>
          solids.some((s) => overlaps(s, beyond.x, beyond.z, 0.17));
        expect(blocked(hallSolids(id))).toBe(true);
        expect(blocked(hallSolids(id, { [arch.to]: true }))).toBe(false);
      }
    }
  });

  it('keeps a way clear in from each doorway to the hall’s middle line and along it, and starts each visitor on the floor', () => {
    for (const id of MUSEUM_HALLS) {
      const solids = hallSolids(id);
      const { along, across, length } = hallAxes(id);
      const free = (x: number, z: number) =>
        !solids.some((s) => overlaps(s, x, z, 0.2));
      // Along the middle line, end to end.
      for (let s = -length / 2 + 0.6; s <= length / 2 - 0.6; s += 0.25)
        expect(free(along[0] * s, along[1] * s), `${id} along ${s}`).toBe(true);
      // In from each doorway, square to its wall, to the middle line.
      for (const a of hallArches(id)) {
        const toMiddle = Math.abs(
          a.frame.x * across[0] + a.frame.z * across[1],
        );
        const deep = Math.max(toMiddle, 1);
        for (let d = MUSEUM_WALL / 2 + 0.3; d <= deep; d += 0.25)
          expect(
            free(a.frame.x + a.into[0] * d, a.frame.z + a.into[1] * d),
            `${id} in from ${a.to} at ${d}`,
          ).toBe(true);
      }
      const s = startOf(id);
      expect(free(s.x, s.z)).toBe(true);
      for (const c of hallColumns(id))
        expect(Math.abs(c.x * across[0] + c.z * across[1])).toBeGreaterThan(2);
    }
  });

  it('glazes the courtyard walls clear and the street walls obscured, and never where a hall is beyond', () => {
    let court = 0;
    for (const id of MUSEUM_HALLS)
      for (const wall of hallWalls(id))
        for (const w of wallWindows(id, wall)) {
          expect(beyondAt(wall, w.u)).toBe(w.kind);
          if (w.kind === 'courtyard') court++;
        }
    expect(court).toBeGreaterThan(8);
    // The welcome is tiled all round.
    for (const wall of hallWalls('museum0'))
      expect(wallWindows('museum0', wall)).toEqual([]);
  });

  it('sees through the doorway the visitor is at, or looking towards', () => {
    // In Museum 2 (heading north): its exit north, its way in from Museum 1 in its east wall.
    const id: MuseumHallId = 'museum2';
    expect(archToSee(id, { x: 0, z: 0, yaw: 0 })).toBe('museum3');
    const back = archTo(id, 'museum1');
    expect(
      archToSee(id, {
        x: back.frame.x + back.into[0] * 0.5,
        z: back.frame.z + back.into[1] * 0.5,
        yaw: 0,
      }),
    ).toBe('museum1');
    // In Museum 1, three ways: the welcome behind (south), on to Museum 2 west, Museum 5 east.
    expect(archToSee('museum1', { x: 0, z: 0, yaw: -Math.PI / 2 })).toBe(
      'museum2',
    );
    expect(archToSee('museum1', { x: 0, z: 0, yaw: Math.PI / 2 })).toBe(
      'museum5',
    );
    expect(archToSee('museum1', { x: 0, z: 0, yaw: Math.PI })).toBe('museum0');
  });
});
