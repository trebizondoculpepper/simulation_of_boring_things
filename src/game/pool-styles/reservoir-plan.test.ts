import { describe, expect, it } from 'vite-plus/test';
import {
  BOARDWALK,
  BOUNDS,
  COLUMNS,
  DEPTH,
  DEPTH_MARKS,
  DOOR_Z,
  LIFEGUARD_CHAIR,
  WALK_WIDTH,
  markedColumns,
  walkable,
  waterSolids,
} from './reservoir-plan';
import { insideRect } from './geometry';

describe('the Reservoir', () => {
  it('stands a landing in front of each door', () => {
    expect(walkable(BOUNDS.minX + 1.5, DOOR_Z)).toBe(true);
    expect(walkable(BOUNDS.maxX - 1.5, DOOR_Z)).toBe(true);
  });

  it('joins the two landings by its boardwalk, and nothing else is dry', () => {
    // A walk across a fine grid of walkable cells, from the west door.
    const cell = 0.5;
    const key = (x: number, z: number) => `${x},${z}`;
    const start = [BOUNDS.minX + 1.5, DOOR_Z] as const;
    const seen = new Set([key(...start)]);
    const queue: (readonly [number, number])[] = [start];
    while (queue.length) {
      const [x, z] = queue.shift()!;
      for (const [dx, dz] of [
        [cell, 0],
        [-cell, 0],
        [0, cell],
        [0, -cell],
      ]) {
        const nx = x + dx,
          nz = z + dz;
        if (!walkable(nx, nz) || seen.has(key(nx, nz))) continue;
        seen.add(key(nx, nz));
        queue.push([nx, nz]);
      }
    }
    expect(seen.has(key(BOUNDS.maxX - 1.5, DOOR_Z))).toBe(true);
    expect(walkable(0, -11)).toBe(false);
  });

  it('raises its columns in the water, clear of the boardwalk and of each other', () => {
    expect(COLUMNS.length).toBeGreaterThanOrEqual(10);
    for (const c of COLUMNS) {
      expect(walkable(c.x, c.z)).toBe(false);
      for (const w of BOARDWALK)
        expect(
          insideRect(
            {
              minX: w.minX - c.r,
              maxX: w.maxX + c.r,
              minZ: w.minZ - c.r,
              maxZ: w.maxZ + c.r,
            },
            c.x,
            c.z,
          ),
        ).toBe(false);
      for (const o of COLUMNS)
        if (o !== c)
          expect(Math.hypot(o.x - c.x, o.z - c.z)).toBeGreaterThan(o.r + c.r);
    }
    expect(new Set(COLUMNS.map((c) => c.top)).size).toBe(2);
  });

  it('marks its depth on the columns nearest the boardwalk, no deeper than it is', () => {
    const marked = markedColumns();
    expect(marked).toHaveLength(DEPTH_MARKS.length);
    expect(DEPTH_MARKS).toEqual(['0.5 m', '1.0 m', '2.0 m']);
    // None deeper than the water is.
    for (const mark of DEPTH_MARKS)
      expect(parseFloat(mark)).toBeLessThanOrEqual(DEPTH);
  });

  it('stands its lifeguard’s chair in the water, its seat up in the dark', () => {
    expect(walkable(LIFEGUARD_CHAIR.x, LIFEGUARD_CHAIR.z)).toBe(false);
    expect(LIFEGUARD_CHAIR.seat).toBeGreaterThan(7);
    for (const c of COLUMNS)
      expect(
        Math.hypot(c.x - LIFEGUARD_CHAIR.x, c.z - LIFEGUARD_CHAIR.z),
      ).toBeGreaterThan(c.r + 1.5);
  });

  it('keeps the walker out of the water, and on the boardwalk free', () => {
    const solids = waterSolids();
    const blocked = (x: number, z: number) =>
      solids.some((r) => insideRect(r, x, z));
    expect(blocked(0, -11)).toBe(true);
    expect(blocked(-9, 5)).toBe(false);
    expect(blocked(-9 + WALK_WIDTH, 5)).toBe(true);
  });
});
