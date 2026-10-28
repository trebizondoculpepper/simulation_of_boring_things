import { describe, expect, it } from 'vite-plus/test';
import {
  GAME_PLANTS,
  GAME_POOLS,
  PLANT,
  POOL_25M,
  SCENARIOS,
  compareCircuits,
  firstTime,
  handDoseThroughTank,
  mean,
  runBench,
  runScenario,
  setpointStep,
  steadyCheck,
  warmedUp,
  within,
} from './chemistry-bench';

/**
 * The bench's scenarios (the owner, 2026-10-28): a steady state, a problem
 * a real pool has, the recommended treatment, each check's expectation,
 * source, threshold and result. Their results are tabled in
 * `doc/research/water-chemistry-models.md` §7 and charted by
 * `scripts/chemistry-bench-report.test.ts`. Long runs: kept in this `.slow.test.ts` file, run locally, skipped on CI.
 */
describe('problem and treatment scenarios (two zones: pool and balance tank)', () => {
  for (const sc of SCENARIOS)
    it(
      sc.title,
      () => {
        const r = runScenario(sc);
        for (const c of r.checks)
          expect(c.pass, `${c.name}: ${c.threshold}; got ${c.measured}`).toBe(
            true,
          );
      },
      60_000,
    );
});

describe('the circuit as two zones against one volume', () => {
  it('every scenario passes the same checks either way', () => {
    for (const sc of SCENARIOS) {
      const c = compareCircuits(sc);
      expect(c.passOne, `${sc.id} with one volume`).toBe(c.of);
      expect(c.passTwo, `${sc.id} with two zones`).toBe(c.of);
    }
  }, 120_000);
  it('a hand dose into the balance tank shows at the pool’s far side over most of a turnover, not at once (its mixing lag)', () => {
    const { one, two } = handDoseThroughTank();
    const turnover =
      (POOL_25M.volume + POOL_25M.balanceTank) / POOL_25M.circulation;
    const before = two.samples[0].alkalinity;
    const after = two.samples[two.samples.length - 1].alkalinity;
    const t63 = firstTime(
      two.samples,
      1,
      (x) => x.alkalinity >= before + 0.63 * (after - before),
    );
    expect(after - before).toBeGreaterThan(15);
    expect(t63 - 1).toBeLessThan(turnover);
    // The mixing lag (`circuit.ts`): about an hour to 63 %, not the
    // tank's ten minutes.
    expect(t63 - 1).toBeGreaterThan(turnover / 4);
    // With one volume it is there at once.
    const oneJump = firstTime(
      one.samples,
      1,
      (x) => x.alkalinity >= one.samples[0].alkalinity + 15,
    );
    expect(oneJump - 1).toBeLessThan(0.05);
  });
  it('the dosing loop answers a setpoint step with more overshoot through two zones (the tank is its dead time)', () => {
    const { one, two } = setpointStep();
    const peak = (r: typeof one) =>
      Math.max(...within(r.samples, 1, 6).map((x) => x.freeChlorine));
    expect(peak(two)).toBeGreaterThan(peak(one));
  });
});

describe('the game’s four pools on the bench (their own volumes and flows)', () => {
  for (const [id, pool] of Object.entries(GAME_POOLS))
    it(`${pool.name}: comes to a steady state with its chlorine in range`, () => {
      const plant = { ...PLANT, ...GAME_PLANTS[id] };
      const run = runBench(warmedUp(pool, plant), pool, 48);
      expect(steadyCheck(run.samples).pass).toBe(true);
      const fc = mean(within(run.samples, 24, 48).map((x) => x.freeChlorine));
      const target = plant.fcSetpoint;
      expect(fc).toBeGreaterThan(target - 0.3);
      expect(fc).toBeLessThan(target + 1);
    }, 60_000);
});
