import { describe, expect, it } from 'vite-plus/test';
import {
  POOL_25M,
  firstTime,
  handDose,
  newBench,
  runBench,
  within,
  mean,
} from './chemistry-bench';

/**
 * Quick checks of the bench itself, from a fresh fill (no warm-up). The
 * scenarios, which run weeks of simulated time, are in
 * `chemistry-bench.slow.test.ts`.
 */
describe('the bench, quickly', () => {
  it('holds the chlorine setpoint through a day of bathers from a fresh fill', () => {
    const run = runBench(newBench(POOL_25M), POOL_25M, 24);
    const fc = within(run.samples, 6, 24).map((x) => x.freeChlorine);
    expect(Math.min(...fc)).toBeGreaterThan(1.2);
    expect(Math.max(...fc)).toBeLessThan(2.2);
  });
  it('a hand dose into the balance tank reaches the pool after the tank, not at once', () => {
    const ev = [
      {
        at: 0.5,
        label: 'bicarbonate into the tank',
        apply: (s: ReturnType<typeof newBench>) =>
          handDose(s, { bicarbonate: 20 * 1.68 * 500 }, 'tank'),
      },
    ];
    const two = runBench(
      newBench(POOL_25M, undefined, 'two'),
      POOL_25M,
      2,
      ev,
      10,
      1 / 60,
    );
    const one = runBench(
      newBench(POOL_25M, undefined, 'one'),
      POOL_25M,
      2,
      ev,
      10,
      1 / 60,
    );
    const rise = (r: typeof two) =>
      mean(within(r.samples, 1.9, 2).map((x) => x.alkalinity)) -
      r.samples[0].alkalinity;
    const t63 = firstTime(
      two.samples,
      0.5,
      (x) => x.alkalinity >= two.samples[0].alkalinity + 0.63 * rise(two),
    );
    expect(rise(two)).toBeGreaterThan(15);
    expect(t63 - 0.5).toBeGreaterThan(0.02);
    expect(t63 - 0.5).toBeLessThan(
      (POOL_25M.volume + POOL_25M.balanceTank) / POOL_25M.circulation,
    );
    const tOne = firstTime(
      one.samples,
      0.5,
      (x) => x.alkalinity >= one.samples[0].alkalinity + 0.63 * rise(one),
    );
    expect(tOne - 0.5).toBeLessThan(0.02);
  });
});
