/**
 * Graphics quality presets (mission 087, `doc/research/graphics-quality-presets.md`):
 * Low, Medium and High, each a render quality to start from and a set of
 * costly effects left on or switched off. High is the game as it has
 * always looked. The render quality (`renderLevel`) stays the player's own
 * slider: choosing a preset sets it to the preset's level, and it can then
 * be moved freely without leaving the preset. Pure.
 */

export type GraphicsPreset = 'low' | 'medium' | 'high';

/** The presets, lowest first, as a selector offers them. */
export const GRAPHICS_PRESETS: readonly GraphicsPreset[] = [
  'low',
  'medium',
  'high',
];

export const DEFAULT_GRAPHICS: GraphicsPreset = 'high';

/** What a preset draws. */
export interface GraphicsOptions {
  /** The render quality (`renderLevel`) the preset starts at. */
  renderLevel: number;
  /** The most pixels drawn per CSS pixel, before the render quality scales it. */
  pixelRatioCap: number;
  /** Multisample antialiasing on the canvas (taken when a room's renderer is made). */
  antialias: boolean;
  /** Ground-truth ambient occlusion (`GTAOPass`), the costliest pass. */
  ambientOcclusion: boolean;
  /** Bloom (`UnrealBloomPass`), a chain of blurs. */
  bloom: boolean;
  /** The pool's screen-space refraction pass. */
  refraction: boolean;
  /** Shadow maps at all. */
  shadows: boolean;
  /** The largest shadow map side, pixels: bigger maps a room asks for are cut to it. */
  shadowMapMax: number;
}

export const GRAPHICS: Record<GraphicsPreset, GraphicsOptions> = {
  low: {
    renderLevel: 6,
    pixelRatioCap: 1,
    antialias: false,
    ambientOcclusion: false,
    bloom: false,
    refraction: false,
    shadows: false,
    shadowMapMax: 1024,
  },
  medium: {
    renderLevel: 3,
    pixelRatioCap: 1.25,
    antialias: false,
    ambientOcclusion: false,
    bloom: true,
    refraction: true,
    shadows: true,
    shadowMapMax: 1024,
  },
  high: {
    renderLevel: 0,
    pixelRatioCap: 2,
    antialias: true,
    ambientOcclusion: true,
    bloom: true,
    refraction: true,
    shadows: true,
    shadowMapMax: 4096,
  },
};

/** A preset's options. */
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
