import { describe, expect, it } from 'vite-plus/test';
import {
  FIRE_POINT_DEPTH,
  firePointKey,
  firePointKinds,
  firePointOutline,
  firePointWidth,
  wetHallFirePoints,
} from './fire-point';
import { layoutRoom } from './room-equipment';
import type { Placed } from './room-equipment';
import type { Footprint } from '../../controls/logic/walk-collision';
import { infront, WORKING_SPACE } from './switch-room-floor';

const overlap = (a: Footprint, b: Footprint) =>
  a.minX < b.maxX - 1e-9 &&
  a.maxX > b.minX + 1e-9 &&
  a.minZ < b.maxZ - 1e-9 &&
  a.maxZ > b.minZ + 1e-9;

const firePoints = (room: string) =>
  layoutRoom(room)!.placed.filter((p) => p.item.key.startsWith('fire-point:'));

describe('a fire point, one reusable layout item', () => {
  it('names its extinguishers in its key, and its own id', () => {
    expect(firePointKey(['co2', 'co2'])).toBe('fire-point:co2+co2');
    expect(firePointKey(['co2', 'foam'], 'wh-mcp-1')).toBe(
      'fire-point:co2+foam:wh-mcp-1',
    );
    expect(firePointKinds('co2+foam')).toEqual(['co2', 'foam']);
    expect(firePointKinds('co2+nonsense')).toEqual(['co2']);
  });

  it('keeps clear a metre wide at least, its outline inside it', () => {
    expect(firePointWidth(2)).toBe(1);
    for (const r of firePointOutline(2)) {
      expect(Math.abs(r.x) + r.w / 2).toBeLessThanOrEqual(1 + 1e-9);
      expect(r.z + r.d / 2).toBeLessThanOrEqual(FIRE_POINT_DEPTH + 1e-9);
      expect(r.z - r.d / 2).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('gives the switch room one, of two CO2 extinguishers, by its door', () => {
    const [p] = firePoints('switch_room');
    expect(p.item.key).toBe('fire-point:co2+co2');
    const { box, placed } = layoutRoom('switch_room')!;
    // On the south wall, the door's.
    expect(p.footprint.maxZ).toBeCloseTo(box.d / 2);
    // Clear of the door's swing and every other machine, and of the
    // switchgear's working space.
    for (const k of box.keepClear) expect(overlap(k, p.footprint)).toBe(false);
    for (const q of placed)
      if (q.item.key !== p.item.key && q.item.mount === 'floor')
        expect(overlap(q.footprint, p.footprint)).toBe(false);
    for (const key of ['lv-switchboard', 'main-switch', 'changeover-switch']) {
      const board = placed.find((q) => q.item.key === key) as Placed;
      expect(overlap(infront(board, WORKING_SPACE)!, p.footprint)).toBe(false);
    }
  });

  it('places the wet hall’s three with it, where their call points are', () => {
    const points = firePoints('wet_hall');
    expect(points).toHaveLength(3);
    for (const f of wetHallFirePoints()) {
      const p = points.find((q) => q.item.key.endsWith(f.id))!;
      expect(p.item.key).toBe(firePointKey(['co2', 'foam'], f.id));
      // Its back where the call point's wall is.
      const back = {
        x: p.x - Math.sin(p.yaw) * (FIRE_POINT_DEPTH / 2),
        z: p.z - Math.cos(p.yaw) * (FIRE_POINT_DEPTH / 2),
      };
      expect(back.x).toBeCloseTo(f.x);
      expect(back.z).toBeCloseTo(f.z);
      expect(p.yaw).toBeCloseTo(f.yaw === Math.PI ? Math.PI : f.yaw);
    }
  });
});
