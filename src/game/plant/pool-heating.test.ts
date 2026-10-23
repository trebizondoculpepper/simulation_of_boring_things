import { describe, expect, it } from 'vite-plus/test';
import {
  HEATING,
  capacity,
  effectiveness,
  exchange,
  newPoolHeating,
  pressHeating,
  stepPoolHeating,
} from './pool-heating';
import type { PoolHeatingState } from './pool-heating';

const run = (s: PoolHeatingState, seconds: number) => {
  let state = s;
  for (let t = 0; t < seconds; t++) state = stepPoolHeating(state, 1);
  return state;
};

describe('the exchanger', () => {
  it('passes what one side gives to the other: its energy balances', () => {
    const x = exchange(80, 26, 1);
    const hotGives = capacity(HEATING.primaryFlow) * (80 - x.hotOut);
    const coldTakes = capacity(HEATING.poolFlow) * (x.coldOut - 26);
    expect(hotGives).toBeCloseTo(coldTakes, 9);
    expect(x.q).toBeCloseTo(hotGives, 9);
  });

  it('passes nothing with its primary all bypassed', () => {
    expect(exchange(80, 26, 0).q).toBe(0);
  });

  it('has an effectiveness between nothing and one', () => {
    const e = effectiveness(capacity(7), capacity(15));
    expect(e).toBeGreaterThan(0);
    expect(e).toBeLessThan(1);
  });
});

describe('the boiler heating pool water through the exchanger', () => {
  it('lights the boiler, heats its circuit to its set point, and holds the pool outlet at 30 °C', () => {
    const s = run(newPoolHeating(), 1800);
    expect(s.boiler.code).toBe(3);
    expect(s.flow).toBeGreaterThan(70);
    expect(s.tt[4]).toBeCloseTo(30, 0);
    expect(s.valve).toBeGreaterThan(0.05);
    expect(s.valve).toBeLessThan(0.99);
  });

  it('balances at steady state: the duty is what the pool water takes, and what the boiler gives', () => {
    const s = run(newPoolHeating(), 2400);
    const poolTakes = capacity(HEATING.poolFlow) * (s.poolOut - HEATING.poolIn);
    expect(s.duty).toBeCloseTo(poolTakes, 0);
    expect(s.output).toBeCloseTo(s.duty, -1);
    expect(s.gasRate).toBeGreaterThan(0);
  });

  it('follows a new set point', () => {
    let s = run(newPoolHeating(), 1800);
    s = pressHeating(s, { type: 'setpoint', by: 2 });
    s = run(s, 1200);
    expect(s.tt[4]).toBeCloseTo(32, 0);
  });

  it('with its gas cut, the flame goes out, the boiler locks out, and the outlet falls to the inlet', () => {
    let s = run(newPoolHeating(), 1800);
    s = pressHeating(s, { type: 'gas', on: false });
    s = run(s, 3600);
    expect(s.boiler.lockout).not.toBeNull();
    expect(s.gasRate).toBe(0);
    expect(s.tt[4]).toBeLessThan(27);
  });

  it('in MANUAL, the valve goes where it is driven, and the outlet follows', () => {
    let s = run(newPoolHeating(), 1800);
    s = pressHeating(s, { type: 'auto', on: false });
    s = pressHeating(s, { type: 'drive', to: -1 });
    s = run(s, 120);
    expect(s.valve).toBe(0);
    s = run(s, 300);
    expect(s.tt[4]).toBeLessThan(26.5);
  });
});
