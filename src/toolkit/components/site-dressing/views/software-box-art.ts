import { drawGameBoxFace } from './software-box-game-art';
import type { GameBoxFurniture } from './software-box-game-art';
import { drawQuestBoxFace } from './software-box-quest-art';
import { drawPeriodBoxFace } from './software-box-period-art';
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

/** A business box's title: its name, its version number large, and any detail. */
function frontTitle(ctx: Paint, title: SoftwareTitle): void {
  const version = title.title.match(/\d+(?:\.\d+)?/)?.[0] ?? '';
  const colon = title.title.indexOf(':');
  const prefix = title.title
    .slice(0, colon < 0 ? title.title.indexOf(version) : colon)
    .trim();
  const suffix = title.title
    .slice(title.title.indexOf(version) + version.length)
    .trim();
  const gold = title.style === 'chemistry';
  ctx.textAlign = 'center';
  const lines: [string, number, number, number, number][] = [
    [prefix, 135, 345, 39, 20],
    [version, 181, 330, 44, 25],
  ];
  for (const [text, y, width, size, min] of lines) {
    ctx.fillStyle = title.palette.ink;
    fittedText(ctx, text, 200, y, width, size, 'Arial Black, sans-serif', min);
    if (gold) {
      // Foil lettering, on a dark keyline so it reads on the pale ground.
      ctx.save();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = title.palette.ink;
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeText(text, 200, y, width);
      ctx.fillStyle = goldFoil(ctx, y - size * 0.8, size);
      ctx.fillText(text, 200, y, width);
      ctx.restore();
    }
  }
  ctx.fillStyle = title.palette.ink;
  const detail =
    colon < 0
      ? suffix
      : title.title.slice(colon + 1, title.title.indexOf(version)).trim();
  if (detail) fittedText(ctx, detail, 200, 211, 340, 20);
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
  // The stepped bars leave their letters room only in the lower right.
  const bars = mark.shape === 'bars';
  fittedText(
    ctx,
    mark.letters,
    x + size * (bars ? 0.77 : 0.5),
    y + size * (bars ? 0.7 : 0.5),
    size * (bars ? 0.4 : 0.72),
    size * (bars ? 0.3 : 0.35),
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

function gridScene(ctx: Paint, title: SoftwareTitle): void {
  rect(ctx, '#34505a', 22, 157, 356, 265);
  ctx.save();
  ctx.translate(46, 202);
  ctx.transform(1, -0.1, -0.28, 0.92, 0, 0);
  rect(ctx, '#ecede3', 0, 0, 315, 213);
  rect(ctx, title.palette.accent, 0, 0, 315, 27);
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
          title.palette.accent,
          6 + (col * 315) / columns,
          34 + (row * 186) / 8,
          24,
          8,
        );
  ctx.restore();
  programWindow(ctx, title, title.screenshots[0], 55, 235, 270, 140, 0);
}

function calendarScene(ctx: Paint, title: SoftwareTitle): void {
  rect(ctx, '#344d61', 22, 157, 356, 265);
  rect(ctx, '#f8f3df', 52, 193, 296, 211);
  rect(ctx, title.palette.accent, 52, 193, 296, 35);
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
      i % 3 ? '#4b8b9c' : title.palette.accent,
      62 + (i % 7) * 42,
      241 + Math.floor(i / 7) * 70,
      24,
      12,
    );
  programWindow(ctx, title, title.screenshots[0], 56, 235, 288, 143, 0);
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
    // The old European harmful/irritant symbol: an upright orange square, a black St Andrew's cross.
    ctx.save();
    ctx.translate(200, 290);
    ctx.shadowColor = 'rgba(20, 40, 50, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    rect(ctx, '#f39831', -62, -62, 124, 124);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#1d1a17';
    ctx.lineWidth = 3;
    ctx.strokeRect(-56, -56, 112, 112);
    ctx.lineWidth = 14;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(-38, -38);
    ctx.lineTo(38, 38);
    ctx.moveTo(38, -38);
    ctx.lineTo(-38, 38);
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
    const liquid = ctx.createLinearGradient(125, 265, 280, 390);
    liquid.addColorStop(0, '#ecf9e4');
    liquid.addColorStop(0.5, '#76c6c5');
    liquid.addColorStop(1, '#1f758e');
    rect(ctx, liquid, 135, 349, 130, 24);
    ctx.strokeStyle = '#ffffffa8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(177, 268);
    ctx.lineTo(132, 357);
    ctx.quadraticCurveTo(122, 385, 153, 385);
    ctx.stroke();
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
  if (style === 'spreadsheet') gridScene(ctx, title);
  else if (style === 'calendar') calendarScene(ctx, title);
  else chemicalScene(ctx, style, palette.accent);
}

/** A vertical gold-foil gradient across a band: dark edges, a bright crease. */
function goldFoil(ctx: Paint, top: number, height: number): CanvasGradient {
  const foil = ctx.createLinearGradient(0, top, 0, top + height);
  foil.addColorStop(0, '#6f5b1e');
  foil.addColorStop(0.25, '#fff3a7');
  foil.addColorStop(0.52, '#c59527');
  foil.addColorStop(0.8, '#f9e698');
  foil.addColorStop(1, '#755719');
  return foil;
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
  rect(ctx, '#f5e6bc', 260, 385, 120, 39);
  ctx.strokeStyle = title.palette.accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(260, 385, 120, 39);
  ctx.fillStyle = title.palette.ink;
  ctx.textAlign = 'center';
  fittedText(ctx, title.frontBadges[0] ?? '', 320, 409, 108, 11);
  ctx.textAlign = 'left';
  if (title.frontBadges[1]) {
    const gold = title.style === 'chemistry';
    // DoseRight's gold edition gets a foil band, deeper than the others.
    const top = gold ? 428 : 433;
    const height = gold ? 30 : 23;
    rect(
      ctx,
      gold ? goldFoil(ctx, top, height) : title.palette.accent,
      20,
      top,
      360,
      height,
    );
    ctx.fillStyle = '#12242e';
    if (gold) ctx.textAlign = 'center';
    fittedText(
      ctx,
      gold ? title.frontBadges[1].toUpperCase() : title.frontBadges[1],
      gold ? 200 : 28,
      top + height - 7,
      342,
      gold ? 22 : 14,
      'Arial Black, sans-serif',
    );
    ctx.textAlign = 'left';
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

function programWindow(
  ctx: Paint,
  title: SoftwareTitle,
  caption: string,
  x: number,
  y: number,
  w: number,
  h: number,
  index: number,
): void {
  const ui = title.businessUi;
  if (!ui) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / 300, h / 180);
  rect(ctx, '#172b3d', 0, 0, 300, 180);
  rect(ctx, '#c5c8c9', 4, 4, 292, 172);
  rect(ctx, '#173b6a', 6, 6, 288, 21);
  ctx.fillStyle = '#fff';
  fittedText(ctx, caption, 12, 21, 210, 12);
  for (let i = 0; i < 3; i += 1) {
    rect(ctx, '#d7dadb', 247 + i * 15, 9, 12, 12);
    rect(ctx, '#647481', 250 + i * 15, 18, 6, 1);
  }
  ctx.fillStyle = '#152d3a';
  fittedText(ctx, ui.menu, 9, 39, 280, 10);
  rect(ctx, '#adb9c0', 7, 43, 286, 20);
  ctx.fillStyle = '#183b4d';
  fittedText(ctx, ui.toolbar, 13, 57, 270, 10);
  rect(ctx, '#f4f3e8', 8, 67, 284, 102);
  rect(ctx, '#cbd9df', 9, 68, 282, 17);
  const widths = [70, 185, 283];
  let previous = 14;
  ui.columns.forEach((column, i) => {
    ctx.fillStyle = '#1c3c56';
    fittedText(ctx, column, previous, 80, widths[i] - previous - 3, 10);
    previous = widths[i];
  });
  ctx.strokeStyle = '#aebac0';
  ctx.lineWidth = 1;
  for (const row of [85, 101, 117, 133, 149, 165]) {
    ctx.beginPath();
    ctx.moveTo(9, row);
    ctx.lineTo(291, row);
    ctx.stroke();
  }
  for (const col of [74, 188]) {
    ctx.beginPath();
    ctx.moveTo(col, 68);
    ctx.lineTo(col, 169);
    ctx.stroke();
  }
  for (let row = 0; row < 5; row += 1) {
    const yy = 89 + row * 16;
    rect(ctx, row === index ? '#efdcab' : '#acc5ca', 13, yy, 34, 7);
    rect(ctx, '#66889b', 81, yy, 45 + ((row + index) % 3) * 16, 7);
    rect(ctx, row === index ? title.palette.accent : '#61899a', 203, yy, 47, 7);
  }
  ctx.restore();
}

function screenshot(
  ctx: Paint,
  title: SoftwareTitle,
  caption: string,
  x: number,
  y: number,
  index: number,
): void {
  if (title.kind === 'business') {
    programWindow(ctx, title, caption, x, y, 110, 66, index);
    rect(ctx, '#132e3b', x, y + 65, 110, 14);
    ctx.fillStyle = '#fff';
    fittedText(ctx, caption, x + 4, y + 75, 102, 9);
    return;
  }
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
  rect(ctx, title.palette.accent, x + 29 + index * 13, y + 31, 27, 12);
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
  if (title.kind === 'business') {
    const tableY = y - 10;
    title.features.slice(0, 4).forEach((feature, index) => {
      const rowY = tableY + index * 17;
      rect(ctx, index % 2 ? '#e6e7df' : '#f3f1e8', 18, rowY, 364, 17);
      rect(ctx, title.palette.accent, 18, rowY, 5, 17);
      ctx.fillStyle = '#183949';
      fittedText(ctx, feature, 30, rowY + 12, 342, 10);
    });
    y = tableY + 71;
  } else {
    ctx.font = 'bold 11px Verdana, sans-serif';
    for (const feature of title.features.slice(0, 5))
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
  fittedText(ctx, title.title, 88, 65, 294, 25, 'Arial Black, sans-serif', 10);
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
  if (title.questArt) {
    drawQuestBoxFace(context, title, face, {
      barcode: (ctx, item, x, y, w, h) =>
        barcode(ctx, item.barcode, x, y, w, h),
    });
  } else if (title.gameArt || title.lidoArt || title.deepArt) {
    const furniture = {
      logo: (ctx, item, x, y, size, colour) =>
        logo(ctx, item.publisherLogo, x, y, size, colour),
      barcode: (ctx, item, x, y, w, h) =>
        barcode(ctx, item.barcode, x, y, w, h),
      requirements,
    } satisfies GameBoxFurniture;
    if (title.gameArt) drawGameBoxFace(context, title, face, furniture);
    else drawPeriodBoxFace(context, title, face, furniture);
  } else if (face === 'front') front(context, title);
  else if (face === 'back') back(context, title);
  else if (face === 'left' || face === 'right')
    spine(context, title, face === 'left');
  else if (face === 'top') top(context, title);
  else bottom(context, title);
  context.restore();
}
