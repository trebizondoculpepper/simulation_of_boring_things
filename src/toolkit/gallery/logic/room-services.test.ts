import { describe, expect, it } from 'vite-plus/test';
import { ROOM_SERVICES } from '../../../game/plant/services';
import { layoutRoom } from './room-equipment';
import { roomServiceRoutes } from './room-services';

describe('current plant-room service connections', () => {
  it('brings a power feed into every equipped room without duplicating authored cabinet feeds', () => {
    for (const room of Object.keys(ROOM_SERVICES)) {
      const layout = layoutRoom(room)!;
      const routes = roomServiceRoutes(room);
      expect(layout.failed, room).toHaveLength(0);
      if (['plant_pool_02', 'plant_pool_03', 'plant_pool_04'].includes(room)) {
        expect(
          routes.filter((r) => r.utility === 'power'),
          room,
        ).toHaveLength(0);
      } else {
        expect(
          routes.some((r) => r.name.includes('distribution conduit')),
          room,
        ).toBe(true);
      }
      for (const route of routes) {
        expect(route.points.length, route.name).toBeGreaterThan(1);
        for (const [x, y, z] of route.points) {
          expect(Number.isFinite(x), route.name).toBe(true);
          expect(Number.isFinite(y), route.name).toBe(true);
          expect(Number.isFinite(z), route.name).toBe(true);
          expect(Math.abs(x), route.name).toBeLessThanOrEqual(
            layout.box.w / 2 + 0.01,
          );
          expect(Math.abs(z), route.name).toBeLessThanOrEqual(
            layout.box.d / 2 + 0.01,
          );
        }
      }
    }
  });

  it('terminates the lounge fluid pipes at declared machine ports', () => {
    const routes = roomServiceRoutes('plant_pool_01');
    expect(routes.some((r) => r.utility === 'water')).toBe(true);
    expect(routes.some((r) => r.utility === 'heat')).toBe(true);
    expect(routes.some((r) => r.utility === 'chemical')).toBe(true);
  });

  it('runs air ducts from each air handler toward both side walls', () => {
    const layout = layoutRoom('air_plant')!;
    const ahus = layout.placed.filter((p) => p.item.key === 'ahu').length;
    const ducts = roomServiceRoutes('air_plant').filter(
      (r) => r.kind === 'rectangular-duct',
    );
    expect(ducts).toHaveLength(ahus * 2);
  });
});
