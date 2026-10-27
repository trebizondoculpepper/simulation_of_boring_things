import { rect } from './geometry';
import type { Rect } from './geometry';
import { UiNode, paintVeiled } from './node';
import type { Theme } from './theme';
import { Bar, Elbow } from './components';
import { drawEmblem } from './emblem';
import type { EmblemOptions } from './emblem';

/**
 * A display's boot (the owner, 2026-10-27): black at first; then, for a
 * couple of seconds, an emblem (`emblem.ts`); a fade to black; then its
 * interface drawn in, the frame's elbows and bars sweeping out and the
 * panels appearing in turn, after which it is operational and takes
 * touches. Any tree can be run through it by wrapping it in a
 * `BootScreen`; a `BootGroup` boots a room of them, each a little after
 * the last. The timing (`bootState`) is pure; nothing here knows what the
 * display shows.
 */

export type BootPhase = 'black' | 'emblem' | 'fade' | 'draw' | 'on';

/** Seconds each part of a boot takes. */
export interface BootTiming {
  /** The emblem shown, its fade-in included. */
  emblem: number;
  /** The emblem's own fade in from black, at its start. */
  emblemIn: number;
  /** Its fade to black. */
  fade: number;
  /** Black between the emblem and the interface. */
  gap: number;
  /** The interface drawing in. */
  draw: number;
}

export const BOOT_TIMING: BootTiming = {
  emblem: 5.0,
  emblemIn: 0.3,
  fade: 0.5,
  gap: 0.15,
  draw: 1.0,
};

/** The most a booting display repaints a second (mission 094's rule allows 10–20 while animating). */
export const BOOT_HZ = 15;

/** Seconds from a boot's start (after its offset) to operational. */
export const bootDuration = (timing: BootTiming = BOOT_TIMING) =>
  timing.emblem + timing.fade + timing.gap + timing.draw;

export interface BootState {
  phase: BootPhase;
  /** How far through its phase, 0 to 1 (1 when on). */
  progress: number;
  /** How much of the emblem shows (0 to 1). */
  emblem: number;
}

/** Where a boot is `t` seconds after its start (negative: still waiting, black). */
export function bootState(
  t: number,
  timing: BootTiming = BOOT_TIMING,
): BootState {
  if (t < 0) return { phase: 'black', progress: 0, emblem: 0 };
  if (t < timing.emblem)
    return {
      phase: 'emblem',
      progress: t / timing.emblem,
      emblem: timing.emblemIn > 0 ? Math.min(1, t / timing.emblemIn) : 1,
    };
  let s = t - timing.emblem;
  if (s < timing.fade) {
    const f = s / timing.fade;
    return { phase: 'fade', progress: f, emblem: 1 - f };
  }
  s -= timing.fade;
  if (s < timing.gap)
    return { phase: 'black', progress: s / timing.gap, emblem: 0 };
  s -= timing.gap;
  if (s < timing.draw)
    return { phase: 'draw', progress: s / timing.draw, emblem: 0 };
  return { phase: 'on', progress: 1, emblem: 0 };
}

/** `n` start offsets scattered over `spread` seconds from `from` (a room of screens booting at different times). */
export function staggeredOffsets(
  n: number,
  spread = 1.5,
  from = 0,
  random: () => number = Math.random,
): number[] {
  return Array.from({ length: n }, () => from + random() * spread);
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => {
  const c = clamp01(x);
  return 1 - (1 - c) * (1 - c);
};

/** The draw-in: the frame's sweep window, and when the panels begin and end appearing, as shares of it. */
export const DRAW_IN = {
  /** Elbows and bars: each sweeps over this share, starting by its place in the first `frameSpread`. */
  frameSweep: 0.35,
  frameSpread: 0.25,
  /** Panels: they appear in turn from `panelsFrom` to `panelsTo`, each flickering at half strength for `flicker`. */
  panelsFrom: 0.3,
  panelsTo: 0.92,
  flicker: 0.06,
} as const;

/** A leaf's place on the screen for the draw-in, 0 (top left) to 1 (bottom right). */
function placeOf(r: Rect, screen: Rect) {
  const x = screen.w > 0 ? (r.x + r.w / 2 - screen.x) / screen.w : 0;
  const y = screen.h > 0 ? (r.y + r.h / 2 - screen.y) / screen.h : 0;
  return clamp01(0.6 * clamp01(y) + 0.4 * clamp01(x));
}

/** The leaves of a tree that are shown, in order. */
function leavesOf(node: UiNode, out: UiNode[] = []) {
  if (node.hidden) return out;
  if (node.children.length === 0) out.push(node);
  else for (const c of node.children) leavesOf(c, out);
  return out;
}

/**
 * When each leaf of `tree` appears in a draw-in, as shares of it: elbows
 * and bars (the frame) sweep, by their place; every other leaf (a panel)
 * appears at its turn, taken in order of place. Pure.
 */
export function drawInPlan(tree: UiNode, screen: Rect) {
  const plan = new Map<UiNode, { start: number; frame: boolean }>();
  const panels: { node: UiNode; at: number }[] = [];
  for (const leaf of leavesOf(tree)) {
    const at = placeOf(leaf.rect, screen);
    if (leaf instanceof Elbow || leaf instanceof Bar)
      plan.set(leaf, { start: at * DRAW_IN.frameSpread, frame: true });
    else panels.push({ node: leaf, at });
  }
  panels.sort((a, b) => a.at - b.at);
  const span = DRAW_IN.panelsTo - DRAW_IN.panelsFrom;
  panels.forEach((p, i) =>
    plan.set(p.node, {
      start:
        DRAW_IN.panelsFrom +
        (panels.length > 1 ? (span * i) / (panels.length - 1) : 0),
      frame: false,
    }),
  );
  return plan;
}

/** How much of a frame piece shows `p` into the draw-in (0 to 1), and whether a panel shows (0, a flicker's half, or 1). */
export function drawInShare(
  entry: { start: number; frame: boolean },
  p: number,
) {
  if (entry.frame) return ease((p - entry.start) / DRAW_IN.frameSweep);
  if (p < entry.start) return 0;
  return p < entry.start + DRAW_IN.flicker ? 0.5 : 1;
}

export interface BootScreenOptions {
  timing?: Partial<BootTiming>;
  emblem?: EmblemOptions;
  /** Its own emblem, in place of the kit's. */
  drawEmblem?: (
    ctx: CanvasRenderingContext2D,
    r: Rect,
    t: number,
    theme: Theme,
  ) => void;
  /** Start black, waiting for `boot()` (default: on, operational). */
  dark?: boolean;
}

/**
 * A tree run through a boot: on (and operational) until `boot(offset)`,
 * then black, the emblem, black again and the interface drawing in, as
 * `bootState`; touches reach the tree only once it is on. Marks itself
 * dirty only when what it shows changes: once for black, at most
 * `BOOT_HZ` times a second while the emblem, its fade or the draw-in
 * moves, and never by itself once on.
 */
export class BootScreen extends UiNode {
  /** Its boot's timing: its own options', or a boot's own (`boot`). */
  timing: BootTiming;
  private mode: 'on' | 'waiting' | 'running' | 'dark';
  private offset = 0;
  private start = 0;
  private now = 0;
  private shown = '';
  private plan: Map<UiNode, { start: number; frame: boolean }> | null = null;

  constructor(
    readonly content: UiNode,
    readonly options: BootScreenOptions = {},
  ) {
    super();
    this.timing = { ...BOOT_TIMING, ...options.timing };
    this.mode = options.dark ? 'dark' : 'on';
    this.add(content);
  }

  /** Boot: black at once, the emblem `offset` seconds after its next tick; `timing` for this boot only. */
  boot(offset = 0, timing?: Partial<BootTiming>) {
    this.timing = { ...BOOT_TIMING, ...this.options.timing, ...timing };
    this.mode = 'waiting';
    this.offset = Math.max(0, offset);
    this.plan = null;
    this.shown = 'black';
    this.markDirty();
  }

  /** Straight to on, operational. */
  skip() {
    if (this.mode === 'on') return;
    this.mode = 'on';
    this.plan = null;
    this.markDirty();
  }

  /** Where its boot is now. */
  get state(): BootState {
    if (this.mode === 'on') return { phase: 'on', progress: 1, emblem: 0 };
    if (this.mode !== 'running')
      return { phase: 'black', progress: 0, emblem: 0 };
    return bootState(this.now - this.start, this.timing);
  }

  get phase(): BootPhase {
    return this.state.phase;
  }

  /** Operational: on, taking touches. */
  get operational() {
    return this.mode === 'on';
  }

  /** Booting: not yet on (waiting, black, or drawing). */
  get booting() {
    return this.mode === 'waiting' || this.mode === 'running';
  }

  tick(seconds: number) {
    this.now = seconds;
    if (this.mode === 'waiting') {
      this.start = seconds + this.offset;
      this.mode = 'running';
    }
    if (this.mode === 'running') {
      const s = this.state;
      if (s.phase === 'on') {
        this.mode = 'on';
        this.plan = null;
        this.markDirty();
      } else {
        // What it shows, to the step it is redrawn at.
        const key =
          s.phase === 'black'
            ? 'black'
            : `${s.phase}:${Math.floor(seconds * BOOT_HZ + 1e-9)}`;
        if (key !== this.shown) {
          this.shown = key;
          this.markDirty();
        }
      }
    }
    super.tick(seconds);
  }

  protected layoutChildren(r: Rect, theme: Theme) {
    this.content.layout(r, theme);
    this.plan = null;
  }

  paint(ctx: CanvasRenderingContext2D, theme: Theme, seconds: number) {
    if (this.hidden) return;
    if (this.mode === 'on') {
      this.content.paint(ctx, theme, seconds);
      return;
    }
    const r = this.rect;
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    const s = this.state;
    if (s.emblem > 0) {
      ctx.globalAlpha = s.emblem;
      const t = this.now - this.start;
      // The emblem in the middle, a little inside the screen's edges.
      const inset = Math.min(r.w, r.h) * 0.06;
      const area = rect(
        r.x + inset,
        r.y + inset,
        r.w - 2 * inset,
        r.h - 2 * inset,
      );
      if (this.options.drawEmblem) this.options.drawEmblem(ctx, area, t, theme);
      else
        drawEmblem(ctx, area, t, { font: theme.font, ...this.options.emblem });
    } else if (s.phase === 'draw') {
      if (!this.plan) this.plan = drawInPlan(this.content, r);
      const plan = this.plan;
      const p = s.progress;
      paintVeiled(this.content, ctx, theme, seconds, (node, c) => {
        const entry = plan.get(node);
        if (!entry) return p >= DRAW_IN.panelsTo;
        const f = drawInShare(entry, p);
        if (f <= 0) return false;
        if (entry.frame && f < 1) {
          // Swept out from its start: an elbow from its corner, a bar along its length.
          const n = node.rect;
          let clip: Rect;
          if (node instanceof Elbow) {
            const east = node.corner === 'ne' || node.corner === 'se';
            const south = node.corner === 'sw' || node.corner === 'se';
            const w = n.w * f;
            const h = n.h * Math.min(1, f * 1.6);
            clip = rect(
              east ? n.x + n.w - w : n.x,
              south ? n.y + n.h - h : n.y,
              w,
              h,
            );
          } else if (n.h > n.w) clip = rect(n.x, n.y, n.w, n.h * f);
          else clip = rect(n.x, n.y, n.w * f, n.h);
          c.beginPath();
          c.rect(clip.x - 1, clip.y - 1, clip.w + 2, clip.h + 2);
          c.clip();
        } else if (!entry.frame && f < 1) c.globalAlpha = f;
        return true;
      });
    }
    ctx.restore();
  }

  hit(x: number, y: number): UiNode | null {
    return this.mode === 'on' ? super.hit(x, y) : null;
  }
}

/**
 * The screens of a room, booted together, each at its own offset: `bootAll`
 * scatters them over `spread` seconds (a room of screens never boots as
 * one); `skipAll` puts them all on; `autoBoot` boots each screen as it
 * joins (a room built while its screens arrive, booting on entry).
 */
export class BootGroup {
  readonly screens = new Set<BootScreen>();
  private auto: { from: number; spread: number } | null = null;
  constructor(private readonly random: () => number = Math.random) {}

  add(screen: BootScreen) {
    this.screens.add(screen);
    if (this.auto)
      screen.boot(this.auto.from + this.random() * this.auto.spread);
    return screen;
  }

  remove(screen: BootScreen) {
    this.screens.delete(screen);
  }

  /** Every screen booted, at offsets scattered over `spread` seconds from `from`; `timing` for this boot only. */
  bootAll(spread = 1.5, from = 0, timing?: Partial<BootTiming>) {
    for (const s of this.screens) s.boot(from + this.random() * spread, timing);
  }

  skipAll() {
    for (const s of this.screens) s.skip();
  }

  /** Boot each screen that joins from now on (null to stop). */
  autoBoot(options: { spread?: number; from?: number } | null = {}) {
    this.auto = options
      ? { spread: options.spread ?? 1.5, from: options.from ?? 0 }
      : null;
  }

  /** Whether any is still booting. */
  get booting() {
    for (const s of this.screens) if (s.booting) return true;
    return false;
  }
}
