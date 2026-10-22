import { writeFileSync } from 'node:fs';
import { it } from 'vite-plus/test';
import { gapsReport } from '../src/game/plant/network/gaps';
import { PLANT_NETWORK } from '../src/game/plant/network/plant-network';

/**
 * Lists every placeholder in the plant network, the gaps in the model,
 * and writes them to `doc/reports/model-gaps.md`:
 * `MODEL_GAPS=1 npx vp test run scripts/model-gaps.test.ts`.
 * Otherwise it does nothing.
 */
it.skipIf(!process.env.MODEL_GAPS)('lists the gaps in the model', () => {
  const report = gapsReport(PLANT_NETWORK);
  writeFileSync(
    new URL('../doc/reports/model-gaps.md', import.meta.url),
    report,
  );
  console.log(report);
});
