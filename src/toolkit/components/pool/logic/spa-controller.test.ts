import { describe, expect, it } from 'vite-plus/test';
import {
  initialSpa,
  nudgeSetpoint,
  pressJets,
  startCycle,
  stopCycle,
  setStopped,
  SPA,
  spaReadout,
  stepSpa,
} from './spa-controller';
import { initialShower, pressShower, running, stepShower } from './shower';

const run = <S>(s: S, step: (s: S, dt: number) => S, seconds: number) => {
  for (let t = 0; t < seconds; t++) s = step(s, 1);
  return s;
};

describe('spa controller', () => {
  it('heats the water toward the set point, and holds it there', () => {
    const cold = initialSpa(36, 37);
    const s = stepSpa(cold, 1);
    expect(s.heating).toBe(true);
    const later = run(s, stepSpa, 4 * 3600);
    expect(later.water).toBeGreaterThan(36.4);
    expect(later.water).toBeLessThan(37.05);
    expect(spaReadout(later)).toMatch(/^3[67]\.\d$/);
  });

  it('runs the jets for a cycle, then stops them', () => {
    const s = pressJets(initialSpa());
    expect(s.jets).toBe(SPA.cycle);
    expect(run(s, stepSpa, SPA.cycle + 1).jets).toBe(0);
    // A second press stops them early.
    expect(pressJets(s).jets).toBe(0);
  });

  it('stops everything at the emergency stop, and starts nothing until reset', () => {
    let s = pressJets(initialSpa(34, 37));
    s = setStopped(s, true);
    expect(s.jets).toBe(0);
    expect(pressJets(s).jets).toBe(0);
    expect(stepSpa(s, 1).heating).toBe(false);
    s = setStopped(s, false);
    expect(stepSpa(s, 1).heating).toBe(true);
  });

  it('starts the jets and air together from START, and stops both at STOP', () => {
    const s = startCycle(initialSpa());
    expect([s.jets, s.air]).toEqual([SPA.cycle, SPA.cycle]);
    expect(stopCycle(s)).toMatchObject({ jets: 0, air: 0 });
    expect(startCycle(setStopped(initialSpa(), true)).jets).toBe(0);
  });

  it('bubbles a few seconds after the blower starts, and for a few after it stops', () => {
    let s = startCycle(initialSpa());
    s = run(s, stepSpa, 1);
    expect(s.bubbling).toBe(false);
    s = run(s, stepSpa, SPA.bubblesAfter + 1);
    expect(s.bubbling).toBe(true);
    s = stepSpa(stopCycle(s), 1);
    expect(s.bubbling).toBe(true);
    s = run(s, stepSpa, SPA.bubblesLinger + 1);
    expect(s.bubbling).toBe(false);
  });

  it('keeps the set point within its range', () => {
    let s = initialSpa(37, 39.5);
    for (let i = 0; i < 5; i++) s = nudgeSetpoint(s, 1);
    expect(s.setpoint).toBe(SPA.max);
  });
});

describe('pool shower', () => {
  it('runs for its timed run after a press, and stops itself', () => {
    const s = pressShower(initialShower());
    expect(running(run(s, stepShower, 29))).toBe(true);
    const after = run(s, stepShower, 31);
    expect(running(after)).toBe(false);
    expect(after.used).toBeCloseTo(4.5);
  });
});
