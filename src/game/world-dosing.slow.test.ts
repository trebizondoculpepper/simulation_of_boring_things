import { describe, expect, it } from 'vite-plus/test';
import { advance, newWorld } from './world';
import { POOL_IDS } from './plant/pools';
import { runOut } from './world.test-support';

// Moved from `world.test.ts` (2026-10-28): each runs most of a day of the
// world, over 1.5 s here and over CI's 5 s limit on its runners, so slow.
describe('the dosing chemicals in the world', () => {
  it('run down as the pools are dosed, and a dry acid store lets the pH rise', () => {
    let world = newWorld();
    // The lounge's hypochlorite day tank, part full, dosing down.
    const day = world.distribution.hypochlorite.tanks[0].litres;
    // The acid all but gone: its day tanks empty, its store too little to
    // fill them.
    world = runOut(world, 'acid', 0.001);
    world = advance(world, 3600, 10);
    // Below its low-level cut-out, the store sends none.
    expect(world.chemicals.acid).toBe(0.001);
    expect(world.distribution.acid.tanks.every((t) => t.litres === 0)).toBe(
      true,
    );
    expect(world.distribution.hypochlorite.tanks[0].litres).toBeLessThan(day);
    // Twelve hours with hypochlorite alone: the pH has crept up as CO₂
    // leaves the water (mission 101: Wojtowicz's loss, fastest where a
    // pool's surface is large for its volume; the Olympic, deep, slowest).
    const before = world.pools;
    world = advance(world, 12 * 3600, 10);
    expect(world.pools.pool_01.ph).toBeGreaterThan(7.5);
    for (const id of POOL_IDS)
      expect(world.pools[id].ph, id).toBeGreaterThan(before[id].ph);
  }, 20_000);

  it('with the hypochlorite gone, lets every pool’s chlorine fall hour by hour while its acid holds the pH', () => {
    // Mission 101: the chlorine is used up by the bathers, the UV and the
    // light; the acid controller doses only while pH is over its setpoint,
    // so it holds pH rather than driving it down as the old model did.
    let world = newWorld();
    world = runOut(world, 'hypochlorite');
    for (let hour = 1; hour <= 12; hour++) {
      const before = world.pools;
      world = advance(world, 3600, 10);
      for (const id of POOL_IDS)
        expect(
          world.pools[id].freeChlorine,
          `${id}, hour ${hour}`,
        ).toBeLessThanOrEqual(before[id].freeChlorine);
    }
    for (const id of POOL_IDS) {
      expect(world.pools[id].freeChlorine, id).toBeLessThan(1);
      expect(world.pools[id].ph, id).toBeGreaterThan(7.2);
      expect(world.pools[id].ph, id).toBeLessThan(7.45);
    }
    // The acid has gone on giving: its store sent the lounge's day tank
    // its fill.
    expect(world.chemicals.acid).toBeLessThan(4000);
  }, 20_000);
});
