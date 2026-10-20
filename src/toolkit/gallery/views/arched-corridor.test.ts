import { describe, expect, it } from 'vite-plus/test';
import { slide } from '../../controls/logic/walk-collision';
import {
  ARCHED_CORRIDOR,
  ARCHED_POOL,
  archedCorridorSolids,
  ARCHED_EXTENSION,
  ARCHED_ROOM,
  archedFloorAt,
  archedZoneAt,
} from './arched-corridor';

const x = ARCHED_CORRIDOR.x;
const r = ARCHED_ROOM;
const e = ARCHED_EXTENSION;

describe('the arched corridor and its stepped room', () => {
  it('keeps the corridor at the deck, outside the hall', () => {
    expect(archedFloorAt(x, ARCHED_CORRIDOR.mouthZ + 5)).toBe(0);
    expect(archedZoneAt(x, ARCHED_CORRIDOR.mouthZ + 5)).toBe('CR_A_ARCH');
    expect(archedFloorAt(x, ARCHED_CORRIDOR.mouthZ - 0.5)).toBeNull();
  });

  it('steps down a metre from the landing to the room', () => {
    expect(archedFloorAt(x, r.minZ + 0.5)).toBe(0);
    expect(archedFloorAt(x, r.minZ + r.landing + 0.1)).toBeCloseTo(-1 / 6);
    expect(archedFloorAt(x, r.maxZ - 1)).toBe(-1);
    expect(archedZoneAt(x, r.maxZ - 1)).toBe('CR_A_STEPS');
  });

  it('steps down another metre into the extension, part of the same room', () => {
    expect(e.minZ).toBe(r.minZ);
    const z = (e.minZ + e.maxZ) / 2;
    expect(archedFloorAt(e.maxX + 0.1, z)).toBe(-1);
    expect(archedFloorAt(e.maxX - 0.1, z)).toBeCloseTo(-1 - 1 / 6);
    expect(archedFloorAt(e.maxX - 1.65, z)).toBe(-2);
    expect(archedFloorAt(e.minX + 0.5, z)).toBe(-2);
    expect(archedFloorAt(e.minX + 0.5, e.minZ + 0.5)).toBe(-2);
    expect(archedZoneAt(e.minX + 0.5, z)).toBe('CR_A_STEPS');
    // The extension ends at the same north wall as the windowed room.
    expect(archedFloorAt(e.maxX - 0.5, e.minZ - 0.5)).toBeNull();
  });

  it('lets a walker who falls in the pool climb out by its ladder', () => {
    const pool = ARCHED_POOL;
    const z = (pool.minZ + pool.maxZ) / 2;
    expect(archedFloorAt(pool.maxX - 1, z)).toBe(pool.floor);
    const solids = archedCorridorSolids();
    // From the middle of the pool, walking east toward the ladder.
    let at = { x: (pool.minX + pool.maxX) / 2, z };
    // Half the pool's width and most of the deck's: out, and on the deck.
    for (let i = 0; i < 39; i++) at = slide(solids, at.x, at.z, 0.1, 0, 0.25);
    expect(at.x).toBeGreaterThan(pool.maxX + 0.3);
    expect(archedFloorAt(at.x, at.z)).toBe(e.floor);
    // Elsewhere its edge holds the walker in.
    let off = { x: (pool.minX + pool.maxX) / 2, z: pool.minZ + 0.6 };
    for (let i = 0; i < 100; i++)
      off = slide(solids, off.x, off.z, 0, -0.1, 0.25);
    expect(off.z).toBeGreaterThan(pool.minZ);
  });
});
