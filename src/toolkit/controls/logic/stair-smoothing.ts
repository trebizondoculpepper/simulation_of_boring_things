/** Source-style camera-only stair chase, in scene units. Collision stays exact. */
export function smoothStairFloor(
  remembered: number,
  floor: number,
  delta: number,
  metre: number,
  reset = false,
): number {
  if (reset) return floor;
  if (delta <= 0) return remembered;
  const lag = 0.46 * metre;
  const from = Math.max(floor - lag, Math.min(floor + lag, remembered));
  const step = 3.81 * metre * delta;
  return from + Math.max(-step, Math.min(step, floor - from));
}
