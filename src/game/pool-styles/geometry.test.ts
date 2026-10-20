import { describe, expect, it } from 'vite-plus/test';
import { distanceToLine, insidePolygon, insideRect, rect } from './geometry';

describe('the pool styles’ plan geometry', () => {
  it('knows inside from outside a polygon, a rectangle and a line', () => {
    const square = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ] as const;
    expect(insidePolygon(square, 2, 2)).toBe(true);
    expect(insidePolygon(square, 5, 2)).toBe(false);
    expect(insideRect(rect(0, 4, 0, 4), 4, 4)).toBe(true);
    expect(
      distanceToLine(
        [
          [0, 0],
          [10, 0],
        ],
        5,
        3,
      ),
    ).toBeCloseTo(3, 9);
  });
});
