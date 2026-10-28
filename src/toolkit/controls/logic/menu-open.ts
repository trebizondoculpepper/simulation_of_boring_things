import { signal } from '@preact/signals-core';

/**
 * Whether a menu panel has the controls (mission 096): the settings panel
 * open over the game. The game runs on behind it (it does not pause), but
 * the walker takes no input while it is open (`input/first-person.ts`), as
 * while the console is down, so a key or a pad button works the menu and
 * not the room.
 */
export const menuOpen = signal(false);
