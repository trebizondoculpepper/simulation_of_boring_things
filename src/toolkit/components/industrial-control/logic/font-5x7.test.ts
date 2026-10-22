import { describe, expect, it } from 'vite-plus/test';
import { CHARACTERS, dot } from './font-5x7';

/** A character as rows of dots, for reading in a failure. */
const rows = (c: string) =>
  Array.from({ length: 7 }, (_, r) =>
    Array.from({ length: 5 }, (_, k) => (dot(c, k, r) ? '#' : '.')).join(''),
  );

describe('the 5 × 7 character set', () => {
  it('has every printable ASCII character', () => {
    for (let code = 32; code < 127; code++)
      expect(CHARACTERS, String.fromCharCode(code)).toContain(
        String.fromCharCode(code),
      );
  });

  it('leaves a space blank and lights something of every other character', () => {
    expect(rows(' ').join('')).not.toContain('#');
    for (const c of CHARACTERS.replace(' ', ''))
      expect(rows(c).join(''), c).toContain('#');
  });

  it('draws characters as they read', () => {
    expect(rows('I')).toEqual([
      '.###.',
      '..#..',
      '..#..',
      '..#..',
      '..#..',
      '..#..',
      '.###.',
    ]);
    expect(rows('L')).toEqual([
      '#....',
      '#....',
      '#....',
      '#....',
      '#....',
      '#....',
      '#####',
    ]);
    expect(rows('-')[3]).toBe('#####');
  });

  it('shows a character it lacks as a solid block', () => {
    expect(rows('€').join('')).toBe('#'.repeat(35));
  });
});
