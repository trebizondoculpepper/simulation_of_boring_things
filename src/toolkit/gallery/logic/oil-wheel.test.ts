import { describe, expect, it } from 'vite-plus/test';
import { OIL_WHEEL, oilBlobs, wheelAngle } from './oil-wheel';

describe('the oil wheel', () => {
  it('turns once a revolution at its rate, and round again', () => {
    const minute = 60 / OIL_WHEEL.rpm;
    expect(wheelAngle(0)).toBe(0);
    expect(wheelAngle(minute / 4)).toBeCloseTo(Math.PI / 2, 9);
    expect(wheelAngle(minute * 3 + minute / 2)).toBeCloseTo(Math.PI, 6);
  });

  it('holds its oils the same on every visit, all inside the glass', () => {
    expect(oilBlobs()).toEqual(oilBlobs());
    expect(oilBlobs(1971)).not.toEqual(oilBlobs());
    for (const b of oilBlobs()) {
      expect(b.r + b.size).toBeLessThanOrEqual(1);
      expect(b.size).toBeGreaterThan(0);
    }
  });
});
