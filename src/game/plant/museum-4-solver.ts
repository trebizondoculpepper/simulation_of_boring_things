import { replay } from './museum-4-challenge';
import type { ChallengeCard, Dose, Level } from './museum-4-challenge';
import { DOSE_ORDER, sizeShare } from './museum-4-doses';
import type { SizeIndex } from './museum-4-doses';

/**
 * The authoring solver's search (mission 113, `doc/plans/113/f-solver-and-tests.md`),
 * shared by its script (`scripts/hall-4-solver.test.ts`, run by hand with
 * `SOLVE=1`) and the cards' tests so the two replay alike: breadth first
 * over dose sequences, one, two, then three doses, each of a different
 * chemical, in the tanks' order, at one of the five sizes, played by
 * `replay` with the card's par set to the sequence's length. Pure.
 */

const SIZES: readonly SizeIndex[] = [0, 1, 2, 3, 4];

/** Whether `doses` wins `card` at `level`, played as a visitor would play them. */
export function wins(
  card: ChallengeCard,
  level: Level,
  doses: readonly Dose[],
  scales: readonly number[] = [],
) {
  const trial = { ...card, pars: { ...card.pars, [level]: doses.length } };
  return replay(trial, level, doses, scales).outcome === 'won';
}

/** The total of a solution's shares of each chemical's maximum. */
const weight = (doses: readonly Dose[]) =>
  doses.reduce((a, d) => a + sizeShare(d.size), 0);

function* sequences(depth: number, from = 0): Generator<Dose[]> {
  if (depth === 0) {
    yield [];
    return;
  }
  for (let i = from; i < DOSE_ORDER.length; i++)
    for (const rest of sequences(depth - 1, i + 1))
      for (const size of SIZES) yield [{ tank: DOSE_ORDER[i], size }, ...rest];
}

/** Every winning sequence of the fewest doses, up to `maxDepth`, lightest first; empty if none. */
export function solveAll(
  card: ChallengeCard,
  level: Level,
  maxDepth = 3,
): Dose[][] {
  for (let depth = 1; depth <= maxDepth; depth++) {
    const found: Dose[][] = [];
    for (const doses of sequences(depth))
      if (wins(card, level, doses)) found.push(doses);
    if (found.length) return found.sort((a, b) => weight(a) - weight(b));
  }
  return [];
}

/** The fuzz cases of a solution: all ×0.9 and ×1.1, each dose alone at both, and three seeded mixes. */
export function fuzzCases(n: number): number[][] {
  const cases: number[][] = [Array(n).fill(0.9), Array(n).fill(1.1)];
  for (let i = 0; i < n; i++)
    for (const s of [0.9, 1.1])
      cases.push(Array.from({ length: n }, (_, j) => (j === i ? s : 1)));
  let seed = 113;
  const rnd = () =>
    ((seed = (seed * 16807) % 2147483647) / 2147483647) * 0.2 + 0.9;
  for (let k = 0; k < 3; k++) cases.push(Array.from({ length: n }, rnd));
  return cases;
}

/** Whether a solution still wins with every fuzz case of its doses. */
export const robust = (
  card: ChallengeCard,
  level: Level,
  doses: readonly Dose[],
) => fuzzCases(doses.length).every((sc) => wins(card, level, doses, sc));
