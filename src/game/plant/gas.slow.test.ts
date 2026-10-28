import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import { extractRunning } from './gas';

describe('the building’s gas detection', () => {
  it('lets a leak build up when the store’s extract loses its power', () => {
    const leak = applyAction(newWorld(), {
      type: 'gas/leak',
      zone: 'plant_pool_02',
      gramsPerHour: 0.2,
    });
    const off = applyAction(leak, {
      type: 'plant/feeder',
      room: 'plant_pool_02',
      on: false,
    });
    expect(extractRunning(off.plant, 'plant_pool_02')).toBe(false);
    const a = advance(leak, 3600, 1);
    const b = advance(off, 3600, 1);
    expect(b.gas.plant_pool_02.state.reading).toBeGreaterThan(
      a.gas.plant_pool_02.state.reading * 3,
    );
  });
});
