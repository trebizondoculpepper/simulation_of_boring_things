import { describe, expect, it } from 'vite-plus/test';
import {
  DISPLAY_55,
  cropToFill,
  displaySize,
  pictureSize,
  slideAt,
} from './display-screen';

describe('a 55-inch display', () => {
  it('stands portrait or landscape, its picture inside its bezel', () => {
    expect(displaySize('portrait')).toEqual({ w: 0.73, h: 1.26 });
    expect(displaySize('landscape')).toEqual({ w: 1.26, h: 0.73 });
    const p = pictureSize('portrait');
    expect(p.w).toBeCloseTo(0.73 - 2 * DISPLAY_55.bezel, 9);
    expect(p.h).toBeCloseTo(1.26 - 2 * DISPLAY_55.bezel, 9);
  });

  it('shows each picture for its period, round and round', () => {
    expect(slideAt(0, 30, 5)).toBe(0);
    expect(slideAt(4.99, 30, 5)).toBe(0);
    expect(slideAt(5, 30, 5)).toBe(1);
    expect(slideAt(150, 30, 5)).toBe(0);
    expect(slideAt(10, 0, 5)).toBe(0);
  });

  it('crops a picture to fill the screen, keeping its middle', () => {
    // A 2:3 photograph on a narrower portrait screen: its sides trimmed.
    const narrow = cropToFill(2 / 3, 0.56);
    expect(narrow.repeat[0]).toBeCloseTo(0.84, 2);
    expect(narrow.repeat[1]).toBe(1);
    expect(narrow.offset[0]).toBeCloseTo(0.08, 2);
    // A wide photograph on a portrait screen: also its sides; a tall one
    // on a landscape screen: its top and bottom.
    expect(cropToFill(16 / 9, 9 / 16).repeat[1]).toBe(1);
    const tall = cropToFill(9 / 16, 16 / 9);
    expect(tall.repeat[0]).toBe(1);
    expect(tall.repeat[1]).toBeCloseTo(0.316, 3);
  });
});
