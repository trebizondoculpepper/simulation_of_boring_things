import { signal } from '@preact/signals-core';

/**
 * Whether the console is down (`doc/prompts/done/058-developer-console.md`):
 * the walker takes no input while it is (`input/first-person.ts`), as when
 * paused, but the world runs on.
 */
export const consoleOpen = signal(false);
