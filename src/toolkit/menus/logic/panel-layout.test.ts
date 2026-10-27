import { describe, expect, it } from 'vite-plus/test';
import { layoutPanel, overflowingTitles, overlaps } from './panel-layout';
import { settingsPanel } from './settings-panel';
import { PANEL_WIDTH } from './iso-view';

const zones = settingsPanel({
  inGame: true,
  noclip: true,
  copyLink: true,
  devPanel: true,
  quitToDesktop: true,
});

describe('the panel layout', () => {
  for (const width of [PANEL_WIDTH.min, 0.45, 0.7, PANEL_WIDTH.max])
    it(`bolts every module in, apart and within the panel, ${width} m wide`, () => {
      const layout = layoutPanel(zones, width);
      expect(layout.modules).toHaveLength(
        zones.reduce((n, z) => n + z.items.length, 0),
      );
      for (const m of layout.modules) {
        expect(m.x).toBeGreaterThanOrEqual(0);
        expect(m.x + m.w).toBeLessThanOrEqual(width + 1e-9);
        expect(m.y + m.h).toBeLessThanOrEqual(layout.height);
      }
      for (const [i, a] of layout.modules.entries())
        for (const b of layout.modules.slice(i + 1))
          expect(overlaps(a, b)).toBe(false);
      for (const [i, a] of layout.groups.entries())
        for (const b of layout.groups.slice(i + 1))
          expect(overlaps(a, b)).toBe(false);
    });
  it('fits every title on its plate', () => {
    for (const width of [PANEL_WIDTH.min, 0.7])
      expect(overflowingTitles(layoutPanel(zones, width))).toEqual([]);
  });
  it('is taller when narrower', () => {
    expect(layoutPanel(zones, 0.3).height).toBeGreaterThan(
      layoutPanel(zones, 0.9).height,
    );
  });
});
