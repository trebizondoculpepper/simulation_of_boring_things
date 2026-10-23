import { describe, expect, it } from 'vite-plus/test';
import { placeMachines } from './machine-placement';
import type { PlaceItem, PlaceLink } from './machine-placement';
import { reserveRegions } from './room-regions';
import type { RegionRoom } from './room-regions';

const room: RegionRoom = {
  w: 11,
  d: 11,
  h: 4,
  doors: [{ side: 'west', at: 5.5 - 1.1, width: 1, height: 2.1 }],
};
const items: PlaceItem[] = [
  { key: 'tank', w: 1.8, d: 1.6, h: 2, site: 'corner' },
  { key: 'panel', w: 1.6, d: 0.5, h: 2.2, site: 'wall' },
  { key: 'supply', w: 0.9, d: 0.8, h: 1.2, walls: ['west'] },
  { key: 'pump-a', w: 1.6, d: 0.8, h: 1, site: 'free' },
  { key: 'pump-b', w: 1.6, d: 0.8, h: 1, site: 'free' },
  { key: 'filter', w: 1.4, d: 1.4, h: 2, site: 'free' },
];
const links: PlaceLink[] = [
  { a: 'tank', b: 'pump-a', weight: 2 },
  { a: 'pump-a', b: 'filter', weight: 2 },
  { a: 'filter', b: 'pump-b', weight: 2 },
  { a: 'supply', b: 'tank', weight: 1 },
];

describe('placement', () => {
  const { regions } = reserveRegions(room);
  const result = placeMachines(room, regions, items, links, { seed: 3 });
  const at = (key: string) => result.placed.find((p) => p.key === key)!;

  it('breaks no rule, and every machine can be walked to', () => {
    expect(result.problems).toEqual([]);
  });

  it('puts the corner machine in a corner, and the panel and the supply on walls', () => {
    const tank = at('tank').footprint;
    const nearX = Math.min(tank.minX + 5.5, 5.5 - tank.maxX);
    const nearZ = Math.min(tank.minZ + 5.5, 5.5 - tank.maxZ);
    expect(nearX).toBeLessThan(0.5);
    expect(nearZ).toBeLessThan(0.5);
    expect(at('panel').band).toMatch(/wall/);
    expect(at('supply').band).toBe('west wall');
    expect(at('supply').yaw).toBeCloseTo(Math.PI / 2);
  });

  it('keeps machines apart and out of the doorway', () => {
    const feet = result.placed.map((p) => p.footprint);
    for (let i = 0; i < feet.length; i++)
      for (let j = i + 1; j < feet.length; j++) {
        const a = feet[i];
        const b = feet[j];
        const apart =
          a.maxX <= b.minX ||
          b.maxX <= a.minX ||
          a.maxZ <= b.minZ ||
          b.maxZ <= a.minZ;
        expect(apart).toBe(true);
      }
    const door = regions.find((r) => r.kind === 'door')!;
    for (const f of feet)
      expect(
        f.maxX <= door.min[0] ||
          f.minX >= door.max[0] ||
          f.maxZ <= door.min[2] ||
          f.minZ >= door.max[2],
      ).toBe(true);
  });

  it('comes out the same every time', () => {
    const again = placeMachines(room, regions, items, links, { seed: 3 });
    expect(again.placed).toEqual(result.placed);
  });
});
