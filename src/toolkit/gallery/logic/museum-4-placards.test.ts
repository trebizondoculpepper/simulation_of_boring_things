import { describe, expect, it } from 'vite-plus/test';
import { hall4Entrance, hall4Facts, hall4Placards } from './museum-4-placards';

describe('Hall 4’s words', () => {
  it('has five stations, tanks to challenges, in order', () => {
    expect(hall4Placards().map((p) => p.headline)).toEqual([
      'The tanks',
      'The station',
      'The readout',
      'The swimmers',
      'The challenges',
    ]);
  });
  it('takes its facts from the model', () => {
    const k = hall4Facts();
    expect(k.teaspoons).toBeLessThan(0.5);
    expect(Math.round(k.resetHocl)).toBe(54);
    expect(hall4Entrance().introduction).toContain('500 tonnes');
    expect(hall4Placards()[0].title).toContain('M4-CT1');
  });
});
