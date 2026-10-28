import { describe, expect, it } from 'vite-plus/test';
import { ambientOcclusionAt, bloomAt, cappedPixelRatio } from './graphics';
import { DEFAULT_SETTINGS, cleanSettings } from './settings';

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
