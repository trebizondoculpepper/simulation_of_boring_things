import { describe, expect, it } from 'vite-plus/test';
import {
  BOUNDS,
  CHAIRS,
  CHANNEL,
  COLUMNS,
  DECKS,
  DOORS,
  LIFEGUARD_CHAIR,
  LOST_PROPERTY,
  POOLS,
  deckAt,
  deckIndex,
  edge,
  floorAt,
  poolAt,
  solids,
} from './municipal-plan';
import { insidePolygon, insideRect } from './geometry';

describe('the Municipal Infinite, laid out', () => {
  it('steps down in three decks, south to north, each a step lower', () => {
    expect(deckAt(0, 12)).toBe(DECKS[0]);
    expect(deckAt(0, 0)).toBe(DECKS[1]);
    expect(deckAt(0, -12)).toBe(DECKS[2]);
    expect(DECKS[1]).toBeCloseTo(DECKS[0] - 0.45, 6);
    expect(DECKS[2]).toBeCloseTo(DECKS[1] - 0.45, 6);
    // Each step has a tread halfway down.
    const e = edge(0, 2);
    expect(deckAt(2, e - 0.2)).toBeCloseTo((DECKS[0] + DECKS[1]) / 2, 6);
  });

  it('opens its doors onto the top deck, clear of everything', () => {
    for (const [x, z] of DOORS) {
      const inside = x < 0 ? x + 1 : x - 1;
      expect(floorAt(inside, z)).toBe(0);
      expect(poolAt(inside, z)).toBeNull();
      for (const s of solids().filter(
        (r) => !(r.minX <= BOUNDS.minX + 0.4 || r.maxX >= BOUNDS.maxX - 0.4),
      ))
        expect(insideRect(s, inside, z)).toBe(false);
    }
  });

  it('keeps each pool on its own deck, each tier’s water lower than the last', () => {
    for (const pool of POOLS) {
      for (const [x, z] of pool.outline)
        if (z > BOUNDS.minZ) expect(deckIndex(x, z)).toBe(pool.deck);
    }
    const levels = POOLS.map((p) => DECKS[p.deck]);
    expect(levels).toEqual([...levels].sort((a, b) => b - a));
    expect(new Set(levels).size).toBe(3);
  });

  it('runs its lowest pool on through the north wall, as if it never ended', () => {
    const deep = POOLS.find((p) => p.id === 'deep')!;
    const mid = (CHANNEL.from + CHANNEL.to) / 2;
    expect(insidePolygon(deep.outline, mid, BOUNDS.minZ - 10)).toBe(true);
    expect(insidePolygon(deep.outline, mid, -11)).toBe(true);
  });

  it('wades the learner pool, and fences the deep ones', () => {
    const learner = POOLS.find((p) => p.wade)!;
    expect(floorAt(-5, 8.3)).toBeCloseTo(-learner.depth, 6);
    expect(floorAt(4, -1.3)).toBe(DECKS[1]);
  });

  it('stands its columns in the water and its furniture on dry deck', () => {
    for (const [x, z] of COLUMNS) expect(poolAt(x, z)).not.toBeNull();
    for (const [x, z] of [
      ...CHAIRS,
      [LIFEGUARD_CHAIR.x, LIFEGUARD_CHAIR.z],
      [LOST_PROPERTY.x, LOST_PROPERTY.z],
    ])
      expect(poolAt(x, z)).toBeNull();
  });
});
