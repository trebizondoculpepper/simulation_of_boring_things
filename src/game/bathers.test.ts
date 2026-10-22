import { describe, expect, it } from 'vite-plus/test';
import {
  CAPACITY,
  FULL_APPEAL,
  poolAppeal,
  CLOSES,
  OPENS,
  TIMETABLE,
  clock,
  draw,
  isOpen,
  newBathers,
  stepBathers,
} from './bathers';
import type { BathersState } from './bathers';
import type { PoolId } from './plant/pools';

const POOLS: readonly PoolId[] = ['pool_01', 'pool_02', 'pool_03', 'pool_04'];
const DT = 5;

/** A week of bathers, five seconds at a time, with what is seen on the way. */
function week(seed = 1) {
  let s: BathersState = newBathers(seed);
  const seen = {
    most: { pool_01: 0, pool_02: 0, pool_03: 0, pool_04: 0 },
    inWhileClosed: 0,
    days: [] as Record<PoolId, number>[],
  };
  for (let t = 0; t < 7 * 86400; t += DT) {
    s = stepBathers(s, t, DT);
    if (clock(t + DT).day !== clock(t).day)
      seen.days.push(
        Object.fromEntries(
          POOLS.map((id) => [id, s.pools[id].today]),
        ) as Record<PoolId, number>,
      );
    for (const id of POOLS) {
      seen.most[id] = Math.max(seen.most[id], s.pools[id].now);
      if (!isOpen(t + DT) && s.pools[id].now > 0) seen.inWhileClosed++;
    }
  }
  return { s, seen };
}

const { s: after, seen } = week();

describe('the leisure centre’s day', () => {
  it('starts on a Monday at midnight, opens at 08:00 and closes at 21:00', () => {
    expect(clock(0)).toEqual({ day: 0, weekday: 0, hour: 0 });
    expect(clock(5 * 86400 + 9 * 3600).weekday).toBe(5);
    expect(isOpen(OPENS * 3600 - 1)).toBe(false);
    expect(isOpen(OPENS * 3600)).toBe(true);
    expect(isOpen(CLOSES * 3600)).toBe(false);
  });

  it('has a usual share for every open hour, averaging a quarter to a half of the load', () => {
    for (const use of Object.values(TIMETABLE))
      for (const profile of [use.weekday, use.weekend]) {
        expect(profile).toHaveLength(CLOSES - OPENS);
        const mean = profile.reduce((a, b) => a + b, 0) / profile.length;
        expect(mean).toBeGreaterThanOrEqual(0.25);
        expect(mean).toBeLessThanOrEqual(0.55);
      }
  });
});

describe('the bathers', () => {
  it('are never in the water while the centre is closed, and never more than a pool’s load', () => {
    expect(seen.inWhileClosed).toBe(0);
    for (const id of POOLS)
      expect(seen.most[id], id).toBeLessThanOrEqual(CAPACITY[id]);
  });

  it('come in the numbers a real centre’s operational load gives, every pool used every day', () => {
    // PWTAG: a day's load is 25–50 % of the bathing load for each open
    // hour, each bather's stay being the hour's turnover; with the day's
    // busyness, a little either side.
    expect(seen.days).toHaveLength(7);
    for (const d of seen.days) {
      expect(d.pool_01).toBeGreaterThan(150);
      expect(d.pool_01).toBeLessThan(800);
      expect(d.pool_02).toBeGreaterThan(900);
      expect(d.pool_02).toBeLessThan(3500);
      expect(d.pool_03).toBeGreaterThan(30);
    }
  });

  it('crowd the lounge at weekends more than on weekdays', () => {
    const weekday =
      seen.days.slice(0, 5).reduce((a, d) => a + d.pool_01, 0) / 5;
    const weekend = (seen.days[5].pool_01 + seen.days[6].pool_01) / 2;
    expect(weekend).toBeGreaterThan(weekday);
  });

  it('all wade through the footbath on their way in', () => {
    for (const d of seen.days)
      expect(d.pool_04).toBe(d.pool_01 + d.pool_02 + d.pool_03);
    expect(after.pools.pool_04.total).toBe(
      after.pools.pool_01.total +
        after.pools.pool_02.total +
        after.pools.pool_03.total,
    );
  });

  it('come the same way again from the same seed, and differently from another', () => {
    expect(week(1).s).toEqual(after);
    expect(week(2).s.pools.pool_02.total).not.toBe(after.pools.pool_02.total);
  });

  it('draw evenly from the generator', () => {
    let seed = 7;
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      const [u, next] = draw(seed);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
      sum += u;
      seed = next;
    }
    expect(sum / 10000).toBeCloseTo(0.5, 1);
  });
});

describe('what keeps bathers away', () => {
  const good = {
    temperature: 28,
    target: 28,
    ph: 7.4,
    freeChlorine: 1.4,
    combinedChlorine: 0.2,
    circulating: true,
    lit: true,
    spa: false,
  };

  it('is nothing when the water is as it should be', () => {
    expect(poolAppeal(good)).toBe(1);
  });

  it('closes a pool whose water is not circulating, is unsafe, is dark, or a spa over 40 °C', () => {
    expect(poolAppeal({ ...good, circulating: false })).toBe(0);
    expect(poolAppeal({ ...good, freeChlorine: 0.3 })).toBe(0);
    expect(poolAppeal({ ...good, lit: false })).toBe(0);
    expect(
      poolAppeal({ ...good, spa: true, target: 37, temperature: 41 }),
    ).toBe(0);
  });

  it('puts bathers off cold, hot, acid, alkaline, over-chlorinated or smelly water', () => {
    for (const worse of [
      { temperature: 24 },
      { temperature: 32 },
      { ph: 6.8 },
      { ph: 7.9 },
      { freeChlorine: 4 },
      { combinedChlorine: 1 },
    ]) {
      const a = poolAppeal({ ...good, ...worse });
      expect(a, JSON.stringify(worse)).toBeGreaterThan(0);
      expect(a, JSON.stringify(worse)).toBeLessThan(0.7);
    }
    expect(poolAppeal({ ...good, temperature: 21 })).toBe(0);
    expect(poolAppeal({ ...good, ph: 8.3 })).toBe(0);
    expect(poolAppeal({ ...good, freeChlorine: 5 })).toBe(0);
  });

  it('clears a closed pool within minutes, and lets fewer in to a poor one', () => {
    let s = newBathers(3);
    const noon = 12 * 3600;
    for (let t = 0; t < 2 * 3600; t += DT)
      s = stepBathers(s, noon - 2 * 3600 + t, DT);
    expect(s.pools.pool_02.now).toBeGreaterThan(20);
    const closed = { ...FULL_APPEAL, pool_02: 0 };
    let c = s;
    for (let t = 0; t < 300; t += DT) c = stepBathers(c, noon + t, DT, closed);
    expect(c.pools.pool_02.now).toBe(0);
    const poor = { ...FULL_APPEAL, pool_02: 0.3 };
    let p = s;
    let q = s;
    for (let t = 0; t < 3600; t += DT) {
      p = stepBathers(p, noon + t, DT, poor);
      q = stepBathers(q, noon + t, DT);
    }
    expect(p.pools.pool_02.today - s.pools.pool_02.today).toBeLessThan(
      (q.pools.pool_02.today - s.pools.pool_02.today) * 0.6,
    );
  });
});
