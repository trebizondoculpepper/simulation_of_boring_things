import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { POOL_TARGET } from './pools';
import { installedValveByCommandId } from './installed-valves';
import {
  newOlympicBattery,
  olympicBatteryFlows,
  olympicFlowsOf,
  olympicMeterReadings,
  stepOlympicBattery,
} from './olympic-battery';

/** The world's valves with some set by tag. */
const valves = (set: Record<string, boolean>) => {
  const v = { ...newWorld().installedValves };
  for (const [tag, open] of Object.entries(set))
    v[installedValveByCommandId(tag)!.assetId] = open;
  return v;
};

/** A world with some valves set by tag, as a panel sets them. */
const withValves = (world: World, set: Record<string, boolean>) =>
  Object.entries(set).reduce(
    (w, [tag, open]) =>
      applyAction(w, {
        type: 'plant/valve',
        id: installedValveByCommandId(tag)!.assetId,
        open,
      }),
    world,
  );

/** Filter 2 backwashing: its inlet and outlet shut, its backwash in and out open. */
const BACKWASH_2 = {
  'PL2-F2-V1': false,
  'PL2-F2-V2': false,
  'PL2-F2-V3': true,
  'PL2-F2-V4': true,
};

describe('the Olympic battery, from its valves in the world', () => {
  it('gives the pool its design circulation through all five in service, mid-season', () => {
    const b = olympicBatteryFlows(newWorld().installedValves);
    expect(b.pumping).toBe(true);
    expect(b.returning).toBe(true);
    expect(b.toPool).toBeGreaterThan(POOL_TARGET.pool_02.flow * 0.95);
    expect(b.toPool).toBeLessThan(POOL_TARGET.pool_02.flow * 1.05);
    expect(b.toWaste).toBe(0);
    for (const f of b.filters) expect(f.riser).toBeGreaterThan(100);
    expect(b.discharge).toBeCloseTo(b.toPool, 0);
  });

  it('backwashes a filter whose V3 and V4 are open and V1 and V2 shut: down its riser, out to waste', () => {
    const b = olympicBatteryFlows(valves(BACKWASH_2));
    const f2 = b.filters[1];
    expect(f2.riser).toBeLessThan(-100);
    expect(f2.bed).toBeLessThan(0);
    expect(b.toWaste).toBeCloseTo(f2.valve.v4, 0);
    expect(b.filters[0].riser).toBeGreaterThan(100);
  });

  it('sends nothing to the pool with the contact tank’s valve shut, but can still backwash', () => {
    const b = olympicBatteryFlows(
      valves({ 'PL2-T2-IV1': false, ...BACKWASH_2 }),
    );
    expect(b.returning).toBe(false);
    expect(b.toPool).toBe(0);
    expect(b.toWaste).toBeGreaterThan(100);
  });

  it('reads nothing anywhere with both pumps’ valves shut, or the pumps stopped', () => {
    for (const r of [
      olympicMeterReadings(
        olympicBatteryFlows(
          valves({ 'PL2-P1-IV3': false, 'PL2-P1-IV4': false }),
        ),
      ),
      olympicMeterReadings(
        olympicBatteryFlows(
          newWorld().installedValves,
          newOlympicBattery(),
          false,
        ),
      ),
    ]) {
      expect(Object.values(r).every((v) => v === 0)).toBe(true);
      expect(Object.keys(r).sort()).toEqual([
        'filter-1',
        'filter-2',
        'filter-3',
        'filter-4',
        'filter-5',
        'pumps',
      ]);
    }
  });

  it('fouls a bed in service, slowly, and washes it out in a backwash', () => {
    const start = newOlympicBattery();
    const service = olympicBatteryFlows(newWorld().installedValves, start);
    const day = stepOlympicBattery(start, service, 24 * 3600);
    expect(day.dirt[0]).toBeGreaterThan(start.dirt[0] + 2);
    expect(day.dirt[0]).toBeLessThan(start.dirt[0] + 5);
    const washing = olympicBatteryFlows(valves(BACKWASH_2), start);
    const washed = stepOlympicBattery(start, washing, 5 * 60);
    expect(washed.dirt[1]).toBeLessThan(start.dirt[1] * 0.1);
    expect(washed.dirt[0]).toBeGreaterThan(start.dirt[0]);
  });
});

describe('the Olympic pool, circulated by its battery', () => {
  it('keeps its design circulation as built', () => {
    const w = advance(newWorld(), 120, 1);
    expect(w.pools.pool_02.flow).toBeGreaterThan(
      POOL_TARGET.pool_02.flow * 0.95,
    );
  });

  it('stops circulating when every filter’s outlet is shut, though its pumps run, until they trip', () => {
    const shut = Object.fromEntries(
      [1, 2, 3, 4, 5].map((n) => [`PL2-F${n}-V2`, false]),
    );
    // Its flow falling away within the minute.
    const w = advance(withValves(newWorld(), shut), 55, 1);
    expect(w.pools.pool_02.flow).toBeLessThan(10);
    expect(olympicFlowsOf(w).pumping).toBe(true);
    // Run on against shut valves, the duty pump's thermistors trip it, the
    // standby takes over, and trips in its turn (`motor-starters.ts`).
    const later = advance(w, 120, 1);
    expect(later.motors.starters['P-101A'].tripped).toBe(true);
    expect(later.motors.starters['P-101B'].tripped).toBe(true);
    expect(olympicFlowsOf(later).pumping).toBe(false);
  });

  it('washes filter 2 in a backwash, drawing its waste from the balance tank', () => {
    const start = withValves(newWorld(), BACKWASH_2);
    const w = advance(start, 5 * 60, 1);
    expect(w.olympic.dirt[1]).toBeLessThan(start.olympic.dirt[1] * 0.1);
    const flows = olympicFlowsOf(start);
    // What went to waste, near enough what the battery sent there.
    const out = (flows.toWaste * 5 * 60) / 3600;
    expect(
      start.pools.pool_02.balance - w.pools.pool_02.balance,
    ).toBeGreaterThan(0);
    expect(out).toBeGreaterThan(10);
  });
});
