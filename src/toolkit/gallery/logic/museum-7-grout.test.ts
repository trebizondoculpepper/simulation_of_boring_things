import { describe, expect, it } from 'vite-plus/test';
import {
  BENCH,
  HALL7,
  PLACES,
  PLINTHS,
  PROJECTOR,
  ROPE_HALF,
  TIMELINE,
  hall7Solids,
  jointLength,
  lecternAt,
  timelineX,
} from './museum-7-grout';

describe('Hall 7, grout', () => {
  it('has ten plinths, numbered in order, each with its place', () => {
    expect(PLINTHS.map((p) => p.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const p of PLINTHS) expect(PLACES[p.n]).toBeDefined();
  });

  it('stands some round the edge and a few in the middle, the 1970s’ among them', () => {
    const edge = (n: number) => {
      const { x, z } = PLACES[n];
      return HALL7.halfX - Math.abs(x) < 1.2 || HALL7.halfZ - Math.abs(z) < 1.2;
    };
    const middle = PLINTHS.filter((p) => !edge(p.n)).map((p) => p.n);
    expect(middle.length).toBeGreaterThanOrEqual(2);
    expect(middle.length).toBeLessThanOrEqual(4);
    expect(middle).toContain(5);
    // Every plaque stands on the hall's side of its plinth, not in a wall.
    for (const p of PLINTHS) {
      const l = lecternAt(p.n);
      expect(Math.abs(l.x)).toBeLessThan(HALL7.halfX - 0.5);
      expect(Math.abs(l.z)).toBeLessThan(HALL7.halfZ - 0.5);
    }
  });

  it('hangs the projector high, over the way in to the 1970s’ plinth', () => {
    expect(PROJECTOR.y).toBeGreaterThan(4);
    expect(PROJECTOR.y).toBeLessThan(HALL7.h);
    expect(PROJECTOR.z).toBeLessThan(PLACES[5].z);
  });

  it('colours exactly one specimen, the 1970s', () => {
    const coloured = PLINTHS.filter((p) => p.grout !== 'grey');
    expect(coloured.map((p) => p.name)).toEqual(['Coloured cement grout']);
    expect(coloured[0].years).toContain('1970s');
  });

  it('keeps the research’s corrections', () => {
    const all = JSON.stringify(PLINTHS);
    expect(all).not.toMatch(/thick joint/i);
    expect(PLINTHS[1].what).toContain('1840s');
    expect(PLINTHS[7].years).toMatch(/1940s.*1960s/);
    expect(PLINTHS[6].reverence).toContain('regrets that its specimen is not');
    expect(all).not.toMatch(/Mapei|ARDEX|Laticrete|Sika|Weber|BAL\b/);
  });

  it('works the joint fact: nearly six kilometres', () => {
    expect(jointLength()).toBeGreaterThan(5600);
    expect(jointLength()).toBeLessThan(5700);
  });

  it('keeps everything inside the hall and clear of both archways and of each other', () => {
    expect(TIMELINE.east).toBeLessThan(HALL7.halfX);
    expect(timelineX(1840)).toBeCloseTo(TIMELINE.east);
    expect(timelineX(2026)).toBeCloseTo(TIMELINE.west);
    const solids = hall7Solids();
    for (const s of solids) {
      expect(s.minX).toBeGreaterThan(-HALL7.halfX);
      expect(s.maxX).toBeLessThan(HALL7.halfX);
      expect(s.minZ).toBeGreaterThan(-HALL7.halfZ);
      expect(s.maxZ).toBeLessThan(HALL7.halfZ);
      // The west archway: x near −7.7, z within ±1.8; the north one: z near −6.7, x within ±1.8; each 2 m deep.
      const west = s.minX < -HALL7.halfX + 2 && s.maxZ > -1.8 && s.minZ < 1.8;
      const north = s.minZ < -HALL7.halfZ + 2 && s.maxX > -1.8 && s.minX < 1.8;
      expect(west || north).toBe(false);
    }
    // No two plinths' ropes overlap.
    for (const a of PLINTHS)
      for (const b of PLINTHS)
        if (a.n < b.n) {
          const pa = PLACES[a.n];
          const pb = PLACES[b.n];
          expect(
            Math.abs(pa.x - pb.x) > 2 * ROPE_HALF ||
              Math.abs(pa.z - pb.z) > 2 * ROPE_HALF,
          ).toBe(true);
        }
    expect(BENCH.x).toBeLessThan(-HALL7.halfX + 1);
  });
});
