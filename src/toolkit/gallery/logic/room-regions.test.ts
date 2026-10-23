import { describe, expect, it } from 'vite-plus/test';
import {
  GANTRY,
  STAIR,
  boxesOverlap,
  regionFloorAt,
  regionSolids,
  reserveRegions,
  runEntersRegion,
} from './room-regions';
import type { RegionRoom } from './room-regions';

const room = (h: number): RegionRoom => ({
  w: 12,
  d: 12,
  h,
  doors: [{ side: 'west', at: 6 - 1.1, width: 1, height: 2.1 }],
});

describe('reserved regions', () => {
  it('keeps every door approach clear', () => {
    const { regions } = reserveRegions(room(4));
    const door = regions.find((r) => r.kind === 'door')!;
    expect(door.min[0]).toBe(-6);
    expect(door.forbids).toEqual({ machines: true, runs: true });
  });

  it('puts in a gantry and stair only from two storeys up, unless asked', () => {
    expect(reserveRegions(room(4)).gantry).toBeNull();
    expect(reserveRegions(room(8)).gantry).not.toBeNull();
    expect(reserveRegions(room(8), { gantry: 'never' }).gantry).toBeNull();
    expect(
      reserveRegions(room(6.5), { gantry: 'always' }).gantry,
    ).not.toBeNull();
  });

  it('puts the stair against the gantry wall, foot by the door, clear of its approach', () => {
    const { gantry, regions } = reserveRegions(room(8));
    expect(gantry!.wall).toBe('south');
    expect(gantry!.climbs).toBe(1);
    const stair = regions.find((r) => r.kind === 'stair')!;
    const door = regions.find((r) => r.kind === 'door')!;
    expect(boxesOverlap(stair, door)).toBe(false);
    expect(stair.max[2]).toBe(6);
    expect(stair.max[2] - stair.min[2]).toBe(STAIR.width);
    // Its pitch is a fixed industrial stair's.
    const pitch = (Math.atan(STAIR.rise / STAIR.going) * 180) / Math.PI;
    expect(pitch).toBeGreaterThan(30);
    expect(pitch).toBeLessThan(42);
  });

  it('forbids runs over the stair and over the gantry walkway, up to the soffit', () => {
    const { regions, gantry } = reserveRegions(room(8));
    const deck = regions.find((r) => r.kind === 'gantry')!;
    expect(deck.max[1]).toBe(8);
    expect(deck.min[1]).toBeCloseTo(gantry!.y - GANTRY.deck);
    const mid = (gantry!.deck.from + gantry!.deck.to) / 2;
    // A pipe across the room at 6 m, over the gantry: refused.
    expect(
      runEntersRegion([mid, 6, -5], [mid, 6, 5.9], 0.05, regions)?.kind,
    ).toBe('gantry');
    // The same pipe stopping short of it: allowed.
    expect(
      runEntersRegion([mid, 6, -5], [mid, 6, 4.5], 0.05, regions),
    ).toBeNull();
    // Under the gantry's deck, at 3 m: allowed.
    expect(
      runEntersRegion([mid, 3, -5], [mid, 3, 5.9], 0.05, regions),
    ).toBeNull();
  });

  it('can be walked: up the stair, onto the gantry, and not off its edge', () => {
    const r = room(8);
    const { gantry } = reserveRegions(r);
    const g = gantry!;
    const z = 6 - 0.5;
    expect(regionFloorAt(r, g, g.stair.from + 0.1, z, 0)).toBeCloseTo(
      STAIR.rise,
    );
    expect(regionFloorAt(r, g, g.stair.to - 0.01, z, 3.6)).toBeGreaterThan(3.5);
    const onDeck = (g.deck.from + g.deck.to) / 2;
    expect(regionFloorAt(r, g, onDeck, z, 3.9)).toBe(g.y);
    // Under the gantry, from the floor.
    expect(regionFloorAt(r, g, onDeck, z, 0)).toBe(0);
    // Up there, a rail runs along the deck's open edge.
    const rails = regionSolids(r, g, g.y);
    expect(
      rails.some(
        (f) =>
          f.minX <= onDeck &&
          f.maxX >= onDeck &&
          f.minZ <= 6 - GANTRY.width &&
          f.maxZ >= 6 - GANTRY.width,
      ),
    ).toBe(true);
  });
});
