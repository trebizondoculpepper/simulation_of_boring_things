import { describe, expect, it } from 'vite-plus/test';
import { CHALLENGES } from './museum-4-cards';
import { replay } from './museum-4-challenge';
import type { Dose, Level } from './museum-4-challenge';
import { TANKS } from './museum-4-lab';
import type { SizeIndex } from './museum-4-doses';
import { closeTo, doseKey } from './museum-4-challenge.test-support';

const LEVELS: readonly Level[] = ['journeyman', 'pro'];
const ALL: Dose[] = TANKS.flatMap((t) =>
  ([0, 1, 2, 3, 4] as SizeIndex[]).map((size) => ({ tank: t.id, size })),
);

describe("Hall 4's cards, searched", () => {
  // Every single dose, and every pair up to the level's par, replayed (the
  // live hall and the replay agree: museum-4-challenge.slow.test.ts): any
  // winner must be close to a stored solution or to a declared alsoWins
  // route (`closeTo`), so no unforeseen cheap win is left on a card.
  for (const card of CHALLENGES)
    for (const level of LEVELS)
      it(`leaves no unforeseen win on ${card.title} at ${level}`, () => {
        const routes = [
          card.solutions[level],
          ...(card.alsoWins?.[level] ?? []).map((w) => w.doses),
        ];
        const seqs: Dose[][] = ALL.map((a) => [a]);
        if (card.pars[level] >= 2)
          for (const a of ALL) for (const b of ALL) seqs.push([a, b]);
        const unexpected = seqs
          .filter((ds) => !routes.some((r) => closeTo(ds, r)))
          .filter((ds) => replay(card, level, ds).outcome === 'won')
          .map(doseKey);
        expect(unexpected).toEqual([]);
      }, 600_000);
});
