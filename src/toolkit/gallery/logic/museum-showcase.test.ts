import { describe, expect, it } from 'vite-plus/test';
import { SHOWCASE, sizeShowcase } from './museum-showcase';

describe('a museum showcase, sized round what it shows', () => {
  it('keeps the glass its clearance off the object all round and above', () => {
    const c = { w: 2.0, d: 0.9, h: 1.08 };
    const s = sizeShowcase(c);
    expect(s.hood.w - 2 * SHOWCASE.glass - c.w).toBeCloseTo(
      2 * SHOWCASE.clearance,
    );
    expect(s.hood.d - 2 * SHOWCASE.glass - c.d).toBeCloseTo(
      2 * SHOWCASE.clearance,
    );
    expect(s.hood.h - c.h).toBeCloseTo(SHOWCASE.headroom);
    expect(s.atticY).toBeCloseTo(s.deckY + s.hood.h);
    expect(s.topY).toBeCloseTo(s.atticY + SHOWCASE.attic);
  });

  it('sets the deck so the object sits near the eye line, within the range', () => {
    expect(sizeShowcase({ w: 0.3, d: 0.3, h: 0.3 }).deckY).toBe(
      SHOWCASE.deckMax,
    );
    expect(sizeShowcase({ w: 1, d: 1, h: 2 }).deckY).toBe(SHOWCASE.deckMin);
    const mid = sizeShowcase({ w: 1, d: 1, h: 1.1 });
    expect(mid.deckY + 1.1 / 2).toBeCloseTo(SHOWCASE.eyeLine);
    expect(sizeShowcase({ w: 1, d: 1, h: 1 }, 0.8).deckY).toBe(0.8);
  });

  it('puts its label inside the glass, and keeps walkers off the plinth', () => {
    const s = sizeShowcase({ w: 1.2, d: 0.6, h: 0.5 });
    const inside = s.w / 2 - SHOWCASE.glass;
    expect(s.label.x + SHOWCASE.label.w / 2).toBeLessThan(inside);
    expect(s.label.z + SHOWCASE.label.h / 2).toBeLessThan(
      s.d / 2 - SHOWCASE.glass,
    );
    expect(s.solid.minX).toBeLessThan(-s.w / 2);
    expect(s.solid.maxZ).toBeGreaterThan(s.d / 2);
  });

  it('casts its spot wide enough to reach the deck’s corners', () => {
    const s = sizeShowcase({ w: 2, d: 0.9, h: 1 });
    const corner = Math.hypot(s.hood.w, s.hood.d) / 2;
    expect(Math.tan(s.spot.angle) * s.hood.h).toBeGreaterThanOrEqual(
      corner * 0.99,
    );
  });
});
