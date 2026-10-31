import { describe, expect, it } from 'vite-plus/test';
import { DEFECTS, defectsAt, defectsKey } from './lcd-defects';

describe("an old panel's passing faults", () => {
  const day = Array.from({ length: 86400 / 10 }, (_, i) => i * 10);

  it('come now and then, and go again', () => {
    const on = day.filter((t) => defectsAt(t, 640, 480).length > 0).length;
    const share = on / day.length;
    expect(share).toBeGreaterThan(0.03);
    expect(share).toBeLessThan(0.4);
  });

  it('never last longer than their most', () => {
    let run = 0;
    let longest = 0;
    for (const t of day) {
      run = defectsAt(t, 640, 480).length ? run + 10 : 0;
      longest = Math.max(longest, run);
    }
    expect(longest).toBeLessThanOrEqual(DEFECTS.last[1] + 10);
  });

  it('stay clear of the title and status strips, on the panel', () => {
    for (const t of day)
      for (const d of defectsAt(t, 640, 480)) {
        expect(d.y).toBeGreaterThanOrEqual(60);
        expect(d.y).toBeLessThan(430);
        expect(d.x).toBeGreaterThanOrEqual(8);
        expect(d.x).toBeLessThan(632);
      }
  });

  it('are the same however the panel is stepped, and keyed only by what shows', () => {
    const t = day.find((s) => defectsAt(s, 640, 480).length > 0)!;
    expect(defectsAt(t, 640, 480)).toEqual(defectsAt(t, 640, 480));
    expect(defectsKey(defectsAt(t, 640, 480))).toBe(
      defectsKey(defectsAt(t + 1, 640, 480)),
    );
    expect(defectsKey([])).toBe('');
  });

  it('differ from panel to panel', () => {
    const a = day.map((t) => defectsKey(defectsAt(t, 640, 480, 1))).join('|');
    const b = day.map((t) => defectsKey(defectsAt(t, 640, 480, 2))).join('|');
    expect(a).not.toBe(b);
  });
});
