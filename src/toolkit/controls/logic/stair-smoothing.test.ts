import { describe, expect, it } from 'vite-plus/test';
import { smoothStairFloor } from './stair-smoothing';

describe('stair camera floor', () => {
  it('catches a riser in either direction without overshooting', () => {
    let up = 0;
    let down = 0.17;
    for (let i = 0; i < 3; i++) {
      up = smoothStairFloor(up, 0.17, 1 / 60, 1);
      down = smoothStairFloor(down, 0, 1 / 60, 1);
    }
    expect(up).toBeCloseTo(0.17);
    expect(down).toBeCloseTo(0);
  });

  it('caps lag, resets on placement and ignores invalid frame time', () => {
    expect(smoothStairFloor(0, 1, 1 / 60, 1)).toBeCloseTo(0.6035);
    expect(smoothStairFloor(0, 1, 1 / 60, 1, true)).toBe(1);
    expect(smoothStairFloor(0, 1, 0, 1)).toBe(0);
    expect(smoothStairFloor(0, 1, -1, 1)).toBe(0);
  });

  it('tracks a walking ramp within one frame', () => {
    let eye = 0;
    for (let i = 1; i <= 60; i++) {
      const floor = i * 0.02;
      eye = smoothStairFloor(eye, floor, 1 / 60, 1);
      expect(Math.abs(eye - floor)).toBeLessThanOrEqual(0.02);
    }
  });
});
