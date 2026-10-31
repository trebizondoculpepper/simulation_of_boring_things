import { describe, expect, it } from 'vite-plus/test';
import { advance, appealOf, applyAction, newWorld } from './world';
import { POOL_IDS, POOL_TARGET } from './plant/pools';
import { runOut } from './world.test-support';

describe('the bathers and the water', () => {
  it('come as usual while the plant runs, and stay away from a pool whose hypochlorite has run out', () => {
    // A Tuesday: a day's normal running first.
    let w = advance(newWorld(), 24 * 3600 + 8 * 3600, 10);
    expect(appealOf(w).pool_01).toBe(1);
    const before = w.bathers.pools.pool_01.total;
    w = advance(w, 6 * 3600, 10);
    const usual = w.bathers.pools.pool_01.total - before;
    // The next day, with the hypochlorite gone from 08:00; beside it the
    // same morning with its hypochlorite, so the two are counted from the
    // same draws of the bathers' generator (prompt 102: one day's count
    // against another's turned on the generator's stream, which any
    // change in another pool's water moves).
    w = advance(w, 18 * 3600, 10);
    const stocked = advance(w, 6 * 3600, 10);
    w = runOut(w, 'hypochlorite');
    const from = w.bathers.pools.pool_01.total;
    w = advance(w, 6 * 3600, 10);
    const sameMorning = stocked.bathers.pools.pool_01.total - from;
    expect(sameMorning).toBeGreaterThan(usual * 0.5);
    expect(appealOf(w).pool_01).toBe(0);
    expect(w.bathers.pools.pool_01.now).toBe(0);
    // Its chlorine falls at its bathers' own demand (mission 101), about
    // 0.1 mg/l an hour, so the pool empties some hours in: fewer than six
    // tenths of the usual come.
    expect(w.bathers.pools.pool_01.total - from).toBeLessThan(
      sameMorning * 0.6,
    );
    // A day and more of the world, simulated: slow beside the whole suite.
  }, 30_000);
});

describe('the bathers and the halls', () => {
  it('leave a hall whose lights are out, skylights or not', () => {
    let w = advance(newWorld(), 24 * 3600 + 11 * 3600, 10);
    expect(appealOf(w).pool_01).toBe(1);
    expect(w.bathers.pools.pool_01.now).toBeGreaterThan(0);
    w = applyAction(w, { type: 'lighting/zone', zone: 'lounge', on: false });
    expect(appealOf(w).pool_01).toBe(0);
    w = advance(w, 600, 10);
    expect(w.bathers.pools.pool_01.now).toBe(0);
    // A day and a half of world: slow under a full parallel run.
  }, 20_000);

  it('let a hall cool without its air handling, and fewer bathers come', () => {
    let w = advance(newWorld(), 24 * 3600 + 8 * 3600, 10);
    expect(w.pools.pool_02.hallAir).toBeCloseTo(29, 1);
    w = applyAction(w, { type: 'plant/feeder', room: 'air_plant', on: false });
    w = advance(w, 6 * 3600, 10);
    expect(w.pools.pool_02.hallAir).toBeLessThan(25);
    expect(appealOf(w).pool_02).toBeLessThan(0.5);
    // A day and a half of world: slow under a full parallel run.
  }, 15_000);
});

describe('the mains water off', () => {
  it('runs the break tank down, trips the booster set, then the pools’ tanks run down until their pumps trip', () => {
    // Two days' normal running, to midday, the Olympic's Wash-O-Tron off
    // (it starts in AUTO): this is the Olympic never backwashed.
    let w = applyAction(newWorld(), {
      type: 'wash-o-tron',
      action: { act: 'run' },
    });
    expect(w.washOTron.running).toBe(false);
    w = advance(w, 36 * 3600, 10);
    expect(w.wetHall.boosterTripped).toBe(false);
    expect(w.wetHall.meter).toBeGreaterThan(2);
    w = applyAction(w, { type: 'plant/source', utility: 'water', on: false });
    // The pools' pumps run on: they move the pools' own water.
    w = advance(w, 3600, 10);
    for (const id of POOL_IDS) expect(w.pools[id].flow, id).toBeGreaterThan(5);
    // The break tank carries the pools until their backwashes and
    // evaporation are made up, and then the booster set trips on its low
    // level. (The Olympic backwashes only when its valves are worked, so
    // it draws on the make-up for its evaporation alone.)
    let boosterAt = -1;
    const pumpsAt: Partial<Record<string, number>> = {};
    for (let h = 2; h <= 14 * 24; h++) {
      w = advance(w, 3600, 10);
      if (boosterAt < 0 && w.wetHall.boosterTripped) boosterAt = h;
      for (const id of POOL_IDS)
        if (pumpsAt[id] === undefined && w.pools[id].tripped) pumpsAt[id] = h;
    }
    expect(boosterAt).toBeGreaterThan(6);
    expect(boosterAt).toBeLessThan(72);
    for (const id of POOL_IDS.filter((p) => p !== 'pool_02')) {
      expect(pumpsAt[id], id).toBeGreaterThan(boosterAt);
      expect(w.pools[id].level, id).toBeLessThan(0);
    }
    // The Olympic, never backwashed, holds its water but its beds foul to
    // their capacity and break through (the ideal filter): its circulation
    // falls, and its water clouds with the dirt they no longer keep.
    expect(pumpsAt.pool_02).toBeUndefined();
    expect(w.pools.pool_02.flow).toBeLessThan(POOL_TARGET.pool_02.flow * 0.95);
    expect(w.pools.pool_02.solids).toBeGreaterThan(20);
    // The main back, the booster set stays tripped until it is reset.
    w = applyAction(w, { type: 'plant/source', utility: 'water', on: true });
    w = advance(w, 3600, 10);
    expect(w.wetHall.boosterTripped).toBe(true);
    w = applyAction(w, { type: 'plant/booster-reset' });
    expect(w.wetHall.boosterTripped).toBe(false);
    w = advance(w, 36 * 3600, 10);
    for (const id of POOL_IDS) expect(w.pools[id].level, id).toBeGreaterThan(0);
    // Days of plant, simulated: allowed longer than the default under a full run.
  }, 90_000);
});
