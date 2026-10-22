import { describe, expect, it } from 'vite-plus/test';
import { ROOM_SERVICES } from '../../../game/plant/services';
import { layoutRoom } from './room-equipment';
import type { Side } from './room-equipment';
import {
  DROP_GAP,
  STANDOFF,
  alongWall,
  roomServiceRoutes,
} from './room-services';

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

  // The rooms whose power is routed here, not port to port.
  const routed = Object.keys(ROOM_SERVICES).filter(
    (room) => !room.startsWith('plant_pool_') && room !== 'switch_room',
  );
  const SIDES: Side[] = ['north', 'south', 'east', 'west'];
  /** The wall a point stands `STANDOFF` off, if any. */
  const wallOf = (box: { w: number; d: number }, [x, , z]: readonly number[]) =>
    SIDES.find((side) =>
      side === 'west'
        ? Math.abs(x - (-box.w / 2 + STANDOFF)) < 1e-6
        : side === 'east'
          ? Math.abs(x - (box.w / 2 - STANDOFF)) < 1e-6
          : side === 'north'
            ? Math.abs(z - (-box.d / 2 + STANDOFF)) < 1e-6
            : Math.abs(z - (box.d / 2 - STANDOFF)) < 1e-6,
    );

  it('takes every power feed from the distribution conduit, which runs round the walls', () => {
    for (const room of routed) {
      const { box } = layoutRoom(room)!;
      const routes = roomServiceRoutes(room);
      const main = routes.find((r) => r.name.includes('distribution conduit'))!;
      const level = main.points[0][1];
      for (const p of main.points) expect(wallOf(box, p), room).toBeDefined();
      for (const r of routes.filter(
        (r) => r.utility === 'power' && r.kind !== 'flex-cable' && r !== main,
      )) {
        // Its first point on the main: at its height, on a wall's saddles.
        expect(r.points[0][1], r.name).toBeCloseTo(level, 6);
        expect(wallOf(box, r.points[0]), r.name).toBeDefined();
      }
    }
  });

  it('drops down each wall clear of the panels it passes, and clear of each other', () => {
    for (const room of routed) {
      const { box, placed } = layoutRoom(room)!;
      const routes = roomServiceRoutes(room);
      const drops = routes.filter(
        (r) =>
          r.kind !== 'flex-cable' &&
          !r.name.includes('distribution conduit') &&
          r.points.length === 2 &&
          wallOf(box, r.points[0]),
      );
      for (const side of SIDES) {
        const here = drops.filter((d) => wallOf(box, d.points[0]) === side);
        const s = here.map((d) =>
          alongWall(side, d.points[0][0], d.points[0][2]),
        );
        for (let a = 0; a < s.length; a++)
          for (let b = a + 1; b < s.length; b++)
            expect(
              Math.abs(s[a] - s[b]),
              `${here[a].name} and ${here[b].name}`,
            ).toBeGreaterThanOrEqual(DROP_GAP - 1e-6);
        for (const [k, d] of here.entries()) {
          const low = Math.min(d.points[0][1], d.points[1][1]);
          const high = Math.max(d.points[0][1], d.points[1][1]);
          for (const p of placed) {
            if (p.item.mount !== 'wall' || p.side !== side) continue;
            if (p.item.key === d.to) continue;
            const c = alongWall(side, p.x, p.z);
            const across = s[k] > c - p.item.w / 2 && s[k] < c + p.item.w / 2;
            const passes =
              low < p.y + p.item.h / 2 - 1e-6 &&
              high > p.y - p.item.h / 2 + 1e-6;
            expect(across && passes, `${d.name} passes ${p.item.label}`).toBe(
              false,
            );
          }
        }
      }
    }
  });

  it('brings each wall panel’s feed down into its top, within its width', () => {
    for (const room of routed) {
      const { placed } = layoutRoom(room)!;
      const routes = roomServiceRoutes(room);
      for (const p of placed) {
        if (p.item.mount !== 'wall') continue;
        const feed = routes.find(
          (r) => r.to === p.item.key && r.kind !== 'flex-cable',
        );
        if (!feed) continue;
        const end = feed.points[feed.points.length - 1];
        expect(end[1], feed.name).toBeCloseTo(p.y + p.item.h / 2, 6);
        const c = alongWall(p.side as Side, p.x, p.z);
        expect(
          Math.abs(alongWall(p.side as Side, end[0], end[2]) - c),
          feed.name,
        ).toBeLessThanOrEqual(p.item.w / 2);
      }
    }
  });
});
