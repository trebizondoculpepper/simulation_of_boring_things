import { describe, expect, it } from 'vite-plus/test';
import {
  ARCADE,
  COLUMNS,
  DEEP_END,
  POOL_FLOOR,
  WADE_DEPTH,
  POOL_OUTLINE,
  POOL_RECTS,
  ROOM,
  WATER_Y,
  inPool,
  poolEdges,
  poolFloorAt,
  poolRoomSolids,
  slabPieces,
  DECK_GULLIES,
  FLOOR_INLETS,
  MAIN_DRAINS,
  WALL_FITTINGS,
  overflowStrips,
  offsetOutline,
  OVERFLOW_WIDTH,
} from './pool-room-plan';
/** The walker's eye height, metres (EYE_HEIGHT_METRES in first-person.ts). */
const EYE_HEIGHT_METRES = 1.8;

const inside = (
  f: { minX: number; maxX: number; minZ: number; maxZ: number },
  x: number,
  z: number,
) => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ;

describe('the poolrooms room', () => {
  it('keeps the pool inside the room and clear of the door on the west wall', () => {
    for (const [x, z] of POOL_OUTLINE) {
      expect(x).toBeGreaterThan(ROOM.minX + 2);
      expect(x).toBeLessThan(ROOM.maxX);
      expect(z).toBeGreaterThan(ROOM.minZ);
      expect(z).toBeLessThan(ROOM.maxZ - 2);
    }
  });

  it('outlines exactly the rectangles of water', () => {
    // The outline's area equals the rectangles' (which do not overlap).
    let twice = 0;
    POOL_OUTLINE.forEach(([x0, z0], i) => {
      const [x1, z1] = POOL_OUTLINE[(i + 1) % POOL_OUTLINE.length];
      twice += x0 * z1 - x1 * z0;
    });
    const area = POOL_RECTS.reduce(
      (n, r) => n + (r.maxX - r.minX) * (r.maxZ - r.minZ),
      0,
    );
    expect(Math.abs(twice) / 2).toBeCloseTo(area);
  });

  it('is shallow enough to wade, the water below the eye', () => {
    expect(poolFloorAt(0, 0)).toBe(POOL_FLOOR);
    expect(POOL_FLOOR + EYE_HEIGHT_METRES).toBeGreaterThan(WATER_Y + 0.5);
  });

  it('steps down into the water at the west end no more than 0.3 m at a time', () => {
    let level = poolFloorAt(-9.5, 1);
    expect(level).toBe(0);
    for (let x = -9.4; x < -7; x += 0.1) {
      const next = poolFloorAt(x, 1);
      expect(level - next).toBeLessThanOrEqual(0.3 + 1e-9);
      level = next;
    }
    expect(level).toBe(POOL_FLOOR);
  });

  it('leads through the middle arch into the back pool', () => {
    expect(inPool(0, -4)).toBe(true);
    expect(inPool(0, -7)).toBe(true);
    const solids = poolRoomSolids();
    expect(solids.some((s) => inside(s, 0, ARCADE.z))).toBe(false);
  });

  it('walls the pool in except at its steps', () => {
    const edges = poolEdges();
    expect(edges.filter((e) => e.open)).toHaveLength(1);
    const solids = poolRoomSolids();
    // Off the side of the main pool, not at its steps.
    expect(solids.some((s) => inside(s, 0, 4.5))).toBe(true);
    expect(solids.some((s) => inside(s, -9, 1))).toBe(false);
  });

  it('keeps the columns and arcade piers solid and the arches open', () => {
    const solids = poolRoomSolids();
    for (const [x, z] of COLUMNS)
      expect(solids.some((s) => inside(s, x, z))).toBe(true);
    for (const x of ARCADE.arches)
      expect(solids.some((s) => inside(s, x, ARCADE.z))).toBe(false);
    expect(solids.some((s) => inside(s, -7.5, ARCADE.z))).toBe(true);
  });
});

describe('a slab with openings', () => {
  it('covers the slab except its openings, without overlap', () => {
    const openings = [
      { x: -0.5, z: 0, w: 0.5, d: 0.5 },
      { x: 0.8, z: 0.2, w: 0.2, d: 0.2 },
    ];
    const pieces = slabPieces(2.8, 1.2, openings);
    const area = pieces.reduce((n, p) => n + p.w * p.d, 0);
    expect(area).toBeCloseTo(2.8 * 1.2 - 0.25 - 0.04);
    // Sample points: in an opening, in no piece; elsewhere, in one.
    for (let x = -1.35; x < 1.4; x += 0.1)
      for (let z = -0.55; z < 0.6; z += 0.1) {
        const inOpening = openings.some(
          (o) => Math.abs(x - o.x) < o.w / 2 && Math.abs(z - o.z) < o.d / 2,
        );
        const covering = pieces.filter(
          (p) => Math.abs(x - p.x) < p.w / 2 && Math.abs(z - p.z) < p.d / 2,
        ).length;
        expect(covering).toBe(inOpening ? 0 : 1);
      }
  });
});

describe('the pool fittings', () => {
  const near = (a: readonly [number, number], b: readonly [number, number]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1]);

  it('sets the drains and inlets in the pool floor, clear of the steps', () => {
    for (const [x, z] of [...MAIN_DRAINS, ...FLOOR_INLETS]) {
      expect(inPool(x, z)).toBe(true);
      // On a flat of the floor (shallow or deep), not a step or the slope.
      const floor = poolFloorAt(x, z);
      expect(
        [POOL_FLOOR, DEEP_END.floor].some((f) => Math.abs(floor - f) < 1e-9),
      ).toBe(true);
    }
  });

  it('pairs the main drains at least 2 m apart', () => {
    for (let i = 0; i < MAIN_DRAINS.length; i += 2)
      expect(near(MAIN_DRAINS[i], MAIN_DRAINS[i + 1])).toBeGreaterThanOrEqual(
        2,
      );
  });

  it('keeps inlets clear of the drains', () => {
    for (const inlet of FLOOR_INLETS)
      for (const drain of MAIN_DRAINS)
        expect(near(inlet, drain)).toBeGreaterThan(0.6);
  });

  it('puts the gullies on the deck, clear of the pool and its overflow', () => {
    const strips = overflowStrips();
    for (const [x, z] of DECK_GULLIES) {
      expect(inPool(x, z)).toBe(false);
      expect(
        strips.some(
          (s) =>
            Math.abs(x - s.x) < s.w / 2 + 0.1 &&
            Math.abs(z - s.z) < s.d / 2 + 0.1,
        ),
      ).toBe(false);
      expect(x).toBeGreaterThan(ROOM.minX);
      expect(x).toBeLessThan(ROOM.maxX);
    }
  });

  it('runs the overflow all round the pool, outside it, without gaps at corners', () => {
    const strips = overflowStrips();
    expect(strips).toHaveLength(POOL_OUTLINE.length);
    for (const s of strips) expect(inPool(s.x, s.z)).toBe(false);
    // Just outside every edge's middle and every outside corner: grating.
    const covered = (x: number, z: number) =>
      strips.some(
        (s) => Math.abs(x - s.x) <= s.w / 2 && Math.abs(z - s.z) <= s.d / 2,
      );
    expect(covered(-9.1, 4.6)).toBe(true);
    expect(covered(7.1, -1.6)).toBe(true);
    expect(covered(0, 4.6)).toBe(true);
    // No strip reaches into the water.
    for (let x = -8.9; x < 7; x += 0.5)
      for (let z = -1.4; z < 4.5; z += 0.5) expect(covered(x, z)).toBe(false);
  });

  it('sets wall fittings in the pool walls, facing the water, under it', () => {
    for (const f of WALL_FITTINGS) {
      expect(inPool(f.x + f.facing[0] * 0.2, f.z + f.facing[1] * 0.2)).toBe(
        true,
      );
      expect(inPool(f.x - f.facing[0] * 0.2, f.z - f.facing[1] * 0.2)).toBe(
        false,
      );
      expect(f.depth).toBeGreaterThan(0.2);
      expect(f.depth).toBeLessThan(-POOL_FLOOR - 0.15);
    }
  });
});

describe('the deck edge', () => {
  it('lies just outside the overflow all round', () => {
    const edge = offsetOutline(OVERFLOW_WIDTH);
    expect(edge).toHaveLength(POOL_OUTLINE.length);
    // Twice its area exceeds the pool's by about the grating's.
    const area = (points: readonly (readonly [number, number])[]) => {
      let twice = 0;
      points.forEach(([x0, z0], i) => {
        const [x1, z1] = points[(i + 1) % points.length];
        twice += x0 * z1 - x1 * z0;
      });
      return Math.abs(twice) / 2;
    };
    const strips = overflowStrips();
    // Strips overlap at the inside corners; the grating's area is at most their sum.
    const gratingArea = strips.reduce((n, s) => n + s.w * s.d, 0);
    const grown = area(edge) - area(POOL_OUTLINE);
    expect(grown).toBeGreaterThan(0);
    expect(grown).toBeLessThanOrEqual(gratingArea + 1e-9);
    expect(edge[0]).toEqual([-9 - OVERFLOW_WIDTH, 4.5 + OVERFLOW_WIDTH]);
  });

  it('slopes from its shallow end to a 2 m deep end, and keeps the walker out of the deep', () => {
    expect(poolFloorAt(-4, 1)).toBe(POOL_FLOOR);
    expect(poolFloorAt(6, 1)).toBeCloseTo(DEEP_END.floor, 9);
    const mid = poolFloorAt((DEEP_END.from + DEEP_END.to) / 2, 1);
    expect(mid).toBeLessThan(POOL_FLOOR);
    expect(mid).toBeGreaterThan(DEEP_END.floor);
    // The channel and back pool keep the shallow depth.
    expect(poolFloorAt(0, -3)).toBe(POOL_FLOOR);
    const solids = poolRoomSolids();
    const blocked = (x: number) =>
      solids.some((s) => x > s.minX && x < s.maxX && 1 > s.minZ && 1 < s.maxZ);
    expect(blocked(6)).toBe(true);
    expect(blocked(0)).toBe(false);
    expect(-poolFloorAt(2.5, 1)).toBeLessThan(WADE_DEPTH);
  });
});
