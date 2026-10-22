import { describe, expect, it } from 'vite-plus/test';
import {
  CHLORINE,
  MISDELIVERY_GRAMS,
  OZONE,
  accept,
  airChanges,
  gasAlarms,
  gasDisplay,
  misdeliver,
  newGasState,
  reset,
  stepGas,
} from './gas-detection';
import type { GasInputs, GasParams, GasState } from './gas-detection';

const run = (
  p: GasParams,
  s: GasState,
  i: GasInputs,
  seconds: number,
): GasState => {
  for (let t = 0; t < seconds; t++) s = stepGas(p, s, i, 1);
  return s;
};

const quiet = { leak: 0, fan: true };

describe('gas detection', () => {
  it('stays clear and quiet with no gas', () => {
    const s = run(CHLORINE, newGasState(), quiet, 600);
    expect(s.reading).toBe(0);
    expect(gasAlarms(s)).toEqual({ beacon: false, sounder: false });
    expect(gasDisplay(CHLORINE, s)).toBe('0.00');
  });

  it('creeps up on a weeping fitting, latches A1 then A2, and purges', () => {
    const leak = { leak: 2, fan: true };
    let s = newGasState();
    let firstA1 = -1;
    for (let t = 0; t < 3600 && !s.a2; t++) {
      s = stepGas(CHLORINE, s, leak, 1);
      if (s.a1 && firstA1 < 0) firstA1 = t;
    }
    expect(firstA1).toBeGreaterThan(60);
    expect(s.a2).toBe(true);
    expect(gasAlarms(s)).toEqual({ beacon: true, sounder: true });
    expect(airChanges(CHLORINE, s, true)).toBe(CHLORINE.purge);
    // The purge holds the weep under A1, so it can be reset; then it
    // creeps back on the extract's ordinary speed.
    s = run(CHLORINE, s, leak, 1800);
    expect(s.reading).toBeLessThan(CHLORINE.a1);
    s = reset(CHLORINE, s);
    expect(s.a1 || s.a2).toBe(false);
    s = run(CHLORINE, s, leak, 3600);
    expect(s.a2).toBe(true);
  });

  it('builds up with the extract off, from a leak it would otherwise clear', () => {
    const on = run(OZONE, newGasState(), { leak: 0.05, fan: true }, 3600);
    const off = run(OZONE, newGasState(), { leak: 0.05, fan: false }, 3600);
    expect(off.reading).toBeGreaterThan(on.reading * 3);
  });

  it('floods the store over range on a mis-delivery, and clears in under an hour of purging', () => {
    let s = misdeliver(newGasState());
    expect(s.pending).toBeCloseTo(MISDELIVERY_GRAMS, 6);
    s = run(CHLORINE, s, quiet, 120);
    expect(gasDisplay(CHLORINE, s)).toBe(' O-R');
    expect(gasAlarms(s).sounder).toBe(true);
    // Nor can it be reset while the gas is there.
    expect(reset(CHLORINE, s)).toBe(s);
    s = run(CHLORINE, s, quiet, 3600);
    expect(s.reading).toBeLessThan(CHLORINE.a1);
    expect(reset(CHLORINE, s).a2).toBe(false);
  });

  it('silences on ACCEPT, keeps flashing, and sounds again if it rises to A2', () => {
    let s = run(CHLORINE, newGasState(), { leak: 1.2, fan: true }, 1500);
    expect(s.a1).toBe(true);
    expect(s.a2).toBe(false);
    s = accept(s);
    expect(gasAlarms(s)).toEqual({ beacon: true, sounder: false });
    s = run(CHLORINE, s, { leak: 5, fan: true }, 1500);
    expect(s.a2).toBe(true);
    expect(gasAlarms(s).sounder).toBe(true);
  });
});
