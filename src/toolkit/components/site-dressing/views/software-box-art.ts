import type {
  BoxArtStyle,
  BoxFace,
  PublisherLogo,
  SoftwareTitle,
} from '../logic/software-boxes';

type Paint = CanvasRenderingContext2D;

const EAN_L = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
const EAN_G = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];
const EAN_R = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
];
const EAN_PARITY = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];

function rect(
  ctx: Paint,
  colour: string | CanvasGradient,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, w, h);
}

function fittedText(
  ctx: Paint,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  family = 'Verdana, sans-serif',
  minSize = 4,
): number {
  let fontSize = size;
  do {
    ctx.font = `bold ${fontSize}px ${family}`;
    if (ctx.measureText(value).width <= maxWidth) break;
    fontSize -= 1;
  } while (fontSize > minSize);
  ctx.fillText(value, x, y, maxWidth);
  return fontSize;
}

function linesFor(ctx: Paint, value: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function frontTitle(ctx: Paint, title: SoftwareTitle): void {
  const colon = title.title.indexOf(':');
  const main = colon < 0 ? title.title : title.title.slice(0, colon + 1);
  const suffix = colon < 0 ? '' : title.title.slice(colon + 1).trim();
  // Clear of the price sticker in the top right corner.
  const width = 296;
  const centre = 174;
  const available = suffix ? 2 : 3;
  let size = 57;
  let lines: string[] = [];
  while (size >= 25) {
    ctx.font = `900 ${size}px Impact, Arial Black, sans-serif`;
    lines = linesFor(ctx, main, width);
    if (
      lines.length <= available &&
      lines.length * size * 1.02 <= (suffix ? 104 : 135)
    )
      break;
    size -= 1;
  }
  const start = 90 + (3 - lines.length - (suffix ? 1 : 0)) * 12;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 ${size}px Impact, Arial Black, sans-serif`;
  lines.forEach((line, index) =>
    ctx.fillText(line, centre, start + index * size * 1.02, width),
  );
  let bottom = start + (lines.length - 1) * size * 1.02;
  if (suffix) {
    bottom += 35;
    fittedText(
      ctx,
      suffix,
      centre,
      bottom,
      width,
      32,
      'Arial Black, sans-serif',
      18,
    );
  }
  if (title.subtitle) {
    ctx.font = 'bold 16px Georgia, serif';
    fittedText(
      ctx,
      title.subtitle,
      centre,
      Math.min(229, bottom + 23),
      width,
      16,
      'Georgia, serif',
    );
  }
  ctx.textAlign = 'left';
}

function wrap(
  ctx: Paint,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 20,
): number {
  const words = value.split(/\s+/);
  let line = '';
  let lines = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      ctx.fillText(line, x, y + lines * lineHeight, maxWidth);
      lines += 1;
      line = word;
      if (lines >= maxLines) return y + lines * lineHeight;
    } else line = next;
  }
  if (line && lines < maxLines) {
    ctx.fillText(line, x, y + lines * lineHeight, maxWidth);
    lines += 1;
  }
  return y + lines * lineHeight;
}

function logo(
  ctx: Paint,
  mark: PublisherLogo,
  x: number,
  y: number,
  size: number,
  colour: string,
): void {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = Math.max(1, size / 15);
  ctx.beginPath();
  if (mark.shape === 'circle')
    ctx.arc(x + size / 2, y + size / 2, size * 0.46, 0, Math.PI * 2);
  else if (mark.shape === 'diamond') {
    ctx.moveTo(x + size / 2, y);
    ctx.lineTo(x + size, y + size / 2);
    ctx.lineTo(x + size / 2, y + size);
    ctx.lineTo(x, y + size / 2);
    ctx.closePath();
  } else if (mark.shape === 'hexagon') {
    for (let i = 0; i < 6; i += 1) {
      const angle = Math.PI * (i / 3 - 1 / 6);
      const px = x + size / 2 + Math.cos(angle) * size * 0.48;
      const py = y + size / 2 + Math.sin(angle) * size * 0.48;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (mark.shape === 'arch') {
    ctx.moveTo(x + 2, y + size);
    ctx.lineTo(x + 2, y + size / 2);
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 2, Math.PI, 0);
    ctx.lineTo(x + size - 2, y + size);
  } else {
    ctx.moveTo(x, y + size);
    ctx.lineTo(x, y + size / 3);
    ctx.lineTo(x + size / 3, y + size / 3);
    ctx.moveTo(x + size / 2, y + size);
    ctx.lineTo(x + size / 2, y);
    ctx.lineTo(x + size, y);
  }
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fittedText(
    ctx,
    mark.letters,
    x + size / 2,
    y + size / 2,
    size * 0.72,
    size * 0.35,
    'Arial Black, sans-serif',
    5,
  );
  ctx.restore();
}

function panesSticker(
  ctx: Paint,
  title: SoftwareTitle,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  rect(ctx, '#e8dfc9', x, y, w, h);
  ctx.strokeStyle = '#355579';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  const pane = Math.min(27, h - 10);
  rect(ctx, '#c8d8de', x + 5, y + 5, pane, pane);
  ctx.strokeRect(x + 5, y + 5, pane, pane);
  ctx.beginPath();
  ctx.moveTo(x + 5 + pane / 2, y + 5);
  ctx.lineTo(x + 5 + pane / 2, y + 5 + pane);
  ctx.moveTo(x + 5, y + 5 + pane / 2);
  ctx.lineTo(x + 5 + pane, y + 5 + pane / 2);
  ctx.stroke();
  ctx.fillStyle = '#254566';
  ctx.textBaseline = 'middle';
  fittedText(
    ctx,
    title.compatibility,
    x + pane + 10,
    y + h / 2,
    w - pane - 14,
    10,
    'Verdana, sans-serif',
    5,
  );
}

function priceSticker(ctx: Paint, title: SoftwareTitle): void {
  ctx.save();
  ctx.translate(327, 16);
  ctx.rotate(0.08);
  rect(ctx, title.price.label ? '#ff9c3e' : '#fff9d9', 0, 0, 67, 45);
  ctx.strokeStyle = '#34302b';
  ctx.strokeRect(0, 0, 67, 45);
  ctx.fillStyle = '#222';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (title.price.label)
    fittedText(
      ctx,
      title.price.label,
      33,
      10,
      61,
      10,
      'Arial Black, sans-serif',
    );
  fittedText(
    ctx,
    title.price.amount,
    33,
    title.price.label ? 30 : 23,
    60,
    19,
    'Arial Black, sans-serif',
  );
  ctx.restore();
}

function starburst(
  ctx: Paint,
  label: string,
  x: number,
  y: number,
  r: number,
  colour: string,
): void {
  ctx.beginPath();
  for (let i = 0; i < 20; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 10;
    const radius = i % 2 ? r * 0.82 : r;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (!i) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.fillStyle = '#132b35';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 9px Verdana, sans-serif';
  wrap(ctx, label, x - r * 0.69, y - 6, r * 1.38, 10, 3);
  ctx.textAlign = 'left';
}

function poolScene(ctx: Paint, accent: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(22, 157, 356, 265);
  ctx.clip();
  const gradient = ctx.createLinearGradient(0, 155, 0, 423);
  gradient.addColorStop(0, '#b9ece8');
  gradient.addColorStop(1, '#086488');
  rect(ctx, gradient, 22, 157, 356, 265);
  ctx.strokeStyle = '#e1f7dd';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i += 1) {
    const y = 213 + i * i * 3.2;
    ctx.beginPath();
    ctx.moveTo(22, y + 28);
    ctx.lineTo(378, y);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i += 1) {
    ctx.setLineDash([10, 6]);
    ctx.strokeStyle = i % 2 ? accent : '#f5f0de';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(145 + i * 20, 185);
    ctx.lineTo(-30 + i * 84, 425);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  rect(ctx, '#e4e2c8', 33, 180, 7, 107);
  rect(ctx, '#e4e2c8', 34, 181, 91, 8);
  ctx.fillStyle = '#f6d7a4';
  ctx.beginPath();
  ctx.arc(258, 229, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f6d7a4';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(252, 241);
  ctx.lineTo(218, 267);
  ctx.lineTo(193, 253);
  ctx.moveTo(240, 252);
  ctx.lineTo(274, 276);
  ctx.stroke();
  ctx.restore();
}

function gridScene(ctx: Paint, accent: string): void {
  rect(ctx, '#34505a', 22, 157, 356, 265);
  ctx.save();
  ctx.translate(46, 202);
  ctx.transform(1, -0.1, -0.28, 0.92, 0, 0);
  rect(ctx, '#ecede3', 0, 0, 315, 213);
  rect(ctx, accent, 0, 0, 315, 27);
  ctx.strokeStyle = '#8a9da3';
  ctx.lineWidth = 1;
  const columns = 6;
  for (let i = 0; i <= columns; i += 1) {
    const x = (i * 315) / columns;
    ctx.beginPath();
    ctx.moveTo(x, 27);
    ctx.lineTo(x, 213);
    ctx.stroke();
  }
  for (let i = 0; i <= 8; i += 1) {
    const y = 27 + (i * 186) / 8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(315, y);
    ctx.stroke();
  }
  for (let row = 0; row < 7; row += 1)
    for (let col = 0; col < columns; col += 1)
      if ((row * 3 + col * 5) % 4 === 0)
        rect(
          ctx,
          accent,
          6 + (col * 315) / columns,
          34 + (row * 186) / 8,
          24,
          8,
        );
  ctx.restore();
  ctx.fillStyle = '#f4bd59';
  ctx.beginPath();
  ctx.moveTo(282, 301);
  ctx.arc(282, 301, 54, -Math.PI / 2, Math.PI * 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9d463d';
  ctx.beginPath();
  ctx.moveTo(282, 301);
  ctx.arc(282, 301, 54, Math.PI * 1.1, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();
}

function calendarScene(ctx: Paint, accent: string): void {
  rect(ctx, '#344d61', 22, 157, 356, 265);
  rect(ctx, '#f8f3df', 52, 193, 296, 211);
  rect(ctx, accent, 52, 193, 296, 35);
  for (let i = 0; i < 6; i += 1) {
    ctx.strokeStyle = '#193a4a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(79 + i * 49, 188, 10, Math.PI, 0);
    ctx.stroke();
  }
  ctx.strokeStyle = '#91a6ae';
  ctx.lineWidth = 1;
  for (let i = 1; i < 7; i += 1) {
    ctx.beginPath();
    ctx.moveTo(52 + (i * 296) / 7, 228);
    ctx.lineTo(52 + (i * 296) / 7, 404);
    ctx.stroke();
  }
  for (let i = 1; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(52, 228 + i * 35);
    ctx.lineTo(348, 228 + i * 35);
    ctx.stroke();
  }
  for (let i = 0; i < 15; i += 1)
    rect(
      ctx,
      i % 3 ? '#4b8b9c' : accent,
      62 + (i % 7) * 42,
      241 + Math.floor(i / 7) * 70,
      24,
      12,
    );
}

function decoScene(ctx: Paint, accent: string): void {
  rect(ctx, '#236d86', 22, 157, 356, 265);
  ctx.strokeStyle = '#f8bc6b';
  ctx.lineWidth = 3;
  for (let i = 0; i < 17; i += 1) {
    const angle = Math.PI + (i * Math.PI) / 16;
    ctx.beginPath();
    ctx.moveTo(200, 269);
    ctx.lineTo(200 + Math.cos(angle) * 235, 269 + Math.sin(angle) * 235);
    ctx.stroke();
  }
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  for (let i = 0; i < 5; i += 1) {
    ctx.strokeRect(52 + i * 12, 183 + i * 10, 296 - i * 24, 215 - i * 20);
  }
  rect(ctx, '#f6d7a3', 85, 261, 230, 105);
  rect(ctx, '#3899ad', 97, 278, 206, 77);
  for (let i = 0; i < 7; i += 1) rect(ctx, '#faf1cc', 98, 285 + i * 10, 204, 2);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(200, 216, 24, Math.PI, 0);
  ctx.fill();
}

function noirScene(ctx: Paint): void {
  const sky = ctx.createLinearGradient(22, 160, 378, 420);
  sky.addColorStop(0, '#050812');
  sky.addColorStop(0.6, '#1d354a');
  sky.addColorStop(1, '#080e19');
  rect(ctx, sky, 22, 157, 356, 265);
  ctx.fillStyle = '#d5d4b8';
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.moveTo(76, 411);
  ctx.lineTo(272, 210);
  ctx.lineTo(363, 420);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0a111d';
  ctx.beginPath();
  ctx.ellipse(271, 263, 58, 73, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(230, 320, 102, 100);
  ctx.strokeStyle = '#d7dbcb';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(248, 277);
  ctx.lineTo(260, 273);
  ctx.moveTo(291, 271);
  ctx.lineTo(302, 269);
  ctx.stroke();
  rect(ctx, '#b42e38', 22, 396, 356, 26);
}

function pulpScene(ctx: Paint, accent: string): void {
  const g = ctx.createLinearGradient(0, 155, 350, 420);
  g.addColorStop(0, '#b76a4d');
  g.addColorStop(0.5, '#45304a');
  g.addColorStop(1, '#151d32');
  ctx.fillStyle = g;
  ctx.fillRect(22, 157, 356, 265);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(260, 246, 72, 0, Math.PI * 2);
  ctx.fill();
  rect(ctx, '#273941', 89, 310, 220, 89);
  ctx.fillStyle = '#f6d9ae';
  ctx.beginPath();
  ctx.arc(159, 259, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f6d9ae';
  ctx.lineWidth = 19;
  ctx.beginPath();
  ctx.moveTo(153, 289);
  ctx.lineTo(122, 359);
  ctx.lineTo(198, 375);
  ctx.stroke();
  ctx.fillStyle = '#f7e5b2';
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText('?', 264, 254);
}

function chemicalScene(ctx: Paint, style: BoxArtStyle, accent: string): void {
  const g = ctx.createLinearGradient(0, 155, 360, 420);
  g.addColorStop(0, '#e2ece8');
  g.addColorStop(1, style === 'chemistry' ? '#559ba0' : '#6b929e');
  ctx.fillStyle = g;
  ctx.fillRect(22, 157, 356, 265);
  if (style === 'corporate-gradient') {
    const shine = ctx.createLinearGradient(22, 157, 378, 422);
    shine.addColorStop(0, '#ffffff');
    shine.addColorStop(0.5, '#a2c4ca');
    shine.addColorStop(1, '#30576b');
    rect(ctx, shine, 22, 157, 356, 265);
    ctx.fillStyle = '#ffffff55';
    ctx.beginPath();
    ctx.moveTo(22, 157);
    ctx.lineTo(378, 157);
    ctx.lineTo(22, 354);
    ctx.fill();
    ctx.save();
    ctx.translate(200, 285);
    ctx.rotate(Math.PI / 4);
    rect(ctx, '#f39831', -65, -65, 130, 130);
    ctx.strokeStyle = '#45342a';
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(-36, -36);
    ctx.lineTo(36, 36);
    ctx.moveTo(36, -36);
    ctx.lineTo(-36, 36);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.strokeStyle = '#d3f7ef';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.ellipse(200, 371, 46 + i * 31, 8 + i * 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(165, 192);
    ctx.lineTo(235, 192);
    ctx.moveTo(180, 192);
    ctx.lineTo(180, 257);
    ctx.lineTo(115, 359);
    ctx.quadraticCurveTo(110, 390, 147, 390);
    ctx.lineTo(253, 390);
    ctx.quadraticCurveTo(290, 390, 285, 359);
    ctx.lineTo(220, 257);
    ctx.lineTo(220, 192);
    ctx.stroke();
    rect(ctx, '#3d99aa', 135, 349, 130, 24);
    for (let i = 0; i < 3; i += 1) {
      rect(ctx, '#e7e5c9', 53 + i * 43, 268, 24, 87);
      rect(ctx, ['#edae40', '#7db75b', '#3f92b4'][i], 55 + i * 43, 310, 20, 43);
      rect(ctx, '#bacfd2', 58 + i * 43, 257, 14, 11);
    }
    for (const [x, y, r] of [
      [254, 229, 12],
      [282, 202, 6],
      [102, 265, 8],
      [289, 299, 10],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function coverScene(ctx: Paint, title: SoftwareTitle): void {
  const { style, palette } = title;
  if (style === 'pool-diagram') poolScene(ctx, palette.accent);
  else if (style === 'movie-noir') noirScene(ctx);
  else if (style === 'spreadsheet') gridScene(ctx, palette.accent);
  else if (style === 'calendar') calendarScene(ctx, palette.accent);
  else if (style === 'art-deco') decoScene(ctx, palette.accent);
  else if (style === 'pulp-painting') pulpScene(ctx, palette.accent);
  else chemicalScene(ctx, style, palette.accent);
}

function front(ctx: Paint, title: SoftwareTitle): void {
  rect(ctx, title.palette.background, 0, 0, 400, 520);
  rect(ctx, title.palette.accent, 0, 0, 400, 11);
  coverScene(ctx, title);
  rect(ctx, title.palette.background, 12, 75, 376, 154);
  ctx.fillStyle = title.palette.ink;
  ctx.shadowColor = 'rgba(10, 16, 24, 0.45)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  frontTitle(ctx, title);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  starburst(
    ctx,
    title.frontBadges[0] ?? '',
    324,
    383,
    52,
    title.palette.accent,
  );
  if (title.frontBadges[1]) {
    rect(ctx, title.palette.accent, 20, 433, 360, 23);
    ctx.fillStyle = '#12242e';
    fittedText(
      ctx,
      title.frontBadges[1],
      28,
      449,
      342,
      14,
      'Arial Black, sans-serif',
    );
  }
  logo(ctx, title.publisherLogo, 20, 467, 38, title.palette.ink);
  ctx.fillStyle = title.palette.ink;
  fittedText(ctx, title.publisher, 66, 492, 135, 16, 'Verdana, sans-serif');
  panesSticker(ctx, title, 205, 473, 151, 35);
  if (title.ageRating) {
    rect(ctx, '#f6f2dd', 359, 473, 31, 35);
    ctx.fillStyle = '#1a2229';
    fittedText(ctx, title.ageRating, 361, 495, 27, 14);
  }
  priceSticker(ctx, title);
}

function barcodeBits(code: string): string {
  let bits = '101';
  const parity = EAN_PARITY[Number(code[0])];
  for (let i = 1; i <= 6; i += 1)
    bits += (parity[i - 1] === 'L' ? EAN_L : EAN_G)[Number(code[i])];
  bits += '01010';
  for (let i = 7; i <= 12; i += 1) bits += EAN_R[Number(code[i])];
  return bits + '101';
}

function barcode(
  ctx: Paint,
  code: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  rect(ctx, '#fff', x, y, w, h);
  const bits = barcodeBits(code);
  const moduleWidth = (w - 12) / 95;
  ctx.fillStyle = '#111';
  for (let i = 0; i < 95; i += 1)
    if (bits[i] === '1')
      ctx.fillRect(
        x + 6 + i * moduleWidth,
        y + 3,
        moduleWidth + 0.1,
        h - 18 + (i < 3 || i >= 92 || (i >= 45 && i < 50) ? 4 : 0),
      );
  ctx.font = '10px Courier New, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(code, x + w / 2, y + h - 3);
  ctx.textAlign = 'left';
}

function screenshot(
  ctx: Paint,
  title: SoftwareTitle,
  caption: string,
  x: number,
  y: number,
  index: number,
): void {
  rect(ctx, '#10191e', x, y, 110, 79);
  rect(ctx, index % 2 ? '#367486' : '#458f9d', x + 4, y + 4, 102, 57);
  ctx.strokeStyle = '#aed6c6';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 14 + i * 13);
    ctx.lineTo(x + 101, y + 14 + i * 13);
    ctx.stroke();
  }
  if (title.kind === 'business') {
    for (let i = 0; i < 4; i += 1)
      rect(ctx, title.palette.accent, x + 13 + i * 22, y + 25, 8, 20 + i * 4);
  } else rect(ctx, title.palette.accent, x + 29 + index * 13, y + 31, 27, 12);
  ctx.fillStyle = '#fff';
  fittedText(ctx, caption, x + 4, y + 72, 102, 9, 'Verdana, sans-serif');
}

function requirements(ctx: Paint, title: SoftwareTitle): void {
  rect(ctx, '#e8e4d3', 16, 367, 368, 105);
  rect(ctx, '#183949', 16, 367, 368, 18);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px Verdana, sans-serif';
  ctx.fillText('SYSTEM REQUIREMENTS', 23, 380);
  ctx.fillStyle = '#1b303a';
  const entries: [string, string][] = [
    ['CPU', title.requirements.cpu],
    ['RAM', title.requirements.ram],
    ['DISK', title.requirements.disk],
    ['VIDEO', title.requirements.graphics],
    ['SOUND', title.requirements.sound],
    ['SYSTEM', title.requirements.os],
    ['DRIVE', title.requirements.drive],
  ];
  entries.forEach(([label, value], index) => {
    const y = 396 + index * 10.5;
    ctx.font = 'bold 8px Verdana, sans-serif';
    ctx.fillText(label, 23, y);
    fittedText(ctx, value, 79, y, 297, 8, 'Verdana, sans-serif', 5);
  });
}

function back(ctx: Paint, title: SoftwareTitle): void {
  rect(ctx, '#d7d4c7', 0, 0, 400, 520);
  rect(ctx, title.palette.background, 0, 0, 400, 76);
  rect(ctx, title.palette.accent, 0, 75, 400, 6);
  ctx.fillStyle = title.palette.ink;
  fittedText(ctx, title.title, 17, 34, 363, 25, 'Arial Black, sans-serif', 11);
  fittedText(ctx, title.media, 18, 59, 260, 13, 'Verdana, sans-serif');
  ctx.fillStyle = '#1b303a';
  ctx.font = '12px Georgia, serif';
  let y = wrap(ctx, title.blurb, 18, 102, 364, 15, 6) + 7;
  ctx.font = 'bold 11px Verdana, sans-serif';
  for (const feature of title.features.slice(0, 5)) {
    y = wrap(ctx, `• ${feature}`, 23, y, 350, 12, 2) + 1;
  }
  const shotsY = Math.max(258, Math.min(279, y + 4));
  title.screenshots
    .slice(0, 3)
    .forEach((caption, index) =>
      screenshot(ctx, title, caption, 16 + index * 123, shotsY, index),
    );
  requirements(ctx, title);
  logo(ctx, title.publisherLogo, 17, 480, 30, '#183949');
  ctx.fillStyle = '#183949';
  fittedText(ctx, title.publisher, 52, 491, 100, 10);
  barcode(ctx, title.barcode, 205, 479, 178, 35);
  ctx.font = '7px Verdana, sans-serif';
  ctx.fillText(
    `© ${title.year} ${title.publisher}. Printed in the EU.`,
    17,
    512,
    175,
  );
}

function spineTitle(ctx: Paint, value: string): void {
  let size = 77;
  let lines: string[] = [];
  while (size >= 19) {
    ctx.font = `900 ${size}px Impact, Arial Black, sans-serif`;
    lines = linesFor(ctx, value, 355);
    if (lines.length <= 2 && lines.length * size * 0.95 <= 78) break;
    size -= 1;
  }
  const offset = (lines.length - 1) * size * 0.475;
  lines.forEach((line, index) =>
    ctx.fillText(line, 0, index * size * 0.95 - offset, 355),
  );
}

function spine(ctx: Paint, title: SoftwareTitle, left: boolean): void {
  rect(ctx, title.palette.background, 0, 0, 110, 520);
  rect(ctx, title.palette.accent, left ? 101 : 0, 0, 9, 520);
  logo(ctx, title.publisherLogo, 32, 462, 46, title.palette.ink);
  ctx.save();
  if (left) {
    ctx.translate(55, 440);
    ctx.rotate(-Math.PI / 2);
  } else {
    ctx.translate(55, 85);
    ctx.rotate(Math.PI / 2);
  }
  ctx.fillStyle = title.palette.ink;
  ctx.textBaseline = 'middle';
  spineTitle(ctx, title.title);
  ctx.restore();
  ctx.fillStyle = title.palette.ink;
  ctx.textAlign = 'center';
  fittedText(ctx, `${title.year}`, 55, 40, 90, 18, 'Verdana, sans-serif');
  ctx.textAlign = 'left';
}

function top(ctx: Paint, title: SoftwareTitle): void {
  rect(ctx, title.palette.background, 0, 0, 400, 110);
  rect(ctx, title.palette.accent, 0, 0, 400, 8);
  logo(ctx, title.publisherLogo, 13, 25, 52, title.palette.ink);
  ctx.fillStyle = title.palette.ink;
  fittedText(ctx, title.title, 79, 65, 305, 31, 'Arial Black, sans-serif', 10);
}

function bottom(ctx: Paint, title: SoftwareTitle): void {
  rect(ctx, '#d8d1bc', 0, 0, 400, 110);
  barcode(ctx, title.barcode, 10, 11, 178, 67);
  ctx.fillStyle = '#263137';
  fittedText(
    ctx,
    `Made in the EU · © ${title.year} ${title.publisher}`,
    197,
    38,
    190,
    10,
  );
  fittedText(
    ctx,
    `CAT. ${title.id.toUpperCase().slice(0, 12)}-${title.year}`,
    197,
    59,
    190,
    9,
    'Courier New, monospace',
  );
  fittedText(ctx, title.media, 197, 78, 190, 10);
}

/** Paint one upright printed face of a fictional software box. */
export function drawBoxFace(
  context: CanvasRenderingContext2D,
  title: SoftwareTitle,
  face: BoxFace,
  width: number,
  height: number,
): void {
  if (width <= 0 || height <= 0) return;
  const narrow = face === 'left' || face === 'right';
  const shallow = face === 'top' || face === 'bottom';
  const baseW = narrow ? 110 : 400;
  const baseH = shallow ? 110 : 520;
  context.save();
  context.scale(width / baseW, height / baseH);
  if (face === 'front') front(context, title);
  else if (face === 'back') back(context, title);
  else if (face === 'left' || face === 'right')
    spine(context, title, face === 'left');
  else if (face === 'top') top(context, title);
  else bottom(context, title);
  context.restore();
}
