import { describe, expect, it } from 'vite-plus/test';
import {
  MACHINE_TONES,
  TONE_LOOP_SECONDS,
  createSpin,
  renderMachineTone,
} from './machine-tones';

const RATE = 8000;

describe('machine tones', () => {
  it('has a dozen or so, each named once', () => {
    expect(MACHINE_TONES.length).toBeGreaterThanOrEqual(10);
    const ids = new Set(MACHINE_TONES.map((t) => t.id));
    expect(ids.size).toBe(MACHINE_TONES.length);
  });

  for (const { id } of MACHINE_TONES)
    describe(id, () => {
      const loop = renderMachineTone(id, RATE);

      it('is a loop of the right length, never clipping', () => {
        expect(loop.length).toBe(RATE * TONE_LOOP_SECONDS);
        let peak = 0;
        for (const v of loop) {
          expect(Number.isFinite(v)).toBe(true);
          peak = Math.max(peak, Math.abs(v));
        }
        expect(peak).toBeLessThanOrEqual(0.95 + 1e-6);
        expect(peak).toBeGreaterThan(0.05);
      });

      it('joins without a click', () => {
        // The step from its last sample to its first is no bigger than
        // the steps inside it usually are.
        const steps = [];
        for (let i = 1; i < loop.length; i++)
          steps.push(Math.abs(loop[i] - loop[i - 1]));
        steps.sort((a, b) => a - b);
        const typical = steps[Math.floor(steps.length * 0.99)];
        expect(Math.abs(loop[0] - loop[loop.length - 1])).toBeLessThanOrEqual(
          typical,
        );
      });

      it('is the same every time', () => {
        expect(renderMachineTone(id, RATE)).toEqual(loop);
      });
    });
});

describe('a machine running up and down', () => {
  const spin = { up: 2, down: 6, floor: 0.05 };

  it('starts from rest, quiet and slow, and runs up to speed', () => {
    const run = createSpin(spin, 10);
    expect(run.at(10)).toBe(0);
    expect(run.level(10)).toBe(0);
    expect(run.rate(10)).toBeCloseTo(0.05, 6);
    // Quickly at first, easing on to its speed.
    expect(run.at(11)).toBeCloseTo(0.75, 6);
    expect(run.at(12)).toBe(1);
    expect(run.rate(20)).toBe(1);
    expect(run.level(20)).toBe(1);
  });

  it('coasts down from full speed over its run-down time, and stays stopped', () => {
    const run = createSpin(spin, 0);
    expect(run.stop(5)).toBeCloseTo(6, 6);
    expect(run.at(5)).toBe(1);
    expect(run.at(8)).toBeCloseTo(0.25, 6);
    expect(run.at(11)).toBe(0);
    expect(run.at(30)).toBe(0);
    // Asked again, it is already stopping.
    expect(run.stop(9)).toBeCloseTo(6, 6);
  });

  it('stopped before it is up to speed, coasts down from where it got to, sooner', () => {
    const run = createSpin(spin, 0);
    const from = run.at(1);
    const seconds = run.stop(1);
    expect(seconds).toBeCloseTo(6 * from, 6);
    expect(run.at(1 + seconds)).toBe(0);
  });

  it('fades what does not turn in and out, at its own pitch', () => {
    const run = createSpin({ up: 0.25, down: 0.4, floor: 1 }, 0);
    expect(run.rate(0)).toBe(1);
    expect(run.level(0.125)).toBeCloseTo(0.75, 6);
  });

  it('gives every tone a run-up and a run-down', () => {
    for (const { spin } of MACHINE_TONES) {
      expect(spin.up).toBeGreaterThan(0);
      expect(spin.down).toBeGreaterThan(0);
      expect(spin.floor).toBeGreaterThan(0);
      expect(spin.floor).toBeLessThanOrEqual(1);
    }
  });
});
