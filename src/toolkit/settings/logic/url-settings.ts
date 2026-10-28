import { parsePreset } from './graphics';
import { RANGES, choosePreset } from './settings';
import type { Settings } from './settings';

/**
 * Settings given in the page's address at start-up (mission 087), for a
 * link that starts the game lighter on a weak machine:
 *
 * - `graphics=low|medium|high`: the graphics preset, with its render quality;
 * - `resolution=N`: the render quality (`renderLevel`, 0 full to 10 lowest)
 *   alone, over the preset's when both are given.
 *
 * Values are clamped and rounded; anything unreadable is ignored, so the
 * saved setting stands. Every other parameter is someone else's. Pure.
 */
export function settingsFromUrl(search: string): Partial<Settings> {
  const params = new URLSearchParams(search);
  const change: Partial<Settings> = {};
  const preset = parsePreset(params.get('graphics'));
  if (preset) Object.assign(change, choosePreset(preset));
  const text = params.get('resolution')?.trim();
  const level = text ? Number(text) : Number.NaN;
  if (Number.isFinite(level)) {
    const { min, max } = RANGES.renderLevel;
    change.renderLevel = Math.round(Math.min(max, Math.max(min, level)));
  }
  return change;
}
