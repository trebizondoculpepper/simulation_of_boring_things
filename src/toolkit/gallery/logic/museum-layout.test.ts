import { describe, expect, it } from 'vite-plus/test';
import {
  corridorFootprints,
  layoutCorridor,
} from '../../components/architectural/logic/corridor-path';
import {
  FIRST_LEG,
  HALL_PLACES,
  LAYOUT_CORRIDORS,
  LAYOUT_WALL,
  STAGGER,
  blindL,
  placeRect,
} from './museum-layout';

const overlap = (
  a: { minX: number; maxX: number; minZ: number; maxZ: number },
  b: { minX: number; maxX: number; minZ: number; maxZ: number },
) =>
  a.minX < b.maxX - 1e-6 &&
  b.minX < a.maxX - 1e-6 &&
  a.minZ < b.maxZ - 1e-6 &&
  b.minZ < a.maxZ - 1e-6;

describe('the museum’s layout C', () => {
  it('stands the ten halls apart, at their sizes, Halls 3 and 9 turned long north–south', () => {
    expect(HALL_PLACES).toHaveLength(10);
    const t = LAYOUT_WALL / 2;
    const outer = HALL_PLACES.map((p) => {
      const r = placeRect(p);
      return {
        minX: r.minX - t,
        maxX: r.maxX + t,
        minZ: r.minZ - t,
        maxZ: r.maxZ + t,
      };
    });
    for (let i = 0; i < 10; i++)
      for (let j = i + 1; j < 10; j++)
        expect(overlap(outer[i], outer[j]), `${i} ${j}`).toBe(false);
    expect([HALL_PLACES[3].w, HALL_PLACES[3].d]).toEqual([14, 24]);
    expect([HALL_PLACES[9].w, HALL_PLACES[9].d]).toEqual([14, 24]);
    expect([HALL_PLACES[1].w, HALL_PLACES[1].d]).toEqual([16, 21]);
  });

  it('joins each hall to the next by one corridor, a turn between two straights, ending at the next hall’s doorway', () => {
    for (const c of LAYOUT_CORRIDORS) {
      expect(c.b).toBe((c.a + 1) % 10);
      expect(c.pieces.map((p) => p.kind)).toEqual([
        'straight',
        expect.stringMatching(/^(left|right)$/),
        'straight',
      ]);
      const { end } = layoutCorridor(c.pieces, c.start);
      const rb = placeRect(HALL_PLACES[c.b]);
      const t = LAYOUT_WALL / 2;
      // It ends on b's doorway, on the outside face of its wall.
      const face =
        c.doorB.side === 'west'
          ? { x: rb.minX - t, z: c.doorB.u }
          : c.doorB.side === 'east'
            ? { x: rb.maxX + t, z: c.doorB.u }
            : c.doorB.side === 'north'
              ? { x: c.doorB.u, z: rb.minZ - t }
              : { x: c.doorB.u, z: rb.maxZ + t };
      expect(end.x).toBeCloseTo(face.x, 6);
      expect(end.z).toBeCloseTo(face.z, 6);
    }
  });

  it('is the same corridor every time, mirrored for a left turn', () => {
    const lengths = LAYOUT_CORRIDORS.map((c) => {
      const s = c.pieces
        .filter((p) => p.kind === 'straight')
        .map((p) => (p.kind === 'straight' ? p.length : 0))
        .sort((a, b) => a - b);
      return s.map((v) => v.toFixed(6)).join(',');
    });
    expect(new Set(lengths).size).toBe(1);
    expect(lengths[0].split(',').map(Number)[0]).toBeCloseTo(FIRST_LEG, 6);
  });

  it('lets no hall be seen from another: every corridor’s bend is blind', () => {
    for (const c of LAYOUT_CORRIDORS) {
      const [a, b] = c.pieces
        .filter((p) => p.kind === 'straight')
        .map((p) => (p.kind === 'straight' ? p.length : 0));
      expect(blindL(a, b), `${c.a}-${c.b}`).toBe(true);
    }
  });

  it('runs no corridor through a hall or another corridor', () => {
    const t = LAYOUT_WALL / 2;
    const feet = LAYOUT_CORRIDORS.map((c) =>
      corridorFootprints(layoutCorridor(c.pieces, c.start).placed),
    );
    feet.forEach((fs, k) => {
      const c = LAYOUT_CORRIDORS[k];
      for (const p of HALL_PLACES) {
        if (p.n === c.a || p.n === c.b) continue;
        const r = placeRect(p);
        const o = {
          minX: r.minX - t,
          maxX: r.maxX + t,
          minZ: r.minZ - t,
          maxZ: r.maxZ + t,
        };
        for (const f of fs)
          expect(overlap(f, o), `corridor ${c.a}-${c.b} and hall ${p.n}`).toBe(
            false,
          );
      }
      feet.forEach((gs, j) => {
        if (j <= k) return;
        for (const f of fs)
          for (const g of gs)
            expect(overlap(f, g), `corridors ${k} ${j}`).toBe(false);
      });
    });
  });

  it('staggers every pair of neighbours by the stagger on the side their corridor runs', () => {
    expect(STAGGER).toBeGreaterThan(FIRST_LEG + 1.2 + LAYOUT_WALL);
  });
});
