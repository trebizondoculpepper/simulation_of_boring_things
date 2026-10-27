import { describe, expect, it } from 'vite-plus/test';
import {
  lampLit,
  lampSense,
  newTrial,
  pressTrial,
  stepTrial,
  verbOf,
} from './parody-trial';

describe('a reinterpreted panel’s trial', () => {
  it('reads a button’s verb from its legend', () => {
    expect(verbOf('START')).toBe('go');
    expect(verbOf('P1 STOP')).toBe('stop');
    expect(verbOf('TRIP RESET')).toBe('reset');
    expect(verbOf('ACCEPT')).toBe('accept');
    expect(verbOf('LAMP TEST')).toBe('lamp-test');
    expect(verbOf('VALVE OPEN')).toBe('go');
    expect(verbOf('HORN SILENCE')).toBe('accept');
    expect(verbOf('MODE')).toBe('other');
  });

  it('reads a lamp’s sense from its legend', () => {
    expect(lampSense('PUMP RUN')).toBe('going');
    expect(lampSense('HH TRIP')).toBe('tripped');
    expect(lampSense('GAS DETECTED')).toBe('tripped');
    expect(lampSense('STOPPED')).toBe('stopped');
    expect(lampSense('NOT AUTO')).toBe('wander');
    expect(lampSense('CHARGE')).toBe('wander');
  });

  it('trips when a fault is due, refuses a start until reset, and arms the next fault', () => {
    let t = newTrial(0);
    expect(t.going).toBe(true);
    t = stepTrial(t, t.nextFault);
    expect(t).toMatchObject({ going: false, tripped: true });
    expect(lampLit('tripped', t, 0)).toBe(true);
    expect(lampLit('going', t, 0)).toBe(false);
    expect(pressTrial(t, 'START').counted).toBe(false);
    const reset = pressTrial(t, 'RESET');
    expect(reset.counted).toBe(true);
    expect(reset.trial.tripped).toBe(false);
    expect(reset.trial.nextFault).toBeGreaterThan(t.seconds);
    expect(pressTrial(reset.trial, 'RESET').counted).toBe(false);
    const started = pressTrial(reset.trial, 'START');
    expect(started.trial.going).toBe(true);
    expect(pressTrial(started.trial, 'STOP').trial.going).toBe(false);
  });
});
