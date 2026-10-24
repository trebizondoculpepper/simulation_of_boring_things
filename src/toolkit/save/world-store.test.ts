import { afterEach, expect, it, vi } from 'vite-plus/test';
import { newWorld, applyAction } from '../../game/world';
import { deserialiseWorld, serialiseWorld } from '../../game/save';
import { worldStore } from './world-store';
import { createGameSession } from './game-session';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('Continue preserves a saved fault and position; New Game resets and saves a nominal world', () => {
  vi.useFakeTimers();
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  };
  vi.stubGlobal('window', { localStorage: storage, addEventListener: vi.fn() });
  vi.stubGlobal('document', { addEventListener: vi.fn() });
  vi.stubGlobal('navigator', {});
  const damaged = applyAction(newWorld(), { type: 'plant/full-off' });
  damaged.pools.pool_03.level = -0.5;
  damaged.pools.pool_03.temperature = 20;
  damaged.pools.pool_03.ph = 8.2;
  storage.setItem(
    'pool-plant:new-game-test',
    serialiseWorld(damaged, Date.now()),
  );
  const store = worldStore('new-game-test');
  const session = createGameSession(store, storage);
  const position = '?room=plant_pool_03&x=1&y=2&z=3&yaw=90&pitch=-10&zoom=1';
  session.remember(position);
  const reopened = createGameSession(store, storage);
  expect(reopened.resume()).toBe(position);
  expect(store.world.value).toEqual(damaged);
  expect(reopened.start()).toBe('?room=pool_04');
  expect(store.world.value).toEqual(newWorld());
  const saved = deserialiseWorld(storage.getItem('pool-plant:new-game-test')!);
  expect(saved.ok && saved.world).toEqual(newWorld());
  expect(createGameSession(store, storage).resume()).toBe('?room=pool_04');
});

it('does not replay scenario parameters or bad coordinates on Continue', () => {
  const reset = vi.fn();
  const session = createGameSession({ reset }, null);
  expect(session.resume()).toBeNull();
  session.remember('?room=pool_02&x=NaN&z=3&scenario=cold');
  expect(session.resume()).toBe('?room=pool_02&z=3');
  expect(reset).not.toHaveBeenCalled();
  session.start();
  expect(reset).toHaveBeenCalledTimes(1);
});
