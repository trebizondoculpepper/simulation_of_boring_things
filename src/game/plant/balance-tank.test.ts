import { describe, expect, it } from 'vite-plus/test';
import {
  AREA,
  BALANCE_TANK,
  floats,
  newBalanceTank,
  pressBalanceTank,
  stepBalanceTank,
  volumeOf,
} from './balance-tank';
import type { BalanceTankState } from './balance-tank';

const run = (s: BalanceTankState, seconds: number) => {
  let state = s;
  for (let t = 0; t < seconds; t++) state = stepBalanceTank(state, 1);
  return state;
};

describe('the Olympic balance tank', () => {
  it('holds 216 m³ to its weir', () => {
    expect(volumeOf(BALANCE_TANK.weir)).toBe(216);
  });

  it('stands still with the pool quiet: what the pumps draw comes back over the edge', () => {
    const s = run(newBalanceTank(), 600);
    expect(s.level).toBeCloseTo(3.1, 6);
    expect(s.inflow).toBeCloseTo(BALANCE_TANK.circulation, 3);
  });

  it('takes what a gala displaces: 400 bathers raise it by 30 m³', () => {
    const s = run(
      pressBalanceTank(newBalanceTank(), { type: 'session', to: 3 }),
      3600,
    );
    expect(s.level - 3.1).toBeCloseTo(30 / AREA, 2);
  });

  it('gives it back when they leave: the pumps fill the pool again from the tank', () => {
    let s = run(
      pressBalanceTank(newBalanceTank(), { type: 'session', to: 3 }),
      3600,
    );
    s = run(pressBalanceTank(s, { type: 'session', to: 0 }), 3600);
    expect(s.level).toBeCloseTo(3.1, 2);
    expect(s.poolShort).toBeCloseTo(0, 2);
  });

  it('opens its make-up below its band and closes it above', () => {
    let s = run(newBalanceTank(2.8), 60);
    expect(s.makeupOpen).toBe(true);
    s = run(s, 3600);
    expect(s.makeupOpen).toBe(false);
    expect(s.level).toBeGreaterThan(BALANCE_TANK.makeupOn);
    expect(s.level).toBeLessThan(BALANCE_TANK.makeupOff + 0.01);
  });

  it('rises when the pumps stop, the channels draining back, and falls again when they start', () => {
    let s = run(pressBalanceTank(newBalanceTank(), { type: 'stop' }), 600);
    expect(s.level - 3.1).toBeCloseTo(BALANCE_TANK.channels / AREA, 3);
    expect(s.outflow).toBe(0);
    s = run(pressBalanceTank(s, { type: 'start' }), 600);
    expect(s.level).toBeCloseTo(3.1, 3);
  });

  it('on make-up by hand, fills to its weir and spills to drain, its HIGH float up', () => {
    const s = run(
      pressBalanceTank(newBalanceTank(3.8), { type: 'makeup', mode: 'hand' }),
      3600,
    );
    expect(s.spill).toBeCloseTo(BALANCE_TANK.makeup, 0);
    expect(s.level).toBeGreaterThan(BALANCE_TANK.weir);
    expect(s.level).toBeLessThan(BALANCE_TANK.weir + 0.05);
    expect(floats(s).high).toBe(true);
  });

  it('trips the pumps on LOW LOW when starting them on a low tank draws it down, and will not restart until above LOW', () => {
    // Stopped, its channels drained back into it.
    let s: BalanceTankState = {
      ...newBalanceTank(1.05),
      makeupMode: 'off',
      pumps: 'stop',
      channels: 0,
    };
    s = run(pressBalanceTank(s, { type: 'start' }), 600);
    expect(s.pumps).toBe('tripped');
    // Tripped, the channels drain back and lift it off LOW LOW again; still LOW.
    expect(floats(s).lowLow).toBe(false);
    expect(floats(s).low).toBe(true);
    expect(pressBalanceTank(s, { type: 'start' }).pumps).toBe('tripped');
  });
});
