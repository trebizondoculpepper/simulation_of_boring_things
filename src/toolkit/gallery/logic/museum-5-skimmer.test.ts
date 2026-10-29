import { describe, expect, it } from 'vite-plus/test';
import {
  CLEARED_LINE,
  FINDS,
  FIRST_FIND,
  SKIMMER_TAGS,
  actOnSkimmer,
  cleared,
  held,
  inBasket,
  newSkimmerGame,
} from './museum-5-skimmer';
import type { SkimmerAction, SkimmerGame } from './museum-5-skimmer';

const run = (g: SkimmerGame, ...as: SkimmerAction[]) =>
  as.reduce(actOnSkimmer, g);
const toSkip: SkimmerAction = { type: 'skip', besideX: 1, besideZ: 1 };

describe('Hall 5: what’s in the skimmer', () => {
  it('starts full, lid on, skip empty, hands empty', () => {
    const g = newSkimmerGame();
    expect(g.lid.at).toBe('on');
    expect(inBasket(g)).toBe(g.order.length);
    expect(g.binned).toBe(0);
    expect(held(g)).toBeNull();
  });

  it('cannot be reached into with the lid on', () => {
    const g = run(newSkimmerGame(), { type: 'skimmer' });
    expect(held(g)).toBeNull();
    expect(g.said).toMatch(/lid/i);
  });

  it('hands over one find at a time, the hair clump first', () => {
    let g = run(
      newSkimmerGame(),
      { type: 'lid' },
      { type: 'deck', x: 0, z: 0 },
    );
    g = run(g, { type: 'skimmer' });
    expect(held(g)).toBe(0);
    expect(g.order[0]).toBe(FIRST_FIND);
    const again = run(g, { type: 'skimmer' });
    expect(held(again)).toBe(0);
    expect(again.said).toBe('Your hands are full.');
  });

  it('counts a find only in the skip; dropped on the deck it can be picked up again', () => {
    let g = run(
      newSkimmerGame(),
      { type: 'lid' },
      { type: 'deck', x: 0, z: 0 },
      { type: 'skimmer' },
      { type: 'deck', x: 2, z: 1 },
    );
    expect(g.binned).toBe(0);
    expect(g.places[0]).toEqual({ at: 'deck', x: 2, z: 1 });
    g = run(g, { type: 'pick', index: 0 }, toSkip);
    expect(g.binned).toBe(1);
    expect(g.places[0].at).toBe('skip');
  });

  it('never takes the lid into the skip', () => {
    const g = run(newSkimmerGame(), { type: 'lid' }, toSkip);
    expect(g.lid).toEqual({ at: 'deck', x: 1, z: 1 });
    expect(g.binned).toBe(0);
  });

  it('is cleared exactly when the last find lands in the skip', () => {
    let g = run(
      newSkimmerGame(),
      { type: 'lid' },
      { type: 'deck', x: 0, z: 0 },
    );
    for (let k = 0; k < g.order.length; k++) {
      expect(cleared(g)).toBe(false);
      g = run(g, { type: 'skimmer' }, toSkip);
    }
    expect(cleared(g)).toBe(true);
    expect(g.said).toBe(CLEARED_LINE(g.order.length));
  });

  it('holds the six finds in their order, hair first and last', () => {
    expect(newSkimmerGame().order).toEqual([
      'hair-clump',
      'leaves',
      'dead-rat',
      'dildo',
      'butt-plug',
      'more-hair',
    ]);
    expect(newSkimmerGame().order[0]).toBe(FIRST_FIND);
  });

  it('has a caption for every find, and tags from the hall’s room code', () => {
    for (const f of FINDS) {
      expect(f.caption.length).toBeGreaterThan(5);
      expect(f.got).toBe(f.got.trim());
    }
    expect(SKIMMER_TAGS.skimmer).toBe('M5-SK1');
  });

  it('counts a find landing in the skip, tossed from the deck, once', () => {
    let g = run(
      newSkimmerGame(),
      { type: 'lid' },
      { type: 'deck', x: 0, z: 0 },
      { type: 'skimmer' },
      { type: 'deck', x: 1, z: 1 },
      { type: 'land', index: 0 },
      { type: 'land', index: 0 },
      { type: 'land', index: 1 },
    );
    expect(g.places[0].at).toBe('skip');
    expect(g.binned).toBe(1);
    expect(g.places[1].at).toBe('basket');
    for (let i = 1; i < g.order.length; i++)
      g = run(g, { type: 'skimmer' }, { type: 'land', index: i });
    expect(cleared(g)).toBe(true);
    expect(g.said).toBe(CLEARED_LINE(g.order.length));
  });
});
