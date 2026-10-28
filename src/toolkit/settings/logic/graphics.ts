/**
 * The costlier effects' graphics settings (the owner, 2026-10-28;
 * `doc/research/graphics-quality-presets.md`): ambient occlusion and bloom
 * each off or at a quality, and a cap on the image's height whatever the
 * screen. What each choice means for the passes and the pixel ratio. Pure.
 */

export const EFFECT_LEVELS = ['off', 'low', 'medium', 'high'] as const;
export type EffectLevel = (typeof EFFECT_LEVELS)[number];

export const RESOLUTION_CAPS = ['720', '1080', '1440', 'native'] as const;
export type ResolutionCap = (typeof RESOLUTION_CAPS)[number];

/** How each choice is named in the menu. */
export const EFFECT_LABELS: Record<EffectLevel, string> = {
  off: 'Off',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};
export const RESOLUTION_LABELS: Record<ResolutionCap, string> = {
  '720': '720p',
  '1080': '1080p',
  '1440': '1440p',
  native: 'Native',
};

/**
 * Ambient occlusion at `level`: whether it runs, and its samples per pixel
 * (`full` is the room's own, as tuned: 12 in most, 6 on the bridge). Low
 * is a third of it and Medium half, never fewer than 4, the fewest GTAO
 * still looks like occlusion at.
 */
export function ambientOcclusionAt(level: EffectLevel, full = 12) {
  if (level === 'off') return { enabled: false, samples: full };
  const share = level === 'low' ? 1 / 3 : level === 'medium' ? 1 / 2 : 1;
  return {
    enabled: true,
    samples: Math.max(4, Math.min(full, Math.round(full * share))),
  };
}

/**
 * Bloom at `level`: whether it runs, and the share of each side of the
 * image its blur chain works at (its cost goes with the square).
 */
export function bloomAt(level: EffectLevel) {
  return {
    enabled: level !== 'off',
    scale: level === 'low' ? 0.25 : level === 'medium' ? 0.5 : 1,
  };
}

/**
 * The pixel ratio a canvas `height` CSS pixels tall is drawn at, asked
 * for `wanted`, under `cap`: never more pixels tall than the cap allows.
 * A cap only ever lowers the ratio.
 */
export function cappedPixelRatio(
  wanted: number,
  height: number,
  cap: ResolutionCap,
): number {
  if (cap === 'native' || !(height > 0)) return wanted;
  return Math.min(wanted, Number(cap) / height);
}
