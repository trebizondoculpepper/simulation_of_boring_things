import { describe, expect, it } from 'vite-plus/test';
import {
  DEADHEAD,
  deadheadTrips,
  hydraulicKW,
  pumpHeatKW,
  resetAllowed,
  secondsToTrip,
  shaftKW,
  stepCasing,
} from './pump-deadhead';

const run = (c: number, flow: number, seconds: number, running = true) => {
  let t = c;
  for (let s = 0; s < seconds; s++)
    t = stepCasing(t, { running, flow, head: 21, inletC: 27, roomC: 22 }, 1);
  return t;
};

describe('a pump run against a shut valve', () => {
  it('puts all its shaft power into its water at shut-off, less its useful work at duty', () => {
    expect(pumpHeatKW(true, 0, 22)).toBe(DEADHEAD.shutoffKW);
    expect(pumpHeatKW(true, 185, 20.5)).toBeCloseTo(
      shaftKW(185) - hydraulicKW(185, 20.5),
      9,
    );
    expect(pumpHeatKW(false, 0, 22)).toBe(0);
  });

  it('warms its water by a few hundredths of a kelvin at its duty, and never trips', () => {
    const c = run(27, 185, 3600);
    expect(c - 27).toBeGreaterThan(0.01);
    expect(c - 27).toBeLessThan(0.1);
    expect(deadheadTrips(c)).toBe(false);
  });

  it('heats a few kelvin a minute dead-headed, and trips in a few minutes', () => {
    expect(run(27, 0, 60) - 27).toBeGreaterThan(3);
    const t = secondsToTrip(27);
    expect(t).toBeGreaterThan(120);
    expect(t).toBeLessThan(400);
  });

  it('is steady at any step: one big step agrees with many small ones', () => {
    const small = run(27, 50, 600);
    const big = stepCasing(
      27,
      { running: true, flow: 50, head: 21, inletC: 27, roomC: 22 },
      600,
    );
    expect(big).toBeCloseTo(small, 6);
  });

  it('refuses a reset until the casing has cooled, which it does stopped, in a few minutes', () => {
    const hot = DEADHEAD.tripC + 0.5;
    expect(resetAllowed(hot)).toBe(false);
    expect(resetAllowed(run(hot, 0, 60, false))).toBe(false);
    const cooled = run(hot, 0, 240, false);
    expect(resetAllowed(cooled)).toBe(true);
  });
});
