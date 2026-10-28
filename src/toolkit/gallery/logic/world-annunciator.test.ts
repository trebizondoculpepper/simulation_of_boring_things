import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../../../game/world';
import type { World, WorldAction } from '../../../game/world';
import { bridgeAnnunciator, worldAnnunciator } from './world-annunciator';
import {
  LOCATIONS,
  LOCATION_ANNUNCIATORS,
  unacceptedLocationAlarms,
} from '../../../game/plant/location-annunciators';
import { unacceptedAlarms } from '../../../game/annunciator';
import { ANNUNCIATOR_ALARMS } from './control-room-demo';

/** A world store's least: its world and dispatch. */
const storeOf = (world: World) => {
  const store = {
    world: { value: world },
    dispatch: (action: WorldAction) =>
      (store.world.value = applyAction(store.world.value, action)),
  };
  return store;
};

const faulted = () =>
  advance(
    applyAction(newWorld(), {
      type: 'plant/feeder',
      room: 'plant_pool_02',
      on: false,
    }),
    120,
    1,
  );

describe('an annunciator on the world’s', () => {
  it('shows the world’s windows in ANNUNCIATOR_ALARMS order', () => {
    const board = worldAnnunciator(storeOf(faulted()));
    const i = ANNUNCIATOR_ALARMS.indexOf('flow-low');
    expect(board.states).toHaveLength(ANNUNCIATOR_ALARMS.length);
    expect(board.states[i]).toBe('flashing');
  });

  it('accepted at one board, is accepted at another', () => {
    const store = storeOf(faulted());
    const bridge = worldAnnunciator(store);
    const old = worldAnnunciator(store);
    bridge.acknowledge();
    expect(old.states).not.toContain('flashing');
    expect(old.states[ANNUNCIATOR_ALARMS.indexOf('flow-low')]).toBe('steady');
  });

  it('accepts only the windows asked, by index', () => {
    const store = storeOf(faulted());
    const board = worldAnnunciator(store);
    const i = ANNUNCIATOR_ALARMS.indexOf('flow-low');
    const others = board.states.flatMap((s, j) =>
      s === 'flashing' && j !== i ? [j] : [],
    );
    board.acknowledge([i]);
    expect(board.states[i]).toBe('steady');
    for (const j of others) expect(board.states[j]).toBe('flashing');
  });

  it('lights every window on LAMP TEST, its own', () => {
    const board = worldAnnunciator(storeOf(newWorld()));
    board.test = true;
    expect(board.lit(0).every(Boolean)).toBe(true);
    board.test = false;
    expect(board.lit(0).some(Boolean)).toBe(false);
  });
});

describe('the bridge’s annunciator (mission 099)', () => {
  it('carries every location’s windows after the main one’s, and ACCEPT there accepts them all', () => {
    const store = storeOf(faulted());
    const bridge = bridgeAnnunciator(store);
    const locations = LOCATIONS.reduce(
      (n, id) => n + LOCATION_ANNUNCIATORS[id].alarms.length,
      0,
    );
    expect(bridge.states).toHaveLength(ANNUNCIATOR_ALARMS.length + locations);
    // The Olympic's room power lost: its own board's window flashes too.
    expect(unacceptedLocationAlarms(store.world.value)).toBeGreaterThan(0);
    bridge.acknowledge();
    expect(bridge.states).not.toContain('flashing');
    expect(unacceptedLocationAlarms(store.world.value)).toBe(0);
    const olympic = store.world.value.locationAnnunciators.pool_02;
    expect(olympic.windows['power-fail']).toBe('steady');
  });

  it('accepts a location’s windows by index as its own board’s ACCEPT', () => {
    const store = storeOf(faulted());
    const bridge = bridgeAnnunciator(store);
    const from =
      ANNUNCIATOR_ALARMS.length + LOCATION_ANNUNCIATORS.pool_01.alarms.length;
    const i = from + LOCATION_ANNUNCIATORS.pool_02.alarms.indexOf('power-fail');
    expect(bridge.states[i]).toBe('flashing');
    bridge.acknowledge([i]);
    expect(bridge.states[i]).toBe('steady');
    // The main board's windows not asked stay flashing.
    expect(
      unacceptedAlarms(store.world.value.annunciator).length,
    ).toBeGreaterThan(0);
  });
});
