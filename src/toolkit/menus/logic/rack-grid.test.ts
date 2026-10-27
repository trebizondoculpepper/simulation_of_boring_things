import { describe, expect, it } from 'vite-plus/test';
import { blanksFor, layoutGrid, packGrid } from './rack-grid';
import type { Grid, Placed } from './rack-grid';

const UNIT = { column: 0.02, row: 0.08, gutter: 0.004 };
const leaf = (item: string, w: number, h: number, at?: [number, number]) => ({
  item,
  span: [w, h] as const,
  at,
});
const leaves = (cells: Placed<string, string>[]) =>
  cells.filter((c) => c.kind === 'leaf');
const covered = (cells: Placed<string, string>[], grid: string) => {
  const box = cells.find((c) => c.kind === 'grid' && c.grid === grid)!;
  const inside = cells.filter(
    (c) =>
      c.parent === grid &&
      (c.kind === 'leaf' || c.kind === 'blank' || c.kind === 'grid'),
  );
  const seen = new Set<string>();
  for (const c of inside)
    for (let r = c.row; r < c.row + c.rows; r++)
      for (let k = c.column; k < c.column + c.columns; k++) {
        const key = `${k},${r}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
  return seen.size === box.columns * box.rows;
};

describe('packing', () => {
  it('auto-places in reading order, first fit', () => {
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
  it('honours a named cell and flows the rest round it', () => {
    const { places } = packGrid(
      [
        [2, 1],
        [2, 1],
      ],
      4,
      [undefined, [0, 0]],
    );
    expect(places).toEqual([
      [2, 0],
      [0, 0],
    ]);
  });
});

describe('blanking plates', () => {
  it('cover every free cell with as few plates as a sweep finds', () => {
    expect(blanksFor([[0, 0, 9, 2]], 14, 4)).toEqual([
      [9, 0, 5, 4],
      [0, 2, 9, 2],
    ]);
    expect(blanksFor([[0, 0, 4, 1]], 4, 1)).toEqual([]);
  });
  it('are never wider than the widest made', () => {
    expect(blanksFor([], 10, 1, 4)).toEqual([
      [0, 0, 4, 1],
      [4, 0, 4, 1],
      [8, 0, 2, 1],
    ]);
  });
});

describe('the rack grid', () => {
  it('fits a dense grid to the block that wastes least', () => {
    const root: Grid<string, string> = {
      grid: 'g',
      children: [leaf('pot', 9, 2), leaf('sel', 5, 1), leaf('btn', 4, 1)],
    };
    // 9 x 3 fills every cell; 14 x 2 would leave one spare.
    expect(layoutGrid(root, UNIT).columns).toBe(9);
  });
  it('places a fixed-width grid in cells and in metres', () => {
    const root: Grid<string, string> = {
      grid: 'g',
      columns: 14,
      children: [leaf('pot', 9, 2), leaf('sel', 5, 1), leaf('btn', 4, 1)],
    };
    const { columns, rows, cells } = layoutGrid(root, UNIT);
    expect([columns, rows]).toEqual([14, 2]);
    const btn = leaves(cells).find((c) => c.item === 'btn')!;
    expect(btn.column).toBe(9);
    expect(btn.row).toBe(1);
    expect(btn.x).toBeCloseTo(9 * 0.024, 9);
    expect(btn.y).toBeCloseTo(0.084, 9);
    expect(btn.w).toBeCloseTo(4 * 0.024 - 0.004, 9);
  });
  it('nests grids, shelves them and stretches each to its shelf', () => {
    const root: Grid<string, string> = {
      grid: 'panel',
      flow: 'shelf',
      gap: 1,
      stretch: true,
      justify: 'center',
      band: 0.01,
      children: [
        {
          grid: 'tall',
          blank: true,
          children: [
            leaf('a', 4, 1),
            leaf('b', 4, 1),
            leaf('c', 4, 1),
            leaf('d', 4, 1),
          ],
        },
        { grid: 'short', blank: true, children: [leaf('e', 9, 2)] },
      ],
    };
    const { cells } = layoutGrid(root, UNIT, { maxColumns: 30 });
    const tall = cells.find((c) => c.grid === 'tall')!;
    const short = cells.find((c) => c.grid === 'short')!;
    expect(tall.rows).toBe(short.rows);
    expect(short.column).toBe(tall.column + tall.columns + 1);
    expect(short.y).toBeCloseTo(0.01, 9);
    for (const g of ['tall', 'short']) expect(covered(cells, g)).toBe(true);
  });
  it('wraps shelves within the room given', () => {
    const root: Grid<string, string> = {
      grid: 'panel',
      flow: 'shelf',
      gap: 1,
      children: [leaf('a', 6, 1), leaf('b', 6, 1), leaf('c', 6, 1)],
    };
    const { columns, rows } = layoutGrid(root, UNIT, { maxColumns: 13 });
    expect(columns).toBe(13);
    expect(rows).toBe(2);
  });
});
