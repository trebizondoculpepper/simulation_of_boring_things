import { describe, expect, it } from 'vite-plus/test';
import { CHALLENGES } from './museum-4-cards';
import {
  BANDS,
  HOLD,
  narrationWords,
  outOfBand,
  replay,
} from './museum-4-challenge';
import type { Level } from './museum-4-challenge';
import { readWater } from './museum-4-lab';
import { DOSES, SIZES, doseOf, doseWords } from './museum-4-doses';
import { fuzzCases } from './museum-4-solver';
import { doseKey, partials } from './museum-4-challenge.test-support';

const LEVELS: readonly Level[] = ['journeyman', 'pro'];

describe("Hall 4's first set of challenge cards", () => {
  it('are eight, each id its own, ordered by their pars', () => {
    expect(CHALLENGES).toHaveLength(8);
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(8);
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

      it('wins with no proper part of its stored solutions, unless declared close', () => {
        // Each subset of a stored solution, and each dose shrunk by one or
        // more sizes, must lose; one step smaller may win only where the
        // card declares it in alsoWins (the owner, 2026-10-31).
        const sorted = (ds: readonly { tank: string; size: number }[]) =>
          doseKey(
            [...ds].sort((a, b) =>
              a.tank + a.size < b.tank + b.size ? -1 : 1,
            ) as never,
          );
        for (const level of LEVELS) {
          const declared = new Set(
            (card.alsoWins?.[level] ?? []).map((w) => sorted(w.doses)),
          );
          const won = partials(card.solutions[level])
            .filter((p) => replay(card, level, p.doses).outcome === 'won')
            .filter((p) => !(p.steps === 1 && declared.has(sorted(p.doses))))
            .map((p) => `${level}: ${doseKey(p.doses)}`);
          expect(won).toEqual([]);
        }
      });

      it("closes a win by its stored solution with the level's explanation", () => {
        for (const level of LEVELS) {
          const g = replay(card, level, card.solutions[level]);
          expect(g.given).toEqual(card.solutions[level]);
          const w = narrationWords(g, 'explanation')!;
          expect(w.route.kind).toBe('solution');
          expect(w.text).toBe(card.explanation[level]);
        }
      });

      it('words each alternative route: what was used, and a better solution', () => {
        for (const level of LEVELS)
          (card.alsoWins?.[level] ?? []).forEach((alt, index) => {
            const t = alt.explanation;
            expect(t).toMatch(/^Yes: /);
            expect(t).toContain(' worked because ');
            expect(t.toLowerCase()).toContain('better solution');
            for (const d of alt.doses) expect(t).toContain(doseOf(d.tank).name);
            const g = replay(card, level, alt.doses);
            if (g.outcome !== 'won') return;
            const w = narrationWords(g, 'explanation')!;
            expect(w.route, `${level} ${index}`).toEqual({
              kind: 'also',
              index,
            });
            expect(w.text).toBe(t);
          });
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
          for (const level of ['journeyman', 'pro'] as const)
            expect(lower(card.briefing[level])).toContain(lower(BANDS[t].name));
        expect(card.briefing.journeyman).toContain('Journeyman');
        expect(card.briefing.pro).toContain('Pool Pro');
        expect(card.briefing.pro).toContain('every other reading');
        for (const level of ['journeyman', 'pro'] as const) {
          const words = card.explanation[level];
          const doses = card.solutions[level];
          for (const d of doses)
            expect(words).toContain(doseWords(d.tank, d.size));
          const used = new Set(doses.map((d) => d.tank));
          for (const d of DOSES)
            if (!used.has(d.tank)) expect(lower(words)).not.toContain(d.name);
        }
        expect(card.explanation.journeyman).toMatch(/^Yes: /);
        expect(card.explanation.journeyman).toContain(' worked because ');
        expect(card.explanation.journeyman).toContain(
          'But a better solution would',
        );
        expect(card.explanation.pro).toMatch(/^The best answer was /);
        expect(lower(card.clue)).toContain(lower(card.concept));
        for (const size of SIZES)
          expect(lower(card.clue)).not.toMatch(
            new RegExp(`\\b${lower(size)}\\b`),
          );
      });
    });
});
