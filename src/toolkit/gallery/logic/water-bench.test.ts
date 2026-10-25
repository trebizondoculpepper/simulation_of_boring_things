import { describe, expect, it } from 'vite-plus/test';
import { actOnBench, benchOut, newBench, stepBench } from './water-bench';
import type { Bench, BenchMachine } from './water-bench';

/** The water bench (dev41): each machine does what it should to the water (prompt 070). */
const running = (m: BenchMachine, ups = 0) => {
  let b: Bench = actOnBench(newBench(), { line: m, act: 'run' });
  for (let i = 0; i < ups; i++) b = actOnBench(b, { line: m, act: 'up' });
  for (let t = 0; t < 30; t++) b = stepBench(b, 1);
  return benchOut(b, m);
};

describe('the water bench', () => {
  it('gives dirty water through an ideal filter back cleaner', () => {
    const { in: w, out, flow } = running('filter');
    expect(flow).toBeGreaterThan(5);
    expect(out.solids).toBeLessThan(w.solids * 0.05);
  });

  it('gives clean water through an ideal boiler back hotter, by its power over its flow', () => {
    const { in: w, out } = running('boiler', 2); // 100 kW into 20 m³/h: 4.3 K.
    expect(out.temperature - w.temperature).toBeCloseTo(100 / (1.163 * 20), 2);
    expect(running('boiler', 4).out.temperature).toBeLessThanOrEqual(82);
  });

  it('gives clean water through an ideal dosing station back more chlorinated', () => {
    const { in: w, out } = running('dosing', 3); // 2 mg/l.
    expect(out.freeChlorine).toBeCloseTo(w.freeChlorine + 2);
  });

  it('gives pool water through a UV unit back with fewer chloramines', () => {
    const { in: w, out } = running('uv', 3);
    expect(out.combinedChlorine).toBeLessThan(w.combinedChlorine * 0.5);
  });

  it('changes nothing with its pump stopped or its machine turned down to nothing', () => {
    const b = newBench();
    for (const m of ['boiler', 'dosing', 'uv'] as const)
      expect(benchOut(b, m).out).toEqual(benchOut(b, m).in);
    expect(running('boiler', 0).out.temperature).toBe(
      running('boiler', 0).in.temperature,
    );
  });
});
