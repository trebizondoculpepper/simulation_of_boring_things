import { describe, expect, it } from 'vite-plus/test';
import {
  energised,
  limits,
  newActuatedValve,
  stepActuatedValve,
  strokeTime,
} from './actuated-valve';
import type { ActuatedValveState } from './actuated-valve';

const run = (s: ActuatedValveState, seconds: number, stroke = 6) => {
  let state = s;
  for (let t = 0; t < seconds * 10; t++)
    state = stepActuatedValve(state, 0.1, stroke);
  return state;
};

describe('a solenoid-operated valve', () => {
  it('opens on its command, over its stroke, its limit switch made at the end', () => {
    let s = { ...newActuatedValve(false), command: true };
    expect(energised(s)).toBe(true);
    s = run(s, 3);
    expect(s.position).toBeCloseTo(0.5, 6);
    expect(limits(s)).toEqual({ open: false, shut: false });
    s = run(s, 3.1);
    expect(limits(s).open).toBe(true);
  });

  it('fails safe: shut on losing its power, or its air', () => {
    expect(
      limits(run({ ...newActuatedValve(true), power: false }, 7)).shut,
    ).toBe(true);
    expect(limits(run({ ...newActuatedValve(true), air: false }, 7)).shut).toBe(
      true,
    );
  });

  it('opens by its manual override with its power gone, but not without air', () => {
    const dead = { ...newActuatedValve(false), power: false, override: true };
    expect(limits(run(dead, 7)).open).toBe(true);
    expect(limits(run({ ...dead, air: false }, 7)).shut).toBe(true);
  });

  it('strokes a big valve slower than a small one', () => {
    expect(strokeTime(0.355)).toBeGreaterThan(strokeTime(0.054));
  });
});
