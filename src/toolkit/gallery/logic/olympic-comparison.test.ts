import { describe, expect, it } from 'vite-plus/test';
import { compareOlympic } from './olympic-comparison';
import { rank } from './room-scorer';

describe('the Olympic plant room, before and after its redo, scored alike', () => {
  const { before, after } = compareOlympic();

  it('passes every gate now, where the morning’s room crossed open floor below headroom', () => {
    expect(after.gates).toEqual([]);
    expect(before.passes).toBe(false);
  });

  it('ranks the new room first', () => {
    expect(rank([before, after])[0]).toBe(after);
  });

  it('needs a third less floor for what it holds', () => {
    const area = (s: typeof before) =>
      Number(
        /(\d+) m² against/.exec(
          s.dimensions.find((d) => d.name === 'room area')!.why,
        )![1],
      );
    expect(area(after)).toBeLessThan(area(before) * 0.7);
  });
});
