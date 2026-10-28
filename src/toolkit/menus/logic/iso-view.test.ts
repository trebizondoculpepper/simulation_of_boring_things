import { describe, expect, it } from 'vite-plus/test';
import {
  LARGEST,
  PANEL_WIDTH,
  clampScroll,
  fitPanel,
  fitPanelToScreen,
  easeInOut,
  plateView,
  viewBetween,
  DESK_VIEW,
  SCREEN_MARGIN,
  scrollRange,
} from './iso-view';

describe('the desk view', () => {
  it('draws a desktop panel at a legible, snapped scale', () => {
    const fit = fitPanel(1280);
    expect(fit.pixelsPerMillimetre).toBeGreaterThanOrEqual(0.9);
    expect(fit.pixelsPerMillimetre).toBeLessThanOrEqual(LARGEST);
    expect(fit.pixelsPerMillimetre * 20).toBeCloseTo(
      Math.round(fit.pixelsPerMillimetre * 20),
      9,
    );
  });
  it('keeps a phone panel at its narrowest, smaller', () => {
    const fit = fitPanel(360);
    expect(fit.panelWidth).toBe(PANEL_WIDTH.min);
    expect(fit.pixelsPerMillimetre).toBeLessThan(1);
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

describe('the panel fitted to the screen', () => {
  // A panel of fixed area: the wider, the shorter.
  const laid = (w: number) => ({ width: w, height: 0.4 / w });
  it('shows the whole panel, as large as it fits', () => {
    for (const [cw, ch] of [
      [1200, 800],
      [1920, 1080],
      [800, 1200],
    ]) {
      const fit = fitPanelToScreen(cw, ch, laid);
      const p = laid(fit.panelWidth);
      const k = fit.pixelsPerMillimetre * 1000;
      expect(p.width * k).toBeLessThanOrEqual(cw - 2 * SCREEN_MARGIN + 1e-6);
      expect(p.height * k * Math.cos(DESK_VIEW.pitch)).toBeLessThanOrEqual(
        ch - 2 * SCREEN_MARGIN + 1e-6,
      );
      expect(scrollRange(p.height, ch, fit.pixelsPerMillimetre)).toBe(0);
    }
  });
  it('draws a short window’s panel wider and so larger than its narrowest', () => {
    const fit = fitPanelToScreen(1920, 700, laid);
    expect(fit.panelWidth).toBeGreaterThan(PANEL_WIDTH.min);
  });
});

describe('zooming to a plate', () => {
  const panel = { width: 0.6, height: 0.5 };
  it('centres the plate and shows it whole', () => {
    const box = { x: 0.1, y: 0.05, w: 0.12, h: 0.1 };
    const v = plateView(box, panel, 1200, 800);
    expect(v.x).toBeCloseTo(0.16 - 0.3, 9);
    expect(v.y).toBeCloseTo(0.25 - 0.1, 9);
    expect(box.w * v.scale).toBeLessThanOrEqual(1200 - 2 * SCREEN_MARGIN);
    expect(box.h * v.scale * Math.cos(DESK_VIEW.pitch)).toBeLessThanOrEqual(
      800 - 2 * SCREEN_MARGIN + 1e-6,
    );
  });
  it('eases from one view to the other, ending exactly there', () => {
    const a = { x: 0, y: 0, scale: 1000 };
    const b = { x: 0.2, y: -0.1, scale: 4000 };
    expect(viewBetween(a, b, 0)).toEqual(a);
    const end = viewBetween(a, b, 1);
    expect(end.x).toBeCloseTo(b.x, 9);
    expect(end.scale).toBeCloseTo(b.scale, 6);
    expect(viewBetween(a, b, 0.5).scale).toBeCloseTo(2000, 6);
    expect(easeInOut(0.1)).toBeLessThan(0.1);
    expect(easeInOut(0.9)).toBeGreaterThan(0.9);
  });
});
