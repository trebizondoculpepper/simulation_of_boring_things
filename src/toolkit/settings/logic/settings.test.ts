import { describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_SETTINGS,
  RANGES,
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
      onScreenControls: false,
    };
    expect(cleanSettings(mine)).toEqual(mine);
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
