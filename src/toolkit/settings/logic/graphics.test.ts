import { describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_GRAPHICS,
  EFFECT_LEVELS,
  GRAPHICS,
  GRAPHICS_PRESETS,
  PRESET_CHOICES,
  ambientOcclusionAt,
  bloomAt,
  cappedPixelRatio,
  parsePreset,
  shadowMapSide,
} from './graphics';
import {
  DEFAULT_SETTINGS,
  RANGES,
  choosePreset,
  cleanSettings,
} from './settings';

describe('the costlier effects’ settings', () => {
  it('run ambient occlusion at fewer samples as its quality falls', () => {
    expect(ambientOcclusionAt('high')).toEqual({ enabled: true, samples: 12 });
    expect(ambientOcclusionAt('medium')).toEqual({ enabled: true, samples: 6 });
    expect(ambientOcclusionAt('low')).toEqual({ enabled: true, samples: 4 });
    expect(ambientOcclusionAt('off').enabled).toBe(false);
    // A room tuned at 6 (the bridge) keeps 6 at High, never fewer than 4.
    expect(ambientOcclusionAt('high', 6).samples).toBe(6);
    expect(ambientOcclusionAt('medium', 6).samples).toBe(4);
    expect(ambientOcclusionAt('low', 6).samples).toBe(4);
    // A room tuned below the floor keeps its own (the museum's 3).
    expect(ambientOcclusionAt('high', 3).samples).toBe(3);
    expect(ambientOcclusionAt('low', 3).samples).toBe(3);
  });

  it('run bloom on a smaller image as its quality falls', () => {
    expect(bloomAt('high')).toEqual({ enabled: true, scale: 1 });
    expect(bloomAt('medium').scale).toBe(0.5);
    expect(bloomAt('low').scale).toBe(0.25);
    expect(bloomAt('off').enabled).toBe(false);
  });

  it('caps the image’s height, only ever lowering the ratio', () => {
    // A 1080 px tall window on a Retina screen: 2160 tall at 2x.
    expect(cappedPixelRatio(2, 1080, 'native')).toBe(2);
    expect(cappedPixelRatio(2, 1080, '1440')).toBeCloseTo(1440 / 1080);
    expect(cappedPixelRatio(2, 1080, '720')).toBeCloseTo(720 / 1080);
    // A small window is not drawn larger than it asked.
    expect(cappedPixelRatio(1, 600, '1080')).toBe(1);
    expect(cappedPixelRatio(1.5, 0, '720')).toBe(1.5);
  });

  it('keep today’s look for an old save, and refuse nonsense', () => {
    expect(cleanSettings({ renderLevel: 2 }).ambientOcclusion).toBe('high');
    expect(cleanSettings({}).bloom).toBe('high');
    expect(cleanSettings({}).filmEffects).toBe(true);
    expect(cleanSettings({}).resolutionCap).toBe('native');
    const bad = cleanSettings({
      ambientOcclusion: 'ultra',
      bloom: 3,
      filmEffects: 'yes',
      resolutionCap: '4k',
    });
    expect(bad.ambientOcclusion).toBe(DEFAULT_SETTINGS.ambientOcclusion);
    expect(bad.bloom).toBe(DEFAULT_SETTINGS.bloom);
    expect(bad.filmEffects).toBe(true);
    expect(bad.resolutionCap).toBe('native');
    const good = cleanSettings({
      ambientOcclusion: 'off',
      bloom: 'low',
      filmEffects: false,
      resolutionCap: '720',
    });
    expect(good).toMatchObject({
      ambientOcclusion: 'off',
      bloom: 'low',
      filmEffects: false,
      resolutionCap: '720',
    });
  });
});

describe('graphics presets', () => {
  it('default to High, the look the game has always had', () => {
    expect(DEFAULT_GRAPHICS).toBe('high');
    expect(DEFAULT_SETTINGS.graphics).toBe('high');
    expect(GRAPHICS.high).toMatchObject({
      pixelRatioCap: 2,
      antialias: true,
      refraction: true,
      shadows: true,
    });
    // High chooses the player's own settings at their defaults.
    for (const [key, value] of Object.entries(PRESET_CHOICES.high))
      expect(DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS]).toBe(
        value,
      );
  });

  it('cost less at each step down', () => {
    const rank = (l: string) => EFFECT_LEVELS.indexOf(l as never);
    for (let i = 1; i < GRAPHICS_PRESETS.length; i++) {
      const [lower, higher] = [GRAPHICS_PRESETS[i - 1], GRAPHICS_PRESETS[i]];
      const [lo, hi] = [GRAPHICS[lower], GRAPHICS[higher]];
      expect(lo.pixelRatioCap).toBeLessThan(hi.pixelRatioCap);
      expect(lo.shadowMapMax).toBeLessThanOrEqual(hi.shadowMapMax);
      for (const key of ['antialias', 'refraction', 'shadows'] as const)
        if (lo[key]) expect(hi[key]).toBe(true);
      const [a, b] = [PRESET_CHOICES[lower], PRESET_CHOICES[higher]];
      expect(a.renderLevel).toBeGreaterThan(b.renderLevel);
      expect(rank(a.ambientOcclusion)).toBeLessThanOrEqual(
        rank(b.ambientOcclusion),
      );
      expect(rank(a.bloom)).toBeLessThanOrEqual(rank(b.bloom));
    }
  });

  it('switch off the costly effects on Low', () => {
    expect(GRAPHICS.low).toMatchObject({
      antialias: false,
      refraction: false,
      shadows: false,
    });
    expect(PRESET_CHOICES.low).toMatchObject({
      ambientOcclusion: 'off',
      bloom: 'off',
      filmEffects: false,
    });
  });

  it('start at render levels the slider offers, chosen with the preset', () => {
    for (const p of GRAPHICS_PRESETS) {
      const level = PRESET_CHOICES[p].renderLevel;
      expect(level).toBeGreaterThanOrEqual(RANGES.renderLevel.min);
      expect(level).toBeLessThanOrEqual(RANGES.renderLevel.max);
      expect(choosePreset(p)).toEqual({ graphics: p, ...PRESET_CHOICES[p] });
      // What it chooses survives cleaning.
      expect(
        cleanSettings({ ...DEFAULT_SETTINGS, ...choosePreset(p) }),
      ).toEqual({ ...DEFAULT_SETTINGS, ...choosePreset(p) });
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

  it('give an old or bad save High', () => {
    expect(cleanSettings({ renderLevel: 4 })).toMatchObject({
      graphics: 'high',
      renderLevel: 4,
    });
    expect(cleanSettings({ graphics: 'ultra' }).graphics).toBe('high');
    expect(cleanSettings({ graphics: 'medium' }).graphics).toBe('medium');
  });
});
