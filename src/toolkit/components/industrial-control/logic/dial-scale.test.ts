import { describe, expect, it } from 'vite-plus/test';
import {
  START,
  SWEEP,
  dialScale,
  markText,
  niceStep,
  pointerAngle,
} from './dial-scale';

describe('a dial gauge’s scale', () => {
  it('numbers its marks at a round step', () => {
    expect(niceStep(4)).toBe(1);
    expect(niceStep(2.5)).toBe(0.5);
    expect(niceStep(120)).toBe(25);
    expect(dialScale(0, 4).majors).toEqual([0, 1, 2, 3, 4]);
    expect(dialScale(-1, 1.5).majors).toEqual([-1, -0.5, 0, 0.5, 1, 1.5]);
  });

  it('sweeps 270° from its minimum to its maximum, and stops just past each', () => {
    expect(pointerAngle(0, 0, 4)).toBeCloseTo(START);
    expect(pointerAngle(4, 0, 4)).toBeCloseTo(START + SWEEP);
    expect(pointerAngle(2, 0, 4)).toBeCloseTo(START + SWEEP / 2);
    expect(pointerAngle(99, 0, 4)).toBeLessThan(START + SWEEP * 1.03);
    expect(pointerAngle(-99, 0, 4)).toBeGreaterThan(START - SWEEP * 0.03);
  });

  it('prints marks without needless decimals', () => {
    expect(markText(2)).toBe('2');
    expect(markText(0.5)).toBe('0.5');
    expect(markText(-0.25)).toBe('-0.25');
  });
});
