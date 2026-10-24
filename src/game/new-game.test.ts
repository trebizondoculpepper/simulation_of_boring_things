import { describe, expect, it } from 'vite-plus/test';
import { advance, newWorld } from './world';
import { HALL_AIR, POOL_IDS, POOL_TARGET } from './plant/pools';
import { ROOM_SERVICES, roomRunning } from './plant/services';
import type { ServiceRoom } from './plant/services';
import { STORE_CAPACITY } from './plant/chemicals';

describe('the default new game', () => {
  it('starts with full pools, design temperatures and normal water chemistry', () => {
    const world = newWorld();
    for (const id of POOL_IDS) {
      const pool = world.pools[id];
      expect(pool.level, id).toBeGreaterThanOrEqual(0);
      expect(pool.temperature, id).toBe(POOL_TARGET[id].temp);
      expect(pool.setpoint, id).toBe(POOL_TARGET[id].temp);
      expect(pool.hallAir, id).toBe(HALL_AIR[id]);
      expect(pool.ph, id).toBe(7.4);
      expect(pool.freeChlorine, id).toBe(1.4);
      expect(pool.combinedChlorine, id).toBe(0.12);
      expect(pool.flow, id).toBe(POOL_TARGET[id].flow);
      expect(pool.tripped, id).toBe(false);
      expect(pool.drainDown, id).toBe(false);
    }
    expect(world.chemicals).toEqual(STORE_CAPACITY);
    for (const room of Object.keys(ROOM_SERVICES) as ServiceRoom[])
      expect(roomRunning(world.plant, room), room).toBe(true);
    expect(world.boilerGas.ssovOpen).toBe(true);
    expect(world.boilerGas.stopPressed).toBe(false);
    expect(world.boilerGas.gasDetected).toBe(false);
    for (const zone of Object.values(world.gas)) {
      expect(zone.leak).toBe(0);
      expect(zone.state.a1).toBe(false);
      expect(zone.state.a2).toBe(false);
    }
    for (const starter of Object.values(world.motors.starters))
      expect(starter.tripped).toBe(false);
    for (const unit of Object.values(world.airHandling.units)) {
      expect(unit.speed).toBe(1);
      expect(unit.tripped).toBe(false);
    }
  });

  it('continues circulating and treating every pool after entry', () => {
    const world = advance(newWorld(), 600, 1);
    for (const id of POOL_IDS) {
      const pool = world.pools[id];
      expect(pool.level, id).toBeGreaterThan(-0.03);
      expect(pool.tripped, id).toBe(false);
      expect(pool.flow, id).toBeGreaterThan(POOL_TARGET[id].flow * 0.8);
      expect(
        Math.abs(pool.temperature - POOL_TARGET[id].temp),
        id,
      ).toBeLessThan(0.5);
      expect(pool.ph, id).toBeCloseTo(7.4, 1);
    }
  });
});
