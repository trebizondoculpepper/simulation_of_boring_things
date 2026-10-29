import { describe, expect, it } from 'vite-plus/test';
import {
  CHAPTERS,
  CHAPTER_SECONDS,
  NARRATION_OFF,
  OPENING,
  SPONSOR,
  litChapter,
  narrationClip,
  nearestChapter,
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

  it('tells the chapter it is started on, then stops; pressing again stops it', () => {
    let n = pressNarration(NARRATION_OFF, 3);
    expect(litChapter(n)).toBe(3);
    n = stepNarration(n, CHAPTER_SECONDS / 2);
    expect(litChapter(n)).toBe(3);
    expect(pressNarration(n, 0)).toEqual(NARRATION_OFF);
    n = stepNarration(n, CHAPTER_SECONDS);
    expect(litChapter(n)).toBeNull();
  });

  it('picks the photograph the visitor stands nearest', () => {
    const photos = [
      { x: 4.5, z: -6 },
      { x: -0.2, z: -6 },
      { x: -4.9, z: -6 },
      { x: -4.1, z: 6 },
      { x: 0.6, z: 6 },
      { x: 5.3, z: 6 },
    ];
    expect(nearestChapter({ x: 6.9, z: 5.9 }, photos)).toBe(5);
    expect(nearestChapter({ x: 0, z: -3 }, photos)).toBe(1);
    expect(nearestChapter({ x: -5, z: 2 }, photos)).toBe(3);
    expect(nearestChapter({ x: 4, z: -1 }, photos)).toBe(0);
  });

  it('gives each chapter its own clip', () => {
    expect(CHAPTERS.map(narrationClip)).toEqual([
      'chapter-1',
      'chapter-2',
      'chapter-3',
      'chapter-4',
      'chapter-5',
      'chapter-6',
    ]);
  });
});
