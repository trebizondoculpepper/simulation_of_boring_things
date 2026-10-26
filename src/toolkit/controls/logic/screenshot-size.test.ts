import { describe, expect, it } from 'vite-plus/test';
import { screenshotPixelRatio } from './screenshot-size';

describe('screenshot pixel ratio', () => {
  it('uses the 16 megapixel budget without exceeding the GPU dimension', () => {
    const ratio = screenshotPixelRatio(1920, 1080, 1, 4096);
    expect(ratio * 1920).toBe(4096);
    expect(ratio * 1080).toBe(2304);
  });

  it('does not degrade an already sharper display or an invalid canvas', () => {
    expect(screenshotPixelRatio(3840, 2160, 2, 4096)).toBe(2);
    expect(screenshotPixelRatio(0, 0, 2, 4096)).toBe(2);
  });
});
