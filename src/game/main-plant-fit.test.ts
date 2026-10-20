import { describe, expect, it } from 'vite-plus/test';
import {
  AISLE,
  BETWEEN,
  GANTRY,
  STAIR,
  fitFloor,
  fitPlant,
  fitSolids,
  stairLines,
  smallestSide,
  stairZones,
} from './main-plant-fit';
import type { Rect } from './main-plant-fit';
import { slide } from '../toolkit/controls/logic/walk-collision';

const overlaps = (a: Rect, b: Rect) =>
  a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;

const boxes = (n: number, w = 2, d = 1.5) =>
  Array.from({ length: n }, (_, i) => ({ name: `box ${i}`, w, d }));

describe('the main plant room fit study', () => {
  it('keeps machines apart, off the stairs and on the lower floor', () => {
    const fit = fitPlant(40, boxes(30));
    const h = 20 - GANTRY;
    for (const p of fit.placed) {
      expect(p.rect.minX).toBeGreaterThanOrEqual(-h);
      expect(p.rect.maxX).toBeLessThanOrEqual(h);
      expect(p.rect.minZ).toBeGreaterThanOrEqual(-h);
      expect(p.rect.maxZ).toBeLessThanOrEqual(h);
      for (const s of fit.stairs) expect(overlaps(p.rect, s)).toBe(false);
      for (const q of fit.placed)
        if (q !== p)
          expect(
            overlaps(
              {
                ...p.rect,
                minX: p.rect.minX - BETWEEN + 1e-6,
                maxX: p.rect.maxX + BETWEEN - 1e-6,
              },
              q.rect,
            ),
          ).toBe(false);
    }
  });

  it('leaves an aisle in front of every row', () => {
    const fit = fitPlant(40, boxes(60));
    // Rows 0 and 1 face each other across an aisle; 1 and 2 are back to back.
    expect(fit.rows[1].minZ - fit.rows[0].maxZ).toBeCloseTo(AISLE);
    expect(fit.rows[2].minZ).toBeCloseTo(fit.rows[1].maxZ);
    expect(fit.rows[3].minZ - fit.rows[2].maxZ).toBeCloseTo(AISLE);
  });

  it('stands every machine at its row’s aisle edge, one deep', () => {
    const fit = fitPlant(40, [...boxes(40), ...boxes(40, 1, 0.5)]);
    for (const p of fit.placed) {
      const i = fit.rows.findIndex(
        (r) => p.rect.minZ >= r.minZ - 1e-6 && p.rect.maxZ <= r.maxZ + 1e-6,
      );
      expect(i).toBeGreaterThanOrEqual(0);
      const row = fit.rows[i];
      // Even rows face south onto their aisle, odd rows north.
      if (i % 2 === 0) expect(p.rect.maxZ).toBeCloseTo(row.maxZ);
      else expect(p.rect.minZ).toBeCloseTo(row.minZ);
      for (const q of fit.placed)
        if (
          q !== p &&
          q.rect.minZ >= row.minZ - 1e-6 &&
          q.rect.maxZ <= row.maxZ + 1e-6
        )
          expect(
            q.rect.minX >= p.rect.maxX + BETWEEN - 1e-6 ||
              p.rect.minX >= q.rect.maxX + BETWEEN - 1e-6,
          ).toBe(true);
    }
  });

  it('turns a long machine along its row', () => {
    const [p] = fitPlant(40, [{ name: 'tank', w: 1, d: 5 }]).placed;
    expect(p.rect.maxX - p.rect.minX).toBeCloseTo(5);
  });

  it('says what does not fit, and the smallest room that takes it all', () => {
    const many = boxes(80, 3, 2);
    expect(fitPlant(30, many).unplaced.length).toBeGreaterThan(0);
    const side = smallestSide(many)!;
    expect(fitPlant(side, many).unplaced).toHaveLength(0);
    expect(fitPlant(side - 0.5, many).unplaced.length).toBeGreaterThan(0);
  });

  it('puts the stairs at the north-east and south-west corners', () => {
    const [ne, sw] = stairZones(47);
    expect(ne.minX).toBeGreaterThan(0);
    expect(ne.minZ).toBeLessThan(0);
    expect(sw.maxX).toBeLessThan(0);
    expect(sw.maxZ).toBeGreaterThan(0);
  });

  it('walks from the gantry down either stair to the lower floor', () => {
    const h = 42 / 2 - GANTRY;
    expect(fitFloor(42, 0, h + 1)).toBe(0);
    expect(fitFloor(42, 0, 0)).toBe(-3);
    const x = h - 1.4;
    expect(fitFloor(42, x, -h)).toBeCloseTo(0);
    expect(fitFloor(42, x, -h + 3)).toBeCloseTo(-1.5);
    expect(fitFloor(42, x, -h + 6)).toBeCloseTo(-3);
    expect(fitFloor(42, -x, h - 6)).toBeCloseTo(-3);
  });

  it('lets a walker down either stair from the gantry to the lower floor', () => {
    for (const side of [47, 42, 37]) {
      const fit = fitPlant(side, boxes(35));
      const solids = fitSolids(
        side,
        fit.placed.map((p) => p.rect),
      );
      for (const s of stairLines(side)) {
        // From a metre back on the gantry, straight down the stair and on.
        let x = s.x,
          z = s.startZ - s.direction * 1.2;
        for (let i = 0; i < 400; i++)
          ({ x, z } = slide(solids, x, z, 0, s.direction * 0.025, 0.25));
        const along = (z - s.startZ) * s.direction;
        expect(along, `${side} m, stair at x ${s.x}`).toBeGreaterThan(
          STAIR.run,
        );
      }
    }
  });
});
