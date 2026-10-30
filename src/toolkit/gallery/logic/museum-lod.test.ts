import { describe, expect, it } from 'vite-plus/test';
import {
  hallTier,
  lodExempt,
  neighbourScale,
  quantisedScale,
  useLowPoly,
} from './museum-lod';

describe('neighbourScale', () => {
  it('is a quarter from 10 m out and full within 5 m', () => {
    expect(neighbourScale(10)).toBe(0.25);
    expect(neighbourScale(12)).toBe(0.25);
    expect(neighbourScale(5)).toBe(1);
    expect(neighbourScale(0)).toBe(1);
  });
  it('eases in and out, half-way at 7.5 m', () => {
    expect(neighbourScale(7.5)).toBeCloseTo(0.625);
    // Gentle at the ends: little change in the first and last 0.5 m.
    expect(neighbourScale(9.5) - 0.25).toBeLessThan(0.05);
    expect(1 - neighbourScale(5.5)).toBeLessThan(0.05);
  });
  it('never decreases as the walker nears', () => {
    let last = 0;
    for (let d = 14; d >= 0; d -= 0.05) {
      const s = neighbourScale(d);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
  });
  it('quantises to small steps', () => {
    for (let d = 3; d <= 12; d += 0.01)
      expect(
        Math.abs(quantisedScale(d) - neighbourScale(d)),
      ).toBeLessThanOrEqual(0.75 / 48 + 1e-9);
    expect(quantisedScale(14)).toBe(0.25);
    expect(quantisedScale(3)).toBe(1);
  });
});

describe('hallTier', () => {
  it('sorts halls by the doorways', () => {
    expect(hallTier('museum3', 'museum3', ['museum2', 'museum4'])).toBe('own');
    expect(hallTier('museum4', 'museum3', ['museum2', 'museum4'])).toBe(
      'neighbour',
    );
    expect(hallTier('museum6', 'museum3', ['museum2', 'museum4'])).toBe(
      'beyond',
    );
  });
});

describe('useLowPoly', () => {
  it('goes low beyond 30 m and back within 28 m', () => {
    expect(useLowPoly(29, 'own', false)).toBe(false);
    expect(useLowPoly(31, 'own', false)).toBe(true);
    expect(useLowPoly(29, 'neighbour', true)).toBe(true);
    expect(useLowPoly(27, 'neighbour', true)).toBe(false);
  });
  it('is always low in a hall beyond the neighbours', () => {
    expect(useLowPoly(1, 'beyond', false)).toBe(true);
  });
});

describe('lodExempt', () => {
  it('keeps signs, black boxes and architecture always drawn', () => {
    for (const n of [
      'Hall title sign',
      'archway sign',
      'museum7 black box',
      'Floor',
      'Banner',
    ])
      expect(lodExempt(n)).toBe(true);
    expect(lodExempt('Pump set')).toBe(false);
  });
});
