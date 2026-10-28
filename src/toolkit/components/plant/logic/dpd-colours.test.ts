import { describe, expect, it } from 'vite-plus/test';
import { dpdColour, phenolColour } from './dpd-colours';

describe('the DPD kit’s colours', () => {
  it('deepen with chlorine, and run yellow to red with pH', () => {
    expect(dpdColour(0)).toBe('#f8f4f4');
    expect(dpdColour(3)).toBe('#b0126e');
    expect(dpdColour(9)).toBe('#b0126e');
    expect(phenolColour(6.8)).toBe('#f0c828');
    expect(phenolColour(8.2)).toBe('#c81432');
  });
});
