import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { hallObstacles, stubDocument, walkway } from './walkways.test-support';
import type { MuseumHallId } from '../../logic/museum-plan';

/**
 * Each hall rearranged for layout C (112): a visitor walks from 1 m inside
 * either archway to the other round its exhibit, walls, corridors and
 * safety fittings. Halls join the list as they are done.
 */
const DONE: readonly MuseumHallId[] = ['museum4'];

beforeEach(stubDocument);
afterEach(() => vi.unstubAllGlobals());

describe('the museum’s walkways (layout C)', () => {
  for (const id of DONE)
    it(`walks through ${id} from archway to archway`, async () => {
      const w = walkway(id, await hallObstacles(id));
      expect(w.blocked, id).toEqual([]);
      expect(w.joined, id).toBe(true);
    });
});
