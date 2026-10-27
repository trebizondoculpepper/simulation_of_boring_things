import { describe, expect, it } from 'vite-plus/test';
import {
  DIAPHRAGM_PUMPS,
  diaphragmDisplay,
  diaphragmOutput,
  newDiaphragmState,
  pressKey,
  strokesOn,
} from './diaphragm-pump';

describe('a diaphragm metering pump', () => {
  const asked = { running: true, rate: 1.05 };

  it('doses at its controller’s rate in AUTO, its strokes in proportion', () => {
    const out = diaphragmOutput('solenoid', newDiaphragmState(), asked);
    expect(out.running).toBe(true);
    expect(out.rate).toBeCloseTo(1.05);
    expect(out.fraction).toBeCloseTo(0.5);
    expect(out.spm).toBe(90);
  });

  it('stops with its controller, at STOP, and without power', () => {
    const s = newDiaphragmState();
    expect(
      diaphragmOutput('solenoid', s, { running: false, rate: 1 }).running,
    ).toBe(false);
    expect(
      diaphragmOutput('solenoid', pressKey(s, 'stop'), asked).running,
    ).toBe(false);
    expect(diaphragmOutput('solenoid', s, asked, false).running).toBe(false);
    expect(
      diaphragmOutput('solenoid', pressKey(pressKey(s, 'stop'), 'start'), asked)
        .running,
    ).toBe(true);
  });

  it('never doses more than its most', () => {
    const out = diaphragmOutput('solenoid', newDiaphragmState(), {
      running: true,
      rate: 9,
    });
    expect(out.rate).toBeCloseTo(DIAPHRAGM_PUMPS.solenoid.maxLh);
    expect(out.spm).toBe(DIAPHRAGM_PUMPS.solenoid.maxSpm);
  });

  it('in MANUAL, doses its own rate, set with ▲ and ▼, while released', () => {
    let s = pressKey(newDiaphragmState(), 'mode');
    expect(s.mode).toBe('manual');
    s = pressKey(pressKey(s, 'up'), 'up');
    const out = diaphragmOutput('stepper', s, asked);
    expect(out.fraction).toBeCloseTo(0.6);
    expect(out.rate).toBeCloseTo(4.5);
    for (let i = 0; i < 30; i++) s = pressKey(s, 'down');
    expect(s.manual).toBeCloseTo(0.05);
  });

  it('counts its strokes', () => {
    const a = strokesOn(0.9, 60, 0.2);
    expect(a.began).toBe(1);
    expect(strokesOn(0.1, 60, 0.2).began).toBe(0);
  });

  it('shows its rate, mode and strokes; nothing unpowered', () => {
    const s = newDiaphragmState();
    const d = diaphragmDisplay(
      'DP-101A',
      s,
      diaphragmOutput('solenoid', s, asked),
    )!;
    expect(d.state).toBe('RUN');
    expect(d.rate).toBe('1.05');
    expect(d.foot).toContain('AUTO');
    expect(d.foot).toBe('AUTO 50% 90SPM');
    expect(d.foot.length).toBeLessThanOrEqual(15);
    expect(
      diaphragmDisplay(
        'DP-101A',
        s,
        diaphragmOutput('solenoid', s, asked),
        false,
      ),
    ).toBeNull();
  });
});
