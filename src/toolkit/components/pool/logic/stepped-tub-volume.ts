import {
  basinHeightAtVolume,
  basinPercentFull,
} from '../../../../game/water/basin-profile';

/** The water-holding cross section of a tub with a ledge between two tapered basins. */
export interface SteppedTubProfile {
  floor: number;
  step: number;
  rim: number;
  lowerBottomRadius: number;
  lowerTopRadius: number;
  upperBottomRadius: number;
  upperTopRadius: number;
}

function frustumVolume(height: number, bottom: number, top: number): number {
  return (Math.PI * height * (bottom * bottom + bottom * top + top * top)) / 3;
}

function partialVolume(
  height: number,
  totalHeight: number,
  bottom: number,
  top: number,
): number {
  const radius = bottom + ((top - bottom) * height) / totalHeight;
  return frustumVolume(height, bottom, radius);
}

export function steppedTubVolumeAtHeight(
  profile: SteppedTubProfile,
  height: number,
): number {
  const lowerHeight = profile.step - profile.floor;
  const upperHeight = profile.rim - profile.step;
  const lowerVolume = frustumVolume(
    lowerHeight,
    profile.lowerBottomRadius,
    profile.lowerTopRadius,
  );
  if (height <= profile.floor) return 0;
  if (height < profile.step)
    return partialVolume(
      height - profile.floor,
      lowerHeight,
      profile.lowerBottomRadius,
      profile.lowerTopRadius,
    );
  return (
    lowerVolume +
    partialVolume(
      Math.min(height - profile.step, upperHeight),
      upperHeight,
      profile.upperBottomRadius,
      profile.upperTopRadius,
    )
  );
}

export function steppedTubHeightAtVolume(
  profile: SteppedTubProfile,
  volume: number,
): number {
  return basinHeightAtVolume(
    {
      floor: profile.floor,
      rim: profile.rim,
      volumeAtHeight: (height) => steppedTubVolumeAtHeight(profile, height),
    },
    volume,
  );
}

/** A readout derived from the actual water quantity, not from water height. */
export function steppedTubPercentFull(
  profile: SteppedTubProfile,
  volume: number,
): number {
  return basinPercentFull(
    {
      floor: profile.floor,
      rim: profile.rim,
      volumeAtHeight: (height) => steppedTubVolumeAtHeight(profile, height),
    },
    volume,
  );
}

export function steppedTubRadiusAtHeight(
  profile: SteppedTubProfile,
  height: number,
): number {
  if (height < profile.step)
    return (
      profile.lowerBottomRadius +
      ((profile.lowerTopRadius - profile.lowerBottomRadius) *
        Math.max(0, height - profile.floor)) /
        (profile.step - profile.floor)
    );
  return (
    profile.upperBottomRadius +
    ((profile.upperTopRadius - profile.upperBottomRadius) *
      Math.min(profile.rim - profile.step, height - profile.step)) /
      (profile.rim - profile.step)
  );
}
