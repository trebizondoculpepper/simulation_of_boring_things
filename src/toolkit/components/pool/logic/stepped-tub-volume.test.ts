import { describe, expect, it } from 'vite-plus/test';
import {
  steppedTubHeightAtVolume,
  steppedTubPercentFull,
  steppedTubRadiusAtHeight,
  steppedTubVolumeAtHeight,
} from './stepped-tub-volume';

const profile = {
  floor: 0.005,
  step: 0.435,
  rim: 0.885,
  lowerBottomRadius: 0.58,
  lowerTopRadius: 0.63,
  upperBottomRadius: 1.17,
  upperTopRadius: 1.2,
};

describe('stepped tub fill', () => {
  it('keeps empty and full at the floor and waterline', () => {
    const capacity = steppedTubVolumeAtHeight(profile, profile.rim);
    expect(steppedTubHeightAtVolume(profile, 0)).toBe(profile.floor);
    expect(steppedTubHeightAtVolume(profile, capacity)).toBe(profile.rim);
    expect(steppedTubPercentFull(profile, 0)).toBe(0);
    expect(steppedTubPercentFull(profile, capacity)).toBe(100);
  });

  it('reaches the seat early because the lower basin holds less water', () => {
    const capacity = steppedTubVolumeAtHeight(profile, profile.rim);
    const stepFraction =
      steppedTubVolumeAtHeight(profile, profile.step) / capacity;
    expect(stepFraction).toBeCloseTo(0.2, 2);
    expect(steppedTubPercentFull(profile, capacity * stepFraction)).toBeCloseTo(
      20,
      0,
    );
    expect(
      steppedTubHeightAtVolume(profile, capacity * stepFraction),
    ).toBeCloseTo(profile.step, 7);
    expect(steppedTubHeightAtVolume(profile, capacity * 0.5)).toBeGreaterThan(
      (profile.floor + profile.rim) / 2,
    );
  });

  it('preserves volume and widens the water surface at the seat', () => {
    const capacity = steppedTubVolumeAtHeight(profile, profile.rim);
    for (const fraction of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const height = steppedTubHeightAtVolume(profile, capacity * fraction);
      expect(steppedTubVolumeAtHeight(profile, height) / capacity).toBeCloseTo(
        fraction,
        7,
      );
    }
    expect(
      steppedTubRadiusAtHeight(profile, profile.step - 0.0001),
    ).toBeCloseTo(profile.lowerTopRadius, 3);
    expect(steppedTubRadiusAtHeight(profile, profile.step)).toBe(
      profile.upperBottomRadius,
    );
  });
});
