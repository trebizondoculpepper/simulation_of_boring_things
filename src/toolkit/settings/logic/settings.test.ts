import { describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_SETTINGS,
  RANGES,
  choosePreset,
  cleanSettings,
  renderScale,
} from './settings';

describe('the player’s settings', () => {
  it('fall back to their defaults when nothing was stored', () => {
    expect(cleanSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(cleanSettings('rubbish')).toEqual(DEFAULT_SETTINGS);
  });

  it('keep what was stored when it is good', () => {
    const mine = {
      volume: 0.3,
      sensitivity: 1.5,
      invertY: true,
      fov: 75,
      renderLevel: 6,
      onScreenControls: 'never',
      overlayScale: 1.75,
      aoMode: 'live',
      ambientOcclusion: 'medium',
      bloom: 'off',
      filmEffects: false,
      resolutionCap: '1920x1080',
      aspectFit: 'stretch',
      graphics: 'low',
    };
    expect(cleanSettings(mine)).toEqual(mine);
  });

  it('migrates old control choices and validates all three policies', () => {
    expect(cleanSettings({ onScreenControls: true }).onScreenControls).toBe(
      'automatic',
    );
    expect(cleanSettings({ onScreenControls: false }).onScreenControls).toBe(
      'never',
    );
    for (const choice of ['automatic', 'always', 'never'])
      expect(cleanSettings({ onScreenControls: choice }).onScreenControls).toBe(
        choice,
      );
    expect(cleanSettings({ onScreenControls: 'bad' }).onScreenControls).toBe(
      'automatic',
    );
  });

  it('clamp numbers to their ranges and drop bad values', () => {
    const s = cleanSettings({
      volume: 7,
      sensitivity: -1,
      fov: Number.NaN,
      renderLevel: 2.6,
      invertY: 'yes',
    });
    expect(s.volume).toBe(RANGES.volume.max);
    expect(s.sensitivity).toBe(RANGES.sensitivity.min);
    expect(s.fov).toBe(DEFAULT_SETTINGS.fov);
    expect(s.renderLevel).toBe(3);
    expect(s.invertY).toBe(DEFAULT_SETTINGS.invertY);
  });

  it('render at 1:1 at level 0, lower at each step, as 1 / ln(e + level)', () => {
    expect(renderScale(0)).toBeCloseTo(1, 12);
    expect(renderScale(6)).toBeCloseTo(0.4619, 3);
    for (let n = 1; n <= RANGES.renderLevel.max; n++)
      expect(renderScale(n)).toBeLessThan(renderScale(n - 1));
  });
});

describe('overlay scale', () => {
  it('defaults to 1 and keeps a stored value within its range', () => {
    expect(cleanSettings({}).overlayScale).toBe(1);
    expect(cleanSettings({ overlayScale: 1.5 }).overlayScale).toBe(1.5);
    expect(cleanSettings({ overlayScale: 9 }).overlayScale).toBe(2.5);
    expect(cleanSettings({ overlayScale: 'big' }).overlayScale).toBe(1);
  });
});

describe('the ambient occlusion mode (the owner, 2026-10-30)', () => {
  it('is SIMPLE by default', () => {
    expect(cleanSettings(null).aoMode).toBe('simple');
  });
  it('turns an old ONE-TIME into SIMPLE and keeps BAKED', () => {
    expect(cleanSettings({ aoMode: 'bake' }).aoMode).toBe('simple');
    expect(cleanSettings({ aoMode: 'rays' }).aoMode).toBe('rays');
  });
  it('turns an old save’s live level into SIMPLE, and keeps an old off', () => {
    for (const level of ['low', 'medium', 'high'])
      expect(cleanSettings({ ambientOcclusion: level }).aoMode).toBe('simple');
    expect(cleanSettings({ ambientOcclusion: 'off' }).aoMode).toBe('off');
  });
  it('keeps a chosen mode, and refuses nonsense', () => {
    expect(cleanSettings({ aoMode: 'live' }).aoMode).toBe('live');
    expect(
      cleanSettings({ aoMode: 'off', ambientOcclusion: 'high' }).aoMode,
    ).toBe('off');
    expect(cleanSettings({ aoMode: 'ultra' }).aoMode).toBe('simple');
  });
  it('is set by a preset: OFF on Low, SIMPLE otherwise, LIVE’s quality with it', () => {
    expect(choosePreset('low')).toMatchObject({
      aoMode: 'off',
      ambientOcclusion: 'low',
    });
    expect(choosePreset('medium')).toMatchObject({ aoMode: 'simple' });
    expect(choosePreset('high')).toMatchObject({
      aoMode: 'simple',
      ambientOcclusion: 'high',
    });
  });
});
