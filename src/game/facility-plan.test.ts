import { describe, expect, it } from 'vite-plus/test';
import {
  DOORS,
  DOOR_HEIGHT,
  ROOMS,
  START,
  WALL,
  openingsOf,
  reachable,
  roomAt,
  roomById,
  sharedWall,
  sideSpan,
  wallFootprints,
  wallRuns,
} from './facility-plan';
import { cardWidth } from './title-card';

describe('the facility plan', () => {
  it('gives every room a unique id and a positive size', () => {
    expect(new Set(ROOMS.map((r) => r.id)).size).toBe(ROOMS.length);
    for (const r of ROOMS) {
      expect(r.maxX).toBeGreaterThan(r.minX);
      expect(r.maxZ).toBeGreaterThan(r.minZ);
      expect(r.height).toBeGreaterThan(DOOR_HEIGHT);
    }
  });

  it('never overlaps two rooms', () => {
    for (const a of ROOMS)
      for (const b of ROOMS) {
        if (a === b) continue;
        const apart =
          a.maxX <= b.minX ||
          b.maxX <= a.minX ||
          a.maxZ <= b.minZ ||
          b.maxZ <= a.minZ;
        expect(apart, `${a.id} overlaps ${b.id}`).toBe(true);
      }
  });

  it('puts every doorway inside a wall the two rooms share', () => {
    for (const door of DOORS) {
      const [a, b] = door.rooms.map((id) => roomById(id));
      const wall = sharedWall(a, b);
      expect(wall, door.rooms.join('/')).not.toBeNull();
      if (!wall) continue;
      // Clear of the corners by at least a wall's thickness.
      expect(door.at - door.width / 2).toBeGreaterThanOrEqual(wall.from + WALL);
      expect(door.at + door.width / 2).toBeLessThanOrEqual(wall.to - WALL);
    }
  });

  it('never overlaps two doorways in one wall', () => {
    for (const room of ROOMS)
      for (const side of Object.values(openingsOf(room)))
        for (let i = 1; i < side.length; i++)
          expect(side[i].from).toBeGreaterThan(side[i - 1].to);
  });

  it('can walk from reception to every room', () => {
    const seen = reachable(START.room);
    for (const room of ROOMS) expect(seen.has(room.id), room.id).toBe(true);
  });

  it('keeps the back of house behind staff doors', () => {
    const publicIds = new Set(
      ROOMS.filter((r) => r.zone === 'public').map((r) => r.id),
    );
    // Without the doors into the corridor, no service room is reachable.
    const publicDoors = DOORS.filter(
      (d) => publicIds.has(d.rooms[0]) && publicIds.has(d.rooms[1]),
    );
    const seen = reachable(START.room, publicDoors);
    expect([...seen].every((id) => publicIds.has(id))).toBe(true);
  });

  it('starts the player inside the starting room', () => {
    expect(roomAt(START.x, START.z)?.id).toBe(START.room);
  });

  it('hangs each title card on a stretch of solid wall', () => {
    for (const room of ROOMS) {
      const span = sideSpan(room, room.card);
      const centre = (span.from + span.to) / 2;
      const half = cardWidth(room) / 2 + 0.2;
      const runs = wallRuns(span, openingsOf(room)[room.card]);
      expect(
        runs.some((r) => r.from <= centre - half && r.to >= centre + half),
        room.id,
      ).toBe(true);
    }
  });

  it('leaves every doorway open to walk through', () => {
    const walls = wallFootprints();
    for (const door of DOORS) {
      const [a, b] = door.rooms.map((id) => roomById(id));
      const wall = sharedWall(a, b);
      if (!wall) continue;
      const alongX = wall.side === 'north' || wall.side === 'south';
      const x = alongX ? door.at : wall.line;
      const z = alongX ? wall.line : door.at;
      const blocked = walls.some(
        (f) => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ,
      );
      expect(blocked, door.rooms.join('/')).toBe(false);
    }
  });
});
