import { describe, expect, it } from 'vite-plus/test';
import type { BlockKind } from '../sim/block-kind';
import { createSystem, output, run, setInput } from '../sim/system';
import type { System } from '../sim/system';
import {
  FLOW_CELL,
  SAMPLE_BOOSTER,
  SAMPLE_TAP,
  SCREENS,
  WATER_QUALITY_CONTROLLER,
  WATER_QUALITY_PANEL,
  waterQualityPanel,
} from './sampling';

/**
 * A stand-in for the pool's chemistry, made quick so the tests are: its
 * free chlorine is used up by bathers and by itself and made up by the
 * hypochlorite dose; its pH creeps up (hypochlorite and aeration) and is
 * brought down by the acid dose. Real pools move over hours; this one
 * moves over minutes.
 */
interface PoolParams {
  /** Mg/l a second at full dose; mg/l a second used per bather; its own decay, per s. */
  chlorineDose: number;
  perBather: number;
  decay: number;
  /** pH a second: its creep, and the acid's pull at full dose. */
  creep: number;
  acidDose: number;
}
const POOL_CHEMISTRY: BlockKind<PoolParams, { chlorine: number; pH: number }> =
  {
    kind: 'pool-chemistry',
    inputs: [
      { name: 'chlorineDose' },
      { name: 'acidDose' },
      { name: 'bathers' },
    ],
    outputs: [
      { name: 'chlorine', unit: 'mg/l' },
      { name: 'pH' },
      { name: 'temperature', unit: '°C' },
    ],
    params: {
      chlorineDose: 0.002,
      perBather: 0.0002,
      decay: 0.0001,
      creep: 0.0001,
      acidDose: 0.0005,
    },
    init: () => ({ chlorine: 1.0, pH: 7.6 }),
    step(p, s, i, dt) {
      const dose = (i.chlorineDose as number) ?? 0;
      const acid = (i.acidDose as number) ?? 0;
      const bathers = (i.bathers as number) ?? 0;
      const chlorine = Math.max(
        0,
        s.chlorine +
          (p.chlorineDose * dose -
            p.perBather * bathers -
            p.decay * s.chlorine) *
            dt,
      );
      const pH = s.pH + (p.creep - p.acidDose * acid) * dt;
      return {
        state: { chlorine, pH },
        outputs: { chlorine, pH, temperature: 28 },
      };
    },
  };

/** The pool, the tapping and the panel, the panel's demands driving the dose. */
function plant(panel = WATER_QUALITY_PANEL, dosing = true): System {
  return createSystem(
    {
      pool: { kind: POOL_CHEMISTRY },
      tap: { kind: SAMPLE_TAP },
      panel: { kind: panel },
    },
    {
      ...(dosing ? { 'pool.chlorineDose': 'panel.chlorineDemand' } : {}),
      'pool.acidDose': 'panel.acidDemand',
      'panel.sampleFlow': 'tap.flow',
      'panel.chlorine': 'pool.chlorine',
      'panel.pH': 'pool.pH',
      'panel.temperature': 'pool.temperature',
    },
    {
      'pool.bathers': 2,
      'tap.pressure': 1.2,
      'tap.opening': 1,
      'tap.blocked': false,
      'panel.circulating': true,
      'panel.chlorineTankLow': false,
      'panel.acidTankLow': false,
      'panel.reset': false,
      'panel.fooled': false,
    },
  );
}

/** The plant two hours on, settled: worked out once and shared (systems are plain values). */
let settled: System | undefined;
const settledPlant = () => (settled ??= run(plant(), 2 * 3600));

const n = (s: System, address: string) => output(s, address) as number;
const alarms = (s: System) => (output(s, 'panel.display') as string) ?? '';

describe('the sample tapping and line', () => {
  const tap = (pressure: number, extra: Record<string, unknown> = {}) =>
    output(
      run(
        createSystem({ tap: { kind: SAMPLE_TAP } }, {}, {
          'tap.pressure': pressure,
          ...extra,
        } as Record<string, number | boolean>),
        1,
      ),
      'tap.flow',
    ) as number;

  it('holds its regulated 33 l/h with the main at pressure, less when it is low, none when blocked', () => {
    expect(tap(1.2)).toBe(33);
    expect(tap(0.2)).toBeLessThan(FLOW_CELL.params.switchAt);
    expect(tap(0)).toBe(0);
    expect(tap(1.2, { 'tap.blocked': true })).toBe(0);
  });

  it('a booster pump makes up a weak main', () => {
    const s = run(
      createSystem(
        { boost: { kind: SAMPLE_BOOSTER }, tap: { kind: SAMPLE_TAP } },
        { 'tap.pressure': 'boost.pressure' },
        { 'boost.pressure': 0.2, 'boost.running': true },
      ),
      1,
    );
    expect(output(s, 'tap.flow')).toBe(33);
  });
});

describe('the water-quality panel: flow cell, probes and controller', () => {
  it('holds free chlorine and pH near their setpoints', () => {
    const s = settledPlant();
    const p = WATER_QUALITY_CONTROLLER.params;
    expect(Math.abs(n(s, 'pool.chlorine') - p.chlorineSet)).toBeLessThan(0.15);
    expect(Math.abs(n(s, 'pool.pH') - p.pHSet)).toBeLessThan(0.1);
    // What it reads is the pool's, a little behind.
    expect(n(s, 'panel.chlorine')).toBeCloseTo(n(s, 'pool.chlorine'), 1);
    expect(output(s, 'panel.sampleFlow')).toBe(true);
    expect(output(s, 'panel.dosingInhibited')).toBe(false);
    expect(alarms(run(setInput(s, 'panel.touch', 'back'), 1))).toBe(
      'No alarms',
    );
  });

  it('a blocked sample line: the readings freeze while the pool drifts, then SAMPLE FLOW LOW and dosing stops', () => {
    const steady = settledPlant();
    const reading = n(steady, 'panel.chlorine');
    const real = n(steady, 'pool.chlorine');
    const blocked = run(setInput(steady, 'tap.blocked', true), 60);
    // The lamp goes out at once; the alarm and the stop wait for the delay.
    expect(output(blocked, 'panel.sampleFlow')).toBe(false);
    expect(output(blocked, 'panel.sampleFlowLow')).toBe(false);
    expect(output(blocked, 'panel.dosingInhibited')).toBe(false);
    const later = run(blocked, 10 * 60);
    expect(output(later, 'panel.sampleFlowLow')).toBe(true);
    expect(output(later, 'panel.dosingInhibited')).toBe(true);
    expect(output(later, 'panel.chlorineDemand')).toBe(0);
    expect(output(later, 'panel.acidDemand')).toBe(0);
    // The panel still shows much what it did; the pool has moved on.
    expect(Math.abs(n(later, 'panel.chlorine') - reading)).toBeLessThan(0.1);
    expect(real - n(later, 'pool.chlorine')).toBeGreaterThan(0.2);
    // Cleared, it reads the pool again and doses.
    const cleared = run(setInput(later, 'tap.blocked', false), 120);
    expect(output(cleared, 'panel.sampleFlowLow')).toBe(false);
    // (A minute behind a pool now dosed back up fast.)
    expect(
      Math.abs(n(cleared, 'panel.chlorine') - n(cleared, 'pool.chlorine')),
    ).toBeLessThan(0.15);
    expect(n(cleared, 'panel.chlorineDemand')).toBeGreaterThan(0);
  });

  it('a fooled flow switch lets it dose on readings that have frozen', () => {
    const steady = settledPlant();
    let s = setInput(steady, 'panel.fooled', true);
    s = run(setInput(s, 'tap.blocked', true), 10 * 60);
    expect(output(s, 'panel.sampleFlowLow')).toBe(false);
    expect(output(s, 'panel.dosingInhibited')).toBe(false);
  });

  it('a drifting chlorine probe holds the pool at the wrong value until the daily check corrects it', () => {
    // Its zero creeping up 0.05 mg/l an hour.
    const drifting = waterQualityPanel({ chlorine: { drift: 0.05 } });
    const s = run(plant(drifting), 6 * 3600, 2);
    const set = WATER_QUALITY_CONTROLLER.params.chlorineSet;
    // It reads about its setpoint; the pool is well below it.
    expect(Math.abs(n(s, 'panel.chlorine') - set)).toBeLessThan(0.15);
    expect(n(s, 'panel.chlorine') - n(s, 'pool.chlorine')).toBeGreaterThan(0.2);
    // The daily check: the manual DPD test's value, and CALIBRATE.
    let c = setInput(s, 'panel.testChlorine', n(s, 'pool.chlorine'));
    c = run(setInput(c, 'panel.calibrateChlorine', true), 1);
    expect(n(c, 'panel.chlorine')).toBeCloseTo(n(c, 'pool.chlorine'), 2);
    c = run(setInput(c, 'panel.calibrateChlorine', false), 3600, 2);
    expect(Math.abs(n(c, 'pool.chlorine') - set)).toBeLessThan(0.15);
  });

  it('an empty hypochlorite tank stops the chlorine pump and alarms; the acid doses on', () => {
    const steady = settledPlant();
    const empty = run(setInput(steady, 'panel.chlorineTankLow', true), 1);
    expect(output(empty, 'panel.chlorineTankLow')).toBe(true);
    expect(output(empty, 'panel.chlorineDemand')).toBe(0);
    expect(output(empty, 'panel.dosingInhibited')).toBe(true);
    expect(n(empty, 'panel.acidDemand')).toBeGreaterThan(0);
  });

  it('circulation failure stops both pumps at once', () => {
    const steady = settledPlant();
    const off = run(setInput(steady, 'panel.circulating', false), 1);
    expect(output(off, 'panel.chlorineDemand')).toBe(0);
    expect(output(off, 'panel.acidDemand')).toBe(0);
  });

  it('a pump dosing at full too long without effect is stopped, until reset', () => {
    // The hypochlorite pump air-locked: the controller calls, nothing comes.
    const s = run(plant(WATER_QUALITY_PANEL, false), 1200);
    expect(output(s, 'panel.chlorineDoseTimeout')).toBe(false);
    expect(output(s, 'panel.chlorineDemand')).toBe(1);
    const stopped = run(s, 2000);
    expect(output(stopped, 'panel.chlorineDoseTimeout')).toBe(true);
    expect(output(stopped, 'panel.chlorineDemand')).toBe(0);
    expect(output(stopped, 'panel.dosingInhibited')).toBe(true);
    expect(alarms(run(setInput(stopped, 'panel.touch', 'back'), 1))).toContain(
      'chlorineDoseTimeout',
    );
    let r = run(setInput(stopped, 'panel.reset', true), 1);
    r = run(setInput(r, 'panel.reset', false), 1);
    expect(output(r, 'panel.chlorineDoseTimeout')).toBe(false);
    expect(output(r, 'panel.chlorineDemand')).toBe(1);
  });

  it('its touch screen pages through its screens', () => {
    let s = run(plant(), 60);
    expect(output(s, 'panel.screen')).toBe('measure');
    expect(output(s, 'panel.display')).toMatch(/^Cl \d\.\d\d mg\/l {2}pH /);
    s = run(setInput(s, 'panel.touch', 'next'), 1);
    expect(output(s, 'panel.screen')).toBe('chlorine');
    expect(output(s, 'panel.display')).toContain('set 1.00');
    s = run(setInput(s, 'panel.touch', null), 1);
    s = run(setInput(s, 'panel.touch', 'next'), 1);
    expect(output(s, 'panel.screen')).toBe('ph');
    s = run(setInput(s, 'panel.touch', 'home'), 1);
    expect(output(s, 'panel.screen')).toBe(SCREENS[0]);
  });

  it('sleeps most of the time once the pool is steady', () => {
    const steady = settledPlant();
    let slept = 0;
    let s = steady;
    for (let i = 0; i < 600; i++) {
      s = run(s, 1);
      if (s.blocks.panel.slept) slept++;
    }
    expect(slept).toBeGreaterThan(300);
  });
});
