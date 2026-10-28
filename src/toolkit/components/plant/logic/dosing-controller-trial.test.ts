import { describe, expect, it } from 'vite-plus/test';
import {
  DEMO_PUMPS,
  newControllerTrial,
  pumpDemand,
  setHypoSuction,
  setSampleValve,
  slug,
  stepSide,
} from './dosing-controller-trial';
import type { SideState } from './dosing-controller-trial';

/** A side run for `hours` with ideal pumps, 10 s steps. */
function run(s: SideState, hours: number) {
  for (let t = 0; t < hours * 3600; t += 10) {
    const rates = {
      hypochlorite: pumpDemand(s, 'hypochlorite').running
        ? pumpDemand(s, 'hypochlorite').rate
        : 0,
      acid: pumpDemand(s, 'acid').running ? pumpDemand(s, 'acid').rate : 0,
    };
    s = stepSide(s, rates, { hypochlorite: false, acid: false }, 10);
  }
  return s;
}

describe('the dosing controller trial', () => {
  it('holds its demo pool near its setpoints', () => {
    const s = run(newControllerTrial().lounge, 3);
    expect(s.controller.measured.free).toBeGreaterThan(1.0);
    expect(s.controller.measured.free).toBeLessThan(1.6);
    expect(s.controller.measured.ph).toBeGreaterThan(7.1);
    expect(s.controller.measured.ph).toBeLessThan(7.5);
    expect(s.delivered.hypochlorite).toBeGreaterThan(0);
    expect(DEMO_PUMPS.hypochlorite).toBe(2.1);
  });

  it('trips its dosing time when the hypochlorite pump delivers nothing', () => {
    const s = run(setHypoSuction(newControllerTrial().olympic, false), 5);
    expect(s.controller.timedOut.hypochlorite).toBe(true);
    expect(
      s.controller.alarms.some((a) => a.code === 'dose-limit-hypochlorite'),
    ).toBe(true);
  });

  it('locks chlorine out after a soda ash slug', () => {
    const s = run(slug(newControllerTrial().lounge, 'soda-ash'), 0.1);
    expect(s.controller.measured.ph).toBeGreaterThan(7.7);
    expect(s.controller.lockout).toBe(true);
    expect(s.controller.yout.hypochlorite).toBe(0);
  });

  it('stops dosing with its sample valve shut', () => {
    const s = run(setSampleValve(newControllerTrial().olympic, false), 0.1);
    expect(s.controller.flowFail).toBe(true);
    expect(s.controller.release.hypochlorite).toBe(false);
  });
});
