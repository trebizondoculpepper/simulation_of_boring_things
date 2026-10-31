type Paint = CanvasRenderingContext2D;

/** Paint a broad, soft spot of colour. */
export function airbrushSpot(
  ctx: Paint,
  x: number,
  y: number,
  radius: number,
  colour: string,
): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, colour);
  gradient.addColorStop(1, 'transparent');
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}

/** Paint a soft glow with screen blending. */
export function glow(
  ctx: Paint,
  x: number,
  y: number,
  radius: number,
  colour: string,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  airbrushSpot(ctx, x, y, radius, colour);
  ctx.restore();
}

/** Paint a four-point flare with a soft core and coloured optical ghosts. */
export function lensFlare(
  ctx: Paint,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  glow(ctx, x, y, radius * 1.9, '#fba85a88');
  glow(ctx, x, y, radius, '#fff9ceee');
  for (const [dx, scale, colour] of [
    [-1.7, 0.21, '#72deeb55'],
    [-1.05, 0.13, '#ef9a8955'],
    [0.84, 0.26, '#a1b6f755'],
    [1.5, 0.16, '#ffd28055'],
  ] as const) {
    glow(ctx, x + radius * dx, y + radius * dx * 0.17, radius * scale, colour);
  }
  ctx.strokeStyle = '#fffcebbb';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#fff4bc';
  ctx.shadowBlur = 12;
  for (const [dx, dy] of [
    [1, 0],
    [0, 1],
    [0.57, 0.57],
    [0.57, -0.57],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x - dx * radius * 1.65, y - dy * radius * 1.65);
    ctx.lineTo(x + dx * radius * 1.65, y + dy * radius * 1.65);
    ctx.stroke();
  }
  ctx.restore();
}

/** Paint outlined, stepped chrome lettering with a sharp horizon in its fill. */
export function chromeText(
  ctx: Paint,
  value: string,
  x: number,
  y: number,
  font: string,
  maxWidth: number,
  height: number,
  outerGlow = false,
): void {
  ctx.save();
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  if (outerGlow) {
    ctx.shadowColor = '#5ae8ff';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#9defff';
    ctx.lineWidth = 8;
    ctx.strokeText(value, x, y, maxWidth);
    ctx.shadowBlur = 0;
  }
  for (let step = 8; step >= 1; step -= 1) {
    ctx.strokeStyle = step > 4 ? '#061428' : '#a14621';
    ctx.lineWidth = 5;
    ctx.strokeText(value, x + step, y + step, maxWidth);
    ctx.fillStyle = step > 4 ? '#16324d' : '#723c2e';
    ctx.fillText(value, x + step, y + step, maxWidth);
  }
  ctx.strokeStyle = '#07111e';
  ctx.lineWidth = 7;
  ctx.strokeText(value, x, y, maxWidth);
  const gradient = ctx.createLinearGradient(
    0,
    y - height / 2,
    0,
    y + height / 2,
  );
  gradient.addColorStop(0, '#4a93c4');
  gradient.addColorStop(0.24, '#d7f6ff');
  gradient.addColorStop(0.43, '#ffffff');
  gradient.addColorStop(0.44, '#5f341f');
  gradient.addColorStop(0.53, '#b75f2b');
  gradient.addColorStop(0.74, '#ffce79');
  gradient.addColorStop(1, '#f8f5d6');
  ctx.fillStyle = gradient;
  ctx.fillText(value, x, y, maxWidth);
  ctx.restore();
}

/** Paint a jagged gradient sticker with rotated, fitted display type. */
export function burst(
  ctx: Paint,
  value: string,
  x: number,
  y: number,
  radius: number,
  top: string,
  bottom: string,
  angle = -0.12,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowColor = '#030814cc';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 5;
  ctx.beginPath();
  for (let index = 0; index < 32; index += 1) {
    const theta = (index * Math.PI) / 16 - Math.PI / 2;
    const r = radius * (index % 2 ? 0.72 : 1);
    if (index === 0) ctx.moveTo(Math.cos(theta) * r, Math.sin(theta) * r);
    else ctx.lineTo(Math.cos(theta) * r, Math.sin(theta) * r);
  }
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, -radius, 0, radius);
  fill.addColorStop(0, top);
  fill.addColorStop(1, bottom);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#101a2c';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#0b1930';
  ctx.font = `900 ${Math.min(36, radius * 0.76)}px Impact, Arial Black, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, 0, 0, radius * 1.45);
  ctx.restore();
}

/** Paint a slightly skewed, shadowed label with a tinted frame. */
export function sticker(
  ctx: Paint,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
  angle = -0.06,
): void {
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.rotate(angle);
  ctx.shadowColor = '#030814aa';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#eef5e9';
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#365b84';
  ctx.lineWidth = 2;
  ctx.strokeRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4);
  const pane = height - 12;
  const px = -width / 2 + 7;
  const py = -height / 2 + 6;
  ctx.fillStyle = '#173457';
  ctx.fillRect(px, py, pane, pane);
  ctx.fillStyle = '#eef5e9';
  ctx.fillRect(px + 2, py + 2, pane - 4, pane - 4);
  ctx.strokeStyle = '#173457';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + pane / 2, py + 2);
  ctx.lineTo(px + pane / 2, py + pane - 2);
  ctx.moveTo(px + 2, py + pane / 2);
  ctx.lineTo(px + pane - 2, py + pane / 2);
  ctx.stroke();
  ctx.fillStyle = '#173457';
  ctx.beginPath();
  ctx.moveTo(px + 3, py + 2);
  ctx.quadraticCurveTo(
    px + pane * 0.34,
    py + pane * 0.38,
    px + 3,
    py + pane - 2,
  );
  ctx.lineTo(px + 3, py + 2);
  ctx.fill();
  ctx.fillStyle = '#173457';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.min(14, height * 0.38)}px Verdana, sans-serif`;
  ctx.fillText(value, px + pane + 5, 0, width - pane - 20);
  ctx.restore();
}

/** Paint a magazine pull quote with its score in a coloured badge. */
export function reviewQuote(
  ctx: Paint,
  quote: string,
  magazine: string,
  score: string,
  x: number,
  y: number,
  width: number,
): void {
  ctx.save();
  ctx.fillStyle = '#061a31aa';
  ctx.fillRect(x, y, width, 34);
  ctx.strokeStyle = '#68b9c977';
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, 33);
  ctx.fillStyle = '#e9f6f3';
  ctx.font = 'italic bold 13px Georgia, serif';
  ctx.textBaseline = 'top';
  ctx.fillText(`“${quote}”`, x + 7, y + 3, width - 74);
  ctx.fillStyle = '#80dfea';
  ctx.font = 'bold 9px Verdana, sans-serif';
  ctx.fillText(magazine, x + 13, y + 21, width - 80);
  ctx.fillStyle = '#f4b347';
  ctx.fillRect(x + width - 54, y + 2, 52, 30);
  ctx.fillStyle = '#142641';
  ctx.font = '900 17px Impact, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(score, x + width - 28, y + 6, 48);
  ctx.restore();
}
