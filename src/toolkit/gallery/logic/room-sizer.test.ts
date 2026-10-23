import { describe, expect, it } from 'vite-plus/test';
import { sizeRoom } from './room-sizer';

const pump = { w: 2.2, d: 1, h: 1.6 };

describe('room sizer', () => {
  it('sizes a room at about three times its machines bare footprint, square, two storeys', () => {
    const items = Array.from({ length: 10 }, () => pump);
    const size = sizeRoom(items);
    const bare = 10 * pump.w * pump.d;
    expect(size.w * size.d).toBeGreaterThan(2.5 * bare);
    expect(size.w * size.d).toBeLessThan(5 * bare);
    expect(size.w).toBe(size.d);
    expect(size.h).toBe(8);
    expect(size.reasons.length).toBeGreaterThan(3);
  });

  it('grows when asked, and is taller for a tall machine in one storey', () => {
    const a = sizeRoom([pump, pump]);
    const b = sizeRoom([pump, pump], { grow: 0.3 });
    expect(b.w * b.d).toBeGreaterThan(a.w * a.d);
    expect(sizeRoom([{ w: 2, d: 2, h: 3.5 }], { storeys: 1 }).h).toBe(5);
  });
});
