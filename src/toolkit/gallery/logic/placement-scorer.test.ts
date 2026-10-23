import { describe, expect, it } from 'vite-plus/test';
import { EXHIBITS } from '../rooms/plant/port-graph-demo';
import { dev19Candidate, scoreDev19Placement } from './dev19-scoring';
import { layoutSquarePlantRoom } from './plant-room-layout';

describe('the placement scorer', () => {
  const sizes = EXHIBITS.map((e) => e.size);
  it('scores a placement before any plumbing, gates first, saying why', () => {
    const s = scoreDev19Placement('Dev19', sizes, dev19Candidate(sizes, 1));
    expect(s.passes).toBe(true);
    expect(s.dimensions.map((d) => d.name)).toEqual([
      'access',
      'sites',
      'batteries',
      'process order',
      'short suctions',
      'pipework estimate',
      'room area',
    ]);
    for (const d of s.dimensions) expect(d.why.length).toBeGreaterThan(5);
  }, 60000);

  it('scores the sized room above the morning\\u2019s 20 m square', () => {
    const sized = scoreDev19Placement('sized', sizes, dev19Candidate(sizes, 1));
    const square = layoutSquarePlantRoom(sizes);
    const morning = scoreDev19Placement('square', sizes, {
      ...dev19Candidate(sizes, 1),
      ...square,
      bandOf: square.places.map(() => null),
      problems: [],
    });
    expect(sized.total).toBeGreaterThan(morning.total);
  }, 60000);
});
