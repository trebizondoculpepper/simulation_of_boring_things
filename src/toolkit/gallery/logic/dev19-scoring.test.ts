import { describe, expect, it } from 'vite-plus/test';
import { EXHIBITS } from '../rooms/plant/port-graph-demo';
import {
  DEV19C_SEED,
  dev19Candidate,
  scoreMorningDev19,
  scoreDev19,
  scorePlumbedDev19,
} from './dev19-scoring';
import { ADOPTED_RULES } from './port-graph-demo-routes';
import { rank } from './room-scorer';

describe('dev19 scored', () => {
  const sizes = EXHIBITS.map((e) => e.size);
  it('scores today’s Dev19 well above this morning’s, and keeps every run out of the reserved regions', () => {
    const morning = scoreMorningDev19(sizes);
    const today = scorePlumbedDev19(
      'Dev19c',
      sizes,
      dev19Candidate(sizes, DEV19C_SEED),
      ADOPTED_RULES,
    );
    expect(today.total).toBeGreaterThan(morning.total + 20);
    // Dev19c passes every gate: every line routed, no clash, every fitting.
    expect(today.gates).toEqual([]);
    expect(today.passes).toBe(true);
  }, 60000);

  it('keeps Dev19c’s seed because it ranks above the first, gates first', () => {
    const first = scoreDev19(
      'seed 1',
      sizes,
      dev19Candidate(sizes, 1),
      ADOPTED_RULES,
    );
    const chosen = scoreDev19(
      'Dev19c',
      sizes,
      dev19Candidate(sizes, DEV19C_SEED),
      ADOPTED_RULES,
    );
    expect(rank([first, chosen])[0]).toBe(chosen);
  }, 60000);
});

describe('the process layout rules', () => {
  const sizes = EXHIBITS.map((e) => e.size);
  it('make Dev19c go one way round, and rank above its best layout without them', () => {
    const before = scoreDev19(
      'before',
      sizes,
      dev19Candidate(sizes, 2, false),
      ADOPTED_RULES,
    );
    const after = scoreDev19(
      'after',
      sizes,
      dev19Candidate(sizes, DEV19C_SEED),
      ADOPTED_RULES,
    );
    const order = (s: typeof after) =>
      s.dimensions.find((d) => d.name === 'process order')!.score;
    expect(order(after)).toBeGreaterThan(order(before));
    expect(rank([before, after])[0]).toBe(after);
  }, 120000);
});
