import { describe, expect, it } from 'vite-plus/test';
import {
  createDrive,
  driveDisplay,
  driveRpm,
  pressDriveKey,
  stepDrive,
} from './drive-keypad';

const run = (drive: ReturnType<typeof createDrive>, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.05) stepDrive(drive, 0.05);
};

describe('a drive and its keypad', () => {
  it('ramps to its reference when started, and down when stopped', () => {
    const d = createDrive();
    pressDriveKey(d, 'start');
    run(d, 1);
    expect(d.frequency).toBeGreaterThan(5);
    expect(d.frequency).toBeLessThan(30);
    run(d, 5);
    expect(d.frequency).toBe(30);
    expect(driveRpm(d)).toBeCloseTo(873);
    pressDriveKey(d, 'stop');
    run(d, 4);
    expect(d.frequency).toBe(0);
  });

  it('steps its reference within its range', () => {
    const d = createDrive();
    for (let i = 0; i < 100; i++) pressDriveKey(d, 'up');
    expect(d.reference).toBe(60);
    for (let i = 0; i < 100; i++) pressDriveKey(d, 'down');
    expect(d.reference).toBe(0);
  });

  it('reverses through zero', () => {
    const d = createDrive();
    pressDriveKey(d, 'start');
    run(d, 4);
    pressDriveKey(d, 'reverse');
    run(d, 7);
    expect(d.frequency).toBe(-30);
    expect(driveDisplay(d)[0]).toContain('REV');
  });

  it('jogs at its jog speed from stopped, until another key', () => {
    const d = createDrive();
    pressDriveKey(d, 'jog');
    run(d, 2);
    expect(d.frequency).toBe(10);
    pressDriveKey(d, 'sel');
    run(d, 2);
    expect(d.frequency).toBe(0);
  });

  it('shows status and the selected parameter on two lines', () => {
    const d = createDrive();
    expect(driveDisplay(d)).toEqual(['Stopped     FWD', 'Out Freq   0.0Hz']);
    pressDriveKey(d, 'sel');
    pressDriveKey(d, 'sel');
    expect(driveDisplay(d)[1]).toMatch(/^Speed RPM +0$/);
    pressDriveKey(d, 'esc');
    expect(driveDisplay(d)[1]).toMatch(/^Out Freq/);
    for (const line of driveDisplay(d))
      expect(line.length).toBeLessThanOrEqual(16);
  });
});
