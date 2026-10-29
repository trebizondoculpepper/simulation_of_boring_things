import { describe, expect, it } from 'vite-plus/test';
import {
  LOGO_ART,
  LOGO_REVEAL_AT_S,
  LOGO_REVEAL_S,
  RIPPLE_AMPLITUDE_PX,
  RIPPLE_HZ,
  SECTION_LIFT_PX,
  TITLE_AT_S,
  TITLE_FADE_S,
  TITLE_TEXT,
  rippleFrame,
  rippleShift,
  SIGHT_GLASS,
  sightGlassView,
  GAUGES,
  LOOP_S,
  NEEDLE_TREMBLE_DEG,
  NEEDLE_WANDER_DEG,
  gaugeNeedle,
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

describe('the title over the lifted dome', () => {
  it('moves with the section, its feet just in the water above the tiles', () => {
    expect(SECTION_LIFT_PX).toBe(8);
    expect(TITLE_TEXT.waterline).toBe(242);
    expect(TITLE_TEXT.baselineY).toBeGreaterThan(TITLE_TEXT.waterline);
    expect(TITLE_TEXT.baselineY - TITLE_TEXT.waterline).toBeLessThan(12);
    expect(TITLE_TEXT.baselineY).toBeLessThan(LOGO_ART.waterBottom);
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

describe('the gauges’ needles', () => {
  it('tremble about their readings, never sweeping', () => {
    GAUGES.forEach((g, k) => {
      for (let f = 0; f < 200; f++)
        expect(Math.abs(gaugeNeedle(k, f) - g.angle)).toBeLessThanOrEqual(
          NEEDLE_WANDER_DEG + NEEDLE_TREMBLE_DEG + 1e-9,
        );
      // Noticeably, within a second.
      const second = Array.from({ length: 11 }, (_, f) => gaugeNeedle(k, f));
      expect(Math.max(...second) - Math.min(...second)).toBeGreaterThan(2);
    });
  });
});

describe('the animated loop', () => {
  it('comes back exactly where it began, needles and sight glass', () => {
    const end = LOOP_S * RIPPLE_HZ;
    GAUGES.forEach((_, k) =>
      expect(gaugeNeedle(k, end)).toBeCloseTo(gaugeNeedle(k, 0), 9),
    );
    const [a, b] = [sightGlassView(0), sightGlassView(end)];
    expect(b.sandY).toBeCloseTo(a.sandY, 9);
    expect(b.sandTilt).toBeCloseTo(a.sandTilt, 9);
    b.grains.forEach((g, i) => {
      expect(g.dx).toBeCloseTo(a.grains[i]!.dx, 9);
      expect(g.dy).toBeCloseTo(a.grains[i]!.dy, 9);
    });
  });
});

describe('the gauges, together', () => {
  it('do not move in step', () => {
    const a = Array.from(
      { length: 40 },
      (_, f) => gaugeNeedle(1, f) - GAUGES[1].angle,
    );
    const b = Array.from(
      { length: 40 },
      (_, f) => gaugeNeedle(2, f) - GAUGES[2].angle,
    );
    expect(a.some((v, i) => Math.abs(v - b[i]!) > 2)).toBe(true);
  });
});
