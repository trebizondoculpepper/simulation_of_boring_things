import { describe, expect, it } from 'vite-plus/test';
import {
  ahuDisplay,
  ahuLamps,
  changeFilters,
  FILTER_CHANGE,
  FILTER_TRIP,
  newAhu,
  resetAhu,
  stepAhu,
} from './pool-ahu';
import type { AhuInputs, AhuState } from './pool-ahu';

const run = (s: AhuState, i: AhuInputs, seconds: number, dt = 1) => {
  for (let t = 0; t < seconds; t += dt) s = stepAhu(s, i, dt);
  return s;
};
const auto: AhuInputs = { isolatorOn: true, mode: 'auto', demand: true };

describe('a pool hall air handling unit', () => {
  it('opens its dampers before its fans run up', () => {
    let s = run(newAhu(), auto, 5);
    expect(s.dampers).toBeGreaterThan(0.4);
    expect(s.speed).toBe(0);
    s = run(s, auto, 40);
    expect(s.speed).toBe(1);
    expect(ahuLamps(s).run).toBe(true);
  });

  it('stops when isolated, turned OFF, or not wanted in AUTO; HAND runs regardless', () => {
    const going = run(newAhu(), auto, 60);
    expect(run(going, { ...auto, isolatorOn: false }, 60).speed).toBe(0);
    expect(run(going, { ...auto, mode: 'off' }, 60).speed).toBe(0);
    expect(run(going, { ...auto, demand: false }, 60).speed).toBe(0);
    expect(
      run(newAhu(), { ...auto, mode: 'hand', demand: false }, 60).speed,
    ).toBe(1);
  });

  it('dries a damp hall with its heat pump, and the hall dampens when it stops', () => {
    let s = run(newAhu({ hallRh: 66 }), auto, 60);
    expect(s.heatPump).toBe(true);
    s = run(s, auto, 4 * 3600, 10);
    // Held between its heat pump's cut-out and cut-in.
    expect(s.hallRh).toBeLessThan(60);
    expect(s.hallRh).toBeGreaterThan(54);
    s = run(s, { ...auto, mode: 'off' }, 6 * 3600, 10);
    expect(s.hallRh).toBeGreaterThan(70);
  });

  it('loads its filters as it runs, asks for a change, and trips if left', () => {
    let s = run(newAhu(), auto, 60);
    s = run(s, auto, 91 * 86400, 3600);
    expect(s.filterPa).toBeGreaterThanOrEqual(FILTER_CHANGE);
    expect(ahuLamps(s).filter).toBe(true);
    s = run(s, auto, 120 * 86400, 3600);
    expect(s.filterPa).toBeGreaterThanOrEqual(FILTER_TRIP);
    expect(s.tripped).toBe(true);
    expect(run(s, auto, 120).speed).toBe(0);
    // Reset does nothing until the filters are changed.
    expect(resetAhu(s).tripped).toBe(true);
    s = resetAhu(changeFilters(s));
    expect(s.tripped).toBe(false);
    expect(run(s, auto, 60).speed).toBe(1);
  });

  it('shows its state on a 16 × 2 display', () => {
    const s = run(newAhu(), auto, 60);
    const lines = ahuDisplay(s, 19200);
    expect(lines).toEqual(['RUN 19200 M3/H  ', 'RH 58% FLT 80PA ']);
    expect(ahuDisplay(newAhu(), 19200)[0].trim()).toBe('STOPPED');
  });
});
