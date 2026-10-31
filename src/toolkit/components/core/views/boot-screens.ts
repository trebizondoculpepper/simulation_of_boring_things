import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { CanvasTexture } from 'three';
import type { DisplayKind } from '../logic/display-reach';
import { createCanvasTexture } from './screens';
import { setLcdBacklight } from './display-reach';
import {
  AERO,
  aeroFont,
  drawDroplet,
  drawGlossyButton,
} from '../../../../ui2d/aero/aero-widgets';
import {
  BOOT_NAMES,
  SPINNER_STEPS,
  bootFrame,
  bootScript,
  pixelRect,
} from '../logic/boot-sequence';
import type {
  BootApp,
  BootFamily,
  BootFrame,
  BootScript,
  Tone,
} from '../logic/boot-sequence';

/**
 * The boot screens (`logic/boot-sequence.ts`), drawn onto a 2D canvas of
 * any size: the BIOS's and the consoles' text-mode grids in the period's
 * look, the Windows-like OS's black logo screen with its glossy four-pane
 * orb and its marquee, its aurora Welcome and spinner, its permission
 * dialog, and an application's splash; the firmware's few lines.
 *
 * Each frame is drawn in two parts: its still picture (`drawBootPicture`,
 * when its `pictureKey` changes) and its small live element
 * (`drawBootLive`, when its `liveKey` does), so a host can keep the live
 * element on a small canvas of its own over the screen (`createBootInset`)
 * and upload the big picture rarely. `drawBootScreen` draws both, for a
 * host with one canvas (or a contact sheet). `createBootDisplay` is a
 * whole screen that boots, for walls and benches.
 */

type Ctx = CanvasRenderingContext2D;

export interface BootDrawOptions {
  /** The application's mark on its splash and its permission dialog (Aero's droplet if left out). */
  appMark?(ctx: Ctx, x: number, y: number, size: number): void;
}

/** Each family's text colours. */
const TONES: Record<'pc' | 'firmware', Record<Tone, string>> = {
  // VGA's text palette: light grey, white, dark grey, and the bright greens, reds and yellows.
  pc: {
    normal: '#aaaaaa',
    bright: '#ffffff',
    dim: '#6f6f6f',
    ok: '#55ff55',
    fail: '#ff5555',
    warn: '#ffff55',
  },
  // A small green-on-black dot-matrix OLED.
  firmware: {
    normal: '#5dff9a',
    bright: '#b8ffd2',
    dim: '#2f9c5c',
    ok: '#5dff9a',
    fail: '#5dff9a',
    warn: '#5dff9a',
  },
};

const MONO = '"Lucida Console", "DejaVu Sans Mono", Menlo, Consolas, monospace';

/** A text step's cell size and font on a `w` × `h` screen. */
function cellsOf(frame: BootFrame, w: number, h: number) {
  const g = frame.grid ?? { cols: 80, rows: 25 };
  const cw = w / g.cols;
  const ch = h / g.rows;
  const px = Math.max(4, Math.floor(Math.min(ch * 0.86, cw / 0.6)));
  return { g, cw, ch, px };
}

/** A run of monospaced text set into its cells exactly, whatever the font's own width. */
function drawRun(
  ctx: Ctx,
  frame: BootFrame,
  w: number,
  h: number,
  row: number,
  col: number,
  text: string,
  colour: string,
) {
  const { cw, ch, px } = cellsOf(frame, w, h);
  ctx.save();
  ctx.font = `${px}px ${MONO}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colour;
  const natural = ctx.measureText('M').width || px * 0.6;
  ctx.translate(col * cw, (row + 0.5) * ch);
  ctx.scale(cw / natural, 1);
  for (let i = 0; i < text.length; i++)
    if (text[i] !== ' ') ctx.fillText(text[i], i * natural, 0);
  ctx.restore();
}

const tones = (frame: BootFrame) =>
  TONES[frame.family === 'firmware' ? 'firmware' : 'pc'];

// ---- Backgrounds (drawn again under a live element) -------------------------------------

function welcomeGround(ctx: Ctx, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#04203f');
  g.addColorStop(0.55, '#0a4a7c');
  g.addColorStop(1, '#03213a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // The aurora: soft green and aqua ribbons.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ribbons: [string, number, number, number][] = [
    ['rgba(80,220,160,0.22)', 0.62, 0.18, 0.08],
    ['rgba(90,200,255,0.20)', 0.7, -0.12, 0.05],
    ['rgba(160,255,200,0.12)', 0.52, 0.1, 0.12],
  ];
  for (const [colour, y, lean, thick] of ribbons) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = h * thick;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w * 0.1, h * (y + lean));
    ctx.bezierCurveTo(
      w * 0.3,
      h * (y - 0.18),
      w * 0.65,
      h * (y + 0.2),
      w * 1.1,
      h * (y - lean),
    );
    ctx.stroke();
  }
  ctx.restore();
}

function splashGround(ctx: Ctx, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0d3f7a');
  g.addColorStop(0.55, '#1a76c4');
  g.addColorStop(1, '#0a2d5c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const sheen = ctx.createLinearGradient(0, 0, 0, h * 0.45);
  sheen.addColorStop(0, 'rgba(255,255,255,0.28)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h * 0.45);
}

function groundOf(ctx: Ctx, frame: BootFrame, w: number, h: number) {
  if (frame.kind === 'welcome') welcomeGround(ctx, w, h);
  else if (frame.kind === 'consent') {
    welcomeGround(ctx, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, h);
  } else if (frame.kind === 'splash') splashGround(ctx, w, h);
  else {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
  }
}

// ---- The marks ------------------------------------------------------------------------

/**
 * Fenestra's mark: a glossy glass orb holding four curved panes (teal,
 * lime, amber and violet) parted by a pale cross, a highlight across its
 * top. Original artwork in the period's manner.
 */
export function drawPaneOrb(ctx: Ctx, x: number, y: number, r: number) {
  ctx.save();
  // The orb's dark glass.
  const glass = ctx.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
  glass.addColorStop(0, '#2b4d63');
  glass.addColorStop(0.75, '#0b1c29');
  glass.addColorStop(1, '#03080d');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,210,240,0.55)';
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.stroke();
  // The four panes, each a cushion bowed a little, as if seen through the glass.
  const panes: [number, number, string, string][] = [
    [-1, -1, '#5fe0d0', '#0f8f86'],
    [1, -1, '#c8f05a', '#5f9c12'],
    [-1, 1, '#ffc457', '#c56c08'],
    [1, 1, '#b48cff', '#5b2fb6'],
  ];
  const s = r * 0.3;
  const gap = r * 0.045;
  for (const [sx, sy, light, deep] of panes) {
    const cx = x + sx * (s / 2 + gap);
    const cy = y + sy * (s / 2 + gap) - r * 0.02 * sx;
    const g = ctx.createLinearGradient(
      cx - s / 2,
      cy - s / 2,
      cx + s / 2,
      cy + s / 2,
    );
    g.addColorStop(0, light);
    g.addColorStop(1, deep);
    ctx.fillStyle = g;
    ctx.beginPath();
    const b = s * 0.12;
    ctx.moveTo(cx - s / 2, cy - s / 2 + b * sx);
    ctx.quadraticCurveTo(cx, cy - s / 2 - b, cx + s / 2, cy - s / 2 - b * sx);
    ctx.lineTo(cx + s / 2, cy + s / 2 - b * sx);
    ctx.quadraticCurveTo(cx, cy + s / 2 - b, cx - s / 2, cy + s / 2 + b * sx);
    ctx.closePath();
    ctx.fill();
  }
  // The highlight across the top.
  const hl = ctx.createLinearGradient(x, y - r, x, y);
  hl.addColorStop(0, 'rgba(255,255,255,0.65)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.45, r * 0.72, r * 0.42, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

/** The BIOS's Energy Thrift badge: a rising sun over a leaf, in a box. */
function drawThriftBadge(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = '#3f7fff';
  ctx.lineWidth = Math.max(1, h * 0.04);
  ctx.strokeRect(x, y, w, h);
  const cx = x + w * 0.24;
  const cy = y + h * 0.62;
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.arc(cx, cy, h * 0.24, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#ffd23a';
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i + 0.5) * (Math.PI / 5);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * h * 0.3, cy + Math.sin(a) * h * 0.3);
    ctx.lineTo(cx + Math.cos(a) * h * 0.4, cy + Math.sin(a) * h * 0.4);
    ctx.stroke();
  }
  ctx.fillStyle = '#4fd05a';
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.1, h * 0.3, h * 0.09, -0.25, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#7fb2ff';
  ctx.font = `italic bold ${Math.round(h * 0.26)}px Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText('Energy', x + w * 0.46, y + h * 0.36);
  ctx.fillText('Thrift', x + w * 0.46, y + h * 0.68);
  ctx.restore();
}

const defaultMark = (ctx: Ctx, x: number, y: number, size: number) =>
  drawDroplet(ctx, x, y, size * 0.5);

// ---- The pictures ---------------------------------------------------------------------

function textPicture(ctx: Ctx, frame: BootFrame, w: number, h: number) {
  const t = tones(frame);
  for (const c of frame.cells)
    drawRun(ctx, frame, w, h, c.row, c.col, c.text, t[c.tone]);
  if (frame.badge === 'thrift') {
    const { cw, ch } = cellsOf(frame, w, h);
    drawThriftBadge(ctx, cw * 64, ch * 0.15, cw * 15, ch * 2.6);
  }
}

function logoPicture(ctx: Ctx, frame: BootFrame, w: number, h: number) {
  const g = BOOT_NAMES.gui;
  const u = Math.min(w / 640, h / 480);
  drawPaneOrb(ctx, w / 2, h * 0.38, 64 * u);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8f1f6';
  ctx.font = aeroFont(Math.round(40 * u), 300);
  const word = g.os;
  ctx.fillText(word, w / 2 - 34 * u, h * 0.6);
  ctx.font = aeroFont(Math.round(22 * u), 300);
  ctx.fillStyle = '#9fd2ee';
  ctx.fillText(g.edition, w / 2 + 92 * u, h * 0.6 + 6 * u);
  ctx.font = aeroFont(Math.round(13 * u), 400);
  ctx.fillStyle = '#8796a0';
  ctx.fillText(g.tagline, w / 2, h * 0.66);
  if (frame.caption) {
    ctx.fillStyle = '#5d6b74';
    ctx.font = aeroFont(Math.round(12 * u), 400);
    ctx.fillText(frame.caption, w / 2, h * 0.81);
  }
  ctx.fillStyle = '#6c7a83';
  ctx.font = aeroFont(Math.round(11 * u), 400);
  ctx.fillText(`© ${g.maker}`, w / 2, h * 0.94);
  ctx.restore();
}

function welcomePicture(ctx: Ctx, frame: BootFrame, w: number, h: number) {
  const g = BOOT_NAMES.gui;
  const u = Math.min(w / 640, h / 480);
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(120,220,255,0.8)';
  ctx.shadowBlur = 12 * u;
  ctx.font = aeroFont(
    Math.round(frame.caption === 'Welcome' ? 40 : 26) * u,
    300,
  );
  ctx.fillText(frame.caption, w * 0.41, h * 0.51);
  ctx.restore();
  // The OS's mark and name, low in the corner.
  drawPaneOrb(ctx, w * 0.36, h * 0.88, 16 * u);
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d6ecf7';
  ctx.font = aeroFont(Math.round(18 * u), 300);
  ctx.fillText(`${g.os} ${g.edition}`, w * 0.36 + 24 * u, h * 0.875);
  ctx.font = aeroFont(Math.round(10 * u), 400);
  ctx.fillStyle = '#8fb6cc';
  ctx.fillText(g.tagline, w * 0.36 + 24 * u, h * 0.915);
  ctx.restore();
}

function consentPicture(
  ctx: Ctx,
  frame: BootFrame,
  w: number,
  h: number,
  opts: BootDrawOptions,
) {
  const g = BOOT_NAMES.gui;
  const u = Math.min(w / 640, h / 480);
  const box = {
    x: w / 2 - 230 * u,
    y: h / 2 - 130 * u,
    w: 460 * u,
    h: 250 * u,
  };
  ctx.save();
  // The window: a glass frame round a white body.
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 24 * u;
  const frameG = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  frameG.addColorStop(0, 'rgba(190,225,245,0.95)');
  frameG.addColorStop(1, 'rgba(110,170,210,0.95)');
  ctx.fillStyle = frameG;
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.w, box.h, 8 * u);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  const body = {
    x: box.x + 8 * u,
    y: box.y + 30 * u,
    w: box.w - 16 * u,
    h: box.h - 38 * u,
  };
  ctx.fillRect(body.x, body.y, body.w, body.h);
  ctx.fillStyle = '#0d2f4a';
  ctx.font = aeroFont(Math.round(13 * u), 400);
  ctx.textBaseline = 'middle';
  ctx.fillText(g.consent, box.x + 14 * u, box.y + 15 * u);
  // Its heading band, with a padlock.
  ctx.fillStyle = '#fff4cc';
  ctx.fillRect(body.x, body.y, body.w, 46 * u);
  ctx.fillStyle = '#c99a1e';
  ctx.fillRect(body.x + 16 * u, body.y + 20 * u, 18 * u, 16 * u);
  ctx.strokeStyle = '#c99a1e';
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.arc(body.x + 25 * u, body.y + 20 * u, 6 * u, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#123a5c';
  ctx.font = aeroFont(Math.round(16 * u), 400);
  ctx.fillText(
    `${g.os} needs your permission to continue`,
    body.x + 46 * u,
    body.y + 23 * u,
  );
  ctx.fillStyle = '#333';
  ctx.font = aeroFont(Math.round(12 * u), 400);
  ctx.fillText(
    'If you started this action, continue.',
    body.x + 16 * u,
    body.y + 66 * u,
  );
  // The program asking.
  const app = frame.app ?? {
    name: 'plantmon setup',
    maker: 'Unknown publisher',
  };
  (opts.appMark ?? defaultMark)(ctx, body.x + 34 * u, body.y + 104 * u, 30 * u);
  ctx.fillStyle = '#000';
  ctx.font = aeroFont(Math.round(13 * u), 600);
  ctx.fillText(app.name, body.x + 60 * u, body.y + 96 * u);
  ctx.font = aeroFont(Math.round(12 * u), 400);
  ctx.fillStyle = '#555';
  ctx.fillText(app.maker, body.x + 60 * u, body.y + 114 * u);
  const pressed = frame.caption !== '';
  drawGlossyButton(
    ctx,
    {
      x: body.x + body.w - 200 * u,
      y: body.y + body.h - 46 * u,
      w: 90 * u,
      h: 30 * u,
    },
    'Continue',
    {
      state: pressed ? 'pressed' : 'hover',
      shape: 'rounded',
      size: Math.round(13 * u),
    },
  );
  drawGlossyButton(
    ctx,
    {
      x: body.x + body.w - 102 * u,
      y: body.y + body.h - 46 * u,
      w: 90 * u,
      h: 30 * u,
    },
    'Cancel',
    { tint: 'grey', shape: 'rounded', size: Math.round(13 * u) },
  );
  ctx.restore();
  if (pressed) {
    ctx.save();
    ctx.fillStyle = '#cfe6f3';
    ctx.font = aeroFont(Math.round(12 * u), 400);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(frame.caption, w / 2, box.y + box.h + 28 * u);
    ctx.restore();
  }
}

function splashPicture(
  ctx: Ctx,
  frame: BootFrame,
  w: number,
  h: number,
  opts: BootDrawOptions,
) {
  const u = Math.min(w / 640, h / 480);
  const app = frame.app ?? { name: '', maker: '', subtitle: '' };
  (opts.appMark ?? defaultMark)(ctx, w / 2, h * 0.31, 110 * u);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(42 * u)}px ${AERO.font}`;
  ctx.fillText(app.name, w / 2, h * 0.53);
  ctx.font = aeroFont(Math.round(18 * u), 400);
  ctx.fillStyle = '#cfe7ff';
  ctx.fillText(app.subtitle, w / 2, h * 0.61);
  ctx.font = aeroFont(Math.round(12 * u), 400);
  ctx.fillStyle = '#9cc6ea';
  ctx.fillText(`© ${app.maker}`, w / 2, h * 0.94);
  ctx.restore();
}

/** A frame's still picture, over the whole canvas. */
export function drawBootPicture(
  ctx: Ctx,
  frame: BootFrame,
  w: number,
  h: number,
  opts: BootDrawOptions = {},
) {
  ctx.save();
  groundOf(ctx, frame, w, h);
  if (frame.kind === 'text') textPicture(ctx, frame, w, h);
  else if (frame.kind === 'logo') logoPicture(ctx, frame, w, h);
  else if (frame.kind === 'welcome') welcomePicture(ctx, frame, w, h);
  else if (frame.kind === 'consent') consentPicture(ctx, frame, w, h, opts);
  else if (frame.kind === 'splash') splashPicture(ctx, frame, w, h, opts);
  ctx.restore();
}

// ---- The live elements ----------------------------------------------------------------

/**
 * A frame's live element, with the ground under it, inside its rectangle
 * only (clipped). Its coordinates are the whole screen's: a host drawing
 * it onto an inset translates the context by the rectangle's corner.
 */
export function drawBootLive(
  ctx: Ctx,
  frame: BootFrame,
  w: number,
  h: number,
  _opts: BootDrawOptions = {},
) {
  const live = frame.live;
  if (!live) return;
  const r = pixelRect(live.rect, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  groundOf(ctx, frame, w, h);
  const t = tones(frame);
  if (live.kind === 'counter' || live.kind === 'twirl') {
    const { cw, ch } = cellsOf(frame, w, h);
    drawRun(
      ctx,
      frame,
      w,
      h,
      Math.round(live.rect.y * (h / ch)),
      Math.round(live.rect.x * (w / cw)),
      live.text,
      t[live.tone],
    );
  } else if (live.kind === 'cursor') {
    if (live.value) {
      ctx.fillStyle = t.normal;
      ctx.fillRect(
        r.x + r.w * 0.06,
        r.y + r.h * 0.74,
        r.w * 0.88,
        Math.max(1, r.h * 0.14),
      );
    }
  } else if (live.kind === 'marquee') drawMarquee(ctx, r, live.value);
  else if (live.kind === 'spinner') drawSpinner(ctx, r, live.value);
  else drawBar(ctx, r, live.value, live.text);
  ctx.restore();
}

/** The logo screen's marquee: three glossy green blocks sliding along a dark channel. */
function drawMarquee(
  ctx: Ctx,
  r: { x: number; y: number; w: number; h: number },
  phase: number,
) {
  ctx.fillStyle = '#000';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const inner = { x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 };
  ctx.strokeStyle = '#5a6066';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(inner.x + 0.5, inner.y + 0.5, inner.w - 1, inner.h - 1, 3);
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.rect(inner.x + 2, inner.y + 2, inner.w - 4, inner.h - 4);
  ctx.clip();
  const bw = Math.max(3, inner.h * 0.9);
  const span = inner.w + 3 * (bw + 2);
  const lead = inner.x - 3 * (bw + 2) + span * phase;
  const g = ctx.createLinearGradient(0, inner.y, 0, inner.y + inner.h);
  g.addColorStop(0, '#c9ff9c');
  g.addColorStop(0.5, '#4cc22a');
  g.addColorStop(1, '#1f7a12');
  ctx.fillStyle = g;
  for (let i = 0; i < 3; i++)
    ctx.fillRect(lead + i * (bw + 2), inner.y + 3, bw, inner.h - 6);
  ctx.restore();
}

/** The Welcome's spinner: a ring of dots, the bright one going round with a fading tail. */
function drawSpinner(
  ctx: Ctx,
  r: { x: number; y: number; w: number; h: number },
  phase: number,
) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const rad = Math.min(r.w, r.h) * 0.34;
  const head = Math.round(phase * SPINNER_STEPS);
  for (let i = 0; i < SPINNER_STEPS; i++) {
    const a = (i / SPINNER_STEPS) * 2 * Math.PI - Math.PI / 2;
    const behind = (head - i + SPINNER_STEPS) % SPINNER_STEPS;
    const k = Math.max(0.15, 1 - behind * 0.22);
    ctx.fillStyle = `rgba(170,235,255,${k})`;
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(a) * rad,
      cy + Math.sin(a) * rad,
      rad * 0.22,
      0,
      2 * Math.PI,
    );
    ctx.fill();
  }
}

/** The splash's progress bar, and the status message under it. */
function drawBar(
  ctx: Ctx,
  r: { x: number; y: number; w: number; h: number },
  fraction: number,
  message: string,
) {
  const bar = { x: r.x + 2, y: r.y + 2, w: r.w - 4, h: Math.round(r.h * 0.34) };
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.roundRect(bar.x, bar.y, bar.w, bar.h, bar.h / 2);
  ctx.fill();
  if (fraction > 0) {
    const g = ctx.createLinearGradient(0, bar.y, 0, bar.y + bar.h);
    g.addColorStop(0, '#d8f5b3');
    g.addColorStop(0.5, '#86d143');
    g.addColorStop(1, '#3f9a1c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(
      bar.x,
      bar.y,
      Math.max(bar.h, bar.w * fraction),
      bar.h,
      bar.h / 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = '#e4f2ff';
  ctx.font = aeroFont(Math.max(8, Math.round(r.h * 0.3)), 400);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, r.x + r.w / 2, r.y + r.h * 0.74);
}

/** A whole frame: its picture, then its live element over it. */
export function drawBootScreen(
  ctx: Ctx,
  frame: BootFrame,
  w: number,
  h: number,
  opts: BootDrawOptions = {},
) {
  drawBootPicture(ctx, frame, w, h, opts);
  drawBootLive(ctx, frame, w, h, opts);
}

// ---- Insets and whole displays --------------------------------------------------------

/**
 * A small canvas of its own over a screen's live rectangle, so a boot's
 * live element uploads its few texels and not the screen's. It is a child
 * of the screen's mesh, a hair in front, sized and placed to the live
 * element's rectangle of the screen's `px`, which is `size` metres; a new
 * canvas only when the rectangle's size changes (a new step).
 */
export function createBootInset(o: {
  px: { w: number; h: number };
  size: { w: number; h: number };
  kind?: DisplayKind;
  /** The screen material's colour (its brightness), matched. */
  level?: number;
  maxHz?: number;
}) {
  const kind = o.kind ?? 'lcd';
  let made = createCanvasTexture(1, 1, kind, { maxHz: o.maxHz ?? 10 });
  const material = new MeshBasicMaterial({
    map: made.texture,
    toneMapped: false,
    color: o.level ?? 0xffffff,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  mesh.position.z = 0.0004;
  mesh.renderOrder = 3;
  mesh.visible = false;
  mesh.layers.disableAll();
  mesh.name = 'boot screen (live element)';
  let at = '';
  let drawn = '';
  const textures: CanvasTexture[] = [made.texture];
  return {
    mesh,
    material,
    /**
     * Show `frame`'s live element (or hide the inset if it has none),
     * drawing and uploading it only if it changed: whether it uploaded.
     */
    show(frame: BootFrame | null, opts: BootDrawOptions = {}): boolean {
      if (!frame?.live) {
        // Hidden, and out of the raycaster's way: a touch passes to the screen.
        mesh.visible = false;
        mesh.layers.disableAll();
        drawn = '';
        return false;
      }
      mesh.layers.set(0);
      const r = pixelRect(frame.live.rect, o.px.w, o.px.h);
      const where = `${r.x},${r.y},${r.w},${r.h}`;
      if (where !== at) {
        at = where;
        if (made.canvas.width !== r.w || made.canvas.height !== r.h) {
          made.texture.dispose();
          made = createCanvasTexture(r.w, r.h, kind, { maxHz: o.maxHz ?? 10 });
          textures.push(made.texture);
          material.map = made.texture;
        }
        const pw = o.size.w / o.px.w;
        const ph = o.size.h / o.px.h;
        // Its own size, not a scale: the LCD's wash works out the eye's
        // angle in the mesh's frame, which a scale would bend.
        mesh.geometry.dispose();
        mesh.geometry = new PlaneGeometry(r.w * pw, r.h * ph);
        mesh.position.x = (r.x + r.w / 2 - o.px.w / 2) * pw;
        mesh.position.y = (o.px.h / 2 - (r.y + r.h / 2)) * ph;
        drawn = '';
      }
      mesh.visible = true;
      if (frame.liveKey === drawn) return false;
      drawn = frame.liveKey;
      const c = made.context;
      c.setTransform(1, 0, 0, 1, -r.x, -r.y);
      drawBootLive(c, frame, o.px.w, o.px.h, opts);
      c.setTransform(1, 0, 0, 1, 0, 0);
      made.texture.needsUpdate = true;
      return true;
    },
    setPower(on: boolean) {
      setLcdBacklight(material, on);
    },
    dispose() {
      for (const t of textures) t.dispose();
      material.dispose();
      mesh.geometry.dispose();
    },
  };
}

export type BootInset = ReturnType<typeof createBootInset>;

/**
 * A screen that boots: a canvas texture on a plane `metres` wide, its
 * live element on an inset; `restart()` boots it again (a new seed each
 * time, so it differs a little), `update(dt)` steps it, drawing only on a
 * change. Once booted it holds its last picture (a prompt's cursor still
 * blinking).
 */
export function createBootDisplay(o: {
  family: BootFamily;
  px: { w: number; h: number };
  metres: number;
  seed?: number;
  app?: BootApp | null;
  kind?: DisplayKind;
  level?: number;
  maxHz?: number;
  /** Its first boot's start: seconds already gone (to show a later moment). */
  from?: number;
  draw?: BootDrawOptions;
}) {
  const kind = o.kind ?? 'lcd';
  const size = { w: o.metres, h: (o.metres * o.px.h) / o.px.w };
  const screen = createCanvasTexture(o.px.w, o.px.h, kind, {
    maxHz: o.maxHz ?? 10,
  });
  const material = new MeshBasicMaterial({
    map: screen.texture,
    toneMapped: false,
    color: o.level ?? 0xd0d0d0,
  });
  const mesh = new Mesh(new PlaneGeometry(size.w, size.h), material);
  mesh.name = `${o.family} boot screen`;
  const inset = createBootInset({
    px: o.px,
    size,
    kind,
    level: o.level ?? 0xd0d0d0,
    maxHz: o.maxHz,
  });
  mesh.add(inset.mesh);
  const group = new Group();
  group.add(mesh);
  let seed = o.seed ?? 1;
  let script: BootScript = bootScript(o.family, { seed, app: o.app ?? null });
  let t = o.from ?? 0;
  let picture = '';
  let powered = true;
  let frame: BootFrame = bootFrame(script, t);
  const draw = () => {
    frame = bootFrame(script, t);
    if (frame.pictureKey !== picture) {
      picture = frame.pictureKey;
      drawBootPicture(screen.context, frame, o.px.w, o.px.h, o.draw);
      screen.texture.needsUpdate = true;
    }
    inset.show(frame, o.draw);
  };
  draw();
  return {
    group,
    mesh,
    get frame() {
      return frame;
    },
    get script() {
      return script;
    },
    /** Boot again, after a shutdown or (`unclean`) a power cut. */
    restart(unclean = false) {
      seed++;
      script = bootScript(o.family, { seed, app: o.app ?? null, unclean });
      t = 0;
      picture = '';
      draw();
    },
    setPower(on: boolean) {
      if (on === powered) return;
      powered = on;
      setLcdBacklight(material, on);
      inset.setPower(on);
      if (on) this.restart(true);
    },
    update(dt: number) {
      if (!powered) return;
      t += dt;
      draw();
    },
    dispose() {
      screen.texture.dispose();
      material.dispose();
      mesh.geometry.dispose();
      inset.dispose();
    },
  };
}

export type BootDisplay = ReturnType<typeof createBootDisplay>;
