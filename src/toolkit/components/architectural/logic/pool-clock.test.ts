import { describe, expect, it } from 'vite-plus/test';
import { clockHands } from './pool-clock';

describe('a wall clock’s hands', () => {
  it('points at the time: three o’clock, a quarter past, half a minute', () => {
    const h = clockHands(3 * 3600 + 15 * 60 + 30);
    expect(h.hour).toBeCloseTo(((3 + 15.5 / 60) / 12) * Math.PI * 2, 9);
    expect(h.minute).toBeCloseTo((15.5 / 60) * Math.PI * 2, 9);
    expect(h.second).toBeCloseTo(Math.PI, 9);
  });

  it('sweeps smoothly, and wraps at midnight', () => {
    expect(clockHands(0.5).second).toBeCloseTo((0.5 / 60) * Math.PI * 2, 9);
    expect(clockHands(86400 + 60).minute).toBeCloseTo(clockHands(60).minute, 9);
  });
});
