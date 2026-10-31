import { STOP_COLUMNS, STOP_ROWS } from '../logic/stop-screen';
import type { StopMoment } from '../logic/stop-screen';

/**
 * The stop screen drawn (mission 114; its text and timing are
 * `logic/stop-screen.ts`): white monospace text on the period's royal blue,
 * laid on an 80 × 30 character grid stretched to the canvas, so it fills
 * a 640 × 480 panel in 8 × 16 cells as the period's text mode did, and any
 * other size in proportion. Drawn whole on each new `moment.key`: one fill
 * and a line of text a row.
 */

/** The field and the text. */
export const STOP_BLUE = '#0000aa';
export const STOP_WHITE = '#ffffff';
const FONT = '"Lucida Console", "Courier New", monospace';

export function drawStopScreen(
  ctx: CanvasRenderingContext2D,
  moment: Pick<StopMoment, 'lines'>,
  box = { x: 0, y: 0, w: ctx.canvas.width, h: ctx.canvas.height },
) {
  const cellW = box.w / STOP_COLUMNS;
  const cellH = box.h / STOP_ROWS;
  ctx.save();
  ctx.fillStyle = STOP_BLUE;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  // The font sized to the cell's height, then squeezed or stretched to
  // its width, so every character falls in its column.
  const size = cellH * 0.8;
  ctx.font = `${size}px ${FONT}`;
  const advance = ctx.measureText('M').width || size * 0.6;
  ctx.translate(box.x + cellW * 0.5, box.y + cellH * 0.15);
  ctx.scale(cellW / advance, 1);
  ctx.fillStyle = STOP_WHITE;
  ctx.textBaseline = 'top';
  moment.lines.forEach((line, row) => {
    if (line) ctx.fillText(line, 0, row * cellH);
  });
  ctx.restore();
}
