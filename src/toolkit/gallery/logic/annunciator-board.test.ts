import { describe, expect, it } from 'vite-plus/test';
import { annunciatorBoardLayout } from './annunciator-board';

describe('a location annunciator’s board', () => {
  const bottom = annunciatorBoardLayout(16, 4);
  const left = annunciatorBoardLayout(16, 4, 'left');

  it('has its controls under its windows by default, as every board had', () => {
    expect(bottom.w).toBeCloseTo(0.86, 9);
    expect(bottom.h).toBeCloseTo(0.826, 9);
    expect(bottom.buttons.map((b) => b.legend)).toEqual([
      'ACCEPT',
      'RESET',
      'LAMP TEST',
      'MUTE',
    ]);
    expect(bottom.buttons.map((b) => b.x)).toEqual([-0.27, -0.09, 0.09, 0.27]);
    for (const b of bottom.buttons)
      expect(b.y).toBeLessThan(bottom.windows.y - bottom.windows.h / 2);
    expect(bottom.controls.x).toBeCloseTo(0, 9);
  });

  it('may have them down its left margin instead, its windows the same', () => {
    expect(left.windows.w).toBe(bottom.windows.w);
    expect(left.windows.h).toBe(bottom.windows.h);
    // The same distance under its top, under the title.
    expect(left.h / 2 - left.windows.y).toBeCloseTo(
      bottom.h / 2 - bottom.windows.y,
      9,
    );
    // One column, top to bottom in the same order, left of the windows,
    // beside them, inside the housing.
    expect(left.buttons.map((b) => b.legend)).toEqual(
      bottom.buttons.map((b) => b.legend),
    );
    const edge = left.windows.x - left.windows.w / 2;
    for (const b of left.buttons) {
      expect(b.x).toBe(left.buttons[0].x);
      expect(b.x).toBeLessThan(edge - 0.05);
      expect(b.x).toBeGreaterThan(-left.w / 2 + 0.05);
      expect(b.y).toBeLessThan(left.windows.y + left.windows.h / 2);
      expect(b.y).toBeGreaterThan(left.windows.y - left.windows.h / 2);
    }
    for (let i = 1; i < left.buttons.length; i++)
      expect(left.buttons[i].y).toBeLessThan(left.buttons[i - 1].y);
    // Its windows' right margin as before.
    expect(left.w / 2 - (left.windows.x + left.windows.w / 2)).toBeCloseTo(
      bottom.w / 2 - (bottom.windows.x + bottom.windows.w / 2),
      9,
    );
    expect(left.controls.x).toBeLessThan(-left.w / 3);
  });

  it('grows wider and shorter so, its title, horn and badges in their places', () => {
    expect(left.w).toBeGreaterThan(bottom.w);
    expect(left.w).toBeLessThan(1);
    expect(left.h).toBeLessThan(bottom.h);
    expect(left.title.y).toBeCloseTo(left.h / 2 - 0.05, 9);
    expect(left.horn.x).toBeCloseTo(left.w / 2 - 0.13, 9);
    expect(left.badge.y).toBeLessThan(
      Math.min(...left.buttons.map((b) => b.y)) - 0.1,
    );
  });
});
