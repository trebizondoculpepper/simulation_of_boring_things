import type { Defect } from '../logic/lcd-defects';

/**
 * An old panel's passing faults (`logic/lcd-defects.ts`) drawn over what
 * its screen shows: a stuck or dead pixel as a 2 px dot (one panel pixel
 * would vanish in the texture's filtering), a column fault as a hairline
 * down the screen.
 */
export function drawDefects(
  ctx: CanvasRenderingContext2D,
  defects: readonly Defect[],
) {
  for (const d of defects) {
    ctx.fillStyle = d.colour;
    if (d.kind === 'column') ctx.fillRect(d.x, 0, 1, ctx.canvas.height);
    else ctx.fillRect(d.x, d.y, 2, 2);
  }
}
