import { describe, expect, it } from 'vite-plus/test';
import {
  CATCH_UP_LIMIT,
  catchUpSeconds,
  deserialiseWorld,
  fillDefaults,
  serialiseWorld,
} from './save';
import { applyAction, newWorld } from './world';
import { FOOTBATH, partOpen } from './plant/identification';

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
      plant: newWorld().plant,
      pools: newWorld().pools,
      chemicals: newWorld().chemicals,
      wetHall: newWorld().wetHall,
      bathers: newWorld().bathers,
      startup: -1,
      lighting: newWorld().lighting,
      ambient: newWorld().ambient,
      gas: newWorld().gas,
      identifiedPlant: newWorld().identifiedPlant,
      installedValves: newWorld().installedValves,
      olympic: newWorld().olympic,
    });
  });

  it('drops the states of valves no longer installed (the Olympic plant room, cleared for its redo)', () => {
    const world = newWorld();
    const old = JSON.stringify({
      format: 'pool-plant-save',
      version: 15,
      savedAt: 5,
      // valve-0010 was the Olympic's filter 1 inlet valve (PL2-F1-IV1).
      world: {
        ...world,
        installedValves: { ...world.installedValves, 'valve-0010': false },
      },
    });
    const loaded = deserialiseWorld(old);
    expect(loaded.ok && loaded.world.installedValves).toEqual(
      world.installedValves,
    );
  });

  it('migrates an old footbath drain and make-up lineup to named valves', () => {
    const { identifiedPlant: _oldTree, ...oldWorld } = newWorld();
    const old = JSON.stringify({
      format: 'pool-plant-save',
      version: 13,
      savedAt: 1,
      world: {
        ...oldWorld,
        pools: {
          ...oldWorld.pools,
          pool_04: {
            ...oldWorld.pools.pool_04,
            drainDown: true,
            makeUp: false,
          },
        },
      },
    });
    const loaded = deserialiseWorld(old);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(partOpen(loaded.world.identifiedPlant, FOOTBATH.drain)).toBe(true);
    expect(partOpen(loaded.world.identifiedPlant, FOOTBATH.return)).toBe(false);
    expect(partOpen(loaded.world.identifiedPlant, FOOTBATH.makeUp)).toBe(false);
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
