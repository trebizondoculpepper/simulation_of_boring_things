import { signal } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import { cleanSettings } from './logic/settings';
import type { Settings } from './logic/settings';

/**
 * The player's settings, kept in this browser's storage and shared by the
 * whole app as one signal: rooms and the HUD read it, the settings panel
 * changes it. Storage may be blocked (a private window); then the settings
 * last only as long as the page.
 */

const KEY = 'pool-plant:settings';

function load(): Settings {
  try {
    const text = globalThis.localStorage?.getItem(KEY);
    return cleanSettings(text ? JSON.parse(text) : null);
  } catch {
    return cleanSettings(null);
  }
}

const current = signal<Settings>(load());

export const settings: ReadonlySignal<Settings> = current;

/** Change some settings, and keep them. */
export function updateSettings(change: Partial<Settings>) {
  current.value = cleanSettings({ ...current.value, ...change });
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(current.value));
  } catch {
    // Storage blocked: kept for this page only.
  }
}
