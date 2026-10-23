import { describe, expect, it } from 'vite-plus/test';
import { conductance, solveTee, stepTankTee } from './tank-tee';
import type { TankTeeState } from './tank-tee';

const tank = { area: 1.1 * 0.92, depth: 0.93, floorAbove: 0.365 };
const legs = {
  fill: { bore: 0.025, K: 5 },
  tank: { bore: 0.05, K: 1.5 },
  drain: { bore: 0.05, K: 4.5 },
};
/** Mains at 3 bar (30.6 m), up to 10 m³/h. */
const mains = { head: 30.6, cap: 10 / 3600 };
const run = (
  s: TankTeeState,
  open: { fill: boolean; drain: boolean },
  seconds: number,
) => {
  let state = s;
  for (let t = 0; t < seconds; t++)
    state = stepTankTee(tank, legs, open, mains, state, 1);
  return state;
};
const empty: TankTeeState = { level: 0, fromMains: 0, drained: 0, spilled: 0 };
const full: TankTeeState = { level: 1, fromMains: 0, drained: 0, spilled: 0 };
const volume = tank.area * tank.depth;

describe('the tee', () => {
  it('balances: in from the mains is into the tank and down the drain', () => {
    const f = solveTee({
      mainsHead: 30.6,
      mainsCap: 1,
      tankHead: 0.8,
      fill: conductance(legs.fill, true),
      tank: conductance(legs.tank, true),
      drain: conductance(legs.drain, true),
    });
    expect(f.fromMains).toBeCloseTo(f.intoTank + f.toDrain, 9);
  });

  it('lets the tank’s port flow either way: in when filling, out when draining', () => {
    const base = {
      mainsHead: 30.6,
      mainsCap: 1,
      tankHead: 0.8,
      tank: conductance(legs.tank, true),
    };
    expect(
      solveTee({ ...base, fill: conductance(legs.fill, true), drain: 0 })
        .intoTank,
    ).toBeGreaterThan(0);
    expect(
      solveTee({ ...base, fill: 0, drain: conductance(legs.drain, true) })
        .intoTank,
    ).toBeLessThan(0);
  });
});

describe('a tank filled and drained through one port', () => {
  it('holds still with both valves shut', () => {
    const s = run({ ...full, level: 0.5 }, { fill: false, drain: false }, 300);
    expect(s.level).toBe(0.5);
  });

  it('fills from empty with the fill valve open, at the mains’ 10 m³/h: its 941 l in under 6 minutes', () => {
    const s = run(empty, { fill: true, drain: false }, 300);
    // Five minutes at 10 m³/h, all of it in the tank.
    expect(s.level * volume).toBeCloseTo((10 / 3600) * 300, 6);
    expect(s.level * volume).toBeCloseTo(s.fromMains, 6);
    expect(s.spilled).toBe(0);
    expect(run(empty, { fill: true, drain: false }, 345).level).toBe(1);
  });

  it('spills from the top when overfilled, and keeps count', () => {
    const s = run(full, { fill: true, drain: false }, 60);
    expect(s.level).toBe(1);
    expect(s.spilled).toBeCloseTo((10 / 3600) * 60, 3);
  });

  it('empties with the drain open, all of it to the drain', () => {
    const s = run(full, { fill: false, drain: true }, 1800);
    expect(s.level).toBe(0);
    expect(s.drained).toBeCloseTo(volume, 6);
  });

  it('with both open, sends most of the mains down the drain, and loses nothing', () => {
    const s = run({ ...full, level: 0.5 }, { fill: true, drain: true }, 120);
    expect(s.drained).toBeGreaterThan(s.fromMains * 0.5);
    // Nothing made or lost: what came in, less what left, is what it gained.
    expect(s.level * volume - 0.5 * volume).toBeCloseTo(
      s.fromMains - s.drained - s.spilled,
      6,
    );
  });
});
