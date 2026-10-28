import { describe, expect, it } from 'vite-plus/test';
import { NOMINAL_CAL, measure } from './dosing-controller';
import {
  CELL,
  DRIFTED_PROBES,
  cellFlow,
  cellSignals,
  flowOk,
  newSampleCell,
  stepSampleCell,
  testSample,
} from './sample-cell';

const water = { free: 1.3, total: 1.6, ph: 7.3, temperature: 29 };

describe('the sample cell', () => {
  it('passes its flow through its valve and regulator, its switch making at 20 l/h', () => {
    const c = newSampleCell(water);
    expect(cellFlow(c)).toBeCloseTo(0.65 * CELL.maxFlow, 9);
    expect(flowOk(c)).toBe(true);
    expect(flowOk({ ...c, regulator: 0.3 })).toBe(false);
    expect(cellFlow({ ...c, valveOpen: false })).toBe(0);
  });

  it('reads its water ideally with ideal probes, and low with drifted ones', () => {
    const c = newSampleCell(water);
    const m = measure(cellSignals(c), NOMINAL_CAL);
    expect(m.free).toBeCloseTo(1.3, 9);
    expect(m.combined).toBeCloseTo(0.3, 9);
    expect(m.ph).toBeCloseTo(7.3, 9);
    const d = measure(
      cellSignals({ ...c, probes: DRIFTED_PROBES }),
      NOMINAL_CAL,
    );
    expect(d.free).toBeLessThan(1.0);
    expect(d.ph).toBeLessThan(7.05);
  });

  it('follows its sample while it flows, and loses its free chlorine standing', () => {
    let c = newSampleCell(water);
    for (let t = 0; t < 600; t += 10)
      c = stepSampleCell(c, { ...water, free: 0.8 }, 10);
    expect(c.water.free).toBeCloseTo(0.8, 2);
    let shut = { ...c, valveOpen: false };
    for (let t = 0; t < 1800; t += 10) shut = stepSampleCell(shut, water, 10);
    expect(shut.water.free).toBeLessThan(0.01);
    expect(Math.abs(cellSignals(shut).freeUa)).toBeLessThan(5);
    expect(testSample(shut).dpd1).toBe(0);
  });
});
