import { describe, expect, it } from 'vite-plus/test';
import { Box3 } from 'three';
import { createPipeTee } from './pipe-kinds';
import { OD } from '../../../gallery/logic/museum-1-layout';

describe('a pipe tee', () => {
  // Hall 1's bypass tees: a 65 mm run, a 40 mm branch, ports 0.15 m out.
  const tee = (reach?: number) =>
    new Box3().setFromObject(
      createPipeTee(
        'lagged-heating',
        OD[65],
        OD[40],
        [0, 0, 0],
        [0, 0, 1],
        [0, -1, 0],
        reach,
      ),
    );

  it('reaches its ports, where the pipes end, leaving no gap', () => {
    const box = tee(0.15);
    expect(box.max.z).toBeGreaterThanOrEqual(0.15 - 1e-9);
    expect(box.min.z).toBeLessThanOrEqual(-0.15 + 1e-9);
    expect(box.min.y).toBeLessThanOrEqual(-0.15 + 1e-9);
  });

  it('without a reach, is only as long as its bore makes it', () => {
    expect(tee().max.z).toBeCloseTo(OD[65] * 1.1, 6);
  });
});
