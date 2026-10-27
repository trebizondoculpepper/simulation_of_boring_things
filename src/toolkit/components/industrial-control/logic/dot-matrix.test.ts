import { describe, expect, it } from 'vite-plus/test';
import { box, dotFrame, fillBox, isLit, text, textWidth } from './dot-matrix';

describe('a dot-matrix LCD frame', () => {
  it('draws text in the 5 × 7 font at a whole-number scale', () => {
    const f = dotFrame(40, 20);
    text(f, 0, 0, 'I', 2);
    // The I's middle column lit down its height, two dots wide at scale 2.
    expect(isLit(f, 4, 6)).toBe(true);
    expect(isLit(f, 5, 6)).toBe(true);
    expect(isLit(f, 0, 6)).toBe(false);
    expect(textWidth('ABC')).toBe(17);
    expect(textWidth('ABC', 3)).toBe(51);
  });

  it('draws boxes and clears inside an inverted bar', () => {
    const f = dotFrame(20, 10);
    fillBox(f, 0, 0, 20, 9);
    text(f, 1, 1, '-', 1, false);
    expect(isLit(f, 2, 4)).toBe(false);
    expect(isLit(f, 2, 2)).toBe(true);
    expect(isLit(f, 0, 0)).toBe(true);
    const g = dotFrame(10, 10);
    box(g, 0, 0, 10, 10);
    expect(isLit(g, 0, 5)).toBe(true);
    expect(isLit(g, 5, 5)).toBe(false);
  });

  it('ignores dots off its edge', () => {
    const f = dotFrame(4, 4);
    fillBox(f, -2, -2, 10, 10);
    expect(f.dots.every((d) => d === 1)).toBe(true);
  });
});
