import { describe, expect, it } from 'vite-plus/test';
import { roomStructure } from './room-structure';
import { roomServiceRoutes } from './room-services';
import { ROOM_SERVICES } from '../../../game/plant/services';

describe('a room’s structure, from one place', () => {
  it('gives the plant rooms their true heights: 8 m for the large and medium, 7 m for the small and tiny', () => {
    expect(roomStructure('plant_pool_02')?.soffit).toBe(8);
    expect(roomStructure('plant_pool_01')?.soffit).toBe(8);
    expect(roomStructure('plant_pool_03')?.soffit).toBe(7);
    expect(roomStructure('plant_pool_04')?.soffit).toBe(7);
  });

  it('hangs the services ceiling 1.9 m under the soffit', () => {
    const s = roomStructure('plant_pool_02')!;
    expect(s.ceilingZone).toBeCloseTo(6.1, 6);
  });

  it('describes every room that has services', () => {
    for (const room of Object.keys(ROOM_SERVICES)) {
      const s = roomStructure(room);
      expect(s, room).not.toBeNull();
      expect(s!.soffit, room).toBeGreaterThan(2.5);
      expect(s!.walls.east - s!.walls.west, room).toBeCloseTo(s!.w, 6);
      expect(s!.obstacles.length, room).toBeGreaterThan(0);
    }
  });

  it('takes its supply wall as the west, unless the helper is started with another', () => {
    expect(roomStructure('wet_hall')!.supplyWall).toBe('west');
    expect(roomStructure('wet_hall', { supplyWall: 'north' })!.supplyWall).toBe(
      'north',
    );
  });

  it('is what the conduits are hung under: none goes above its room’s services ceiling', () => {
    for (const room of Object.keys(ROOM_SERVICES)) {
      const s = roomStructure(room)!;
      for (const r of roomServiceRoutes(room))
        for (const p of r.points)
          expect(p[1], `${room}: ${r.name}`).toBeLessThanOrEqual(
            s.ceilingZone + 1e-6,
          );
    }
  });
});
