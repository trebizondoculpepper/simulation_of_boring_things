/**
 * How far a thing has materialised, `seconds` into an appearance that
 * takes `duration`: 0 (nothing) to 1 (whole). It comes in slowly, as the
 * first islands of it boil up, quickens, and settles at the end. Pure
 * logic: `createMaterialise` draws it.
 */
export function materialiseAt(seconds: number, duration: number) {
  if (duration <= 0) return 1;
  const t = Math.min(1, Math.max(0, seconds / duration));
  // Smootherstep: no jolt at either end.
  return t * t * t * (t * (t * 6 - 15) + 10);
}
