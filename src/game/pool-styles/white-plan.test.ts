import { describe, expect, it } from 'vite-plus/test';
import {
  BAYS,
  BOARD,
  BOUNDS,
  CEILING,
  GOING,
  PLATFORM_Y,
  POOL,
  RISER,
  STAIR,
  STAIR_RUNS,
  clear,
  floorAt,
  inPool,
  insideRoom,
  stairY,
} from './white-plan';

describe('the White Room', () => {
  it('keeps its walls straight where its doors are, and curves them away to the north', () => {
    const z = BOUNDS.maxZ - 1.1;
    for (const dz of [-0.7, 0, 0.7]) {
      expect(insideRoom(BOUNDS.minX + 0.05, z + dz)).toBe(true);
      expect(insideRoom(BOUNDS.maxX - 0.05, z + dz)).toBe(true);
    }
    // The north-west corner is cut away by its curve.
    expect(insideRoom(BOUNDS.minX + 0.5, BOUNDS.minZ + 0.5)).toBe(false);
  });

  it('climbs a stair without a break, landing above landing, to the platform', () => {
    let previous = 0;
    for (let z = STAIR.foot; z >= STAIR.head - 0.01; z -= 0.1) {
      const y = floorAt((STAIR.minX + STAIR.maxX) / 2, z, previous);
      expect(Math.abs(y - previous)).toBeLessThan(0.2);
      previous = y;
    }
    expect(previous).toBeCloseTo(PLATFORM_Y, 6);
    const landings = STAIR_RUNS.filter((r) => r.y0 === r.y1);
    expect(landings.length).toBeGreaterThanOrEqual(2);
    // Steps a person can climb, every flight a whole number of them.
    for (const run of STAIR_RUNS.filter((r) => r.y0 !== r.y1)) {
      const risers = (run.y1 - run.y0) / RISER;
      expect(risers).toBeCloseTo(Math.round(risers), 6);
      expect((run.from - run.to) / risers).toBeCloseTo(GOING, 6);
    }
    expect(stairY(STAIR.foot)).toBe(0);
  });

  it('walks off the stair’s head onto the platform and out to the diving board’s root', () => {
    expect(floorAt(-13.5, -9.6, PLATFORM_Y)).toBe(PLATFORM_Y);
    expect(floorAt(-6, -8.5, PLATFORM_Y)).toBe(PLATFORM_Y);
    expect(clear(-9, -8.5)).toBe(true);
    // The platform's edge holds a walker back from the drop.
    expect(clear(-4.9, -8.5)).toBe(false);
  });

  it('puts its diving board out over a pool too deep to see the bottom of', () => {
    expect(inPool(BOARD.to, BOARD.z)).toBe(true);
    // Deep enough to dive into from the board, and no deeper than a real
    // diving pool, which its plant must heat.
    expect(POOL.depth).toBeGreaterThanOrEqual(4.5);
    expect(POOL.depth).toBeLessThanOrEqual(5);
    expect(insideRoom(POOL.x, POOL.z - POOL.r - 0.5)).toBe(true);
    expect(CEILING).toBeGreaterThanOrEqual(12);
    expect(clear(POOL.x, POOL.z + POOL.r)).toBe(false);
  });

  it('sets one thing in each bay, on the ground, reachable from the room', () => {
    for (const bay of BAYS) {
      expect(insideRoom(bay.x, bay.z)).toBe(true);
      expect(floorAt(bay.x, bay.z, 0)).toBe(0);
      // A step in front of it, toward the room, is clear to stand on.
      const x = bay.x + Math.sin(bay.facing) * 1.2;
      const z = bay.z - Math.cos(bay.facing) * 1.2;
      expect(clear(x, z)).toBe(true);
    }
  });

  it('lets a walker come in by either door and reach the pool’s edge', () => {
    for (const x of [BOUNDS.minX + 1.4, BOUNDS.maxX - 1.4])
      expect(clear(x, BOUNDS.maxZ - 1.1)).toBe(true);
    expect(clear(0, 0.4)).toBe(true);
  });
});
