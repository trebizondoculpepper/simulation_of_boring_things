import { describe, expect, it } from 'vite-plus/test';
import { roomById } from './facility-plan';
import {
  BENCHES,
  CHANGING_SOLIDS,
  CUBICLES,
  LOCKER_BANKS,
} from './changing-layout';
import { slide } from '../toolkit/controls/logic/walk-collision';

describe('changing village furniture', () => {
  it('keeps the reception-to-hall route through the middle clear', () => {
    for (const item of CHANGING_SOLIDS)
      expect(item.maxZ <= 22.5 || item.minZ >= 27.5).toBe(true);
    const crossing = slide(CHANGING_SOLIDS, 95, 25, -14, 0, 0.25);
    expect(crossing.x).toBeLessThan(82);
  });
  it('keeps cubicles, lockers and benches inside the room', () => {
    const room = roomById('changing');
    for (const item of [...CUBICLES, ...LOCKER_BANKS, ...BENCHES]) {
      expect(item.minX).toBeGreaterThan(room.minX);
      expect(item.maxX).toBeLessThan(room.maxX);
      expect(item.minZ).toBeGreaterThan(room.minZ);
      expect(item.maxZ).toBeLessThan(room.maxZ);
    }
  });
});
