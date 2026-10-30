import type { OnScreenControls } from '../../controls/logic/hud-policy';
import {
  DEFAULT_GRAPHICS,
  EFFECT_LEVELS,
  PRESET_CHOICES,
  parsePreset,
  parseResolutionCap,
  ASPECT_FITS,
} from './graphics';
import type {
  AspectFit,
  EffectLevel,
  GraphicsPreset,
  ResolutionCap,
} from './graphics';

/**
 * The player's settings (`doc/plans/title-screen.md`): a placeholder set
 * until the game knows what it needs, kept per player in the browser.
 * Their defaults, ranges, and the cleaning of whatever was stored, so a
 * missing, old or tampered value falls back to its default. Pure.
 */

export interface Settings {
  /** Master volume, 0 to 1. */
  volume: number;
  /** Look sensitivity, as a multiple of the usual; and whether up and down are swapped. */
  sensitivity: number;
  invertY: boolean;
  /** The vertical field of view, degrees (52, the rooms' own, by default). */
  fov: number;
  /** Render quality: 0 draws at full resolution, each step up fewer pixels (`renderScale`). */
  renderLevel: number;
  /** Whether the on-screen controls are shown. */
  onScreenControls: OnScreenControls;
  /**
   * The size of everything drawn over the view (the help line, the HUD,
   * the crosshair, readouts and notices), as a multiple of the usual: larger
   * for recording on a high-resolution screen (the owner, 2026-10-29).
   */
  overlayScale: number;
  /** Ambient occlusion: off, or its quality (`graphics.ts`). */
  ambientOcclusion: EffectLevel;
  /** Bloom, the glow round bright things: off, or its quality. */
  bloom: EffectLevel;
  /** Film grain and vignette. */
  filmEffects: boolean;
  /** The tallest image drawn, whatever the screen: a cap on the pixel ratio. */
  resolutionCap: ResolutionCap;
  /** How the maximum resolution meets a window of another shape (`frameLayout`). */
  aspectFit: AspectFit;
  /** The graphics preset (`graphics.ts`, mission 087): the effects with no setting of their own. */
  graphics: GraphicsPreset;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.8,
  sensitivity: 1,
  invertY: false,
  fov: 52,
  // Middling by default (Medium's), and drawn no larger than 1024 × 768
  // (the owner, 2026-10-29), so a first run is light on any machine.
  renderLevel: 3,
  onScreenControls: 'automatic',
  overlayScale: 1,
  // No live ambient occlusion in any preset (the owner, 2026-10-30): rooms
  // show their baked occlusion (`baking/baked-ao.ts`) once it is ready.
  ambientOcclusion: 'off',
  bloom: 'high',
  filmEffects: true,
  resolutionCap: '1024x768',
  aspectFit: 'letterbox',
  graphics: DEFAULT_GRAPHICS,
};

/** Each number's range and step, as its slider offers it. */
export const RANGES = {
  volume: { min: 0, max: 1, step: 0.05 },
  sensitivity: { min: 0.25, max: 3, step: 0.05 },
  fov: { min: 40, max: 90, step: 1 },
  renderLevel: { min: 0, max: 10, step: 1 },
  overlayScale: { min: 0.75, max: 2.5, step: 0.05 },
} as const satisfies Partial<
  Record<keyof Settings, { min: number; max: number; step: number }>
>;

/**
 * The share of a room's full resolution (its pixel ratio) the render
 * quality draws at, along each side: 1 / ln(e + level). Level 0 is 1:1;
 * each step lowers it, quickly at first and then more gently (level 6
 * draws 0.46 of each side, about a fifth of the pixels).
 */
export const renderScale = (level: number) => 1 / Math.log(Math.E + level);

const clamp = (v: number, { min, max }: { min: number; max: number }) =>
  Math.min(max, Math.max(min, v));

/**
 * Choosing a graphics preset: the preset, and the settings it starts the
 * player's own at (which can then be changed one by one).
 */
export const choosePreset = (preset: GraphicsPreset): Partial<Settings> => ({
  graphics: preset,
  ...PRESET_CHOICES[preset],
});

/** Settings from whatever was stored: each value checked, else its default. */
export function cleanSettings(stored: unknown): Settings {
  const s =
    stored && typeof stored === 'object'
      ? (stored as Record<string, unknown>)
      : {};
  const num = (key: keyof typeof RANGES) =>
    typeof s[key] === 'number' && Number.isFinite(s[key])
      ? clamp(s[key] as number, RANGES[key])
      : DEFAULT_SETTINGS[key];
  const level = (key: 'ambientOcclusion' | 'bloom'): EffectLevel =>
    EFFECT_LEVELS.includes(s[key] as EffectLevel)
      ? (s[key] as EffectLevel)
      : DEFAULT_SETTINGS[key];
  const bool = (key: 'invertY' | 'filmEffects') =>
    typeof s[key] === 'boolean' ? (s[key] as boolean) : DEFAULT_SETTINGS[key];
  return {
    volume: num('volume'),
    sensitivity: num('sensitivity'),
    invertY: bool('invertY'),
    fov: num('fov'),
    // Whole steps only. (An older save's low/medium/high falls back to 0.)
    renderLevel: Math.round(num('renderLevel')),
    // The old enabled default becomes Automatic; an explicit disabled choice stays Never.
    onScreenControls:
      s.onScreenControls === false
        ? 'never'
        : ['automatic', 'always', 'never'].includes(String(s.onScreenControls))
          ? (s.onScreenControls as OnScreenControls)
          : 'automatic',
    overlayScale: num('overlayScale'),
    ambientOcclusion: level('ambientOcclusion'),
    bloom: level('bloom'),
    filmEffects: bool('filmEffects'),
    // An old height-only cap becomes its resolution.
    resolutionCap:
      parseResolutionCap(s.resolutionCap) ?? DEFAULT_SETTINGS.resolutionCap,
    aspectFit: ASPECT_FITS.includes(s.aspectFit as AspectFit)
      ? (s.aspectFit as AspectFit)
      : DEFAULT_SETTINGS.aspectFit,
    // A save from before the presets is High, the look it was playing.
    graphics: parsePreset(s.graphics) ?? DEFAULT_GRAPHICS,
  };
}
