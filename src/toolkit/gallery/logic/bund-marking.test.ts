import { describe, expect, it } from 'vite-plus/test';
import { layoutRoom } from './room-equipment';
import {
  STRIPE,
  bundMarking,
  bundOf,
  isBundedTank,
  roomBundMarkings,
} from './bund-marking';
import type { Rect } from './bund-marking';

const overlap = (a: Rect, b: Rect) =>
  a.minX < b.maxX - 1e-9 &&
  a.maxX > b.minX + 1e-9 &&
  a.minZ < b.maxZ - 1e-9 &&
  a.maxZ > b.minZ + 1e-9;

const ROOMS = [
  'plant_pool_01',
  'plant_pool_02',
  'plant_pool_03',
  'plant_pool_04',
  'hypo_store',
  'acid_store',
];

describe('the floor markings round the bunded tanks', () => {
  it('marks every bunded tank: the eight day tanks and the four bulk tanks', () => {
    const count = ROOMS.map(
      (room) => roomBundMarkings(layoutRoom(room)!).length,
    ).reduce((a, b) => a + b, 0);
    expect(count).toBe(12);
  });

  for (const room of ROOMS)
    it(`${room}: keeps each stripe in the room, off its bund, every other machine and every kept-clear zone, the chemical named`, () => {
      const layout = layoutRoom(room)!;
      const { box, placed } = layout;
      const walls = {
        minX: -box.w / 2,
        maxX: box.w / 2,
        minZ: -box.d / 2,
        maxZ: box.d / 2,
      };
      const tanks = placed.filter((p) => isBundedTank(p.item.key));
      roomBundMarkings(layout).forEach((m, i) => {
        const bund = bundOf(tanks[i]);
        expect(m.stripes.length, tanks[i].item.key).toBeGreaterThan(0);
        for (const s of m.stripes) {
          expect(Math.min(s.maxX - s.minX, s.maxZ - s.minZ)).toBeCloseTo(
            STRIPE,
          );
          expect(s.minX).toBeGreaterThanOrEqual(walls.minX);
          expect(s.maxX).toBeLessThanOrEqual(walls.maxX);
          expect(s.minZ).toBeGreaterThanOrEqual(walls.minZ);
          expect(s.maxZ).toBeLessThanOrEqual(walls.maxZ);
          expect(overlap(s, bund)).toBe(false);
          for (const q of placed)
            if (q !== tanks[i] && q.item.mount === 'floor' && !q.item.walkable)
              expect(overlap(s, q.footprint), q.item.key).toBe(false);
          for (const k of [...box.keepClear, ...box.solid])
            expect(overlap(s, k)).toBe(false);
        }
        if (m.stencil)
          expect(m.stencil.text).toBe(
            m.chemical === 'acid' ? 'HYDROCHLORIC ACID' : 'SODIUM HYPOCHLORITE',
          );
      });
    });

  it('gives way to the walls in the footbath’s corner: marked on its two open sides only', () => {
    const layout = layoutRoom('plant_pool_04')!;
    const i = layout.placed
      .filter((p) => isBundedTank(p.item.key))
      .findIndex((p) => p.item.key === 'chem-day:hypochlorite:pool_04');
    const m = roomBundMarkings(layout)[i];
    const bund = bundOf(
      layout.placed.find(
        (p) => p.item.key === 'chem-day:hypochlorite:pool_04',
      )!,
    );
    // Nothing west of it or south of it: the walls are there.
    for (const s of m.stripes) {
      expect(s.maxX).toBeGreaterThan(bund.minX);
      expect(s.minZ).toBeLessThan(bund.maxZ);
    }
    expect(m.stripes.length).toBeGreaterThanOrEqual(2);
  });

  it('cuts a stripe round a machine in its way', () => {
    const bund = { minX: -0.3, maxX: 0.3, minZ: -0.3, maxZ: 0.3 };
    const m = bundMarking(bund, {
      chemical: 'acid',
      face: 'south',
      room: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
      // A pump hard against its east side's middle.
      obstacles: [{ minX: 0.4, maxX: 1.2, minZ: -0.1, maxZ: 0.1 }],
    });
    const east = m.stripes.filter((s) => s.along === 'z' && s.minX > 0);
    // At the nearest gap it still meets the pump: cut in two round it.
    expect(east.length).toBe(2);
    expect(m.stencil?.top).toBe('north');
  });
});
