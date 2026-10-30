import { describe, expect, it } from 'vite-plus/test';
import {
  CORRIDOR,
  DOOR_FROM_CORNER,
  FIRST_LEG,
  HALL_PLACES,
  LAYOUT_CORRIDORS,
  LAYOUT_WALL,
  blindL,
  corridorShape,
  innerLegs,
  placeRect,
} from './museum-layout';
import { MUSEUM_ARCH } from './museum-plan';

type Box = { minX: number; maxX: number; minZ: number; maxZ: number };
const overlap = (a: Box, b: Box) =>
  a.minX < b.maxX - 1e-6 &&
  b.minX < a.maxX - 1e-6 &&
  a.minZ < b.maxZ - 1e-6 &&
  b.minZ < a.maxZ - 1e-6;
const outer = (n: number): Box => {
  const r = placeRect(HALL_PLACES[n]);
  const t = LAYOUT_WALL / 2;
  return {
    minX: r.minX - t,
    maxX: r.maxX + t,
    minZ: r.minZ - t,
    maxZ: r.maxZ + t,
  };
};

describe('the museum’s layout C', () => {
  it('stands the ten halls apart, at their sizes, Halls 3 and 9 turned long north–south', () => {
    expect(HALL_PLACES).toHaveLength(10);
    for (let i = 0; i < 10; i++)
      for (let j = i + 1; j < 10; j++)
        expect(overlap(outer(i), outer(j)), `${i} ${j}`).toBe(false);
    expect([HALL_PLACES[3].w, HALL_PLACES[3].d]).toEqual([14, 24]);
    expect([HALL_PLACES[9].w, HALL_PLACES[9].d]).toEqual([14, 24]);
    expect([HALL_PLACES[1].w, HALL_PLACES[1].d]).toEqual([16, 21]);
  });

  it('joins each hall to the next by one corridor with one hard right-angled corner, its mouths on the halls’ doorways', () => {
    for (const c of LAYOUT_CORRIDORS) {
      expect(c.b).toBe((c.a + 1) % 10);
      const [a, m, b] = c.path;
      // Two legs, square to each other.
      const d1 = [m.x - a.x, m.z - a.z];
      const d2 = [b.x - m.x, b.z - m.z];
      expect(d1[0] * d2[0] + d1[1] * d2[1]).toBeCloseTo(0, 9);
      // Each mouth on its hall's wall's outside face, at its doorway.
      for (const [door, p] of [
        [c.doorA, a],
        [c.doorB, b],
      ] as const) {
        const r = placeRect(HALL_PLACES[door.n]);
        const t = LAYOUT_WALL / 2;
        const want =
          door.side === 'west'
            ? { x: r.minX - t, z: door.u }
            : door.side === 'east'
              ? { x: r.maxX + t, z: door.u }
              : door.side === 'north'
                ? { x: door.u, z: r.minZ - t }
                : { x: door.u, z: r.maxZ + t };
        expect(p.x).toBeCloseTo(want.x, 9);
        expect(p.z).toBeCloseTo(want.z, 9);
      }
    }
  });

  it('is the same corridor every time, mirrored for a left turn, big enough for an archway and a storey and a half tall', () => {
    const legs = LAYOUT_CORRIDORS.map((c) =>
      [...innerLegs(c.path)].sort((x, y) => x - y).map((v) => v.toFixed(6)),
    );
    expect(new Set(legs.map((l) => l.join())).size).toBe(1);
    expect(Number(legs[0][0])).toBeCloseTo(FIRST_LEG, 6);
    expect(CORRIDOR.width).toBeGreaterThanOrEqual(2);
    expect(CORRIDOR.width).toBeGreaterThan(MUSEUM_ARCH.w);
    expect(CORRIDOR.height).toBeGreaterThanOrEqual(4);
    // The archway and a pier clear of its wall's corner.
    expect(DOOR_FROM_CORNER - MUSEUM_ARCH.w / 2).toBeGreaterThanOrEqual(0.3);
  });

  it('lets no hall be seen from another: every corridor’s corner is blind', () => {
    for (const c of LAYOUT_CORRIDORS) {
      const [l1, l2] = innerLegs(c.path);
      expect(blindL(l1, l2), `${c.a}-${c.b}`).toBe(true);
    }
  });

  it('runs no corridor through a hall or another corridor', () => {
    const walls = LAYOUT_CORRIDORS.map((c) => corridorShape(c.path).walls);
    walls.forEach((fs, k) => {
      const c = LAYOUT_CORRIDORS[k];
      for (const p of HALL_PLACES) {
        if (p.n === c.a || p.n === c.b) continue;
        for (const f of fs)
          expect(
            overlap(f, outer(p.n)),
            `corridor ${c.a}-${c.b} and hall ${p.n}`,
          ).toBe(false);
      }
      walls.forEach((gs, j) => {
        if (j <= k) return;
        for (const f of fs)
          for (const g of gs)
            expect(overlap(f, g), `corridors ${k} ${j}`).toBe(false);
      });
    });
  });

  it('closes its walls round the corner and leaves both mouths open', () => {
    for (const c of LAYOUT_CORRIDORS) {
      const { walls, floor } = corridorShape(c.path);
      expect(walls).toHaveLength(4);
      expect(floor).toHaveLength(2);
      // Neither mouth is walled across.
      for (const p of [c.path[0], c.path[2]])
        for (const w of walls)
          expect(
            p.x > w.minX + 1e-6 &&
              p.x < w.maxX - 1e-6 &&
              p.z > w.minZ + 1e-6 &&
              p.z < w.maxZ - 1e-6,
          ).toBe(false);
    }
  });
});
