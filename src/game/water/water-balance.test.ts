import { describe, expect, it } from 'vite-plus/test';
import { POOLS } from '../plant-sizing/pools.config';
import { ASSUME, sizePlant } from '../plant-sizing/sizing';
import { flows, startingWater, stepWater } from './water-balance';
import type { PoolWater } from './water-balance';

/** Each pool with pool plant, as the plant sizing has it. */
const pools: PoolWater[] = sizePlant(POOLS)
  .circuits.filter((c) => c.flow >= ASSUME.packageBelow)
  .map((c) => ({
    name: c.body.name,
    area: c.body.area,
    volume: c.body.volume,
    flow: c.flow,
    evaporation: c.evaporation / 1000,
    tank: c.balanceTank,
    tankDepth: 2,
    tankBelow: 0.2,
    mainDrainShare: 0.2,
    weirHead: 0.012,
    makeUpRate: Math.max(5, c.flow * 0.1),
    float: 0.5,
    lowLow: 0.1,
    backwash: c.body.volume * ASSUME.dilutionPerDay,
    depth: c.body.volume / c.body.area,
  }));
const olympic = pools.find((p) => p.name === 'Olympic pool')!;

describe('a pool’s water balance', () => {
  it.each(pools.map((p) => [p.name, p] as const))(
    '%s holds steady for a month with its make-up open',
    (_, p) => {
      const s = stepWater(p, startingWater(p), 30 * 24);
      expect(s.pumps).toBe(true);
      // Brimming, its tank near its float.
      expect(s.level).toBeGreaterThan(0);
      expect(Math.abs(s.tankVolume - p.tank * p.float)).toBeLessThan(
        p.tank * 0.2,
      );
      // What it took in is what it lost.
      expect(s.madeUp).toBeCloseTo(s.evaporated + s.backwashed + s.spilt, -1);
    },
  );

  it('settles over its lip, the overflow and main drains carrying the circulation back', () => {
    const s = stepWater(olympic, startingWater(olympic), 2);
    const f = flows(olympic, s);
    expect(f.overflow + f.mainDrains).toBeCloseTo(
      f.circulation - f.evaporation,
      0,
    );
  });
});

/**
 * The owner's experiment: shut the water supply off. The tank falls as
 * the pool evaporates and the filters backwash, until the pumps trip on
 * its low-low level; then the main drains run on into the tank by
 * gravity, the tank overflows to waste, and the pool drains until its
 * surface is down to the tank's overflow; and after that it only
 * evaporates.
 */
describe('with the water supply shut off', () => {
  const run = (p: PoolWater) => {
    let s = { ...startingWater(p), makeUpOpen: false };
    const days: {
      day: number;
      level: number;
      tank: number;
      pumps: boolean;
      spilt: number;
    }[] = [];
    for (let day = 1; day <= 60; day++) {
      s = stepWater(p, s, 24);
      days.push({
        day,
        level: s.level,
        tank: s.tankVolume / p.tank,
        pumps: s.pumps,
        spilt: s.spilt,
      });
    }
    return { s, days };
  };

  it.each(pools.map((p) => [p.name, p] as const))(
    '%s trips its pumps within days, then drains to its tank’s overflow, then only evaporates',
    (_, p) => {
      const { s, days } = run(p);
      const trip = days.find((d) => !d.pumps)!;
      expect(trip, 'the pumps trip').toBeDefined();
      expect(trip.day).toBeLessThanOrEqual(14);
      // Drained by gravity to the tank's overflow, its water spilt to waste.
      expect(s.level).toBeLessThan(-p.tankBelow + 0.01);
      expect(s.spilt).toBeGreaterThan(0);
      // And after that, falling only as it evaporates.
      const late = days.slice(-11);
      const fall = (late[0].level - late[late.length - 1].level) / 10;
      expect(fall).toBeCloseTo((p.evaporation * 24) / p.area, 3);
    },
  );

  it('drops the Olympic pool by over a third of a metre in two months, much of it to waste', () => {
    const { s, days } = run(olympic);
    const trip = days.find((d) => !d.pumps)!;
    // For the record: the day the pumps trip, the water lost.
    console.log(
      `Olympic, supply off: pumps trip on day ${trip.day}; after 60 days the pool is ` +
        `${(-s.level * 1000).toFixed(0)} mm below its lip; ${s.spilt.toFixed(0)} m³ spilt to waste, ` +
        `${s.backwashed.toFixed(0)} m³ backwashed, ${s.evaporated.toFixed(0)} m³ evaporated.`,
    );
    // Drained by gravity past its tank's overflow, its tank full, the rest
    // spilt; and evaporating on.
    expect(-s.level).toBeGreaterThan(0.3);
    expect(s.spilt).toBeGreaterThan(50);
  });
});
