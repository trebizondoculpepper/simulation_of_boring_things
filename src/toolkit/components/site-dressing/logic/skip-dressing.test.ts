import { describe, expect, it } from 'vite-plus/test';
import {
  FLASH_ON,
  FLASH_SECONDS,
  GRAFFITI_CHANCE,
  LAMP_CHANCE,
  dressSkip,
  lampLit,
} from './skip-dressing';
import { GRAFFITI } from './graffiti';

/** A seeded random, so the tests see the same skips every time. */
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const many = (n = 2000) => {
  const random = seeded(7);
  return Array.from({ length: n }, () => dressSkip(random));
};

describe('dressing a skip', () => {
  it('chooses graffiti and lamps independently at the requested rates', () => {
    expect(GRAFFITI_CHANCE).toBe(0.6);
    expect(LAMP_CHANCE).toBe(0.5);
    const skips = many();
    const tagged = skips.filter((s) => s.tags.length).length / skips.length;
    const lit = skips.filter((s) => s.lamps.length).length / skips.length;
    expect(tagged).toBeCloseTo(GRAFFITI_CHANCE, 1);
    expect(lit).toBeCloseTo(LAMP_CHANCE, 1);
    expect(
      skips.filter((s) => s.tags.length && s.lamps.length).length /
        skips.length,
    ).toBeCloseTo(GRAFFITI_CHANCE * LAMP_CHANCE, 1);
    expect(skips.some((s) => !s.tags.length && !s.lamps.length)).toBe(true);
  });

  it('picks one of the gallery tags for one long side', () => {
    for (const { tags } of many()) {
      expect(tags.length).toBeLessThanOrEqual(1);
      for (const tag of tags) {
        expect(['front', 'back']).toContain(tag.face);
        expect(GRAFFITI).toContain(tag.art);
        expect(tag.art.kind).toBe('tag');
        expect([-1, 1]).toContain(tag.side);
      }
    }
  });

  it('puts lamps on two corners of one side, or on all four', () => {
    for (const { lamps } of many()) {
      expect([0, 2, 4]).toContain(lamps.length);
      if (lamps.length === 2) expect(lamps[0].side).toBe(lamps[1].side);
      const corners = new Set(lamps.map((l) => `${l.end},${l.side}`));
      expect(corners.size).toBe(lamps.length);
    }
  });

  it('flashes each lamp briefly once a second, from its own phase', () => {
    const lamp = { end: 1 as const, side: 1 as const, phase: 0 };
    let lit = 0;
    const steps = 1000;
    for (let i = 0; i < steps; i++)
      if (lampLit(lamp, (i / steps) * FLASH_SECONDS)) lit++;
    expect(lit / steps).toBeCloseTo(FLASH_ON / FLASH_SECONDS, 2);
    const later = { ...lamp, phase: 0.5 };
    expect(lampLit(lamp, 0)).toBe(true);
    expect(lampLit(later, 0)).toBe(false);
  });
});
