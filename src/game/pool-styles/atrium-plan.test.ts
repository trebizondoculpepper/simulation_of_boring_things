import { describe, expect, it } from 'vite-plus/test';
import {
  BOUNDS,
  HEIGHT,
  POOLS,
  SLIDES,
  STAIRS,
  TIERS,
  floorAt,
  frontRuns,
  poolAt,
  stairFloor,
} from './atrium-plan';
import { distanceToLine, insidePolygon } from './geometry';

describe('the Slide Atrium, laid out', () => {
  it('stands its doors on the ground floor, clear of the pools', () => {
    for (const x of [BOUNDS.minX + 0.6, BOUNDS.maxX - 0.6]) {
      const z = BOUNDS.maxZ - 1.1;
      expect(floorAt(x, z, 0)).toBe(0);
      expect(poolAt(x, z)).toBeNull();
    }
  });

  it('raises three galleries, each above and behind the last, under its ceiling', () => {
    expect(TIERS.map((t) => t.y)).toEqual([4, 8, 12]);
    for (let i = 1; i < TIERS.length; i++)
      expect(TIERS[i].inset).toBeLessThan(TIERS[i - 1].inset);
    for (const t of TIERS) {
      expect(t.y).toBeLessThan(HEIGHT - 1.9);
      // On its north arm, and not out over the void.
      expect(insidePolygon(t.outline, 0, BOUNDS.minZ + t.inset / 2)).toBe(true);
      expect(insidePolygon(t.outline, 0, 0)).toBe(false);
      // And on its west and east arms.
      expect(insidePolygon(t.outline, BOUNDS.minX + t.inset / 2, 0)).toBe(true);
      expect(insidePolygon(t.outline, BOUNDS.maxX - t.inset / 2, 0)).toBe(true);
    }
  });

  it('climbs from the ground to each gallery in turn by stairs that meet floor to floor', () => {
    for (const [i, s] of STAIRS.entries()) {
      const x = (s.rect.minX + s.rect.maxX) / 2;
      // Its foot on the floor below, its head at the gallery above.
      expect(floorAt(x, s.rect.maxZ + 0.3, s.y0)).toBeCloseTo(s.y0, 6);
      expect(floorAt(x, s.rect.minZ - 0.3, s.y1)).toBeCloseTo(TIERS[i].y, 6);
      // Walking up it, the floor rises smoothly.
      let y = s.y0;
      for (let z = s.rect.maxZ; z >= s.rect.minZ; z -= 0.25) {
        const next = floorAt(x, z, y);
        expect(next - y).toBeLessThan(0.2);
        expect(next).toBeCloseTo(stairFloor(s, z), 6);
        y = next;
      }
      // Gentle enough to walk.
      expect((s.y1 - s.y0) / (s.rect.maxZ - s.rect.minZ)).toBeLessThan(0.7);
    }
  });

  it('opens each gallery’s railing where its stair comes up, and nowhere else', () => {
    for (const [i, s] of STAIRS.entries()) {
      const runs = frontRuns(i);
      expect(runs.length).toBe(2);
      const x = (s.rect.minX + s.rect.maxX) / 2;
      const nearest = Math.min(
        ...runs.map((r) => distanceToLine(r, x, s.rect.minZ)),
      );
      expect(nearest).toBeGreaterThan((s.rect.maxX - s.rect.minX) / 2 - 0.3);
    }
  });

  it('keeps a walker on a gallery up there, and one below on the ground', () => {
    expect(floorAt(0, BOUNDS.minZ + 0.7, 12)).toBe(12);
    expect(floorAt(0, BOUNDS.minZ + 0.7, 0)).toBe(0);
  });

  it('runs its slides down from the galleries: two to ride into a splash pool, one looping shut, one ending in mid-air', () => {
    const rideable = SLIDES.filter((s) => s.rideable);
    expect(rideable.length).toBeGreaterThanOrEqual(2);
    for (const slide of SLIDES) {
      const [mx, my, mz] = slide.path[0];
      // Its mouth on a gallery.
      const tier = TIERS.find((t) => Math.abs(t.y + 0.6 - my) < 0.2);
      expect(tier, slide.id).toBeDefined();
      expect(insidePolygon(tier!.outline, mx, mz)).toBe(true);
      for (const [, y] of slide.path) expect(y).toBeLessThan(HEIGHT);
    }
    for (const slide of rideable) {
      const [x, y, z] = slide.path.at(-1)!;
      const pool = poolAt(x, z);
      expect(pool, slide.id).not.toBeNull();
      expect(y).toBeLessThan(0.5);
      expect(floorAt(x, z, 15)).toBeCloseTo(-pool!.depth, 6);
    }
    const loop = SLIDES.find((s) => s.closed)!;
    expect(
      Math.hypot(
        loop.path[0][0] - loop.path.at(-1)![0],
        loop.path[0][2] - loop.path.at(-1)![2],
      ),
    ).toBeLessThan(2);
    const short = SLIDES.find((s) => !s.rideable && !s.closed)!;
    const [ex, ey, ez] = short.path.at(-1)!;
    expect(ey).toBeGreaterThan(5);
    expect(poolAt(ex, ez)).toBeNull();
    // Ending over the void, not over a gallery.
    for (const t of TIERS) expect(insidePolygon(t.outline, ex, ez)).toBe(false);
  });

  it('sets its splash pools on the ground floor, in the atrium’s south', () => {
    for (const p of POOLS)
      for (const [x, z] of p.outline) {
        expect(z).toBeGreaterThan(TIERS[0].front[1][1] - 1);
        expect(x).toBeGreaterThan(BOUNDS.minX + 1);
        expect(x).toBeLessThan(BOUNDS.maxX - 1);
      }
  });
  it('is small enough for its plant: 24 m square and 14 m high', () => {
    expect(BOUNDS.maxX - BOUNDS.minX).toBe(24);
    expect(BOUNDS.maxZ - BOUNDS.minZ).toBe(24);
    expect(HEIGHT).toBe(14);
  });

  it('leaves a way at least a metre wide to the foot of every stair, on the floor it starts from', () => {
    for (const s of STAIRS)
      for (const a of s.approach) {
        expect(
          Math.min(a.maxX - a.minX, a.maxZ - a.minZ),
        ).toBeGreaterThanOrEqual(1);
        // Clear of every flight, and on the right floor, all over.
        for (const o of STAIRS)
          expect(
            a.minX < o.rect.maxX - 1e-9 &&
              o.rect.minX < a.maxX - 1e-9 &&
              a.minZ < o.rect.maxZ - 1e-9 &&
              o.rect.minZ < a.maxZ - 1e-9,
          ).toBe(false);
        for (let x = a.minX + 0.1; x < a.maxX; x += 0.3)
          for (let z = a.minZ + 0.1; z < a.maxZ; z += 0.3)
            expect(floorAt(x, z, s.y0)).toBe(s.y0);
      }
  });
});
