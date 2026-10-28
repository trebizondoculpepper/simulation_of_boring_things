import { describe, expect, it } from 'vite-plus/test';
import { hall3Entrance, hall3Facts, hall3Placards } from './museum-3-placards';

describe('Hall 3’s words', () => {
  it('has a placard at each of its seven stations, in order', () => {
    expect(hall3Placards().map((p) => [p.station, p.headline])).toEqual([
      [1, 'The swimmers'],
      [2, 'The sample'],
      [3, 'The controller'],
      [4, 'The pumps'],
      [5, 'The tanks'],
      [6, 'The test kit'],
      [7, 'When it goes wrong'],
    ]);
    expect(hall3Entrance().route).toHaveLength(7);
  });

  it('takes its facts from the model and the controller: HOCl’s share falls as pH rises', () => {
    const k = hall3Facts();
    expect(k.set).toBe(1.3);
    expect(k.hocl73).toBeGreaterThan(k.hocl76);
    expect(k.limitHours).toBe(2);
  });

  it('names its tags as the model derives them', () => {
    const text = hall3Placards()
      .map((p) => `${p.title} ${p.body} ${p.tryIt}`)
      .join(' ');
    for (const tag of [
      'M3-SC1',
      'SC1-V1',
      'FS1',
      'DP1-V1',
      'DT1-V1',
      'M3-TK1',
      'M3-DC1',
    ])
      expect(text).toContain(tag);
  });
});
