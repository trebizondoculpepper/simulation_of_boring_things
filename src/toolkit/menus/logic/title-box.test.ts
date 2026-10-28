import { describe, expect, it } from 'vite-plus/test';
import {
  TITLE_OPTIONS,
  TITLE_SPANS,
  TITLE_UNIT,
  layoutTitleBox,
  titlePress,
} from './title-box';

describe('the title box', () => {
  it('sets each button in a column with its legend to its right', () => {
    const { cells } = layoutTitleBox();
    expect(cells).toHaveLength(TITLE_OPTIONS.length * 2);
    TITLE_OPTIONS.forEach((option, row) => {
      const button = cells.find(
        (c) => c.item?.kind === 'button' && c.item.option === option,
      )!;
      const legend = cells.find(
        (c) => c.item?.kind === 'legend' && c.item.option === option,
      )!;
      expect(button.row).toBe(row);
      expect(legend.row).toBe(row);
      expect(button.column).toBe(0);
      expect(legend.column).toBe(TITLE_SPANS.button);
      expect(legend.x).toBeGreaterThan(button.x);
    });
  });
  it('is one plate as big as its grid and its border', () => {
    const { width, height } = layoutTitleBox();
    expect(width).toBeCloseTo(
      (TITLE_SPANS.button + TITLE_SPANS.legend) * TITLE_UNIT.column + 0.024,
      9,
    );
    expect(height).toBeCloseTo(
      TITLE_OPTIONS.length * TITLE_UNIT.row + 0.024,
      9,
    );
  });
  it('asks before a new game overwrites a save, and refuses to continue none', () => {
    expect(titlePress('newGame', { saved: true, armed: false })).toBe('arm');
    expect(titlePress('newGame', { saved: true, armed: true })).toBe('act');
    expect(titlePress('newGame', { saved: false, armed: false })).toBe('act');
    expect(titlePress('continueGame', { saved: false, armed: false })).toBe(
      'refuse',
    );
    expect(titlePress('continueGame', { saved: true, armed: false })).toBe(
      'act',
    );
    expect(titlePress('settings', { saved: false, armed: false })).toBe('act');
  });
});
