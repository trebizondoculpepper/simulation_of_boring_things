import { describe, expect, it } from 'vite-plus/test';
import { GAS_ALARM_CYCLE, gasAlarmAt, renderGasAlarm } from './gas-alarms';

describe('the gas alarms’ sounders', () => {
  it('bleeps three times, then growls downward, for chlorine', () => {
    expect(gasAlarmAt('chlorine', 0.03).voice).toBe('bleep');
    expect(gasAlarmAt('chlorine', 0.09).level).toBe(0);
    expect(gasAlarmAt('chlorine', 0.25).voice).toBe('bleep');
    const early = gasAlarmAt('chlorine', 0.4);
    const late = gasAlarmAt('chlorine', 0.7);
    expect(early.voice).toBe('growl');
    expect(late.hz).toBeLessThan(early.hz);
    expect(gasAlarmAt('chlorine', 0.9).level).toBe(0);
  });

  it('chirps upward four times, then holds a bleep, for ozone', () => {
    const a = gasAlarmAt('ozone', 0.31);
    const b = gasAlarmAt('ozone', 0.36);
    expect(a.voice).toBe('chirp');
    expect(b.hz).toBeGreaterThan(a.hz);
    expect(gasAlarmAt('ozone', 0.55).voice).toBe('bleep');
    expect(gasAlarmAt('ozone', 0.75).level).toBe(0);
  });

  it('renders a loop that starts and ends silent, so it joins cleanly', () => {
    for (const kind of ['chlorine', 'ozone'] as const) {
      const samples = renderGasAlarm(kind, 8000);
      expect(samples.length).toBe(Math.round(GAS_ALARM_CYCLE[kind] * 4 * 8000));
      expect(Math.abs(samples[0])).toBeLessThan(0.01);
      expect(Math.abs(samples[samples.length - 1])).toBeLessThan(0.01);
      expect(Math.max(...samples)).toBeGreaterThan(0.5);
    }
  });
});
