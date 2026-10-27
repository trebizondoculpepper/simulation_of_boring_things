import { describe, expect, it } from 'vite-plus/test';
import {
  actOnLeakMonitor,
  leakMonitorShows,
  newLeakMonitor,
  newLowPoint,
  probeWet,
  stepLeakMonitor,
  stepLowPoint,
} from './leak-monitor';

describe('leak detection: a low point, its probe and the monitor', () => {
  it('wets the probe as a seep collects, and dries when drained', () => {
    let p = newLowPoint();
    for (let t = 0; t < 60; t++) p = stepLowPoint(p, 0.0002, 1);
    expect(probeWet(p)).toBe(true);
    p = { ...p, drainOpen: true };
    for (let t = 0; t < 10; t++) p = stepLowPoint(p, 0, 1);
    expect(probeWet(p)).toBe(false);
    expect(p.litres).toBe(0);
  });

  it('latches a leak, sounds until silenced, and resets only once dry', () => {
    let m = newLeakMonitor();
    m = stepLeakMonitor(m, [true], [], 0.1);
    expect(m.zones[0].latched).toBe(true);
    expect(leakMonitorShows(m).sounder).toBe(true);
    m = actOnLeakMonitor(m, 'silence', [true]);
    expect(leakMonitorShows(m).sounder).toBe(false);
    expect(leakMonitorShows(m).leak[0]).toBe(true);
    m = actOnLeakMonitor(m, 'reset', [true]);
    expect(m.zones[0].latched).toBe(true);
    m = stepLeakMonitor(m, [false], [], 0.1);
    expect(m.zones[0].latched).toBe(true);
    m = actOnLeakMonitor(m, 'reset', [false]);
    expect(m.zones[0].latched).toBe(false);
    expect(leakMonitorShows(m).sounder).toBe(false);
  });

  it('shows a broken lead as a fault, not a leak; TEST lights everything', () => {
    let m = stepLeakMonitor(newLeakMonitor(), [true], [true], 0.1);
    expect(m.zones[0].latched).toBe(false);
    expect(leakMonitorShows(m).fault).toBe(true);
    m = actOnLeakMonitor(newLeakMonitor(), 'test', []);
    const s = leakMonitorShows(m);
    expect(s.leak.every(Boolean)).toBe(true);
    expect(s.sounder).toBe(true);
    m = stepLeakMonitor(m, [], [], 3);
    expect(leakMonitorShows(m).sounder).toBe(false);
  });
});
