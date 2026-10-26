import { describe, expect, it } from 'vite-plus/test';
import {
  SEWER_CHART,
  SEWER_LOG,
  chartWindow,
  newSewerMonitor,
  overConsent,
  stepSewerMonitor,
} from './sewer-monitor';

describe('the sewer outfall monitor', () => {
  it('reads the flow now and totals it', () => {
    let s = newSewerMonitor();
    for (let t = 0; t < 3600; t++) s = stepSewerMonitor(s, 10 / 3600, 1);
    expect(s.flow).toBeCloseTo(10, 6);
    expect(s.total).toBeCloseTo(10, 6);
  });

  it('records a sample of the mean flow every five minutes, whatever its steps', () => {
    let s = newSewerMonitor();
    // Ten minutes at 6 m³/h in 30 s steps, then ten at nothing in 7 s steps.
    for (let t = 0; t < 600; t += 30)
      s = stepSewerMonitor(s, (6 * 30) / 3600, 30);
    for (let t = 0; t < 600; t += 7) s = stepSewerMonitor(s, 0, 7);
    expect(s.log.length).toBe(4);
    expect(s.log[0]).toBeCloseTo(6, 6);
    expect(s.log[1]).toBeCloseTo(6, 6);
    expect(s.log[3]).toBeCloseTo(0, 6);
  });

  it('keeps a week of record, the oldest dropped', () => {
    let s = newSewerMonitor();
    for (let n = 0; n < SEWER_LOG.length + 10; n++)
      s = stepSewerMonitor(s, n, SEWER_LOG.step);
    expect(s.log.length).toBe(SEWER_LOG.length);
    expect(s.log[0]).toBeCloseTo((10 / SEWER_LOG.step) * 3600, 6);
  });

  it('shows a day of its record on its chart, each sample across its scale', () => {
    const log = Array.from({ length: 400 }, (_, i) => (i < 200 ? 45 : 15));
    const w = chartWindow(log);
    expect(w.length).toBe((SEWER_CHART.hours * 3600) / SEWER_LOG.step);
    expect(w.at(-1)).toBeCloseTo(15 / SEWER_CHART.scaleMax, 6);
    expect(Math.max(...w)).toBe(1);
  });

  it('says when it is over the consent', () => {
    const s = stepSewerMonitor(newSewerMonitor(), 15 / 3600, 1);
    expect(overConsent(s, 10)).toBe(true);
    expect(overConsent(s, 20)).toBe(false);
  });
});
