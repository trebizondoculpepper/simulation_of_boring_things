import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, footbathFilling, newWorld } from '../world';
import { read } from '../sim/blocks';
import { footbathPumpStarved, poolDepth } from './pools';
import { cabinetPipes } from '../../toolkit/gallery/logic/cabinet-pipes';
import {
  FOOTBATH,
  footbathLineup,
  identifiedPart,
  newIdentifiedPlant,
  partOpen,
  setPartOpen,
  walkIdentified,
} from './identification';

describe('plant identification pilot', () => {
  it('cuts the foot spa pump out on low water and permits refill after changing the line-up', () => {
    const ready = newWorld().pools.pool_04;
    expect(footbathPumpStarved(ready, false)).toBe(false);
    expect(footbathPumpStarved({ ...ready, tripped: true }, false)).toBe(true);
    const empty = { ...ready, level: -poolDepth('pool_04') };
    expect(footbathPumpStarved(empty, true)).toBe(true);
    expect(footbathPumpStarved(empty, false)).toBe(false);
  });

  it('reports filling only with an open valve, a float call and booster supply', () => {
    const ready = advance(newWorld(), 600, 10);
    const low = {
      ...ready,
      pools: {
        ...ready.pools,
        pool_04: { ...ready.pools.pool_04, balance: 0.1 },
      },
    };
    expect(footbathFilling(low)).toBe(true);
    expect(
      footbathFilling({
        ...low,
        wetHall: { ...low.wetHall, boosterTripped: true },
      }),
    ).toBe(false);
    expect(
      footbathFilling({
        ...low,
        pools: { ...low.pools, pool_04: { ...low.pools.pool_04, balance: 1 } },
      }),
    ).toBe(false);
    expect(
      footbathFilling(
        applyAction(low, {
          type: 'plant/valve',
          id: FOOTBATH.makeUp,
          open: false,
        }),
      ),
    ).toBe(false);
  });

  it('walks the declared tree with unique, documented IDs and normal states', () => {
    const root = newIdentifiedPlant();
    const parts = walkIdentified(root);
    expect(new Set(parts.map((part) => part.id)).size).toBe(parts.length);
    expect(parts[0].id).toBe('PL4');
    for (const part of parts) {
      expect(part.name.length).toBeGreaterThan(0);
      expect(part.purpose.length).toBeGreaterThan(0);
      expect(read(root, part.address)).toBeDefined();
      if (part.kind === 'valve')
        expect(partOpen(root, part.id)).toBe(part.normal === 'open');
    }
    expect(identifiedPart(root, FOOTBATH.power)?.normal).toBe('on');
  });

  it('walks a model once for its parts, and a changed model afresh', () => {
    const root = newIdentifiedPlant();
    const part = identifiedPart(root, FOOTBATH.drain);
    // The same root: the same walk's part (mission 094).
    expect(identifiedPart(root, FOOTBATH.drain)).toBe(part);
    const opened = setPartOpen(root, FOOTBATH.drain, true);
    expect(partOpen(root, FOOTBATH.drain)).toBe(false);
    expect(partOpen(opened, FOOTBATH.drain)).toBe(true);
    expect(identifiedPart(opened, FOOTBATH.drain)?.state).toEqual({
      open: true,
    });
    expect(identifiedPart(root, 'PL4-XX9')).toBeUndefined();
  });

  it('binds every pilot pipe valve to one model part', () => {
    // The named parts; the rest of its valves are registered pipework valves (`installed-valves.ts`).
    const ids = cabinetPipes('plant_pool_04').flatMap((run) =>
      run.valve && !run.valve.installed ? [run.valve.id] : [],
    );
    expect(ids.sort()).toEqual(
      [FOOTBATH.return, FOOTBATH.drain, FOOTBATH.makeUp].sort(),
    );
    for (const id of ids)
      expect(identifiedPart(newIdentifiedPlant(), id)?.kind).toBe('valve');
  });

  it('drains only with the return shut and drain open, then refills from make-up', () => {
    const initial = newWorld();
    const shutMakeup = applyAction(initial, {
      type: 'plant/valve',
      id: FOOTBATH.makeUp,
      open: false,
    });
    const openDrain = applyAction(shutMakeup, {
      type: 'plant/valve',
      id: FOOTBATH.drain,
      open: true,
    });
    // Both outlets open is an incorrect lineup: no drain-down route.
    expect(footbathLineup(openDrain.identifiedPlant).draining).toBe(false);
    const wrong = advance(openDrain, 3600, 60);
    expect(wrong.pools.pool_04.level).toBeGreaterThan(-0.15);
    const linedUp = applyAction(openDrain, {
      type: 'plant/valve',
      id: FOOTBATH.return,
      open: false,
    });
    expect(footbathLineup(linedUp.identifiedPlant).draining).toBe(true);
    const drained = advance(linedUp, 3 * 3600, 60);
    expect(drained.pools.pool_04.level).toBeCloseTo(-poolDepth('pool_04'), 5);
    const closeDrain = applyAction(drained, {
      type: 'plant/valve',
      id: FOOTBATH.drain,
      open: false,
    });
    const openReturn = applyAction(closeDrain, {
      type: 'plant/valve',
      id: FOOTBATH.return,
      open: true,
    });
    const refill = applyAction(openReturn, {
      type: 'plant/valve',
      id: FOOTBATH.makeUp,
      open: true,
    });
    expect(advance(refill, 6 * 3600, 60).pools.pool_04.level).toBeGreaterThan(
      -0.02,
    );
  });
});
