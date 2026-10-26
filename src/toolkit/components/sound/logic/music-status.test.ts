import { describe, expect, it } from 'vite-plus/test';
import { musicSourceStatus } from './music-source';
import { amplifierStatus } from './amplifier';

describe('the music rack’s units say what they are doing', () => {
  // The owner, 2026-10-25: the source what is playing; the amplifier its
  // state, as an active component.
  it('the source names its track while it has power', () => {
    const titles = ['Lagoon', 'Steam'];
    expect(musicSourceStatus({ track: 1, position: 3 }, true, titles)).toBe(
      'Playing “Steam”',
    );
    expect(musicSourceStatus({ track: 1, position: 3 }, false, titles)).toBe(
      'Off',
    );
  });

  it('the amplifier: no power, off, or on at its volume', () => {
    expect(amplifierStatus({ on: true, volume: 0.4 }, false)).toBe('No power');
    expect(amplifierStatus({ on: false, volume: 0.4 }, true)).toBe('Off');
    expect(amplifierStatus({ on: true, volume: 0.65 }, true)).toBe(
      'On, volume 65 %',
    );
  });
});
