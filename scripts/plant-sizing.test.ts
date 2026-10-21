import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vite-plus/test';
import { POOLS } from '../src/game/plant-sizing/pools.config';
import { sizePlant } from '../src/game/plant-sizing/sizing';
import { sizingReport } from '../src/game/plant-sizing/report';

/**
 * Sizes the plant for the pools in `src/game/plant-sizing/pools.config.ts`
 * and writes the report to `doc/plans/plant-sizing.md`, printing it too:
 * `PLANT_SIZING=1 npx vp test run scripts/plant-sizing.test.ts`.
 * Otherwise it does nothing.
 */
it.skipIf(!process.env.PLANT_SIZING)('sizes the plant', () => {
  const report = sizingReport(sizePlant(POOLS));
  const dir = new URL('../doc/plans/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('plant-sizing.md', dir), report);
  console.log(report);
});
