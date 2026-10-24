/** Basin geometry used to present a simulated water quantity. */
export interface BasinProfile {
  floor: number;
  rim: number;
  volumeAtHeight(height: number): number;
}

export function basinCapacity(profile: BasinProfile): number {
  return profile.volumeAtHeight(profile.rim);
}

export function basinPercentFull(
  profile: BasinProfile,
  volume: number,
): number {
  return Math.max(0, Math.min(100, (volume / basinCapacity(profile)) * 100));
}

/** Monotonic inversion works for stepped, sloped and constant-depth basins. */
export function basinHeightAtVolume(
  profile: BasinProfile,
  volume: number,
): number {
  const capacity = basinCapacity(profile);
  if (volume <= 0) return profile.floor;
  if (volume >= capacity) return profile.rim;
  let low = profile.floor;
  let high = profile.rim;
  for (let i = 0; i < 32; i++) {
    const mid = (low + high) / 2;
    if (profile.volumeAtHeight(mid) < volume) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}
