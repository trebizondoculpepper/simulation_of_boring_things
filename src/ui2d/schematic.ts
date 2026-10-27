import { blinkOn, fitBounds, pillPath, rect } from './geometry';
import { Button, Frame } from './components';
import type { Bounds, PathOp, Rect } from './geometry';
import { UiNode, tracePath } from './node';
import type { NodeOptions, PressOutcome, UiSound } from './node';
import { colourOf, fontOf, lettered } from './theme';
import type { Theme } from './theme';

/**
 * Schematic building blocks: animated displays of a process in the
 * colour-blocked style, to be composed into a station's screens. A flow
 * network (machines as glyphs, pipes as rounded bars with flow moving
 * along them at a speed that follows a value), a vessel cut away to show
 * its level, ring gauges, a sensor sweep (a scanning bar passing down a
 * list), a status matrix, a sequence strip, a targeting reticle, and a
 * rotator that shows several designs in turn.
 *
 * Every one paints only from its state and marks itself dirty only when a
 * setter changes what it shows, or, for those that animate by themselves
 * (flows, fans, sweeps, scans, wipes), at most `ANIMATION_HZ` times a
 * second (mission 094's rule: a display animating on its own does so at no
 * more than 10 Hz). Like the rest of the kit it knows nothing of what it
 * shows.
 */

/** The most a self-animating component marks itself dirty a second. */
export const ANIMATION_HZ = 10;

/** The animation step `seconds` falls in, at `hz` steps a second. */
export const animationStep = (seconds: number, hz = ANIMATION_HZ) =>
  Math.floor(seconds * Math.min(hz, ANIMATION_HZ) + 1e-9);

/** Lettering at `(x, y)`, squeezed to `maxWidth` if given. */
function say(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  words: string,
  x: number,
  y: number,
  px: number,
  colour: string,
  align: CanvasTextAlign = 'left',
  baseline: CanvasTextBaseline = 'alphabetic',
  maxWidth?: number,
  weight = 500,
) {
  if (!words || px < 1) return;
  ctx.font = fontOf(theme, px, weight);
  ctx.fillStyle = colourOf(theme, colour);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  const shown = lettered(theme, words);
  if (maxWidth !== undefined && maxWidth > 0)
    ctx.fillText(shown, x, y, maxWidth);
  else ctx.fillText(shown, x, y);
}

/** A press's sound, from a handler's answer: none given is a confirm. */
const soundOf = (answer: UiSound | null | void): UiSound | null =>
  answer === undefined ? 'confirm' : answer;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------------------
// Pure geometry.

export type Pt = readonly [number, number];

/** A polyline's length. */
export function polylineLength(points: readonly Pt[]): number {
  let t = 0;
  for (let i = 1; i < points.length; i++)
    t += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
    );
  return t;
}

/**
 * Marks along a polyline every `spacing`, starting `offset` along (taken
 * modulo the spacing, so a growing offset moves them forward): each mark's
 * point and the angle of its segment, radians.
 */
export function pointsAlong(
  points: readonly Pt[],
  spacing: number,
  offset = 0,
): { x: number; y: number; angle: number }[] {
  const out: { x: number; y: number; angle: number }[] = [];
  if (points.length < 2 || spacing <= 0) return out;
  let next = ((offset % spacing) + spacing) % spacing;
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len === 0) continue;
    const angle = Math.atan2(y1 - y0, x1 - x0);
    while (next <= travelled + len + 1e-9) {
      const t = (next - travelled) / len;
      out.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, angle });
      next += spacing;
    }
    travelled += len;
  }
  return out;
}

/**
 * `n` cells in `r`, `cols` across (by default as near square as the
 * rectangle's shape allows), `gap` pixels apart, row by row.
 */
export function gridCells(r: Rect, n: number, cols?: number, gap = 0): Rect[] {
  if (n <= 0) return [];
  const c =
    cols ??
    Math.max(
      1,
      Math.min(n, Math.round(Math.sqrt((n * r.w) / Math.max(1, r.h)))),
    );
  const rows = Math.ceil(n / c);
  const w = (r.w - gap * (c - 1)) / c;
  const h = (r.h - gap * (rows - 1)) / rows;
  return Array.from({ length: n }, (_, i) =>
    rect(r.x + (i % c) * (w + gap), r.y + Math.floor(i / c) * (h + gap), w, h),
  );
}

/**
 * Which of `count` designs a rotator shows at `seconds`, each for `period`
 * seconds from `offset`: its index, seconds since it came up, and the
 * wipe bringing it in (0 to 1 over `transition` seconds, null once done).
 */
export function rotation(
  seconds: number,
  count: number,
  period: number,
  transition = 0.6,
  offset = 0,
): { index: number; since: number; wipe: number | null } {
  if (count <= 1 || period <= 0)
    return { index: 0, since: Math.max(0, seconds), wipe: null };
  const t = Math.max(0, seconds + offset);
  const turn = Math.floor(t / period);
  const since = t - turn * period;
  return {
    index: turn % count,
    since,
    // The first design comes up without a wipe.
    wipe: turn > 0 && since < transition ? since / transition : null,
  };
}

/** Where a sweep stands at `seconds`, 0 at the top to 1 at the foot, once every `period`. */
export const sweepAt = (seconds: number, period: number) =>
  period <= 0 ? 0 : (seconds % period) / period;

/** The sweep's row of `rows`, for a sweep at `at` (0 to 1). */
export const sweepRow = (at: number, rows: number) =>
  rows <= 0 ? -1 : Math.min(rows - 1, Math.floor(clamp01(at) * rows));

/** A ring gauge's arc for `value` (0 to 1): from its start angle, sweeping `sweep` radians clockwise round the bottom gap. */
export function ringArc(value: number, sweep = (Math.PI * 3) / 2) {
  const start = Math.PI / 2 + (Math.PI * 2 - sweep) / 2;
  return { start, end: start + sweep * clamp01(value), full: start + sweep };
}

/**
 * A capsule filling `r`: its two short ends rounded right round (a pill
 * lying down when wide, standing up when tall).
 */
export function capsulePath(r: Rect): PathOp[] {
  if (r.w >= r.h) return pillPath(r, 'both');
  const rad = r.w / 2;
  const cx = r.x + rad;
  return [
    { op: 'M', x: r.x, y: r.y + rad },
    { op: 'A', cx, cy: r.y + rad, r: rad, a0: Math.PI, a1: Math.PI * 2 },
    { op: 'L', x: r.x + r.w, y: r.y + r.h - rad },
    { op: 'A', cx, cy: r.y + r.h - rad, r: rad, a0: 0, a1: Math.PI },
    { op: 'Z' },
  ];
}

// ---------------------------------------------------------------------------
// Glyphs.

export type GlyphKind =
  | 'pump'
  | 'valve'
  | 'tank'
  | 'filter'
  | 'boiler'
  | 'fan'
  | 'breaker'
  | 'pool'
  | 'hx'
  | 'meter'
  | 'uv'
  | 'source'
  | 'junction'
  | 'box';

/** How a node is shown: on (filled), off (hollow), between (half), warn (orange), fault (flashing red). */
export type GlyphState = 'on' | 'off' | 'between' | 'warn' | 'fault';

/**
 * A glyph centred at `(cx, cy)`, `w` × `h` pixels: the shape of its kind
 * in `colour`, filled when on, hollow when off; `level` (0 to 1) fills a
 * tank or pool to its height; `spin` turns a fan's blades and a pump's
 * impeller (radians); a breaker is drawn closed when on.
 */
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  kind: GlyphKind,
  cx: number,
  cy: number,
  w: number,
  h: number,
  colour: string,
  state: GlyphState,
  extra: { level?: number; spin?: number } = {},
) {
  const c = colourOf(theme, colour);
  const filled = state === 'on' || state === 'fault' || state === 'warn';
  const line = Math.max(2, Math.min(w, h) * 0.09);
  const bg = theme.background;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = line;
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const r = Math.min(w, h) / 2;
  const box = (x: number, y: number, bw: number, bh: number) =>
    tracePath(ctx, capsulePath(rect(x, y, bw, bh)));
  const level = (lv: number, shape: () => void) => {
    // The body black, its contents to `lv` in the colour, its outline over.
    shape();
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.save();
    shape();
    ctx.clip();
    ctx.globalAlpha = state === 'off' ? 0.35 : 0.85;
    ctx.fillStyle = c;
    ctx.fillRect(-w / 2, h / 2 - h * clamp01(lv), w, h * clamp01(lv));
    ctx.restore();
    shape();
    ctx.stroke();
  };
  switch (kind) {
    case 'pump': {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = filled ? c : bg;
      ctx.fill();
      ctx.stroke();
      // The impeller's triangle, pointing along its discharge.
      ctx.save();
      ctx.rotate(extra.spin ?? 0);
      ctx.beginPath();
      ctx.moveTo(r * 0.62, 0);
      ctx.lineTo(-r * 0.4, -r * 0.5);
      ctx.lineTo(-r * 0.4, r * 0.5);
      ctx.closePath();
      ctx.fillStyle = filled ? bg : c;
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'fan': {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.rotate(extra.spin ?? 0);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(r * 0.42, 0, r * 0.4, r * 0.16, 0.5, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.globalAlpha = filled ? 1 : 0.45;
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'valve': {
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(w / 2, -h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.fillStyle = bg;
      ctx.fill();
      if (filled) {
        ctx.fillStyle = c;
        ctx.fill();
      } else if (state === 'between') {
        ctx.save();
        ctx.clip();
        ctx.fillStyle = c;
        ctx.fillRect(-w / 2, 0, w, h / 2);
        ctx.restore();
      }
      ctx.stroke();
      break;
    }
    case 'tank':
      level(extra.level ?? (filled ? 1 : 0), () => box(-w / 2, -h / 2, w, h));
      break;
    case 'pool':
      level(extra.level ?? 0.8, () => {
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 2);
        ctx.lineTo(-w / 2, h / 2);
        ctx.lineTo(w / 2, h / 2);
        ctx.lineTo(w / 2, -h / 2);
      });
      break;
    case 'filter': {
      box(-w / 2, -h / 2, w, h);
      ctx.fillStyle = filled ? c : bg;
      ctx.fill();
      ctx.stroke();
      // Its bed: three bands of media.
      ctx.strokeStyle = filled ? bg : c;
      ctx.lineWidth = Math.max(1, line * 0.6);
      for (const f of [-0.12, 0.08, 0.28]) {
        ctx.beginPath();
        ctx.moveTo(-w * 0.32, h * f);
        ctx.lineTo(w * 0.32, h * f);
        ctx.stroke();
      }
      break;
    }
    case 'boiler': {
      ctx.beginPath();
      ctx.rect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.stroke();
      // Its flame, lit while it fires.
      ctx.beginPath();
      ctx.moveTo(0, h * 0.32);
      ctx.quadraticCurveTo(w * 0.34, h * 0.05, 0, -h * 0.32);
      ctx.quadraticCurveTo(-w * 0.34, h * 0.05, 0, h * 0.32);
      ctx.fillStyle = c;
      ctx.globalAlpha = filled ? 1 : 0.25;
      ctx.fill();
      break;
    }
    case 'breaker': {
      ctx.beginPath();
      ctx.rect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, h * 0.36);
      if (filled) ctx.lineTo(0, -h * 0.36);
      else ctx.lineTo(w * 0.3, -h * 0.26);
      ctx.lineWidth = line * 1.4;
      ctx.stroke();
      break;
    }
    case 'hx': {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = filled ? c : bg;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, 0);
      for (let i = 0; i < 4; i++)
        ctx.lineTo(-r * 0.5 + i * r * 0.35, i % 2 ? r * 0.35 : -r * 0.35);
      ctx.lineTo(r * 0.7, 0);
      ctx.strokeStyle = filled ? bg : c;
      ctx.stroke();
      break;
    }
    case 'uv': {
      box(-w / 2, -h / 2, w, h);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, 0);
      ctx.lineTo(w * 0.3, 0);
      ctx.lineWidth = line * 1.8;
      ctx.strokeStyle = filled ? colourOf(theme, 'lit') : c;
      ctx.globalAlpha = filled ? 1 : 0.4;
      ctx.stroke();
      break;
    }
    case 'meter': {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.6 * Math.cos(-0.8), r * 0.6 * Math.sin(-0.8));
      ctx.globalAlpha = filled ? 1 : 0.4;
      ctx.stroke();
      break;
    }
    case 'source': {
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.fillStyle = filled ? c : bg;
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'junction': {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      box(-w / 2, -h / 2, w, h);
      ctx.fillStyle = filled ? c : bg;
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The flow network.

/** A machine, valve or vessel in a flow network. */
export interface FlowNode {
  id: string;
  kind: GlyphKind;
  /** Its middle, in the network's own units. */
  at: Pt;
  /** Its width in the network's units; its height `aspect` times that. */
  size: number;
  aspect?: number;
  label?: string;
  /** A value under its label. */
  sub?: string;
  /** Where its label goes: under it (default), over it, or beside it. */
  labelAt?: 'below' | 'above' | 'left' | 'right';
  colour?: string;
  state?: GlyphState;
  /** A tank's or pool's fill, 0 to 1; a fan's speed. */
  level?: number;
  /** Its press; with none it is not pressable. */
  onPress?: () => UiSound | null | void;
}

/** A pipe, cable or duct between nodes. */
export interface FlowPipe {
  id?: string;
  points: readonly Pt[];
  colour?: string;
  /** Its thickness in the network's units (default a share of the drawing). */
  width?: number;
  /**
   * What moves along it, -1 to 1: its sign the way (forward along its
   * points, or back), its size the speed; 0 still.
   */
  rate?: number;
  /** Dashes (water, gas) or chevrons (power, air). */
  style?: 'dash' | 'chevron';
}

/** Lettering placed in a network, in its units. */
export interface FlowText {
  words: string;
  at: Pt;
  /** Height in the network's units. */
  size?: number;
  colour?: string;
  align?: CanvasTextAlign;
}

/**
 * A process as a line diagram in the colour-blocked style: pipes as thick
 * rounded bars in their colours, with what they carry moving along them
 * as dashes or chevrons at a speed that follows each pipe's rate; nodes
 * as glyphs (pumps, valves, tanks, filters, boilers, fans, breakers,
 * heat exchangers), filled when on, hollow when off, flashing in a
 * fault, a vessel filled to its level, a fan turning at its speed.
 * Pressable where a node has a press.
 */
export class FlowNetwork extends UiNode {
  readonly pipes: FlowPipe[];
  readonly nodes: FlowNode[];
  readonly texts: FlowText[];
  /** Each pipe's travel, in dash lengths; fans' and pumps' turn. */
  private travel: number[];
  private spin = 0;
  private step = -1;
  private last = 0;
  private blinkShown = true;
  constructor(
    readonly options: NodeOptions & {
      bounds: Bounds;
      yUp?: boolean;
      pipes: FlowPipe[];
      nodes: FlowNode[];
      texts?: FlowText[];
      /** Dash lengths a second at full rate. */
      speed?: number;
    },
  ) {
    super(options);
    this.pipes = options.pipes;
    this.nodes = options.nodes;
    this.texts = options.texts ?? [];
    this.travel = this.pipes.map(() => 0);
  }
  fit() {
    return fitBounds(this.options.bounds, this.rect, this.options.yUp ?? true);
  }
  /** Set a pipe's rate (and colour), by its id: dirty only if it changed. */
  setPipe(id: string, rate: number, colour?: string) {
    for (const p of this.pipes)
      if (p.id === id) {
        const r = Math.max(-1, Math.min(1, rate));
        const still = Math.abs(r) < 0.005 ? 0 : r;
        if ((p.rate ?? 0) !== still || (colour && p.colour !== colour)) {
          p.rate = still;
          if (colour) p.colour = colour;
          this.markDirty();
        }
      }
  }
  /** Change a node's state, level, value or colour, by its id: dirty only if it changed. */
  setNode(
    id: string,
    patch: Partial<
      Pick<FlowNode, 'state' | 'level' | 'sub' | 'colour' | 'label'>
    >,
  ) {
    const n = this.nodes.find((k) => k.id === id);
    if (!n) return;
    let changed = false;
    for (const [k, v] of Object.entries(patch) as [keyof typeof patch, never][])
      if (v !== undefined && n[k] !== v) {
        (n as unknown as Record<string, unknown>)[k] = v;
        changed = true;
      }
    if (changed) this.markDirty();
  }
  setText(index: number, words: string) {
    const t = this.texts[index];
    if (t && t.words !== words) {
      t.words = words;
      this.markDirty();
    }
  }
  /** Whether anything in it moves by itself now. */
  get moving() {
    return (
      this.pipes.some((p) => Math.abs(p.rate ?? 0) > 0) ||
      this.nodes.some(
        (n) => (n.kind === 'fan' || n.kind === 'pump') && n.state === 'on',
      )
    );
  }
  tick(seconds: number) {
    const step = animationStep(seconds);
    if (step !== this.step) {
      const dt = this.step < 0 ? 0 : Math.min(1, seconds - this.last);
      this.step = step;
      this.last = seconds;
      if (this.moving) {
        const speed = this.options.speed ?? 2.4;
        this.pipes.forEach((p, i) => {
          this.travel[i] += (p.rate ?? 0) * speed * dt;
        });
        this.spin += dt * 2.5;
        this.markDirty();
      }
    }
    const on = blinkOn(seconds, 0.5);
    if (on !== this.blinkShown && this.nodes.some((n) => n.state === 'fault')) {
      this.blinkShown = on;
      this.markDirty();
    }
  }
  /** The pressable node nearest `(x, y)` within its reach, pixels. */
  nodeAt(x: number, y: number): FlowNode | null {
    const f = this.fit();
    let best: FlowNode | null = null;
    let bestD = Infinity;
    for (const n of this.nodes) {
      if (!n.onPress) continue;
      const p = f.toPx(n.at[0], n.at[1]);
      const reach = Math.max(14, n.size * f.scale * 0.8);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d <= reach && d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  }
  get pressable() {
    return this.nodes.some((n) => n.onPress);
  }
  protected hitsSelf(x: number, y: number) {
    return this.nodeAt(x, y) !== null;
  }
  press(x: number, y: number): PressOutcome | null {
    const n = this.nodeAt(x, y);
    if (!n) return null;
    return { action: n.id, sound: soundOf(n.onPress?.()) };
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const f = this.fit();
    const base = Math.max(4, Math.min(this.rect.w, this.rect.h) / 40);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.pipes.forEach((p, i) => {
      const w = p.width !== undefined ? p.width * f.scale : base;
      const pts = p.points.map(([x, y]) => {
        const q = f.toPx(x, y);
        return [q.x, q.y] as const;
      });
      const colour = colourOf(theme, p.colour ?? 'info');
      const rate = p.rate ?? 0;
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = colour;
      ctx.globalAlpha = rate ? 1 : 0.4;
      ctx.lineWidth = w;
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (!rate) return;
      const dash = w * 2.4;
      const offset = this.travel[i] * dash;
      ctx.fillStyle = theme.background;
      ctx.strokeStyle = theme.background;
      if ((p.style ?? 'dash') === 'dash') {
        ctx.setLineDash([dash * 0.55, dash * 0.45]);
        ctx.lineDashOffset = -offset;
        ctx.lineWidth = w * 0.38;
        ctx.beginPath();
        pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const back = rate < 0;
        for (const m of pointsAlong(pts, dash, offset)) {
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate(m.angle + (back ? Math.PI : 0));
          ctx.beginPath();
          ctx.moveTo(-w * 0.25, -w * 0.32);
          ctx.lineTo(w * 0.15, 0);
          ctx.lineTo(-w * 0.25, w * 0.32);
          ctx.lineWidth = Math.max(1.5, w * 0.18);
          ctx.stroke();
          ctx.restore();
        }
      }
    });
    for (const n of this.nodes) {
      const c = f.toPx(n.at[0], n.at[1]);
      const w = n.size * f.scale;
      const h = w * (n.aspect ?? 1);
      const fault = n.state === 'fault';
      const colour = fault
        ? this.blinkShown
          ? 'alert'
          : 'dim'
        : n.state === 'warn'
          ? 'warning'
          : (n.colour ?? 'primary');
      const spin =
        n.state === 'on' && (n.kind === 'fan' || n.kind === 'pump')
          ? n.kind === 'fan'
            ? this.spin * (0.3 + 2.5 * clamp01(n.level ?? 1))
            : 0
          : 0;
      drawGlyph(ctx, theme, n.kind, c.x, c.y, w, h, colour, n.state ?? 'on', {
        level: n.level,
        spin,
      });
      const px = Math.max(10, Math.min(this.rect.h * 0.042, w * 0.7));
      const where = n.labelAt ?? 'below';
      const lx =
        where === 'left'
          ? c.x - w / 2 - px * 0.4
          : where === 'right'
            ? c.x + w / 2 + px * 0.4
            : c.x;
      const align: CanvasTextAlign =
        where === 'left' ? 'right' : where === 'right' ? 'left' : 'center';
      const ly =
        where === 'below'
          ? c.y + h / 2 + px * 1.05
          : where === 'above'
            ? c.y - h / 2 - px * (n.sub ? 1.3 : 0.35)
            : c.y + px * (n.sub ? -0.1 : 0.35);
      say(ctx, theme, n.label ?? '', lx, ly, px, n.colour ?? 'primary', align);
      say(
        ctx,
        theme,
        n.sub ?? '',
        lx,
        ly + px * 1.05,
        px * 0.9,
        fault ? 'alert' : 'lit',
        align,
      );
    }
    for (const t of this.texts) {
      const p = f.toPx(t.at[0], t.at[1]);
      say(
        ctx,
        theme,
        t.words,
        p.x,
        p.y,
        (t.size ?? 0.06) * f.scale,
        t.colour ?? 'accent',
        t.align ?? 'center',
        'middle',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// A vessel, cut away.

/**
 * A vessel cut away to show its contents: a tall rounded body filled to
 * its level, its marks (low, high, …) across it, its name above and its
 * value below; while `active`, its contents shimmer (bubbles rising, at
 * most `ANIMATION_HZ` steps a second).
 */
export class Vessel extends UiNode {
  level = 0;
  words = '';
  colour: string;
  active = false;
  alarm = false;
  private step = -1;
  private phase = 0;
  private blinkShown = true;
  constructor(
    public label: string,
    readonly options: NodeOptions & {
      colour?: string;
      /** Marks across it, 0 to 1, with their names. */
      marks?: readonly { at: number; label?: string }[];
      /** A heat column's look: its contents glow in bands. */
      column?: boolean;
    } = {},
  ) {
    super(options);
    this.colour = options.colour ?? 'info';
  }
  set(
    level: number,
    words = '',
    options: { colour?: string; active?: boolean; alarm?: boolean } = {},
  ) {
    this.change('level', clamp01(level));
    this.change('words', words);
    if (options.colour) this.change('colour', options.colour);
    this.change('active', options.active ?? false);
    this.change('alarm', options.alarm ?? false);
  }
  tick(seconds: number) {
    const step = animationStep(seconds);
    if (this.active && step !== this.step) {
      this.step = step;
      this.phase = step;
      this.markDirty();
    }
    const on = blinkOn(seconds, 0.75);
    if (this.alarm && on !== this.blinkShown) {
      this.blinkShown = on;
      this.markDirty();
    }
  }
  /** Its body, inside its rectangle: the room for its name above and value below taken off (pure). */
  body(): Rect {
    const r = this.rect;
    const px = Math.max(10, Math.min(r.w * 0.22, r.h * 0.07));
    const w = Math.min(r.w * 0.62, r.h * 0.5);
    return rect(r.x + (r.w - w) / 2, r.y + px * 1.6, w, r.h - px * 3.4);
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const r = this.rect;
    if (r.w <= 0 || r.h <= 0) return;
    const b = this.body();
    const px = Math.max(10, Math.min(r.w * 0.22, r.h * 0.07));
    const colour =
      this.alarm && !this.blinkShown
        ? 'dim'
        : this.alarm
          ? 'alert'
          : this.colour;
    const c = colourOf(theme, colour);
    const outline = capsulePath(b);
    // The black inside, then the contents clipped to the body.
    tracePath(ctx, outline);
    ctx.fillStyle = colourOf(theme, 'track');
    ctx.fill();
    ctx.save();
    tracePath(ctx, outline);
    ctx.clip();
    const top = b.y + b.h * (1 - this.level);
    ctx.fillStyle = c;
    ctx.fillRect(b.x, top, b.w, b.y + b.h - top);
    if (this.options.column) {
      // A heat column's bands, moving up while active.
      ctx.fillStyle = theme.background;
      const band = Math.max(4, b.h / 14);
      const shift = ((this.phase * band) / 4) % (band * 2);
      for (let y = b.y + b.h - shift; y > top - band * 2; y -= band * 2)
        ctx.fillRect(b.x, y - band * 0.35, b.w, band * 0.35);
    } else if (this.active && this.level > 0) {
      ctx.fillStyle = colourOf(theme, 'lit');
      for (let i = 0; i < 6; i++) {
        const fx = ((i * 0.37 + 0.13) % 1) * 0.7 + 0.15;
        const rise = ((this.phase * 0.06 + i * 0.29) % 1) * (b.y + b.h - top);
        ctx.beginPath();
        ctx.arc(
          b.x + b.w * fx,
          b.y + b.h - rise,
          Math.max(1.5, b.w * 0.04),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.restore();
    tracePath(ctx, outline);
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(2, b.w * 0.05);
    ctx.stroke();
    for (const m of this.options.marks ?? []) {
      const y = b.y + b.h * (1 - m.at);
      ctx.fillStyle = colourOf(theme, 'lit');
      ctx.fillRect(b.x - b.w * 0.12, y - 1, b.w * 1.24, 2);
      say(
        ctx,
        theme,
        m.label ?? '',
        b.x + b.w * 1.16,
        y,
        px * 0.62,
        'lit',
        'left',
        'middle',
        r.x + r.w - b.x - b.w * 1.16,
      );
    }
    say(
      ctx,
      theme,
      this.label,
      r.x + r.w / 2,
      r.y + px * 1.1,
      px,
      colour,
      'center',
      'alphabetic',
      r.w,
    );
    say(
      ctx,
      theme,
      this.words,
      r.x + r.w / 2,
      r.y + r.h - px * 0.35,
      px * 1.1,
      'accent',
      'center',
      'alphabetic',
      r.w,
      600,
    );
  }
}

// ---------------------------------------------------------------------------
// Ring gauges.

/** A ring gauge: a thick segmented arc to its value, its value large in the middle, its name below. */
export class RingGauge extends UiNode {
  value = 0;
  words = '';
  colour: string;
  alarm = false;
  private blinkShown = true;
  constructor(
    public label: string,
    readonly options: NodeOptions & {
      colour?: string;
      /** Marks round it, 0 to 1 (a band's ends, a setpoint). */
      marks?: readonly number[];
      /** Its blocks round the arc. */
      blocks?: number;
      unit?: string;
    } = {},
  ) {
    super(options);
    this.colour = options.colour ?? 'info';
  }
  set(value: number, words = '', colour?: string, alarm = false) {
    this.change('value', clamp01(value));
    this.change('words', words);
    if (colour) this.change('colour', colour);
    this.change('alarm', alarm);
  }
  tick(seconds: number) {
    const on = blinkOn(seconds, 0.75);
    if (this.alarm && on !== this.blinkShown) {
      this.blinkShown = on;
      this.markDirty();
    }
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const r = this.rect;
    const labelH = Math.max(10, Math.min(r.h * 0.16, r.w * 0.09));
    const radius = Math.max(4, Math.min(r.w, r.h - labelH) / 2 - 2);
    const cx = r.x + r.w / 2;
    const cy = r.y + (r.h - labelH) / 2;
    const thick = radius * 0.24;
    const arc = ringArc(this.value);
    const n = this.options.blocks ?? 24;
    const each = (arc.full - arc.start) / n;
    const lit = Math.round(this.value * n);
    const colour = this.alarm
      ? this.blinkShown
        ? 'alert'
        : 'dim'
      : this.colour;
    ctx.lineWidth = thick;
    ctx.lineCap = 'butt';
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        radius - thick / 2,
        arc.start + i * each + each * 0.08,
        arc.start + (i + 1) * each - each * 0.08,
      );
      ctx.strokeStyle = colourOf(theme, i < lit ? colour : 'track');
      ctx.stroke();
    }
    ctx.strokeStyle = colourOf(theme, 'lit');
    ctx.lineWidth = Math.max(2, thick * 0.18);
    for (const m of this.options.marks ?? []) {
      const a = ringArc(m).end;
      ctx.beginPath();
      ctx.moveTo(
        cx + Math.cos(a) * (radius - thick * 1.25),
        cy + Math.sin(a) * (radius - thick * 1.25),
      );
      ctx.lineTo(
        cx + Math.cos(a) * (radius + 2),
        cy + Math.sin(a) * (radius + 2),
      );
      ctx.stroke();
    }
    say(
      ctx,
      theme,
      this.words,
      cx,
      cy + radius * 0.12,
      radius * 0.5,
      colour,
      'center',
      'middle',
      radius * 1.4,
      600,
    );
    say(
      ctx,
      theme,
      this.options.unit ?? '',
      cx,
      cy + radius * 0.52,
      radius * 0.22,
      colour,
      'center',
      'middle',
      radius * 1.2,
    );
    say(
      ctx,
      theme,
      this.label,
      cx,
      r.y + r.h - labelH * 0.25,
      labelH * 0.75,
      colour,
      'center',
      'alphabetic',
      r.w,
    );
  }
}

/** Children in a grid, as near square as the rectangle allows (or `columns` across). */
export class Grid extends UiNode {
  constructor(
    children: UiNode[],
    readonly options: NodeOptions & { columns?: number; gap?: number } = {},
  ) {
    super(options);
    this.add(...children);
  }
  protected layoutChildren(r: Rect, theme: Theme) {
    const shown = this.children.filter((c) => !c.hidden);
    const cells = gridCells(
      r,
      shown.length,
      this.options.columns,
      this.options.gap ?? Math.max(4, Math.min(r.w, r.h) * 0.03),
    );
    shown.forEach((c, i) => c.layout(cells[i], theme));
  }
}

// ---------------------------------------------------------------------------
// A sensor sweep.

/** A row of a sweep: a name, a value, its colour (by its state), flagged if out of bounds. */
export interface SweepRow {
  label: string;
  value: string;
  colour?: string;
  flag?: boolean;
}

/**
 * A sensor sweep: a list of readings with a scanning bar passing down it
 * once every `period` seconds, each row lit as the bar crosses it, a
 * flagged row flashing; moving at most `ANIMATION_HZ` steps a second.
 */
export class SensorSweep extends UiNode {
  rows: readonly SweepRow[] = [];
  private key = '';
  private at = 0;
  private step = -1;
  constructor(
    readonly options: NodeOptions & {
      period?: number;
      colour?: string;
      /** Its heading, over the list. */
      title?: string;
      /** Rows shown at once, at most (the rest scroll with the sweep). */
      maxRows?: number;
    } = {},
  ) {
    super(options);
  }
  set(rows: readonly SweepRow[]) {
    const key = JSON.stringify(rows);
    if (key === this.key) return;
    this.key = key;
    this.rows = rows;
    this.markDirty();
  }
  /** Where its bar is, 0 to 1. */
  get sweep() {
    return this.at;
  }
  tick(seconds: number) {
    const step = animationStep(seconds);
    if (step === this.step) return;
    this.step = step;
    this.at = sweepAt(step / ANIMATION_HZ, this.options.period ?? 4);
    if (this.rows.length) this.markDirty();
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const r = this.rect;
    const titleH = this.options.title ? Math.max(12, r.h * 0.09) : 0;
    const area = rect(r.x, r.y + titleH, r.w, r.h - titleH);
    const shown = Math.max(
      1,
      Math.min(this.rows.length, this.options.maxRows ?? 12),
    );
    const h = area.h / Math.max(shown, 6);
    const colour = this.options.colour ?? 'info';
    if (this.options.title)
      say(
        ctx,
        theme,
        this.options.title,
        r.x,
        r.y + titleH * 0.78,
        titleH * 0.8,
        colour,
        'left',
        'alphabetic',
        r.w,
      );
    // The rows on show: a page of them, chosen by which part of a long list the sweep is in.
    const pages = Math.ceil(this.rows.length / shown);
    const page =
      pages > 1 ? Math.min(pages - 1, Math.floor(this.at * pages)) : 0;
    const within = pages > 1 ? this.at * pages - page : this.at;
    const rows = this.rows.slice(page * shown, page * shown + shown);
    const under = sweepRow(within, rows.length);
    const flashOn = this.step % 10 < 5;
    rows.forEach((row, i) => {
      const y = area.y + i * h;
      const lit = i === under;
      const rc = row.flag
        ? flashOn
          ? 'alert'
          : 'dim'
        : (row.colour ?? colour);
      if (lit) {
        ctx.fillStyle = colourOf(theme, rc);
        tracePath(
          ctx,
          pillPath(rect(r.x, y + h * 0.08, r.w, h * 0.84), 'both'),
        );
        ctx.fill();
      } else {
        ctx.fillStyle = colourOf(theme, rc);
        ctx.fillRect(r.x, y + h * 0.12, h * 0.25, h * 0.76);
      }
      const ink = lit ? theme.ink : rc;
      say(
        ctx,
        theme,
        row.label,
        r.x + h * 0.45,
        y + h * 0.74,
        h * 0.56,
        ink,
        'left',
        'alphabetic',
        r.w * 0.6,
      );
      say(
        ctx,
        theme,
        row.value,
        r.x + r.w - h * 0.4,
        y + h * 0.74,
        h * 0.56,
        ink,
        'right',
        'alphabetic',
        r.w * 0.36,
        600,
      );
    });
    // The scanning bar itself.
    const by = area.y + within * Math.min(area.h, rows.length * h);
    ctx.fillStyle = colourOf(theme, 'lit');
    ctx.globalAlpha = 0.85;
    ctx.fillRect(r.x, by - 1, r.w, Math.max(2, h * 0.06));
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
// A status matrix.

/** A cell of a status matrix: its words and colour, flashing if asked. */
export interface Cell {
  words?: string;
  colour?: string;
  flashing?: boolean;
  /** Shown hollow: off, absent, not fitted. */
  dark?: boolean;
}

/**
 * A matrix of status cells, its rows and columns named: each cell a block
 * in its state's colour with its words, hollow when dark, flashing in
 * alarm.
 */
export class StatusGrid extends UiNode {
  cells: Cell[][];
  private key = '';
  private blinkShown = true;
  constructor(
    readonly options: NodeOptions & {
      rows: readonly string[];
      columns: readonly string[];
      /** The row names' share of the width. */
      labelShare?: number;
    },
  ) {
    super(options);
    this.cells = options.rows.map(() => options.columns.map(() => ({})));
  }
  /** Set every cell at once (rows of columns): dirty only if any changed. */
  setAll(cells: readonly (readonly Cell[])[]) {
    const key = JSON.stringify(cells);
    if (key === this.key) return;
    this.key = key;
    this.cells = cells.map((row) => row.map((c) => ({ ...c })));
    this.markDirty();
  }
  /** Each cell's rectangle (pure, from its layout). */
  cellRect(row: number, col: number): Rect {
    const r = this.rect;
    const nr = this.options.rows.length;
    const nc = this.options.columns.length;
    const labelW = r.w * (this.options.labelShare ?? 0.28);
    const headH = Math.min(r.h * 0.12, r.h / (nr + 1));
    const gap = Math.max(2, Math.min(r.w, r.h) * 0.012);
    const cw = (r.w - labelW - gap * nc) / nc;
    const ch = (r.h - headH - gap * nr) / nr;
    return rect(
      r.x + labelW + gap + col * (cw + gap),
      r.y + headH + gap + row * (ch + gap),
      cw,
      ch,
    );
  }
  tick(seconds: number) {
    const on = blinkOn(seconds, 0.5);
    if (
      on !== this.blinkShown &&
      this.cells.some((row) => row.some((c) => c.flashing))
    ) {
      this.blinkShown = on;
      this.markDirty();
    }
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const r = this.rect;
    const nr = this.options.rows.length;
    if (!nr || !this.options.columns.length) return;
    const labelW = r.w * (this.options.labelShare ?? 0.28);
    const headH = Math.min(r.h * 0.12, r.h / (nr + 1));
    this.options.columns.forEach((name, c) => {
      const cr = this.cellRect(0, c);
      say(
        ctx,
        theme,
        name,
        cr.x + cr.w / 2,
        r.y + headH * 0.78,
        headH * 0.62,
        'secondary',
        'center',
        'alphabetic',
        cr.w,
      );
    });
    this.options.rows.forEach((name, i) => {
      const first = this.cellRect(i, 0);
      const px = Math.min(first.h * 0.5, headH * 0.8);
      say(
        ctx,
        theme,
        name,
        r.x,
        first.y + first.h / 2 + px * 0.36,
        px,
        'primary',
        'left',
        'alphabetic',
        labelW * 0.95,
      );
      this.options.columns.forEach((_, c) => {
        const cell = this.cells[i]?.[c] ?? {};
        const cr = this.cellRect(i, c);
        const colour =
          cell.flashing && !this.blinkShown ? 'dim' : (cell.colour ?? 'track');
        const fill = colourOf(theme, colour);
        tracePath(ctx, pillPath(cr, cr.w > cr.h * 1.6 ? 'both' : 'none'));
        if (cell.dark) {
          ctx.strokeStyle = fill;
          ctx.lineWidth = Math.max(1.5, cr.h * 0.06);
          ctx.stroke();
        } else {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        say(
          ctx,
          theme,
          cell.words ?? '',
          cr.x + cr.w / 2,
          cr.y + cr.h / 2 + Math.min(cr.h * 0.5, cr.w * 0.22) * 0.36,
          Math.min(cr.h * 0.5, cr.w * 0.22),
          cell.dark ? colour : theme.ink,
          'center',
          'alphabetic',
          cr.w * 0.9,
          600,
        );
      });
    });
  }
}

// ---------------------------------------------------------------------------
// A sequence strip.

/**
 * A sequence or timeline strip: its steps as blocks along a row, those
 * done dimmed, the current lit with its progress filling it, those to
 * come dark; a caption under it (a countdown, what it waits for).
 */
export class SequenceStrip extends UiNode {
  current: number | null = null;
  progress = 0;
  words = '';
  colour: string;
  constructor(
    public steps: readonly string[],
    readonly options: NodeOptions & { colour?: string; title?: string } = {},
  ) {
    super(options);
    this.colour = options.colour ?? 'primary';
  }
  set(current: number | null, progress = 0, words = '', colour?: string) {
    this.change('current', current);
    this.change('progress', clamp01(Math.round(progress * 100) / 100));
    this.change('words', words);
    if (colour) this.change('colour', colour);
  }
  setSteps(steps: readonly string[]) {
    if (steps.join('|') === this.steps.join('|')) return;
    this.steps = steps;
    this.markDirty();
  }
  /** Each step's block (pure, from its layout). */
  blocks(): Rect[] {
    const r = this.rect;
    const titleH = this.options.title ? r.h * 0.22 : 0;
    const strip = rect(r.x, r.y + titleH, r.w, (r.h - titleH) * 0.5);
    const n = Math.max(1, this.steps.length);
    const gap = Math.max(3, strip.h * 0.12);
    const w = (strip.w - gap * (n - 1)) / n;
    return this.steps.map((_, i) =>
      rect(strip.x + i * (w + gap), strip.y, w, strip.h),
    );
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const r = this.rect;
    const titleH = this.options.title ? r.h * 0.22 : 0;
    if (this.options.title)
      say(
        ctx,
        theme,
        this.options.title,
        r.x,
        r.y + titleH * 0.8,
        titleH * 0.8,
        this.colour,
        'left',
        'alphabetic',
        r.w,
      );
    const blocks = this.blocks();
    const n = blocks.length;
    blocks.forEach((b, i) => {
      const caps =
        n === 1 ? 'both' : i === 0 ? 'left' : i === n - 1 ? 'right' : 'none';
      const cur = this.current;
      const done = cur !== null && i < cur;
      const now = cur === i;
      tracePath(ctx, pillPath(b, caps));
      ctx.fillStyle = colourOf(theme, done ? 'dim' : 'track');
      ctx.fill();
      if (now) {
        ctx.save();
        tracePath(ctx, pillPath(b, caps));
        ctx.clip();
        ctx.fillStyle = colourOf(theme, this.colour);
        ctx.fillRect(b.x, b.y, b.w * Math.max(0.04, this.progress), b.h);
        ctx.restore();
        tracePath(ctx, pillPath(b, caps));
        ctx.strokeStyle = colourOf(theme, 'lit');
        ctx.lineWidth = Math.max(2, b.h * 0.06);
        ctx.stroke();
      }
      const px = Math.min(b.h * 0.42, b.w * 0.2);
      say(
        ctx,
        theme,
        this.steps[i],
        b.x + b.w / 2,
        b.y + b.h / 2 + px * 0.36,
        px,
        now ? 'lit' : done ? '#000000' : 'tertiary',
        'center',
        'alphabetic',
        b.w * 0.86,
        600,
      );
    });
    const capY = r.y + titleH + (r.h - titleH) * 0.5;
    const capH = (r.h - titleH) * 0.5;
    say(
      ctx,
      theme,
      this.words,
      r.x + r.w / 2,
      capY + capH * 0.7,
      capH * 0.5,
      'accent',
      'center',
      'alphabetic',
      r.w,
    );
  }
}

// ---------------------------------------------------------------------------
// A targeting reticle.

/**
 * A targeting reticle: a round scope whose axes are two readings (pH
 * across, say, and chlorine up), its target zone boxed, its blip where
 * the readings put it, a scan line turning round it while `scanning` (at
 * most `ANIMATION_HZ` steps a second); locked (lit) while the blip is in
 * the zone, flashing red outside it.
 */
export class Reticle extends UiNode {
  x = 0;
  y = 0;
  words = '';
  private step = -1;
  private blinkShown = true;
  constructor(
    public label: string,
    readonly options: NodeOptions & {
      xRange: readonly [number, number];
      yRange: readonly [number, number];
      /** The target zone, in the readings' units: x from, x to, y from, y to. */
      zone: readonly [number, number, number, number];
      xLabel?: string;
      yLabel?: string;
      colour?: string;
      scanning?: boolean;
    },
  ) {
    super(options);
  }
  set(x: number, y: number, words = '') {
    const rx = Math.round(x * 100) / 100;
    const ry = Math.round(y * 100) / 100;
    this.change('x', rx);
    this.change('y', ry);
    this.change('words', words);
  }
  /** Whether the blip is in its zone. */
  get locked() {
    const [x0, x1, y0, y1] = this.options.zone;
    return this.x >= x0 && this.x <= x1 && this.y >= y0 && this.y <= y1;
  }
  /** A reading's place in the scope, -1 to 1 each way (y up), clamped. */
  toScope(x: number, y: number) {
    const [a, b] = this.options.xRange;
    const [c, d] = this.options.yRange;
    const f = (v: number, lo: number, hi: number) =>
      Math.max(-1, Math.min(1, ((v - lo) / (hi - lo || 1)) * 2 - 1));
    return { u: f(x, a, b), v: f(y, c, d) };
  }
  tick(seconds: number) {
    const step = animationStep(seconds);
    if (step !== this.step) {
      this.step = step;
      if (this.options.scanning ?? true) this.markDirty();
    }
    const on = blinkOn(seconds, 0.5);
    if (on !== this.blinkShown && !this.locked) {
      this.blinkShown = on;
      this.markDirty();
    }
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const r = this.rect;
    const labelH = Math.max(10, r.h * 0.12);
    const radius = Math.max(4, Math.min(r.w, r.h - labelH * 2) / 2 - 2);
    const cx = r.x + r.w / 2;
    const cy = r.y + labelH + (r.h - labelH * 2) / 2;
    const colour = this.options.colour ?? 'info';
    const c = colourOf(theme, colour);
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(1.5, radius * 0.02);
    for (const k of [1, 0.66, 0.33]) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * k, 0, Math.PI * 2);
      ctx.globalAlpha = k === 1 ? 1 : 0.45;
      ctx.stroke();
    }
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (this.options.scanning ?? true) {
      const a = (this.step / ANIMATION_HZ) * 1.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, a - 0.35, a);
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const [x0, x1, y0, y1] = this.options.zone;
    const p0 = this.toScope(x0, y0);
    const p1 = this.toScope(x1, y1);
    const zx = cx + p0.u * radius;
    const zy = cy - p1.v * radius;
    ctx.strokeStyle = colourOf(theme, 'ok');
    ctx.lineWidth = Math.max(2, radius * 0.03);
    ctx.setLineDash([radius * 0.06, radius * 0.04]);
    ctx.strokeRect(zx, zy, (p1.u - p0.u) * radius, (p1.v - p0.v) * radius);
    ctx.setLineDash([]);
    const blip = this.toScope(this.x, this.y);
    const bx = cx + blip.u * radius;
    const by = cy - blip.v * radius;
    const lockColour = this.locked ? 'lit' : this.blinkShown ? 'alert' : 'dim';
    ctx.fillStyle = colourOf(theme, lockColour);
    ctx.strokeStyle = colourOf(theme, lockColour);
    ctx.beginPath();
    ctx.arc(bx, by, Math.max(3, radius * 0.07), 0, Math.PI * 2);
    ctx.fill();
    // Its brackets.
    const s = radius * 0.16;
    ctx.lineWidth = Math.max(2, radius * 0.025);
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(bx + dx * s, by + dy * s * 0.5);
      ctx.lineTo(bx + dx * s, by + dy * s);
      ctx.lineTo(bx + dx * s * 0.5, by + dy * s);
      ctx.stroke();
    }
    say(
      ctx,
      theme,
      this.label,
      cx,
      r.y + labelH * 0.8,
      labelH * 0.8,
      colour,
      'center',
      'alphabetic',
      r.w,
    );
    say(
      ctx,
      theme,
      this.words,
      cx,
      r.y + r.h - labelH * 0.15,
      labelH * 0.8,
      this.locked ? 'lit' : 'alert',
      'center',
      'alphabetic',
      r.w,
      600,
    );
    say(
      ctx,
      theme,
      this.options.xLabel ?? '',
      cx + radius,
      cy - radius * 0.04,
      radius * 0.1,
      colour,
      'right',
      'bottom',
    );
    say(
      ctx,
      theme,
      this.options.yLabel ?? '',
      cx + radius * 0.03,
      cy - radius + radius * 0.12,
      radius * 0.1,
      colour,
      'left',
      'top',
    );
  }
}

// ---------------------------------------------------------------------------
// The rotator.

/** A design a rotator shows: its title, for the page indicator and a browser's list, and its tree. */
export interface RotatorDesign {
  title: string;
  /** A few words for a browser's button (default the title's first part). */
  short?: string;
  node: UiNode;
}

/**
 * Several designs shown one at a time. Those in its cycle (all of them
 * unless `cycle` says which) come up in turn, each for `period` seconds
 * (default 18), the next brought in by a short wipe (a bright bar sweeping
 * across, revealing it); any design, in the cycle or not, can be chosen
 * (`select`), which holds it until the rotation is let go
 * (`setPaused(false)`). A page indicator along its foot names the design
 * shown and lights its place in the cycle; a press on it brings the next
 * at once. Only the design shown is ticked, so a hidden design's
 * animations never ask for paint; the host should update only the design
 * shown (`current`, told by `onShow` when it changes).
 */
export class Rotator extends UiNode {
  current: number;
  paused = false;
  /** Its place in the cycle. */
  private k = 0;
  private turnStart: number;
  private wipeStart = -Infinity;
  private wipe: number | null = null;
  private seconds = 0;
  private step = -1;
  readonly cycle: readonly number[];
  private readonly listeners = new Set<(index: number) => void>();
  constructor(
    readonly designs: readonly RotatorDesign[],
    readonly options: NodeOptions & {
      /** Seconds each design is shown. */
      period?: number;
      /** Seconds of the wipe. */
      transition?: number;
      /** Seconds already run of the first turn, to set rotators started together apart. */
      offset?: number;
      /** The designs that come up in turn, by index (default all). */
      cycle?: readonly number[];
      /** The indicator's colour. */
      colour?: string;
      /** No indicator strip (a browser shows its own). */
      bare?: boolean;
    } = {},
  ) {
    super(options);
    this.cycle = (options.cycle ?? designs.map((_, i) => i)).filter(
      (i) => i >= 0 && i < designs.length,
    );
    this.current = this.cycle[0] ?? 0;
    this.turnStart = -(options.offset ?? 0);
    for (const d of designs) this.add(d.node);
    this.showOnly();
  }
  get period() {
    return this.options.period ?? 18;
  }
  /** The indicator strip along its foot (pure, from its layout). */
  indicator(): Rect {
    const r = this.rect;
    if (this.options.bare) return rect(r.x, r.y + r.h, r.w, 0);
    const h = Math.max(10, Math.round(r.h * 0.05));
    return rect(r.x, r.y + r.h - h, r.w, h);
  }
  /** The designs' room, above the indicator. */
  content(): Rect {
    const r = this.rect;
    const ind = this.indicator();
    return rect(r.x, r.y, r.w, Math.max(0, r.h - ind.h * 1.6));
  }
  protected layoutChildren(_r: Rect, theme: Theme) {
    const c = this.content();
    for (const d of this.designs) d.node.layout(c, theme);
  }
  private showOnly() {
    this.designs.forEach((d, i) => d.node.setHidden(i !== this.current));
  }
  onShow(listener: (index: number) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  /** Bring design `index` up now, wiping it in. */
  private bring(index: number) {
    this.turnStart = this.seconds;
    if (index === this.current) return;
    this.current = index;
    this.wipeStart = this.seconds;
    this.showOnly();
    this.markDirty();
    for (const l of this.listeners) l(index);
  }
  /** Choose design `index` (any, in the cycle or not) and hold it there. */
  select(index: number) {
    if (index < 0 || index >= this.designs.length) return;
    const k = this.cycle.indexOf(index);
    if (k >= 0) this.k = k;
    this.bring(index);
    this.setPaused(true);
  }
  /** The next design of the cycle, now. */
  next() {
    if (!this.cycle.length) return;
    const k = this.cycle.indexOf(this.current);
    this.k = (k < 0 ? this.k : k + 1) % this.cycle.length;
    this.bring(this.cycle[this.k]);
  }
  /** Hold the design shown, or let the cycle turn again (from now). */
  setPaused(paused: boolean) {
    if (paused === this.paused) return;
    this.paused = paused;
    this.turnStart = this.seconds;
    this.markDirty();
  }
  tick(seconds: number) {
    this.seconds = seconds;
    const step = animationStep(seconds);
    if (step !== this.step) {
      this.step = step;
      if (
        !this.paused &&
        this.cycle.length > 1 &&
        seconds - this.turnStart >= this.period
      )
        this.next();
      const since = seconds - this.wipeStart;
      const t = this.options.transition ?? 0.6;
      const wipe =
        since >= 0 && since < t ? Math.round((since / t) * 10) / 10 : null;
      if (wipe !== this.wipe) {
        this.wipe = wipe;
        this.markDirty();
      }
    }
    this.designs[this.current]?.node.tick(seconds);
  }
  get pressable() {
    return !this.options.bare && this.cycle.length > 1;
  }
  protected hitsSelf(_x: number, y: number) {
    const ind = this.indicator();
    return y >= ind.y - ind.h * 0.6;
  }
  press(): PressOutcome {
    this.next();
    return { action: this.id ? `${this.id}/next` : null, sound: 'page' };
  }
  paint(ctx: CanvasRenderingContext2D, theme: Theme, seconds: number) {
    if (this.hidden) return;
    super.paint(ctx, theme, seconds);
    const c = this.content();
    if (this.wipe !== null) {
      // The part not yet revealed blacked out, a bright bar at its edge.
      const x = c.x + c.w * this.wipe;
      ctx.fillStyle = theme.background;
      ctx.fillRect(x, c.y, c.x + c.w - x, c.h);
      const bar = Math.max(6, c.w * 0.012);
      ctx.fillStyle = colourOf(theme, this.options.colour ?? 'accent');
      ctx.fillRect(x - bar / 2, c.y, bar, c.h);
    }
    if (!this.options.bare) this.drawIndicator(ctx, theme);
  }
  private drawIndicator(ctx: CanvasRenderingContext2D, theme: Theme) {
    const ind = this.indicator();
    const n = this.cycle.length;
    const colour = this.options.colour ?? 'accent';
    const titleW = ind.w * 0.5;
    const title = this.designs[this.current]?.title ?? '';
    say(
      ctx,
      theme,
      `${title}${this.paused ? ' · HELD' : ''}`,
      ind.x,
      ind.y + ind.h * 0.9,
      ind.h * 1.05,
      colour,
      'left',
      'alphabetic',
      titleW,
    );
    if (n < 2) return;
    const pill = Math.min(ind.h * 2.4, (ind.w - titleW) / n - ind.h * 0.4);
    let x = ind.x + ind.w - n * (pill + ind.h * 0.4) + ind.h * 0.4;
    for (const i of this.cycle) {
      tracePath(
        ctx,
        pillPath(rect(x, ind.y + ind.h * 0.1, pill, ind.h * 0.8), 'both'),
      );
      ctx.fillStyle = colourOf(theme, i === this.current ? 'lit' : 'tertiary');
      ctx.globalAlpha = i === this.current ? 1 : 0.55;
      ctx.fill();
      ctx.globalAlpha = 1;
      x += pill + ind.h * 0.4;
    }
  }
}

// ---------------------------------------------------------------------------
// The schematic browser.

/**
 * A console's schematic browser: a sidebar frame whose buttons list the
 * designs (a page of them at a time, MORE for the next page), one press
 * bringing a design up and holding it; CYCLE lit while the rotator turns
 * through its cycle by itself, pressed to resume it (or to hold the
 * design shown). The content is a `Rotator`, which it owns.
 */
export class SchematicBrowser extends UiNode {
  readonly rotator: Rotator;
  readonly frame: Frame;
  readonly cycleButton: Button;
  readonly items: Button[];
  readonly more: Button;
  page = 0;
  constructor(
    designs: readonly RotatorDesign[],
    readonly options: NodeOptions & {
      title: string;
      code?: string;
      footer?: string;
      colour?: string;
      period?: number;
      offset?: number;
      cycle?: readonly number[];
      /** Designs listed at once in the sidebar. */
      pageSize?: number;
    },
  ) {
    super(options);
    this.rotator = new Rotator(designs, {
      period: options.period,
      offset: options.offset,
      cycle: options.cycle,
      colour: options.colour,
    });
    const size = this.pageSize;
    this.cycleButton = new Button({
      label: 'CYCLE',
      colour: 'tertiary',
      litColour: 'lit',
      lit: true,
      id: 'browser/cycle',
      onPress: () => {
        this.rotator.setPaused(!this.rotator.paused);
        this.refresh();
        return 'confirm';
      },
    });
    this.items = Array.from(
      { length: size },
      (_, slot) =>
        new Button({
          colour: options.colour ?? 'primary',
          id: `browser/item/${slot}`,
          onPress: () => {
            const i = this.page * size + slot;
            if (i >= designs.length) return 'deny';
            this.rotator.select(i);
            this.refresh();
            return 'page';
          },
        }),
    );
    this.more = new Button({
      label: 'MORE',
      colour: 'secondary',
      id: 'browser/more',
      onPress: () => {
        this.page = (this.page + 1) % this.pages;
        this.refresh();
        return 'page';
      },
    });
    this.frame = new Frame({
      title: options.title,
      code: options.code,
      footer: options.footer,
      colour: options.colour,
      sidebar: [this.cycleButton, ...this.items, this.more],
      content: this.rotator,
    });
    this.add(this.frame);
    this.rotator.onShow(() => this.refresh());
    this.refresh();
  }
  get pageSize() {
    return this.options.pageSize ?? 4;
  }
  protected layoutChildren(r: Rect, theme: Theme) {
    // Its sidebar's slots a little smaller than a frame's own, to hold
    // CYCLE, a page of designs and MORE.
    (this.frame.options as { unit?: number }).unit =
      r.h / (this.pageSize + 6.2);
    this.frame.layout(r, theme);
  }
  get pages() {
    return Math.max(1, Math.ceil(this.rotator.designs.length / this.pageSize));
  }
  /** The buttons as the rotator stands: the shown design lit, CYCLE lit while it turns. */
  refresh() {
    const size = this.pageSize;
    const designs = this.rotator.designs;
    this.items.forEach((b, slot) => {
      const i = this.page * size + slot;
      b.setHidden(false);
      b.setLabel(
        i < designs.length
          ? (designs[i].short ?? shortTitle(designs[i].title))
          : '',
      );
      b.setDisabled(i >= designs.length);
      b.setLit(i === this.rotator.current);
    });
    this.more.setHidden(this.pages < 2);
    this.more.setSub(this.pages > 1 ? `${this.page + 1} OF ${this.pages}` : '');
    this.cycleButton.setLit(!this.rotator.paused);
    this.cycleButton.setLabel(this.rotator.paused ? 'HELD' : 'CYCLE');
    this.frame.bottomBar.setTitle(
      `${designs[this.rotator.current]?.title ?? ''}${this.rotator.paused ? ' · HELD' : ''}`,
    );
  }
  /** Show page `page` of the list. */
  showPage(page: number) {
    this.page = ((page % this.pages) + this.pages) % this.pages;
    this.refresh();
  }
}

/** A design's title cut to a sidebar button's few words: its first part before a ` · `. */
export const shortTitle = (title: string) => title.split(' · ')[0];
