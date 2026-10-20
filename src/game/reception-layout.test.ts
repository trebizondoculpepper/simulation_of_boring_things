import { describe, expect, it } from 'vite-plus/test';
import { RECEPTION_SOLIDS } from './reception-layout';

describe('reception layout', () => {
  it('keeps the entrance-to-changing passage open', () => {
    for (const fixture of RECEPTION_SOLIDS) {
      expect(fixture.maxZ <= 23 || fixture.minZ >= 27).toBe(true);
      expect(fixture.minX).toBeGreaterThanOrEqual(96);
      expect(fixture.maxX).toBeLessThanOrEqual(112);
    }
  });
});
