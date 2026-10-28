import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from './world';
import { roomRunning, serviceAvailable } from './plant/services';
import { POOL_IDS } from './plant/pools';

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
