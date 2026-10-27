import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from './world';
import type { World } from './world';
import {
  DAY_TANKS,
  dayTankOf,
  dayTankStock,
} from './plant/chemical-distribution';
import type { Chemical } from './plant/chemicals';
import type { PoolId } from './plant/pools';

/**
 * The chemical distribution end to end, on the whole world (the owner,
 * 2026-10-27: an integration test before the plumbing): two day tanks
 * nearly empty with their transfer pumps off run dry, their pools stop
 * dosing and drift; the corrective action, the pumps back to AUTO, fills
 * them and dosing resumes.
 */

const nearlyEmpty = (
  w: World,
  c: Chemical,
  site: PoolId,
  share = 0.03,
): World => {
  const i = dayTankOf(c, site);
  return {
    ...w,
    distribution: {
      ...w.distribution,
      [c]: {
        ...w.distribution[c],
        tanks: w.distribution[c].tanks.map((t, k) =>
          k === i
            ? { ...t, litres: DAY_TANKS[c][k].litres * share, calling: true }
            : t,
        ),
      },
    },
  };
};

const pumpTo = (w: World, c: Chemical, to: 'hand' | 'off' | 'auto') =>
  applyAction(w, {
    type: 'distribution',
    action: { act: 'hoa', chemical: c, to },
  });

const litres = (w: World, c: Chemical, site: PoolId) =>
  w.distribution[c].tanks[dayTankOf(c, site)].litres;

describe('the chemical distribution, end to end', () => {
  it('runs two day tanks dry with their pumps off, stops their dosing, and recovers when the pumps go back to AUTO', () => {
    let w = newWorld();
    const chlorineAtStart = w.pools.pool_02.freeChlorine;
    w = nearlyEmpty(w, 'hypochlorite', 'pool_02');
    // The lounge draws little acid (a few litres a day), so start it lower.
    w = nearlyEmpty(w, 'acid', 'pool_01', 0.005);
    w = pumpTo(w, 'hypochlorite', 'off');
    w = pumpTo(w, 'acid', 'off');

    // Hours on: both run dry, nothing refills them, their pools stop dosing.
    let t = 0;
    while (
      t < 48 * 3600 &&
      (litres(w, 'hypochlorite', 'pool_02') > 0 ||
        litres(w, 'acid', 'pool_01') > 0)
    ) {
      w = advance(w, 600, 10);
      t += 600;
    }
    expect(litres(w, 'hypochlorite', 'pool_02')).toBe(0);
    expect(litres(w, 'acid', 'pool_01')).toBe(0);
    expect(dayTankStock(w.distribution, 'pool_02').hypochlorite).toBe(false);
    expect(dayTankStock(w.distribution, 'pool_01').acid).toBe(false);
    // The other pools still dose: only those two tanks ran out.
    expect(dayTankStock(w.distribution, 'pool_02').acid).toBe(true);
    expect(dayTankStock(w.distribution, 'pool_01').hypochlorite).toBe(true);

    // Undosed, the Olympic's chlorine falls.
    w = advance(w, 3 * 3600, 10);
    expect(w.pools.pool_02.freeChlorine).toBeLessThan(chlorineAtStart * 0.5);

    // The fix: both transfer pumps back to AUTO. The empty tanks call, the
    // selectors serve them, they fill and their pools dose again.
    w = pumpTo(w, 'hypochlorite', 'auto');
    w = pumpTo(w, 'acid', 'auto');
    w = advance(w, 2 * 3600, 10);
    expect(litres(w, 'hypochlorite', 'pool_02')).toBeGreaterThan(
      DAY_TANKS.hypochlorite[dayTankOf('hypochlorite', 'pool_02')].litres * 0.2,
    );
    expect(litres(w, 'acid', 'pool_01')).toBeGreaterThan(
      DAY_TANKS.acid[dayTankOf('acid', 'pool_01')].litres * 0.2,
    );
    expect(dayTankStock(w.distribution, 'pool_02').hypochlorite).toBe(true);
    const chlorineLow = w.pools.pool_02.freeChlorine;
    w = advance(w, 3 * 3600, 10);
    expect(w.pools.pool_02.freeChlorine).toBeGreaterThan(chlorineLow);
  }, 60_000);
});

describe('the chemical distribution, on its power (the owner, 2026-10-27)', () => {
  const feeder = (w: World, room: 'wet_hall' | 'hypo_store', on: boolean) =>
    applyAction(w, { type: 'plant/feeder', room, on });

  it('transfers nothing while the wet hall’s circuit is off, and resumes when it is back on', () => {
    let w = nearlyEmpty(newWorld(), 'hypochlorite', 'pool_02', 0.15);
    w = feeder(w, 'wet_hall', false);
    const before = litres(w, 'hypochlorite', 'pool_02');
    w = advance(w, 1800, 10);
    // It only falls: dosing draws on it, nothing fills it.
    expect(litres(w, 'hypochlorite', 'pool_02')).toBeLessThanOrEqual(before);
    w = feeder(w, 'wet_hall', true);
    w = advance(w, 1800, 10);
    expect(litres(w, 'hypochlorite', 'pool_02')).toBeGreaterThan(before);
  });

  it('stops a chemical’s transfer when its store’s supply is off, not the other’s', () => {
    let w = nearlyEmpty(newWorld(), 'hypochlorite', 'pool_02', 0.15);
    w = nearlyEmpty(w, 'acid', 'pool_02', 0.15);
    w = feeder(w, 'hypo_store', false);
    const hypo = litres(w, 'hypochlorite', 'pool_02');
    const acid = litres(w, 'acid', 'pool_02');
    w = advance(w, 1800, 10);
    expect(litres(w, 'hypochlorite', 'pool_02')).toBeLessThanOrEqual(hypo);
    expect(litres(w, 'acid', 'pool_02')).toBeGreaterThan(acid);
  });
});
