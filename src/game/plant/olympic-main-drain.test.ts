import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld, stepWorld } from '../world';
import type { World } from '../world';
import { POOL_MOTORS } from './motor-starters';
import { installedValveByCommandId } from './installed-valves';

/** The Olympic's pumps stopped and the world run on `seconds`. */
function stopped(mainDrainOpen: boolean, seconds: number): World {
  let w = newWorld();
  const valve = installedValveByCommandId('PL2-T1-IV1')!;
  w = applyAction(w, {
    type: 'plant/valve',
    id: valve.assetId,
    open: mainDrainOpen,
  });
  for (const tag of POOL_MOTORS('pool_02'))
    w = applyAction(w, {
      type: 'motor/starter',
      tag,
      action: { act: 'stop' },
    });
  for (let t = 0; t < seconds; t += 5) w = stepWorld(w, 5);
  return w;
}

describe('the Olympic pool’s main drain valve', () => {
  // The owner, 2026-10-26: a way to drain the pool into its balance tank.
  it('open, with the pumps stopped, drains the pool into its tank until it overflows', () => {
    const w = stopped(true, 3600);
    expect(w.pools.pool_02.balance).toBeCloseTo(1, 2);
    expect(w.pools.pool_02.level).toBeLessThan(-0.05);
  });

  it('shut, the pool holds its water with its pumps stopped', () => {
    const w = stopped(false, 3600);
    expect(w.pools.pool_02.balance).toBeLessThan(0.95);
    expect(Math.abs(w.pools.pool_02.level)).toBeLessThan(0.005);
  });
});
