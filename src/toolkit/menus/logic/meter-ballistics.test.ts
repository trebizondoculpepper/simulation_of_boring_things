import { describe, expect, it } from 'vite-plus/test';
import { needleSettled, stepNeedle } from './meter-ballistics';
import type { NeedleState } from './meter-ballistics';

const run = (from: NeedleState, target: number, seconds: number) => {
  let n = from;
  for (let t = 0; t < seconds; t += 1 / 60) n = stepNeedle(n, target, 1 / 60);
  return n;
};

describe('meter ballistics', () => {
  it('lags behind a new reading, then settles on it within a few seconds', () => {
    const start = { at: 0, speed: 0 };
    const early = run(start, 1, 0.25);
    expect(early.at).toBeGreaterThan(0);
    expect(early.at).toBeLessThan(0.3);
    expect(needleSettled(run(start, 0.6, 1), 0.6)).toBe(false);
    expect(needleSettled(run(start, 0.6, 4), 0.6)).toBe(true);
  });
  it('swings a little past before settling, as a damped coil does', () => {
    let n = { at: 0, speed: 0 };
    let most = 0;
    for (let t = 0; t < 4; t += 1 / 60) {
      n = stepNeedle(n, 0.5, 1 / 60);
      most = Math.max(most, n.at);
    }
    expect(most).toBeGreaterThan(0.5);
    expect(most).toBeLessThan(0.55);
  });
  it('stays on its stops and survives a long frame', () => {
    const n = stepNeedle({ at: 0.9, speed: 5 }, 1, 3);
    expect(n.at).toBeLessThanOrEqual(1.02);
    expect(Number.isFinite(n.speed)).toBe(true);
  });
  it('is settled when resting on its reading', () => {
    expect(needleSettled({ at: 0.3, speed: 0 }, 0.3)).toBe(true);
    expect(needleSettled({ at: 0.3, speed: 0.1 }, 0.3)).toBe(false);
  });
});
