import { writeFileSync } from 'node:fs';
import { it } from 'vite-plus/test';
import { buildPlantNetwork } from '../src/game/plant/network/plant-network';
import {
  registerSource,
  withNewSerials,
} from '../src/game/plant/network/serial-register';
import { RETIRED, SERIALS } from '../src/game/plant/network/serials';

/**
 * Gives every node of the plant network that lacks one its serial number,
 * appending to the register `src/game/plant/network/serials.ts`:
 * `ASSIGN_SERIALS=1 npx vp test run scripts/assign-serials.test.ts`.
 * Existing serials are never changed. Otherwise it does nothing.
 */
it.skipIf(!process.env.ASSIGN_SERIALS)('assigns serial numbers', () => {
  const reg = withNewSerials(buildPlantNetwork(), {
    serials: SERIALS,
    retired: RETIRED,
  });
  writeFileSync(
    new URL('../src/game/plant/network/serials.ts', import.meta.url),
    registerSource(reg),
  );
});
