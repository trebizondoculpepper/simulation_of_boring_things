import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from './world';
import type { World } from './world';
import {
  KIND_HEALTH_COVERAGE,
  WORLD_HEALTH_COVERAGE,
  healthFaults,
} from './health';
import { LOUNGE_VALVES } from './plant/lounge-valves';
import { PLACED_KINDS } from './plant/equipment-kinds';
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

/**
 * The healthy-start contract, executable (mission 067,
 * `doc/healthy-start.md`): the whole centre, every step of the handover
 * hour, and negative controls proving the checker finds what it should.
 */
describe('a new game is healthy, by its contract', () => {
  it('has no faults on its first frame', () => {
    expect(healthFaults(newWorld())).toEqual([]);
  });

  it('stays healthy at every step of its first hour, so no transient fault hides between checkpoints', () => {
    let w = newWorld();
    for (let t = 1; t <= 3600; t++) {
      w = advance(w, 1, 1);
      const faults = healthFaults(w);
      if (faults.length)
        throw new Error(`at ${t} s: ${JSON.stringify(faults)}`);
    }
  }, 120_000);

  it('classifies every field of the world and every kind of equipment', () => {
    expect(Object.keys(WORLD_HEALTH_COVERAGE).sort()).toEqual(
      Object.keys(newWorld()).sort(),
    );
    expect(Object.keys(KIND_HEALTH_COVERAGE).sort()).toEqual(
      Object.keys(PLACED_KINDS).sort(),
    );
  });

  describe('finds the faults it is for', () => {
    const faultsOf = (w: World) =>
      healthFaults(w).map((f) => `${f.subsystem}: ${f.asset}`);

    it('a closed circulation path', () => {
      let w = newWorld();
      for (const tag of ['PL1-F1-IV2', 'PL1-F2-IV2'])
        w = applyAction(w, {
          type: 'plant/valve',
          id: LOUNGE_VALVES.find((v) => v.tag === tag)!.assetId,
          open: false,
        });
      w = advance(w, 30, 1);
      expect(faultsOf(w)).toEqual(
        expect.arrayContaining([
          'valves: PL1-F1-IV2',
          'valves: PL1-F2-IV2',
          'pools: pool_01',
        ]),
      );
    });

    it('a missing utility', () => {
      const w = applyAction(newWorld(), {
        type: 'plant/feeder',
        room: 'plant_pool_01',
        on: false,
      });
      expect(faultsOf(w)).toContain('services: plant_pool_01');
    });

    it('a low tank', () => {
      const w = newWorld();
      const low = {
        ...w,
        pools: { ...w.pools, pool_01: { ...w.pools.pool_01, balance: 0.1 } },
      };
      expect(faultsOf(low)).toContain('pools: pool_01');
    });

    it('a gas alarm', () => {
      let w = applyAction(newWorld(), {
        type: 'gas/leak',
        zone: 'plant_pool_01',
        gramsPerHour: 5,
      });
      w = advance(w, 60, 1);
      expect(faultsOf(w)).toContain('gas: plant_pool_01');
    });
  });
});
