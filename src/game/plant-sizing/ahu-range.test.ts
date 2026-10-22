import { describe, expect, it } from 'vite-plus/test';
import { ahuSizeFor, DANX_XWPS, ductSize, STACKED_MAX } from './ahu-range';

describe('the pool hall air handling units', () => {
  it('run from the 2/4 to the 16/32, each larger than the last', () => {
    expect(DANX_XWPS[0].model).toBe('2/4');
    expect(DANX_XWPS.at(-1)!.model).toBe('16/32');
    for (let i = 1; i < DANX_XWPS.length; i++)
      expect(DANX_XWPS[i].max).toBeGreaterThan(DANX_XWPS[i - 1].max);
  });

  it('pick the smallest unit that will carry the air', () => {
    expect(ahuSizeFor(600).model).toBe('2/4');
    expect(ahuSizeFor(4500).model).toBe('2/4');
    expect(ahuSizeFor(16200).model).toBe('9/18');
    expect(ahuSizeFor(19200).model).toBe('9/18');
    expect(ahuSizeFor(99999).model).toBe('16/32');
  });

  it('stack two of the largest stacked unit under a 6.1 m services ceiling', () => {
    expect(2 * STACKED_MAX.height + 0.15).toBeLessThan(6.1);
  });

  it('size each duct to carry its unit’s greatest airflow at 6 m/s or less', () => {
    for (const s of DANX_XWPS) {
      const { w, h } = ductSize(s);
      expect(w, s.model).toBeLessThanOrEqual(s.depth - 0.3 + 1e-9);
      expect(s.max / 3600 / (w * h), s.model).toBeLessThanOrEqual(6 + 1e-9);
    }
  });
});
