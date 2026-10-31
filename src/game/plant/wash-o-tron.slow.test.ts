import { describe, expect, it } from 'vite-plus/test';
import { advance, newWorld } from '../world';
import { OLYMPIC_DIRT_REF, olympicBed } from './olympic-battery';
import { allDue } from './wash-o-tron.test-support';

describe('the Lidoluxe Wash-O-Tron', () => {
  it('washes due filters in turn in AUTO, one at a time, each to clean, the pit never spilling', () => {
    // Its programme is in AUTO from the start.
    let w = allDue(newWorld());
    const washed = new Set<number>();
    let most = 0;
    for (let t = 0; t < 3 * 3600; t += 10) {
      w = advance(w, 10, 1);
      const busy = w.washOTron.filters.filter(
        (f) => f.mode !== 'filter' || f.phase !== 'steady',
      ).length;
      most = Math.max(most, busy);
      w.washOTron.filters.forEach((f, i) => {
        if (f.lastWash > 0) washed.add(i);
      });
    }
    expect(washed.size).toBeGreaterThanOrEqual(3);
    expect(most).toBe(1);
    expect(w.wetHall.spilt).toBe(0);
    for (const i of washed)
      expect(olympicBed(w.olympic, i).dirt).toBeLessThan(
        0.3 * OLYMPIC_DIRT_REF,
      );
  });
});
