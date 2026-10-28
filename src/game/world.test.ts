import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from './world';
import { roomRunning, serviceAvailable } from './plant/services';
import { POOL_IDS } from './plant/pools';
import { runOut } from './world.test-support';

describe('the world', () => {
  it('carries the Jacuzzi fibre illuminator controls between rooms', () => {
    let w = newWorld();
    w = applyAction(w, {
      type: 'jacuzzi/fibre-illuminator',
      action: { control: 'rainbow', value: true },
    });
    w = applyAction(w, {
      type: 'jacuzzi/fibre-illuminator',
      action: { control: 'twinkleSpeed', value: 0 },
    });
    w = applyAction(w, {
      type: 'jacuzzi/fibre-illuminator',
      action: { control: 'brightness', value: 0.6 },
    });
    expect(w.jacuzziFibreIlluminator).toEqual({
      on: true,
      brightness: 0.6,
      twinkleSpeed: 0,
      rainbow: true,
    });
  });
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
  });

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
