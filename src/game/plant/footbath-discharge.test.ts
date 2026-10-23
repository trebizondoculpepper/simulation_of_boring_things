import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../world';
import { footbathDischarging } from './footbath-discharge';
import { FOOTBATH } from './identification';
import { poolDepth } from './pools';

const drainingWorld = () => {
  let w = newWorld();
  w = applyAction(w, { type: 'plant/valve', id: FOOTBATH.return, open: false });
  w = applyAction(w, { type: 'plant/valve', id: FOOTBATH.drain, open: true });
  return w;
};

describe('the foot spa’s water running to drain', () => {
  it('runs lined up to drain, pumped, with water in the bath', () => {
    const w = drainingWorld();
    expect(footbathDischarging(w.identifiedPlant, w.pools.pool_04, true)).toBe(
      true,
    );
  });

  it('does not run in service, its return open and its drain shut', () => {
    const w = newWorld();
    expect(footbathDischarging(w.identifiedPlant, w.pools.pool_04, true)).toBe(
      false,
    );
  });

  it('stops with its isolator off, its pump tripped, or the bath empty', () => {
    const w = drainingWorld();
    const pool = w.pools.pool_04;
    expect(footbathDischarging(w.identifiedPlant, pool, false)).toBe(false);
    expect(
      footbathDischarging(w.identifiedPlant, { ...pool, tripped: true }, true),
    ).toBe(false);
    expect(
      footbathDischarging(
        w.identifiedPlant,
        { ...pool, level: -poolDepth('pool_04') },
        true,
      ),
    ).toBe(false);
  });
});
