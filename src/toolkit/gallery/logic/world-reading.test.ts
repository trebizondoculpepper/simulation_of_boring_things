import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../../../game/world';
import { plantReadingOf } from './world-reading';

describe('the plant as the world has it', () => {
  const running = advance(newWorld(), 600, 10);

  it('runs the duty pump while its pool circulates, with no alarms of its own', () => {
    const r = plantReadingOf(running);
    expect(r.pumps).toEqual({ p1: true, p2: false });
    expect(r.flow).toBeGreaterThan(300);
    expect(r.uvOn).toBe(true);
    expect(r.dosing).toBe(true);
    expect(r.amps.p1).toBeGreaterThan(30);
    expect(r.alarms).not.toContain('flow-low');
    expect(r.alarms).not.toContain('p1-trip');
  });

  it('changes over to the standby pump when the duty pump is isolated', () => {
    const w = applyAction(running, {
      type: 'plant/isolator',
      name: 'P-101A isolator',
      on: false,
    });
    const r = plantReadingOf(advance(w, 60, 10));
    expect(r.pumps).toEqual({ p1: false, p2: true });
    expect(r.amps.p1).toBe(0);
  });

  it('stops both, and says so, when the plant room loses its feeder', () => {
    const w = applyAction(running, {
      type: 'plant/feeder',
      room: 'plant_pool_02',
      on: false,
    });
    const r = plantReadingOf(advance(w, 120, 10));
    expect(r.pumps).toEqual({ p1: false, p2: false });
    expect(r.alarms).toContain('flow-low');
    expect(r.uvOn).toBe(false);
  });

  it('reads the lounge’s own pumps for its plant room', () => {
    const r = plantReadingOf(running, 'pool_01');
    expect(r.pumps.p1).toBe(true);
    expect(r.flow).toBeCloseTo(running.pools.pool_01.flow, 6);
  });
});
