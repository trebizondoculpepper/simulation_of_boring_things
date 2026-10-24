import { describe, expect, it } from 'vite-plus/test';
import {
  MOTOR_HZ,
  MOTOR_STROKE,
  motorDetune,
  motorRate,
  motorStroke,
  motorLimits,
  motorRunning,
  newMotorisedValve,
  stepMotorisedValve,
} from './motorised-valve';
import type { MotorisedValveState } from './motorised-valve';

/** Step it `seconds` in tenths of a second. */
const run = (
  s: ReturnType<typeof newMotorisedValve>,
  seconds: number,
): ReturnType<typeof newMotorisedValve> => {
  for (let t = 0; t < seconds - 1e-9; t += 0.1) s = stepMotorisedValve(s, 0.1);
  return s;
};

describe('a motorised ball valve', () => {
  it('rests at its end, its motor still, its limit switch made', () => {
    const s = newMotorisedValve(false);
    expect(motorRunning(s)).toBe(false);
    expect(motorLimits(s)).toEqual({ open: false, shut: true });
  });

  it('commanded open, runs at a steady speed and neither limit is made on the way', () => {
    let s = { ...newMotorisedValve(false), command: true };
    expect(motorRunning(s)).toBe(true);
    s = run(s, MOTOR_STROKE / 2);
    expect(s.position).toBeCloseTo(0.5, 5);
    expect(motorRunning(s)).toBe(true);
    expect(motorLimits(s)).toEqual({ open: false, shut: false });
  });

  it('arrives after one stroke, and its motor stops there', () => {
    let s = { ...newMotorisedValve(false), command: true };
    s = run(s, MOTOR_STROKE + 0.5);
    expect(s.position).toBe(1);
    expect(motorRunning(s)).toBe(false);
    expect(motorLimits(s)).toEqual({ open: true, shut: false });
  });

  it('turned back part-way, goes back from where it got to', () => {
    let s = { ...newMotorisedValve(true), command: false };
    s = run(s, MOTOR_STROKE / 3);
    s = run({ ...s, command: true }, MOTOR_STROKE / 3 + 0.2);
    expect(s.position).toBe(1);
    expect(motorRunning(s)).toBe(false);
  });

  it('loses its power: its spring shuts it, and it opens again only when powered', () => {
    let s: MotorisedValveState = { ...newMotorisedValve(true), power: false };
    expect(motorRunning(s)).toBe(true);
    s = run(s, MOTOR_STROKE + 0.5);
    expect(s.position).toBe(0);
    expect(motorLimits(s)).toEqual({ open: false, shut: true });
    expect(s.command).toBe(true);
    s = run({ ...s, power: true }, MOTOR_STROKE + 0.5);
    expect(s.position).toBe(1);
  });
});

describe('its motor’s pitch', () => {
  it('is a few hertz off the recorded whine, different for each of a room’s valves', () => {
    const hz = Array.from({ length: 12 }, (_, i) => motorDetune(i));
    expect(new Set(hz).size).toBe(12);
    for (const d of hz) {
      expect(Math.abs(d)).toBeGreaterThan(0.5);
      expect(Math.abs(d)).toBeLessThanOrEqual(10);
    }
  });

  it('plays its tone that much faster or slower', () => {
    expect(MOTOR_HZ * motorRate(2)).toBeCloseTo(MOTOR_HZ + motorDetune(2), 9);
  });
});

describe('its stroke', () => {
  it('takes a little longer or shorter than the standard, each of a room’s valves its own', () => {
    const strokes = Array.from({ length: 12 }, (_, i) => motorStroke(i));
    expect(new Set(strokes).size).toBe(12);
    for (const s of strokes) {
      expect(s).toBeGreaterThanOrEqual(MOTOR_STROKE * 0.9 - 1e-9);
      expect(s).toBeLessThanOrEqual(MOTOR_STROKE * 1.1 + 1e-9);
    }
  });
});
