import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import { read } from '../sim/blocks';
import { poolDepth } from './pools';
import { cabinetPipes } from '../../toolkit/gallery/logic/cabinet-pipes';
import {
  FOOTBATH,
  footbathLineup,
  identifiedPart,
  newIdentifiedPlant,
  partOpen,
  walkIdentified,
} from './identification';

describe('plant identification pilot', () => {
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

  it('binds every pilot pipe valve to one model part', () => {
    const ids = cabinetPipes('plant_pool_04').flatMap((run) =>
      run.valve ? [run.valve.id] : [],
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
