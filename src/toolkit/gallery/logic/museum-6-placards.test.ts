import { describe, expect, it } from 'vite-plus/test';
import { hall6Entrance, hall6Plaques, powerText } from './museum-6-placards';
import { fillSentence } from '../../../game/plant/museum-6-pumps';

describe('Hall 6’s words', () => {
  it('gives each pump its fill time from the model', () => {
    const plaques = hall6Plaques();
    expect(plaques).toHaveLength(6);
    expect(plaques[0].headline).toBe(fillSentence(1));
    expect(plaques[5].headline).toContain('seconds');
    expect(plaques[0].headline).toContain('days');
  });

  it('says power in watts and kilowatts', () => {
    expect(powerText(0.02)).toBe('20 W');
    expect(powerText(45)).toBe('45 kW');
  });

  it('puts the ratio on the entrance panel', () => {
    expect(hall6Entrance().introduction).toMatch(/about [\d,]+ times faster/);
  });
});
