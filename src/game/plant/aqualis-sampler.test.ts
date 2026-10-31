import { describe, expect, it } from 'vite-plus/test';
import { readings, waterFrom } from '../water/pool-chemistry';
import type { PoolChemistry } from '../water/pool-chemistry';
import {
  SAMPLER,
  newSampler,
  samplerReadings,
  stepSampler,
} from './aqualis-sampler';
import type { SamplerState } from './aqualis-sampler';
import type { SampleInput } from './aqualis-types';

const T = 28;
const POOL: PoolChemistry = {
  ...waterFrom({
    ph: 7.3,
    alkalinity: 120,
    hardness: 250,
    tds: 900,
    temperature: T,
    freeChlorine: 1.3,
    sulphate: 80,
  }),
  chloramine: 0.2,
  organicChloramine: 0.1,
};
const input = (water: PoolChemistry, flowLh = 30): SampleInput => ({
  water,
  temperature: T,
  flowLh,
});

/** Steps the sampler `seconds` on in `dt` steps. */
function run(s: SamplerState, i: SampleInput, seconds: number, dt = 10) {
  let out = stepSampler(s, i, 0);
  for (let t = 0; t < seconds; t += dt) out = stepSampler(out.state, i, dt);
  return out;
}

describe('the Aqualis sampler', () => {
  it('reads the water at its tapping at steady state', () => {
    const i = input(POOL);
    const { readings: r, status } = run(newSampler(i), i, 600);
    const want = readings(POOL, T);
    expect(r.freeChlorine).toBeCloseTo(1.3, 6);
    expect(r.combinedChlorine).toBeCloseTo(0.3, 6);
    expect(r.totalChlorine).toBeCloseTo(1.6, 6);
    expect(r.ph).toBeCloseTo(7.3, 6);
    expect(r.alkalinity).toBeCloseTo(120, 6);
    expect(r.calciumHardness).toBeCloseTo(250, 6);
    expect(r.lsi).toBeCloseTo(want.langelier, 6);
    expect(r.tds).toBeCloseTo(900, 6);
    expect(r.sulphate).toBeCloseTo(80, 6);
    expect(r.temperature).toBe(T);
    expect(status).toEqual({ flowing: true, flowLh: 30, lostFor: 0 });
  });

  it('lags about a minute behind the sample', () => {
    const s = newSampler(input(POOL));
    const changed = input({ ...POOL, freeChlorine: 2.3, alkalinity: 220 });
    // One time constant: 63 % of the way.
    const one = run(s, changed, SAMPLER.lag);
    expect(one.readings.freeChlorine).toBeCloseTo(1.3 + 0.632, 2);
    expect(one.readings.alkalinity).toBeCloseTo(120 + 63.2, 0);
    // Five: all but settled.
    const five = run(s, changed, 5 * SAMPLER.lag);
    expect(five.readings.freeChlorine).toBeCloseTo(2.3, 1);
    expect(five.readings.freeChlorine).toBeLessThan(2.3);
    // The step size does not matter.
    const fine = run(s, changed, SAMPLER.lag, 1);
    expect(fine.readings.freeChlorine).toBeCloseTo(
      one.readings.freeChlorine,
      6,
    );
  });

  it('freezes its readings, but for a slowly falling chlorine, while flow is lost', () => {
    const settled = run(newSampler(input(POOL)), input(POOL), 600).state;
    const before = samplerReadings(settled);
    const lost = input(
      { ...POOL, freeChlorine: 0.2, ph: 7.8, alkalinity: 60 },
      SAMPLER.switchAt - 1,
    );
    const ten = run(settled, lost, 600);
    expect(ten.status).toEqual({
      flowing: false,
      flowLh: SAMPLER.switchAt - 1,
      lostFor: 600,
    });
    expect(ten.readings.ph).toBe(before.ph);
    expect(ten.readings.alkalinity).toBe(before.alkalinity);
    expect(ten.readings.combinedChlorine).toBe(before.combinedChlorine);
    expect(ten.readings.temperature).toBe(before.temperature);
    // Chlorine decays over hours, not towards the sample's 0.2.
    expect(ten.readings.freeChlorine).toBeLessThan(before.freeChlorine);
    expect(ten.readings.freeChlorine).toBeGreaterThan(1.2);
    const hours = run(ten.state, lost, 3 * 3600, 60);
    expect(hours.readings.freeChlorine).toBeCloseTo(
      before.freeChlorine * Math.exp(-(600 + 3 * 3600) / SAMPLER.stagnant),
      6,
    );
    expect(hours.status.lostFor).toBe(600 + 3 * 3600);
  });

  it('recovers when the flow returns', () => {
    const settled = run(newSampler(input(POOL)), input(POOL), 600).state;
    const lost = run(settled, input(POOL, 0), 3600).state;
    expect(lost.lostFor).toBe(3600);
    const back = input({ ...POOL, ph: 7.6 });
    const first = stepSampler(lost, back, 10);
    expect(first.status).toEqual({ flowing: true, flowLh: 30, lostFor: 0 });
    const after = run(first.state, back, 10 * SAMPLER.lag);
    expect(after.readings.freeChlorine).toBeCloseTo(1.3, 3);
    expect(after.readings.ph).toBeCloseTo(7.6, 3);
  });

  it('counts flow exactly at the switch setting as flowing', () => {
    const i = input(POOL, SAMPLER.switchAt);
    expect(stepSampler(newSampler(i), i, 10).status.flowing).toBe(true);
  });
});
