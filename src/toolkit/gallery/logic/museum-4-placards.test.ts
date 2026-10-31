import { describe, expect, it } from 'vite-plus/test';
import {
  CARD_NARRATION,
  cardNarrationScript,
  hall4Entrance,
  hall4Facts,
  hall4Placards,
} from './museum-4-placards';
import { CHALLENGES } from '../../../game/plant/museum-4-cards';
import script from '../../../../doc/scripts/museum/museum-narration.txt?raw';

describe('Hall 4’s words', () => {
  it('has five stations, desk to challenges, in the order of the way round', () => {
    expect(hall4Placards().map((p) => p.headline)).toEqual([
      'The station',
      'The tanks',
      'The swimmers',
      'The readout',
      'The challenges',
    ]);
  });
  it('takes its facts from the model', () => {
    const k = hall4Facts();
    expect(k.teaspoons).toBeLessThan(0.5);
    expect(Math.round(k.resetHocl)).toBe(54);
    expect(hall4Entrance().introduction).toContain('500 tonnes');
    expect(hall4Placards()[1].title).toContain('M4-CT1');
  });
});

describe('Hall 4’s card narrations', () => {
  it('have a clip slot for each card’s briefings, clue and explanation', () => {
    for (const c of CHALLENGES)
      expect(Object.keys(CARD_NARRATION[c.id]).sort()).toEqual([
        'briefing',
        'briefingPro',
        'clue',
        'explanation',
      ]);
  });
  it('are in the narration script for recording, word for word', () => {
    expect(script).toContain(cardNarrationScript());
  });
});
