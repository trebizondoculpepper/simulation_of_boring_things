import { describe, expect, it } from 'vite-plus/test';
import {
  filterSettingsCard,
  hall2ActivityCard,
  hall2Entrance,
  hall2Facts,
  hall2Placards,
} from './museum-2-placards';

const allText = () =>
  [
    ...hall2Placards().flatMap((p) => [
      p.title,
      p.joins,
      p.body,
      p.fact,
      p.tryIt,
    ]),
    ...filterSettingsCard().lines,
    ...hall2ActivityCard().steps,
    hall2Entrance().bigIdea,
    hall2Entrance().fact,
  ].join(' ');

describe('Hall 2’s words', () => {
  it('has a placard at each of its eight stations, left to right, in the water’s order', () => {
    expect(hall2Placards().map((p) => [p.station, p.headline])).toEqual([
      [1, 'The balance tank'],
      [2, 'The pump'],
      [3, 'The sand filter'],
      [4, 'Ozone'],
      [5, 'The contact tank'],
      [6, 'The carbon filter'],
      [7, 'Ultraviolet light'],
      [8, 'Back to the pool'],
    ]);
  });

  it('states the filter’s settings from the model, and invites comment', () => {
    const card = filterSettingsCard();
    expect(card.lines.join(' ')).toContain('6.16 m²');
    expect(card.lines.join(' ')).toContain('30 m/h');
    expect(card.lines.join(' ')).toContain('0.42 bar clean');
    expect(card.lines.join(' ')).toContain('0.82 bar');
    expect(card.lines.join(' ')).toContain('196 m³/h');
    expect(card.invite).toBe('Think these settings are wrong? Tell us.');
  });

  it('takes its facts from the model', () => {
    const k = hall2Facts();
    expect(k.turnover).toBeCloseTo(2.56, 2);
    expect(hall2Entrance().fact).toContain('2.6 hours');
    expect(k.trip).toBeGreaterThanOrEqual(50);
    expect(k.trip).toBeLessThanOrEqual(70);
    expect(k.contactMinutes).toBeGreaterThan(2);
  });

  it('names its tags as the model derives them', () => {
    const text = allText();
    for (const tag of [
      'M2-BT1',
      'M2-P1',
      'M2-F1',
      'M2-OZ1',
      'M2-CT1',
      'M2-CF1',
      'M2-UV1',
      'F1-V2',
      'PDI1',
      'AI3',
      'DS1',
      'FT1',
    ])
      expect(text).toContain(tag);
  });

  it('says nothing of energy or chlorine numbers', () => {
    expect(allText()).not.toMatch(
      /kWh|\bkW\b|kettle|mg\/l of chlorine|free chlorine/i,
    );
  });
});
