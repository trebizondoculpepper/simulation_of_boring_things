import { describe, expect, it } from 'vite-plus/test';
import {
  CHASER_PITCH,
  CHASER_STEP,
  chaserLit,
  chaserPhase,
  chaserPositions,
  flowState,
} from './mimic-chaser';

const lit = (phase: number, state: 'forward' | 'back' | 'still') =>
  [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => chaserLit(i, phase, state));

describe('a mimic line’s chaser', () => {
  it('lights one in four, stepping along the line forward', () => {
    expect(lit(0, 'forward')).toEqual([0, 4]);
    expect(lit(1, 'forward')).toEqual([1, 5]);
    expect(lit(2, 'forward')).toEqual([2, 6]);
  });

  it('steps against the line when the flow runs back', () => {
    expect(lit(0, 'back')).toEqual([0, 4]);
    expect(lit(1, 'back')).toEqual([3, 7]);
    expect(lit(2, 'back')).toEqual([2, 6]);
  });

  it('is dark while still', () => {
    expect(lit(0, 'still')).toEqual([]);
    expect(lit(5, 'still')).toEqual([]);
  });

  it('paces by real seconds alone', () => {
    expect(chaserPhase(0)).toBe(0);
    expect(chaserPhase(CHASER_STEP * 3 + 0.01)).toBe(3);
  });

  it('reads a signed flow, dark under 1 m³/h', () => {
    expect(flowState(45)).toBe('forward');
    expect(flowState(-34)).toBe('back');
    expect(flowState(0.5)).toBe('still');
  });

  it('sets its LEDs at their pitch along every leg of the line', () => {
    const at = chaserPositions([
      [0, 0],
      [0.1, 0],
      [0.1, 0.1],
    ]);
    expect(at).toHaveLength(8);
    expect(at[0][0]).toBeCloseTo(CHASER_PITCH / 2);
    for (let i = 1; i < at.length; i++)
      expect(
        Math.abs(at[i][0] - at[i - 1][0]) + Math.abs(at[i][1] - at[i - 1][1]),
      ).toBeCloseTo(CHASER_PITCH);
  });
});
