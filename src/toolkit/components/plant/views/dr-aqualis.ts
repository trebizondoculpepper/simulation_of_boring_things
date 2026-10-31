import { AERO, aeroFont, wrapLines } from '../../../../ui2d/aero';
import { figureIn } from '../logic/dr-aqualis';
import type { ArmPose, Box, DrAqualisPose, Side } from '../logic/dr-aqualis';

/**
 * Dr Aqualis drawn (mission 114): the Aqualis water drop come to life, a
 * glossy blue droplet with a face, in a white lab coat with a head mirror
 * and stethoscope, holding a clipboard; and his Aero speech bubble. Canvas
 * 2D paths and gradients only, no images. The pose comes from
 * `logic/dr-aqualis.ts`; draw him only when its key changes.
 */

type Ctx = CanvasRenderingContext2D;

/** Where a shoulder sits, in his units (100 to his height, origin on the ground beneath him). */
const SHOULDER = { x: 30, y: -36 };
/** An arm's full length. */
const ARM = 29;
const INK = '#0d2f4a';
const COAT_EDGE = '#8fa4b4';

/** The drop's outline: a round belly and a point on top. */
function dropPath(ctx: Ctx) {
  const R = 38;
  const cy = -40;
  ctx.beginPath();
  ctx.moveTo(0, -110);
  ctx.bezierCurveTo(R * 0.22, -94, R * 1.02, -72, R, cy);
  ctx.arc(0, cy, R, 0, Math.PI);
  ctx.bezierCurveTo(-R * 1.02, -72, -R * 0.22, -94, 0, -110);
  ctx.closePath();
}

const sideSign = (s: Side) => (s === 'right' ? 1 : -1);

/** Where an arm's hand is, in his units. */
function handOf(side: Side, arm: ArmPose) {
  const s = sideSign(side);
  const len = ARM * arm.reach;
  return {
    x: s * SHOULDER.x + s * Math.sin(arm.angle) * len,
    y: SHOULDER.y + Math.cos(arm.angle) * len,
  };
}

function sleeve(ctx: Ctx, side: Side, hx: number, hy: number) {
  const sx = sideSign(side) * SHOULDER.x;
  const sy = SHOULDER.y;
  // A slight elbow, bowed outward and down.
  const mx = (sx + hx) / 2 + sideSign(side) * 3;
  const my = (sy + hy) / 2 + 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(mx, my, hx, hy);
  ctx.strokeStyle = COAT_EDGE;
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8.4;
  ctx.stroke();
  // The sleeve's shading along its underside.
  ctx.strokeStyle = 'rgba(150,175,195,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sx, sy + 2.5);
  ctx.quadraticCurveTo(mx, my + 2.5, hx, hy + 2);
  ctx.stroke();
}

/** A glossy blue blob: hands and the like. */
function blueBlob(ctx: Ctx, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(
    x - r * 0.4,
    y - r * 0.4,
    r * 0.1,
    x,
    y,
    r * 1.1,
  );
  g.addColorStop(0, '#d6f1ff');
  g.addColorStop(0.45, '#4fb0e6');
  g.addColorStop(1, '#13679f');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#0b4f80';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function capsule(
  ctx: Ctx,
  x: number,
  y: number,
  dx: number,
  dy: number,
  len: number,
  w: number,
) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx * len, y + dy * len);
  ctx.strokeStyle = '#0b4f80';
  ctx.lineWidth = w + 2.2;
  ctx.stroke();
  ctx.strokeStyle = '#49aae2';
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = w * 0.3;
  ctx.beginPath();
  ctx.moveTo(x - dy * w * 0.2, y + dx * w * 0.2 - 0.5);
  ctx.lineTo(x + dx * len * 0.9 - dy * w * 0.2, y + dy * len * 0.9 - 0.5);
  ctx.stroke();
}

function hand(ctx: Ctx, side: Side, arm: ArmPose, hx: number, hy: number) {
  const s = sideSign(side);
  const dx = s * Math.sin(arm.angle);
  const dy = Math.cos(arm.angle);
  if (arm.hand === 'point') capsule(ctx, hx, hy, dx, dy, 8, 3.4);
  if (arm.hand === 'thumb') capsule(ctx, hx - s * 1, hy - 3, 0, -1, 8.5, 4.4);
  blueBlob(ctx, hx, hy, arm.hand === 'open' ? 5.6 : 5);
  if (arm.hand === 'open') {
    // A suggestion of fingers.
    ctx.strokeStyle = 'rgba(11,79,128,0.6)';
    ctx.lineWidth = 0.9;
    for (const k of [-1.6, 1.6]) {
      ctx.beginPath();
      ctx.moveTo(hx + k, hy + 2);
      ctx.lineTo(hx + k, hy + 4.6);
      ctx.stroke();
    }
  }
}

/** The clipboard's centre and tilt for the hand that holds it. */
function clipboardAt(
  side: Side,
  arm: ArmPose,
  hx: number,
  hy: number,
  lift: number,
) {
  const s = sideSign(side);
  if (arm.angle > 1.2)
    return { x: hx - s * 3, y: hy - 13, tilt: s * 0.25, w: 18, h: 23 };
  return {
    x: hx - s * (11 + lift * 2),
    y: hy - 5 - lift * 4,
    tilt: -s * (0.12 + 0.18 * lift),
    w: 20,
    h: 26,
  };
}

function clipboard(
  ctx: Ctx,
  c: { x: number; y: number; tilt: number; w: number; h: number },
) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.tilt);
  const { w, h } = c;
  // Board.
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#d39a5a');
  g.addColorStop(1, '#9a6430');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#5e3a17';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 2);
  ctx.fill();
  ctx.stroke();
  // Paper.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-w / 2 + 2, -h / 2 + 3.5, w - 4, h - 5.5);
  ctx.strokeStyle = '#8ec3e6';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 5; i++) {
    const y = -h / 2 + 8 + i * 3.6;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, y);
    ctx.lineTo(w / 2 - (i % 2 ? 7 : 4), y);
    ctx.stroke();
  }
  // A tick, the Aqualis green.
  ctx.strokeStyle = '#3f9a1c';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 7, h / 2 - 6);
  ctx.lineTo(w / 2 - 5.5, h / 2 - 4.2);
  ctx.lineTo(w / 2 - 3, h / 2 - 8);
  ctx.stroke();
  // Clip.
  const cg = ctx.createLinearGradient(0, -h / 2 - 2, 0, -h / 2 + 4);
  cg.addColorStop(0, '#f4f7f9');
  cg.addColorStop(1, '#8d9aa5');
  ctx.fillStyle = cg;
  ctx.strokeStyle = '#5f6c76';
  ctx.beginPath();
  ctx.roundRect(-5, -h / 2 - 2, 10, 5.5, 1.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function eye(ctx: Ctx, cx: number, cy: number, p: DrAqualisPose) {
  if (p.eyeSmile) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy + 3, 6, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    return;
  }
  const rx = 7.2 * (p.eyeOpen > 1 ? 1 + (p.eyeOpen - 1) * 0.5 : 1);
  const ry = 9.2 * p.eyeOpen;
  if (p.eyeOpen < 0.2) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 1);
    ctx.quadraticCurveTo(cx, cy + 4, cx + 6, cy + 1);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(11,60,100,0.8)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.clip();
  const pr = p.eyeOpen > 1.15 ? 3.4 : 4.4;
  const px = cx + p.pupil.x * (rx - pr - 0.6);
  const py = cy + p.pupil.y * (ry - pr - 0.6);
  const g = ctx.createRadialGradient(px, py, 0.5, px, py, pr);
  g.addColorStop(0, '#2c6c9c');
  g.addColorStop(1, INK);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px - pr * 0.35, py - pr * 0.4, pr * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function brows(ctx: Ctx, p: DrAqualisPose) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  const y = -71 - p.browLift * 4 - (p.eyeOpen > 1 ? 3 : 0);
  for (const s of [-1, 1]) {
    const inner = { x: s * 6, y: y + p.brow * 3 };
    const outer = { x: s * 17, y: y - p.brow * 1.2 + 1 };
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.quadraticCurveTo(
      s * 11.5,
      (inner.y + outer.y) / 2 - 1.6,
      outer.x,
      outer.y,
    );
    ctx.stroke();
  }
}

function mouth(ctx: Ctx, p: DrAqualisPose) {
  const y = -43;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (p.mouth === 'o') {
    ctx.fillStyle = '#4a1526';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, y + 1, 3.8, 3 + 4 * p.mouthOpen, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }
  const w = p.mouth === 'grin' ? 9 : 7;
  const curve = p.smile * 7;
  if (p.mouthOpen < 0.15) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.moveTo(-w, y - curve * 0.25);
    ctx.quadraticCurveTo(0, y + curve, w, y - curve * 0.25);
    ctx.stroke();
    return;
  }
  const open = p.mouthOpen * 9;
  ctx.beginPath();
  ctx.moveTo(-w, y - curve * 0.3);
  ctx.quadraticCurveTo(0, y + curve * 0.25, w, y - curve * 0.3);
  ctx.quadraticCurveTo(0, y + curve + open, -w, y - curve * 0.3);
  ctx.closePath();
  ctx.fillStyle = '#4a1526';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ff8a9a';
  ctx.beginPath();
  ctx.ellipse(0, y + curve * 0.6 + open * 0.75, w * 0.55, open * 0.45, 0, 0, 7);
  ctx.fill();
  if (p.mouth === 'grin') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-w, y - curve * 0.3 - 2, w * 2, 3.2);
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

function coat(ctx: Ctx) {
  ctx.save();
  dropPath(ctx);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(-60, -33);
  ctx.lineTo(-13, -33);
  ctx.lineTo(0, -12);
  ctx.lineTo(13, -33);
  ctx.lineTo(60, -33);
  ctx.lineTo(60, 10);
  ctx.lineTo(-60, 10);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -33, 0, 0);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#dce6ee');
  ctx.fillStyle = g;
  ctx.fill();
  const shade = ctx.createRadialGradient(-6, -24, 8, 0, -30, 44);
  shade.addColorStop(0, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(90,120,150,0.4)');
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.strokeStyle = COAT_EDGE;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Lapels.
  ctx.beginPath();
  ctx.moveTo(-13, -33);
  ctx.lineTo(-21, -21);
  ctx.lineTo(-6, -20);
  ctx.moveTo(13, -33);
  ctx.lineTo(21, -21);
  ctx.lineTo(6, -20);
  ctx.stroke();
  // Front edge and buttons.
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.fillStyle = '#b8c6d1';
  for (const y of [-8, -3]) {
    ctx.beginPath();
    ctx.arc(-2.4, y, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // Breast pocket with a pen.
  ctx.fillStyle = '#1d86c6';
  ctx.fillRect(18.5, -22, 1.8, 6);
  ctx.fillStyle = '#c3301e';
  ctx.fillRect(21.2, -21, 1.8, 5);
  ctx.strokeStyle = COAT_EDGE;
  ctx.fillStyle = '#f6f9fb';
  ctx.beginPath();
  ctx.rect(16, -17, 10, 7);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function stethoscope(ctx: Ctx) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3a4650';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, -34);
  ctx.bezierCurveTo(-12, -22, -6, -18, -4, -15);
  ctx.moveTo(14, -34);
  ctx.bezierCurveTo(12, -24, 8, -20, 5, -16);
  ctx.moveTo(-4, -15);
  ctx.quadraticCurveTo(0, -10, 5, -16);
  ctx.moveTo(0.5, -12.5);
  ctx.quadraticCurveTo(-3, -6, 6, -4);
  ctx.stroke();
  const g = ctx.createRadialGradient(6.5, -4.6, 0.3, 7, -4, 3.6);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, '#c9d3da');
  g.addColorStop(1, '#5f6c76');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#3a4650';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(7, -4, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function headMirror(ctx: Ctx) {
  ctx.save();
  dropPath(ctx);
  ctx.clip();
  ctx.strokeStyle = '#3a4650';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-30, -74);
  ctx.quadraticCurveTo(0, -86, 30, -74);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-30, -75.2);
  ctx.quadraticCurveTo(0, -87.2, 30, -75.2);
  ctx.stroke();
  ctx.restore();
  // The mirror, tilted on its band.
  ctx.save();
  ctx.translate(12, -83);
  ctx.rotate(0.35);
  ctx.fillStyle = '#5f6c76';
  ctx.fillRect(-1.5, 2, 3, 4);
  const g = ctx.createRadialGradient(-3, -3, 0.5, 0, 0, 10);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#dfe7ec');
  g.addColorStop(0.85, '#9fb0bc');
  g.addColorStop(1, '#6d7c87');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#3a4650';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, -2, 10, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a333a';
  ctx.beginPath();
  ctx.arc(0, -2, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -2, 6.6, Math.PI * 1.1, Math.PI * 1.45);
  ctx.stroke();
  ctx.restore();
}

function gloss(ctx: Ctx) {
  ctx.save();
  dropPath(ctx);
  ctx.clip();
  // The big Aero shine on his upper left.
  ctx.save();
  ctx.translate(-19, -62);
  ctx.rotate(0.45);
  const g = ctx.createLinearGradient(0, -16, 0, 14);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.5, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(-5, -95, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Light caught along the right rim.
  ctx.strokeStyle = 'rgba(200,240,255,0.55)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, -40, 34.5, -0.95, -0.15);
  ctx.stroke();
  ctx.restore();
}

function sparkle(ctx: Ctx, x: number, y: number, k: number) {
  if (k <= 0.05) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = Math.min(1, k * 1.5);
  const r = 3 + 5 * k;
  ctx.fillStyle = '#fff6b0';
  ctx.strokeStyle = '#e09312';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 ? r * 0.3 : r;
    ctx.lineTo(Math.sin(a) * rr, -Math.cos(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function sweatDrop(ctx: Ctx) {
  ctx.save();
  ctx.translate(31, -70);
  ctx.fillStyle = 'rgba(220,245,255,0.95)';
  ctx.strokeStyle = '#3d9fd1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.bezierCurveTo(3.5, -1, 3.5, 3, 0, 3);
  ctx.bezierCurveTo(-3.5, 3, -3.5, -1, 0, -6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Dr Aqualis in `pose`, standing on the bottom of `box` (pixels), centred,
 * as tall as the box allows (he is about 0.85 of his height wide, arms in).
 */
export function drawDrAqualis(ctx: Ctx, pose: DrAqualisPose, box: Box) {
  const { cx, ground, size } = figureIn(box);
  const u = size / 116;
  const p = pose;
  ctx.save();
  ctx.translate(cx, ground);
  ctx.scale(u, u);
  ctx.translate(0, -4);
  // His shadow, smaller as he leaves the ground.
  const lift = (p.jump + Math.max(0, -p.bob)) * 116;
  const sh = 1 / (1 + lift / 25);
  const sg = ctx.createRadialGradient(0, 2, 1, 0, 2, 34 * sh);
  sg.addColorStop(0, 'rgba(13,47,74,0.35)');
  sg.addColorStop(1, 'rgba(13,47,74,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(0, 2, 34 * sh, 5 * sh, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, (p.bob - p.jump) * 116);
  ctx.rotate(p.lean);
  ctx.scale(p.squash, 1 / p.squash);

  // The drop.
  dropPath(ctx);
  const body = ctx.createRadialGradient(-15, -70, 3, 2, -42, 66);
  body.addColorStop(0, '#e6f7ff');
  body.addColorStop(0.22, '#86d0f4');
  body.addColorStop(0.55, '#3aa2dc');
  body.addColorStop(0.82, '#1d86c6');
  body.addColorStop(1, '#0d5a8f');
  ctx.fillStyle = body;
  ctx.fill();
  coat(ctx);
  stethoscope(ctx);
  gloss(ctx);
  dropPath(ctx);
  ctx.strokeStyle = '#0b4f80';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // His face.
  if (p.eyeSmile || p.mouth === 'grin') {
    ctx.fillStyle = 'rgba(255,120,150,0.35)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 21, -47, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  eye(ctx, -11.5, -58, p);
  eye(ctx, 11.5, -58, p);
  brows(ctx, p);
  mouth(ctx, p);
  headMirror(ctx);
  if (p.sweat) sweatDrop(ctx);

  // Arms: the clipboard's first, then the board, then the other, which taps it.
  const holder = p.clipboard;
  const other: Side = holder === 'left' ? 'right' : 'left';
  const ha = p.arms[holder];
  const h1 = handOf(holder, ha);
  const board = clipboardAt(holder, ha, h1.x, h1.y, p.clipboardLift);
  sleeve(ctx, holder, h1.x, h1.y);
  clipboard(ctx, board);
  hand(ctx, holder, ha, h1.x, h1.y);
  const oa = p.arms[other];
  let h2 = handOf(other, oa);
  if (p.clipboardLift > 0.5 && oa.angle < 0) {
    // Tapping the clipboard: the finger comes down onto the paper.
    const s = sideSign(other);
    h2 = {
      x: board.x + s * (board.w / 2 - 1),
      y: board.y - 2 - (1 - p.clipTap) * 6,
    };
  }
  sleeve(ctx, other, h2.x, h2.y);
  hand(ctx, other, oa, h2.x, h2.y);
  if (p.thumbsUp) {
    const side: Side = p.arms.right.hand === 'thumb' ? 'right' : 'left';
    const h = handOf(side, p.arms[side]);
    sparkle(ctx, h.x + sideSign(side) * 9, h.y - 10, p.sparkle);
  }
  ctx.restore();
}

/** What a speech bubble drew: its lines, and whether any text was cut short. */
export interface BubbleText {
  lines: string[];
  clipped: boolean;
}

export interface BubbleOptions {
  /** Body text size, px (default 20). */
  fontPx?: number;
  /** A bold first line, if any ("Dr Aqualis says"). */
  title?: string;
}

/**
 * An Aero speech bubble in `box` (pixels), its tail reaching to `tail`,
 * with `text` (a string, or paragraphs) wrapped to fit; text that will not
 * fit ends in "…".
 */
export function drawSpeechBubble(
  ctx: Ctx,
  text: string | readonly string[],
  box: Box,
  tail: { x: number; y: number },
  opts: BubbleOptions = {},
): BubbleText {
  const fontPx = opts.fontPx ?? 20;
  const r = Math.min(22, box.h / 2, box.w / 2);
  // The tail's root, on the edge nearest its point.
  const inX = tail.x >= box.x && tail.x <= box.x + box.w;
  const clampY = (v: number) =>
    Math.min(box.y + box.h - r - 14, Math.max(box.y + r + 14, v));
  const clampX = (v: number) =>
    Math.min(box.x + box.w - r - 14, Math.max(box.x + r + 14, v));
  let a: { x: number; y: number };
  let b: { x: number; y: number };
  if (!inX) {
    const ex = tail.x < box.x ? box.x + 6 : box.x + box.w - 6;
    const y = clampY(tail.y);
    a = { x: ex, y: y - 13 };
    b = { x: ex, y: y + 13 };
  } else {
    const ey = tail.y < box.y ? box.y + 6 : box.y + box.h - 6;
    const x = clampX(tail.x);
    a = { x: x - 13, y: ey };
    b = { x: x + 13, y: ey };
  }
  const tailPath = () => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(
      (a.x + tail.x) / 2,
      (a.y + tail.y) / 2 - 4,
      tail.x,
      tail.y,
    );
    ctx.quadraticCurveTo((b.x + tail.x) / 2, (b.y + tail.y) / 2, b.x, b.y);
    ctx.closePath();
  };
  const bodyPath = () => {
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h, r);
  };
  ctx.save();
  // A soft drop shadow.
  ctx.shadowColor = 'rgba(13,47,74,0.3)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#ffffff';
  bodyPath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // Edge, then fill over the joint so tail and body read as one.
  ctx.strokeStyle = AERO.selectEdge;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  tailPath();
  ctx.stroke();
  bodyPath();
  ctx.stroke();
  const g = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#ddf0fc');
  ctx.fillStyle = g;
  tailPath();
  ctx.fill();
  bodyPath();
  ctx.fill();
  // The glass gloss across its top.
  ctx.save();
  bodyPath();
  ctx.clip();
  const gl = ctx.createLinearGradient(0, box.y, 0, box.y + box.h * 0.45);
  gl.addColorStop(0, 'rgba(255,255,255,0.95)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.ellipse(
    box.x + box.w / 2,
    box.y,
    box.w * 0.55,
    box.h * 0.42,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(box.x + 2.5, box.y + 2.5, box.w - 5, box.h - 5, r - 2);
  ctx.stroke();

  // The words.
  const pad = Math.max(12, Math.round(fontPx * 0.9));
  const width = box.w - 2 * pad;
  const lineH = Math.round(fontPx * 1.3);
  let y = box.y + pad;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  if (opts.title) {
    ctx.font = aeroFont(Math.round(fontPx * 1.05), 700);
    ctx.fillStyle = AERO.tints.aqua[3];
    ctx.fillText(opts.title, box.x + pad, y, width);
    y += Math.round(lineH * 1.15);
  }
  ctx.font = aeroFont(fontPx);
  ctx.fillStyle = AERO.ink;
  const room = Math.max(1, Math.floor((box.y + box.h - pad - y) / lineH));
  const measure = (s: string) => ctx.measureText(s).width;
  const paras = typeof text === 'string' ? [text] : text;
  const all: string[] = [];
  for (const para of paras) {
    if (all.length) all.push('');
    all.push(...wrapLines(para, width, measure));
  }
  let lines = all;
  const clipped = all.length > room;
  if (clipped) {
    lines = all.slice(0, room);
    let last = lines[room - 1];
    while (last && measure(`${last}…`) > width) last = last.slice(0, -1);
    lines[room - 1] = `${last.trimEnd()}…`;
  }
  for (const line of lines) {
    ctx.fillText(line, box.x + pad, y);
    y += lineH;
  }
  ctx.restore();
  return { lines, clipped };
}
