import { describe, expect, it } from 'vite-plus/test';
import { humanLadderLayout } from './human-ladder';

describe('human ladder layout', () => {
  it('puts pool exits on opposite sides of its rungs', () => {
    const ladder = humanLadderLayout('pool', 1.8);
    expect(ladder.bottom).toBe(-1.8);
    expect(ladder.top).toBe(0);
    expect(ladder.bottomExit[0]).toBeGreaterThan(ladder.rung[0]);
    expect(ladder.topExit[0]).toBeLessThan(ladder.rung[0]);
  });

  it('keeps the passage between the two solid stiles open', () => {
    const ladder = humanLadderLayout('tank-access', 4.5);
    expect(ladder.stiles).toHaveLength(2);
    expect(ladder.stiles[0].maxX).toBeLessThan(ladder.rung[0]);
    expect(ladder.stiles[1].minX).toBeGreaterThan(ladder.rung[0]);
  });

  it('rejects a handrail-sized gap as a human ladder', () => {
    expect(() => humanLadderLayout('pool', 1, { width: 0.01 })).toThrow();
  });
});
