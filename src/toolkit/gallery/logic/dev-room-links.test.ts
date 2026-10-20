import { describe, expect, it } from 'vite-plus/test';
import {
  CHAIN,
  DEV_ROOM_COLOURS,
  DEV_ROOM_NAMES,
  ROOMS,
  devPortals,
  devWalls,
  resolveRoomId,
} from './dev-room-links';
import { slide } from '../../controls/logic/walk-collision';

const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
describe('the rooms', () => {
  it('lead every room in the chain back to dev_corridor, its hub', () => {
    for (const id of CHAIN) {
      const to = devPortals(id, bounds, 1).map((p) => p.to);
      expect(to).toEqual(id === 'dev_corridor' ? [] : ['dev_corridor']);
    }
  });

  it('gives the leisure centre no portals: it is entered by its own doors', () => {
    expect(devPortals('facility', bounds, 1)).toEqual([]);
  });

  it('gives every room a name and a portal colour', () => {
    for (const id of ROOMS) {
      expect(DEV_ROOM_NAMES[id]).toBeTruthy();
      expect(DEV_ROOM_COLOURS[id]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('resolves only the rooms it has', () => {
    expect(resolveRoomId('dev7')).toBe('dev7');
    expect(resolveRoomId('nowhere')).toBeUndefined();
  });

  it('have solid walls all round, portals or none', () => {
    const walls = devWalls(bounds, 1, 3.2);
    const [west] = devPortals('dev1', bounds, 1);
    expect(slide(walls, -4, west.z, -2, 0, 0.25).x).toBeGreaterThan(-5);
    expect(slide(walls, 4, 0, 2, 0, 0.25).x).toBeLessThan(5);
  });
});
