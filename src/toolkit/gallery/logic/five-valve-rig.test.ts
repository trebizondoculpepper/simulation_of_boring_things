import { describe, expect, it } from 'vite-plus/test';
import { TRAVEL } from '../../../game/plant/five-valve-filter';
import { GULLY } from './jacuzzi-drain';
import { createFiveValveModel, fiveValveRuns, nozzles } from './five-valve-rig';

const run = (m: ReturnType<typeof createFiveValveModel>, seconds: number) => {
  for (let t = 0; t < seconds; t++) m.step(1);
};

describe('the five-valve rig', () => {
  it('pipes from the filter’s own nozzles: the top to its tee, the underdrain to its manifold', () => {
    const { runs } = fiveValveRuns();
    const { top, bottom } = nozzles();
    expect(runs.topNozzle[0]).toEqual(top);
    expect(runs.bottomNozzle[0]).toEqual(bottom);
    expect(top[1]).toBeGreaterThan(bottom[1]);
  });

  it('lets the waste fall all the way to the gully', () => {
    const { waste } = fiveValveRuns().runs;
    for (let k = 1; k < waste.length; k++)
      expect(waste[k][1]).toBeLessThanOrEqual(waste[k - 1][1]);
    expect(waste.at(-1)![1]).toBe(GULLY.airGap);
  });

  it('puts each valve nearer the filter than its flowmeter, on its own branch', () => {
    const { spots, runs } = fiveValveRuns();
    for (const v of ['v1', 'v2', 'v3', 'v4', 'v5'] as const) {
      const start = runs[v][0];
      const d = (p: readonly number[]) =>
        Math.hypot(...p.map((x, k) => x - start[k]));
      expect(d(spots[v].valve.at)).toBeLessThan(d(spots[v].meter.at));
    }
  });

  it('runs a whole backwash from the panel: service, backwash, rinse, service', () => {
    const m = createFiveValveModel();
    run(m, 5);
    expect(m.readings().backwashDue).toBe(true);
    m.setMode('backwash');
    run(m, 1);
    expect(m.readings().moving).toBe(true);
    expect(m.readings().supply).toBe(0);
    run(m, TRAVEL + 300);
    expect(m.readings().bed).toBeLessThan(0);
    m.setMode('rinse');
    run(m, TRAVEL + 30);
    expect(m.readings().valve.v5).toBeGreaterThan(0);
    m.setMode('service');
    run(m, TRAVEL + 5);
    expect(m.readings().valve.v2).toBeGreaterThan(0);
    expect(m.readings().backwashDue).toBe(false);
  });
});
