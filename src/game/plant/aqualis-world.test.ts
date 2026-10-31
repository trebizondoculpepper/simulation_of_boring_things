import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { MIGRATIONS, deserialiseWorld, serialiseWorld } from '../save';
import {
  TRIO_POOLS,
  TRIO_SAMPLE_VALVES,
  seededIntegral,
  trioAlarms,
  trioSignals,
} from './aqualis-world';
import type { TrioAction, TrioPool } from './aqualis-world';
import { SAMPLE_LOSS_DELAY } from './aqualis-controller';
import { WATCHDOG_S } from './aqualis-os';
import { installedValveByCommandId } from './installed-valves';
import { SETTLED } from './water-treatment';
import {
  TRIO_WINDOWS,
  TRIO_WINDOW_TEXT,
  trioWater,
  trioWindows,
} from './aqualis-annunciator';

/**
 * The Trios in the world (mission 114, step 3), fast: how each starts,
 * what it sends, its supply and sample, a crash's watchdog, and the save.
 * The closed loop over days is `aqualis-world.slow.test.ts`.
 */

const act = (w: World, pool: TrioPool, action: TrioAction) =>
  applyAction(w, { type: 'aqualis', pool, action });

describe('the Trios as a new world has them', () => {
  it('runs one for the Lounge and one for the Olympic, in AUTO, powered, its watchdog working', () => {
    const w = newWorld();
    expect(Object.keys(w.aqualis).sort()).toEqual(['pool_01', 'pool_02']);
    for (const id of TRIO_POOLS) {
      const t = w.aqualis[id];
      expect(t.os.phase).toBe('running');
      expect(t.selector).toBe('auto');
      expect(t.isolator && t.mainSwitch && t.watchdog).toBe(true);
      expect(t.firstAid).toBeNull();
      // Its targets the defaults (1.3 mg/l, pH 7.3); its dynamics the water in circulation.
      expect(t.settings.targets.freeChlorine.set).toBe(1.3);
      expect(t.settings.targets.ph.set).toBe(7.3);
    }
    expect(w.aqualis.pool_01.settings.dynamics).toEqual({
      volumeM3: 150,
      flowM3h: 90,
    });
    expect(w.aqualis.pool_02.settings.dynamics).toEqual({
      volumeM3: 2716,
      flowM3h: 620,
    });
  });

  it('carries on the old controller’s dose: its integral seeded from it', () => {
    const w = newWorld();
    for (const id of TRIO_POOLS) {
      expect(w.aqualis[id].controller.integral).toBeCloseTo(
        seededIntegral(id, w.treatment.circuits[id].control),
        9,
      );
      expect(w.aqualis[id].controller.integral).toBeGreaterThan(0);
    }
    expect(SETTLED.pool_01.integral).toBeGreaterThan(0);
  });

  it('settles its cell on its pool’s water at once: readings, sample flowing', () => {
    const w = advance(newWorld(), 60, 10);
    for (const id of TRIO_POOLS) {
      const t = w.aqualis[id];
      expect(t.readings.freeChlorine).toBeCloseTo(
        w.treatment.circuits[id].tank.freeChlorine,
        1,
      );
      expect(t.sample.flowing).toBe(true);
      expect(t.inhibit).toBeNull();
      expect(t.channels.co2.status).toEqual({ kind: 'unconnected' });
      expect(t.channels.hypochlorite.status).toEqual({ kind: 'online' });
      expect(t.channels.acid.status).toEqual({ kind: 'online' });
    }
  });

  it('has the sample’s three valves in the world, open', () => {
    const w = newWorld();
    for (const id of TRIO_POOLS)
      for (const tag of TRIO_SAMPLE_VALVES[id]) {
        const v = installedValveByCommandId(tag);
        expect(v, tag).toBeDefined();
        expect(w.installedValves[v!.assetId]).toBe(true);
      }
  });
});

describe('a Trio in the world', () => {
  it('drives its pumps through its ports: each delivers its demand’s share of its most', () => {
    const w = advance(newWorld(), 600, 10);
    for (const id of TRIO_POOLS) {
      const s = trioSignals(w.aqualis[id]);
      expect(s.hypochlorite.release).toBe(true);
      expect(s.hypochlorite.demand).toBeGreaterThan(0.05);
      // The DMX 1602, 2.1 l/h at full signal.
      expect(w.dosingPumps[id].hypochlorite.meanLh).toBeCloseTo(
        s.hypochlorite.demand * 2.1,
        0,
      );
      expect(w.aqualis[id].channels.hypochlorite.delivering).toBeCloseTo(
        w.dosingPumps[id].hypochlorite.meanLh,
        1,
      );
      expect(s.co2.demand).toBe(0);
    }
    // The Olympic's undersized DMX (mission 101) is asked for most of it.
    expect(trioSignals(w.aqualis.pool_02).hypochlorite.demand).toBeGreaterThan(
      0.5,
    );
  });

  it('at OFF releases nothing, and its pumps stop', () => {
    let w = act(advance(newWorld(), 600, 10), 'pool_01', {
      act: 'selector',
      selector: 'off',
    });
    expect(trioSignals(w.aqualis.pool_01).hypochlorite.release).toBe(false);
    w = advance(w, 600, 10);
    expect(w.aqualis.pool_01.inhibit).toBe('selector-off');
    expect(w.dosingPumps.pool_01.hypochlorite.meanLh).toBeLessThan(0.01);
    expect(w.dosingPumps.pool_01.acid.meanLh).toBeLessThan(0.01);
  });

  it('loses its sample with a sample valve shut: SAMPLE FLOW LOW at once, dosing stopped after its delay', () => {
    const valve = installedValveByCommandId('PL1-SP1-IV1')!;
    let w = applyAction(advance(newWorld(), 60, 10), {
      type: 'plant/valve',
      id: valve.assetId,
      open: false,
    });
    w = advance(w, 30, 10);
    const t = w.aqualis.pool_01;
    expect(t.sample.flowing).toBe(false);
    expect(trioAlarms(t).map((a) => a.id)).toContain('sample-flow-low');
    expect(t.inhibit).toBeNull();
    w = advance(w, SAMPLE_LOSS_DELAY + 20, 10);
    expect(w.aqualis.pool_01.inhibit).toBe('sample-flow-lost');
    expect(trioSignals(w.aqualis.pool_01).hypochlorite.release).toBe(false);
    // The Olympic's own sample is untouched.
    expect(w.aqualis.pool_02.sample.flowing).toBe(true);
  });

  it('switched off at its isolator stops; on again, it boots, then runs a new controller', () => {
    let w = act(advance(newWorld(), 60, 10), 'pool_01', {
      act: 'isolator',
      on: false,
    });
    w = advance(w, 1, 0.1);
    expect(w.aqualis.pool_01.os.phase).toBe('off');
    expect(trioSignals(w.aqualis.pool_01).hypochlorite).toEqual({
      release: false,
      demand: 0,
    });
    w = act(w, 'pool_01', { act: 'isolator', on: true });
    w = advance(w, 1, 0.1);
    expect(w.aqualis.pool_01.os.phase).toBe('booting');
    expect(w.aqualis.pool_01.bootTotal).toBeGreaterThan(20);
    expect(trioSignals(w.aqualis.pool_01).hypochlorite.release).toBe(false);
    w = advance(w, w.aqualis.pool_01.bootTotal + 1, 0.5);
    expect(w.aqualis.pool_01.os.phase).toBe('running');
    // Its integral is lost with the old run's memory.
    expect(w.aqualis.pool_01.controller.integral).toBeLessThan(0.05);
    // Its room's supply lost does as much.
    const cut = applyAction(w, {
      type: 'plant/feeder',
      room: 'plant_pool_01',
      on: false,
    });
    expect(advance(cut, 1, 0.1).aqualis.pool_01.os.phase).toBe('off');
  });

  it('crashed with its watchdog working, drops its release and raises CONTROLLER FAULT', () => {
    let w = act(advance(newWorld(), 600, 10), 'pool_02', {
      act: 'crash',
      kind: 'stop',
      seed: 3,
    });
    w = advance(w, WATCHDOG_S + 0.5, 0.1);
    const t = w.aqualis.pool_02;
    expect(t.os.phase).toBe('crashed');
    expect(trioSignals(t).hypochlorite).toEqual({ release: false, demand: 0 });
    expect(trioAlarms(t).map((a) => a.id)).toEqual(['controller-fault']);
  });

  it('crashed with its watchdog failing, holds its outputs and says nothing', () => {
    let w = act(advance(newWorld(), 600, 10), 'pool_02', {
      act: 'watchdog',
      works: false,
    });
    const before = trioSignals(w.aqualis.pool_02);
    w = act(w, 'pool_02', { act: 'crash', kind: 'stop', seed: 3 });
    w = advance(w, 60, 0.5);
    expect(trioSignals(w.aqualis.pool_02)).toEqual(before);
    expect(trioAlarms(w.aqualis.pool_02)).toEqual([]);
  });

  it('crashed in a glitch, lurches its outputs from burst to burst', () => {
    let w = act(advance(newWorld(), 600, 10), 'pool_01', {
      act: 'watchdog',
      works: false,
    });
    w = act(w, 'pool_01', { act: 'crash', kind: 'glitch', seed: 11 });
    const seen = new Set<number>();
    for (let i = 0; i < 60; i++) {
      w = advance(w, 1, 0.5);
      seen.add(trioSignals(w.aqualis.pool_01).hypochlorite.demand);
    }
    expect(seen.size).toBeGreaterThan(2);
    expect(trioSignals(w.aqualis.pool_01).hypochlorite.release).toBe(true);
  });
});

describe('the Trios in a save', () => {
  it('migrates a version 60 save: the Trios added, seeded from its old controllers', () => {
    const w = advance(newWorld(), 3600, 10);
    const { aqualis: _gone, ...old } = w;
    const migrated = MIGRATIONS[60](old) as World;
    for (const id of TRIO_POOLS) {
      expect(migrated.aqualis[id].os.phase).toBe('running');
      expect(migrated.aqualis[id].selector).toBe('auto');
      expect(migrated.aqualis[id].controller.integral).toBeCloseTo(
        seededIntegral(id, w.treatment.circuits[id].control),
        9,
      );
      expect(migrated.aqualis[id].readings.freeChlorine).toBeCloseTo(
        w.treatment.circuits[id].tank.freeChlorine,
        9,
      );
    }
    const text = JSON.stringify({
      format: 'pool-plant-save',
      version: 60,
      savedAt: 1,
      world: old,
    });
    const loaded = deserialiseWorld(text);
    expect(loaded.ok).toBe(true);
    if (loaded.ok)
      expect(loaded.world.aqualis.pool_02.os.phase).toBe('running');
  });

  it('keeps a crash, a boot under way and a First Aid programme through a reload', () => {
    let w = act(advance(newWorld(), 600, 10), 'pool_02', {
      act: 'crash',
      kind: 'glitch',
      seed: 5,
    });
    w = act(w, 'pool_01', { act: 'firstAid', programme: 'formed-stool' });
    w = act(w, 'pool_01', { act: 'mainSwitch', on: false });
    w = advance(w, 0.1, 0.1);
    w = act(w, 'pool_01', { act: 'mainSwitch', on: true });
    w = advance(w, 2, 0.1);
    expect(w.aqualis.pool_01.os.phase).toBe('booting');
    const loaded = deserialiseWorld(serialiseWorld(w, 0));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.world.aqualis.pool_02.os.crash).toEqual(
      w.aqualis.pool_02.os.crash,
    );
    expect(loaded.world.aqualis.pool_01.os.boot).toEqual(
      w.aqualis.pool_01.os.boot,
    );
    // A programme running survives too.
    let f = act(advance(newWorld(), 60, 10), 'pool_01', {
      act: 'firstAid',
      programme: 'formed-stool',
    });
    f = advance(f, 20, 10);
    const reloaded = deserialiseWorld(serialiseWorld(f, 0));
    expect(reloaded.ok && reloaded.world.aqualis.pool_01.firstAid).toEqual(
      f.aqualis.pool_01.firstAid,
    );
    expect(f.aqualis.pool_01.firstAid).not.toBeNull();
  });
});

describe('the Trios’ windows for their annunciators', () => {
  it('lights DOSING INHIBITED and DOSING OFF-LINE as their causes come', () => {
    let w = advance(newWorld(), 60, 10);
    expect(trioWindows(w.aqualis, 'pool_01')).toEqual([]);
    w = act(w, 'pool_01', { act: 'selector', selector: 'off' });
    w = advance(w, 10, 10);
    expect(trioWindows(w.aqualis, 'pool_01')).toEqual(['dosing-inhibit']);
    w = act(w, 'pool_01', { act: 'selector', selector: 'auto' });
    w = applyAction(w, {
      type: 'dosing-pump',
      action: { act: 'key', pool: 'pool_01', chemical: 'acid', key: 'mode' },
    });
    w = advance(w, 20, 10);
    expect(trioWindows(w.aqualis, 'pool_01')).toEqual(['dosing-offline']);
    expect(trioWater(w.aqualis, 'pool_01').freeChlorine).toBe(
      w.aqualis.pool_01.readings.freeChlorine,
    );
  });

  it('lights CONTROLLER FAULT once the watchdog trips, and nothing else', () => {
    let w = act(advance(newWorld(), 60, 10), 'pool_02', {
      act: 'crash',
      kind: 'stop',
      seed: 1,
    });
    w = advance(w, 3, 0.5);
    expect(trioWindows(w.aqualis, 'pool_02')).toEqual(['controller-fault']);
    expect(Object.keys(TRIO_WINDOW_TEXT).sort()).toEqual(
      [...new Set([...TRIO_WINDOWS.pool_01, ...TRIO_WINDOWS.pool_02])].sort(),
    );
  });
});
