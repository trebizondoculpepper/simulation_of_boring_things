/** Maximise capture detail while limiting GPU and clipboard allocations. */
export function screenshotPixelRatio(
  width: number,
  height: number,
  current: number,
  maxDimension: number,
): number {
  if (width <= 0 || height <= 0) return current;
  const byPixels = Math.sqrt(16_000_000 / (width * height));
  const byDimension = Math.min(maxDimension / width, maxDimension / height);
  return Math.max(current, Math.min(byPixels, byDimension));
}
