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

/**
 * A display's state (the owner, 2026-10-27): UNPOWERED (no supply: black,
 * no touches), OFF (powered, its own switch off: black), BOOTING (black,
 * the emblem, black again, the interface drawing in) and RUNNING
 * (operational).
 */
export type DisplayState = 'unpowered' | 'off' | 'booting' | 'running';

/**
 * A display's next state from its power and its own switch: losing either
 * blacks it at once; regaining both (from UNPOWERED or OFF) boots it;
 * otherwise it carries on (BOOTING until booted, RUNNING). Pure.
 */
export function nextDisplayState(
  state: DisplayState,
  powered: boolean,
  switchedOn: boolean,
): DisplayState {
  if (!powered) return 'unpowered';
  if (!switchedOn) return 'off';
  if (state === 'unpowered' || state === 'off') return 'booting';
  return state;
}

/** How a display comes on when its power rises: booting (its own drawn plan), or straight to RUNNING. */
export type PowerUp = { offset: number; timing: BootTiming } | 'instant';

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

/** A duration drawn from a normal distribution, seconds: `mean`, standard deviation `sd`, floored at `min` (0 if none). */
export interface Spread {
  mean: number;
  sd: number;
  min?: number;
}

/** One draw from `spread` (Box–Muller over `random`), floored at its `min` (or 0). */
export function sampleSpread(
  spread: Spread,
  random: () => number = Math.random,
): number {
  const u = Math.max(1e-12, random());
  const v = random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(spread.min ?? 0, spread.mean + spread.sd * z);
}

/**
 * A boot whose parts are each drawn afresh per screen (the owner,
 * 2026-10-27): `from` seconds of black for every screen, then its own
 * further black (`black`), its emblem (`emblem`, its fade-in included),
 * black again (`after`, the emblem's fade to black included: floored at
 * `fade`), then the draw-in. `timing` gives the fixed parts (the emblem's
 * fade-in, its fade, the draw-in).
 */
export interface BootSpec {
  from?: number;
  black: Spread;
  emblem: Spread;
  after: Spread;
  timing?: Partial<BootTiming>;
}

/** One screen's boot drawn from `spec`: its offset (all its black before the emblem) and its timing. */
export function sampleBoot(
  spec: BootSpec,
  random: () => number = Math.random,
): { offset: number; timing: BootTiming } {
  const base = { ...BOOT_TIMING, ...spec.timing };
  const offset = (spec.from ?? 0) + sampleSpread(spec.black, random);
  const emblem = Math.max(base.emblemIn, sampleSpread(spec.emblem, random));
  const after = Math.max(base.fade, sampleSpread(spec.after, random));
  return {
    offset,
    timing: { ...base, emblem, gap: after - base.fade },
  };
}

/** Seconds from a boot drawn from `spec` beginning to its screen being operational, on average (each part at its mean, floored). */
export function meanBootReady(spec: BootSpec): number {
  const base = { ...BOOT_TIMING, ...spec.timing };
  return (
    (spec.from ?? 0) +
    Math.max(spec.black.min ?? 0, spec.black.mean) +
    Math.max(base.emblemIn, spec.emblem.min ?? 0, spec.emblem.mean) +
    Math.max(base.fade, spec.after.min ?? 0, spec.after.mean) +
    base.draw
  );
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
  /** Start unpowered, black, waiting for its power or `boot()` (default: powered, running). */
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
  // on: RUNNING; waiting, running: BOOTING; dark: UNPOWERED; off: OFF.
  private mode: 'on' | 'waiting' | 'running' | 'dark' | 'off';
  private powered: boolean;
  private switchedOn = true;
  private offset = 0;
  private start = 0;
  private now = 0;
  private shown = '';
  private plan: Map<UiNode, { start: number; frame: boolean }> | null = null;
  /**
   * Told whenever a boot or a skip changes what it shows, so its host can
   * repaint at once rather than at its next frame (a room seen only
   * through a doorway, say, whose screens must go black on the spot).
   */
  onChange: (() => void) | null = null;

  constructor(
    readonly content: UiNode,
    readonly options: BootScreenOptions = {},
  ) {
    super();
    this.timing = { ...BOOT_TIMING, ...options.timing };
    this.mode = options.dark ? 'dark' : 'on';
    this.powered = !options.dark;
    this.add(content);
  }

  /** Its state: UNPOWERED, OFF, BOOTING or RUNNING. */
  get displayState(): DisplayState {
    if (this.mode === 'on') return 'running';
    if (this.mode === 'dark') return 'unpowered';
    if (this.mode === 'off') return 'off';
    return 'booting';
  }

  /** Whether it has power. */
  get hasPower() {
    return this.powered;
  }

  /**
   * Its power, on or off (a room's supply, say): off blacks it at once
   * (UNPOWERED); on again boots it (`up`: its drawn plan, or straight to
   * RUNNING), if its own switch is on.
   */
  setPower(on: boolean, up: PowerUp = { offset: 0, timing: this.timing }) {
    this.powered = on;
    this.apply(up);
  }

  /** Its own switch, on or off: off blacks it (OFF); on again boots it, if powered. */
  setSwitch(on: boolean, up: PowerUp = { offset: 0, timing: this.timing }) {
    this.switchedOn = on;
    this.apply(up);
  }

  private apply(up: PowerUp) {
    const was = this.displayState;
    const next = nextDisplayState(was, this.powered, this.switchedOn);
    if (next === was) return;
    if (next === 'booting') {
      if (up === 'instant') this.skip();
      else this.boot(up.offset, up.timing);
      return;
    }
    this.mode = next === 'unpowered' ? 'dark' : 'off';
    this.plan = null;
    this.shown = 'black';
    this.markDirty();
    this.onChange?.();
  }

  /** Boot: black at once, the emblem `offset` seconds after its next tick; `timing` for this boot only. */
  boot(offset = 0, timing?: Partial<BootTiming>) {
    this.timing = { ...BOOT_TIMING, ...this.options.timing, ...timing };
    this.powered = true;
    this.switchedOn = true;
    this.mode = 'waiting';
    this.offset = Math.max(0, offset);
    this.plan = null;
    this.shown = 'black';
    this.markDirty();
    this.onChange?.();
  }

  /** Straight to on, operational. */
  skip() {
    if (this.mode === 'on') return;
    this.powered = true;
    this.switchedOn = true;
    this.mode = 'on';
    this.plan = null;
    this.markDirty();
    this.onChange?.();
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
 * one), or `bootEach` boots each with its own drawn durations; `skipAll` puts them all on; `autoBoot` boots each screen as it
 * joins (a room built while its screens arrive, booting on entry).
 */
export class BootGroup {
  readonly screens = new Set<BootScreen>();
  private auto: { from: number; spread: number } | null = null;
  private power = true;
  constructor(private readonly random: () => number = Math.random) {}

  add(screen: BootScreen) {
    this.screens.add(screen);
    // Joining an unpowered room: unpowered with it.
    if (!this.power) screen.setPower(false);
    else if (this.auto)
      screen.boot(this.auto.from + this.random() * this.auto.spread);
    return screen;
  }

  remove(screen: BootScreen) {
    this.screens.delete(screen);
  }

  /**
   * Every screen booted with its own durations, each drawn independently
   * from `spec` (`sampleBoot`), so the screens drift apart through the
   * whole boot. Returns the seconds from now (their next tick) until the
   * last of them is operational (`spec`'s mean if there are none), also
   * kept as `readyAt`.
   */
  bootEach(spec: BootSpec): number {
    let last = this.screens.size ? 0 : meanBootReady(spec);
    for (const s of this.screens) {
      const { offset, timing } = sampleBoot(spec, this.random);
      s.boot(offset, timing);
      last = Math.max(last, offset + bootDuration(timing));
    }
    this.readyAt = last;
    return last;
  }

  /** Seconds from the last `bootEach` until its last screen was to be operational. */
  readyAt = 0;

  /** Whether the room's displays have power. */
  get powered() {
    return this.power;
  }

  /**
   * The room's display power (the owner, 2026-10-27: one power signal for
   * a room's displays). Off: every screen UNPOWERED, black at once. On
   * (a rising edge): each screen boots with its own durations drawn from
   * `spec` (`sampleBoot`), or, `'instant'`, goes straight to RUNNING.
   * Returns the seconds from now until the last is operational (0 if
   * none boots), also kept as `readyAt`.
   */
  setPower(on: boolean, up: BootSpec | 'instant' = 'instant'): number {
    const rising = on && !this.power;
    this.power = on;
    let last = 0;
    for (const s of this.screens) {
      if (!on || !rising || up === 'instant') {
        s.setPower(on, 'instant');
        continue;
      }
      const plan = sampleBoot(up, this.random);
      s.setPower(true, plan);
      if (s.booting)
        last = Math.max(last, plan.offset + bootDuration(plan.timing));
    }
    if (rising) this.readyAt = last;
    return last;
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
