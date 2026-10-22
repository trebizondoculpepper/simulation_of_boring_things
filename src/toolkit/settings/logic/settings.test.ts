import { describe, expect, it } from 'vite-plus/test';
import { DEFAULT_SETTINGS, RANGES, cleanSettings } from './settings';

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
      quality: 'low',
      onScreenControls: false,
    };
    expect(cleanSettings(mine)).toEqual(mine);
  });

  it('clamp numbers to their ranges and drop bad values', () => {
    const s = cleanSettings({
      volume: 7,
      sensitivity: -1,
      fov: Number.NaN,
      quality: 'ultra',
      invertY: 'yes',
    });
    expect(s.volume).toBe(RANGES.volume.max);
    expect(s.sensitivity).toBe(RANGES.sensitivity.min);
    expect(s.fov).toBe(DEFAULT_SETTINGS.fov);
    expect(s.quality).toBe(DEFAULT_SETTINGS.quality);
    expect(s.invertY).toBe(DEFAULT_SETTINGS.invertY);
  });
});
