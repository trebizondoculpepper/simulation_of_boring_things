import { describe, expect, it } from 'vite-plus/test';
import {
  batteryDisplay,
  batteryLamps,
  newCentralBattery,
  newStarter,
  pressStarter,
  pressTest,
  stepCentralBattery,
  stepStarter,
  TEST_LENGTH,
  tripStarter,
} from './electrical-room';
import type { CentralBattery, Starter, StarterInputs } from './electrical-room';

const run = (s: Starter, input: StarterInputs, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.1) s = stepStarter(s, input, 0.1);
  return s;
};
const on: StarterInputs = { isolatorOn: true, mode: 'hand', demand: false };

describe('a motor starter', () => {
  it('runs in HAND on START, and stops on STOP', () => {
    let s = run(newStarter('dol'), on, 1);
    expect(s.running).toBe(false);
    s = run(pressStarter(s, 'start'), on, 1);
    expect(s.running).toBe(true);
    s = run(pressStarter(s, 'stop'), on, 1);
    expect(s.running).toBe(false);
  });

  it('runs in AUTO on the plant’s demand, and never in OFF', () => {
    const auto = { ...on, mode: 'auto' as const };
    expect(run(newStarter('vsd'), { ...auto, demand: true }, 1).running).toBe(
      true,
    );
    expect(run(newStarter('vsd'), auto, 1).running).toBe(false);
    const started = pressStarter(newStarter('dol'), 'start');
    expect(run(started, { ...on, mode: 'off' }, 1).running).toBe(false);
  });

  it('stops, and forgets its START, when isolated or stopped', () => {
    let s = run(pressStarter(newStarter('dol'), 'start'), on, 2);
    s = run(s, { ...on, isolatorOn: false }, 1);
    expect(s.running).toBe(false);
    expect(run(s, on, 1).running).toBe(false);
    s = run(pressStarter(s, 'start'), { ...on, stopped: true }, 1);
    expect(s.running).toBe(false);
  });

  it('stays off when tripped until reset at rest', () => {
    let s = run(pressStarter(newStarter('dol'), 'start'), on, 2);
    s = run(tripStarter(s), on, 1);
    expect(s.running).toBe(false);
    s = run(pressStarter(s, 'start'), on, 1);
    expect(s.running).toBe(false);
    s = run(pressStarter(pressStarter(s, 'reset'), 'start'), on, 1);
    expect(s.running).toBe(true);
  });

  it('draws six times full load starting direct on line, and a drive ramps', () => {
    const dol = stepStarter(pressStarter(newStarter('dol'), 'start'), on, 0.1);
    expect(dol.current).toBeGreaterThan(5);
    expect(run(dol, on, 5).current).toBeCloseTo(0.8, 1);
    let vsd = pressStarter(newStarter('vsd'), 'start');
    let peak = 0;
    for (let t = 0; t < 20; t += 0.1) {
      vsd = stepStarter(vsd, on, 0.1);
      peak = Math.max(peak, vsd.current);
    }
    expect(peak).toBeLessThanOrEqual(0.81);
    expect(vsd.current).toBeCloseTo(0.8, 1);
  });
});

const hold = (b: CentralBattery, seconds: number, dt = 1) => {
  for (let t = 0; t < seconds; t += dt) b = stepCentralBattery(b, dt);
  return b;
};

describe('the emergency lighting central battery', () => {
  it('floats on mains, fully charged, with nothing amiss', () => {
    const b = hold(newCentralBattery(), 60);
    expect(batteryLamps(b)).toEqual({
      mains: true,
      charging: false,
      fault: false,
      low: false,
    });
    expect(batteryDisplay(b)[0]).toBe('MAINS OK    246V DC ');
    expect(batteryDisplay(b).every((line) => line.length === 20)).toBe(true);
  });

  it('runs a function test on battery for a minute, then passes and recharges', () => {
    let b = pressTest(newCentralBattery(), 'function');
    b = hold(b, 30);
    expect(batteryLamps(b).mains).toBe(false);
    expect(batteryDisplay(b)[0]).toBe('FUNCTION TEST 0:30  ');
    b = hold(b, TEST_LENGTH.function);
    expect(b.test).toBeNull();
    expect(b.last).toBe('passed');
    expect(batteryLamps(b).charging).toBe(true);
    expect(b.charge).toBeLessThan(1);
  });

  it('passes a duration test from full, only just', () => {
    const b = hold(
      pressTest(newCentralBattery(), 'duration'),
      3 * 3600 + 10,
      10,
    );
    expect(b.last).toBe('passed');
    expect(batteryLamps(b).low).toBe(true);
  });

  it('fails a duration test begun half charged, and shows a fault', () => {
    const b = hold(
      pressTest({ ...newCentralBattery(), charge: 0.5 }, 'duration'),
      3 * 3600,
      10,
    );
    expect(b.last).toBe('failed');
    expect(batteryLamps(b).fault).toBe(true);
    expect(batteryDisplay(b)[3].trim()).toBe('LAST TEST FAILED');
  });

  it('ends a test early at a second press', () => {
    const b = pressTest(pressTest(newCentralBattery(), 'duration'), 'duration');
    expect(b.test).toBeNull();
  });
});
