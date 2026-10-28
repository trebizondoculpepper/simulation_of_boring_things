import { describe, expect, it } from 'vite-plus/test';
import {
  MAX_SLICE,
  SPEEDS,
  advance,
  hallClockText,
  hallSession,
  newHallClock,
  runSession,
  secondsOfDay,
  setSpeed,
  slices,
  timeOfDay,
} from './museum-time';
import type { HallModel } from './museum-time';

describe('the museum’s hall clock', () => {
  it('starts at the visitor’s local time, at ×1', () => {
    const now = secondsOfDay(new Date(2026, 9, 28, 14, 30, 15));
    const c = newHallClock(now);
    expect(hallClockText(c)).toBe('14:30:15');
    expect(c.speed).toBe(1);
  });

  it('runs at ×1, ×60, ×600 and ×3600, in slices no longer than half a second', () => {
    expect(SPEEDS).toEqual([1, 60, 600, 3600]);
    const c = setSpeed(newHallClock(0), 3600);
    const s = slices(c, 1 / 60);
    expect(s.length).toBe(120);
    expect(Math.max(...s)).toBeLessThanOrEqual(MAX_SLICE);
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(60, 9);
    expect(slices(newHallClock(0), 0)).toEqual([]);
  });

  it('wraps round midnight', () => {
    const c = advance(newHallClock(23 * 3600 + 59 * 60), 120);
    expect(hallClockText(c)).toBe('00:01:00');
    expect(timeOfDay(c)).toBe(60);
  });
});

describe('a hall’s session (rule 1)', () => {
  const counter: HallModel<{ n: number }> = {
    reset: () => ({ n: 0 }),
    step: (s, h) => ({ n: s.n + h }),
  };

  it('starts at the reset state, the clock at now, and steps model and clock together', () => {
    const s = hallSession(counter, 1000);
    expect(s).toEqual({
      clock: { start: 1000, seconds: 0, speed: 1 },
      state: { n: 0 },
    });
    const on = runSession(counter, { ...s, clock: setSpeed(s.clock, 60) }, 2);
    expect(on.state.n).toBeCloseTo(120, 9);
    expect(on.clock.seconds).toBeCloseTo(120, 9);
  });

  it('is the same after walking out and back in as after RESET', () => {
    const walked = runSession(counter, hallSession(counter, 500), 30);
    const again = hallSession(counter, 500);
    expect(again).toEqual(hallSession(counter, 500));
    expect(again.state).toEqual(counter.reset(500));
    expect(walked.state).not.toEqual(again.state);
  });
});
