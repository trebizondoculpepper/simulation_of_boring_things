import { describe, expect, it } from 'vite-plus/test';
import { settingsFromUrl } from './url-settings';
import { choosePreset } from './settings';

describe('settings from the address', () => {
  it('reads resolution as the render quality level', () => {
    expect(settingsFromUrl('?resolution=6')).toEqual({ renderLevel: 6 });
    expect(settingsFromUrl('?resolution=0')).toEqual({ renderLevel: 0 });
    expect(settingsFromUrl('?resolution=10')).toEqual({ renderLevel: 10 });
    expect(settingsFromUrl('?room=main_corridor&resolution=6')).toEqual({
      renderLevel: 6,
    });
  });

  it('clamps and rounds the level', () => {
    expect(settingsFromUrl('?resolution=11')).toEqual({ renderLevel: 10 });
    expect(settingsFromUrl('?resolution=99')).toEqual({ renderLevel: 10 });
    expect(settingsFromUrl('?resolution=-3')).toEqual({ renderLevel: 0 });
    expect(settingsFromUrl('?resolution=2.6')).toEqual({ renderLevel: 3 });
  });

  it('ignores what it cannot read, and other parameters', () => {
    expect(settingsFromUrl('?resolution=low')).toEqual({});
    expect(settingsFromUrl('?resolution=')).toEqual({});
    expect(settingsFromUrl('?resolution=Infinity')).toEqual({});
    expect(settingsFromUrl('')).toEqual({});
    expect(settingsFromUrl('?room=dev_pumps&noclip=1')).toEqual({});
    expect(settingsFromUrl('?graphics=ultra')).toEqual({});
  });

  it('reads a graphics preset, with the settings it chooses', () => {
    expect(settingsFromUrl('?graphics=low')).toEqual(choosePreset('low'));
    expect(settingsFromUrl('?graphics=low')).toMatchObject({
      graphics: 'low',
      renderLevel: 6,
      aoMode: 'off',
      bloom: 'off',
    });
    expect(settingsFromUrl('?graphics=Medium')).toEqual(choosePreset('medium'));
    expect(settingsFromUrl('?graphics=high')).toEqual(choosePreset('high'));
  });

  it('lets resolution override the preset’s level, either order', () => {
    expect(settingsFromUrl('?graphics=low&resolution=2')).toEqual({
      ...choosePreset('low'),
      renderLevel: 2,
    });
    expect(settingsFromUrl('?resolution=8&graphics=high')).toEqual({
      ...choosePreset('high'),
      renderLevel: 8,
    });
  });
});
