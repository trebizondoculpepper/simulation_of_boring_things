import { describe, expect, it } from 'vite-plus/test';
import { createSystem, output, run, setInput } from '../sim/system';
import type { System } from '../sim/system';
import { OZONE_PLANT, POOL_OZONE_LIMIT, ozonePlant } from './ozone';

/**
 * The ozone plant as one block on the main pool's circulation (160 m³/h),
 * after PWTAG's code and DIN 19643: its dose, its contact, its carbon, and
 * each interlock on PWTAG's list.
 */

function plant(kind = OZONE_PLANT): System {
  return createSystem(
    { ozone: { kind } },
    {},
    {
      'ozone.flow': 160,
      'ozone.power': true,
      'ozone.run': true,
      'ozone.setpoint': 100,
      'ozone.coolingFlow': 200,
      'ozone.coolingTemp': 15,
      'ozone.dryerFault': false,
      'ozone.door': false,
      'ozone.leak': 0,
      'ozone.destructorFault': false,
      'ozone.reset': false,
    },
  );
}

const out = (s: System, port: string) => output(s, `ozone.${port}`);
const press = (s: System) =>
  run(
    setInput(run(setInput(s, 'ozone.reset', true), 1), 'ozone.reset', false),
    1,
  );

describe('the ozone plant, a block made of blocks', () => {
  it('doses 1 g/m³ at full setpoint, with at least two minutes’ contact, and the carbon takes out what is left', () => {
    const s = run(plant(), 600);
    expect(out(s, 'status')).toBe('running');
    expect(out(s, 'dose')).toBeCloseTo(160, 6);
    expect(out(s, 'applied')).toBeCloseTo(1, 6);
    expect(out(s, 'contact') as number).toBeGreaterThanOrEqual(120);
    // What dissolved, less what decayed in the tank.
    const residual = out(s, 'residual') as number;
    expect(residual).toBeLessThan(1);
    expect(residual).toBeGreaterThan(0.5);
    expect(out(s, 'residualOut') as number).toBeLessThan(0.001);
    expect(out(s, 'exhausted')).toBe(false);
    // About 18 Wh per gram, with the dryer, booster and destructor.
    expect(out(s, 'power') as number).toBeGreaterThan(160 * 0.018);
    expect(out(s, 'power') as number).toBeLessThan(10);
    expect([
      out(s, 'lampPower'),
      out(s, 'lampOzone'),
      out(s, 'lampAlarm'),
    ]).toEqual([true, true, false]);
  });

  it('is held off with no circulation, and runs again by itself when the flow returns', () => {
    const stopped = run(setInput(run(plant(), 60), 'ozone.flow', 0), 2);
    expect(out(stopped, 'status')).toBe('blocked: no flow');
    expect(out(stopped, 'dose')).toBe(0);
    expect(out(stopped, 'alarm')).toBe(true);
    expect(out(stopped, 'code')).toBe(1);
    const flowing = run(setInput(stopped, 'ozone.flow', 160), 2);
    expect(out(flowing, 'status')).toBe('running');
  });

  it('trips on cooling-water failure, and resets only once it is back', () => {
    const dry = run(setInput(run(plant(), 60), 'ozone.coolingFlow', 0), 2);
    expect(out(dry, 'status')).toBe('tripped: cooling water');
    expect(out(dry, 'tripped')).toBe(true);
    expect(out(dry, 'dose')).toBe(0);
    expect(out(press(dry), 'tripped')).toBe(true);
    const back = press(setInput(dry, 'ozone.coolingFlow', 200));
    expect(out(back, 'status')).toBe('running');
  });

  it('makes less ozone from warm cooling water, and trips above 30 °C', () => {
    const warm = run(setInput(run(plant(), 60), 'ozone.coolingTemp', 28), 2);
    expect(out(warm, 'dose') as number).toBeLessThan(160);
    expect(out(warm, 'running')).toBe(true);
    const hot = run(setInput(warm, 'ozone.coolingTemp', 32), 2);
    expect(out(hot, 'status')).toBe('tripped: cooling water');
  });

  it('a failed dryer: the air goes wet, the output falls, then it trips and alarms', () => {
    let s = setInput(run(plant(), 60), 'ozone.dryerFault', true);
    let reduced = false;
    for (let i = 0; i < 120 && out(s, 'tripped') !== true; i++) {
      s = run(s, 10, 10);
      const dose = out(s, 'dose') as number;
      if (out(s, 'running') && dose < 150 && dose > 0) reduced = true;
    }
    expect(reduced).toBe(true);
    expect(out(s, 'status')).toBe('tripped: dryer');
    expect(out(s, 'lampAlarm')).toBe(true);
    expect(out(s, 'code')).toBe(3);
    // Mended, the dryer brings the dew point down again, and it resets.
    s = run(setInput(s, 'ozone.dryerFault', false), 3600, 10);
    expect(out(s, 'dewPoint') as number).toBeLessThan(-60);
    expect(out(press(s), 'status')).toBe('running');
  });

  it('trips when its cabinet door is opened, and resets once it is shut', () => {
    const open = run(setInput(run(plant(), 60), 'ozone.door', true), 2);
    expect(out(open, 'status')).toBe('tripped: door open');
    const shut = press(setInput(open, 'ozone.door', false));
    expect(out(shut, 'status')).toBe('running');
  });

  it('a leak: room ozone past the warning, then the stop; the plant stays off until the air is clear and it is reset, and a reset before the leak is mended only trips it again', () => {
    const leaking = setInput(run(plant(), 60), 'ozone.leak', 1);
    let s = leaking;
    let warned = false;
    for (let i = 0; i < 600 && out(s, 'tripped') !== true; i++) {
      s = run(s, 1);
      if (out(s, 'roomWarning') && !out(s, 'roomAlarm')) warned = true;
    }
    expect(warned).toBe(true);
    expect(out(s, 'roomAlarm')).toBe(true);
    expect(out(s, 'status')).toBe('tripped: ozone in room');
    // Stopped at source: no more gas, and the ventilation clears the air.
    s = run(s, 3600, 10);
    expect(out(s, 'roomOzone') as number).toBeLessThan(0.01);
    expect(out(s, 'tripped')).toBe(true);
    expect(out(s, 'roomAlarm')).toBe(true);
    // Reset with the joint still leaking: it starts, leaks, and trips again.
    s = run(press(s), 600);
    expect(out(s, 'status')).toBe('tripped: ozone in room');
    // Mended, the air cleared, and reset: it runs and stays running.
    s = run(setInput(s, 'ozone.leak', 0), 1800, 10);
    s = run(press(s), 600);
    expect(out(s, 'status')).toBe('running');
    expect(out(s, 'roomWarning')).toBe(false);
  });

  it('a failed off-gas destructor lets ozone into the room, which stops the plant', () => {
    let s = setInput(run(plant(), 60), 'ozone.destructorFault', true);
    s = run(s, 600);
    expect(out(s, 'status')).toBe('tripped: ozone in room');
  });

  it('a spent deozoniser lets ozone through toward the pool, past DIN’s limit', () => {
    // A small bed, to see a long life in a short test.
    let s = run(plant(ozonePlant({ carbonCapacity: 50 })), 600, 10);
    expect(out(s, 'residualOut') as number).toBeLessThan(POOL_OZONE_LIMIT);
    s = run(s, 4 * 3600, 10);
    expect(out(s, 'exhausted')).toBe(true);
    expect(out(s, 'residualOut') as number).toBeGreaterThan(POOL_OZONE_LIMIT);
    expect(out(s, 'carbon') as number).toBeLessThan(100);
  });

  it('sleeps as a whole once steady, and wakes for a switch', () => {
    const steady = run(plant(), 600);
    const before = steady.stats.slept;
    const quiet = run(steady, 600);
    expect(quiet.stats.slept - before).toBeGreaterThan(590);
    const off = run(setInput(quiet, 'ozone.run', false), 1);
    expect(out(off, 'status')).toBe('standby');
    expect(out(off, 'dose')).toBe(0);
  });
});
