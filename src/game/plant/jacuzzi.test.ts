import { describe, expect, it } from 'vite-plus/test';
import {
  advance,
  applyAction,
  jacuzziCirculating,
  jacuzziDischarging,
  jacuzziRuns,
  newWorld,
} from '../world';
import type { World } from '../world';
import type { JacuzziAction } from './jacuzzi';
import { JACUZZI_VALVES } from './jacuzzi';
import { dosedVolumes } from './pools';

const act = (w: World, action: JacuzziAction) =>
  applyAction(w, { type: 'jacuzzi', action });
const start = advance(newWorld(), 10, 1);

describe('the jacuzzi’s jets and air', () => {
  it('start and stop from the cabinet’s buttons, each on its own', () => {
    let w = act(start, { act: 'toggle', what: 'jets' });
    expect(jacuzziRuns(w)).toEqual({ jets: true, air: false });
    w = act(w, { act: 'toggle', what: 'air' });
    expect(jacuzziRuns(w)).toEqual({ jets: true, air: true });
    w = act(w, { act: 'toggle', what: 'jets' });
    expect(jacuzziRuns(w)).toEqual({ jets: false, air: true });
  });

  it('run ten minutes from the wall plate’s START, and the cabinet’s lamps follow', () => {
    let w = act(start, { act: 'start' });
    expect(jacuzziRuns(w)).toEqual({ jets: true, air: true });
    w = advance(w, 590, 1);
    expect(jacuzziRuns(w).jets).toBe(true);
    w = advance(w, 20, 1);
    expect(jacuzziRuns(w)).toEqual({ jets: false, air: false });
  });

  it('stop at once on the wall plate’s STOP, however they were started', () => {
    let w = act(start, { act: 'toggle', what: 'air' });
    w = act(w, { act: 'stop' });
    expect(jacuzziRuns(w)).toEqual({ jets: false, air: false });
  });

  it('run only while the jacuzzi circulates: not with its cabinet isolated', () => {
    let w = act(start, { act: 'start' });
    w = applyAction(w, {
      type: 'plant/isolator',
      name: 'Jacuzzi cabinet isolator',
      on: false,
    });
    expect(jacuzziRuns(w)).toEqual({ jets: false, air: false });
  });

  it('drain away while its drain valve is open, gurgling until the tub is shut off or empty', () => {
    expect(jacuzziDischarging(start)).toBe(false);
    const open = applyAction(start, {
      type: 'pool/drain-down',
      pool: 'pool_03',
      open: true,
    });
    let w = advance(open, 60, 1);
    expect(jacuzziDischarging(w)).toBe(true);
    expect(w.pools.pool_03.level).toBeLessThan(start.pools.pool_03.level);
    w = applyAction(w, {
      type: 'pool/drain-down',
      pool: 'pool_03',
      open: false,
    });
    expect(jacuzziDischarging(w)).toBe(false);
  });

  it('cannot be started until the tub is full, and cut out when it no longer is', () => {
    const low: World = {
      ...start,
      pools: {
        ...start.pools,
        pool_03: { ...start.pools.pool_03, level: -0.2 },
      },
    };
    let w = act(low, { act: 'start' });
    expect(jacuzziRuns(w)).toEqual({ jets: false, air: false });
    w = act(w, { act: 'toggle', what: 'jets' });
    expect(w.jacuzzi.jets).toBe(false);
    // Running when full, they cut out once the level falls, and stay off.
    w = act(start, { act: 'start' });
    expect(jacuzziRuns(w)).toEqual({ jets: true, air: true });
    w = advance({ ...w, pools: low.pools }, 1, 1);
    expect(jacuzziRuns(w)).toEqual({ jets: false, air: false });
    expect(w.jacuzzi).toEqual({ jets: false, air: false, until: -1 });
  });

  const shut = (w: World, ...keys: (keyof typeof JACUZZI_VALVES)[]): World => ({
    ...w,
    installedValves: {
      ...w.installedValves,
      ...Object.fromEntries(keys.map((k) => [JACUZZI_VALVES[k], false])),
    },
  });

  it('stops its circulation pump, and its dosing, with its overflow and return valves shut', () => {
    let w = act(start, { act: 'start' });
    expect(jacuzziCirculating(w)).toBe(true);
    w = shut(w, 'overflow', 'return');
    expect(jacuzziCirculating(w)).toBe(false);
    expect(jacuzziRuns(w)).toEqual({ jets: false, air: false });
    const dosed = (x: World) =>
      dosedVolumes(
        x.pools,
        x.plant,
        undefined,
        true,
        x.motors,
        x.installedValves,
      ).hypochlorite;
    expect(dosed(w)).toBeLessThan(dosed(start));
    // Either one shut is enough.
    expect(jacuzziCirculating(shut(start, 'overflow'))).toBe(false);
    expect(jacuzziCirculating(shut(start, 'return'))).toBe(false);
  });

  it('runs its jets and air only with their own valves open', () => {
    const w = act(start, { act: 'start' });
    expect(jacuzziRuns(shut(w, 'jetsSuction'))).toEqual({
      jets: false,
      air: true,
    });
    expect(jacuzziRuns(shut(w, 'air'))).toEqual({ jets: true, air: false });
  });

  it('drains by gravity, its valve open, with its room’s power cut and its valves shut', () => {
    let w = applyAction(start, {
      type: 'pool/drain-down',
      pool: 'pool_03',
      open: true,
    });
    w = applyAction(w, {
      type: 'plant/feeder',
      room: 'plant_pool_03',
      on: false,
    });
    w = shut(w, 'overflow', 'return');
    expect(jacuzziCirculating(w)).toBe(false);
    const before = w.pools.pool_03.level;
    w = advance(w, 60, 1);
    expect(jacuzziDischarging(w)).toBe(true);
    expect(w.pools.pool_03.level).toBeLessThan(before);
  });
});
