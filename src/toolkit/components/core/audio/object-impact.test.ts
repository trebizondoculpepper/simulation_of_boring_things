import { afterEach, expect, it, vi } from 'vite-plus/test';
import { createDropProfile } from '../../../controls/logic/drop-profile';
import { objectImpact } from './object-impact';

afterEach(() => vi.restoreAllMocks());

it('uses precomputed sound settings and gives larger housings a deeper impact', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  const small = createDropProfile('box', 0.04);
  const big = createDropProfile('box', 0.4);
  const a = objectImpact(small, 5, 1),
    b = objectImpact(big, 5, 1);
  if (!a || !b || !('click' in a) || !('click' in b))
    throw new Error('Expected impacts');
  expect(b.click.band).toBeLessThan(a.click.band / 2);
  expect(b.click.thump![0]).toBeLessThan(a.click.thump![0] / 2);
  const customized = objectImpact(
    { ...big, sound: { ...big.sound, band: 800, gain: 0.2 } },
    5.5,
    1,
  );
  if (!customized || !('click' in customized))
    throw new Error('Expected impact');
  expect(customized.click.band).toBe(800);
  expect(customized.click.level).toBe(0.2);
});

it('round parts use single impacts; flat objects start only one clatter per drop', () => {
  const round = objectImpact(createDropProfile('round', 0.04, 'ceramic'), 4, 1);
  expect(round && 'click' in round && round.click.repeat).toBeUndefined();
  const flat = createDropProfile('flat', 0.2, 'board');
  expect(objectImpact(flat, 4, 1)).toHaveProperty('sequence');
  expect(objectImpact(flat, 0.5, 2)).toBeNull();
});
