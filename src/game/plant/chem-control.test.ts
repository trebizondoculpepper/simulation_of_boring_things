import { describe, expect, it } from 'vite-plus/test';
import {
  BOOT_SECONDS,
  actOnChemControl,
  chemControlFaults,
  controllerRunning,
  newChemControlBox,
  stepChemControlBox,
  terminalComms,
} from './chem-control';
import type { ChemControlAction, ChemControlBox } from './chem-control';
import {
  DAY_TANKS,
  newChemicalDistribution,
  stepDistribution,
} from './chemical-distribution';
import type { ChemicalDistribution } from './chemical-distribution';
import { MIGRATIONS, deserialiseWorld } from '../save';
import { WORLD_VERSION, newWorld } from '../world';

const CAP = { hypochlorite: 12000, acid: 4000 };
const STORES = { hypochlorite: 10000, acid: 3000 };

/** Every day tank at `share` of full, none calling. */
const at = (share = 0.7): ChemicalDistribution => {
  const d = newChemicalDistribution();
  const fill = (c: 'hypochlorite' | 'acid') => ({
    ...d[c],
    tanks: d[c].tanks.map((t, i) => ({
      ...t,
      litres: DAY_TANKS[c][i].litres * share,
    })),
  });
  return { hypochlorite: fill('hypochlorite'), acid: fill('acid') };
};
const level = (
  d: ChemicalDistribution,
  i: number,
  share: number,
  c: 'hypochlorite' | 'acid' = 'hypochlorite',
): ChemicalDistribution => ({
  ...d,
  [c]: {
    ...d[c],
    tanks: d[c].tanks.map((t, k) =>
      k === i ? { ...t, litres: DAY_TANKS[c][k].litres * share } : t,
    ),
  },
});
const run = (
  d: ChemicalDistribution,
  seconds: number,
  running = true,
  step = 5,
) => {
  for (let t = 0; t < seconds; t += step)
    d = stepDistribution(d, STORES, CAP, {}, step, undefined, undefined, {
      running,
      now: t,
    }).distribution;
  return d;
};
const act = (
  d: ChemicalDistribution,
  a: ChemControlAction,
  box: ChemControlBox = newChemControlBox(),
  hall = true,
) => actOnChemControl(d, box, hall, 0, a);
const terminal = (
  d: ChemicalDistribution,
  command: Extract<ChemControlAction, { act: 'terminal' }>['command'],
  box?: ChemControlBox,
) =>
  act(
    d,
    { act: 'terminal', chemical: 'hypochlorite', tag: 'WH-OT1', command },
    box,
  ).distribution;

describe('the chemical transfer control box (prompt 091)', () => {
  it('gives each day tank today’s levels, 20% and 90%, in litres', () => {
    const d = newChemicalDistribution();
    expect(d.hypochlorite.tanks[0]).toMatchObject({ lowL: 60, highL: 270 });
    expect(d.acid.tanks[3]).toMatchObject({ lowL: 3, highL: 14 });
  });

  it('calls a tank at its own low and fills it to its own high', () => {
    // PL4's hypochlorite (30 l): low 12 l, high 20 l.
    let d = terminal(at(), { kind: 'set-low', tank: 3, litres: 12 });
    d = terminal(d, { kind: 'set-high', tank: 3, litres: 20 });
    d = level(d, 3, 0.35);
    d = run(d, 10);
    expect(d.hypochlorite.tanks[3].calling).toBe(true);
    d = run(d, 600);
    const litres = d.hypochlorite.tanks[3].litres;
    expect(litres).toBeGreaterThanOrEqual(20);
    expect(litres).toBeLessThan(21);
    expect(d.hypochlorite.tanks[3].calling).toBe(false);
    expect(d.hypochlorite.tanks[3].lastFilled).not.toBeNull();
  });

  it('refuses levels beyond their limits', () => {
    const d = at();
    expect(terminal(d, { kind: 'set-high', tank: 3, litres: 29 })).toBe(d);
    expect(terminal(d, { kind: 'set-low', tank: 3, litres: 2 })).toBe(d);
  });

  it('never serves an inhibited tank, even below its low, and ends a fill on STOP', () => {
    let d = level(at(), 0, 0.1);
    d = run(d, 10);
    expect(d.hypochlorite.serving).toBe(0);
    d = terminal(d, { kind: 'stop', tank: 0 });
    expect(d.hypochlorite.serving).toBeNull();
    d = run(d, 120);
    expect(d.hypochlorite.serving).toBeNull();
    expect(d.hypochlorite.tanks[0].calling).toBe(false);
    d = terminal(d, { kind: 'resume', tank: 0 });
    d = run(d, 10);
    expect(d.hypochlorite.serving).toBe(0);
  });

  it('FILL NOW calls a tank at once, to be filled to its high', () => {
    let d = terminal(at(0.5), { kind: 'fill-now', tank: 2 });
    d = run(d, 10);
    expect(d.hypochlorite.serving).toBe(2);
    d = run(d, 600);
    expect(d.hypochlorite.tanks[2].litres).toBeGreaterThanOrEqual(54);
    expect(d.hypochlorite.tanks[2].fillNow).toBe(false);
  });

  it('still trips on high-high, which is not settable', () => {
    const d = run(level(at(), 3, 0.99), 5);
    expect(d.hypochlorite.tripped).toBe(true);
  });

  it('stops AUTO filling with its controller down; HAND still works', () => {
    let d = run(level(at(), 0, 0.1), 60, false);
    expect(d.hypochlorite.serving).toBeNull();
    d = {
      ...d,
      hypochlorite: { ...d.hypochlorite, mode: 'hand', pick: 0, hoa: 'hand' },
    };
    const before = d.hypochlorite.tanks[0].litres;
    d = run(d, 60, false);
    expect(d.hypochlorite.serving).toBe(0);
    expect(d.hypochlorite.tanks[0].litres).toBeGreaterThan(before);
  });

  it('starts its controller after power-up, and restarts to clear a hang', () => {
    let box = stepChemControlBox(newChemControlBox(), false, 1);
    expect(controllerRunning(box, false)).toBe(false);
    box = stepChemControlBox(box, true, 1);
    expect(controllerRunning(box, true)).toBe(false);
    box = stepChemControlBox(box, true, BOOT_SECONDS);
    expect(controllerRunning(box, true)).toBe(true);
    box = act(at(), { act: 'hang' }, box).box;
    expect(controllerRunning(box, true)).toBe(false);
    expect(chemControlFaults(box, true).controllerFault).toBe(true);
    box = act(at(), { act: 'isolator', on: false }, box).box;
    box = stepChemControlBox(box, true, 0.1);
    box = act(at(), { act: 'isolator', on: true }, box).box;
    box = stepChemControlBox(box, true, BOOT_SECONDS);
    expect(box.hung).toBe(false);
    expect(controllerRunning(box, true)).toBe(true);
  });

  it('hears a terminal only while its link answers', () => {
    const d = at();
    const box = act(d, {
      act: 'link',
      chemical: 'hypochlorite',
      ok: false,
    }).box;
    expect(terminalComms(box, true, 'hypochlorite')).toBe(false);
    expect(terminalComms(box, true, 'acid')).toBe(true);
    expect(terminal(d, { kind: 'stop', tank: 0 }, box)).toBe(d);
    expect(chemControlFaults(box, true).commsLost.hypochlorite).toBe(true);
  });

  it('reads its faults from the world, for the annunciator and the bridge', () => {
    const ok = chemControlFaults(newChemControlBox(), true);
    expect(ok).toEqual({
      supplyLost: false,
      mcbTripped: false,
      controllerFault: false,
      commsLost: { hypochlorite: false, acid: false },
      stopped: false,
    });
    expect(chemControlFaults(newChemControlBox(), false)).toMatchObject({
      supplyLost: true,
      stopped: true,
    });
    const tripped = act(at(), { act: 'mcb', tripped: true }).box;
    expect(chemControlFaults(tripped, true)).toMatchObject({
      mcbTripped: true,
      supplyLost: false,
      stopped: true,
    });
  });

  it('migrates a save’s day tanks to their default levels', () => {
    const old = newWorld() as unknown as Record<string, unknown>;
    const strip = (line: {
      tanks: { litres: number; calling: boolean }[];
    }) => ({
      ...line,
      tanks: line.tanks.map(({ litres, calling }) => ({ litres, calling })),
    });
    const w = newWorld();
    const saved = {
      ...old,
      distribution: {
        hypochlorite: strip(w.distribution.hypochlorite),
        acid: strip(w.distribution.acid),
      },
    };
    delete (saved as Record<string, unknown>).chemControl;
    const migrated = MIGRATIONS[56](saved) as typeof w;
    expect(migrated.distribution.acid.tanks[1]).toMatchObject({
      lowL: 100,
      highL: 450,
      inhibited: false,
      fillNow: false,
      lastFilled: null,
    });
    const loaded = deserialiseWorld(
      JSON.stringify({
        format: 'pool-plant-save',
        version: WORLD_VERSION - 1,
        savedAt: 0,
        world: saved,
      }),
    );
    if (loaded.ok) expect(loaded.world.chemControl.isolator).toBe(true);
  });
});
