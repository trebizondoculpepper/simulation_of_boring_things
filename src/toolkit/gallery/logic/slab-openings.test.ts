import { describe, expect, it } from 'vite-plus/test';
import { slabAround } from './slab-openings';

const area = (
  rs: { minX: number; maxX: number; minZ: number; maxZ: number }[],
) => rs.reduce((a, r) => a + (r.maxX - r.minX) * (r.maxZ - r.minZ), 0);

describe('a floor slab with openings', () => {
  it('is one piece with none', () => {
    expect(slabAround(10, 8, [])).toEqual([
      { minX: -5, maxX: 5, minZ: -4, maxZ: 4 },
    ]);
  });

  it('leaves out each opening, and covers the rest exactly once', () => {
    const hole = { minX: -1, maxX: 2, minZ: 1, maxZ: 3 };
    const pieces = slabAround(10, 8, [hole]);
    expect(area(pieces)).toBeCloseTo(80 - 6, 9);
    for (const p of pieces)
      expect(
        p.minX < hole.maxX &&
          p.maxX > hole.minX &&
          p.minZ < hole.maxZ &&
          p.maxZ > hole.minZ,
      ).toBe(false);
  });

  it('clips an opening to the slab', () => {
    const pieces = slabAround(4, 4, [{ minX: 1, maxX: 9, minZ: -9, maxZ: 9 }]);
    expect(area(pieces)).toBeCloseTo(12, 9);
  });
});
