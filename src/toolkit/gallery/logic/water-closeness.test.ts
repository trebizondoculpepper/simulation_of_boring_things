import { describe, expect, it } from 'vite-plus/test';
import {
  CLOSENESS_SCALE,
  closeness,
  gameCloseness,
  scaledDistance,
  startReadings,
} from './water-closeness';
import {
  doseGame,
  newGame,
  replay,
  required,
  startCard,
  stepLab,
  REPLAY_GAP,
} from '../../../game/plant/museum-4-challenge';
import { CHALLENGES } from '../../../game/plant/museum-4-cards';
import type { Hall4Readings } from '../../../game/plant/museum-4-lab';

const BALANCED: Hall4Readings = {
  fc: 1.5,
  cc: 0.2,
  ph: 7.4,
  ta: 120,
  ch: 300,
  so4: 50,
  lsi: 0,
} as Hall4Readings;

describe("Hall 4's closeness to balanced", () => {
  it('scales each reading so one scale out counts as one', () => {
    expect(
      scaledDistance(BALANCED, ['fc', 'cc', 'ph', 'ta', 'ch', 'lsi']),
    ).toBe(0);
    expect(scaledDistance({ ...BALANCED, ph: 7.9 }, ['ph'])).toBeCloseTo(1);
    expect(scaledDistance({ ...BALANCED, ta: 50 }, ['ta'])).toBeCloseTo(1);
    expect(
      scaledDistance({ ...BALANCED, ph: 7.9, ta: 50 }, ['ph', 'ta']),
    ).toBeCloseTo(2);
    // Readings the level does not require are ignored.
    expect(scaledDistance({ ...BALANCED, ta: 50 }, ['ph'])).toBe(0);
    expect(CLOSENESS_SCALE.ph).toBe(0.3);
  });

  it('runs from 0 at the start to 1 only when all is in band, lower when worse', () => {
    const start = { ...BALANCED, ph: 8.2 };
    expect(closeness(start, start, ['ph'])).toBe(0);
    expect(closeness(start, { ...start, ph: 7.9 }, ['ph'])).toBeCloseTo(0.5);
    expect(closeness(start, { ...start, ph: 7.61 }, ['ph'])).toBeLessThan(1);
    expect(closeness(start, { ...start, ph: 7.6 }, ['ph'])).toBe(1);
    expect(closeness(start, { ...start, ph: 8.6 }, ['ph'])).toBe(0);
    const a = closeness(start, { ...start, ph: 7.8 }, ['ph']);
    expect(closeness(start, { ...start, ph: 8.0 }, ['ph'])).toBeLessThan(a);
  });

  it('is null in free play, near 0 as a card is dealt and 1 once won', () => {
    expect(gameCloseness(newGame())).toBeNull();
    for (const card of CHALLENGES)
      for (const level of ['journeyman', 'pro'] as const) {
        const g = startCard(newGame(), card, level);
        expect(gameCloseness(g)).toBeLessThanOrEqual(0.1);
        const won = replay(card, level, card.solutions[level]);
        if (won.outcome === 'won' && required(card, level).length)
          expect(gameCloseness(won)).toBe(1);
      }
  });

  it('rises partway with the first dose of a longer solution', () => {
    const card = CHALLENGES.find((c) => c.id === 'high-ph')!;
    const d = card.solutions.pro[0];
    const g = stepLab(
      doseGame(startCard(newGame(), card, 'pro'), d.tank, d.size),
      REPLAY_GAP,
    );
    expect(startReadings(card)).toBe(startReadings(card));
    const c = gameCloseness(g)!;
    expect(c).toBeGreaterThan(0.2);
    expect(c).toBeLessThan(1);
  });
});
