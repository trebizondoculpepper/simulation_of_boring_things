import { describe, expect, it } from 'vite-plus/test';
import {
  KNOB_NAMES,
  POOL_LOOKS,
  POOL_LOOK_ORDER,
  knobFactor,
} from './pool-looks';

describe('the poolrooms looks', () => {
  it('offers every look on the selector, at most four positions', () => {
    expect([...POOL_LOOK_ORDER].sort()).toEqual(Object.keys(POOL_LOOKS).sort());
    expect(POOL_LOOK_ORDER.length).toBeLessThanOrEqual(4);
  });

  it('leaves each look as given with its knobs at the middle', () => {
    for (const name of KNOB_NAMES) expect(knobFactor(name, 0.5)).toBe(1);
  });

  it('turns exposure two stops either way and the rest from nothing to double', () => {
    expect(knobFactor('exposure', 0)).toBeCloseTo(0.25);
    expect(knobFactor('exposure', 1)).toBeCloseTo(4);
    expect(knobFactor('light', 0)).toBe(0);
    expect(knobFactor('light', 1)).toBe(2);
    expect(knobFactor('bloom', 2)).toBe(2);
  });

  it('lights every look from somewhere', () => {
    for (const look of Object.values(POOL_LOOKS))
      expect(
        look.roofArea +
          look.glazingArea +
          (look.sun?.intensity ?? 0) +
          (look.lamps?.intensity ?? 0),
      ).toBeGreaterThan(0);
  });
});
