import { describe, expect, it } from 'vite-plus/test';
import {
  CATCH_UP_LIMIT,
  catchUpSeconds,
  MIGRATIONS,
  deserialiseWorld,
  fillDefaults,
  serialiseWorld,
} from './save';
import { WORLD_VERSION, applyAction, newWorld } from './world';
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
    // A current save lacking fields (an older one is a new world: below).
    const old = JSON.stringify({
      format: 'pool-plant-save',
      version: WORLD_VERSION,
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
      distribution: newWorld().distribution,
      wetHall: newWorld().wetHall,
      bathers: newWorld().bathers,
      startup: -1,
      lighting: newWorld().lighting,
      centralBattery: newWorld().centralBattery,
      sewer: newWorld().sewer,
      makeUpRecord: newWorld().makeUpRecord,
      ambient: newWorld().ambient,
      gas: newWorld().gas,
      identifiedPlant: newWorld().identifiedPlant,
      installedValves: newWorld().installedValves,
      loungeValvePositions: newWorld().loungeValvePositions,
      loungeFilters: newWorld().loungeFilters,
      olympic: newWorld().olympic,
      olympicTank: newWorld().olympicTank,
      airHandling: newWorld().airHandling,
      motors: newWorld().motors,
      jacuzzi: newWorld().jacuzzi,
      jacuzziCabinet: newWorld().jacuzziCabinet,
      spaFilters: newWorld().spaFilters,
      cabinets: newWorld().cabinets,
      jacuzziFibreIlluminator: newWorld().jacuzziFibreIlluminator,
      boilerGas: newWorld().boilerGas,
      music: newWorld().music,
      fireAlarm: newWorld().fireAlarm,
      washOTron: newWorld().washOTron,
      intake: newWorld().intake,
      controlRoomMode: 'old',
      annunciator: newWorld().annunciator,
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
    // Through the migrations from version 13 to 26 (a save older than 27
    // loads as a new world, so they are applied here directly).
    let world: unknown = {
      ...oldWorld,
      pools: {
        ...oldWorld.pools,
        pool_04: { ...oldWorld.pools.pool_04, drainDown: true, makeUp: false },
      },
    };
    for (let v = 13; v < 26; v++) world = MIGRATIONS[v](world);
    const migrated = fillDefaults(world, newWorld());
    expect(partOpen(migrated.identifiedPlant, FOOTBATH.drain)).toBe(true);
    expect(partOpen(migrated.identifiedPlant, FOOTBATH.return)).toBe(false);
    expect(partOpen(migrated.identifiedPlant, FOOTBATH.makeUp)).toBe(false);
  });

  it('throws away a save from before the jacuzzi was built from its model (version 27)', () => {
    const old = JSON.stringify({
      format: 'pool-plant-save',
      version: 26,
      savedAt: 5,
      world: { ...newWorld(), time: 400 },
    });
    const loaded = deserialiseWorld(old);
    expect(loaded.ok && loaded.world).toEqual(newWorld());
  });

  it('brings a save from before the CONTROL ROOM MODE knob up with it at OLD', () => {
    const { controlRoomMode: _none, ...before } = newWorld();
    const old = JSON.stringify({
      format: 'pool-plant-save',
      version: 46,
      savedAt: 5,
      world: { ...before, time: 400 },
    });
    const loaded = deserialiseWorld(old);
    expect(loaded.ok && loaded.world.controlRoomMode).toBe('old');
    expect(loaded.ok && loaded.world.time).toBe(400);
    expect(MIGRATIONS[46]({ time: 1 })).toEqual({
      time: 1,
      controlRoomMode: 'old',
    });
  });

  it('brings a save from before the world’s annunciator up with every window dark', () => {
    const { annunciator: _none, ...before } = newWorld();
    const old = JSON.stringify({
      format: 'pool-plant-save',
      version: 48,
      savedAt: 5,
      world: { ...before, time: 400 },
    });
    const loaded = deserialiseWorld(old);
    expect(loaded.ok && loaded.world.annunciator).toEqual(
      newWorld().annunciator,
    );
    expect(loaded.ok && loaded.world.time).toBe(400);
  });

  it('keeps a field only where its type matches', () => {
    expect(fillDefaults({ a: 'x', b: Number.NaN }, { a: 1, b: 2 })).toEqual({
      a: 1,
      b: 2,
    });
  });

  it('keeps a saved value where the default is null (a starter’s command)', () => {
    expect(
      fillDefaults(
        { a: true, b: 2, c: { x: 1 } },
        { a: null, b: null, c: null },
      ),
    ).toEqual({ a: true, b: 2, c: null });
    const started = applyAction(newWorld(), {
      type: 'motor/starter',
      tag: 'P-101B',
      action: { act: 'start' },
    });
    const loaded = deserialiseWorld(serialiseWorld(started, 0));
    expect(loaded.ok && loaded.world.motors.starters['P-101B'].command).toBe(
      true,
    );
  });

  it('catches up the time it was away, up to an hour', () => {
    expect(catchUpSeconds(0, 90_000)).toBe(90);
    expect(catchUpSeconds(0, 10 * 3600_000)).toBe(CATCH_UP_LIMIT);
    expect(catchUpSeconds(5000, 0)).toBe(0);
  });
});
