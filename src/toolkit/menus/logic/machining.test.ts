import { describe, expect, it } from 'vite-plus/test';
import {
  MACHINING_ANGLES,
  MACHINING_TONES,
  machining,
  machiningAngle,
} from './machining';

describe('machining', () => {
  it('gives a plate the same marks every time', () => {
    expect(machining(4, 2)).toEqual(machining(4, 2));
  });
  it('varies from plate to plate, over every angle and tone', () => {
    const steps = new Set<number>();
    const tones = new Set<number>();
    for (let c = 0; c < 12; c++)
      for (let r = 0; r < 4; r++) {
        const { step, tone } = machining(c, r);
        steps.add(step);
        tones.add(tone);
      }
    expect(steps.size).toBe(MACHINING_ANGLES);
    expect(tones.size).toBe(MACHINING_TONES);
  });
  it('cuts at angles within a half turn', () => {
    for (let s = 0; s < MACHINING_ANGLES; s++) {
      expect(machiningAngle(s)).toBeGreaterThan(0);
      expect(machiningAngle(s)).toBeLessThan(Math.PI);
    }
  });
});
