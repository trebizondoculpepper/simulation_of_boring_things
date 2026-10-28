import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from './world';
import { doseRates } from './plant/pool-dosing';

describe('a dosing pump’s faults in the water (prompt 102)', () => {
  it('a gas-locked lounge DMX stops dosing, and its pool’s chlorine sags beside one that doses', () => {
    // A morning's running, then a slug of gas into the lounge's pump.
    const w0 = advance(newWorld(), 8 * 3600, 10);
    const locked = applyAction(w0, {
      type: 'dosing-pump',
      action: { act: 'gas', pool: 'pool_01', chemical: 'hypochlorite', ml: 1 },
    });
    const a = advance(w0, 6 * 3600, 10);
    const b = advance(locked, 6 * 3600, 10);
    expect(b.dosingPumps.pool_01.hypochlorite.fault).toBe('flow');
    expect(doseRates(b, 'pool_01').hypochlorite).toBe(0);
    expect(b.pools.pool_01.freeChlorine).toBeLessThan(
      a.pools.pool_01.freeChlorine - 0.3,
    );
    // Bled and acknowledged at its keys, it doses again.
    let c = applyAction(b, {
      type: 'dosing-pump',
      action: {
        act: 'bleed',
        pool: 'pool_01',
        chemical: 'hypochlorite',
        open: true,
      },
    });
    c = applyAction(c, {
      type: 'dosing-pump',
      action: { act: 'acknowledge', pool: 'pool_01', chemical: 'hypochlorite' },
    });
    c = advance(c, 20, 0.1);
    c = applyAction(c, {
      type: 'dosing-pump',
      action: {
        act: 'bleed',
        pool: 'pool_01',
        chemical: 'hypochlorite',
        open: false,
      },
    });
    c = advance(c, 600, 10);
    expect(c.dosingPumps.pool_01.hypochlorite.fault).toBe(null);
    expect(c.dosingPumps.pool_01.hypochlorite.meanLh).toBeGreaterThan(0.5);
  }, 60_000);

  it('the Olympic’s DMX runs flat out at its 2.1 l/h through a busy day', () => {
    const w = advance(newWorld(), 18 * 3600, 10);
    const p = w.dosingPumps.pool_02.hypochlorite;
    expect(p.fault).toBe(null);
    expect(p.deliveredL).toBeGreaterThan(5);
    expect(p.deliveredL).toBeLessThan(18 * 2.1);
  }, 60_000);
});
