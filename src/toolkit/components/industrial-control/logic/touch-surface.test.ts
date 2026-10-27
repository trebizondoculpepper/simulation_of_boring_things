import { describe, expect, it } from 'vite-plus/test';
import {
  bend,
  checkScreens,
  insideOutline,
  outlineAround,
  planeToPixel,
  polygonOutline,
  rectOutline,
  roundedOutline,
  screenAt,
  screenGrid,
  trapeziumOutline,
  uvToPixel,
} from './touch-surface';

describe('a touch surface’s frame and screens', () => {
  it('tells inside from outside, a concave notch included', () => {
    // An L: the top right quarter cut away.
    const l = [
      [-1, -1],
      [1, -1],
      [1, 0],
      [0, 0],
      [0, 1],
      [-1, 1],
    ] as const;
    expect(insideOutline(l, [-0.5, 0.5])).toBe(true);
    expect(insideOutline(l, [0.5, -0.5])).toBe(true);
    expect(insideOutline(l, [0.5, 0.5])).toBe(false);
    expect(insideOutline(rectOutline(2, 1), [0.9, 0.4])).toBe(true);
    expect(insideOutline(rectOutline(2, 1), [1.1, 0])).toBe(false);
  });

  it('accepts screens with their bezels inside the frame, and finds those that are not', () => {
    const frame = rectOutline(1, 0.6);
    const good = { x: 0, y: 0, w: 1 - 0.008, h: 0.6 - 0.008 };
    expect(checkScreens(frame, [good], 0.004)).toEqual([]);
    expect(checkScreens(frame, [good], 0.01)).toEqual([
      'screen 0 and its bezel run off the frame',
    ]);
    // A trapezium narrowing to 0.6 at its head: a full-width screen at the top runs off.
    const trap = trapeziumOutline(1, 0.6, 0.6);
    expect(
      checkScreens(trap, [{ x: 0, y: 0.2, w: 0.9, h: 0.1 }], 0.004),
    ).toHaveLength(1);
    expect(
      checkScreens(trap, [{ x: 0, y: -0.2, w: 0.8, h: 0.1 }], 0.004),
    ).toEqual([]);
    // Two screens overlapping.
    expect(
      checkScreens(
        rectOutline(2, 1),
        [
          { x: -0.2, y: 0, w: 0.6, h: 0.4 },
          { x: 0.2, y: 0, w: 0.6, h: 0.4 },
        ],
        0.004,
      ),
    ).toEqual(['screens 0 and 1 overlap']);
  });

  it('lays a grid of screens in a box, a bezel round and between them, each inside', () => {
    const screens = screenGrid(1.2, 0.8, 0.004, [[1], [2, 1]], [1, 3]);
    expect(screens).toHaveLength(3);
    expect(checkScreens(rectOutline(1.2, 0.8), screens, 0.004)).toEqual([]);
    expect(screens[0].w).toBeCloseTo(1.2 - 0.008);
    expect(screens[1].w / screens[2].w).toBeCloseTo(2);
    expect(screens[1].h / screens[0].h).toBeCloseTo(3);
  });

  it('draws a frame round screens with the bezel all round, bezel-less too', () => {
    const s = [{ x: 0.1, y: 0, w: 0.4, h: 0.2 }];
    const f = outlineAround(s, 0.004);
    expect(f.w).toBeCloseTo(0.408);
    expect(f.centre[0]).toBeCloseTo(0.1);
    expect(checkScreens(f.outline, s, 0.004)).toEqual([]);
    expect(checkScreens(outlineAround(s, 0).outline, s, 0)).toEqual([]);
    expect(roundedOutline(1, 1, 0.1).length).toBe(28);
    expect(polygonOutline(6, 1)).toHaveLength(6);
  });

  it('maps a touch to the screen’s pixel, by texture coordinates or by the frame’s plane', () => {
    expect(uvToPixel(0.25, 0.75, 800, 400)).toEqual({ x: 200, y: 100 });
    const screens = [
      { x: -0.3, y: 0, w: 0.4, h: 0.2 },
      { x: 0.3, y: 0, w: 0.4, h: 0.2 },
    ];
    expect(screenAt(screens, 0.35, 0.05)).toBe(1);
    expect(screenAt(screens, 0, 0)).toBeNull();
    // The right screen's top-left corner, and its middle.
    const corner = planeToPixel(screens[1], 0.1, 0.1, 800, 400);
    expect(corner.x).toBeCloseTo(0);
    expect(corner.y).toBeCloseTo(0);
    const mid = planeToPixel(screens[1], 0.3, 0, 800, 400);
    expect(mid.x).toBeCloseTo(400);
    expect(mid.y).toBeCloseTo(200);
  });

  it('bends a strip round the viewer, keeping its length along the curve', () => {
    expect(bend(0.5, Infinity)).toEqual({ x: 0.5, z: 0 });
    const r = 2;
    const p = bend(Math.PI / 2, r);
    expect(p.x).toBeCloseTo(r * Math.sin(Math.PI / 4));
    expect(p.z).toBeGreaterThan(0);
    expect(bend(-1, r).z).toBeCloseTo(bend(1, r).z);
  });
});
