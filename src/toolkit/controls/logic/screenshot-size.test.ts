import { describe, expect, it } from 'vite-plus/test';
import {
  screenshotFileName,
  screenshotPixelRatio,
  screenshotSize,
} from './screenshot-size';

const size = (w: number, h: number, dpr: number, max = 16384) =>
  screenshotSize(w, h, screenshotPixelRatio(w, h, dpr, max)!);

describe('screenshot size', () => {
  it('draws at twice the device pixel ratio, up to 3840 px wide', () => {
    expect(size(1920, 1080, 1)).toEqual({ width: 3840, height: 2160 });
    expect(size(1920, 1080, 2)).toEqual({ width: 3840, height: 2160 });
    expect(size(1280, 720, 1)).toEqual({ width: 2560, height: 1440 });
    expect(size(800, 600, 1)).toEqual({ width: 1600, height: 1200 });
  });

  it('caps a display already larger, keeping its aspect', () => {
    expect(size(3840, 2160, 2)).toEqual({ width: 3840, height: 2160 });
    expect(size(5120, 2880, 2)).toEqual({ width: 3840, height: 2160 });
  });

  it('keeps portrait and ultrawide views within every cap', () => {
    for (const [w, h, dpr] of [
      [1080, 1920, 2],
      [390, 844, 3],
      [3440, 1440, 1],
      [5120, 1440, 1],
    ]) {
      const r = screenshotPixelRatio(w, h, dpr, 8192)!;
      const s = screenshotSize(w, h, r);
      expect(s.width).toBeLessThanOrEqual(3840);
      expect(s.height).toBeLessThanOrEqual(8192);
      expect(s.width * s.height).toBeLessThanOrEqual(16_000_000);
      expect(r).toBeLessThanOrEqual(2 * dpr);
      expect(Math.abs(s.width / s.height - w / h)).toBeLessThan(0.01);
    }
    // A tall view meets the pixel budget before its width.
    expect(size(1080, 1920, 2).width).toBeLessThan(3840);
  });

  it('holds to the GPU limit on both axes', () => {
    expect(size(1920, 1080, 1, 2048)).toEqual({ width: 2048, height: 1152 });
    expect(size(1080, 1920, 1, 2048)).toEqual({ width: 1152, height: 2048 });
  });

  it('gives no ratio for a view with no size', () => {
    expect(screenshotPixelRatio(0, 1080, 1, 4096)).toBeNull();
    expect(screenshotPixelRatio(1920, -1, 1, 4096)).toBeNull();
    expect(screenshotPixelRatio(NaN, 1080, 1, 4096)).toBeNull();
    expect(screenshotPixelRatio(Infinity, 1080, 1, 4096)).toBeNull();
    expect(screenshotPixelRatio(1920, 1080, 1, 0)).toBeNull();
    // An unknown device ratio counts as 1.
    expect(screenshotPixelRatio(1280, 720, NaN, 4096)).toBe(2);
  });
});

describe('screenshot file name', () => {
  it('names the room and the local time', () => {
    const at = new Date(2026, 9, 26, 9, 5, 7);
    expect(screenshotFileName('plant_pool_02', at)).toBe(
      'pool-plant-plant-pool-02-2026-10-26-090507.png',
    );
    expect(screenshotFileName('', at)).toBe(
      'pool-plant-view-2026-10-26-090507.png',
    );
  });
});
