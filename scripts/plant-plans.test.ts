import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vite-plus/test';
import { planSvg } from '../src/game/plant/plan-svg';

/**
 * Draws the plant rooms' plans, one SVG a level, into `doc/plans/`:
 * `UPDATE_PLANS=1 npx vp test run scripts/plant-plans.test.ts`.
 */
it.skipIf(!process.env.UPDATE_PLANS)('draws the plant rooms’ plans', () => {
  const dir = new URL('../doc/plans/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  for (const level of ['roof', 'surface', 'treatment', 'basement'] as const)
    writeFileSync(new URL(`plant-rooms-${level}.svg`, dir), planSvg(level));
});
