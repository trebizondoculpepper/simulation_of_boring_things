import { describe, expect, it } from 'vite-plus/test';
import {
  RedrawGate,
  columns,
  hitRegion,
  keepInView,
  listWindow,
  rows,
  wrapLines,
} from './aero-layout';

const R = { x: 10, y: 20, w: 100, h: 50 };
const mono = (s: string) => s.length * 10;

describe('the Aero kit’s layout', () => {
  it('tiles a rectangle into rows and columns', () => {
    const r = rows(R, 2, 10);
    expect(r[0]).toEqual({ x: 10, y: 20, w: 100, h: 20 });
    expect(r[1].y + r[1].h).toBe(70);
    const c = columns(R, 5, 0);
    expect(c[4].x + c[4].w).toBe(110);
  });

  it('windows a list, its arrows disabled at the ends', () => {
    expect(listWindow(10, 5, 0)).toMatchObject({
      shown: [0, 1, 2, 3, 4],
      canUp: false,
      canDown: true,
    });
    expect(listWindow(10, 5, 99)).toMatchObject({ top: 5, canDown: false });
    expect(listWindow(3, 5, 2)).toMatchObject({ top: 0, shown: [0, 1, 2] });
    expect(listWindow(10, 5, 5).thumb).toEqual({ at: 0.5, size: 0.5 });
  });

  it('keeps the selection in view, moving as little as it can', () => {
    expect(keepInView(0, 7, 5, 10)).toBe(3);
    expect(keepInView(5, 2, 5, 10)).toBe(2);
    expect(keepInView(2, 4, 5, 10)).toBe(2);
  });

  it('finds the topmost enabled region under a point, and nothing outside', () => {
    const regions = [
      { id: 'back', rect: R },
      { id: 'front', rect: { x: 50, y: 30, w: 10, h: 10 } },
      { id: 'off', rect: { x: 10, y: 20, w: 5, h: 5 }, enabled: false },
    ];
    expect(hitRegion(regions, 55, 35)).toBe('front');
    expect(hitRegion(regions, 20, 60)).toBe('back');
    expect(hitRegion(regions, 11, 21)).toBe('back');
    expect(hitRegion(regions, 5, 5)).toBeNull();
  });

  it('wraps words to the width, breaks a long word and ellipsises', () => {
    expect(wrapLines('one two three four', 90, mono)).toEqual([
      'one two',
      'three',
      'four',
    ]);
    expect(wrapLines('abcdefghijkl', 50, mono)).toEqual([
      'abcde',
      'fghij',
      'kl',
    ]);
    const cut = wrapLines('one two three four', 90, mono, 2);
    expect(cut).toEqual(['one two', 'three…']);
  });

  it('asks for a redraw only when the key changes', () => {
    const gate = new RedrawGate();
    expect(gate.needs('a')).toBe(true);
    expect(gate.needs('a')).toBe(false);
    expect(gate.needs('b')).toBe(true);
    gate.invalidate();
    expect(gate.needs('b')).toBe(true);
  });
});
