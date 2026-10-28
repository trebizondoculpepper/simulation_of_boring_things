import { describe, expect, it } from 'vite-plus/test';
import { SETTLED } from './water-treatment';
import { POOL_IDS } from './pools';
import {
  GAME_PLANTS,
  GAME_POOLS,
  PLANT,
  warmedUp,
} from '../water/chemistry-bench';

/**
 * Each pool's settled water (`SETTLED`) is the bench's 120-day steady state
 * of that pool with the world's pumps and controller: if the model, the
 * pools or the controller change, it must be found again. Slow: it runs
 * four pools for four months.
 */
describe('the pools’ settled water against the bench', () => {
  it('matches each game pool’s steady state', () => {
    for (const id of POOL_IDS) {
      const s = warmedUp(GAME_POOLS[id], { ...PLANT, ...GAME_PLANTS[id] });
      const w = s.pool;
      const near = (a: number, b: number, tol: number, what: string) =>
        expect(
          Math.abs(a - b),
          `${id} ${what}: ${a} against ${b}`,
        ).toBeLessThan(tol);
      near(SETTLED[id].alkalinity, w.alkalinity, 2, 'alkalinity');
      near(SETTLED[id].hardness, w.hardness, 0.02 * w.hardness, 'hardness');
      near(SETTLED[id].tds, w.tds, 0.02 * w.tds, 'TDS');
      near(SETTLED[id].sulphate, w.sulphate, 0.05 * w.sulphate, 'sulphate');
      near(SETTLED[id].chlorate, w.chlorate, 0.3, 'chlorate');
      near(SETTLED[id].integral, s.integral, 0.05, 'integral');
    }
  }, 120_000);
});
