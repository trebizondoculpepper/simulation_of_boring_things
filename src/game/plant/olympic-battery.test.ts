import { describe, expect, it } from 'vite-plus/test';
import { newWorld } from '../world';
import { installedValveByCommandId } from './installed-valves';
import { olympicBatteryFlows, olympicMeterReadings } from './olympic-battery';

/** The world's valves with some set by tag. */
const valves = (set: Record<string, boolean>) => {
  const v = { ...newWorld().installedValves };
  for (const [tag, open] of Object.entries(set))
    v[installedValveByCommandId(tag)!.assetId] = open;
  return v;
};

describe('the Olympic battery, from its valves in the world', () => {
  it('filters through all five in service as built', () => {
    const b = olympicBatteryFlows(newWorld().installedValves);
    expect(b.pumping).toBe(true);
    for (const f of b.filters) {
      expect(f.riser).toBeGreaterThan(100);
      expect(f.valve.v4 + f.valve.v5).toBe(0);
    }
    expect(b.discharge).toBeCloseTo(
      b.filters.reduce((s, f) => s + f.riser, 0),
      0,
    );
  });

  it('backwashes a filter whose V3 and V4 are open and V1 and V2 shut: down its riser, out to waste', () => {
    const b = olympicBatteryFlows(
      valves({
        'PL2-F2-V1': false,
        'PL2-F2-V2': false,
        'PL2-F2-V3': true,
        'PL2-F2-V4': true,
      }),
    );
    const f2 = b.filters[1];
    expect(f2.riser).toBeLessThan(-100);
    expect(f2.valve.v4).toBeCloseTo(-f2.riser, 0);
    expect(b.filters[0].riser).toBeGreaterThan(100);
  });

  it('reads nothing anywhere with both pumps’ valves shut', () => {
    const r = olympicMeterReadings(
      valves({ 'PL2-P1-IV3': false, 'PL2-P1-IV4': false }),
    );
    expect(Object.values(r).every((v) => v === 0)).toBe(true);
    expect(Object.keys(r).sort()).toEqual([
      'filter-1',
      'filter-2',
      'filter-3',
      'filter-4',
      'filter-5',
      'pumps',
    ]);
  });
});
