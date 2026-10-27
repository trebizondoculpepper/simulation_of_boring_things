import { describe, expect, it } from 'vite-plus/test';
import {
  LARGEST,
  PANEL_WIDTH,
  clampScroll,
  fitPanel,
  scrollRange,
} from './iso-view';

describe('the desk view', () => {
  it('draws a desktop panel at a legible, snapped scale', () => {
    const fit = fitPanel(1280);
    expect(fit.pixelsPerMillimetre).toBeGreaterThanOrEqual(1.75);
    expect(fit.pixelsPerMillimetre).toBeLessThanOrEqual(LARGEST);
    expect((fit.pixelsPerMillimetre * 4) % 1).toBe(0);
  });
  it('keeps a phone panel at its narrowest, smaller', () => {
    const fit = fitPanel(360);
    expect(fit.panelWidth).toBe(PANEL_WIDTH.min);
    expect(fit.pixelsPerMillimetre).toBeLessThan(1.5);
  });
  it('never draws wider than the screen', () => {
    for (const w of [360, 800, 1280, 2560]) {
      const { panelWidth, pixelsPerMillimetre } = fitPanel(w);
      expect(panelWidth * 1000 * pixelsPerMillimetre).toBeLessThanOrEqual(w);
    }
  });
  it('scrolls only a panel taller than the screen', () => {
    expect(scrollRange(0.2, 900, 3)).toBe(0);
    expect(scrollRange(1, 600, 2)).toBeGreaterThan(0.6);
    expect(clampScroll(-1, 0.5)).toBe(0);
    expect(clampScroll(0.7, 0.5)).toBe(0.5);
  });
});
