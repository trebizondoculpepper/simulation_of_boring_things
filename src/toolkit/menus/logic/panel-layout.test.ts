import { describe, expect, it } from 'vite-plus/test';
import {
  PITCH,
  layoutPanel,
  overflowingTitles,
  overlaps,
  packGrid,
} from './panel-layout';
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
  for (const width of [PANEL_WIDTH.min, 0.45, 0.7, 1.2, PANEL_WIDTH.max])
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
  it('sets every plate on the rack grid, so edges line up across groups', () => {
    for (const width of [PANEL_WIDTH.min, 0.8, PANEL_WIDTH.max]) {
      const layout = layoutPanel(zones, width);
      for (const m of layout.modules) {
        const across = (m.x - layout.left) / PITCH.x;
        expect(Math.abs(across - Math.round(across))).toBeLessThan(1e-6);
        expect(m.column + m.columns).toBeLessThanOrEqual(layout.columns);
      }
      // Plates in the same grid row share a top edge.
      const tops = new Map<number, number>();
      for (const m of layout.modules) {
        const top = tops.get(m.row);
        if (top === undefined) tops.set(m.row, m.y);
        else expect(m.y).toBeCloseTo(top, 9);
      }
    }
  });
  it('packs a tall module with short ones beside it, filling the block', () => {
    const { places, rows } = packGrid(
      [
        [9, 2],
        [5, 1],
        [4, 1],
      ],
      14,
    );
    expect(rows).toBe(2);
    expect(places).toEqual([
      [0, 0],
      [9, 0],
      [9, 1],
    ]);
  });
  it('is taller when narrower', () => {
    expect(layoutPanel(zones, PANEL_WIDTH.min).height).toBeGreaterThan(
      layoutPanel(zones, 0.9).height,
    );
  });
});
