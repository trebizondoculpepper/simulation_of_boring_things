import { describe, expect, it } from 'vite-plus/test';
import {
  ATTRACT_SCENARIOS,
  attractScenario,
  attractScenarioTitle,
} from './attract-scenarios';
import { advance, applyAction } from './world';
import { lightingBoardLive } from './plant/lighting';
import { poolDepth } from './plant/pools';

describe('the attract sequence’s worlds', () => {
  it('each has a title, and is made once, the same thereafter', () => {
    for (const id of ATTRACT_SCENARIOS) {
      expect(attractScenarioTitle(id).length).toBeGreaterThan(5);
      expect(attractScenario(id)).toBe(attractScenario(id));
    }
  });

  it('cannot be changed: frozen, and running or acting on one makes a new world', () => {
    const w = attractScenario('normal');
    expect(Object.isFrozen(w)).toBe(true);
    expect(Object.isFrozen(w.pools.pool_02)).toBe(true);
    expect(() => {
      (w.pools.pool_02 as { level: number }).level = 5;
    }).toThrow();
    const on = advance(w, 10, 1);
    expect(on).not.toBe(w);
    const acted = applyAction(w, { type: 'lighting/supply', on: false });
    expect(acted).not.toBe(w);
    expect(attractScenario('normal').time).toBe(w.time);
  });

  it('normal: everything on, the pools brimming, the water moving', () => {
    const w = attractScenario('normal');
    expect(lightingBoardLive(w.plant, w.lighting)).toBe(true);
    for (const pool of Object.values(w.pools)) {
      expect(pool.level).toBeGreaterThan(-0.05);
      expect(pool.flow).toBeGreaterThan(1);
    }
  });

  it('lights-out: the lighting supply off', () => {
    const w = attractScenario('lights-out');
    expect(w.lighting.supply).toBe(false);
  });

  it('pools-drained: the lounge and the jacuzzi empty, the others full', () => {
    const w = attractScenario('pools-drained');
    expect(w.pools.pool_01.level).toBeCloseTo(-poolDepth('pool_01'));
    expect(w.pools.pool_03.level).toBeCloseTo(-poolDepth('pool_03'));
    expect(w.pools.pool_02.level).toBeGreaterThan(-0.05);
    expect(w.pools.pool_01.drainDown).toBe(false);
  });
});
