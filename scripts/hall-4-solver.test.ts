import { writeFileSync } from 'node:fs';
import { it } from 'vite-plus/test';
import { CHALLENGES } from '../src/game/plant/museum-4-cards';
import {
  READINGS,
  bandDistance,
  outOfBand,
  replay,
} from '../src/game/plant/museum-4-challenge';
import type { Dose, Level } from '../src/game/plant/museum-4-challenge';
import { readWater } from '../src/game/plant/museum-4-lab';
import { doseWords } from '../src/game/plant/museum-4-doses';
import { robust, solveAll } from '../src/game/plant/museum-4-solver';

/**
 * Hall 4's authoring solver (mission 113, `doc/plans/113/f-solver-and-tests.md`),
 * by hand only: `SOLVE=1 npx vp test run scripts/hall-4-solver.test.ts`
 * (`CARD=<id>` for one card). For each card and level it searches the
 * fewest doses that win under the authoring schedule, keeps those robust to
 * ±10 %, chooses the Journeyman route that leaves a reading outside the
 * card's targets out of band (so the levels differ), reports the best
 * reachable outcome and each reading's distance from its band, proposes
 * the pars (the fewest doses plus one) and writes the solutions as
 * TypeScript to `build/hall-4-solutions.txt` to paste into the cards.
 */

const env =
  (globalThis as { process?: { env: Record<string, string | undefined> } })
    .process?.env ?? {};
const enabled = Boolean(env.SOLVE);
const words = (d: readonly Dose[]) =>
  d.map((x) => doseWords(x.tank, x.size)).join(', ') || '(none)';
const code = (d: readonly Dose[]) =>
  `[${d.map((x) => `{ tank: '${x.tank}', size: ${x.size} }`).join(', ')}]`;

it.skipIf(!enabled)(
  'solves the cards',
  () => {
    const lines: string[] = [];
    for (const card of CHALLENGES) {
      if (env.CARD && card.id !== env.CARD) continue;
      lines.push(
        `\n== ${card.id}: start out of band ${outOfBand(readWater(card.water())).join(', ')}`,
      );
      const chosen: Partial<Record<Level, Dose[]>> = {};
      for (const level of ['pro', 'journeyman'] as const) {
        const all = solveAll(card, level, 3);
        const ok = all.filter((d) => robust(card, level, d));
        const leaves = (d: Dose[]) => {
          const g = replay(
            { ...card, pars: { ...card.pars, [level]: d.length } },
            level,
            d,
          );
          return outOfBand(readWater(g.lab.bench.pool)).filter(
            (id) => !card.targets.includes(id),
          );
        };
        const pick =
          level === 'journeyman'
            ? ok.find(
                (d) =>
                  leaves(d).length > 0 && d.length < (chosen.pro?.length ?? 9),
              )
            : ok[0];
        lines.push(
          `${level}: ${all.length} winning at ${all[0]?.length ?? '-'} doses, ${ok.length} robust; chosen ${pick ? words(pick) : 'NONE'}`,
        );
        const best = pick ?? all[0];
        if (best) {
          chosen[level] = best;
          const g = replay(
            { ...card, pars: { ...card.pars, [level]: best.length } },
            level,
            best,
          );
          const r = readWater(g.lab.bench.pool);
          lines.push(
            `  ends ${g.outcome}; distance from band: ${READINGS.map((id) => `${id} ${bandDistance(id, r).toFixed(2)}`).join(', ')}`,
          );
          lines.push(`  ${level}: ${code(best)}, par ${best.length + 1}`);
        } else lines.push('  no win within three doses: retune the card');
      }
    }
    writeFileSync('build/hall-4-solutions.txt', lines.join('\n') + '\n');
    console.info(lines.join('\n'));
  },
  3_600_000,
);
