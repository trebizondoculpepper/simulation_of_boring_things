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
      // The pool plant rooms' feeds are routed port to port elsewhere
      // (`room-pipes.ts`, `cabinet-pipes.ts`).
      if (
        [
          'plant_pool_01',
          'plant_pool_02',
          'plant_pool_03',
          'plant_pool_04',
        ].includes(room)
      ) {
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

  it('leaves the lounge’s plant room to its port-to-port routing', () => {
    // Its pipework, as the Olympic's, is `room-pipes.ts`'s; every port's
    // connection is checked in `port-connections.test.ts`.
    expect(roomServiceRoutes('plant_pool_01')).toEqual([]);
  });
});
