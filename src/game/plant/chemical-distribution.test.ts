import { describe, expect, it } from 'vite-plus/test';
import {
  DAY_TANKS,
  DISTRIBUTION,
  actOnDistribution,
  dayLevel,
  dayTankStock,
  newChemicalDistribution,
  outletOpen,
  stepDistribution,
  transferRunning,
} from './chemical-distribution';
import type { ChemicalDistribution } from './chemical-distribution';

const CAP = { hypochlorite: 12000, acid: 4000 };
const run = (
  d: ChemicalDistribution,
  stores: { hypochlorite: number; acid: number },
  seconds: number,
  draw = {},
  step = 5,
) => {
  let s = { ...stores };
  for (let t = 0; t < seconds; t += step) {
    const r = stepDistribution(d, s, CAP, draw, step);
    d = r.distribution;
    s = {
      hypochlorite: s.hypochlorite - r.taken.hypochlorite,
      acid: s.acid - r.taken.acid,
    };
  }
  return { d, s };
};
const withLevel = (
  d: ChemicalDistribution,
  c: 'hypochlorite' | 'acid',
  i: number,
  share: number,
) => ({
  ...d,
  [c]: {
    ...d[c],
    tanks: d[c].tanks.map((t, k) =>
      k === i ? { ...t, litres: DAY_TANKS[c][k].litres * share } : t,
    ),
  },
});

describe('the chemical distribution: store, transfer pump, selector, day tanks', () => {
  it('starts with every day tank part full and nothing moving', () => {
    const d = newChemicalDistribution();
    expect(d.hypochlorite.tanks).toHaveLength(4);
    expect(d.acid.tanks).toHaveLength(4);
    const r = stepDistribution(d, CAP, CAP, {}, 1);
    expect(r.taken).toEqual({ hypochlorite: 0, acid: 0 });
  });

  it('fills a low day tank from its store to high through its own outlet, the litres conserved', () => {
    const d0 = withLevel(newChemicalDistribution(), 'acid', 1, 0.1);
    const before = d0.acid.tanks.reduce((t, k) => t + k.litres, 0);
    const { d, s } = run(d0, CAP, 3600);
    expect(dayLevel('acid', 1, d.acid)).toBeGreaterThanOrEqual(
      DISTRIBUTION.high - 0.02,
    );
    expect(dayLevel('acid', 1, d.acid)).toBeLessThan(DISTRIBUTION.highHigh);
    const after = d.acid.tanks.reduce((t, k) => t + k.litres, 0);
    expect(after - before).toBeCloseTo(CAP.acid - s.acid, 6);
    expect(d.acid.serving).toBe(null);
  });

  it('serves calling day tanks one at a time, never two outlets open', () => {
    let d = withLevel(
      withLevel(newChemicalDistribution(), 'hypochlorite', 0, 0.1),
      'hypochlorite',
      3,
      0.1,
    );
    let s = { ...CAP };
    const served = new Set<number>();
    for (let t = 0; t < 7200; t += 5) {
      const r = stepDistribution(d, s, CAP, {}, 5);
      d = r.distribution;
      s = {
        hypochlorite: s.hypochlorite - r.taken.hypochlorite,
        acid: s.acid - r.taken.acid,
      };
      expect(
        d.hypochlorite.tanks.filter((_, i) => outletOpen(d.hypochlorite, i))
          .length,
      ).toBeLessThanOrEqual(1);
      if (d.hypochlorite.serving !== null) served.add(d.hypochlorite.serving);
    }
    expect([...served].sort()).toEqual([0, 3]);
  });

  it('keeps every pool dosed for days as its day tank is drawn down and refilled', () => {
    const draw = {
      pool_01: { hypochlorite: 20 / 86400, acid: 8 / 86400 },
      pool_02: { hypochlorite: 150 / 86400, acid: 60 / 86400 },
      pool_03: { hypochlorite: 1 / 86400, acid: 0.4 / 86400 },
      pool_04: { hypochlorite: 0.5 / 86400, acid: 0.2 / 86400 },
    };
    const { d, s } = run(newChemicalDistribution(), CAP, 5 * 86400, draw, 30);
    for (const c of ['hypochlorite', 'acid'] as const)
      d[c].tanks.forEach((_, i) => {
        expect(dayLevel(c, i, d[c])).toBeGreaterThan(DISTRIBUTION.low - 0.05);
        expect(dayLevel(c, i, d[c])).toBeLessThan(DISTRIBUTION.highHigh);
      });
    expect(s.hypochlorite).toBeLessThan(CAP.hypochlorite - 500);
  });

  it('stops transferring when its store is down to its low-level cut-out', () => {
    const d = withLevel(newChemicalDistribution(), 'acid', 0, 0.1);
    const low = CAP.acid * DISTRIBUTION.storeLow;
    const r = stepDistribution(
      d,
      { hypochlorite: CAP.hypochlorite, acid: low },
      CAP,
      {},
      5,
    );
    expect(r.distribution.acid.serving).toBe(0);
    expect(transferRunning(r.distribution.acid, low, CAP.acid)).toBe(false);
    expect(r.taken.acid).toBe(0);
  });

  it('trips at high-high, until reset below it; in OFF never pumps; in HAND only the pick', () => {
    let d = withLevel(newChemicalDistribution(), 'hypochlorite', 2, 0.99);
    d = stepDistribution(d, CAP, CAP, {}, 1).distribution;
    expect(d.hypochlorite.tripped).toBe(true);
    expect(
      actOnDistribution(d, { act: 'reset', chemical: 'hypochlorite' })
        .hypochlorite.tripped,
    ).toBe(true);
    d = actOnDistribution(withLevel(d, 'hypochlorite', 2, 0.5), {
      act: 'reset',
      chemical: 'hypochlorite',
    });
    expect(d.hypochlorite.tripped).toBe(false);
    let e = withLevel(newChemicalDistribution(), 'acid', 0, 0.1);
    e = actOnDistribution(e, { act: 'hoa', chemical: 'acid', to: 'off' });
    expect(stepDistribution(e, CAP, CAP, {}, 5).taken.acid).toBe(0);
    let h = actOnDistribution(
      withLevel(newChemicalDistribution(), 'acid', 0, 0.1),
      { act: 'mode', chemical: 'acid', to: 'hand' },
    );
    h = actOnDistribution(h, { act: 'pick', chemical: 'acid', outlet: 2 });
    h = stepDistribution(h, CAP, CAP, {}, 1).distribution;
    expect(h.acid.serving).toBe(2);
  });

  it('says which chemicals each pool has: its day tank not empty', () => {
    const d = newChemicalDistribution();
    expect(dayTankStock(d, 'pool_02')).toEqual({
      hypochlorite: true,
      acid: true,
    });
    expect(dayTankStock(d, 'pool_04')).toEqual({
      hypochlorite: true,
      acid: true,
    });
    expect(
      dayTankStock(withLevel(d, 'hypochlorite', 1, 0), 'pool_02').hypochlorite,
    ).toBe(false);
  });
});
