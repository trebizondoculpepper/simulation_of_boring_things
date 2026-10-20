import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vite-plus/test';
import { fitPlant, fitSvg, smallestSide } from '../src/game/main-plant-fit';
import {
  DENSITY_TRIAL,
  PUMP_SET,
} from '../src/toolkit/gallery/rooms/plant/density-trial';

/**
 * The main plant room's fit study (`src/game/main-plant-fit.ts`) on the
 * machines of its density trial (`src/rendering/plant-corridor-room.ts`:
 * the duty/standby pumps and the same selection of development models),
 * drawn for each room size asked about, into `doc/plans/`:
 * `UPDATE_PLANS=1 npx vp test run scripts/main-plant-fit.test.ts`.
 */
const TRIAL = [PUMP_SET, ...DENSITY_TRIAL].map((e) => ({
  name: e.title,
  w: e.size.w,
  d: e.size.d,
}));

it.skipIf(!process.env.UPDATE_PLANS)(
  'fits the main plant room at each size',
  () => {
    const dir = new URL('../doc/plans/', import.meta.url);
    mkdirSync(dir, { recursive: true });
    const lines: string[] = [];
    for (const side of [47, 42, 37]) {
      const fit = fitPlant(side, TRIAL);
      writeFileSync(new URL(`main-plant-fit-${side}.svg`, dir), fitSvg(fit));
      lines.push(
        `${side}: ${fit.placed.length}/${TRIAL.length} placed, ${(fit.cover * 100).toFixed(1)}% covered, rows ${fit.rows.length}, left over: ${fit.unplaced.map((u) => u.name).join('; ') || 'none'}`,
      );
    }
    const least = smallestSide(TRIAL);
    lines.push(`smallest: ${least}`);
    if (least)
      writeFileSync(
        new URL(`main-plant-fit-${least}.svg`, dir),
        fitSvg(fitPlant(least, TRIAL)),
      );
    const area = TRIAL.reduce((s, t) => s + t.w * t.d, 0);
    lines.push(
      `machines: ${TRIAL.length}, footprint ${area.toFixed(1)} m2, largest ${TRIAL.map(
        (t) => `${t.name} ${t.w}x${t.d}`,
      )
        .sort()
        .slice(0, 0)}`,
    );
    console.log('FIT\n' + lines.join('\n'));
    console.log(
      'ITEMS\n' + TRIAL.map((t) => `${t.name}: ${t.w} x ${t.d}`).join('\n'),
    );
  },
);
