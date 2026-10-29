import { describe, expect, it } from 'vite-plus/test';
import {
  LOGO_ART,
  LOGO_REVEAL_AT_S,
  LOGO_REVEAL_S,
  RIPPLE_AMPLITUDE_PX,
  RIPPLE_HZ,
  TITLE_AT_S,
  TITLE_FADE_S,
  rippleFrame,
  rippleShift,
  SIGHT_GLASS,
  sightGlassView,
} from './title-logo';

describe('the title logo', () => {
  it('draws in 4 s into the sequence, and the title 2 s after it', () => {
    expect(LOGO_REVEAL_AT_S).toBe(4);
    expect(TITLE_AT_S).toBe(6);
    expect(LOGO_REVEAL_S).toBe(2);
    expect(TITLE_FADE_S).toBe(2);
  });

  it('moves its ripple on no more than 10 times a second', () => {
    expect(RIPPLE_HZ).toBeLessThanOrEqual(10);
    const frames = new Set(
      Array.from({ length: 600 }, (_, i) => rippleFrame(i / 600)),
    );
    expect(frames.size).toBe(RIPPLE_HZ);
    expect(rippleFrame(-1)).toBe(0);
  });

  it('ripples only the water, gently, still at its edges', () => {
    const { waterTop, waterBottom } = LOGO_ART;
    for (let f = 0; f < 50; f++) {
      expect(rippleShift(waterTop, f)).toBe(0);
      expect(rippleShift(waterBottom, f)).toBe(0);
      expect(rippleShift(waterBottom + 40, f)).toBe(0);
      for (let y = waterTop; y < waterBottom; y += 7)
        expect(Math.abs(rippleShift(y, f))).toBeLessThanOrEqual(
          RIPPLE_AMPLITUDE_PX,
        );
    }
    expect(rippleShift(160, 0)).not.toBe(rippleShift(160, 3));
  });
});

describe('the filter’s sight glass', () => {
  it('keeps its sand and grains inside the glass, the grains above the sand', () => {
    const g = SIGHT_GLASS;
    for (let f = 0; f < 120; f++) {
      const v = sightGlassView(f);
      expect(v.sandY).toBeGreaterThan(0);
      expect(v.sandY).toBeLessThan(g.radius);
      for (const { dx, dy } of v.grains) {
        expect(Math.hypot(dx, dy)).toBeLessThan(g.radius);
        expect(dy).toBeLessThan(v.sandY);
      }
    }
  });

  it('moves from frame to frame', () => {
    expect(sightGlassView(0).grains[0]).not.toEqual(
      sightGlassView(5).grains[0],
    );
  });
});
