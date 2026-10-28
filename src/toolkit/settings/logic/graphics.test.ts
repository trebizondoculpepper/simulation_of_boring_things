import { describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_GRAPHICS,
  GRAPHICS,
  GRAPHICS_PRESETS,
  parsePreset,
  shadowMapSide,
} from './graphics';
import { RANGES, choosePreset } from './settings';

describe('graphics presets', () => {
  it('default to High, the look the game has always had', () => {
    expect(DEFAULT_GRAPHICS).toBe('high');
    expect(GRAPHICS.high).toMatchObject({
      renderLevel: 0,
      pixelRatioCap: 2,
      antialias: true,
      ambientOcclusion: true,
      bloom: true,
      refraction: true,
      shadows: true,
    });
  });

  it('cost less at each step down', () => {
    const order = GRAPHICS_PRESETS.map((p) => GRAPHICS[p]);
    for (let i = 1; i < order.length; i++) {
      const [lower, higher] = [order[i - 1], order[i]];
      expect(lower.renderLevel).toBeGreaterThan(higher.renderLevel);
      expect(lower.pixelRatioCap).toBeLessThan(higher.pixelRatioCap);
      expect(lower.shadowMapMax).toBeLessThanOrEqual(higher.shadowMapMax);
      for (const key of [
        'antialias',
        'ambientOcclusion',
        'bloom',
        'refraction',
        'shadows',
      ] as const)
        if (lower[key]) expect(higher[key]).toBe(true);
    }
  });

  it('switch off the costly effects on Low', () => {
    expect(GRAPHICS.low).toMatchObject({
      antialias: false,
      ambientOcclusion: false,
      bloom: false,
      refraction: false,
      shadows: false,
    });
  });

  it('start at render levels the slider offers', () => {
    for (const p of GRAPHICS_PRESETS) {
      const level = GRAPHICS[p].renderLevel;
      expect(level).toBeGreaterThanOrEqual(RANGES.renderLevel.min);
      expect(level).toBeLessThanOrEqual(RANGES.renderLevel.max);
      expect(choosePreset(p)).toEqual({ graphics: p, renderLevel: level });
    }
  });

  it('are read from text in any case, med for medium', () => {
    expect(parsePreset('LOW')).toBe('low');
    expect(parsePreset(' med ')).toBe('medium');
    expect(parsePreset('high')).toBe('high');
    expect(parsePreset('ultra')).toBeNull();
    expect(parsePreset(3)).toBeNull();
    expect(parsePreset(null)).toBeNull();
  });

  it('cut shadow maps to the preset’s largest', () => {
    expect(shadowMapSide(4096, 1024)).toBe(1024);
    expect(shadowMapSide(512, 1024)).toBe(512);
    expect(shadowMapSide(4096, 4096)).toBe(4096);
  });
});
