import { contains, rect } from './geometry';
import type { PathOp, Rect } from './geometry';
import type { Theme } from './theme';

/** The sounds a press asks the host to make: the kit makes none itself. */
export type UiSound = 'confirm' | 'deny' | 'page' | 'alert';

/** What a press did: the action it names, if any, and the sound it asks for. */
export interface PressResult {
  action: string | null;
  sound: UiSound | null;
  node: UiNode | null;
}

/** What a node's own press does: an action id, and a sound (null for none). */
export interface PressOutcome {
  action?: string | null;
  sound?: UiSound | null;
}

/** How a node asks its parent for room. */
export interface NodeOptions {
  /** Pixels along its parent stack, fixed. */
  size?: number;
  /** Its share of what its parent stack has left (default 1). */
  grow?: number;
  /** An id, for finding it and for its press's action. */
  id?: string;
}

/**
 * A node of the component tree: it is given a rectangle (`layout`), lays
 * its children in it, paints itself and them, says when it needs painting
 * again (a change marks it and its ancestors dirty), and answers a press
 * at a point. Framework-free: plain objects and a canvas context.
 */
export abstract class UiNode {
  rect: Rect = rect(0, 0, 0, 0);
  parent: UiNode | null = null;
  readonly children: UiNode[] = [];
  size?: number;
  grow: number;
  id?: string;
  /** Not laid out, painted or pressed. */
  hidden = false;
  /** Shown pressed (the host's press until its release, or `pressHold`). */
  pressed = false;
  private dirtyFlag = true;

  constructor(options: NodeOptions = {}) {
    this.size = options.size;
    this.grow = options.grow ?? 1;
    this.id = options.id;
  }

  add(...nodes: UiNode[]) {
    for (const n of nodes) {
      n.parent = this;
      this.children.push(n);
    }
    this.markDirty();
    return this;
  }

  /** It has changed: it, and so everything up to the root, wants painting. */
  markDirty() {
    this.dirtyFlag = true;
    this.parent?.markDirty();
  }

  get dirty() {
    return this.dirtyFlag;
  }

  /** Painted: it and its children clean again. */
  clean() {
    this.dirtyFlag = false;
    for (const c of this.children) c.clean();
  }

  /** Set a field, marking the node dirty only if it changed. */
  protected change<K extends keyof this>(key: K, value: this[K]) {
    if (this[key] === value) return;
    this[key] = value;
    this.markDirty();
  }

  setHidden(hidden: boolean) {
    this.change('hidden', hidden);
  }

  setPressed(pressed: boolean) {
    this.change('pressed', pressed);
  }

  /** Take `r`, and lay the children in it, sized by `theme`'s proportions. */
  layout(r: Rect, theme: Theme) {
    this.rect = r;
    this.layoutChildren(r, theme);
    this.markDirty();
  }

  /** By default every child fills the node. */
  protected layoutChildren(r: Rect, theme: Theme) {
    for (const c of this.children) c.layout(r, theme);
  }

  /** Time passes (seconds since the host began): blinking and animation mark themselves dirty. */
  tick(seconds: number) {
    for (const c of this.children) c.tick(seconds);
  }

  paint(ctx: CanvasRenderingContext2D, theme: Theme, seconds: number) {
    if (this.hidden) return;
    this.draw(ctx, theme, seconds);
    for (const c of this.children) c.paint(ctx, theme, seconds);
  }

  /** Its own painting, under its children's. */
  protected draw(
    _ctx: CanvasRenderingContext2D,
    _theme: Theme,
    _seconds: number,
  ) {}

  /** Whether a press lands on it (it has something to do). */
  get pressable() {
    return false;
  }

  /** The topmost pressable node at `(x, y)`, its children before itself. */
  hit(x: number, y: number): UiNode | null {
    if (this.hidden || !contains(this.rect, x, y)) return null;
    for (let i = this.children.length - 1; i >= 0; i--) {
      const found = this.children[i].hit(x, y);
      if (found) return found;
    }
    return this.pressable && this.hitsSelf(x, y) ? this : null;
  }

  /** Whether `(x, y)`, already inside its rectangle, is on it (a diagram's hot spots narrow this). */
  protected hitsSelf(_x: number, _y: number) {
    return true;
  }

  /** What a press on it does, at `(x, y)`. */
  press(_x: number, _y: number): PressOutcome | null {
    return null;
  }

  /** The first node in the tree with `id`. */
  find(id: string): UiNode | null {
    if (this.id === id) return this;
    for (const c of this.children) {
      const found = c.find(id);
      if (found) return found;
    }
    return null;
  }
}

/** Trace `ops` as the context's current path. */
export function tracePath(
  ctx: CanvasRenderingContext2D,
  ops: readonly PathOp[],
) {
  ctx.beginPath();
  for (const p of ops) {
    if (p.op === 'M') ctx.moveTo(p.x, p.y);
    else if (p.op === 'L') ctx.lineTo(p.x, p.y);
    else if (p.op === 'Q') ctx.quadraticCurveTo(p.cx, p.cy, p.x, p.y);
    else if (p.op === 'A') ctx.arc(p.cx, p.cy, p.r, p.a0, p.a1);
    else ctx.closePath();
  }
}

export interface RootOptions {
  width: number;
  height: number;
  /** Called with each sound a press asks for. */
  onSound?: (sound: UiSound) => void;
  /** Called with each action a press names. */
  onAction?: (action: string) => void;
}

/**
 * The root of a tree on one canvas-sized surface: it lays the tree out
 * over `width` × `height` pixels, takes the host's presses (in those
 * pixels) and time, and paints the whole surface when anything in it has
 * changed.
 */
export class UiRoot {
  width: number;
  height: number;
  private seconds = 0;
  private held: { node: UiNode; until: number | null } | null = null;
  private readonly onSound?: (sound: UiSound) => void;
  private readonly onAction?: (action: string) => void;

  constructor(
    readonly child: UiNode,
    readonly theme: Theme,
    options: RootOptions,
  ) {
    this.width = options.width;
    this.height = options.height;
    this.onSound = options.onSound;
    this.onAction = options.onAction;
    child.layout(rect(0, 0, this.width, this.height), theme);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.child.layout(rect(0, 0, width, height), this.theme);
  }

  /** Lay the tree out again (after showing or hiding parts of it). */
  relayout() {
    this.child.layout(rect(0, 0, this.width, this.height), this.theme);
  }

  /** A press at `(x, y)`: its node shown pressed, its action and sound passed on. */
  press(x: number, y: number): PressResult {
    const node = this.child.hit(x, y);
    if (!node) return { action: null, sound: null, node: null };
    this.releaseHeld();
    node.setPressed(true);
    this.held = { node, until: null };
    const outcome = node.press(x, y) ?? {};
    const action = outcome.action ?? null;
    const sound = outcome.sound === undefined ? 'confirm' : outcome.sound;
    if (action) this.onAction?.(action);
    if (sound) this.onSound?.(sound);
    return { action, sound, node };
  }

  /** The press let go: whatever it pressed shows released after `pressHold` at most. */
  release() {
    if (this.held) this.held.until = this.seconds;
  }

  private releaseHeld() {
    this.held?.node.setPressed(false);
    this.held = null;
  }

  /** A press with no release (a click, a use): released by itself after the theme's hold. */
  tap(x: number, y: number): PressResult {
    const result = this.press(x, y);
    if (this.held) this.held.until = this.seconds + this.theme.pressHold;
    return result;
  }

  tick(seconds: number) {
    this.seconds = seconds;
    if (this.held?.until !== null && this.held && seconds >= this.held.until)
      this.releaseHeld();
    this.child.tick(seconds);
  }

  get needsPaint() {
    return this.child.dirty;
  }

  /** Paint the whole surface and mark it clean. */
  paint(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = this.theme.background;
    ctx.fillRect(0, 0, this.width, this.height);
    this.child.paint(ctx, this.theme, this.seconds);
    ctx.restore();
    this.child.clean();
  }
}
