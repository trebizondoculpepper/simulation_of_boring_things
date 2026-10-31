import { describe, expect, it } from 'vite-plus/test';
import { CHALLENGES } from './museum-4-cards';
import { BANDS, HOLD, outOfBand, replay } from './museum-4-challenge';
import type { Level } from './museum-4-challenge';
import { readWater } from './museum-4-lab';
import { DOSES, SIZES, doseWords } from './museum-4-doses';
import { fuzzCases } from './museum-4-solver';

const LEVELS: readonly Level[] = ['journeyman', 'pro'];

describe("Hall 4's first set of challenge cards", () => {
  it('are seven, each id its own, ordered by their pars', () => {
    expect(CHALLENGES).toHaveLength(7);
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(7);
    const key = CHALLENGES.map((c) => c.pars.pro * 10 + c.pars.journeyman);
    expect(key).toEqual([...key].sort((a, b) => a - b));
  });

  for (const card of CHALLENGES)
    describe(card.id, () => {
      it('starts with its targets out of band', () => {
        const out = outOfBand(readWater(card.water()));
        for (const t of card.targets) expect(out).toContain(t);
      });

      for (const level of LEVELS)
        it(`replays its ${level} solution to a win within par`, () => {
          const doses = card.solutions[level];
          expect(doses.length).toBeLessThanOrEqual(card.pars[level]);
          const g = replay(card, level, doses);
          expect(g.outcome).toBe('won');
          expect(g.used).toBe(doses.length);
          expect(g.lab.seconds - g.heldSince!).toBeGreaterThanOrEqual(HOLD);
        });

      for (const level of LEVELS)
        it(`still wins its ${level} solution with every dose ±10 %`, () => {
          const doses = card.solutions[level];
          for (const scales of fuzzCases(doses.length)) {
            const g = replay(card, level, doses, scales);
            expect(
              g.outcome,
              `${card.id} ${level} at ${scales.map((x) => x.toFixed(2)).join(', ')}`,
            ).toBe('won');
          }
        });

      it('has two genuinely different routes', () => {
        const j = card.solutions.journeyman;
        expect(j.length).toBeLessThan(card.solutions.pro.length);
        const g = replay(card, 'journeyman', j);
        const out = outOfBand(readWater(g.lab.bench.pool));
        expect(
          out.filter((id) => !card.targets.includes(id)).length,
        ).toBeGreaterThan(0);
        expect(card.relaxed).toBeNull();
      });

      it('words its briefing, clue and explanation from its chemistry', () => {
        const lower = (t: string) => t.toLowerCase();
        for (const t of card.targets)
          expect(lower(card.briefing)).toContain(lower(BANDS[t].name));
        const named = card.solutions.pro.map((d) => doseWords(d.tank, d.size));
        for (const n of named) expect(card.explanation).toContain(n);
        const used = new Set(card.solutions.pro.map((d) => d.tank));
        for (const d of DOSES)
          if (!used.has(d.tank))
            expect(lower(card.explanation)).not.toContain(d.name);
        expect(lower(card.clue)).toContain(lower(card.concept));
        for (const size of SIZES)
          expect(lower(card.clue)).not.toMatch(
            new RegExp(`\\b${lower(size)}\\b`),
          );
      });
    });
});
