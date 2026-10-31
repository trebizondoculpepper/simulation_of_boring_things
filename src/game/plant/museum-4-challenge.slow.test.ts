import { describe, expect, it } from 'vite-plus/test';
import { CHALLENGES } from './museum-4-cards';
import {
  MAX_REAL_STEP,
  doseGame,
  newGame,
  replay,
  startCard,
  stepGame,
} from './museum-4-challenge';
import type { Level } from './museum-4-challenge';
import { TANKS } from './museum-4-lab';
import type { SizeIndex } from './museum-4-doses';

const SIZES: SizeIndex[] = [0, 1, 2, 3, 4];
const LEVELS: Level[] = ['journeyman', 'pro'];

describe('the live hall and the replay', () => {
  // Every single dose of every chemical at every size, on every card at
  // each level: the hall's stepping (a real minute at 1,000×, in its
  // largest frames) wins exactly when the solver's replay does, so no
  // cheap win is to be had live that the stored solutions do not know of.
  for (const card of CHALLENGES)
    it(`agree on every single dose of ${card.title}`, () => {
      const disagree: string[] = [];
      for (const level of LEVELS)
        for (const tank of TANKS)
          for (const size of SIZES) {
            let g = doseGame(startCard(newGame(), card, level), tank.id, size);
            for (
              let t = 0;
              g.outcome === 'playing' && t < 60;
              t += MAX_REAL_STEP
            )
              g = stepGame(g, MAX_REAL_STEP);
            const r = replay(card, level, [{ tank: tank.id, size }]);
            if ((g.outcome === 'won') !== (r.outcome === 'won'))
              disagree.push(
                `${level} ${tank.id} ${size}: ${g.outcome} live, ${r.outcome} replayed`,
              );
          }
      expect(disagree).toEqual([]);
    }, 120_000);
});
