import type { GlitchPlan } from '../logic/lcd-glitch';

/** Paint a planned LCD failure using the last intact screen as its source. */
export function drawLcdGlitch(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  plan: GlitchPlan,
): void {
  ctx.save();
  try {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    if (plan.base === 'frame') ctx.drawImage(source, 0, 0, width, height);
    else if (plan.base === 'black') {
      ctx.fillStyle = '#020409';
      ctx.fillRect(0, 0, width, height);
    }
    for (const op of plan.ops) {
      ctx.globalCompositeOperation =
        op.kind === 'fill' || op.kind === 'copy'
          ? (op.blend ?? 'source-over')
          : 'source-over';
      ctx.globalAlpha =
        op.kind === 'fill' || op.kind === 'copy' ? (op.alpha ?? 1) : 1;
      if (op.kind === 'fill') {
        ctx.fillStyle = op.color;
        ctx.fillRect(op.x, op.y, op.w, op.h);
      } else if (op.kind === 'copy') {
        ctx.drawImage(
          source,
          op.sx,
          op.sy,
          op.sw,
          op.sh,
          op.dx,
          op.dy,
          op.dw,
          op.dh,
        );
      } else if (op.kind === 'text') {
        ctx.save();
        ctx.beginPath();
        ctx.rect(op.x, op.y, op.w, op.h);
        ctx.clip();
        if (op.background) {
          ctx.fillStyle = op.background;
          ctx.fillRect(op.x, op.y, op.w, op.h);
        }
        ctx.fillStyle = op.color;
        ctx.font = `${op.size}px 'Lucida Console', 'Courier New', monospace`;
        ctx.textBaseline = 'top';
        ctx.fillText(op.text, op.x, op.y);
        ctx.restore();
      } else {
        ctx.fillStyle = op.color;
        const columns = Math.ceil(op.w / op.pixel);
        for (
          let row = 0;
          row < op.bits.length && row * op.pixel < op.h;
          row++
        ) {
          const mask = op.bits[row];
          for (let col = 0; col < columns; col++) {
            if (mask & (1 << col))
              ctx.fillRect(
                op.x + col * op.pixel,
                op.y + row * op.pixel,
                Math.min(op.pixel, op.w - col * op.pixel),
                Math.min(op.pixel, op.h - row * op.pixel),
              );
          }
        }
      }
    }
  } finally {
    ctx.restore();
  }
}
