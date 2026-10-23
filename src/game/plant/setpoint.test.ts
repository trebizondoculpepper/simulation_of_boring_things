import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld, SETPOINT_RANGE } from '../world';
import { POOL_TARGET } from './pools';

describe('a pool’s thermostat', () => {
  it('starts at the pool’s design temperature', () => {
    const w = newWorld();
    expect(w.pools.pool_03.setpoint).toBe(POOL_TARGET.pool_03.temp);
  });

  it('is set in half degrees, within its range', () => {
    let w = applyAction(newWorld(), {
      type: 'pool/setpoint',
      pool: 'pool_03',
      celsius: 38.26,
    });
    expect(w.pools.pool_03.setpoint).toBe(38.5);
    w = applyAction(w, { type: 'pool/setpoint', pool: 'pool_03', celsius: 99 });
    expect(w.pools.pool_03.setpoint).toBe(SETPOINT_RANGE.max);
    w = applyAction(w, { type: 'pool/setpoint', pool: 'pool_03', celsius: 3 });
    expect(w.pools.pool_03.setpoint).toBe(SETPOINT_RANGE.min);
  });

  it('heats the jacuzzi up to a higher setting, over hours', () => {
    const start = applyAction(newWorld(), {
      type: 'pool/setpoint',
      pool: 'pool_03',
      celsius: 39,
    });
    const later = advance(start, 4 * 3600, 5);
    expect(later.pools.pool_03.temperature).toBeGreaterThan(
      start.pools.pool_03.temperature + 1,
    );
    expect(later.pools.pool_03.temperature).toBeLessThan(39.3);
  });

  it('lets it cool to a lower one', () => {
    const start = applyAction(newWorld(), {
      type: 'pool/setpoint',
      pool: 'pool_03',
      celsius: 32,
    });
    const later = advance(start, 6 * 3600, 5);
    expect(later.pools.pool_03.temperature).toBeLessThan(
      start.pools.pool_03.temperature - 1,
    );
  });
});
