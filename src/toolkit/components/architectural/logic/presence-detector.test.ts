import { describe, expect, it } from 'vite-plus/test';
import { detects } from './presence-detector';

describe('a high-bay presence detector', () => {
  it('sees someone within its circle on the floor, wider the higher it is', () => {
    const low = { x: 0, z: 0, height: 3 };
    const high = { x: 0, z: 0, height: 7 };
    expect(detects(low, 3.9, 0)).toBe(true);
    expect(detects(low, 4.1, 0)).toBe(false);
    expect(detects(high, 0, 9.2)).toBe(true);
    expect(detects(high, 0, 9.5)).toBe(false);
  });
});
