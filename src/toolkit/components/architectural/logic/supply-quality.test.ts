import { describe, expect, it } from 'vite-plus/test';
import { supplyVoltage } from './supply-quality';
import type { SupplyCondition } from './supply-quality';

/** The supply's voltage every 10 ms for `seconds`. */
const sample = (condition: SupplyCondition, seconds = 120) =>
  Array.from({ length: seconds * 100 }, (_, i) =>
    supplyVoltage(condition, i / 100),
  );
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

describe('the quality of the supply', () => {
  it('holds steady at its nominal voltage normally', () => {
    for (const v of sample('normal'))
      expect(Math.abs(v - 1)).toBeLessThan(0.01);
  });

  it('sags to about 80 % in a brownout, wandering, with motor-start dips', () => {
    const v = sample('brownout');
    expect(mean(v)).toBeGreaterThan(0.76);
    expect(mean(v)).toBeLessThan(0.84);
    expect(Math.max(...v)).toBeLessThan(0.9);
    // The dips go deep enough to make some fittings drop out...
    expect(Math.min(...v)).toBeLessThan(0.66);
    // ...but they are brief: it is mostly above 70 %.
    expect(v.filter((x) => x < 0.7).length / v.length).toBeLessThan(0.05);
  });

  it('swings wildly in a severe disturbance, with drop-outs', () => {
    const v = sample('severe');
    expect(Math.min(...v)).toBeLessThan(0.35);
    expect(Math.max(...v)).toBeGreaterThan(0.9);
    expect(v.every((x) => x > 0)).toBe(true);
  });

  it('is the same every time, whatever the frame rate', () => {
    expect(supplyVoltage('brownout', 17.3)).toBe(
      supplyVoltage('brownout', 17.3),
    );
    expect(supplyVoltage('severe', 3.21)).toBe(supplyVoltage('severe', 3.21));
  });
});
