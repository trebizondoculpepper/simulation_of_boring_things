import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../world';
import { footbathMakeUpEntering } from './footbath-makeup';
import { FOOTBATH } from './identification';

const low = () => {
  const w = newWorld();
  return {
    ...w,
    pools: { ...w.pools, pool_04: { ...w.pools.pool_04, balance: 0.3 } },
  };
};

describe('fresh make-up entering the foot spa', () => {
  it('enters with its valve open and its float calling', () => {
    expect(footbathMakeUpEntering(low())).toBe(true);
  });

  it('does not while its float is satisfied', () => {
    expect(footbathMakeUpEntering(newWorld())).toBe(false);
  });

  it('does not with its make-up valve shut', () => {
    const w = applyAction(low(), {
      type: 'plant/valve',
      id: FOOTBATH.makeUp,
      open: false,
    });
    expect(footbathMakeUpEntering(w)).toBe(false);
  });
});
