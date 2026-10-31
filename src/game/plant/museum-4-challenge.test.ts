import { describe, expect, it } from 'vite-plus/test';
import { CHALLENGES } from './museum-4-cards';
import {
  CLUE_AFTER,
  FREE_SWIMMERS,
  HOLD,
  MAX_REAL_STEP,
  SETTLE,
  SPEED,
  WON_SHOWN,
  canDose,
  classifyRoute,
  dosesInWords,
  narrationWords,
  doseGame,
  labClock,
  newGame,
  resetGame,
  scenarioView,
  startCard,
  stepGame,
  stepLab,
} from './museum-4-challenge';
import type { Hall4Game } from './museum-4-challenge';

const card = CHALLENGES[0];
const realFor = (g: Hall4Game, seconds: number) => {
  let n = g;
  for (let t = 0; t < seconds - 1e-9; t += MAX_REAL_STEP)
    n = stepGame(n, Math.min(MAX_REAL_STEP, seconds - t));
  return n;
};

describe("Hall 4's challenge engine", () => {
  it('starts in free play with twenty swimmers, no limit and no win', () => {
    let g = newGame();
    expect(scenarioView(g)).toEqual({ kind: 'free', swimmers: FREE_SWIMMERS });
    expect(g.lab.bench.plant.batherFactor).toBe(1);
    for (let i = 0; i < 12; i++) g = doseGame(g, 'fresh', 0);
    expect(g.used).toBe(12);
    expect(canDose(g)).toBe(true);
    g = stepLab(g, 2 * HOLD);
    expect(g.outcome).toBe('playing');
  });

  it('runs at a fixed 1,000×, a long frame clamped', () => {
    const g = newGame();
    expect(stepGame(g, 0.05).lab.seconds).toBeCloseTo(0.05 * SPEED);
    expect(stepGame(g, 5).lab.seconds).toBeCloseTo(MAX_REAL_STEP * SPEED);
  });

  it('loads a card’s water and swimmers and briefs the visitor', () => {
    const g = startCard(newGame(), card, 'pro');
    expect(g.lab.bench.pool.ph).toBeCloseTo(card.water().ph);
    expect(g.lab.bench.plant.batherFactor).toBe(card.swimmers / FREE_SWIMMERS);
    expect(g.narration?.kind).toBe('briefing');
    const v = scenarioView(g);
    expect(v.kind).toBe('challenge');
    if (v.kind !== 'free') {
      expect(v.par).toBe(card.pars.pro);
      expect(v.used).toBe(0);
      expect(v.out.length).toBeGreaterThan(0);
    }
  });

  it('refuses DOSE at par, and fails once the water has had its time', () => {
    let g = startCard(newGame(), card, 'journeyman');
    for (let i = 0; i < card.pars.journeyman; i++) g = doseGame(g, 'fresh', 0);
    expect(canDose(g)).toBe(false);
    expect(doseGame(g, 'hcl', 2)).toBe(g);
    g = stepLab(g, SETTLE + 60);
    expect(g.outcome).toBe('failed');
    expect(scenarioView(g).kind).toBe('failed');
  });

  it('wins on an hour held, explains, then returns to free play', () => {
    let g = startCard(newGame(), card, 'journeyman');
    g = doseGame(
      g,
      card.solutions.journeyman[0].tank,
      card.solutions.journeyman[0].size,
    );
    g = stepLab(g, 600);
    const held = g.heldSince;
    expect(held).not.toBeNull();
    g = stepLab(g, HOLD);
    expect(g.outcome).toBe('won');
    expect(g.narration?.kind).toBe('explanation');
    expect(canDose(g)).toBe(false);
    g = realFor(g, WON_SHOWN + 0.2);
    expect(scenarioView(g).kind).toBe('free');
  });

  it('restarts the hold when a reading drifts out', () => {
    let g = startCard(newGame(), card, 'journeyman');
    g = doseGame(g, 'hcl', 2);
    g = stepLab(g, 600);
    expect(g.heldSince).not.toBeNull();
    g = doseGame(g, 'sodaAsh', 4);
    g = stepLab(g, 60);
    expect(g.heldSince).toBeNull();
  });

  it('gives its clue once after a real minute without a win', () => {
    let g = startCard(newGame(), card, 'pro');
    g = realFor(g, CLUE_AFTER - 1);
    expect(g.narration?.kind).toBe('briefing');
    g = realFor(g, 1.2);
    expect(g.narration?.kind).toBe('clue');
    const seq = g.narration!.seq;
    g = realFor(g, CLUE_AFTER);
    expect(g.narration!.seq).toBe(seq);
    // A new attempt starts the minute again.
    g = startCard(g, card, 'pro');
    expect(g.clueGiven).toBe(false);
  });

  it('resets to free play from the reset water', () => {
    const g = resetGame(doseGame(startCard(newGame(), card, 'pro'), 'hcl', 4));
    expect(g.card).toBeNull();
    expect(g.lab.bench.pool.ph).toBeCloseTo(7.4, 1);
  });

  it('writes lab time as hours and minutes', () => {
    expect(labClock(42 * 60)).toBe('0:42');
    expect(labClock(3600)).toBe('1:00');
  });
});

describe('the slow drift', () => {
  it('does not win Stinging eyes at Journeyman on one Medium bicarbonate, stepped as the hall steps', () => {
    const eyes = CHALLENGES.find((c) => c.id === 'acid-overdose')!;
    // The owner's game: one Medium dose, a dose still in hand, then a real
    // minute's wait while the pH creeps up as CO₂ leaves the water.
    const g = realFor(
      doseGame(startCard(newGame(), eyes, 'journeyman'), 'bicarbonate', 2),
      60,
    );
    expect(g.outcome).toBe('playing');
    expect(g.heldSince).toBeNull();
  });

  it("records the visitor's doses, and forgets them on a new card or free play", () => {
    const card = CHALLENGES[0];
    let g = startCard(newGame(), card, 'journeyman');
    g = doseGame(doseGame(g, 'hcl', 2), 'fresh', 1);
    expect(g.given).toEqual([
      { tank: 'hcl', size: 2 },
      { tank: 'fresh', size: 1 },
    ]);
    expect(startCard(g, card, 'pro').given).toEqual([]);
  });

  it('classifies a win close to no route as other, and words it generically', () => {
    const card = CHALLENGES.find((c) => c.id === 'acid-overdose')!;
    const doses = [{ tank: 'calciumChloride', size: 4 }] as const;
    expect(classifyRoute(card, 'journeyman', doses)).toEqual({ kind: 'other' });
    const g = { ...startCard(newGame(), card, 'journeyman'), given: doses };
    const w = narrationWords(g, 'explanation')!;
    expect(w.route.kind).toBe('other');
    expect(w.text).toContain('Huge calcium chloride');
    expect(w.text).toContain('better solution');
    expect(dosesInWords([...doses, { tank: 'fresh', size: 0 }])).toBe(
      'Huge calcium chloride and Tiny fresh water',
    );
  });

  it('prefers the stored solution to an alternative on a tie, the nearer route otherwise', () => {
    const card = CHALLENGES.find((c) => c.id === 'acid-overdose')!;
    expect(
      classifyRoute(card, 'journeyman', card.solutions.journeyman),
    ).toEqual({ kind: 'solution' });
    expect(
      classifyRoute(card, 'journeyman', [{ tank: 'hypo', size: 4 }]),
    ).toEqual({ kind: 'also', index: 0 });
  });
});
