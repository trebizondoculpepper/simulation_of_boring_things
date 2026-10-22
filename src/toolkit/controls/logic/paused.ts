import { signal } from '@preact/signals-core';

/**
 * Whether the game is paused: true while the pause menu is open
 * (`settings/pause-menu.ts`). The world's clock stops (`save/world-store.ts`)
 * and the walker takes no input (`input/first-person.ts`), as Minecraft's
 * single player pauses behind its menu.
 */
export const paused = signal(false);
