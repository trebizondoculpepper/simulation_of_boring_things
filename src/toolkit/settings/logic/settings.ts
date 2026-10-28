import type { OnScreenControls } from '../../controls/logic/hud-policy';
import {
  DEFAULT_GRAPHICS,
  EFFECT_LEVELS,
  PRESET_CHOICES,
  RESOLUTION_CAPS,
  parsePreset,
} from './graphics';
import type { EffectLevel, GraphicsPreset, ResolutionCap } from './graphics';

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
  /** Ambient occlusion: off, or its quality (`graphics.ts`). */
  ambientOcclusion: EffectLevel;
  /** Bloom, the glow round bright things: off, or its quality. */
  bloom: EffectLevel;
  /** Film grain and vignette. */
  filmEffects: boolean;
  /** The tallest image drawn, whatever the screen: a cap on the pixel ratio. */
  resolutionCap: ResolutionCap;
  /** The graphics preset (`graphics.ts`, mission 087): the effects with no setting of their own. */
  graphics: GraphicsPreset;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.8,
  sensitivity: 1,
  invertY: false,
  fov: 52,
  renderLevel: 0,
  onScreenControls: 'automatic',
  // Today's look, as every room was tuned with.
  ambientOcclusion: 'high',
  bloom: 'high',
  filmEffects: true,
  resolutionCap: 'native',
  graphics: DEFAULT_GRAPHICS,
};

/** Each number's range and step, as its slider offers it. */
export const RANGES = {
  volume: { min: 0, max: 1, step: 0.05 },
  sensitivity: { min: 0.25, max: 3, step: 0.05 },
  fov: { min: 40, max: 90, step: 1 },
  renderLevel: { min: 0, max: 10, step: 1 },
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
    ambientOcclusion: level('ambientOcclusion'),
    bloom: level('bloom'),
    filmEffects: bool('filmEffects'),
    resolutionCap: RESOLUTION_CAPS.includes(s.resolutionCap as ResolutionCap)
      ? (s.resolutionCap as ResolutionCap)
      : DEFAULT_SETTINGS.resolutionCap,
    // A save from before the presets is High, the look it was playing.
    graphics: parsePreset(s.graphics) ?? DEFAULT_GRAPHICS,
  };
}
