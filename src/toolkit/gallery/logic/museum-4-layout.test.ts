import { describe, expect, it } from 'vite-plus/test';
import {
  COLUMNS,
  INTERIOR,
  WALKWAY,
  footprints,
  pipeRuns,
} from './museum-4-layout';
import { LINKS } from '../../../game/plant/museum-4-lab';

describe('Hall 4’s layout', () => {
  const feet = footprints();
  it('fits the hall and keeps the walk between the archways clear', () => {
    for (const f of feet) {
      expect(f.minX).toBeGreaterThanOrEqual(INTERIOR.minX);
      expect(f.maxX).toBeLessThanOrEqual(INTERIOR.maxX);
      expect(f.minZ).toBeGreaterThanOrEqual(INTERIOR.minZ);
      expect(f.maxZ).toBeLessThanOrEqual(INTERIOR.maxZ);
      expect(f.maxZ <= WALKWAY.minZ || f.minZ >= WALKWAY.maxZ).toBe(true);
    }
  });
  it('stands clear of the columns', () => {
    for (const c of COLUMNS)
      for (const f of feet)
        expect(
          c.x < f.minX - 0.3 ||
            c.x > f.maxX + 0.3 ||
            c.z < f.minZ - 0.3 ||
            c.z > f.maxZ + 0.3,
        ).toBe(true);
  });
  it('draws every link of the schematic, and nothing else', () => {
    expect(
      pipeRuns()
        .map((r) => r.edge)
        .sort(),
    ).toEqual(LINKS.map((l) => l.id).sort());
  });
});
