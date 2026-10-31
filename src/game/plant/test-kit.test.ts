import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../world';
import { readings, waterFrom } from '../water/pool-chemistry';
import {
  KIT,
  formatTestKit,
  kitText,
  readKit,
  readWith,
  testKit,
  testKitSummary,
} from './test-kit';
import type { KitTest } from './test-kit';
import { farSide } from './water-treatment';

const T = 30;
const water = waterFrom({
  ph: 7.3,
  alkalinity: 120,
  hardness: 250,
  tds: 1000,
  temperature: T,
  freeChlorine: 1.3,
  sulphate: 100,
});

describe('a test kit’s methods', () => {
  it('round to their resolutions', () => {
    expect(readWith(KIT.freeChlorine, 1.34, 0)).toEqual({ value: 1.3 });
    expect(readWith(KIT.ph, 7.36, 0)).toEqual({ value: 7.4 });
    expect(readWith(KIT.alkalinity, 54, 0)).toEqual({ value: 50 });
    expect(readWith(KIT.hardness, 213.7, 0)).toEqual({ value: 225 });
    expect(readWith(KIT.tds, 769, 0)).toEqual({ value: 750 });
    expect(readWith(KIT.temperature, 29.96, 0)).toEqual({ value: 30 });
  });
  it('say below or above the ends of their ranges', () => {
    expect(kitText('ph', readWith(KIT.ph, 6.5, 0))).toBe('below 6.8');
    expect(kitText('ph', readWith(KIT.ph, 8.6, 0))).toBe('above 8.2');
    expect(kitText('ph', readWith(KIT.ph, 8.2, 0))).toBe('8.2');
    expect(kitText('freeChlorine', readWith(KIT.freeChlorine, 9, 0))).toBe(
      'above 5.0 mg/l',
    );
    expect(kitText('cyanuric', readWith(KIT.cyanuric, 0, 0))).toBe(
      'below 15 mg/l',
    );
    expect(kitText('temperature', { value: 30 })).toBe('30.0 °C');
  });
  it('err within their tolerances, so every reading is honest', () => {
    const r = readings(water, T);
    const truth: Record<KitTest, number> = {
      freeChlorine: water.freeChlorine,
      totalChlorine: r.totalChlorine,
      ph: water.ph,
      alkalinity: water.alkalinity,
      hardness: water.hardness,
      cyanuric: 50,
      temperature: T,
      tds: water.tds,
    };
    const w = { ...water, cyanuric: 50 };
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const k = readKit(w, T, `seed ${i}`);
      seen.add(k.readings.ph.value);
      for (const test of Object.keys(truth) as KitTest[]) {
        const m = KIT[test];
        expect(
          Math.abs(k.readings[test].value - truth[test]),
        ).toBeLessThanOrEqual(m.tolerance + m.step / 2 + 1e-9);
      }
      expect(k.readings.totalChlorine.value).toBeGreaterThanOrEqual(
        k.readings.freeChlorine.value,
      );
      expect(k.combined).toBeCloseTo(
        k.readings.totalChlorine.value - k.readings.freeChlorine.value,
        6,
      );
    }
    // Not perfect: the seeds do not all read alike.
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('a test kit taken from a pool', () => {
  it('reads the same at the same minute, and may read differently at another', () => {
    const w = newWorld();
    const c = w.treatment.circuits.pool_01;
    const a = testKit('pool_01', c, 30, 3600);
    expect(testKit('pool_01', c, 30, 3630)).toEqual({ ...a, time: 3630 });
    const others = Array.from({ length: 30 }, (_, i) =>
      JSON.stringify(testKit('pool_01', c, 30, 3600 + 60 * (i + 1)).readings),
    );
    expect(new Set(others).size).toBeGreaterThan(1);
  });

  it('reads the pool’s far side, not the tank', () => {
    const w = newWorld();
    const dosed = applyAction(w, {
      type: 'hand/dose',
      pool: 'pool_01',
      chemical: 'bicarbonate',
      amount: 18,
    });
    // The tank's alkalinity is up by some 1,400 mg/l; the far side's not yet.
    const t = testKit(
      'pool_01',
      dosed.treatment.circuits.pool_01,
      dosed.pools.pool_01.temperature,
      dosed.time,
    );
    expect(t).toEqual(
      testKit(
        'pool_01',
        w.treatment.circuits.pool_01,
        w.pools.pool_01.temperature,
        w.time,
      ),
    );
    const far = farSide(w.treatment.circuits.pool_01);
    expect(
      Math.abs(t.readings.alkalinity.value - far.alkalinity),
    ).toBeLessThanOrEqual(15);
  });

  it('prints a neat block, and a line for the log', () => {
    const w = newWorld();
    const t = testKit(
      'pool_01',
      w.treatment.circuits.pool_01,
      w.pools.pool_01.temperature,
      14 * 3600 + 32 * 60,
    );
    const lines = formatTestKit(t);
    expect(lines[0]).toBe('Test kit · Lounge pool (pool_01) · 14:32');
    expect(lines.slice(1).map((l) => l.slice(0, 30))).toEqual([
      '  Free chlorine (DPD 1)       ',
      '  Total chlorine (DPD 3)      ',
      '  pH (phenol red)             ',
      '  Alkalinity (titration)      ',
      '  Calcium hardness            ',
      '  Cyanuric acid (turbidity)   ',
      '  Temperature                 ',
      '  TDS (meter)                 ',
    ]);
    expect(lines[2]).toMatch(/mg\/l +combined \d\.\d$/);
    expect(testKitSummary(t)).toMatch(/^test kit taken: free chlorine \d\.\d/);
  });
});
