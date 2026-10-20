import type { CanvasTexture } from 'three';
import type { GraffitiPiece } from '../logic/graffiti';
import { createCanvasTexture } from '../../core/views/screens';

/** Every piece is drawn on a canvas of this shape, 1.6 : 1, clear. */
export const GRAFFITI_ASPECT = 1.6;
const W = 1024;
const H = 640;

type Ctx = CanvasRenderingContext2D;

/** A seeded random, so a piece wobbles the same way every time. */
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const SPRAY_FONT =
  '"Marker Felt", "Comic Sans MS", "Chalkboard SE", sans-serif';
const FAT_FONT = '"Arial Black", Impact, "Helvetica Neue", sans-serif';
const STENCIL_FONT = 'Impact, "Arial Black", sans-serif';

/** Paint running down from (x, y): a thin drip with a bead at its foot. */
function drip(ctx: Ctx, x: number, y: number, length: number, width: number) {
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width * 0.3, y + length);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + width * 0.3, y + length, width * 0.85, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Letters one at a time along a line, each with its own wobble, drawn by
 * `draw` at its place; returns where each letter went.
 */
function letters(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  size: number,
  spacing: number,
  r: () => number,
  wobble: number,
  draw: (ch: string, size: number) => void,
) {
  const placed: { x: number; y: number; w: number }[] = [];
  let at = x;
  for (const ch of text) {
    const s = size * (1 + (r() - 0.5) * wobble);
    const w = ctx.measureText(ch).width * (s / size);
    ctx.save();
    ctx.translate(at, y + (r() - 0.5) * size * wobble * 0.6);
    ctx.rotate((r() - 0.5) * wobble * 0.7);
    draw(ch, s);
    ctx.restore();
    placed.push({ x: at, y, w });
    at += w * spacing;
  }
  return placed;
}

/** Measure a line in a font, for centring. */
const width = (ctx: Ctx, text: string, font: string) => {
  ctx.font = font;
  return ctx.measureText(text).width;
};

function tag(ctx: Ctx, text: string, colour: string, r: () => number) {
  const size = 230;
  const font = `italic 900 ${size}px ${SPRAY_FONT}`;
  const span = width(ctx, text, font) * 0.92;
  ctx.font = font;
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.shadowColor = colour;
  ctx.shadowBlur = 14;
  ctx.textBaseline = 'alphabetic';
  const placed = letters(
    ctx,
    text,
    (W - span) / 2,
    H * 0.62,
    size,
    0.92,
    r,
    0.25,
    (ch, s) => {
      ctx.font = `italic 900 ${s}px ${SPRAY_FONT}`;
      ctx.fillText(ch, 0, 0);
    },
  );
  ctx.shadowBlur = 0;
  // An underline swoosh, and the drips.
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo((W - span) / 2 - 20, H * 0.7);
  ctx.quadraticCurveTo(W / 2, H * 0.78, (W + span) / 2 + 40, H * 0.66);
  ctx.stroke();
  for (const p of placed)
    if (r() < 0.7) drip(ctx, p.x + p.w * r(), H * 0.6, 40 + r() * 110, 5);
}

function throwup(
  ctx: Ctx,
  text: string,
  colours: readonly string[],
  r: () => number,
) {
  const [fill, outline, shade] = colours;
  const size = 300;
  const font = `900 ${size}px ${FAT_FONT}`;
  const span = width(ctx, text, font) * 0.82;
  const x = (W - span) / 2;
  const y = H * 0.7;
  // Every pass wobbles alike, from one seed, so the layers line up.
  const wobble = 1 + Math.floor(r() * 1000);
  const draw = (pass: 'outline' | 'shade' | 'fill' | 'shine') =>
    letters(ctx, text, x, y, size, 0.82, seeded(wobble), 0.18, (ch, s) => {
      ctx.font = `900 ${s}px ${FAT_FONT}`;
      ctx.lineJoin = 'round';
      if (pass === 'outline') {
        ctx.strokeStyle = outline;
        ctx.lineWidth = 46;
        ctx.strokeText(ch, 0, 0);
      } else if (pass === 'shade') {
        ctx.fillStyle = shade;
        ctx.fillText(ch, 10, 10);
      } else if (pass === 'fill') {
        ctx.fillStyle = fill;
        ctx.fillText(ch, 0, 0);
      } else {
        // A highlight stroke along each letter's top left.
        ctx.strokeStyle = '#ffffffcc';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(s * 0.12, -s * 0.62);
        ctx.lineTo(s * 0.3, -s * 0.66);
        ctx.stroke();
      }
    });
  draw('outline');
  draw('shade');
  draw('fill');
  draw('shine');
  ctx.fillStyle = outline;
  ctx.strokeStyle = outline;
  for (let i = 0; i < 4; i++)
    drip(ctx, x + r() * span, y + 8, 30 + r() * 80, 7);
}

function pieceArt(
  ctx: Ctx,
  text: string,
  colours: readonly string[],
  r: () => number,
) {
  const [fill, outline, a, b, c] = colours;
  // A cloud of background colour behind it, the fill-in.
  ctx.fillStyle = b;
  for (let i = 0; i < 14; i++) {
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(
      W * (0.12 + r() * 0.76),
      H * (0.3 + r() * 0.45),
      60 + r() * 90,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const size = 270;
  const font = `900 ${size}px ${FAT_FONT}`;
  const span = width(ctx, text, font) * 0.86;
  const x = (W - span) / 2;
  const y = H * 0.7;
  const wobble = 1 + Math.floor(r() * 1000);
  const pass = (draw: (ch: string, s: number) => void) =>
    letters(ctx, text, x, y, size, 0.86, seeded(wobble), 0.3, (ch, s) => {
      ctx.font = `900 ${s}px ${FAT_FONT}`;
      ctx.lineJoin = 'miter';
      draw(ch, s);
    });
  // The 3D block, stepped down and right.
  pass((ch) => {
    ctx.fillStyle = outline;
    for (let d = 1; d <= 22; d += 3) ctx.fillText(ch, d, d);
  });
  pass((ch) => {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 22;
    ctx.strokeText(ch, 0, 0);
  });
  // The fill, faded from one colour to another.
  pass((ch, s) => {
    const g = ctx.createLinearGradient(0, -s * 0.75, 0, 0);
    g.addColorStop(0, fill);
    g.addColorStop(0.55, a);
    g.addColorStop(1, fill);
    ctx.fillStyle = g;
    ctx.fillText(ch, 0, 0);
  });
  // Highlights, and a band of bubbles across the middle.
  pass((_, s) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(s * 0.1, -s * 0.6);
    ctx.lineTo(s * 0.32, -s * 0.66);
    ctx.stroke();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(s * 0.22, -s * 0.32, 9, 0, Math.PI * 2);
    ctx.fill();
  });
  // Arrows flying off it, and sparkles.
  ctx.fillStyle = a;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 8;
  for (const [ax, ay, turn] of [
    [x - 30, y - 120, Math.PI],
    [x + span + 40, y - 200, -0.4],
  ] as const) {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(turn);
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(70, -18);
    ctx.lineTo(70, -45);
    ctx.lineTo(120, 0);
    ctx.lineTo(70, 45);
    ctx.lineTo(70, 18);
    ctx.lineTo(0, 18);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = c;
  ctx.lineWidth = 6;
  for (let i = 0; i < 5; i++) {
    const sx = W * (0.08 + r() * 0.84);
    const sy = H * (0.08 + r() * 0.2);
    const k = 16 + r() * 18;
    ctx.beginPath();
    ctx.moveTo(sx - k, sy);
    ctx.lineTo(sx + k, sy);
    ctx.moveTo(sx, sy - k);
    ctx.lineTo(sx, sy + k);
    ctx.stroke();
  }
}

function stencil(
  ctx: Ctx,
  lines: readonly string[],
  colour: string,
  r: () => number,
) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = lines.length > 1 ? 170 : 230;
  ctx.font = `${size}px ${STENCIL_FONT}`;
  const ys = lines.map(
    (_, i) => H / 2 + (i - (lines.length - 1) / 2) * size * 1.05,
  );
  // Overspray: a haze round the edge of the stencil.
  ctx.fillStyle = colour;
  ctx.shadowColor = colour;
  ctx.shadowBlur = 26;
  ctx.globalAlpha = 0.3;
  lines.forEach((line, i) =>
    ctx.fillText(line, W / 2 + 4, ys[i] + 4, W * 0.92),
  );
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, ys[i], W * 0.92));
  // The stencil's bridges: thin gaps cut through the letters.
  ctx.globalCompositeOperation = 'destination-out';
  for (const y of ys)
    for (let i = 0; i < 2; i++)
      ctx.fillRect(0, y - size * (0.08 - i * 0.2), W, 7);
  ctx.globalCompositeOperation = 'source-over';
  // A crown over the top, as a king of the wall wears.
  if (lines.join(' ').includes('KING')) {
    const cx = W / 2;
    const top = ys[0] - size * 0.95;
    ctx.beginPath();
    ctx.moveTo(cx - 110, top + 90);
    ctx.lineTo(cx - 120, top);
    ctx.lineTo(cx - 55, top + 50);
    ctx.lineTo(cx, top - 10);
    ctx.lineTo(cx + 55, top + 50);
    ctx.lineTo(cx + 120, top);
    ctx.lineTo(cx + 110, top + 90);
    ctx.closePath();
    ctx.fill();
  }
  // Specks of spray, flicked round it.
  ctx.fillStyle = colour;
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.25 + r() * 0.4;
    ctx.beginPath();
    ctx.arc(W * r(), H * r(), 1 + r() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function sticker(
  ctx: Ctx,
  name: string,
  colours: readonly string[],
  r: () => number,
) {
  const [red, ink] = colours;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate((r() - 0.5) * 0.3);
  const sw = 760;
  const sh = 480;
  ctx.fillStyle = '#00000033';
  ctx.beginPath();
  ctx.roundRect(-sw / 2 + 8, -sh / 2 + 10, sw, sh, 40);
  ctx.fill();
  ctx.fillStyle = red;
  ctx.beginPath();
  ctx.roundRect(-sw / 2, -sh / 2, sw, sh, 40);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-sw / 2 + 24, -sh / 2 + 150, sw - 48, sh - 200);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 82px ${FAT_FONT}`;
  ctx.fillText('HELLO', 0, -sh / 2 + 62, sw - 60);
  ctx.font = `700 40px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText('my name is', 0, -sh / 2 + 122);
  ctx.fillStyle = ink;
  ctx.font = `italic 900 200px ${SPRAY_FONT}`;
  ctx.fillText(name, 0, 90, sw - 100);
  // A corner peeling off.
  ctx.fillStyle = '#e9e5dc';
  ctx.beginPath();
  ctx.moveTo(sw / 2, sh / 2 - 90);
  ctx.lineTo(sw / 2 - 90, sh / 2);
  ctx.lineTo(sw / 2 - 40, sh / 2 - 40);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function character(ctx: Ctx, colours: readonly string[], r: () => number) {
  const [skin, ink, white] = colours;
  const cx = W / 2;
  const cy = H * 0.48;
  ctx.lineWidth = 16;
  ctx.strokeStyle = ink;
  ctx.fillStyle = skin;
  // A lumpy round head.
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const rad = 230 + Math.sin(a * 5 + r()) * 12;
    const px = cx + Math.cos(a) * rad * 1.15;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Big mismatched eyes.
  for (const [ex, er] of [
    [-95, 70],
    [100, 52],
  ]) {
    ctx.fillStyle = white;
    ctx.beginPath();
    ctx.arc(cx + ex, cy - 50, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(cx + ex + 14, cy - 40, er * 0.38, 0, Math.PI * 2);
    ctx.fill();
  }
  // A wide grin with teeth.
  ctx.fillStyle = white;
  ctx.beginPath();
  ctx.moveTo(cx - 150, cy + 60);
  ctx.quadraticCurveTo(cx, cy + 230, cx + 150, cy + 60);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 8;
  for (const tx of [-70, 0, 70]) {
    ctx.beginPath();
    ctx.moveTo(cx + tx, cy + 70);
    ctx.lineTo(cx + tx, cy + 130);
    ctx.stroke();
  }
  ctx.fillStyle = skin;
  ctx.strokeStyle = skin;
  for (let i = 0; i < 5; i++)
    drip(ctx, cx - 200 + r() * 400, cy + 200, 40 + r() * 90, 8);
}

function heart(
  ctx: Ctx,
  names: readonly string[],
  colour: string,
  r: () => number,
) {
  const cx = W / 2;
  const cy = H * 0.5;
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 12;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy + 240);
  ctx.bezierCurveTo(cx - 460, cy - 60, cx - 200, cy - 330, cx, cy - 140);
  ctx.bezierCurveTo(cx + 200, cy - 330, cx + 460, cy - 60, cx, cy + 240);
  ctx.stroke();
  // An arrow through it.
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(cx - 420, cy + 150);
  ctx.lineTo(cx + 420, cy - 170);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 440, cy - 178);
  ctx.lineTo(cx + 380, cy - 190);
  ctx.lineTo(cx + 405, cy - 135);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `italic 900 96px ${SPRAY_FONT}`;
  ctx.save();
  ctx.translate(cx, cy - 10);
  ctx.rotate((r() - 0.5) * 0.15);
  ctx.fillText(`${names[0]} 4`, 0, -50);
  ctx.fillText(names[1], 0, 50);
  ctx.restore();
}

function crossed(
  ctx: Ctx,
  names: readonly string[],
  colours: readonly string[],
  r: () => number,
) {
  const [first, second] = colours;
  ctx.save();
  tag(ctx, names[0], first, r);
  ctx.restore();
  // Gone over: a line through it, and the rival's tag sprayed across.
  ctx.strokeStyle = second;
  ctx.lineWidth = 22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(W * 0.12, H * 0.62);
  ctx.lineTo(W * 0.9, H * 0.38);
  ctx.stroke();
  ctx.save();
  ctx.translate(W * 0.08, -H * 0.18);
  ctx.rotate(-0.12);
  ctx.scale(0.62, 0.62);
  ctx.translate(W * 0.35, H * 0.4);
  tag(ctx, names[1], second, r);
  ctx.restore();
}

function message(
  ctx: Ctx,
  lines: readonly string[],
  colour: string,
  r: () => number,
) {
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.textBaseline = 'middle';
  const size = lines.length > 2 ? 120 : 150;
  const step = size * 1.15;
  const top = H / 2 - ((lines.length - 1) * step) / 2;
  lines.forEach((line, i) => {
    ctx.save();
    // Each line further along and a little askew, written in a hurry.
    ctx.translate(W * (0.12 + i * 0.06 + r() * 0.05), top + i * step);
    ctx.rotate(-0.08 + (r() - 0.5) * 0.12);
    ctx.font = `700 ${size * (0.9 + r() * 0.2)}px ${SPRAY_FONT}`;
    ctx.fillText(line, 0, 0, W * 0.8);
    ctx.restore();
  });
  // Underlined, twice, hard.
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const y = top + (lines.length - 0.45) * step + i * 18;
    ctx.beginPath();
    ctx.moveTo(W * 0.16, y + r() * 10);
    ctx.lineTo(W * 0.8, y - 14 + r() * 10);
    ctx.stroke();
  }
}

function roller(ctx: Ctx, text: string, colour: string, r: () => number) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 ${H * 0.82}px ${STENCIL_FONT}`;
  ctx.fillStyle = colour;
  ctx.fillText(text, W / 2, H * 0.86, W * 0.94);
  // The roller's streaks: lighter and darker bands across each stroke.
  ctx.globalCompositeOperation = 'source-atop';
  for (let y = 0; y < H; y += 6 + r() * 10) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';
    ctx.fillRect(0, y, W, 2 + r() * 5);
  }
  // Ragged edges where the roller ran dry.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 260; i++) {
    ctx.beginPath();
    ctx.arc(W * r(), H * r(), 2 + r() * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  for (let i = 0; i < 6; i++)
    drip(ctx, W * (0.1 + r() * 0.8), H * 0.85, 20 + r() * 60, 9);
}

/** Draw `piece` filling a `W` × `H` canvas, on a clear ground. */
export function drawGraffiti(ctx: Ctx, piece: GraffitiPiece) {
  const r = seeded(piece.seed);
  const [main] = piece.colours;
  ctx.save();
  switch (piece.kind) {
    case 'tag':
      tag(ctx, piece.text[0], main, r);
      break;
    case 'throwup':
      throwup(ctx, piece.text[0], piece.colours, r);
      break;
    case 'piece':
      pieceArt(ctx, piece.text[0], piece.colours, r);
      break;
    case 'stencil':
      stencil(ctx, piece.text, main, r);
      break;
    case 'sticker':
      sticker(ctx, piece.text[0], piece.colours, r);
      break;
    case 'character':
      character(ctx, piece.colours, r);
      break;
    case 'heart':
      heart(ctx, piece.text, main, r);
      break;
    case 'crossed':
      crossed(ctx, piece.text, piece.colours, r);
      break;
    case 'message':
      message(ctx, piece.text, main, r);
      break;
    case 'roller':
      roller(ctx, piece.text[0], main, r);
      break;
  }
  ctx.restore();
}

/** Each piece's texture, drawn once and shared by everything it is on. */
const textures = new Map<string, CanvasTexture>();
export function graffitiTexture(art: GraffitiPiece) {
  let texture = textures.get(art.id);
  if (!texture) {
    const made = createCanvasTexture(W, H);
    drawGraffiti(made.context, art);
    texture = made.texture;
    textures.set(art.id, texture);
  }
  return texture;
}
