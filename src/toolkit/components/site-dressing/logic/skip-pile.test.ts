import { describe, expect, it } from 'vite-plus/test';
import { PILE_MAX_SLOPE, createSkipPile } from './skip-pile';
import type { PileRest, Slab } from './skip-pile';

/** A builder's mini skip's inside, as `skip.ts` builds it. */
const SKIP = {
  floorHalfX: 0.6,
  topHalfX: 0.9,
  halfZ: 0.6,
  floor: 0.075,
  rim: 0.91,
};
/** A circuit board. */
const BOARD: Slab = { length: 0.25, width: 0.18, thickness: 0.02 };

/** A seeded random number generator (mulberry32). */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The lowest of a resting slab's eight corners. */
function lowest(rest: PileRest, slab: Slab) {
  let low = Infinity;
  for (const a of [-1, 1])
    for (const b of [-1, 1])
      for (const c of [-1, 1])
        low = Math.min(
          low,
          rest.centre.y +
            (a * rest.along.y * slab.length) / 2 +
            (b * rest.up.y * slab.thickness) / 2 +
            (c * rest.across.y * slab.width) / 2,
        );
  return low;
}

describe('settling things into a skip', () => {
  it('lays the first board flat on the floor', () => {
    const pile = createSkipPile(SKIP);
    const rest = pile.settle(BOARD, { x: 0, z: 0, yaw: 0.3 });
    expect(rest.tilt).toBeCloseTo(0);
    expect(rest.centre.y).toBeCloseTo(SKIP.floor + BOARD.thickness / 2);
    expect(rest.up.y).toBeCloseTo(1);
  });

  it('forgets a board taken out, so the next lands where it was', () => {
    const pile = createSkipPile(SKIP);
    const under = pile.settle(BOARD, { x: 0, z: 0, yaw: 0 });
    const over = pile.settle(BOARD, { x: 0, z: 0, yaw: 0 });
    pile.remove(under.id);
    pile.remove(over.id);
    expect(pile.count).toBe(0);
    expect(pile.top()).toBeCloseTo(SKIP.floor);
    const again = pile.settle(BOARD, { x: 0, z: 0, yaw: 0 });
    expect(again.centre.y).toBeCloseTo(SKIP.floor + BOARD.thickness / 2);
    // Taking out one of two leaves the other's height in the pile.
    const other = pile.settle(BOARD, { x: 0.5, z: 0, yaw: 0 });
    pile.remove(again.id);
    expect(pile.count).toBe(1);
    expect(pile.heightAt(0.5, 0)).toBeGreaterThan(SKIP.floor + 0.01);
    expect(pile.heightAt(0, 0)).toBeCloseTo(SKIP.floor);
    expect(other.id).not.toBe(again.id);
  });

  it('lays a board dropped on another flat on top of it', () => {
    const pile = createSkipPile(SKIP);
    pile.settle(BOARD, { x: 0, z: 0, yaw: 0 });
    const rest = pile.settle(BOARD, { x: 0, z: 0, yaw: 0 });
    expect(rest.tilt).toBeCloseTo(0);
    expect(rest.centre.y).toBeCloseTo(SKIP.floor + BOARD.thickness * 1.5, 2);
  });

  it('tips a board half over another onto it, resting, not floating or sunk', () => {
    const pile = createSkipPile(SKIP);
    pile.settle(BOARD, { x: 0, z: 0, yaw: 0 });
    const rest = pile.settle(BOARD, { x: 0.2, z: 0, yaw: 0 });
    expect(rest.tilt).toBeGreaterThan(0.01);
    expect(rest.tilt).toBeLessThanOrEqual(PILE_MAX_SLOPE + 1e-6);
    // Down at one end to the floor, up on the other board at the other.
    expect(lowest(rest, BOARD)).toBeGreaterThan(SKIP.floor - 0.005);
    expect(lowest(rest, BOARD)).toBeLessThan(SKIP.floor + 0.01);
  });

  it('keeps everything inside the skip, turning long things along it', () => {
    const pile = createSkipPile(SKIP);
    const plank: Slab = { length: 1.5, width: 0.2, thickness: 0.03 };
    const rest = pile.settle(plank, { x: 0.8, z: 0.5, yaw: Math.PI / 2 });
    // Too long to lie across: it lies along (tipped, on the sloping ends).
    expect(Math.abs(rest.along.z)).toBeLessThan(0.05);
    expect(rest.tilt).toBeLessThanOrEqual(PILE_MAX_SLOPE + 1e-6);
    const random = seeded(7);
    for (let i = 0; i < 200; i++) {
      const r = pile.settle(BOARD, {
        x: (random() * 2 - 1) * 1.2,
        z: (random() * 2 - 1) * 1.2,
        yaw: random() * Math.PI * 2,
      });
      expect(Math.abs(r.centre.x)).toBeLessThan(SKIP.topHalfX);
      expect(Math.abs(r.centre.z)).toBeLessThan(SKIP.halfZ);
    }
  });

  it('slides off the steep ends rather than clinging to them', () => {
    const pile = createSkipPile(SKIP);
    const rest = pile.settle(BOARD, { x: 0.85, z: 0, yaw: 0 });
    expect(rest.tilt).toBeLessThanOrEqual(PILE_MAX_SLOPE + 1e-6);
    expect(rest.centre.x).toBeLessThan(0.85);
  });

  it('never rests a board on anything steeper than it would stay on', () => {
    const pile = createSkipPile(SKIP);
    const random = seeded(3);
    for (let i = 0; i < 150; i++) {
      const rest = pile.settle(BOARD, {
        x: (random() * 2 - 1) * 0.8,
        z: (random() * 2 - 1) * 0.5,
        yaw: random() * Math.PI * 2,
      });
      expect(rest.tilt).toBeLessThanOrEqual(PILE_MAX_SLOPE + 1e-6);
    }
  });

  it('packs a skip-load of boards in low, so it is not soon full', () => {
    const pile = createSkipPile(SKIP);
    const random = seeded(11);
    for (let i = 0; i < 120; i++)
      pile.settle(BOARD, {
        x: (random() * 2 - 1) * 0.8,
        z: (random() * 2 - 1) * 0.5,
        yaw: random() * Math.PI * 2,
      });
    expect(pile.count).toBe(120);
    // A hundred and twenty boards stand under the rim.
    expect(pile.top()).toBeLessThan(SKIP.rim);
    pile.reset();
    expect(pile.count).toBe(0);
    expect(pile.heightAt(0, 0)).toBeCloseTo(SKIP.floor);
  });
});
