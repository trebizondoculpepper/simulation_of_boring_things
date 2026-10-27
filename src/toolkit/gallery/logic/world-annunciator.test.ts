import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../../../game/world';
import type { World, WorldAction } from '../../../game/world';
import { worldAnnunciator } from './world-annunciator';
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
