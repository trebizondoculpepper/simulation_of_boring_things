import { describe, expect, it } from 'vite-plus/test';
import { createSystem, output, run, setInput } from '../sim/system';
import type { System } from '../sim/system';
import { HEATER, RCD } from './electrical';

/**
 * The simplest electrical circuit: a supply, an RCD and a heater. Current
 * flows until an earth fault leaks enough to trip the RCD, which breaks
 * the circuit. Stepped every 10 ms, to time the trip.
 */
const TICK = 0.01;

function circuit(): System {
  return createSystem(
    { rcd: { kind: RCD }, heater: { kind: HEATER } },
    { 'heater.supply': 'rcd.live', 'rcd.residual': 'heater.leakage' },
    {
      'rcd.line': true,
      'rcd.test': false,
      'rcd.reset': false,
      'heater.fault': 0,
    },
  );
}

const current = (s: System) => output(s, 'heater.current');
/** How long, s, until the RCD trips (or Infinity within `limit`). */
function tripTime(start: System, limit = 2) {
  let s = start;
  for (let t = TICK; t <= limit + 1e-9; t += TICK) {
    s = run(s, TICK, TICK);
    if (output(s, 'rcd.tripped') === true) return t;
  }
  return Infinity;
}

describe('an RCD protecting a heater circuit', () => {
  it('lets the current flow, with no fault, indefinitely', () => {
    const s = run(circuit(), 60, TICK);
    expect(current(s)).toBe(10);
    expect(output(s, 'rcd.tripped')).toBe(false);
  });

  it('holds on a small leak below half its rating', () => {
    const s = run(setInput(circuit(), 'heater.fault', 10), 10, TICK);
    expect(current(s)).toBe(10);
  });

  it('trips on a fault at its rating within 300 ms, and the circuit stops', () => {
    const faulty = setInput(run(circuit(), 1, TICK), 'heater.fault', 40);
    const t = tripTime(faulty);
    expect(t).toBeLessThanOrEqual(0.3);
    const s = run(faulty, 0.5, TICK);
    expect(current(s)).toBe(0);
    expect(output(s, 'rcd.live')).toBe(false);
  });

  it('trips on a heavy fault within 40 ms', () => {
    expect(
      tripTime(setInput(circuit(), 'heater.fault', 200)),
    ).toBeLessThanOrEqual(0.04);
  });

  it('stays tripped when the fault clears, until reset; and trips again if reset onto the fault', () => {
    let s = run(setInput(circuit(), 'heater.fault', 40), 1, TICK);
    expect(output(s, 'rcd.tripped')).toBe(true);
    // Reset with the fault still there: it trips again.
    s = run(setInput(s, 'rcd.reset', true), TICK, TICK);
    s = run(setInput(s, 'rcd.reset', false), 1, TICK);
    expect(output(s, 'rcd.tripped')).toBe(true);
    // The fault mended: it stays off until reset, then the heater runs.
    s = run(setInput(s, 'heater.fault', 0), 1, TICK);
    expect(current(s)).toBe(0);
    s = run(setInput(s, 'rcd.reset', true), TICK, TICK);
    s = run(setInput(s, 'rcd.reset', false), 1, TICK);
    expect(current(s)).toBe(10);
  });

  it('trips when its TEST button is pressed, as it should be quarterly', () => {
    const pressed = setInput(circuit(), 'rcd.test', true);
    expect(tripTime(pressed)).toBeLessThanOrEqual(0.3);
  });
});
