/** Adapt the world's mean-depth water quantity to the stepped tub's capacity. */
export function jacuzziVisualVolume(
  level: number,
  meanDepth: number,
  capacity: number,
) {
  return capacity * Math.max(0, Math.min(1, 1 + level / meanDepth));
}
