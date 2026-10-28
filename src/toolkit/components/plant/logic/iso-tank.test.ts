import { describe, expect, it } from 'vite-plus/test';
import {
  ISO_TANK,
  cylinderDepth,
  dischargeOf,
  isoTankStatus,
  newIsoTank,
  outletPressure,
  stepIsoTank,
} from './iso-tank';
import type { IsoTank } from './iso-tank';

describe('a road tank container’s bottom discharge', () => {
  it('arrives full, valves shut and capped, and holds', () => {
    let t = newIsoTank('hypochlorite');
    expect(t.litres).toBeCloseTo(ISO_TANK.capacity * 0.95);
    t = stepIsoTank(t, 60);
    expect(t.litres).toBeCloseTo(ISO_TANK.capacity * 0.95);
    expect(isoTankStatus(t)).toContain('valves shut');
  });

  it('lets nothing out with either valve shut, or capped', () => {
    const t = newIsoTank('acid', 1000);
    for (const [foot, outlet, coupling] of [
      [true, false, 'open'],
      [false, true, 'open'],
      [true, true, 'capped'],
    ] as const)
      expect(dischargeOf({ ...t, foot, outlet, coupling }).rate).toBe(0);
  });

  it('spills on the ground with both open and nothing connected, and records it', () => {
    let t: IsoTank = {
      ...newIsoTank('hypochlorite', 100),
      foot: true,
      outlet: true,
      coupling: 'open',
    };
    t = stepIsoTank(t, 10);
    expect(t.spilled).toBeCloseTo(ISO_TANK.spill * 10);
    expect(t.litres).toBeCloseTo(100 - ISO_TANK.spill * 10);
    expect(isoTankStatus(t)).toContain('SPILLING');
    // Never below empty.
    t = stepIsoTank(t, 1000);
    expect(t.litres).toBe(0);
    expect(t.spilled).toBeCloseTo(100);
  });

  it('delivers through a connected hose', () => {
    let t: IsoTank = {
      ...newIsoTank('acid', 500),
      foot: true,
      outlet: true,
      coupling: 'connected' as const,
    };
    t = stepIsoTank(t, 20);
    expect(t.delivered).toBeCloseTo(ISO_TANK.delivery * 20);
    expect(t.spilled).toBe(0);
  });

  it('finds the depth in its horizontal barrel', () => {
    expect(cylinderDepth(0, 100, 2)).toBeCloseTo(0, 3);
    expect(cylinderDepth(50, 100, 2)).toBeCloseTo(1, 3);
    expect(cylinderDepth(100, 100, 2)).toBeCloseTo(2, 3);
    // A quarter full is more than a quarter of the way up: the barrel is
    // narrow at the bottom.
    expect(cylinderDepth(25, 100, 2)).toBeGreaterThan(0.5);
  });

  it('reads the head over its outlet on its gauge', () => {
    const full = outletPressure(newIsoTank('hypochlorite'));
    // About 2.1 m of a 1.2 density liquid: a quarter of a bar.
    expect(full).toBeGreaterThan(0.22);
    expect(full).toBeLessThan(0.28);
    expect(outletPressure(newIsoTank('hypochlorite', 0))).toBeCloseTo(0, 3);
  });
});
