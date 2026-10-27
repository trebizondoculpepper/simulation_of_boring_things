import type { PanelItem, PanelZone } from './settings-panel';

/**
 * The settings panel's layout (mission 096; the owner, 2026-10-27): one
 * big instrument panel into which small modules are bolted, as an
 * aircraft's are, each its own plate with a fastener at each corner, its
 * own engraved title, and one setting's controls, sized to what it holds.
 * Modules are grouped by function under an engraved heading; the groups
 * are packed into shelves across the panel, each shelf centred, so sizes
 * vary as a real panel's do. The panel's width is given (it follows the
 * screen); its height is what the modules need, and the view scrolls it.
 * All in metres, x to the right from the panel's left edge, y down from
 * its top edge. Pure.
 */

/** Each kind of module's size, metres, width by height. */
export const MODULE_SIZE: Record<
  Exclude<PanelItem['kind'], 'card'>,
  [number, number]
> = {
  // A knob, its moving-coil meter and a seven-segment readout.
  pot: [0.2, 0.14],
  push: [0.08, 0.085],
  latch: [0.08, 0.085],
  key: [0.08, 0.085],
  // A lever selector with its positions engraved round it.
  selector: [0.12, 0.095],
  vfd: [0.16, 0.055],
};

/** The panel's margins, the gaps between modules and groups, and its bands. */
export const SPACING = {
  margin: 0.02,
  gap: 0.008,
  groupGap: 0.014,
  groupPad: 0.008,
  heading: 0.02,
  /** The band across the top: the panel's title plate and Penfold's mark. */
  header: 0.06,
  /** The band across the foot: the rating plate. */
  footer: 0.05,
  /** A module's title plate, along its top. */
  title: 0.013,
} as const;

/** The instruction card's line pitch and its border, metres. */
export const CARD = { line: 0.0072, pad: 0.012, width: 0.3 } as const;

export interface ModuleBox {
  zone: string;
  item: PanelItem;
  /** Its engraved title. */
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GroupBox {
  zone: PanelZone;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PanelLayout {
  width: number;
  height: number;
  groups: GroupBox[];
  modules: ModuleBox[];
}

/** A module's title. */
export const moduleTitle = (item: PanelItem) =>
  'legend' in item ? item.legend : 'STATUS';

/** How many characters a title plate `width` wide holds legibly. */
export const titleBudget = (width: number) =>
  Math.floor(((width - 0.016) * 0.86) / 0.0034);

/** A module's size; the card's from its lines and the room it has. */
function moduleSize(
  item: PanelItem,
  inner: number,
  cardLines: number,
): [number, number] {
  if (item.kind !== 'card') return MODULE_SIZE[item.kind];
  const w = Math.min(CARD.width, inner - 2 * SPACING.groupPad);
  // A narrow card prints each binding on two lines.
  const lines = w < 0.26 ? cardLines * 2 : cardLines;
  return [w, SPACING.title + 2 * CARD.pad + lines * CARD.line];
}

/** Lay out the panel's zones `width` wide, the card holding `cardLines` lines. */
export function layoutPanel(
  zones: readonly PanelZone[],
  width: number,
  { cardLines = 20 } = {},
): PanelLayout {
  const { margin, gap, groupGap, groupPad, heading, header, footer } = SPACING;
  const inner = width - 2 * margin;
  // Each group: its modules in rows, wrapping where the panel ends.
  const built = zones.map((zone) => {
    const boxes: Omit<ModuleBox, 'zone'>[] = [];
    let x = 0;
    let y = 0;
    let rowH = 0;
    let w = 0;
    for (const item of zone.items) {
      const [mw, mh] = moduleSize(item, inner, cardLines);
      if (x > 0 && x + mw > inner - 2 * groupPad) {
        x = 0;
        y += rowH + gap;
        rowH = 0;
      }
      boxes.push({ item, title: moduleTitle(item), x, y, w: mw, h: mh });
      x += mw + gap;
      rowH = Math.max(rowH, mh);
      w = Math.max(w, x - gap);
    }
    return {
      zone,
      boxes,
      w: w + 2 * groupPad,
      h: heading + y + rowH + 2 * groupPad,
    };
  });
  // The groups, packed into shelves across the panel, each shelf centred.
  const shelves: (typeof built)[] = [];
  for (const group of built) {
    const shelf = shelves.at(-1);
    const used = shelf
      ? shelf.reduce((sum, g) => sum + g.w, 0) + shelf.length * groupGap
      : Infinity;
    if (shelf && used + group.w <= inner) shelf.push(group);
    else shelves.push([group]);
  }
  const groups: GroupBox[] = [];
  const modules: ModuleBox[] = [];
  let y = margin + header;
  for (const shelf of shelves) {
    const span =
      shelf.reduce((sum, g) => sum + g.w, 0) + (shelf.length - 1) * groupGap;
    let x = margin + Math.max(0, (inner - span) / 2);
    const shelfH = Math.max(...shelf.map((g) => g.h));
    for (const group of shelf) {
      groups.push({ zone: group.zone, x, y, w: group.w, h: shelfH });
      for (const box of group.boxes)
        modules.push({
          ...box,
          zone: group.zone.id,
          x: x + groupPad + box.x,
          y: y + heading + groupPad + box.y,
        });
      x += group.w + groupGap;
    }
    y += shelfH + groupGap;
  }
  return {
    width,
    height: y - groupGap + footer + margin,
    groups,
    modules,
  };
}

/** Every title that overflows its plate, for a test to catch. */
export function overflowingTitles(layout: PanelLayout): string[] {
  return [
    ...layout.modules
      .filter((m) => m.title.length > titleBudget(m.w))
      .map((m) => m.title),
    ...layout.groups
      .filter((g) => g.zone.title.length > titleBudget(g.w))
      .map((g) => g.zone.title),
  ];
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
