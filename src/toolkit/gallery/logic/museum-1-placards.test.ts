import { describe, expect, it } from 'vite-plus/test';
import { hall1Entrance, hall1Facts, hall1Placards } from './museum-1-placards';

describe('Hall 1’s words', () => {
  it('has a placard at each of its seven stations, gas to cost, in order', () => {
    expect(hall1Placards().map((p) => [p.station, p.headline])).toEqual([
      [1, 'The gas'],
      [2, 'The boiler'],
      [3, 'The exchanger'],
      [4, 'The pump'],
      [5, 'The pool'],
      [6, 'Where the heat goes'],
      [7, 'The gas it burns'],
    ]);
  });

  it('takes its facts from the model: 547 kWh a degree, about 3,250 kettles', () => {
    const k = hall1Facts();
    expect(Math.round(k.kWhPerK)).toBe(547);
    expect(Math.round(k.kettles / 50) * 50).toBe(3250);
    expect(k.busyFactor).toBeCloseTo(2, 9);
    expect(hall1Entrance().introduction).toContain('547 kWh');
    expect(hall1Entrance().introduction).toContain('3,250 kettles');
  });

  it('names its tags as the model derives them', () => {
    const text = hall1Placards()
      .map((p) => `${p.title} ${p.body} ${p.tryIt}`)
      .join(' ');
    for (const tag of [
      'M1-B1',
      'FQ1',
      'GS1-V1',
      'B1-V1',
      'P2-V2',
      'TC1',
      'FS1',
    ])
      expect(text).toContain(tag);
  });
});
