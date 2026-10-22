/**
 * The player's settings (`doc/plans/title-screen.md`): a placeholder set
 * until the game knows what it needs, kept per player in the browser.
 * Their defaults, ranges, and the cleaning of whatever was stored, so a
 * missing, old or tampered value falls back to its default. Pure.
 */

export type Quality = 'low' | 'medium' | 'high';

export interface Settings {
  /** Master volume, 0 to 1. */
  volume: number;
  /** Look sensitivity, as a multiple of the usual; and whether up and down are swapped. */
  sensitivity: number;
  invertY: boolean;
  /** The vertical field of view, degrees. */
  fov: number;
  /** Rendering resolution: low, medium or high. */
  quality: Quality;
  /** Whether the on-screen controls are shown. */
  onScreenControls: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.8,
  sensitivity: 1,
  invertY: false,
  fov: 60,
  quality: 'high',
  onScreenControls: true,
};

/** Each number's range and step, as its slider offers it. */
export const RANGES = {
  volume: { min: 0, max: 1, step: 0.05 },
  sensitivity: { min: 0.25, max: 3, step: 0.05 },
  fov: { min: 50, max: 90, step: 1 },
} as const satisfies Partial<
  Record<keyof Settings, { min: number; max: number; step: number }>
>;

export const QUALITIES: readonly Quality[] = ['low', 'medium', 'high'];

/** The share of the full pixel ratio each quality renders at. */
export const QUALITY_SCALE: Record<Quality, number> = {
  low: 0.5,
  medium: 0.75,
  high: 1,
};

const clamp = (v: number, { min, max }: { min: number; max: number }) =>
  Math.min(max, Math.max(min, v));

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
  const bool = (key: 'invertY' | 'onScreenControls') =>
    typeof s[key] === 'boolean' ? (s[key] as boolean) : DEFAULT_SETTINGS[key];
  return {
    volume: num('volume'),
    sensitivity: num('sensitivity'),
    invertY: bool('invertY'),
    fov: num('fov'),
    quality: QUALITIES.includes(s.quality as Quality)
      ? (s.quality as Quality)
      : DEFAULT_SETTINGS.quality,
    onScreenControls: bool('onScreenControls'),
  };
}
