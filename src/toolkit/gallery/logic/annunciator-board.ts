/**
 * Where everything sits on a location annunciator's board
 * (`views/location-annunciator.ts`): its housing, title, windows, horn,
 * badges and its four buttons (ACCEPT, RESET, LAMP TEST, MUTE). Its
 * controls in a row under the windows (`'bottom'`, as every board has
 * them), or in a column in a margin on its left (`'left'`; the owner,
 * 2026-10-31, for PL1-CP3 beside the equipment doors, its controls nearest
 * the doorway, its windows the same). Metres, facing +z, the housing's
 * middle at the origin: left is −x, as one faces it. Pure.
 */

export type AnnunciatorControls = 'bottom' | 'left';

/** A window's width; its height is 0.7 of it. */
export const ANNUNCIATOR_CELL = 0.17;

export const ANNUNCIATOR_BUTTONS = [
  'ACCEPT',
  'RESET',
  'LAMP TEST',
  'MUTE',
] as const;
export type AnnunciatorButton = (typeof ANNUNCIATOR_BUTTONS)[number];

/** The housing's margin at each side of the windows; on the left, the wider margin that holds the controls. */
const SIDE = 0.09;
const CONTROL_MARGIN = 0.17;
/** The windows' top under the housing's, under the title. */
const UNDER_TITLE = 0.12;
/** The housing under the windows: the button row's, or just the badges'. */
const BUTTON_ROW = 0.23;
const BADGE_ROW = 0.08;
/** Between buttons: across in a row, down in a column. */
const ROW_PITCH = 0.18;
const COLUMN_PITCH = 0.12;

export interface AnnunciatorBoardLayout {
  /** The housing. */
  w: number;
  h: number;
  /** The windows' panel: its middle and size. */
  windows: { x: number; y: number; w: number; h: number };
  title: { x: number; y: number };
  horn: { x: number; y: number };
  /** The annunciator maker's badge, bottom left. */
  badge: { x: number; y: number };
  buttons: { legend: AnnunciatorButton; x: number; y: number }[];
  /** The middle of its buttons: where it is worked from. */
  controls: { x: number; y: number };
}

export function annunciatorBoardLayout(
  windows: number,
  columns: number,
  controls: AnnunciatorControls = 'bottom',
): AnnunciatorBoardLayout {
  const cell = ANNUNCIATOR_CELL;
  const rows = Math.ceil(windows / columns);
  const panelW = columns * cell + 0.012;
  const panelH = rows * cell * 0.7 + 0.012;
  const left = controls === 'left';
  const w = columns * cell + SIDE + (left ? CONTROL_MARGIN : SIDE);
  const h = rows * cell * 0.7 + UNDER_TITLE + (left ? BADGE_ROW : BUTTON_ROW);
  const windowsX = left ? (CONTROL_MARGIN - SIDE) / 2 : 0;
  const windowsY = h / 2 - UNDER_TITLE - panelH / 2;
  const buttons = ANNUNCIATOR_BUTTONS.map((legend, i) => {
    const k = i - (ANNUNCIATOR_BUTTONS.length - 1) / 2;
    return left
      ? // Down the left margin, beside the windows' middle.
        {
          legend,
          x: -w / 2 + CONTROL_MARGIN / 2,
          y: windowsY - k * COLUMN_PITCH,
        }
      : { legend, x: k * ROW_PITCH, y: -h / 2 + 0.085 };
  });
  const mean = (f: (b: { x: number; y: number }) => number) =>
    buttons.reduce((s, b) => s + f(b), 0) / buttons.length;
  return {
    w,
    h,
    windows: { x: windowsX, y: windowsY, w: panelW, h: panelH },
    title: { x: 0, y: h / 2 - 0.05 },
    horn: { x: w / 2 - 0.13, y: h / 2 + 0.05 },
    badge: { x: -w / 2 + 0.13, y: -h / 2 + 0.025 },
    buttons,
    controls: { x: mean((b) => b.x), y: mean((b) => b.y) },
  };
}
