import { describe, expect, it } from 'vite-plus/test';
import { throughDoor } from './door-joins';
import { DEV_ROOM_NAMES, ROOMS, resolveRoomId } from './dev-room-links';
import {
  COURTYARD,
  HALL_BRIEFS,
  MUSEUM_HALLS,
  MUSEUM_JOINS,
  MUSEUM_SQUARE,
  MUSEUM_WALL,
  BUILDING,
  archToSee,
  detailSets,
  emptyHallShape,
  hallDetail,
  hallId,
  hallKind,
  hallNumber,
  ringDistance,
  ringNeighbours,
  ringSide,
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

  it('signs the halls in the owner’s order: 1 to 4 and 9 themed, 5 to 8 coming soon', () => {
    expect(
      ['museum1', 'museum2', 'museum3', 'museum4', 'museum9'].map(
        (id) => HALL_BRIEFS[id as MuseumHallId].title,
      ),
    ).toEqual([
      'Warm water',
      'Clean water',
      'Safe water',
      'The chemistry of pools',
      'The whole plant',
    ]);
    for (let n = 5; n <= 8; n++) {
      expect(HALL_BRIEFS[hallId(n)].themed).toBe(false);
      expect(HALL_BRIEFS[hallId(n)].title).toBe('Coming soon');
    }
  });

  it('rings the courtyard with ten halls, four by three, tiling the building less the courtyard with nothing overlapping', () => {
    const area = (r: Rect) => (r.maxX - r.minX) * (r.maxZ - r.minZ);
    for (const a of MUSEUM_HALLS) {
      expect(overlapArea(hallBounds(a), COURTYARD)).toBe(0);
      for (const b of MUSEUM_HALLS)
        if (a !== b) expect(overlapArea(hallBounds(a), hallBounds(b))).toBe(0);
    }
    const ring = MUSEUM_HALLS.reduce(
      (sum, id) => sum + area(hallBounds(id)),
      0,
    );
    expect(ring).toBeCloseTo(area(BUILDING) - area(COURTYARD), 9);
    expect(BUILDING.maxX - BUILDING.minX).toBe(4 * MUSEUM_SQUARE.cellW);
    expect(BUILDING.maxZ - BUILDING.minZ).toBe(3 * MUSEUM_SQUARE.cellD);
    expect(COURTYARD.maxX - COURTYARD.minX).toBe(2 * MUSEUM_SQUARE.cellW);
    expect(COURTYARD.maxZ - COURTYARD.minZ).toBe(1 * MUSEUM_SQUARE.cellD);
    // Hall 0 in the south-west corner; 2, 5 and 7 the other corners.
    const corner = (id: MuseumHallId) => {
      const r = hallBounds(id);
      return `${r.minZ === BUILDING.minZ ? 'n' : r.maxZ === BUILDING.maxZ ? 's' : '-'}${r.minX === BUILDING.minX ? 'w' : r.maxX === BUILDING.maxX ? 'e' : '-'}`;
    };
    expect(corner('museum0')).toBe('sw');
    expect(corner('museum2')).toBe('nw');
    expect(corner('museum5')).toBe('ne');
    expect(corner('museum7')).toBe('se');
    // The side halls each have a wall onto the courtyard; the corners none.
    for (const id of MUSEUM_HALLS) {
      const onto = hallWalls(id).some(
        (w) => beyondAt(w, (w.from + w.to) / 2) === 'courtyard',
      );
      expect(onto, id).toBe(hallKind(id) === 'side');
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
      // Rooms that join share a wall.
      expect(hallArches(a).length).toBe(2);
    });
    expect(nextHall('museum9')).toBe('museum0');
    expect(previousHall('museum0')).toBe('museum9');
    expect(previousHall('museum1')).toBe('museum0');
    // The welcome's are doorways; the rest archways.
    expect(archTo('museum0', 'museum1').kind).toBe('door');
    expect(archTo('museum9', 'museum0').kind).toBe('door');
    expect(archTo('museum2', 'museum3').kind).toBe('arch');
    // North from the welcome into Hall 1; into the welcome from the east.
    expect(archTo('museum0', 'museum1').into).toEqual([0, 1]);
    expect(archTo('museum0', 'museum9').into).toEqual([-1, 0]);
    const headings = MUSEUM_HALLS.map((id) => hallAxes(id).along.join(','));
    expect(headings.slice(0, 2)).toEqual(Array(2).fill('0,-1'));
    expect(headings.slice(2, 5)).toEqual(Array(3).fill('1,0'));
    expect(headings.slice(5, 7)).toEqual(Array(2).fill('0,1'));
    expect(headings.slice(7)).toEqual(Array(3).fill('-1,0'));
  });

  it('turns the route 90° in every corner and goes straight through every side hall', () => {
    for (const id of MUSEUM_HALLS) {
      const [inArch, outArch] = [
        archTo(id, previousHall(id)),
        archTo(id, nextHall(id)),
      ];
      const dot =
        inArch.into[0] * outArch.into[0] + inArch.into[1] * outArch.into[1];
      expect(dot + 0, id).toBe(hallKind(id) === 'side' ? -1 : 0);
    }
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
    // In Hall 2 (heading north): on north into Hall 3, back south into Hall 1.
    const id: MuseumHallId = 'museum2';
    expect(archToSee(id, { x: 0, z: 0, yaw: 0 })).toBe('museum3');
    expect(archToSee(id, { x: 0, z: 0, yaw: Math.PI })).toBe('museum1');
    const back = archTo(id, 'museum1');
    expect(
      archToSee(id, {
        x: back.frame.x + back.into[0] * 0.5,
        z: back.frame.z + back.into[1] * 0.5,
        yaw: 0,
      }),
    ).toBe('museum1');
    // In the welcome: north to Hall 1, east to Hall 9.
    expect(archToSee('museum0', { x: 0, z: 0, yaw: 0 })).toBe('museum1');
    expect(archToSee('museum0', { x: 0, z: 0, yaw: Math.PI / 2 })).toBe(
      'museum9',
    );
  });

  it('draws the visitor’s hall and its neighbours in full and every hall further away empty', () => {
    for (const visitor of MUSEUM_HALLS) {
      const { full, empty } = detailSets(visitor);
      const [back, on] = ringNeighbours(visitor);
      expect([...full].sort()).toEqual([visitor, back, on].sort());
      expect(empty).toHaveLength(7);
      expect(hallDetail(visitor, visitor)).toBe('full');
      for (const h of empty) {
        expect(ringDistance(visitor, h)).toBeGreaterThan(1);
        // Beyond one neighbour or the other, the shorter way.
        const side = ringSide(visitor, h);
        const d = (hallNumber(h) - hallNumber(visitor) + 10) % 10;
        expect(side).toBe(d <= 5 ? 'onward' : 'back');
      }
    }
    // Two halls down a side: from Hall 1, Halls 0 and 2 full, Hall 3 empty.
    expect(hallDetail('museum1', 'museum3')).toBe('empty');
    expect(hallDetail('museum1', 'museum2')).toBe('full');
    expect(ringDistance('museum0', 'museum9')).toBe(1);
    expect(ringDistance('museum0', 'museum5')).toBe(5);
  });

  it('gives every empty hall its kind and its archways, as the full hall has them', () => {
    for (const id of MUSEUM_HALLS) {
      const shape = emptyHallShape(id);
      expect(shape.kind).toBe(hallKind(id));
      expect(shape.arches.map((a) => a.to).sort()).toEqual(
        [previousHall(id), nextHall(id)].sort(),
      );
      expect(shape.walls).toHaveLength(4);
    }
  });
});
