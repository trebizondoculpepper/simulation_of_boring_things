import { describe, expect, it } from 'vite-plus/test';
import {
  CHAPTERS,
  CHAPTER_SECONDS,
  NARRATION_OFF,
  OPENING,
  SPONSOR,
  litChapter,
  pressNarration,
  stepNarration,
} from './museum-8-incident';

describe('Hall 8, Never again', () => {
  it('tells six chapters in order, the brief’s headlines among their clippings', () => {
    expect(CHAPTERS.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(CHAPTERS.slice(0, 4).map((c) => c.time)).toEqual([
      '07:42',
      '07:51',
      '07:58',
      '08:05',
    ]);
    const heads = CHAPTERS.flatMap((c) => c.clipping?.headline ?? []);
    expect(heads).toContain('GAS ALERT AT THE BATHS');
    expect(heads).toContain('BATHS SHUT FOR SIX WEEKS');
    expect(heads).toContain('NEW SAFETY RULES AFTER BATHS SCARE');
  });

  it('names no real venue, paper or firm, and echoes no real fine', () => {
    const all = JSON.stringify({ CHAPTERS, OPENING, SPONSOR });
    for (const real of [
      'Basingstoke',
      'Circle',
      'Olympic',
      'London',
      'Hednesford',
      'Sheffield',
      'Edinburgh',
      'Frankfurt',
      '£45,000',
      '£160,000',
    ])
      expect(all).not.toContain(real);
    expect(SPONSOR.lessons).toHaveLength(7);
  });

  it('lights the chapters in turn, then stops; pressing again stops it', () => {
    let n = pressNarration(NARRATION_OFF);
    expect(litChapter(n)).toBe(0);
    n = stepNarration(n, CHAPTER_SECONDS * 2.5);
    expect(litChapter(n)).toBe(2);
    expect(pressNarration(n)).toEqual(NARRATION_OFF);
    n = stepNarration(n, CHAPTER_SECONDS * 4);
    expect(litChapter(n)).toBeNull();
  });
});
