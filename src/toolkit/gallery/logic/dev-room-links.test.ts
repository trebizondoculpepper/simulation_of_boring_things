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
      expect(to).toEqual(
        id === 'dev_corridor'
          ? []
          : id === 'dev16'
            ? ['dev_corridor', 'dev18']
            : ['dev_corridor'],
      );
    }
  });

  it('opens the security office off dev16, and nowhere else', () => {
    expect(devPortals('dev18', bounds, 1).map((p) => p.to)).toEqual(['dev16']);
    expect(CHAIN).not.toContain('dev18');
    expect(ROOMS).toContain('dev18');
  });

  it('keeps PR_A, its dry stair and round room distinct without doors', () => {
    expect(devPortals('PR_A', bounds, 1)).toEqual([]);
    expect(devPortals('CR_A_UP', bounds, 1)).toEqual([]);
    expect(devPortals('CR_A_ROUND', bounds, 1)).toEqual([]);
    expect(devPortals('CR_A_ARCH', bounds, 1)).toEqual([]);
    expect(devPortals('CR_A_STEPS', bounds, 1)).toEqual([]);
    expect(
      ROOMS.filter((id) => id.startsWith('PR_') || id.startsWith('CR_')),
    ).toEqual(['PR_A', 'CR_A_UP', 'CR_A_ROUND', 'CR_A_ARCH', 'CR_A_STEPS']);
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
