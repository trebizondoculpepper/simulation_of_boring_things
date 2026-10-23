import { describe, expect, it } from 'vite-plus/test';
import {
  FAIL_DELAY,
  RECIRCULATION,
  commands,
  newDutyStandby,
  pressDutyStandby,
  pumpsHydraulics,
  stepDutyStandby,
} from './duty-standby';
import type { DutyStandbyState } from './duty-standby';

/** Run the controller with a plant where a pump runs if commanded and available. */
function run(
  s: DutyStandbyState,
  available: [boolean, boolean],
  seconds: number,
) {
  let state = s;
  for (let t = 0; t < seconds; t += 0.5) {
    const c = commands(state);
    state = stepDutyStandby(
      state,
      [c[0] && available[0], c[1] && available[1]],
      0.5,
    );
  }
  return state;
}

describe('the duty/standby controller', () => {
  it('runs the selected duty pump, and only it', () => {
    const s = run(newDutyStandby(), [true, true], 10);
    expect(commands(s)).toEqual([true, false]);
    expect(s.dutyFail).toBe(false);
  });

  it('starts the standby when the duty fails to run, within the fail delay, and latches DUTY FAIL', () => {
    let s = newDutyStandby();
    s = run(s, [false, true], FAIL_DELAY - 0.5);
    expect(commands(s)).toEqual([true, false]);
    s = run(s, [false, true], 1);
    expect(s.fault).toEqual([true, false]);
    expect(s.dutyFail).toBe(true);
    expect(commands(s)).toEqual([false, true]);
  });

  it('keeps DUTY FAIL after the duty is available again, until RESET; then the duty leads again', () => {
    let s = run(newDutyStandby(), [false, true], 10);
    s = run(s, [true, true], 10);
    expect(s.dutyFail).toBe(true);
    expect(commands(s)).toEqual([false, true]);
    s = pressDutyStandby(s, { type: 'reset', available: [true, true] });
    expect(s.dutyFail).toBe(false);
    expect(commands(s)).toEqual([true, false]);
  });

  it('will not reset a fault whose pump is still unavailable', () => {
    let s = run(newDutyStandby(), [false, true], 10);
    s = pressDutyStandby(s, { type: 'reset', available: [false, true] });
    expect(s.fault).toEqual([true, false]);
    expect(s.dutyFail).toBe(true);
  });

  it('runs neither when both fail, and shows both', () => {
    const s = run(newDutyStandby(), [false, false], 20);
    expect(s.fault).toEqual([true, true]);
    expect(commands(s)).toEqual([false, false]);
  });

  it('runs pump 2 as duty when selected, and nothing when stopped', () => {
    let s = pressDutyStandby(newDutyStandby(), { type: 'select', duty: 1 });
    expect(commands(run(s, [true, true], 5))).toEqual([false, true]);
    s = pressDutyStandby(s, { type: 'stop' });
    expect(commands(s)).toEqual([false, false]);
  });
});

describe('the pumps on their headers', () => {
  const spec = { flow: 300, dischargeBar: 2.7, suctionBar: -0.15 };

  it('delivers the running pump’s flow; the idle pump, its non-return valve shut, passes nothing', () => {
    const h = pumpsHydraulics(
      spec,
      [true, false],
      [true, true],
      [false, false],
    );
    expect(h.delivered).toBe(300);
    expect(h.through).toEqual([300, 0]);
    expect(h.dischargeBar).toEqual([2.7, 0]);
  });

  it('lets water back through the idle pump when its non-return valve jams open, and delivers less', () => {
    const h = pumpsHydraulics(spec, [true, false], [true, true], [false, true]);
    expect(h.through[1]).toBeCloseTo(-RECIRCULATION * 300, 9);
    expect(h.delivered).toBeCloseTo(300 * (1 - RECIRCULATION), 9);
    // The idle pump's casing now sees the header's pressure.
    expect(h.dischargeBar[1]).toBeGreaterThan(0);
  });

  it('passes nothing back through a jammed pump that is isolated', () => {
    const h = pumpsHydraulics(
      spec,
      [true, false],
      [true, false],
      [false, true],
    );
    expect(h.delivered).toBe(300);
    expect(h.through[1]).toBe(0);
  });

  it('delivers nothing with the running pump isolated by its valves', () => {
    expect(
      pumpsHydraulics(spec, [true, false], [false, true], [false, false])
        .delivered,
    ).toBe(0);
  });
});
