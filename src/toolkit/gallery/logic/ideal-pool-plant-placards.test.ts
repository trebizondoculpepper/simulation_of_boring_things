import { describe, expect, it } from 'vite-plus/test';
import {
  RESET_SIGN,
  activityCard,
  entrancePanel,
  placards,
  plantFacts,
} from './ideal-pool-plant-placards';
import { TAGS } from '../../../game/plant/ideal-pool-plant';

describe('the exhibit’s words', () => {
  const all = placards();

  it('numbers the stations along the water’s path, 1 to 7', () => {
    expect(all.filter((p) => p.station).map((p) => p.station)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('names each machine by its tag from the model, and says nothing undefined', () => {
    const pump = all.find((p) => p.of === 'pump')!;
    expect(pump.title).toContain(TAGS.pump);
    expect(pump.joins).toBe(
      'From the ideal balance tank, to the filter feed tee',
    );
    for (const p of all)
      for (const text of Object.values(p))
        expect(String(text)).not.toMatch(/undefined|NaN/);
  });

  it('states its facts from the plant’s own figures', () => {
    const k = plantFacts();
    const pump = all.find((p) => p.of === 'pump')!;
    expect(pump.fact).toContain(k.flow.toFixed(0));
    expect(k.turnover).toBeGreaterThan(2);
    expect(k.turnover).toBeLessThan(3);
  });

  it('mentions the RESET button on the entrance panel and the activity card', () => {
    expect(entrancePanel().reset).toMatch(/RESET/);
    expect(activityCard().reset).toMatch(/RESET/);
    expect(RESET_SIGN.headline).toMatch(/can’t break anything/);
    expect(entrancePanel().route).toHaveLength(7);
  });

  it('says what the heat would do, in kettles, from the meter’s total', async () => {
    const { heatSignLines, KETTLE_KWH } =
      await import('./ideal-pool-plant-placards');
    expect(KETTLE_KWH).toBeCloseTo(0.168, 3);
    const [a, b] = heatSignLines(100.5 * KETTLE_KWH, 181);
    expect(a).toContain('16.9 kWh');
    expect(a).toContain('181 kW');
    expect(b).toContain('100 kettles');
    expect(a.length).toBeLessThanOrEqual(20);
    expect(b.length).toBeLessThanOrEqual(20);
  });

  it('points the backwash station at the activity card’s backwash steps, and warns why the pump is stopped', () => {
    const backwash = placards().find((p) => p.station === 7)!;
    const steps = activityCard().steps;
    const first = steps.findIndex((x) => x.startsWith('Backwash, step 1')) + 1;
    expect(backwash.tryIt).toContain(`${first} to ${first + 2}`);
    expect(activityCard().warning).toMatch(/water hammer/);
  });
});
