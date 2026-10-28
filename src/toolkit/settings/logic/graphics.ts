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
 * (`full` is the room's own, as tuned: 12 in most, 6 on the bridge, 3 in
 * the museum). Low is a third of it and Medium half, never fewer than 4,
 * the fewest GTAO still looks like occlusion at, unless the room's own is
 * fewer still.
 */
export function ambientOcclusionAt(level: EffectLevel, full = 12) {
  if (level === 'off') return { enabled: false, samples: full };
  const share = level === 'low' ? 1 / 3 : level === 'medium' ? 1 / 2 : 1;
  return {
    enabled: true,
    samples: Math.min(full, Math.max(4, Math.round(full * share))),
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

// ---- Presets (mission 087) --------------------------------------------------

/**
 * Graphics presets, Low, Medium and High (mission 087; the owner,
 * 2026-10-28), so a less powerful machine can start light. High is the
 * game as it has always looked. A preset does two things: choosing it
 * writes the player's own settings above it (render quality, ambient
 * occlusion, bloom, film effects), which can then be changed one by one;
 * and it decides the effects with no setting of their own (antialiasing,
 * the pixel-ratio cap, the pool's refraction, shadows and their size).
 */
export type GraphicsPreset = 'low' | 'medium' | 'high';

/** The presets, lowest first, as a selector offers them. */
export const GRAPHICS_PRESETS: readonly GraphicsPreset[] = [
  'low',
  'medium',
  'high',
];

export const DEFAULT_GRAPHICS: GraphicsPreset = 'high';

/** What choosing a preset writes into the player's own settings. */
export interface PresetChoices {
  renderLevel: number;
  ambientOcclusion: EffectLevel;
  bloom: EffectLevel;
  filmEffects: boolean;
}

/** What a preset itself decides. */
export interface GraphicsOptions {
  /** The most pixels drawn per CSS pixel, before the render quality scales it. */
  pixelRatioCap: number;
  /** Multisample antialiasing on the canvas (taken when a room's renderer is made). */
  antialias: boolean;
  /** The pool's screen-space refraction pass. */
  refraction: boolean;
  /** Shadow maps at all. */
  shadows: boolean;
  /** The largest shadow map side, pixels: bigger maps a room asks for are cut to it. */
  shadowMapMax: number;
}

export const PRESET_CHOICES: Record<GraphicsPreset, PresetChoices> = {
  low: {
    renderLevel: 6,
    ambientOcclusion: 'off',
    bloom: 'off',
    filmEffects: false,
  },
  medium: {
    renderLevel: 3,
    ambientOcclusion: 'off',
    bloom: 'medium',
    filmEffects: true,
  },
  high: {
    renderLevel: 0,
    ambientOcclusion: 'high',
    bloom: 'high',
    filmEffects: true,
  },
};

export const GRAPHICS: Record<GraphicsPreset, GraphicsOptions> = {
  low: {
    pixelRatioCap: 1,
    antialias: false,
    refraction: false,
    shadows: false,
    shadowMapMax: 1024,
  },
  medium: {
    pixelRatioCap: 1.25,
    antialias: false,
    refraction: true,
    shadows: true,
    shadowMapMax: 1024,
  },
  high: {
    pixelRatioCap: 2,
    antialias: true,
    refraction: true,
    shadows: true,
    shadowMapMax: 4096,
  },
};

/** A preset's own options. */
export const graphicsOptions = (preset: GraphicsPreset): GraphicsOptions =>
  GRAPHICS[preset];

/**
 * A preset named in text (a URL, a save), or null: the names, any case,
 * and `med` for medium.
 */
export function parsePreset(text: unknown): GraphicsPreset | null {
  if (typeof text !== 'string') return null;
  const name = text.trim().toLowerCase();
  if (name === 'med') return 'medium';
  return (GRAPHICS_PRESETS as readonly string[]).includes(name)
    ? (name as GraphicsPreset)
    : null;
}

/** A shadow map's side, pixels, cut to a preset's largest. */
export const shadowMapSide = (wanted: number, max: number) =>
  Math.max(1, Math.min(wanted, max));
