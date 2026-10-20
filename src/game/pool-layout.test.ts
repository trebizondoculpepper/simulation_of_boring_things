import { describe, expect, it } from 'vite-plus/test';
import { roomById } from './facility-plan';
import { BASINS, cutBasins } from './pool-layout';
import { slide } from '../toolkit/controls/logic/walk-collision';

const area = (r: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
  (r.maxX - r.minX) * (r.maxZ - r.minZ);

describe('empty pool basins', () => {
  it('fits three separated basins inside the hall', () => {
    const hall = roomById('hall');
    for (const basin of BASINS) {
      expect(basin.minX).toBeGreaterThan(hall.minX);
      expect(basin.maxX).toBeLessThan(hall.maxX);
      expect(basin.minZ).toBeGreaterThan(hall.minZ);
      expect(basin.maxZ).toBeLessThan(hall.maxZ);
      expect(basin.depth).toBeGreaterThan(0);
    }
    for (let i = 0; i < BASINS.length; i++)
      for (let j = i + 1; j < BASINS.length; j++) {
        const a = BASINS[i],
          b = BASINS[j];
        expect(
          a.maxX <= b.minX ||
            b.maxX <= a.minX ||
            a.maxZ <= b.minZ ||
            b.maxZ <= a.minZ,
        ).toBe(true);
      }
  });

  it('leaves a deck with the precise area of the hall minus the basins', () => {
    const hall = roomById('hall');
    const deck = cutBasins(hall);
    expect(deck.reduce((sum, piece) => sum + area(piece), 0)).toBe(
      area(hall) - BASINS.reduce((sum, basin) => sum + area(basin), 0),
    );
    for (const piece of deck)
      for (const basin of BASINS)
        expect(
          piece.maxX <= basin.minX ||
            basin.maxX <= piece.minX ||
            piece.maxZ <= basin.minZ ||
            basin.maxZ <= piece.minZ,
        ).toBe(true);
  });

  it('keeps a walker on the deck beside an empty basin', () => {
    const main = BASINS[0];
    const result = slide(BASINS, main.minX - 2, 20, 5, 0, 0.25);
    expect(result.x).toBeLessThanOrEqual(main.minX - 0.25);
  });
});
