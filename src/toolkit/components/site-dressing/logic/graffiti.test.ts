import { describe, expect, it } from 'vite-plus/test';
import { GRAFFITI, GRAFFITI_KIND_NAMES, anyGraffiti } from './graffiti';

describe('the graffiti collection', () => {
  it('has dozens of pieces, each with an id and title of its own', () => {
    expect(GRAFFITI.length).toBeGreaterThanOrEqual(40);
    expect(new Set(GRAFFITI.map((p) => p.id)).size).toBe(GRAFFITI.length);
    expect(new Set(GRAFFITI.map((p) => p.title)).size).toBe(GRAFFITI.length);
    expect(new Set(GRAFFITI.map((p) => p.seed)).size).toBe(GRAFFITI.length);
  });

  it('is about nothing in particular: no skips', () => {
    for (const piece of GRAFFITI)
      expect([piece.title, ...piece.text].join(' ')).not.toMatch(/SKIP/i);
  });

  it('shows every kind of graffiti at least once', () => {
    const kinds = new Set(GRAFFITI.map((p) => p.kind));
    for (const kind of Object.keys(GRAFFITI_KIND_NAMES))
      expect(kinds.has(kind as never)).toBe(true);
  });

  it('gives each piece the words and colours its kind needs', () => {
    for (const piece of GRAFFITI) {
      expect(piece.colours.length).toBeGreaterThan(0);
      for (const colour of piece.colours)
        expect(colour).toMatch(/^#[0-9a-f]{6}$/);
      if (piece.kind === 'character') expect(piece.text).toHaveLength(0);
      else expect(piece.text.length).toBeGreaterThan(0);
      if (piece.kind === 'crossed' || piece.kind === 'heart')
        expect(piece.text).toHaveLength(2);
      if (piece.kind === 'throwup' || piece.kind === 'piece')
        expect(piece.colours.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('chooses any piece at random', () => {
    const n = GRAFFITI.length;
    const seen = new Set(
      Array.from({ length: n }, (_, i) => anyGraffiti(() => i / n).id),
    );
    expect(seen.size).toBe(n);
  });
});
