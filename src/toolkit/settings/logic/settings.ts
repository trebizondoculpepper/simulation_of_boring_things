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
  onScreenControls: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.8,
  sensitivity: 1,
  invertY: false,
  fov: 52,
  renderLevel: 0,
  onScreenControls: true,
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
    // Whole steps only. (An older save's low/medium/high falls back to 0.)
    renderLevel: Math.round(num('renderLevel')),
    onScreenControls: bool('onScreenControls'),
  };
}
