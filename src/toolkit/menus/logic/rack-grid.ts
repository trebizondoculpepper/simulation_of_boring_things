/**
 * A grid layout for panels made of sheet metal (mission 096; the owner,
 * 2026-10-27: "can we do this on a grid, the same way typical component
 * layout systems work? … The only difference is our grid is sometimes
 * going to be visible"). It works as a UI toolkit's grid does, in rack
 * units rather than pixels:
 *
 * - A **grid** has columns and rows of one unit (`RackUnit`: a column's
 *   width, a row's height, the gutter between plates). Its children are
 *   **leaves** (a module: a span of columns × rows, with what it holds)
 *   or **grids** themselves (a group: a cell holding a sub-grid), nested
 *   to any depth.
 * - A child may name its cell (`at`); the rest are **auto-placed** in
 *   reading order. `dense` flow puts each in the first place it fits,
 *   scanning rows from the top and each row from the left (CSS Grid's
 *   `grid-auto-flow: row dense`); `shelf` flow sets them side by side,
 *   wrapping into shelves as a flex row does, `gap` empty columns apart,
 *   each shelf `justify`-ed and, with `stretch`, every sub-grid on a shelf
 *   given the shelf's height (narrowed as far as its children allow).
 * - A grid's width is `columns` if given, else **fitted**: the narrowest
 *   that wastes least, within the room its parent gives (`maxColumns`).
 * - Where a grid asks for `blank`, every cell its children leave empty is
 *   covered by **blanking plates**, as an aircraft's panel is where a unit
 *   is missing or not fitted, as few plates as a sweep finds.
 *
 * The result is a flat list of placed cells (grids, leaves and blanks),
 * each in cells and in metres from the root's top left corner, y down,
 * for a renderer to turn each into a plate with its part. Pure.
 */

/** A rack's unit: a column's width, a row's height, the gutter between plates, metres. */
export interface RackUnit {
  column: number;
  row: number;
  gutter: number;
}

/** A module: what it holds, how many columns and rows it spans, and its cell, if named. */
export interface GridLeaf<T> {
  item: T;
  span: readonly [number, number];
  at?: readonly [number, number];
}

/** A grid, or a group within one: its children and how they are laid out. */
export interface Grid<T, G> {
  /** What the grid is (a group's name and legend), carried to its placed cell. */
  grid: G;
  children: readonly GridNode<T, G>[];
  /** Its width in columns; fitted if not given. */
  columns?: number;
  /** The fewest rows it has. */
  rows?: number;
  at?: readonly [number, number];
  flow?: 'dense' | 'shelf';
  /** Shelf flow: empty columns between children. */
  gap?: number;
  /** Shelf flow: a band above each shelf, metres (for legends on the frame). */
  band?: number;
  /** Shelf flow: metres between one shelf and the next band. */
  shelfGap?: number;
  /** Shelf flow: where each shelf sits across the grid. */
  justify?: 'start' | 'center';
  /** Shelf flow: every sub-grid on a shelf as tall as the shelf. */
  stretch?: boolean;
  /** Cover the cells its children leave empty with blanking plates. */
  blank?: boolean;
}

export type GridNode<T, G> = GridLeaf<T> | Grid<T, G>;

/** A placed cell: a grid, a leaf, or a blanking plate. */
export interface Placed<T, G> {
  kind: 'grid' | 'leaf' | 'blank';
  /** The leaf's item, or the grid's own `grid`. */
  item?: T;
  grid?: G;
  /** The grid it is in (none for the root). */
  parent?: G;
  depth: number;
  column: number;
  row: number;
  columns: number;
  rows: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const isGrid = <T, G>(node: GridNode<T, G>): node is Grid<T, G> =>
  'children' in node;

/** A span of whole units, metres: n units less the last gutter. */
export const spanOf = (unit: RackUnit, columns: number, rows: number) => ({
  w: columns * (unit.column + unit.gutter) - unit.gutter,
  h: rows * (unit.row + unit.gutter) - unit.gutter,
});

/**
 * Pack sizes into a grid `width` columns wide: those with a cell named
 * there first, then the rest first fit, row by row (each at the first
 * place it fits, scanning rows from the top and each row from the left).
 * Returns their places and the rows used.
 */
export function packGrid(
  sizes: readonly (readonly [number, number])[],
  width: number,
  fixed: readonly (readonly [number, number] | undefined)[] = [],
): { places: [number, number][]; rows: number } {
  const taken: boolean[][] = [];
  const free = (c: number, r: number, w: number, h: number) => {
    if (c < 0 || c + w > width) return false;
    for (let y = r; y < r + h; y++)
      for (let x = c; x < c + w; x++) if (taken[y]?.[x]) return false;
    return true;
  };
  const take = (c: number, r: number, w: number, h: number) => {
    for (let y = r; y < r + h; y++) {
      taken[y] ??= [];
      for (let x = c; x < c + w; x++) taken[y][x] = true;
    }
  };
  const places: [number, number][] = [];
  let rows = 0;
  sizes.forEach(([w, h], i) => {
    const at = fixed[i];
    if (!at) return;
    take(at[0], at[1], w, h);
    places[i] = [at[0], at[1]];
    rows = Math.max(rows, at[1] + h);
  });
  sizes.forEach(([w, h], i) => {
    if (fixed[i]) return;
    let at: [number, number] | null = null;
    for (let r = 0; !at; r++)
      for (let c = 0; c + w <= width && !at; c++)
        if (free(c, r, w, h)) at = [c, r];
    take(at![0], at![1], w, h);
    places[i] = at!;
    rows = Math.max(rows, at![1] + h);
  });
  return { places, rows };
}

/**
 * Blanking plates for a block `columns` by `rows` holding the given cells
 * (column, row, columns, rows each): every free cell covered exactly.
 * Scanning row by row from the top left, each free cell starts a plate as
 * wide as the free run there (up to `widest`), carried down while the
 * rows below are free for its whole width.
 */
export function blanksFor(
  taken: readonly (readonly [number, number, number, number])[],
  columns: number,
  rows: number,
  widest = Infinity,
): [number, number, number, number][] {
  const used = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => false),
  );
  for (const [c, r, w, h] of taken)
    for (let y = Math.max(0, r); y < Math.min(rows, r + h); y++)
      for (let x = Math.max(0, c); x < Math.min(columns, c + w); x++)
        used[y][x] = true;
  const plates: [number, number, number, number][] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < columns; c++) {
      if (used[r][c]) continue;
      let w = 0;
      while (c + w < columns && !used[r][c + w] && w < widest) w++;
      let h = 1;
      while (r + h < rows && used[r + h].slice(c, c + w).every((u) => !u)) h++;
      for (let y = r; y < r + h; y++)
        for (let x = c; x < c + w; x++) used[y][x] = true;
      plates.push([c, r, w, h]);
    }
  return plates;
}

/** A way to lay a node out: its size, and how to place it. */
interface Plan<T, G> {
  columns: number;
  rows: number;
  /** Its height, metres (more than its rows' where shelves have bands). */
  height: number;
  place(
    out: Placed<T, G>[],
    column: number,
    row: number,
    x: number,
    y: number,
    parent: G | undefined,
    depth: number,
  ): void;
}

/** The options for laying out a grid, the first its default (least waste). */
function plans<T, G>(
  node: GridNode<T, G>,
  unit: RackUnit,
  maxColumns: number,
  minRows: number,
  widestBlank: number,
): Plan<T, G>[] {
  const pitchX = unit.column + unit.gutter;
  const pitchY = unit.row + unit.gutter;
  if (!isGrid(node)) {
    const [columns, rows] = node.span;
    const { w, h } = spanOf(unit, columns, rows);
    return [
      {
        columns,
        rows,
        height: h,
        place(out, column, row, x, y, parent, depth) {
          out.push({
            kind: 'leaf',
            item: node.item,
            parent,
            depth,
            column,
            row,
            columns,
            rows,
            x,
            y,
            w,
            h,
          });
        },
      },
    ];
  }
  const fewest = Math.max(minRows, node.rows ?? 0);
  // The grid's own cell, and the blanks in what its children leave.
  const frame = (
    out: Placed<T, G>[],
    plan: { columns: number; rows: number; height: number },
    at: [number, number, number, number],
    parent: G | undefined,
    depth: number,
    cells: [number, number, number, number][],
  ) => {
    const [column, row, x, y] = at;
    out.push({
      kind: 'grid',
      grid: node.grid,
      parent,
      depth,
      column,
      row,
      columns: plan.columns,
      rows: plan.rows,
      x,
      y,
      w: spanOf(unit, plan.columns, plan.rows).w,
      h: plan.height,
    });
    if (node.blank)
      for (const [c, r, w, h] of blanksFor(
        cells,
        plan.columns,
        plan.rows,
        widestBlank,
      ))
        out.push({
          kind: 'blank',
          parent: node.grid,
          depth: depth + 1,
          column: column + c,
          row: row + r,
          columns: w,
          rows: h,
          x: x + c * pitchX,
          y: y + r * pitchY,
          ...spanOf(unit, w, h),
        });
  };

  if (node.flow === 'shelf') {
    const gap = node.gap ?? 0;
    const band = node.band ?? 0;
    const shelfGap = node.shelfGap ?? 0;
    const room = node.columns ?? maxColumns;
    let chosen = node.children.map(
      (child) => plans(child, unit, room, 0, widestBlank)[0],
    );
    // Shelves, as a flex row wraps.
    const shelves: number[][] = [];
    chosen.forEach((plan, i) => {
      const shelf = shelves.at(-1);
      const used = shelf
        ? shelf.reduce((n, j) => n + chosen[j].columns + gap, 0)
        : Infinity;
      if (shelf && used + plan.columns <= room) shelf.push(i);
      else shelves.push([i]);
    });
    const heights = shelves.map((shelf) =>
      Math.max(...shelf.map((i) => chosen[i].rows)),
    );
    if (node.stretch) {
      chosen = chosen.map((plan, i) => {
        const child = node.children[i];
        if (!isGrid(child)) return plan;
        const height = heights[shelves.findIndex((s) => s.includes(i))];
        // The narrowest way it fits the shelf's height, then made that tall.
        const fits = plans(child, unit, room, 0, widestBlank).filter(
          (p) => p.rows <= height,
        );
        const narrowest = fits.reduce((a, b) =>
          b.columns < a.columns ? b : a,
        );
        return (
          plans(child, unit, narrowest.columns, height, widestBlank).find(
            (p) => p.columns === narrowest.columns,
          ) ?? narrowest
        );
      });
    }
    const spans = shelves.map(
      (shelf) =>
        shelf.reduce((n, i) => n + chosen[i].columns, 0) +
        gap * (shelf.length - 1),
    );
    const columns = node.columns ?? Math.max(...spans);
    const rows = Math.max(
      fewest,
      heights.reduce((n, h) => n + h, 0),
    );
    const height =
      shelves.reduce((n, _, s) => n + band + spanOf(unit, 1, heights[s]).h, 0) +
      shelfGap * (shelves.length - 1);
    return [
      {
        columns,
        rows,
        height,
        place(out, column, row, x, y, parent, depth) {
          const cells: [number, number, number, number][] = [];
          const children: (() => void)[] = [];
          let r = 0;
          let top = y;
          shelves.forEach((shelf, s) => {
            let c =
              node.justify === 'center'
                ? Math.floor((columns - spans[s]) / 2)
                : 0;
            top += band;
            const shelfTop = top;
            const shelfRow = r;
            for (const i of shelf) {
              const plan = chosen[i];
              const cc = c;
              cells.push([cc, shelfRow, plan.columns, plan.rows]);
              children.push(() =>
                plan.place(
                  out,
                  column + cc,
                  row + shelfRow,
                  x + cc * pitchX,
                  shelfTop,
                  node.grid,
                  depth + 1,
                ),
              );
              c += plan.columns + gap;
            }
            top += spanOf(unit, 1, heights[s]).h + shelfGap;
            r += heights[s];
          });
          frame(
            out,
            { columns, rows, height },
            [column, row, x, y],
            parent,
            depth,
            node.blank ? cells : [],
          );
          for (const child of children) child();
        },
      },
    ];
  }

  // Dense flow: each width the children allow, least waste first.
  const childPlans = node.children.map(
    (child) => plans(child, unit, maxColumns, 0, widestBlank)[0],
  );
  const sizes = childPlans.map((p) => [p.columns, p.rows] as const);
  const fixed = node.children.map((child) => child.at);
  const widest = Math.max(
    1,
    ...sizes.map(([w], i) => w + (fixed[i]?.[0] ?? 0)),
  );
  const all = sizes.reduce((n, [w]) => n + w, 0);
  const widths = node.columns
    ? [node.columns]
    : Array.from(
        { length: Math.max(1, Math.min(maxColumns, all) - widest + 1) },
        (_, k) => widest + k,
      );
  const options = widths.map((width): Plan<T, G> => {
    const { places, rows: used } = packGrid(sizes, width, fixed);
    const columns = node.columns
      ? width
      : Math.max(...places.map(([c], i) => c + sizes[i][0]));
    const rows = Math.max(fewest, used);
    return {
      columns,
      rows,
      height: spanOf(unit, columns, rows).h,
      place(out, column, row, x, y, parent, depth) {
        frame(
          out,
          { columns, rows, height: spanOf(unit, columns, rows).h },
          [column, row, x, y],
          parent,
          depth,
          places.map(([c, r], i) => [c, r, sizes[i][0], sizes[i][1]]),
        );
        places.forEach(([c, r], i) =>
          childPlans[i].place(
            out,
            column + c,
            row + r,
            x + c * pitchX,
            y + r * pitchY,
            node.grid,
            depth + 1,
          ),
        );
      },
    };
  });
  // Least waste first (ties to the wider, fewer rows).
  return options.sort(
    (a, b) => a.columns * a.rows - b.columns * b.rows || a.rows - b.rows,
  );
}

/**
 * Lay out `root` within `maxColumns`: every grid, leaf and blanking plate
 * placed, in cells and in metres from the root's top left corner.
 */
export function layoutGrid<T, G>(
  root: Grid<T, G>,
  unit: RackUnit,
  { maxColumns = Infinity, widestBlank = Infinity } = {},
): { columns: number; rows: number; height: number; cells: Placed<T, G>[] } {
  const plan = plans(root, unit, maxColumns, 0, widestBlank)[0];
  const cells: Placed<T, G>[] = [];
  plan.place(cells, 0, 0, 0, 0, undefined, 0);
  return {
    columns: plan.columns,
    rows: plan.rows,
    height: plan.height,
    cells,
  };
}
