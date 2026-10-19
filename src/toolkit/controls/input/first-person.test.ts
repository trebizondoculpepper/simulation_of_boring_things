import { describe, expect, it } from 'vite-plus/test';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  pinchZoom,
  wheelZoom,
  changeStance,
} from './first-person';

describe('wheel zoom', () => {
  it('zooms in when scrolling up and out when scrolling down', () => {
    expect(wheelZoom(1, -100, 0)).toBeGreaterThan(1);
    expect(wheelZoom(1, 100, 0)).toBeLessThan(1);
  });

  it('treats a line-mode notch like its pixel equivalent', () => {
    expect(wheelZoom(1, -3, 1)).toBeCloseTo(wheelZoom(1, -48, 0));
  });

  it('caps a hard flick instead of jumping to a limit', () => {
    expect(wheelZoom(1, -100000, 0)).toBeCloseTo(wheelZoom(1, -200, 0));
    expect(wheelZoom(1, -100000, 0)).toBeLessThan(MAX_ZOOM);
  });

  it('feels the same at every magnification', () => {
    expect(wheelZoom(2, -50, 0) / 2).toBeCloseTo(wheelZoom(1, -50, 0));
  });

  it('stays within its limits under a long smooth swipe', () => {
    let zoom = 1;
    for (let i = 0; i < 500; i++) zoom = wheelZoom(zoom, -4, 0);
    expect(zoom).toBe(MAX_ZOOM);
    for (let i = 0; i < 2000; i++) zoom = wheelZoom(zoom, 4, 0);
    expect(zoom).toBe(MIN_ZOOM);
  });
});

describe('pinch zoom', () => {
  it('zooms in as the fingers spread and out as they close', () => {
    expect(pinchZoom(1, 100, 200)).toBeCloseTo(2);
    expect(pinchZoom(2, 200, 100)).toBeCloseTo(1);
  });

  it('stays within its limits', () => {
    expect(pinchZoom(1, 10, 1000)).toBe(MAX_ZOOM);
    expect(pinchZoom(1, 1000, 10)).toBe(MIN_ZOOM);
  });

  it('ignores fingers on top of one another', () => {
    expect(pinchZoom(1.5, 0, 100)).toBe(1.5);
    expect(pinchZoom(1.5, 100, 0)).toBe(1.5);
  });
});

for (const low of [false, true]) {
  it(`restores standing from a chair or raised eye before ${low ? 'V' : 'C'} crouching`, () => {
    for (const eyeOffset of [-0.6234, 0.6]) {
      const state = {
        eyeOffset,
        crouched: false,
        lowCrouched: false,
        crouch: 0,
      };
      changeStance(state, low);
      expect(state).toEqual({
        eyeOffset: 0,
        crouched: false,
        lowCrouched: false,
        crouch: 0,
      });
      changeStance(state, low);
      expect(state.lowCrouched).toBe(low);
      expect(state.crouched).toBe(true);
      changeStance(state, low);
      expect(state.crouched).toBe(false);
    }
  });
}
