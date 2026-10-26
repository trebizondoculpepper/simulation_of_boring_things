import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld, stepWorld } from '../world';
import { installedValveByCommandId } from './installed-valves';

const shut = (tag: string) =>
  applyAction(newWorld(), {
    type: 'plant/valve',
    id: installedValveByCommandId(tag)!.assetId,
    open: false,
  });

describe('the booster set’s motorised valves', () => {
  const calling = (w: ReturnType<typeof newWorld>) => {
    w = {
      ...w,
      pools: { ...w.pools, pool_01: { ...w.pools.pool_01, balance: 0.2 } },
    };
    for (let i = 0; i < 60; i++) w = stepWorld(w, 1);
    return w;
  };

  it('let the booster set give make-up while both are open', () => {
    expect(calling(newWorld()).wetHall.flow).toBeGreaterThan(0);
  });

  it('give no make-up while either is shut', () => {
    // A pool calling for make-up: its level drawn down.
    for (const tag of ['WH-T1-IV1', 'WH-MU1-IV2']) {
      let w = shut(tag);
      w = {
        ...w,
        pools: { ...w.pools, pool_01: { ...w.pools.pool_01, balance: 0.2 } },
      };
      for (let i = 0; i < 60; i++) w = stepWorld(w, 1);
      // Its pump may run against the shut valve, but nothing is delivered.
      expect(w.wetHall.flow, tag).toBe(0);
    }
  });
});
