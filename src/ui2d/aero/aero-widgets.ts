import type { Rect } from '../geometry';
import { wrapLines } from './logic/aero-layout';

/**
 * The Aero kit's widgets (mission 113, `doc/plans/113/a-aero-widget-kit.md`):
 * an original widget set in the spirit of mid-2000s glossy desktop
 * interfaces ("Frutiger Aero"): glass panels and title bars with a bright
 * top highlight, rounded glossy buttons, round scroll arrows, soft blue
 * selections, aqua, sky blue and fresh green, bubbles, droplets and leaves.
 * Immediate mode: each function draws one widget into a rectangle of a
 * Canvas 2D context, from its arguments alone; the host draws a whole
 * screen when its state's key changes (`RedrawGate`). No assets: every
 * shape is drawn here.
 */

type Ctx = CanvasRenderingContext2D;

/** The kit's palette and type. */
export const AERO = {
  font: '"Segoe UI", "Selawik", "Open Sans", "Helvetica Neue", Arial, sans-serif',
  ink: '#0d2f4a',
  inkSoft: '#3b6585',
  inkOnDark: '#ffffff',
  skyTop: '#e9f7ff',
  skyMid: '#a9dcf7',
  skyLow: '#3d9fd1',
  glass: 'rgba(255,255,255,0.42)',
  glassEdge: 'rgba(30,80,120,0.45)',
  highlight: 'rgba(255,255,255,0.95)',
  selectTop: '#d5efff',
  selectLow: '#7cc0ef',
  selectEdge: '#4f9fd8',
  tints: {
    aqua: ['#bfe9ff', '#58b8ea', '#1f7fbf', '#0f5d93'],
    green: ['#d8f5b3', '#86d143', '#3f9a1c', '#2b7311'],
    red: ['#ffd0c8', '#f0705c', '#c3301e', '#8f1d10'],
    amber: ['#ffefc0', '#ffc94a', '#e09312', '#a8680a'],
    grey: ['#f4f7f9', '#c9d3da', '#8d9aa5', '#5f6c76'],
  },
} as const;

export type Tint = keyof typeof AERO.tints;
export type ButtonState =
  | 'normal'
  | 'hover'
  | 'pressed'
  | 'selected'
  | 'disabled';

export const aeroFont = (px: number, weight = 400) =>
  `${weight} ${px}px ${AERO.font}`;

function rounded(ctx: Ctx, r: Rect, radius: number) {
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, Math.min(radius, r.h / 2, r.w / 2));
}

/** A tiny seeded random source, so a background is the same every draw. */
function seeded(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** The sky-to-aqua ground: a sweep of light, bubbles, droplets and two leaves. Static. */
export function drawAeroBackground(ctx: Ctx, r: Rect, seed = 1) {
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, AERO.skyTop);
  g.addColorStop(0.55, AERO.skyMid);
  g.addColorStop(1, AERO.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // A broad swoosh of light.
  ctx.save();
  ctx.globalAlpha = 0.35;
  const sw = ctx.createLinearGradient(r.x, r.y + r.h, r.x + r.w, r.y);
  sw.addColorStop(0, 'rgba(255,255,255,0)');
  sw.addColorStop(0.5, 'rgba(255,255,255,1)');
  sw.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sw;
  ctx.beginPath();
  ctx.moveTo(r.x, r.y + r.h * 0.78);
  ctx.bezierCurveTo(
    r.x + r.w * 0.35,
    r.y + r.h * 0.45,
    r.x + r.w * 0.65,
    r.y + r.h * 0.95,
    r.x + r.w,
    r.y + r.h * 0.55,
  );
  ctx.lineTo(r.x + r.w, r.y + r.h * 0.68);
  ctx.bezierCurveTo(
    r.x + r.w * 0.65,
    r.y + r.h * 1.05,
    r.x + r.w * 0.35,
    r.y + r.h * 0.6,
    r.x,
    r.y + r.h * 0.9,
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const rnd = seeded(seed * 7919);
  // Two leaves, low in the corners.
  drawLeaf(ctx, r.x + r.w * 0.06, r.y + r.h * 0.93, r.h * 0.16, -0.7);
  drawLeaf(ctx, r.x + r.w * 0.94, r.y + r.h * 0.9, r.h * 0.12, 0.9 + rnd());
  // Bubbles.
  for (let i = 0; i < 9; i++) {
    const br = r.h * (0.012 + rnd() * 0.04);
    drawBubble(ctx, r.x + rnd() * r.w, r.y + r.h * (0.25 + rnd() * 0.75), br);
  }
  // Droplets.
  for (let i = 0; i < 5; i++)
    drawDroplet(
      ctx,
      r.x + rnd() * r.w,
      r.y + rnd() * r.h * 0.6,
      r.h * (0.012 + rnd() * 0.01),
    );
}

/** A soft bubble: a pale disc, a bright rim and a crescent highlight. */
export function drawBubble(ctx: Ctx, x: number, y: number, r: number) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.05)');
  g.addColorStop(0.85, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0.7)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(
    x - r * 0.35,
    y - r * 0.4,
    r * 0.32,
    r * 0.16,
    -0.6,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

/** A water droplet: a teardrop, clear with a light catch. */
export function drawDroplet(ctx: Ctx, x: number, y: number, r: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.strokeStyle = 'rgba(40,110,160,0.35)';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.8);
  ctx.bezierCurveTo(x + r * 1.2, y - r * 0.2, x + r, y + r, x, y + r);
  ctx.bezierCurveTo(x - r, y + r, x - r * 1.2, y - r * 0.2, x, y - r * 1.8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A fresh green leaf, its midrib lighter. */
export function drawLeaf(
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  angle: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const g = ctx.createLinearGradient(0, -size * 0.3, 0, size * 0.3);
  g.addColorStop(0, '#b8ec7a');
  g.addColorStop(1, '#3f9a1c');
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.quadraticCurveTo(0, -size * 0.55, size, 0);
  ctx.quadraticCurveTo(0, size * 0.55, -size, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(240,255,220,0.8)';
  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.beginPath();
  ctx.moveTo(-size * 0.9, 0);
  ctx.lineTo(size * 0.9, 0);
  ctx.stroke();
  ctx.restore();
}

/** A glass panel: translucent, a bright top line, its upper part glossier. */
export function drawGlassPanel(
  ctx: Ctx,
  r: Rect,
  opts: { radius?: number; tint?: string; strength?: number } = {},
) {
  const radius = opts.radius ?? 12;
  const k = opts.strength ?? 1;
  ctx.save();
  rounded(ctx, r, radius);
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, `rgba(255,255,255,${0.62 * k})`);
  g.addColorStop(1, `rgba(255,255,255,${0.3 * k})`);
  ctx.fillStyle = g;
  ctx.fill();
  if (opts.tint) {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = opts.tint;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = AERO.glassEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // The gloss over the upper part.
  ctx.save();
  ctx.clip();
  const gloss = ctx.createLinearGradient(0, r.y, 0, r.y + r.h * 0.45);
  gloss.addColorStop(0, 'rgba(255,255,255,0.55)');
  gloss.addColorStop(1, 'rgba(255,255,255,0.08)');
  ctx.fillStyle = gloss;
  ctx.fillRect(r.x, r.y, r.w, Math.min(r.h * 0.45, 60));
  ctx.restore();
  // The bright top highlight.
  ctx.strokeStyle = AERO.highlight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(r.x + radius, r.y + 1.5);
  ctx.lineTo(r.x + r.w - radius, r.y + 1.5);
  ctx.stroke();
  ctx.restore();
}

/** Text set in the kit's type. */
export function drawText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  opts: {
    size?: number;
    weight?: number;
    colour?: string;
    align?: CanvasTextAlign;
    glow?: boolean;
    maxWidth?: number;
  } = {},
) {
  ctx.save();
  ctx.font = aeroFont(opts.size ?? 16, opts.weight ?? 400);
  ctx.fillStyle = opts.colour ?? AERO.ink;
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = 'middle';
  if (opts.glow) {
    ctx.shadowColor = 'rgba(255,255,255,0.95)';
    ctx.shadowBlur = 6;
  }
  ctx.fillText(text, x, y, opts.maxWidth);
  ctx.restore();
}

/** A glass title strip, its title glowing, an optional mark drawn at its left. */
export function drawTitleBar(
  ctx: Ctx,
  r: Rect,
  title: string,
  opts: { mark?: (ctx: Ctx, x: number, y: number, r: number) => void } = {},
) {
  ctx.save();
  rounded(ctx, r, 10);
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.5, 'rgba(200,232,250,0.7)');
  g.addColorStop(0.51, 'rgba(150,205,240,0.65)');
  g.addColorStop(1, 'rgba(120,190,235,0.75)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = AERO.glassEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  let x = r.x + 14;
  if (opts.mark) {
    opts.mark(ctx, x + r.h * 0.32, r.y + r.h / 2, r.h * 0.34);
    x += r.h * 0.8;
  }
  drawText(ctx, title, x, r.y + r.h / 2 + 1, {
    size: Math.round(r.h * 0.48),
    weight: 600,
    glow: true,
  });
}

/** A glossy button: pill or rounded; its state glows, darkens or greys it. */
export function drawGlossyButton(
  ctx: Ctx,
  r: Rect,
  label: string,
  opts: {
    state?: ButtonState;
    tint?: Tint;
    shape?: 'pill' | 'rounded';
    size?: number;
  } = {},
) {
  const state = opts.state ?? 'normal';
  const [light, mid, deep, edge] =
    AERO.tints[state === 'selected' ? 'aqua' : (opts.tint ?? 'aqua')];
  const radius = opts.shape === 'rounded' ? 10 : r.h / 2;
  ctx.save();
  if (state === 'disabled') ctx.globalAlpha = 0.45;
  if (state === 'hover' || state === 'selected') {
    ctx.shadowColor = 'rgba(80,200,255,0.9)';
    ctx.shadowBlur = 14;
  }
  rounded(ctx, r, radius);
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  if (state === 'pressed') {
    g.addColorStop(0, deep);
    g.addColorStop(0.5, mid);
    g.addColorStop(1, light);
  } else {
    g.addColorStop(0, light);
    g.addColorStop(0.48, mid);
    g.addColorStop(0.52, deep);
    g.addColorStop(1, mid);
  }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // The gloss on its upper half.
  if (state !== 'pressed') {
    ctx.save();
    ctx.clip();
    const gl = ctx.createLinearGradient(0, r.y, 0, r.y + r.h * 0.5);
    gl.addColorStop(0, 'rgba(255,255,255,0.85)');
    gl.addColorStop(1, 'rgba(255,255,255,0.15)');
    ctx.fillStyle = gl;
    rounded(ctx, { x: r.x + 3, y: r.y + 2, w: r.w - 6, h: r.h * 0.46 }, radius);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  drawText(
    ctx,
    label,
    r.x + r.w / 2,
    r.y + r.h / 2 + (state === 'pressed' ? 2 : 1),
    {
      size: opts.size ?? Math.round(r.h * 0.42),
      weight: 600,
      colour:
        opts.tint === 'grey' && state !== 'selected'
          ? AERO.ink
          : AERO.inkOnDark,
      align: 'center',
      maxWidth: r.w - 10,
    },
  );
}

/** A round glassy scroll button with a chevron. */
export function drawScrollArrow(
  ctx: Ctx,
  cx: number,
  cy: number,
  radius: number,
  direction: 'up' | 'down' | 'left' | 'right',
  state: ButtonState = 'normal',
) {
  drawGlossyButton(
    ctx,
    { x: cx - radius, y: cy - radius, w: radius * 2, h: radius * 2 },
    '',
    { state, tint: 'aqua' },
  );
  ctx.save();
  if (state === 'disabled') ctx.globalAlpha = 0.45;
  ctx.translate(cx, cy + (state === 'pressed' ? 1 : 0));
  ctx.rotate(
    { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[direction],
  );
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = radius * 0.22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-radius * 0.38, radius * 0.18);
  ctx.lineTo(0, -radius * 0.22);
  ctx.lineTo(radius * 0.38, radius * 0.18);
  ctx.stroke();
  ctx.restore();
}

/** A soft blue selection highlight, as a selected list row has. */
export function drawSelection(ctx: Ctx, r: Rect) {
  ctx.save();
  rounded(ctx, r, 6);
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, AERO.selectTop);
  g.addColorStop(1, AERO.selectLow);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = AERO.selectEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(r.x + 6, r.y + 1.5);
  ctx.lineTo(r.x + r.w - 6, r.y + 1.5);
  ctx.stroke();
  ctx.restore();
}

/** A list: rows in a glass panel, one selected, a scroll track at the right. */
export function drawList(
  ctx: Ctx,
  r: Rect,
  items: readonly string[],
  opts: {
    shown: readonly number[];
    selected: number;
    rowHeight: number;
    thumb: { at: number; size: number };
    size?: number;
  },
) {
  drawGlassPanel(ctx, r, { radius: 10 });
  const inner = { x: r.x + 6, y: r.y + 6, w: r.w - 24, h: r.h - 12 };
  opts.shown.forEach((index, i) => {
    const row = {
      x: inner.x,
      y: inner.y + i * opts.rowHeight,
      w: inner.w,
      h: opts.rowHeight - 2,
    };
    if (index === opts.selected) drawSelection(ctx, row);
    else if (i % 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(row.x, row.y, row.w, row.h);
    }
    drawText(ctx, items[index], row.x + 10, row.y + row.h / 2, {
      size: opts.size ?? Math.round(opts.rowHeight * 0.5),
      weight: index === opts.selected ? 600 : 400,
      maxWidth: row.w - 16,
    });
  });
  // The scroll track and thumb.
  const track = { x: r.x + r.w - 14, y: r.y + 8, w: 6, h: r.h - 16 };
  ctx.fillStyle = 'rgba(20,70,110,0.15)';
  rounded(ctx, track, 3);
  ctx.fill();
  ctx.fillStyle = AERO.selectEdge;
  rounded(
    ctx,
    {
      x: track.x,
      y: track.y + track.h * opts.thumb.at,
      w: track.w,
      h: Math.max(8, track.h * opts.thumb.size),
    },
    3,
  );
  ctx.fill();
}

/** Word-wrapped text in a rectangle; the lines that fit, the last ellipsised. */
export function drawTextBlock(
  ctx: Ctx,
  r: Rect,
  text: string,
  opts: {
    size?: number;
    weight?: number;
    colour?: string;
    lineHeight?: number;
  } = {},
) {
  const size = opts.size ?? 15;
  const lh = opts.lineHeight ?? Math.round(size * 1.3);
  ctx.save();
  ctx.font = aeroFont(size, opts.weight ?? 400);
  const lines = wrapLines(
    text,
    r.w,
    (s) => ctx.measureText(s).width,
    Math.max(1, Math.floor(r.h / lh)),
  );
  ctx.restore();
  lines.forEach((line, i) =>
    drawText(ctx, line, r.x, r.y + lh * (i + 0.5), {
      size,
      weight: opts.weight,
      colour: opts.colour,
    }),
  );
  return lines.length;
}

/** A segmented selector: glossy segments in one pill, the chosen one selected. */
export function drawSegmented(
  ctx: Ctx,
  segments: readonly Rect[],
  labels: readonly string[],
  selected: number,
  pressed: number | null = null,
) {
  segments.forEach((r, i) =>
    drawGlossyButton(ctx, r, labels[i], {
      state: i === pressed ? 'pressed' : i === selected ? 'selected' : 'normal',
      tint: 'grey',
      shape: 'rounded',
      size: Math.round(r.h * 0.3),
    }),
  );
}

/** A progress or status bar: a recessed glass track, a glossy fill, a label over it. */
export function drawProgressBar(
  ctx: Ctx,
  r: Rect,
  fraction: number,
  label: string,
  tint: Tint = 'green',
) {
  ctx.save();
  rounded(ctx, r, r.h / 2);
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, 'rgba(20,60,90,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = AERO.glassEdge;
  ctx.stroke();
  ctx.restore();
  const f = Math.max(0, Math.min(1, fraction));
  if (f > 0)
    drawGlossyButton(
      ctx,
      {
        x: r.x + 2,
        y: r.y + 2,
        w: Math.max(r.h - 4, (r.w - 4) * f),
        h: r.h - 4,
      },
      '',
      { tint },
    );
  drawText(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 1, {
    size: Math.round(r.h * 0.5),
    weight: 600,
    align: 'center',
    glow: true,
  });
}

/**
 * A score bar: a recessed glass track washed faintly red to amber to green
 * along its length, the score's share of it lit in that gradient at full
 * strength with a glossy highlight, a label over it. `fraction` 0..1.
 */
export function drawScoreBar(
  ctx: Ctx,
  r: Rect,
  fraction: number,
  label: string,
) {
  const sweep = (alpha: number) => {
    const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
    const [red, amber, green] = [
      AERO.tints.red[2],
      AERO.tints.amber[1],
      AERO.tints.green[1],
    ];
    g.addColorStop(0, red);
    g.addColorStop(0.5, amber);
    g.addColorStop(1, green);
    ctx.globalAlpha = alpha;
    return g;
  };
  ctx.save();
  rounded(ctx, r, r.h / 2);
  const well = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  well.addColorStop(0, 'rgba(20,60,90,0.35)');
  well.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = well;
  ctx.fill();
  ctx.fillStyle = sweep(0.28);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = AERO.glassEdge;
  ctx.stroke();
  const f = Math.max(0, Math.min(1, fraction));
  if (f > 0) {
    const inner = {
      x: r.x + 2,
      y: r.y + 2,
      w: Math.max(r.h - 4, (r.w - 4) * f),
      h: r.h - 4,
    };
    rounded(ctx, inner, inner.h / 2);
    ctx.fillStyle = sweep(1);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(40,40,20,0.35)';
    ctx.stroke();
    ctx.clip();
    const gloss = ctx.createLinearGradient(0, inner.y, 0, inner.y + inner.h);
    gloss.addColorStop(0, 'rgba(255,255,255,0.85)');
    gloss.addColorStop(0.48, 'rgba(255,255,255,0.25)');
    gloss.addColorStop(0.5, 'rgba(255,255,255,0)');
    gloss.addColorStop(1, 'rgba(255,255,255,0.18)');
    ctx.fillStyle = gloss;
    ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
  }
  ctx.restore();
  drawText(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 1, {
    size: Math.round(r.h * 0.5),
    weight: 600,
    align: 'center',
    glow: true,
    maxWidth: r.w - 16,
  });
}

/** A big status banner: a tinted glass slab, a headline and lines beneath. */
export function drawBanner(
  ctx: Ctx,
  r: Rect,
  headline: string,
  lines: string,
  tint: Tint = 'green',
) {
  const [light, mid, deep, edge] = AERO.tints[tint];
  ctx.save();
  rounded(ctx, r, 16);
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, light);
  g.addColorStop(0.35, mid);
  g.addColorStop(1, deep);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = g;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.clip();
  const gl = ctx.createLinearGradient(0, r.y, 0, r.y + r.h * 0.4);
  gl.addColorStop(0, 'rgba(255,255,255,0.7)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(r.x, r.y, r.w, r.h * 0.4);
  ctx.restore();
  drawText(ctx, headline, r.x + r.w / 2, r.y + 34, {
    size: 30,
    weight: 700,
    colour: AERO.inkOnDark,
    align: 'center',
  });
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 3;
  drawTextBlock(
    ctx,
    { x: r.x + 18, y: r.y + 58, w: r.w - 36, h: r.h - 64 },
    lines,
    { size: 16, colour: AERO.inkOnDark, weight: 500 },
  );
  ctx.restore();
}

/** The maker's strip: a glossy band, the maker's mark and wordmark, the product's name. */
export function drawMakerStrip(
  ctx: Ctx,
  r: Rect,
  maker: string,
  product: string,
  mark?: (ctx: Ctx, x: number, y: number, r: number) => void,
) {
  ctx.save();
  rounded(ctx, r, r.h / 2);
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, '#5cc2ef');
  g.addColorStop(0.5, '#1d86c6');
  g.addColorStop(0.51, '#0f6aa8');
  g.addColorStop(1, '#2b9ad6');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const gl = ctx.createLinearGradient(0, r.y, 0, r.y + r.h / 2);
  gl.addColorStop(0, 'rgba(255,255,255,0.65)');
  gl.addColorStop(1, 'rgba(255,255,255,0.1)');
  ctx.fillStyle = gl;
  ctx.fillRect(r.x, r.y, r.w, r.h / 2);
  ctx.restore();
  let x = r.x + r.h * 0.6;
  if (mark) {
    mark(ctx, x, r.y + r.h / 2, r.h * 0.36);
    x += r.h * 0.55;
  }
  drawText(ctx, maker, x, r.y + r.h / 2 + 1, {
    size: Math.round(r.h * 0.42),
    weight: 700,
    colour: AERO.inkOnDark,
  });
  drawText(ctx, product, r.x + r.w - r.h * 0.5, r.y + r.h / 2 + 1, {
    size: Math.round(r.h * 0.4),
    weight: 400,
    colour: AERO.inkOnDark,
    align: 'right',
  });
}
