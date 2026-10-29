import { describe, expect, it } from 'vite-plus/test';
import { coverCrop, showsFull } from './photo-detail';

const square = { facing: 1, aim: 1 };

describe('museum photographs in full or low resolution', () => {
  it('shows in full only close to and looked at square on', () => {
    expect(showsFull(false, { distance: 2, ...square })).toBe(true);
    expect(showsFull(false, { distance: 5, ...square })).toBe(false);
    // Seen from the side, or out of the corner of the eye.
    expect(showsFull(false, { distance: 2, facing: 0.5, aim: 1 })).toBe(false);
    expect(showsFull(false, { distance: 2, facing: 1, aim: 0.8 })).toBe(false);
  });

  it('holds a little further once in full, so it does not flicker', () => {
    expect(showsFull(false, { distance: 3.3, ...square })).toBe(false);
    expect(showsFull(true, { distance: 3.3, ...square })).toBe(true);
    expect(showsFull(true, { distance: 3.6, ...square })).toBe(false);
  });

  it('crops an image about its middle to fill its print', () => {
    const wide = coverCrop(
      { width: 900, height: 600 },
      { width: 1, height: 1 },
    );
    expect(wide.repeat.x).toBeCloseTo(2 / 3);
    expect(wide.repeat.y).toBe(1);
    expect(wide.offset.x).toBeCloseTo(1 / 6);
    const tall = coverCrop(
      { width: 900, height: 600 },
      { width: 3, height: 1 },
    );
    expect(tall.repeat).toEqual({ x: 1, y: 0.5 });
    expect(tall.offset.y).toBeCloseTo(0.25);
  });
});
