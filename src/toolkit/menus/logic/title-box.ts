import { layoutGrid } from './rack-grid';
import type { Grid, Placed, RackUnit } from './rack-grid';

/**
 * The title's menu as a Penfold box (mission 096, stage 2; the owner,
 * 2026-10-28: "a single panel with four buttons, and a text legend to the
 * right of each … in the bottom left of the screen"): one machined plate,
 * its four illuminated push buttons in a column, each with its engraved
 * legend to its right, laid out on the rack grid. NEW GAME asks to be
 * pressed again when there is a save it would overwrite; CONTINUE is lit
 * when there is a save to continue and refuses when there is none. Pure.
 */

export type TitleAction =
  | 'newGame'
  | 'continueGame'
  | 'settings'
  | 'instructions';

export interface TitleOption {
  id: TitleAction;
  legend: string;
  /** Its button's cap. */
  colour: 'green' | 'white' | 'blue' | 'amber' | 'black' | 'red' | 'yellow';
}

export const TITLE_OPTIONS: readonly TitleOption[] = [
  { id: 'newGame', legend: 'NEW GAME', colour: 'green' },
  { id: 'continueGame', legend: 'CONTINUE', colour: 'amber' },
  { id: 'settings', legend: 'SETTINGS', colour: 'white' },
  { id: 'instructions', legend: 'INSTRUCTIONS', colour: 'blue' },
];

/** A cell of the box: a button, or the legend beside it. */
export type TitleCell =
  | { kind: 'button'; option: TitleOption }
  | { kind: 'legend'; option: TitleOption };

/** The box's rack: narrow columns, short rows (one row a button and its legend). */
export const TITLE_UNIT: RackUnit = { column: 0.02, row: 0.046, gutter: 0 };
/** A button's cell and a legend's, in columns. */
export const TITLE_SPANS = { button: 3, legend: 8 } as const;
/** The plate's border round the grid, metres. */
export const TITLE_MARGIN = 0.012;

/** The box declared on the rack grid: each row a button, then its legend. */
export function titleGrid(): Grid<TitleCell, 'box'> {
  return {
    grid: 'box',
    columns: TITLE_SPANS.button + TITLE_SPANS.legend,
    children: TITLE_OPTIONS.flatMap((option) => [
      {
        item: { kind: 'button' as const, option },
        span: [TITLE_SPANS.button, 1] as const,
      },
      {
        item: { kind: 'legend' as const, option },
        span: [TITLE_SPANS.legend, 1] as const,
      },
    ]),
  };
}

export interface TitleBoxLayout {
  width: number;
  height: number;
  cells: Placed<TitleCell, 'box'>[];
}

/** The box laid out: the plate's size, and each cell in metres from its top left. */
export function layoutTitleBox(): TitleBoxLayout {
  const laid = layoutGrid(titleGrid(), TITLE_UNIT);
  const cells = laid.cells
    .filter((c) => c.kind === 'leaf')
    .map((c) => ({ ...c, x: c.x + TITLE_MARGIN, y: c.y + TITLE_MARGIN }));
  return {
    width: laid.columns * TITLE_UNIT.column + 2 * TITLE_MARGIN,
    height: laid.height + 2 * TITLE_MARGIN,
    cells,
  };
}

/** What a press of an option does now: act, ask again first, or refuse. */
export function titlePress(
  id: TitleAction,
  { saved, armed }: { saved: boolean; armed: boolean },
): 'act' | 'arm' | 'refuse' {
  if (id === 'continueGame') return saved ? 'act' : 'refuse';
  if (id === 'newGame' && saved && !armed) return 'arm';
  return 'act';
}
