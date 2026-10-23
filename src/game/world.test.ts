import { describe, expect, it } from 'vite-plus/test';
import { advance, appealOf, applyAction, newWorld } from './world';
import { roomRunning, serviceAvailable } from './plant/services';
import { POOL_IDS, POOL_TARGET } from './plant/pools';

describe('the world', () => {
  it('counts each time dev14’s button goes on, and dev15’s reset turns it off', () => {
    let w = applyAction(newWorld(), { type: 'demo/set', on: true });
    expect(w.demo).toEqual({ on: true, presses: 1 });
    w = applyAction(w, { type: 'demo/set', on: true });
    expect(w.demo.presses).toBe(1);
    w = applyAction(w, { type: 'demo/reset' });
    expect(w.demo.on).toBe(false);
    expect(applyAction(w, { type: 'demo/set', on: true }).demo.presses).toBe(2);
  });

  it('advances in fixed steps to exactly the time asked', () => {
    expect(advance(newWorld(), 12.34).time).toBeCloseTo(12.34, 9);
  });

  it('propagates a shared utility outage and a local feeder outage', () => {
    const initial = newWorld();
    expect(roomRunning(initial.plant, 'plant_pool_01')).toBe(true);
    const noHeat = applyAction(initial, {
      type: 'plant/source',
      utility: 'heat',
      on: false,
    });
    expect(serviceAvailable(noHeat.plant, 'plant_pool_01', 'heat')).toBe(false);
    expect(roomRunning(noHeat.plant, 'plant_pool_01')).toBe(false);
    expect(serviceAvailable(noHeat.plant, 'control_room', 'power')).toBe(true);
    const noBoilerPower = applyAction(initial, {
      type: 'plant/feeder',
      room: 'boiler_house',
      on: false,
    });
    expect(serviceAvailable(noBoilerPower.plant, 'plant_pool_02', 'heat')).toBe(
      false,
    );
    expect(
      serviceAvailable(noBoilerPower.plant, 'plant_pool_02', 'water'),
    ).toBe(true);
  });

  // Skipped at the owner's word (2026-10-22): its water quality runs
  // 0.0162 against a 0.015 limit; work in progress.
  it.skip('carries pool level and water quality forward when treatment loses power', () => {
    const initial = newWorld();
    const switched = applyAction(initial, {
      type: 'plant/feeder',
      room: 'plant_pool_01',
      on: false,
    });
    const later = advance(switched, 600);
    expect(later.pools.pool_01.flow).toBeLessThan(1);
    expect(later.pools.pool_01.level).toBeLessThan(initial.pools.pool_01.level);
    expect(later.pools.pool_01.freeChlorine).toBeLessThan(
      initial.pools.pool_01.freeChlorine,
    );
    expect(later.pools.pool_01.ph).toBeGreaterThan(initial.pools.pool_01.ph);
    expect(later.pools.pool_02.flow).toBeGreaterThan(600);
  });
});

describe('the main incoming switch off', () => {
  it('takes every service from every room, stops every pool and the booster set, and gives them back', () => {
    let w = advance(newWorld(), 10 * 3600, 10);
    w = applyAction(w, { type: 'plant/source', utility: 'power', on: false });
    for (const room of Object.keys(
      w.plant.feeders,
    ) as (keyof typeof w.plant.feeders)[])
      for (const utility of [
        'power',
        'water',
        'heat',
        'air',
        'chemical',
      ] as const)
        expect(
          serviceAvailable(w.plant, room, utility),
          `${room} ${utility}`,
        ).toBe(false);
    w = advance(w, 600, 10);
    for (const id of POOL_IDS) expect(w.pools[id].flow, id).toBeLessThan(1);
    expect(w.wetHall.boosterRunning).toBe(false);
    w = applyAction(w, { type: 'plant/source', utility: 'power', on: true });
    w = advance(w, 600, 10);
    for (const id of POOL_IDS) expect(w.pools[id].flow, id).toBeGreaterThan(5);
  });
});

describe('the bathers and the water', () => {
  it('come as usual while the plant runs, and stay away from a pool whose hypochlorite has run out', () => {
    // A Tuesday: a day's normal running first.
    let w = advance(newWorld(), 24 * 3600 + 8 * 3600, 10);
    expect(appealOf(w).pool_01).toBe(1);
    const before = w.bathers.pools.pool_01.total;
    w = advance(w, 6 * 3600, 10);
    const usual = w.bathers.pools.pool_01.total - before;
    // The next day, with the hypochlorite gone from 08:00.
    w = advance(w, 18 * 3600, 10);
    w = { ...w, chemicals: { ...w.chemicals, hypochlorite: 0 } };
    const from = w.bathers.pools.pool_01.total;
    w = advance(w, 6 * 3600, 10);
    expect(appealOf(w).pool_01).toBe(0);
    expect(w.bathers.pools.pool_01.now).toBe(0);
    expect(w.bathers.pools.pool_01.total - from).toBeLessThan(usual / 2);
  });
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
  });

  it('let a hall cool without its air handling, and fewer bathers come', () => {
    let w = advance(newWorld(), 24 * 3600 + 8 * 3600, 10);
    expect(w.pools.pool_02.hallAir).toBeCloseTo(29, 1);
    w = applyAction(w, { type: 'plant/feeder', room: 'air_plant', on: false });
    w = advance(w, 6 * 3600, 10);
    expect(w.pools.pool_02.hallAir).toBeLessThan(25);
    expect(appealOf(w).pool_02).toBeLessThan(0.5);
  });
});

describe('the mains water off', () => {
  it('runs the break tank down, trips the booster set, then the pools’ tanks run down until their pumps trip', () => {
    // Two days' normal running, to midday.
    let w = advance(newWorld(), 36 * 3600, 10);
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
    // The Olympic, never backwashed, holds its water but chokes: its beds
    // foul, and its circulation falls.
    expect(pumpsAt.pool_02).toBeUndefined();
    expect(w.pools.pool_02.flow).toBeLessThan(POOL_TARGET.pool_02.flow * 0.85);
    // The main back, the booster set stays tripped until it is reset.
    w = applyAction(w, { type: 'plant/source', utility: 'water', on: true });
    w = advance(w, 3600, 10);
    expect(w.wetHall.boosterTripped).toBe(true);
    w = applyAction(w, { type: 'plant/booster-reset' });
    expect(w.wetHall.boosterTripped).toBe(false);
    w = advance(w, 36 * 3600, 10);
    for (const id of POOL_IDS) expect(w.pools[id].level, id).toBeGreaterThan(0);
    // Days of plant, simulated: allowed longer than the default under a full run.
  }, 30_000);
});

describe('the dosing chemicals in the world', () => {
  it('run down as the pools are dosed, and a dry acid store lets the pH rise', () => {
    let world = newWorld();
    world = { ...world, chemicals: { ...world.chemicals, acid: 0.001 } };
    world = advance(world, 3600, 10);
    expect(world.chemicals.acid).toBe(0);
    expect(world.chemicals.hypochlorite).toBeLessThan(12000);
    // Twelve hours with hypochlorite alone: the pH has crept up.
    world = advance(world, 12 * 3600, 10);
    expect(world.pools.pool_02.ph).toBeGreaterThan(7.5);
  });

  it('with the hypochlorite gone but the acid dosing, drives every pool’s pH down, hour by hour', () => {
    let world = newWorld();
    world = {
      ...world,
      chemicals: { ...world.chemicals, hypochlorite: 0 },
    };
    for (let hour = 1; hour <= 12; hour++) {
      const before = world.pools;
      world = advance(world, 3600, 10);
      for (const id of POOL_IDS)
        expect(world.pools[id].ph, `${id}, hour ${hour}`).toBeLessThan(
          before[id].ph,
        );
    }
    for (const id of POOL_IDS) {
      expect(world.pools[id].ph, id).toBeLessThan(6.6);
      expect(world.pools[id].ph, id).toBeGreaterThanOrEqual(6.5);
      expect(world.pools[id].freeChlorine, id).toBe(0);
    }
    // The acid store has gone on giving.
    expect(world.chemicals.acid).toBeLessThan(1000);
  });

  it('is refilled by a delivery', () => {
    let world = newWorld();
    world = { ...world, chemicals: { hypochlorite: 0, acid: 0 } };
    world = applyAction(world, {
      type: 'plant/delivery',
      chemical: 'acid',
      litres: 1000,
    });
    expect(world.chemicals.acid).toBe(1000);
  });
});
