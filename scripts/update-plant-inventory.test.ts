import { writeFileSync } from 'node:fs';
import { it } from 'vite-plus/test';
import { inventoryReport } from '../src/game/plant/inventory-report';

/**
 * Regenerates `doc/plant-inventory.md` from the plant model, when asked:
 * `UPDATE_INVENTORY=1 npx vp test run scripts/update-plant-inventory.test.ts`.
 * Otherwise it does nothing.
 */
it.skipIf(!process.env.UPDATE_INVENTORY)(
  'regenerates the plant inventory',
  () => {
    writeFileSync(
      new URL('../doc/plant-inventory.md', import.meta.url),
      inventoryReport(),
    );
  },
);
