import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from './world';
import { roomRunning, serviceAvailable } from './plant/services';

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

  it('with the hypochlorite gone but the acid dosing, drives the pH down', () => {
    let world = newWorld();
    world = {
      ...world,
      chemicals: { ...world.chemicals, hypochlorite: 0 },
    };
    world = advance(world, 12 * 3600, 10);
    expect(world.pools.pool_02.ph).toBeLessThan(7.2);
    expect(world.pools.pool_02.freeChlorine).toBeLessThan(1.4);
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
