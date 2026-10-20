import { describe, expect, it } from 'vite-plus/test';
import {
  CATCH_UP_LIMIT,
  catchUpSeconds,
  deserialiseWorld,
  fillDefaults,
  serialiseWorld,
} from './save';
import { applyAction, newWorld } from './world';

describe('a save', () => {
  it('brings back the world it saved', () => {
    const world = applyAction(newWorld(), { type: 'demo/set', on: true });
    const loaded = deserialiseWorld(serialiseWorld(world, 1000));
    expect(loaded).toEqual({ ok: true, world, savedAt: 1000 });
  });

  it('refuses what is not a save of ours, and saves from a newer build', () => {
    expect(deserialiseWorld('{not json').ok).toBe(false);
    expect(deserialiseWorld('{"format":"other"}').ok).toBe(false);
    const newer = JSON.stringify({
      format: 'pool-plant-save',
      version: 99,
      savedAt: 0,
      world: {},
    });
    expect(deserialiseWorld(newer)).toEqual({
      ok: false,
      reason: 'the save is from a newer version (99)',
    });
  });

  it('fills fields an old save lacks from the defaults, and drops ones no longer used', () => {
    const old = JSON.stringify({
      format: 'pool-plant-save',
      version: 1,
      savedAt: 5,
      world: { time: 40, demo: { on: true }, retired: 3 },
    });
    const loaded = deserialiseWorld(old);
    expect(loaded.ok && loaded.world).toEqual({
      time: 40,
      demo: { on: true, presses: 0 },
    });
  });

  it('keeps a field only where its type matches', () => {
    expect(fillDefaults({ a: 'x', b: Number.NaN }, { a: 1, b: 2 })).toEqual({
      a: 1,
      b: 2,
    });
  });

  it('catches up the time it was away, up to an hour', () => {
    expect(catchUpSeconds(0, 90_000)).toBe(90);
    expect(catchUpSeconds(0, 10 * 3600_000)).toBe(CATCH_UP_LIMIT);
    expect(catchUpSeconds(5000, 0)).toBe(0);
  });
});
