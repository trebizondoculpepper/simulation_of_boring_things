import { describe, expect, it } from 'vite-plus/test';
import { advance, jacuzziCabinetPanel, newWorld } from '../../../game/world';
import { JACUZZI_BALANCE_TANK } from '../../../game/plant/spa-balance-tank';

const start = advance(newWorld(), 10, 1);

describe('the jacuzzi cabinet, with its external balance tank', () => {
  it('holds its level through a day’s running, the make-up keeping it at its float', () => {
    const w = advance(start, 24 * 3600, 10);
    expect(w.pools.pool_03.tripped).toBe(false);
    expect(w.pools.pool_03.balance).toBeGreaterThan(
      JACUZZI_BALANCE_TANK.lowLow,
    );
    expect(jacuzziCabinetPanel(w).flowing).toBe(true);
    // A day of the world: give it room under a full parallel run.
  }, 20_000);
});
