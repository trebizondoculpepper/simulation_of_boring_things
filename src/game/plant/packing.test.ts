import { describe, expect, it } from 'vite-plus/test';
import { GAP, SERVICE_ZONE, machines, packAll, walkway } from './packing';
import { chamberById } from './warren-plan';

const { placed, unplaced } = packAll();
const overlaps = (
  a: { minX: number; maxX: number; minZ: number; maxZ: number },
  b: typeof a,
) => a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;

describe('fitting the machines into the plant rooms', () => {
  it('finds a place for every machine', () => {
    expect(unplaced.map((m) => `${m.name} (${m.room})`)).toEqual([]);
    expect(placed.length).toBe(machines().length);
  });

  it('stands every machine wholly in a chamber of its own room', () => {
    for (const p of placed) {
      const c = chamberById(p.chamber);
      expect(c.room).toBe(p.room);
      expect(p.rect.minX).toBeGreaterThanOrEqual(c.rect.minX);
      expect(p.rect.maxX).toBeLessThanOrEqual(c.rect.maxX);
      expect(p.rect.minZ).toBeGreaterThanOrEqual(c.rect.minZ);
      expect(p.rect.maxZ).toBeLessThanOrEqual(c.rect.maxZ);
    }
  });

  it('keeps a gap between machines and the walkway clear', () => {
    for (const a of placed) {
      expect(overlaps(a.rect, walkway(chamberById(a.chamber))), a.name).toBe(
        false,
      );
      for (const b of placed)
        if (a !== b && a.chamber === b.chamber) {
          const grown = {
            minX: a.rect.minX - GAP / 2 + 1e-6,
            maxX: a.rect.maxX + GAP / 2 - 1e-6,
            minZ: a.rect.minZ - GAP / 2 + 1e-6,
            maxZ: a.rect.maxZ + GAP / 2 - 1e-6,
          };
          expect(overlaps(grown, b.rect), `${a.name} / ${b.name}`).toBe(false);
        }
    }
  });

  it('leaves the zone under every ceiling free for ducts, conduits and air conditioning', () => {
    for (const p of placed) {
      const c = chamberById(p.chamber);
      if (!c.open)
        expect(p.size.h, p.name).toBeLessThanOrEqual(c.height - SERVICE_ZONE);
    }
  });
});
