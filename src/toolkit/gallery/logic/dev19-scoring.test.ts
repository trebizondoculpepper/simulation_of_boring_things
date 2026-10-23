import { describe, expect, it } from 'vite-plus/test';
import { EXHIBITS } from '../rooms/plant/port-graph-demo';
import {
  DEV19C_SEED,
  dev19Candidate,
  scoreMorningDev19,
  scorePlumbedDev19,
} from './dev19-scoring';
import { ADOPTED_RULES } from './port-graph-demo-routes';

describe('dev19 scored', () => {
  const sizes = EXHIBITS.map((e) => e.size);
  it('scores today’s Dev19 well above this morning’s, and keeps every run out of the reserved regions', () => {
    const morning = scoreMorningDev19(sizes);
    const today = scorePlumbedDev19(
      'Dev19',
      sizes,
      dev19Candidate(sizes, 1),
      ADOPTED_RULES,
    );
    expect(today.total).toBeGreaterThan(morning.total + 20);
    expect(today.gates.some((g) => g.includes('reserved region'))).toBe(false);
    expect(today.gates.some((g) => g.includes('fittings'))).toBe(false);
  }, 60000);

  it('keeps Dev19c’s seed because it scores at least as well as the first', () => {
    const first = scorePlumbedDev19(
      'seed 1',
      sizes,
      dev19Candidate(sizes, 1),
      ADOPTED_RULES,
    );
    const chosen = scorePlumbedDev19(
      'Dev19c',
      sizes,
      dev19Candidate(sizes, DEV19C_SEED),
      ADOPTED_RULES,
    );
    expect(chosen.total).toBeGreaterThanOrEqual(first.total);
  }, 60000);
});
