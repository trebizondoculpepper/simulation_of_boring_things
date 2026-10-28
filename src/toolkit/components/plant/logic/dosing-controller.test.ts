import { describe, expect, it } from 'vite-plus/test';
import {
  CONTROLLER,
  stepControl,
} from '../../../../game/plant/water-treatment';
import type { DosingControl } from '../../../../game/plant/water-treatment';
import { waterFrom } from '../../../../game/water/pool-chemistry';
import {
  PLANT_SETTINGS,
  WORLD_SETTINGS,
  act,
  idealSignals,
  measure,
  newController,
  relays,
  stepController,
} from './dosing-controller';
import type { ControllerState } from './dosing-controller';
import { DRIFTED_PROBES, cellSignals, newSampleCell } from './sample-cell';

const water = (free: number, ph: number, T = 29) =>
  idealSignals({ free, ph, temperature: T });

/** Steps of `dt` for `seconds`, the same signals throughout. */
function run(
  s: ControllerState,
  sig: ReturnType<typeof idealSignals>,
  seconds: number,
  dt = 10,
  circulating = true,
) {
  let out = s;
  for (let t = 0; t < seconds; t += dt)
    out = stepController(out, { cell: sig, circulating }, dt);
  return out;
}

describe('the dosing controller', () => {
  it('has the world controller’s settings', () => {
    expect(WORLD_SETTINGS.chlorineSet).toBe(CONTROLLER.chlorineSet);
    expect(WORLD_SETTINGS.chlorineBand).toBe(CONTROLLER.chlorineBand);
    expect(WORLD_SETTINGS.chlorineIntegral).toBe(CONTROLLER.chlorineIntegral);
    expect(WORLD_SETTINGS.pHSet).toBe(CONTROLLER.pHSet);
    expect(WORLD_SETTINGS.pHBand).toBe(CONTROLLER.pHBand);
    expect(WORLD_SETTINGS.pHLockout).toBe(CONTROLLER.pHLockout);
  });

  it('gives the world controller’s outputs, step by step, with ideal probes', () => {
    // A cell's water wandering through setpoint, the lockout and back.
    const path = Array.from({ length: 400 }, (_, i) => ({
      free: 1.3 + 0.6 * Math.sin(i / 23),
      ph: 7.3 + 0.55 * Math.sin(i / 37),
      circulating: i % 97 > 8,
    }));
    let world: DosingControl = {
      cell: { freeChlorine: 1.3, ph: 7.3 },
      integral: 0.2,
      hypochlorite: 0,
      acid: 0,
      lockout: false,
    };
    let ours = newController(WORLD_SETTINGS, water(1.3, 7.3), 0.2);
    for (const p of path) {
      const sample = waterFrom({
        ph: p.ph,
        alkalinity: 60,
        hardness: 200,
        tds: 700,
        temperature: 29,
        freeChlorine: p.free,
      });
      world = stepControl(world, sample, p.circulating, 10);
      // Ours reads the world's cell (its lag is the sample cell's).
      ours = stepController(
        ours,
        {
          cell: water(world.cell.freeChlorine, world.cell.ph),
          circulating: p.circulating,
        },
        10,
      );
      expect(ours.yout.hypochlorite).toBeCloseTo(world.hypochlorite, 9);
      expect(ours.yout.acid).toBeCloseTo(world.acid, 9);
      expect(ours.integral).toBeCloseTo(world.integral, 9);
      expect(ours.lockout).toBe(world.lockout);
    }
  });

  it('stops all dosing once the sample flow has been lost for its delay, and waits its feed delay after', () => {
    let s = newController(PLANT_SETTINGS, water(1.0, 7.5));
    s = run(s, water(1.0, 7.5), 60);
    expect(s.yout.hypochlorite).toBeGreaterThan(0);
    const dry = { ...water(1.0, 7.5), flowOk: false };
    s = run(s, dry, 100);
    expect(s.yout.hypochlorite).toBeGreaterThan(0);
    s = run(s, dry, 30);
    expect(s.flowFail).toBe(true);
    expect(s.yout.hypochlorite).toBe(0);
    expect(s.yout.acid).toBe(0);
    expect(relays(s).sampleFlow).toBe(true);
    s = run(s, water(1.0, 7.5), 30);
    expect(s.yout.hypochlorite).toBe(0);
    s = run(s, water(1.0, 7.5), 40);
    expect(s.yout.hypochlorite).toBeGreaterThan(0);
  });

  it('locks chlorine out with pH out of its range, acid still dosing', () => {
    let s = newController(PLANT_SETTINGS, water(1.0, 7.8));
    s = run(s, water(1.0, 7.8), 60);
    expect(s.lockout).toBe(true);
    expect(s.yout.hypochlorite).toBe(0);
    expect(s.yout.acid).toBe(1);
  });

  it('latches an output off after its maximum dosing time at 100 %, until acknowledged', () => {
    let s = newController(PLANT_SETTINGS, water(0.2, 7.3));
    s = run(s, water(0.2, 7.3), 7100);
    expect(s.yout.hypochlorite).toBe(1);
    s = run(s, water(0.2, 7.3), 200);
    expect(s.timedOut.hypochlorite).toBe(true);
    expect(s.yout.hypochlorite).toBe(0);
    expect(relays(s).doseLimit).toBe(true);
    expect(relays(s).common).toBe(true);
    s = act(s, { kind: 'ack' }).state;
    expect(relays(s).common).toBe(false);
    s = run(s, water(0.2, 7.3), 20);
    expect(s.yout.hypochlorite).toBe(1);
  });

  it('raises a limit alarm only after its checkout time', () => {
    let s = newController(PLANT_SETTINGS, water(0.5, 7.3));
    s = run(s, water(0.5, 7.3), 290);
    expect(relays(s).chlorine).toBe(false);
    s = run(s, water(0.5, 7.3), 20);
    expect(relays(s).chlorine).toBe(true);
    expect(s.alarms.some((a) => a.code === 'chlorine-low')).toBe(true);
    s = run(s, water(1.3, 7.3), 20);
    expect(relays(s).chlorine).toBe(false);
  });

  it('doses a fixed output in MANUAL', () => {
    let s = newController(PLANT_SETTINGS, water(1.3, 7.3));
    s = act(s, { kind: 'mode', channel: 'acid', mode: 'manual' }).state;
    s = act(s, { kind: 'manual', channel: 'acid', value: 0.35 }).state;
    s = run(s, water(1.3, 7.0), 30);
    expect(s.yout.acid).toBeCloseTo(0.35, 6);
  });

  it('calibrates a drifted chlorine probe against DPD, refusing a zero with chlorine present', () => {
    const cell = {
      ...newSampleCell({ free: 1.3, total: 1.6, ph: 7.3, temperature: 29 }),
      probes: DRIFTED_PROBES,
    };
    const sig = cellSignals(cell);
    let s = run(newController(PLANT_SETTINGS, sig), sig, 10);
    expect(s.measured.free).toBeLessThan(1.0);
    s = act(s, { kind: 'cal-begin', probe: 'free' }).state;
    const zero = act(s, { kind: 'cal-zero' });
    expect(zero.refused).toBe('zero-high');
    s = act(zero.state, { kind: 'cal-skip' }).state;
    const span = act(s, { kind: 'cal-span', value: 1.3 });
    expect(span.refused).toBe(null);
    expect(span.state.session).toBe(null);
    expect(measure(sig, span.state.cal).free).toBeCloseTo(1.3, 6);
    expect(span.state.calLog.free?.ok).toBe(true);
    // A DPD reading of nothing is refused.
    const again = act(
      act(span.state, { kind: 'cal-begin', probe: 'free' }).state,
      { kind: 'cal-skip' },
    ).state;
    expect(act(again, { kind: 'cal-span', value: 0.01 }).refused).toBe(
      'dpd-low',
    );
  });

  it('calibrates pH on two buffers and refuses buffers too close together', () => {
    const base = newSampleCell({
      free: 1.3,
      total: 1.6,
      ph: 7.3,
      temperature: 25,
    });
    const drifted = { ...base, probes: DRIFTED_PROBES };
    const at = (place: 4 | 7 | 'cell') =>
      cellSignals({ ...drifted, phProbe: place });
    let s = run(newController(PLANT_SETTINGS, at('cell')), at('cell'), 10);
    expect(s.measured.ph).toBeLessThan(7.1);
    s = act(s, { kind: 'cal-begin', probe: 'ph', method: 'buffers' }).state;
    s = run(s, at(7), 10);
    const first = act(s, { kind: 'cal-buffer' });
    expect(first.found?.buffer).toBe(7);
    // The same buffer again: too close.
    expect(act(first.state, { kind: 'cal-buffer' }).refused).toBe(
      'buffer-distance',
    );
    s = run(first.state, at(4), 10);
    const second = act(s, { kind: 'cal-buffer' });
    expect(second.refused).toBe(null);
    expect(second.found?.slopePercent).toBeCloseTo(94, 6);
    s = run(second.state, at('cell'), 10);
    expect(s.measured.ph).toBeCloseTo(7.3, 6);
  });

  it('corrects pH’s zero against phenol red, and holds dosing while calibrating', () => {
    const cell = {
      ...newSampleCell({ free: 1.3, total: 1.6, ph: 7.3, temperature: 29 }),
      probes: { ...DRIFTED_PROBES, phSlope: 1 },
    };
    const sig = cellSignals(cell);
    let s = run(newController(PLANT_SETTINGS, sig), sig, 120);
    s = act(s, { kind: 'cal-begin', probe: 'ph', method: 'process' }).state;
    s = run(s, sig, 10);
    expect(s.yout.acid).toBe(0);
    expect(s.yout.hypochlorite).toBe(0);
    const r = act(s, { kind: 'cal-process', value: 7.3 });
    expect(r.refused).toBe(null);
    expect(measure(sig, r.state.cal).ph).toBeCloseTo(7.3, 6);
  });
});
