import type { PanelItem, PanelZone } from './settings-panel';
import { layoutGrid } from './rack-grid';
import type { Grid, RackUnit } from './rack-grid';

/**
 * The settings panel's layout (mission 096; the owner, 2026-10-27), declared
 * on the rack grid (`rack-grid.ts`): the panel is one continuous field of
 * plates, a shelf-flow grid of groups (GAME, PICTURE, …) set edge to edge,
 * each shelf's groups stretched to its height; each group is a dense-flow
 * sub-grid of modules, each module a whole number of rack units
 * (`MODULE_UNITS`); every cell a group leaves empty, and the end of every
 * shelf short of the widest, is blanked off, so every row runs full width. The width given (it follows the screen) is the most the
 * panel may take; it is cut to its widest shelf. In metres, x to the right
 * from the panel's left edge, y down from its top edge. Pure.
 */

/**
 * The rack's unit: a column's width and a row's height. No gutter: the
 * plates butt edge to edge, as avionics units do (the owner, 2026-10-27:
 * "there are no arbitrary gaps in an avionics panel"); the drawing leaves
 * only a hairline seam where two plates meet.
 */
export const RACK: RackUnit = { column: 0.02, row: 0.085, gutter: 0 };
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
  pot: [11, 2],
  push: [5, 1],
  latch: [5, 1],
  key: [5, 1],
  // A lever selector with its positions printed round it.
  selector: [6, 1],
  // A rotary switch, its LCD under it.
  switch: [6, 2],
  vfd: [8, 1],
};

/** The panel's margins and bands, metres. */
export const SPACING = {
  margin: 0.02,
  /** The band above each shelf, for its groups' legends (none: plates butt). */
  legend: 0,
  /** Between one shelf and the next band. */
  shelfGap: 0,
  /**
   * The bands across the top and foot: none (the owner, 2026-10-28: the
   * name plate and the rating plate gone, so more fits on the screen);
   * Penfold's mark sits in the top margin.
   */
  header: 0,
  footer: 0,
  /** A module's title plate, along its top. */
  title: 0.012,
} as const;

/** The instruction card: its columns, line pitch and border. */
export const CARD = { columns: 16, line: 0.0072, pad: 0.01 } as const;

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

/** A blanking plate: plain metal, screwed into a rack place left empty. */
export type BlankBox = Omit<ModuleBox, 'item' | 'title'>;

/** The widest blanking plate made, in columns (the knob module's width). */
export const BLANK_MAX_COLUMNS = 11;

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
  /** The blanking plates filling every rack place no module takes. */
  blanks: BlankBox[];
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

/** The settings panel as a grid: what is on it, and how it is laid out. */
export function panelGrid(
  zones: readonly PanelZone[],
  room: number,
  cardLines: number,
): Grid<PanelItem, PanelZone | null> {
  return {
    grid: null,
    flow: 'shelf',
    gap: 0,
    band: SPACING.legend,
    shelfGap: SPACING.shelfGap,
    justify: 'start',
    // Fitted to waste least, but no narrower than three fifths of the room,
    // so the panel stays wider than tall on a wide screen.
    minColumns: Math.floor(room * 0.6),
    // Every rack position filled: what the groups leave at a shelf's end is blanked off too.
    blank: true,
    stretch: true,
    columns: undefined,
    children: zones.map((zone) => ({
      grid: zone,
      flow: 'dense',
      blank: true,
      children: zone.items.map((item) => ({
        item,
        span:
          item.kind === 'card'
            ? cardUnits(cardLines, room)
            : MODULE_UNITS[item.kind],
      })),
    })),
  };
}

/** Lay out the panel's zones at most `width` wide, the card holding `cardLines` lines. */
export function layoutPanel(
  zones: readonly PanelZone[],
  width: number,
  { cardLines = 20 } = {},
): PanelLayout {
  const { margin, legend, header, footer } = SPACING;
  const room = Math.max(
    1,
    Math.floor((width - 2 * margin + RACK.gutter) / PITCH.x),
  );
  const laid = layoutGrid(panelGrid(zones, room, cardLines), RACK, {
    maxColumns: room,
    widestBlank: BLANK_MAX_COLUMNS,
  });
  // The panel is as wide as its widest shelf: no bare frame at the sides.
  const left = margin;
  const top = margin + header;
  const zoneOf = (g: PanelZone | null | undefined) => g?.id ?? '';
  const groups: GroupBox[] = [];
  const modules: ModuleBox[] = [];
  const blanks: BlankBox[] = [];
  for (const cell of laid.cells) {
    const at = {
      column: cell.column,
      row: cell.row,
      columns: cell.columns,
      rows: cell.rows,
      x: left + cell.x,
      y: top + cell.y,
      w: cell.w,
      h: cell.h,
    };
    if (cell.kind === 'grid' && cell.grid)
      groups.push({ zone: cell.grid, ...at, legendY: at.y - legend / 2 });
    else if (cell.kind === 'leaf' && cell.item)
      modules.push({
        zone: zoneOf(cell.parent),
        item: cell.item,
        title: moduleTitle(cell.item),
        ...at,
      });
    else if (cell.kind === 'blank')
      blanks.push({ zone: zoneOf(cell.parent), ...at });
  }
  return {
    width: spanX(laid.columns) + 2 * margin,
    height: top + laid.height + footer + margin,
    columns: laid.columns,
    left,
    groups,
    modules,
    blanks,
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
