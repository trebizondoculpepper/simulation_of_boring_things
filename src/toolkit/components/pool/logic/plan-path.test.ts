import { describe, expect, it } from 'vite-plus/test';
import { area, bandOutline, insetPolygon, mitres, trimPath } from './plan-path';

describe('a path in plan', () => {
  it('mitres a right-angled corner at √2 along the bisector', () => {
    const [, corner] = mitres([
      [0, 1],
      [0, 0],
      [1, 0],
    ]);
    expect(Math.hypot(...corner)).toBeCloseTo(Math.SQRT2, 9);
  });

  it('sweeps a band whose area is its width times its length', () => {
    // A straight run 2 m long, 0.5 m either side: 2 m².
    const straight = bandOutline(
      [
        [0, 1],
        [0, -1],
      ],
      -0.5,
      0.5,
    );
    expect(area(straight)).toBeCloseTo(2, 9);
    // Round a right angle, measured along its middle: 1 m wide, 3 m along.
    const turned = bandOutline(
      [
        [0, 1.5],
        [0, 0],
        [1.5, 0],
      ],
      -0.5,
      0.5,
    );
    expect(area(turned)).toBeCloseTo(3, 9);
  });
});

describe('insetting a polygon', () => {
  it('moves a square in by the same distance whichever way it is drawn', () => {
    const square: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    for (const s of [square, [...square].reverse()])
      expect(area(insetPolygon(s, 0.001))).toBeCloseTo(0.998 * 0.998, 9);
  });

  it('trims a path’s ends along it', () => {
    expect(
      trimPath(
        [
          [0, 1],
          [0, 0],
          [1, 0],
        ],
        0.001,
      ),
    ).toEqual([
      [0, 0.999],
      [0, 0],
      [0.999, 0],
    ]);
  });
});
