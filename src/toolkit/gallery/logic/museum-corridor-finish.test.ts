import { describe, expect, it } from 'vite-plus/test';
import { corridorFinish } from './museum-corridor-finish';
import { hallCorridors, type MuseumHallId } from './museum-plan';

const halls = Array.from(
  { length: 10 },
  (_, n) => `museum${n}` as MuseumHallId,
);

describe('corridorFinish', () => {
  it('gives c78, between the two black boxes, their black finish', () => {
    expect(corridorFinish('museum7', 'museum8')).toBe('blackBox');
    expect(corridorFinish('museum8', 'museum7')).toBe('blackBox');
  });

  it('leaves every other corridor white, and both copies agree', () => {
    for (const id of halls)
      for (const c of hallCorridors(id)) {
        const pair = [id, c.to].sort().join('-');
        const want = pair === 'museum7-museum8' ? 'blackBox' : 'gallery';
        expect(corridorFinish(id, c.to)).toBe(want);
        expect(corridorFinish(c.to, id)).toBe(want);
      }
  });
});
