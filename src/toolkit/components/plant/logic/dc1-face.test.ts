import { describe, expect, it } from 'vite-plus/test';
import {
  PLANT_SETTINGS,
  idealSignals,
  newController,
  stepController,
} from './dosing-controller';
import type { ControllerState } from './dosing-controller';
import { dc1Display, newDc1Face, pressDc1, tickDc1 } from './dc1-face';
import type { Dc1Face, Dc1Key } from './dc1-face';
import { DRIFTED_PROBES, cellSignals, newSampleCell } from './sample-cell';

function press(f: Dc1Face, c: ControllerState, ...keys: Dc1Key[]) {
  for (const k of keys) {
    const r = pressDc1(f, c, k);
    f = r.face;
    c = r.controller;
  }
  return { f, c };
}

/** What it shows with its flashing value lit. */
const shown = (f: Dc1Face, c: ControllerState) =>
  dc1Display({ ...f, time: 0 }, c).text;

describe('the DC-1 face', () => {
  const c0 = newController(
    PLANT_SETTINGS,
    idealSignals({ free: 1.32, ph: 7.31, temperature: 29 }),
  );

  it('shows its reading, then its output and menus as CHANGE steps', () => {
    let f = newDc1Face('hypochlorite');
    expect(shown(f, c0)).toBe('1.32');
    f = press(f, c0, 'change').f;
    expect(dc1Display(f, c0).lamps.out).toBe(true);
    f = press(f, c0, 'change').f;
    expect(f.menu).toBe('set');
    expect(dc1Display(f, c0).lamps.set).toBe(true);
  });

  it('changes its setpoint with ▲ and ENTER, BACK leaving it unsaved', () => {
    let { f, c } = press(
      newDc1Face('hypochlorite'),
      c0,
      'change',
      'change',
      'enter',
      'up',
      'up',
    );
    expect(shown(f, c)).toBe('1.40');
    ({ f, c } = press(f, c, 'enter'));
    expect(c.settings.chlorineSet).toBeCloseTo(1.4, 9);
    const after = press(f, c, 'enter', 'down', 'back');
    expect(after.f.editing).toBe(null);
    expect(after.c.settings.chlorineSet).toBeCloseTo(1.4, 9);
  });

  it('drops into MANUAL and sets its output', () => {
    let { f, c } = press(
      newDc1Face('acid'),
      c0,
      'change',
      'change',
      'change',
      'change',
      'change',
    );
    expect(f.menu).toBe('mode');
    ({ f, c } = press(f, c, 'enter', 'up', 'enter'));
    expect(c.mode.acid).toBe('manual');
    expect(dc1Display(f, c).lamps.man).toBe(true);
    // Round to OUT, and set it.
    ({ f, c } = press(
      f,
      c,
      'change',
      'change',
      'change',
      'enter',
      'up',
      'up',
      'enter',
    ));
    expect(f.menu).toBe('out');
    expect(c.manual.acid).toBeCloseTo(0.3, 9);
  });

  it('starts and stops its own channel', () => {
    const { c } = press(newDc1Face('acid'), c0, 'startstop');
    expect(c.running.acid).toBe(false);
    expect(c.running.hypochlorite).toBe(true);
    expect(dc1Display(newDc1Face('acid'), c).lamps.stop).toBe(true);
  });

  it('calibrates its chlorine probe: zero skipped, DPD by keys', () => {
    const cell = {
      ...newSampleCell(
        { free: 1.3, total: 1.5, ph: 7.3, temperature: 29 },
        { total: false, redox: false },
      ),
      probes: DRIFTED_PROBES,
    };
    let c = stepController(
      newController(PLANT_SETTINGS, cellSignals(cell)),
      { cell: cellSignals(cell), circulating: true },
      1,
    );
    let f = newDc1Face('hypochlorite');
    ({ f, c } = press(
      f,
      c,
      'change',
      'change',
      'change',
      'change',
      'change',
      'change',
    ));
    expect(f.menu).toBe('cal');
    ({ f, c } = press(f, c, 'enter'));
    expect(c.session).not.toBe(null);
    // Its zero with chlorine present: refused.
    ({ f, c } = press(f, c, 'enter'));
    expect(f.flash?.text).toBe('Err0');
    ({ f, c } = press(f, c, 'back'));
    const start = c.measured.free;
    const ups = Math.round((1.3 - start) / 0.01);
    ({ f, c } = press(
      f,
      c,
      ...Array.from({ length: ups }, () => 'up' as const),
      'enter',
    ));
    expect(f.flash?.text).toBe('Good');
    expect(c.session).toBe(null);
    c = stepController(c, { cell: cellSignals(cell), circulating: true }, 1);
    expect(c.measured.free).toBeCloseTo(1.3, 1);
  });

  it('alternates an alarm’s code with its reading, ENTER acknowledging', () => {
    let c = newController(
      PLANT_SETTINGS,
      idealSignals({ free: 1.3, ph: 7.3, temperature: 29, flowOk: false }),
    );
    c = stepController(
      c,
      {
        cell: idealSignals({
          free: 1.3,
          ph: 7.3,
          temperature: 29,
          flowOk: false,
        }),
        circulating: true,
      },
      200,
    );
    const f = tickDc1(newDc1Face('hypochlorite'), 2);
    expect(dc1Display(f, c).text).toBe('E FL');
    expect(dc1Display({ ...f, time: 2.2 }, c).lamps.alarm).toBe(true);
    const r = pressDc1(newDc1Face('hypochlorite'), c, 'enter');
    expect(r.controller.alarms.every((a) => a.acked)).toBe(true);
  });
});
