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
  frameLayout,
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

  it('caps the image’s width and height, only ever lowering the ratio', () => {
    // A 1920 × 1080 window on a Retina screen: 3840 × 2160 at 2x.
    expect(cappedPixelRatio(2, 1920, 1080, 'native')).toBe(2);
    expect(cappedPixelRatio(2, 1920, 1080, '2560x1440')).toBeCloseTo(
      1440 / 1080,
    );
    expect(cappedPixelRatio(2, 1920, 1080, '1280x720')).toBeCloseTo(720 / 1080);
    // The Steam Deck's 1280 × 800 in a 16:9 window: its width is the limit.
    expect(cappedPixelRatio(2, 1920, 1080, '1280x800')).toBeCloseTo(
      1280 / 1920,
    );
    // A small window is not drawn larger than it asked.
    expect(cappedPixelRatio(1, 1000, 600, '1920x1080')).toBe(1);
    expect(cappedPixelRatio(1.5, 0, 0, '1280x720')).toBe(1.5);
  });

  it('lays a capped image out in a window of another shape', () => {
    // 1024 × 768 (4:3) in a 1920 × 1080 window at 1x.
    expect(frameLayout(1920, 1080, 1, '1024x768', 'fill')).toBeNull();
    expect(frameLayout(1920, 1080, 1, 'native', 'letterbox')).toBeNull();
    expect(frameLayout(1920, 1080, 1, '1024x768', 'centre')).toEqual({
      width: 1024,
      height: 768,
      x: 448,
      y: 156,
      scaleX: 1,
      scaleY: 1,
    });
    expect(frameLayout(1920, 1080, 1, '1024x768', 'letterbox')).toEqual({
      width: 1440,
      height: 1080,
      x: 240,
      y: 0,
      scaleX: 1,
      scaleY: 1,
    });
    const stretched = frameLayout(1920, 1080, 1, '1024x768', 'stretch')!;
    expect(stretched.width * stretched.scaleX).toBeCloseTo(1920);
    expect(stretched.height * stretched.scaleY).toBeCloseTo(1080);
    // Centre shrinks, keeping its shape, only when the window is smaller.
    const small = frameLayout(800, 600, 1, '1920x1080', 'centre')!;
    expect(small.width).toBeCloseTo(800);
    expect(small.height).toBeCloseTo(450);
    // On a 2x screen, actual size is half as many CSS pixels.
    expect(frameLayout(1920, 1080, 2, '1024x768', 'centre')!.width).toBe(512);
  });

  it('reads an old height-only cap as its resolution', () => {
    expect(cleanSettings({ resolutionCap: '1080' }).resolutionCap).toBe(
      '1920x1080',
    );
    expect(cleanSettings({ resolutionCap: '720' }).resolutionCap).toBe(
      '1280x720',
    );
  });

  it('keep today’s look for an old save, and refuse nonsense', () => {
    expect(cleanSettings({ renderLevel: 2 }).ambientOcclusion).toBe('high');
    expect(cleanSettings({}).bloom).toBe('high');
    expect(cleanSettings({}).filmEffects).toBe(true);
    expect(cleanSettings({}).resolutionCap).toBe('1024x768');
    const bad = cleanSettings({
      ambientOcclusion: 'ultra',
      bloom: 3,
      filmEffects: 'yes',
      resolutionCap: '4k',
    });
    expect(bad.ambientOcclusion).toBe(DEFAULT_SETTINGS.ambientOcclusion);
    expect(bad.bloom).toBe(DEFAULT_SETTINGS.bloom);
    expect(bad.filmEffects).toBe(true);
    expect(bad.resolutionCap).toBe('1024x768');
    const good = cleanSettings({
      ambientOcclusion: 'off',
      bloom: 'low',
      filmEffects: false,
      resolutionCap: '1280x800',
    });
    expect(good).toMatchObject({
      ambientOcclusion: 'off',
      bloom: 'low',
      filmEffects: false,
      resolutionCap: '1280x800',
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
    // High chooses the player's own settings at their defaults, but for
    // render quality, middling (Medium's) by default (the owner, 2026-10-29).
    for (const [key, value] of Object.entries(PRESET_CHOICES.high))
      if (key !== 'renderLevel')
        expect(DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS]).toBe(
          value,
        );
    expect(DEFAULT_SETTINGS.renderLevel).toBe(
      PRESET_CHOICES.medium.renderLevel,
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
      aoMode: 'off',
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
