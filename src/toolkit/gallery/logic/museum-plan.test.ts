import { describe, expect, it } from 'vite-plus/test';
import { throughDoor } from './door-joins';
import { DEV_ROOM_NAMES, ROOMS, resolveRoomId } from './dev-room-links';
import {
  HALL_BRIEFS,
  MUSEUM_HALLS,
  MUSEUM_JOINS,
  MUSEUM_WALL,
  HALL0_BANDS,
  hallInterior,
  insideFaceRuns,
  hallLiftOpening,
  hallFireExitOpening,
  hallLiftPlace,
  archToSee,
  hallId,
  hallKind,
  hallNumber,
  beyondAt,
  crossedInto,
  hallArches,
  hallCorridors,
  hallAxes,
  hallColumns,
  hallOrigin,
  hallSolids,
  hallWalls,
  nextHall,
  previousHall,
  startOf,
  toMuseum,
  wallOutlook,
  wallWindows,
} from './museum-plan';
import type { MuseumHallId } from './museum-plan';
import {
  CORRIDOR,
  HALL_PLACES,
  LAYOUT_CORRIDORS,
  corridorShape,
} from './museum-layout';
import { overlaps } from '../../controls/logic/walk-collision';

const archTo = (from: MuseumHallId, to: MuseumHallId) => {
  const a = hallArches(from).find((x) => x.to === to);
  if (!a) throw new Error(`${from} has no archway to ${to}`);
  return a;
};
const corridorTo = (from: MuseumHallId, to: MuseumHallId) => {
  const c = hallCorridors(from).find((x) => x.to === to);
  if (!c) throw new Error(`${from} has no corridor to ${to}`);
  return c;
};
/** A direction in a hall's own coordinates, as it stands in the museum. */
const standing = (id: MuseumHallId, v: readonly [number, number]) => {
  const a = toMuseum(id, 0, 0);
  const b = toMuseum(id, v[0], v[1]);
  return [b.x - a.x, b.z - a.z] as const;
};

describe('the pool science museum', () => {
  it('makes one hall on each side half as big again (the owner, 2026-10-28), in its own frame', () => {
    const size = (n: number) => {
      const r = hallInterior(hallId(n));
      return [r.maxX - r.minX + MUSEUM_WALL, r.maxZ - r.minZ + MUSEUM_WALL];
    };
    const near = (n: number, w: number, d: number) => {
      expect(size(n)[0]).toBeCloseTo(w, 9);
      expect(size(n)[1]).toBeCloseTo(d, 9);
    };
    near(0, 16, 14);
    for (const n of [1, 6]) near(n, 16, 21);
    for (const n of [3, 9]) near(n, 24, 14);
    for (const n of [4, 5, 8]) near(n, 16, 14);
    // Halls 2 and 7 grown 5 m (layout C), so Hall 2's doorways clear its plant.
    for (const n of [2, 7]) near(n, 21, 19);
    // Halls 3 and 9 stand turned, long north–south (layout C).
    expect(HALL_PLACES[3].turn % 2).toBe(1);
    expect(HALL_PLACES[9].turn % 2).toBe(1);
  });

  it('has the welcome and thirteen halls, each reached by its own link and named', () => {
    expect(MUSEUM_HALLS).toHaveLength(10);
    MUSEUM_HALLS.forEach((id, n) => {
      expect(id).toBe(`museum${n}`);
      expect(hallNumber(id)).toBe(n);
      expect(hallId(n)).toBe(id);
      expect(HALL_BRIEFS[id].number).toBe(n);
      expect(ROOMS).toContain(id);
      expect(resolveRoomId(id)).toBe(id);
      expect(DEV_ROOM_NAMES[id]).toContain(HALL_BRIEFS[id].title.toUpperCase());
      expect(DEV_ROOM_NAMES[id]).toContain('PLANTROOMS');
    });
    expect(hallId(10)).toBe('museum0');
    expect(hallId(-1)).toBe('museum9');
  });

  it('signs every hall with its real title, none coming soon', () => {
    expect(
      Array.from({ length: 10 }, (_, n) => HALL_BRIEFS[hallId(n)].title),
    ).toEqual([
      'Welcome',
      'Warm water',
      'Clean water',
      'Safe water',
      'The chemistry of pools',
      'A Day in the Life',
      'Grundflow’s Amazing World of Pumps',
      'Grout: The Unsung Hero of the Aquatics World',
      'Never again: putting safety first',
      'The whole plant',
    ]);
    for (let n = 0; n <= 9; n++) {
      expect(HALL_BRIEFS[hallId(n)].themed).toBe(true);
      expect(HALL_BRIEFS[hallId(n)].title).not.toMatch(/coming soon/i);
    }
    expect(HALL_BRIEFS.museum6.subject).toBe('We Keep Water Moving');
  });

  it('stands the halls round the ring (layout C), each with a wall onto the street and the corners two', () => {
    for (const id of MUSEUM_HALLS) {
      const street = hallWalls(id).filter((w) => beyondAt(w) === 'street');
      expect(street.length, id).toBe(hallKind(id) === 'side' ? 1 : 2);
    }
    expect(MUSEUM_HALLS.filter((id) => hallKind(id) === 'corner')).toEqual([
      'museum2',
      'museum5',
      'museum7',
    ]);
    expect(hallKind('museum0')).toBe('welcome');
  });

  it('leads from the welcome north round the ring, and from Hall 9 back into the welcome', () => {
    expect(MUSEUM_JOINS).toHaveLength(10);
    MUSEUM_JOINS.forEach(([a, b], n) => {
      expect(a).toBe(hallId(n));
      expect(b).toBe(hallId(n + 1));
      expect(archTo(a, b).onward).toBe(true);
      expect(archTo(b, a).onward).toBe(false);
      expect(hallArches(a).length).toBe(2);
    });
    expect(nextHall('museum9')).toBe('museum0');
    expect(previousHall('museum0')).toBe('museum9');
    expect(previousHall('museum1')).toBe('museum0');
    // Doorways all, into corridors; from the welcome west to Hall 1, and
    // into it from the east, from Hall 9.
    for (const id of MUSEUM_HALLS)
      for (const a of hallArches(id)) expect(a.kind).toBe('arch');
    expect(archTo('museum0', 'museum1').into).toEqual([1, 0]);
    expect(archTo('museum0', 'museum9').into).toEqual([-1, 0]);
    const headings = MUSEUM_HALLS.map((id) => hallAxes(id).along.join(','));
    expect(headings.slice(0, 2)).toEqual(Array(2).fill('0,-1'));
    expect(headings.slice(2, 5)).toEqual(Array(3).fill('1,0'));
    expect(headings.slice(5, 7)).toEqual(Array(2).fill('0,1'));
    expect(headings.slice(7)).toEqual(Array(3).fill('-1,0'));
  });

  it('builds each corridor alike in both halls, its hand-over at the same place, facing each other', () => {
    for (const [a, b] of MUSEUM_JOINS) {
      const near = corridorTo(a, b);
      const far = corridorTo(b, a);
      const pa = toMuseum(a, near.handOver.x, near.handOver.z);
      const pb = toMuseum(b, far.handOver.x, far.handOver.z);
      expect(pa.x).toBeCloseTo(pb.x, 9);
      expect(pa.z).toBeCloseTo(pb.z, 9);
      const ta = standing(a, near.handOver.toward);
      const tb = standing(b, far.handOver.toward);
      expect(ta[0] + tb[0]).toBeCloseTo(0, 9);
      expect(ta[1] + tb[1]).toBeCloseTo(0, 9);
      // The same path, the other way round, in the museum.
      const ma = near.path.map((q) => toMuseum(a, q.x, q.z));
      const mb = [...far.path].reverse().map((q) => toMuseum(b, q.x, q.z));
      ma.forEach((q, k) => {
        expect(q.x).toBeCloseTo(mb[k].x, 9);
        expect(q.z).toBeCloseTo(mb[k].z, 9);
      });
      const door = archTo(a, b);
      const at = toMuseum(a, door.frame.x, door.frame.z);
      // It leaves from the doorway, out of the wall's outside face.
      expect(Math.hypot(ma[0].x - at.x, ma[0].z - at.z)).toBeCloseTo(
        MUSEUM_WALL / 2,
        9,
      );
    }
  });

  it('carries a visitor across every hand-over to where they are in the museum, both ways', () => {
    const poses = [
      { x: 0, z: 0, yaw: 0 },
      { x: 0.2, z: 0.4, yaw: 0.7 },
      { x: -0.3, z: -0.2, yaw: 3 },
    ];
    for (const id of MUSEUM_HALLS) {
      for (const c of hallCorridors(id)) {
        const back = corridorTo(c.to, id);
        for (const offset of poses) {
          const pose = {
            x: c.frame.x + offset.x,
            z: c.frame.z + offset.z,
            yaw: offset.yaw,
          };
          const there = throughDoor(c.frame, back.frame, pose);
          const here = toMuseum(id, pose.x, pose.z);
          const beyond = toMuseum(c.to, there.x, there.z);
          expect(beyond.x).toBeCloseTo(here.x, 9);
          expect(beyond.z).toBeCloseTo(here.z, 9);
          // Facing the same way in the museum, the turned halls too.
          const f = (yaw: number) => [Math.sin(yaw), -Math.cos(yaw)] as const;
          const fh = standing(id, f(pose.yaw));
          const fb = standing(c.to, f(there.yaw));
          expect(fh[0]).toBeCloseTo(fb[0], 9);
          expect(fh[1]).toBeCloseTo(fb[1], 9);
          const home = throughDoor(back.frame, c.frame, there);
          expect(home.x).toBeCloseTo(pose.x, 9);
          expect(home.z).toBeCloseTo(pose.z, 9);
        }
      }
    }
  });

  it('hands over on crossing a corridor’s hand-over line, at its turn, and only there', () => {
    for (const id of MUSEUM_HALLS) {
      for (const c of hallCorridors(id)) {
        const [tx, tz] = c.handOver.toward;
        const at = (ahead: number, side: number) => ({
          x: c.handOver.x + tx * ahead + tz * side,
          z: c.handOver.z + tz * ahead - tx * side,
        });
        expect(crossedInto(id, at(-0.05, 0.3), at(0.05, 0.3))).toBe(c.to);
        expect(crossedInto(id, at(0.05, 0.3), at(-0.05, 0.3))).toBe(null);
        expect(
          crossedInto(id, at(-0.05, CORRIDOR.width), at(0.05, CORRIDOR.width)),
        ).toBe(null);
      }
    }
  });

  it('stops a visitor at a hand-over until the room beyond is seen along the corridor', () => {
    for (const id of MUSEUM_HALLS) {
      for (const c of hallCorridors(id)) {
        const beyond = {
          x: c.handOver.x + c.handOver.toward[0] * 0.25,
          z: c.handOver.z + c.handOver.toward[1] * 0.25,
        };
        const blocked = (solids: ReturnType<typeof hallSolids>) =>
          solids.some((s) => overlaps(s, beyond.x, beyond.z, 0.17));
        expect(blocked(hallSolids(id))).toBe(true);
        expect(blocked(hallSolids(id, { [c.to]: true }))).toBe(false);
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

  it('glazes only walls looking out of the ring (obscured) or into the courtyard (clear), never one with a corridor’s doorway', () => {
    let court = 0;
    let street = 0;
    for (const id of MUSEUM_HALLS)
      for (const wall of hallWalls(id)) {
        const windows = wallWindows(id, wall);
        const doors = hallArches(id).filter(
          (a) =>
            a.axis === wall.axis &&
            Math.abs((wall.axis === 'x' ? a.at.z : a.at.x) - wall.line) < 1e-9,
        );
        if (doors.length) expect(windows, `${id} ${wall.side}`).toEqual([]);
        for (const w of windows) {
          const outlook = wallOutlook(id, wall);
          expect(outlook).not.toBe('along');
          expect(w.kind).toBe(outlook === 'outside' ? 'street' : 'courtyard');
          if (w.kind === 'courtyard') court++;
          else street++;
        }
      }
    expect(court).toBeGreaterThan(4);
    expect(street).toBeGreaterThan(4);
    // The welcome is tiled all round.
    for (const wall of hallWalls('museum0'))
      expect(wallWindows('museum0', wall)).toEqual([]);
  });

  it('runs no corridor past a window: each window looks out over open ground', () => {
    const corridors = LAYOUT_CORRIDORS.map((c) => corridorShape(c.path));
    const inside = (
      f: { minX: number; maxX: number; minZ: number; maxZ: number },
      x: number,
      z: number,
    ) => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ;
    for (const id of MUSEUM_HALLS)
      for (const wall of hallWalls(id))
        for (const w of wallWindows(id, wall))
          for (const along of [-w.w / 2, 0, w.w / 2])
            for (const out of [0.5, 2, 4]) {
              // In the hall's own plan, then in the museum.
              const o = hallOrigin(id);
              const ux = wall.axis === 'x' ? w.u + along : wall.line;
              const uz = wall.axis === 'x' ? wall.line : w.u + along;
              const p = toMuseum(
                id,
                ux - o.x + wall.out[0] * out,
                uz - o.z + wall.out[1] * out,
              );
              for (const c of corridors)
                for (const f of [...c.walls, ...c.floor])
                  expect(inside(f, p.x, p.z), `${id} ${wall.side} window`).toBe(
                    false,
                  );
            }
  });

  it('sees along the corridor the visitor is in, or the one whose doorway is nearest', () => {
    for (const id of MUSEUM_HALLS)
      for (const c of hallCorridors(id)) {
        expect(
          archToSee(id, { x: c.handOver.x, z: c.handOver.z, yaw: 0 }),
        ).toBe(c.to);
        const door = archTo(id, c.to);
        expect(
          archToSee(id, {
            x: door.frame.x + door.into[0] * 0.5,
            z: door.frame.z + door.into[1] * 0.5,
            yaw: 0,
          }),
        ).toBe(c.to);
      }
  });
});

describe('Hall 0’s tiles (107-1, 2026-10-28)', () => {
  it('runs Hall 0’s cove and bands round its walls, broken at its doorways and windows', () => {
    const inner = hallInterior('museum0');
    const perimeter = 2 * (inner.maxX - inner.minX + inner.maxZ - inner.minZ);
    const length = (runs: { from: number; to: number }[]) =>
      runs.reduce((s, r) => s + r.to - r.from, 0);
    // Its doorways, the freight lift's opening (mission 108) and the fire exit.
    const doors =
      hallArches('museum0').reduce((s, a) => s + a.w, 0) +
      (hallLiftOpening('museum0')?.w ?? 0) +
      (hallFireExitOpening('museum0')?.w ?? 0);
    expect(length(insideFaceRuns('museum0', 0))).toBeCloseTo(
      perimeter - doors,
      6,
    );
    for (const r of insideFaceRuns('museum0', 0))
      expect(r.to).toBeGreaterThan(r.from);
    // Above the doorways' heads, only the windows break a band.
    const high = HALL0_BANDS[2];
    const windows = hallWalls('museum0')
      .flatMap((w) => wallWindows('museum0', w))
      .filter((w) => high.y + high.h >= w.sill && high.y <= w.head)
      .reduce((s, w) => s + w.w, 0);
    expect(length(insideFaceRuns('museum0', high.y, high.h))).toBeCloseTo(
      perimeter - windows,
      6,
    );
  });
});

describe('the black boxes (the owner, 2026-10-29)', () => {
  it('makes Hall 7 and Hall 8 black boxes: no windows, no columns, no fire kit, their walls and archways kept', async () => {
    const {
      BLACK_BOX_HALLS,
      hallArches,
      hallColumns,
      hallWalls,
      isBlackBox,
      wallWindows,
    } = await import('./museum-plan');
    const { safetyLayer, ALL_SAFETY_ROOMS } = await import('./museum-safety');
    expect([...BLACK_BOX_HALLS].sort()).toEqual(['museum7', 'museum8']);
    for (const id of BLACK_BOX_HALLS) {
      expect(isBlackBox(id)).toBe(true);
      for (const wall of hallWalls(id))
        expect(wallWindows(id, wall)).toEqual([]);
      expect(hallColumns(id)).toEqual([]);
      expect(safetyLayer(id)).toEqual([]);
      expect(ALL_SAFETY_ROOMS).not.toContain(id);
      expect(hallArches(id).length).toBe(2);
    }
    // Their neighbours keep theirs.
    expect(isBlackBox('museum6')).toBe(false);
    expect(hallColumns('museum6').length).toBeGreaterThan(0);
  });
});

describe('the freight lift’s landing in Hall 0 (mission 108)', () => {
  it('stands on its north wall, with the fire exit, facing into the hall, only in Hall 0', () => {
    const place = hallLiftPlace('museum0')!;
    const inner = hallInterior('museum0');
    const o = hallOrigin('museum0');
    expect(place.z + o.z).toBeCloseTo(inner.minZ);
    // Facing south, into the hall: +z.
    expect(Math.cos(place.yaw)).toBeCloseTo(1);
    expect(hallLiftPlace('museum1')).toBeNull();
  });
  it('leaves its opening out of the walls a walker meets', () => {
    const place = hallLiftPlace('museum0')!;
    const lift = hallLiftOpening('museum0')!;
    const solids = hallSolids('museum0');
    const blocked = (x: number, z: number) =>
      solids.some((f) => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ);
    // Just behind the face in the middle of the opening: open.
    expect(blocked(place.x, place.z - 0.1)).toBe(false);
    // Beside it, beyond the frame: wall.
    expect(blocked(place.x + lift.w / 2 + 0.2, place.z - 0.1)).toBe(true);
  });
});
