import { writeFileSync } from 'node:fs';
import { it } from 'vite-plus/test';
import {
  MODELLED_WORLD_ROOMS,
  unboundIdentities,
} from '../src/toolkit/gallery/logic/world-in-model';
import PINNED from '../src/toolkit/gallery/logic/world-in-model.unbound.json';

/**
 * Writes the pinned list of things drawn outside the model
 * (`world-in-model.unbound.json`), room by room, from what the rooms draw
 * now: `PIN_UNBOUND=1 npx vp test run scripts/pin-unbound.test.ts`. The
 * list may only shrink: it refuses to pin anything newly unbound, which
 * must be bound to the model instead. Never edit the list by hand.
 */
it.skipIf(!process.env.PIN_UNBOUND)('pins the unbound things', () => {
  const pinned = PINNED as Record<string, string[]>;
  const next: Record<string, string[]> = {};
  const added: string[] = [];
  for (const room of MODELLED_WORLD_ROOMS) {
    next[room] = unboundIdentities(room);
    // The first pinning takes all; after it, nothing may be added.
    if (Object.keys(pinned).length && !process.env.PIN_UNBOUND_FIRST)
      for (const id of next[room])
        if (!pinned[room]?.includes(id)) added.push(`${room}: ${id}`);
  }
  if (added.length)
    throw new Error(`Newly unbound, not pinned:\n${added.join('\n')}`);
  writeFileSync(
    new URL(
      '../src/toolkit/gallery/logic/world-in-model.unbound.json',
      import.meta.url,
    ),
    `${JSON.stringify(next, null, 2)}\n`,
  );
});
