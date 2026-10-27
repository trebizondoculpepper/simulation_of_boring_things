import type { PanelItem, PanelZone } from './settings-panel';

/**
 * The settings panel's layout (mission 096; the owner, 2026-10-27): a rack
 * into which modules are bolted, as an aircraft's instrument panel is.
 * Every module is a whole number of rack units wide and tall (columns and
 * rows of one pitch, one gutter between plates), so edges line up across
 * the whole panel, rows are of equal height and columns run on from group
 * to group. Each function's modules (GAME, PICTURE, …) are packed into the
 * smallest block of the grid they fill best; the blocks are set in shelves
 * across the panel, one empty column between them, each shelf centred on
 * whole columns, under a band for the groups' legends. The width given
 * (it follows the screen) is the most the panel may take; it is then cut
 * to its widest shelf, and its height is what the shelves need.
 * In metres, x to the right from the panel's left edge, y down from its
 * top edge. Pure.
 */

/** The rack's unit: a column's width and a row's height, and the gutter between plates. */
export const RACK = { column: 0.02, row: 0.085, gutter: 0.004 } as const;
/** From one column, or one row, to the next. */
export const PITCH = {
  x: RACK.column + RACK.gutter,
  y: RACK.row + RACK.gutter,
} as const;

/** Each kind of module's size in rack units: columns by rows. */
export const MODULE_UNITS: Record<
  Exclude<PanelItem['kind'], 'card'>,
  [number, number]
> = {
  // A knob on its dial, its moving-coil meter and a seven-segment readout.
  pot: [9, 2],
  push: [4, 1],
  latch: [4, 1],
  key: [4, 1],
  // A lever selector with its positions printed round it.
  selector: [5, 1],
  vfd: [7, 1],
};

/** The panel's margins and bands, metres. */
export const SPACING = {
  margin: 0.02,
  /** The band above each shelf, for its groups' legends. */
  legend: 0.016,
  /** Between one shelf and the next band. */
  shelfGap: 0.006,
  /** The band across the top: the panel's name plate and Penfold's mark. */
  header: 0.05,
  /** The band across the foot: the rating plate. */
  footer: 0.05,
  /** A module's title plate, along its top. */
  title: 0.012,
} as const;

/** The instruction card: its columns, line pitch and border. */
export const CARD = { columns: 13, line: 0.0072, pad: 0.01 } as const;

/** A span of whole units' size, metres: n units less the last gutter. */
export const spanX = (columns: number) => columns * PITCH.x - RACK.gutter;
export const spanY = (rows: number) => rows * PITCH.y - RACK.gutter;

export interface ModuleBox {
  zone: string;
  item: PanelItem;
  /** Its engraved title. */
  title: string;
  /** Its place and size on the rack grid. */
  column: number;
  row: number;
  columns: number;
  rows: number;
  /** And in metres. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GroupBox {
  zone: PanelZone;
  column: number;
  row: number;
  columns: number;
  rows: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Where its legend is printed on the frame, above it. */
  legendY: number;
}

export interface PanelLayout {
  width: number;
  height: number;
  /** The rack's columns across the panel, and where the first begins. */
  columns: number;
  left: number;
  groups: GroupBox[];
  modules: ModuleBox[];
}

/** A module's title. */
export const moduleTitle = (item: PanelItem) =>
  'legend' in item ? item.legend : 'STATUS';

/** How many characters a title plate `width` wide holds legibly. */
export const titleBudget = (width: number) =>
  Math.floor(((width - 0.014) * 0.86) / 0.0034);

/** The card's units, from its lines and the columns it may have. */
function cardUnits(lines: number, columns: number): [number, number] {
  const cols = Math.min(CARD.columns, columns);
  const narrow = cols < CARD.columns;
  const h =
    SPACING.title + 0.008 + 2 * CARD.pad + (narrow ? 2 : 1) * lines * CARD.line;
  return [cols, Math.ceil((h + RACK.gutter) / PITCH.y)];
}

/** Whether a card this many columns wide prints each binding on two lines. */
export const narrowCard = (columns: number) => columns < CARD.columns;

/**
 * Pack sizes into a grid `width` columns wide, first fit, row by row:
 * each at the first place it fits, scanning rows from the top and each
 * row from the left. Returns their places and the rows used.
 */
export function packGrid(
  sizes: readonly [number, number][],
  width: number,
): { places: [number, number][]; rows: number } {
  const taken: boolean[][] = [];
  const free = (c: number, r: number, w: number, h: number) => {
    if (c + w > width) return false;
    for (let y = r; y < r + h; y++)
      for (let x = c; x < c + w; x++) if (taken[y]?.[x]) return false;
    return true;
  };
  const places: [number, number][] = [];
  let rows = 0;
  for (const [w, h] of sizes) {
    let at: [number, number] | null = null;
    for (let r = 0; !at; r++)
      for (let c = 0; c + w <= width && !at; c++)
        if (free(c, r, w, h)) at = [c, r];
    const [c, r] = at!;
    for (let y = r; y < r + h; y++) {
      taken[y] ??= [];
      for (let x = c; x < c + w; x++) taken[y][x] = true;
    }
    places.push([c, r]);
    rows = Math.max(rows, r + h);
  }
  return { places, rows };
}

/** Lay out the panel's zones `width` wide, the card holding `cardLines` lines. */
export function layoutPanel(
  zones: readonly PanelZone[],
  width: number,
  { cardLines = 20 } = {},
): PanelLayout {
  const { margin, legend, shelfGap, header, footer } = SPACING;
  const room = Math.max(
    1,
    Math.floor((width - 2 * margin + RACK.gutter) / PITCH.x),
  );
  // Each group's packings, from its narrowest block to one row.
  const blocks = zones.map((zone) => {
    const sizes = zone.items.map((item) =>
      item.kind === 'card'
        ? cardUnits(cardLines, room)
        : MODULE_UNITS[item.kind],
    );
    const widest = Math.max(...sizes.map(([w]) => w));
    const all = sizes.reduce((sum, [w]) => sum + w, 0);
    const packings: {
      cols: number;
      places: [number, number][];
      rows: number;
    }[] = [];
    for (
      let cols = widest;
      cols <= Math.max(widest, Math.min(room, all));
      cols++
    ) {
      const { places, rows } = packGrid(sizes, cols);
      const used = Math.max(...places.map(([c], i) => c + sizes[i][0]));
      packings.push({ cols: used, places, rows });
    }
    // At first, the block that wastes least.
    const best = packings.reduce((a, b) =>
      b.cols * b.rows < a.cols * a.rows ? b : a,
    );
    return { zone, sizes, packings, ...best };
  });
  // The blocks in shelves, one empty column apart, each shelf centred.
  const shelves: (typeof blocks)[] = [];
  for (const block of blocks) {
    const shelf = shelves.at(-1);
    const used = shelf
      ? shelf.reduce((sum, b) => sum + b.cols + 1, 0)
      : Infinity;
    if (shelf && used + block.cols <= room) shelf.push(block);
    else shelves.push([block]);
  }
  // Then every block in a shelf as narrow as it can be within the shelf's
  // height, so the shelf is filled and its blocks are of a height.
  for (const shelf of shelves) {
    const height = Math.max(...shelf.map((b) => b.rows));
    for (const block of shelf) {
      const fits = block.packings.filter((p) => p.rows <= height);
      const narrowest = fits.reduce((a, b) => (b.cols < a.cols ? b : a));
      Object.assign(block, narrowest);
    }
  }
  // The panel is as wide as its widest shelf: no bare frame at the sides.
  const spanOf = (shelf: (typeof blocks)[number][]) =>
    shelf.reduce((sum, b) => sum + b.cols, 0) + shelf.length - 1;
  const columns = Math.max(...shelves.map(spanOf));
  width = spanX(columns) + 2 * margin;
  const left = margin;
  const groups: GroupBox[] = [];
  const modules: ModuleBox[] = [];
  let y = margin + header;
  let row = 0;
  for (const shelf of shelves) {
    const span = spanOf(shelf);
    let column = Math.max(0, Math.floor((columns - span) / 2));
    const rows = Math.max(...shelf.map((b) => b.rows));
    const top = y + legend;
    for (const block of shelf) {
      const x = left + column * PITCH.x;
      groups.push({
        zone: block.zone,
        column,
        row,
        columns: block.cols,
        rows: block.rows,
        x,
        y: top,
        w: spanX(block.cols),
        h: spanY(block.rows),
        legendY: y + legend / 2,
      });
      block.zone.items.forEach((item, i) => {
        const [c, r] = block.places[i];
        const [w, h] = block.sizes[i];
        modules.push({
          zone: block.zone.id,
          item,
          title: moduleTitle(item),
          column: column + c,
          row: row + r,
          columns: w,
          rows: h,
          x: left + (column + c) * PITCH.x,
          y: top + r * PITCH.y,
          w: spanX(w),
          h: spanY(h),
        });
      });
      column += block.cols + 1;
    }
    y = top + spanY(rows) + shelfGap;
    row += rows;
  }
  return {
    width,
    height: y - shelfGap + footer + margin,
    columns,
    left,
    groups,
    modules,
  };
}

/** Every title that overflows its plate, for a test to catch. */
export function overflowingTitles(layout: PanelLayout): string[] {
  return layout.modules
    .filter((m) => m.title.length > titleBudget(m.w))
    .map((m) => m.title);
}

/** Whether two boxes overlap (for a test: no module may sit on another). */
export const overlaps = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) =>
  a.x < b.x + b.w - 1e-9 &&
  b.x < a.x + a.w - 1e-9 &&
  a.y < b.y + b.h - 1e-9 &&
  b.y < a.y + a.h - 1e-9;
