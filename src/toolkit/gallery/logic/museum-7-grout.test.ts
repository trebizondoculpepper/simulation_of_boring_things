import { describe, expect, it } from 'vite-plus/test';
import {
  BENCH,
  HALL7,
  PLINTHS,
  ROW,
  TIMELINE,
  hall7Solids,
  jointLength,
  plinthX,
  timelineX,
} from './museum-7-grout';

describe('Hall 7, grout', () => {
  it('has ten plinths, numbered in order, east to west', () => {
    expect(PLINTHS.map((p) => p.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (let n = 2; n <= 10; n++)
      expect(plinthX(n)).toBeLessThan(plinthX(n - 1));
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

  it('keeps the row, its timeline and bench inside the hall and clear of both archways', () => {
    expect(TIMELINE.east).toBeLessThan(HALL7.halfX);
    expect(timelineX(1840)).toBeCloseTo(TIMELINE.east);
    expect(timelineX(2026)).toBeCloseTo(TIMELINE.west);
    for (const s of hall7Solids()) {
      expect(s.minX).toBeGreaterThan(-HALL7.halfX);
      expect(s.maxX).toBeLessThan(HALL7.halfX);
      expect(s.maxZ).toBeLessThan(HALL7.halfZ);
      // The west archway is z within ±1.8; the north one far from the row.
      expect(s.minZ).toBeGreaterThan(1.8);
    }
    expect(BENCH.x).toBeLessThan(plinthX(10));
    expect(ROW.lecternZ).toBeLessThan(ROW.ropeNorth);
  });
});
