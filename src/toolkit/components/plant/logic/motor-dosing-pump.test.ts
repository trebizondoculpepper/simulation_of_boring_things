import { describe, expect, it } from 'vite-plus/test';
import {
  FLOW_STROKES,
  FULL_STROKE_ML,
  DMH,
  admitGas,
  gasLocked,
  motorPumpDisplay,
  newMotorPumpState,
  oneStroke,
  pressMotorKey,
  setBleed,
  setRate,
  setRuptured,
  stepMotorPump,
  turnStrokeDial,
} from './motor-dosing-pump';
import type { MotorPumpInputs, MotorPumpState } from './motor-dosing-pump';

const ma = (share: number) => 4 + 16 * share;
const inputs = (over: Partial<MotorPumpInputs> = {}): MotorPumpInputs => ({
  powered: true,
  release: true,
  signalMa: 20,
  level: 'ok',
  dischargeBar: 2,
  ...over,
});
/** Run it `seconds` in steps of a tenth, adding up what it delivered. */
const run = (s: MotorPumpState, i: MotorPumpInputs, seconds: number) => {
  let delivered = 0;
  let returned = 0;
  for (let t = 0; t < seconds * 10; t++) {
    const r = stepMotorPump(s, i, 0.1);
    s = r.state;
    delivered += r.deliveredL;
    returned += r.returnedL;
  }
  return { s, delivered, returned };
};

describe('the DMH 21-10 motor-driven metering pump', () => {
  it('is rated as the Sigma/ 1 12017 it is modelled on: 21 l/h, 90 strokes of 3.9 ml', () => {
    expect(FULL_STROKE_ML).toBeCloseTo(3.89, 2);
    const s = { ...newMotorPumpState('standard'), strokeLength: 1 };
    expect(setRate(s, 20)).toBeCloseTo(21);
  });

  it('as commissioned for the Olympic, its dial at 60 %, gives at most 12.6 l/h', () => {
    const s = newMotorPumpState();
    expect(setRate(s, 20)).toBeCloseTo(12.6);
    expect(setRate(s, 12)).toBeCloseTo(6.3);
    expect(setRate(s, 4)).toBe(0);
  });

  it('delivers what it is set to, near enough, gas-free on a standard head', () => {
    const s = { ...newMotorPumpState('standard'), strokeLength: 1 };
    const { delivered } = run(s, inputs({ signalMa: ma(0.5) }), 3600);
    expect(delivered).toBeGreaterThan(10.3);
    expect(delivered).toBeLessThan(10.5);
  });

  it('gives a little of each stroke back to its tank from a degassing head', () => {
    const s = newMotorPumpState('degassing');
    const r = run(s, inputs(), 600);
    expect(r.delivered / (r.delivered + r.returned)).toBeCloseTo(0.93, 2);
  });

  it('follows its dial: half the stroke, half the dose', () => {
    let s = { ...newMotorPumpState('standard'), strokeLength: 1 };
    for (let i = 0; i < 10; i++) s = turnStrokeDial(s, -1);
    expect(s.strokeLength).toBeCloseTo(0.5);
    expect(setRate(s, 20)).toBeCloseTo(10.5);
    for (let i = 0; i < 30; i++) s = turnStrokeDial(s, 1);
    expect(s.strokeLength).toBe(1);
  });

  it('needs its release and a signal above 4 mA in EXT; in MAN its own rate', () => {
    const s = newMotorPumpState();
    expect(stepMotorPump(s, inputs({ release: false }), 10).strokes).toBe(0);
    expect(stepMotorPump(s, inputs({ signalMa: 4 }), 10).strokes).toBe(0);
    const man = pressMotorKey(pressMotorKey(s, 'mode'), 'up');
    expect(man.mode).toBe('manual');
    expect(stepMotorPump(man, inputs({ signalMa: 0 }), 60).strokes).toBe(
      Math.floor(0.55 * DMH.maxSpm),
    );
  });

  it('gas-locks with a slug of gas on a standard head: it strokes, shows its rate, delivers nothing', () => {
    const s = admitGas(newMotorPumpState('standard'), 5);
    expect(gasLocked(s, 2)).toBe(true);
    const r = stepMotorPump(s, inputs(), 5);
    expect(r.strokes).toBeGreaterThan(0);
    expect(r.deliveredL).toBe(0);
    expect(motorPumpDisplay(r.state, inputs())?.text).toBe('12.6');
  });

  it('is stopped by its flow monitor after FLOW_STROKES (20) short strokes, latched until STOP/START', () => {
    let s = admitGas(newMotorPumpState('standard'), 5);
    // At 90 strokes a minute, the twentieth short stroke is in the 14th second.
    expect(FLOW_STROKES).toBe(20);
    expect(run(s, inputs(), 10).s.error).toBe(null);
    s = run(s, inputs(), 60).s;
    expect(s.error).toBe('flow');
    expect(s.on).toBe(false);
    expect(motorPumpDisplay(s, inputs())).toMatchObject({
      text: 'Er F',
      error: true,
    });
    s = pressMotorKey(s, 'startStop');
    expect(s.error).toBe(null);
    expect(s.on).toBe(false);
    s = pressMotorKey(s, 'startStop');
    expect(s.on).toBe(true);
  });

  it('is primed by opening its bleed valve: the gas goes to the return, then it doses again', () => {
    let s = setBleed(admitGas(newMotorPumpState('standard'), 5), true);
    const bled = run(s, inputs(), 4);
    expect(bled.delivered).toBe(0);
    expect(bled.returned).toBeGreaterThan(0);
    expect(bled.s.gasMl).toBeLessThan(0.1);
    s = setBleed(bled.s, false);
    expect(gasLocked(s, 2)).toBe(false);
    expect(run(s, inputs(), 60).delivered).toBeGreaterThan(0.18);
  });

  it('clears the same slug by itself through a degassing head, before its flow monitor trips', () => {
    const s = admitGas(newMotorPumpState('degassing'), 5);
    const r = run(s, inputs(), 60);
    expect(r.s.error).toBe(null);
    expect(r.delivered).toBeGreaterThan(0.15);
  });

  it('locks up after a night standing on a standard head, and not on a degassing one', () => {
    const idle = inputs({ release: false });
    const night = (head: 'standard' | 'degassing') =>
      stepMotorPump(newMotorPumpState(head), idle, 12 * 3600).state;
    expect(gasLocked(night('standard'), 2)).toBe(true);
    expect(run(night('standard'), inputs(), 60).s.error).toBe('flow');
    expect(run(night('degassing'), inputs(), 60).s.error).toBe(null);
  });

  it('returns its stroke through its relief valve against a closed discharge', () => {
    const r = run(
      newMotorPumpState('standard'),
      inputs({ dischargeBar: Infinity }),
      10,
    );
    expect(r.delivered).toBe(0);
    expect(r.returned).toBeGreaterThan(0);
    expect(oneStroke(3, 0, 12, 'standard', false).returned).toBeCloseTo(3);
  });

  it('stops on an empty tank and starts again when it is filled; LOW only warns', () => {
    let s = newMotorPumpState();
    expect(motorPumpDisplay(s, inputs({ level: 'low' }))?.warn).toBe(true);
    s = stepMotorPump(s, inputs({ level: 'empty' }), 1).state;
    expect(s.error).toBe('level');
    expect(motorPumpDisplay(s, inputs({ level: 'empty' }))?.text).toBe('Er L');
    s = stepMotorPump(s, inputs({ level: 'low' }), 1).state;
    expect(s.error).toBe(null);
  });

  it('stops on a ruptured diaphragm until it is changed', () => {
    let s = setRuptured(newMotorPumpState(), true);
    s = pressMotorKey(s, 'startStop');
    s = stepMotorPump(s, inputs(), 10).state;
    expect(s.error).toBe('diaphragm');
    expect(stepMotorPump(s, inputs(), 10).strokes).toBe(0);
    s = setRuptured(s, false);
    expect(s.error).toBe(null);
  });

  it('shows StoP, PAUS, its rate, strokes, share and signal; nothing unpowered', () => {
    let s = newMotorPumpState();
    const half = inputs({ signalMa: 12 });
    expect(motorPumpDisplay(s, half)).toMatchObject({
      text: '6.30',
      unit: 'lh',
      run: true,
      ext: true,
    });
    s = pressMotorKey(s, 'info');
    expect(motorPumpDisplay(s, half)?.text).toBe('45');
    s = pressMotorKey(s, 'info');
    expect(motorPumpDisplay(s, half)?.text).toBe('50');
    s = pressMotorKey(s, 'info');
    expect(motorPumpDisplay(s, half)?.text).toBe('12.0');
    s = pressMotorKey(s, 'info');
    expect(s.shows).toBe('lh');
    expect(motorPumpDisplay(s, inputs({ release: false }))?.text).toBe('PAUS');
    expect(motorPumpDisplay(pressMotorKey(s, 'startStop'), half)?.text).toBe(
      'StoP',
    );
    expect(motorPumpDisplay(s, inputs({ powered: false }))).toBe(null);
  });

  it('works many strokes in one long step without losing them', () => {
    const s = { ...newMotorPumpState('standard'), strokeLength: 1 };
    const r = stepMotorPump(s, inputs(), 3600);
    expect(r.strokes).toBe(90 * 60);
    expect(r.deliveredL).toBeGreaterThan(20.5);
  });
});
