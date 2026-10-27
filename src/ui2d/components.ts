import {
  blinkOn,
  elbowPath,
  fitBounds,
  inset,
  pillPath,
  rect,
  stackLayout,
  trendPoints,
} from './geometry';
import type { Bounds, Caps, Corner, Rect } from './geometry';
import { UiNode, tracePath } from './node';
import type { NodeOptions, PressOutcome, UiSound } from './node';
import { colourOf, fontOf, lettered } from './theme';
import type { Theme } from './theme';

/**
 * The kit's components. Each lays itself out in the rectangle it is
 * given, paints itself thinly from its state, and marks itself dirty when
 * a setter changes what it shows. Shapes and proportions after the MIT
 * libraries joernweissenborn/lcars and agent-P/LCARS-Javascript-Framework
 * (see `README.md`): labels set low and to the right in their blocks,
 * pills with half-circle ends, elbows joining a column to an arm.
 */

/** A press's sound, from a handler's answer: none given is a confirm. */
const soundOf = (answer: UiSound | null | void): UiSound | null =>
  answer === undefined ? 'confirm' : answer;

/** Lettering at `(x, y)`, squeezed to `maxWidth` if given. */
function text(
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
  ctx.font = fontOf(theme, px, weight);
  ctx.fillStyle = colourOf(theme, colour);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  const shown = lettered(theme, words);
  if (maxWidth !== undefined && maxWidth > 0)
    ctx.fillText(shown, x, y, maxWidth);
  else ctx.fillText(shown, x, y);
}

/** Nothing: room left empty. */
export class Blank extends UiNode {}

/** Children in a row or a column, `gap` pixels apart (or the theme's gap, scaled by `unit`). */
export class Stack extends UiNode {
  constructor(
    readonly direction: 'row' | 'column',
    children: UiNode[],
    readonly options: NodeOptions & { gap?: number } = {},
  ) {
    super(options);
    this.add(...children);
  }
  protected layoutChildren(r: Rect, theme: Theme) {
    const gap =
      this.options.gap ??
      Math.max(
        2,
        Math.round(Math.min(r.w, r.h) * theme.proportions.gap * 0.25),
      );
    const shown = this.children.filter((c) => !c.hidden);
    const rects = stackLayout(r, this.direction, gap, shown);
    shown.forEach((c, i) => c.layout(rects[i], theme));
  }
}

/** Children placed by fractions of the node (x, y, w, h from 0 to 1). */
export class Place extends UiNode {
  private readonly at = new Map<UiNode, Rect>();
  put(node: UiNode, fx: number, fy: number, fw: number, fh: number) {
    this.at.set(node, rect(fx, fy, fw, fh));
    this.add(node);
    return node;
  }
  protected layoutChildren(r: Rect, theme: Theme) {
    for (const c of this.children) {
      const f = this.at.get(c) ?? rect(0, 0, 1, 1);
      c.layout(
        rect(r.x + f.x * r.w, r.y + f.y * r.h, f.w * r.w, f.h * r.h),
        theme,
      );
    }
  }
}

/** An elbow: a column and an arm joined round a corner, with a label in the column's end. */
export class Elbow extends UiNode {
  /** Set by its frame: the column's width and the arm's height, pixels. */
  side = 0;
  arm = 0;
  unit = 0;
  constructor(
    readonly corner: Corner,
    public colour = 'frame',
    public label = '',
    options: NodeOptions = {},
  ) {
    super(options);
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const u = this.unit || this.rect.h / theme.proportions.elbowHeight;
    const side = this.side || u * theme.proportions.buttonWidth;
    const arm = this.arm || u * theme.proportions.arm;
    ctx.fillStyle = colourOf(theme, this.colour);
    tracePath(
      ctx,
      elbowPath(
        this.rect,
        this.corner,
        side,
        arm,
        u * theme.proportions.outerRadius,
        u * theme.proportions.innerRadius,
      ),
    );
    ctx.fill();
    if (this.label) {
      const r = this.rect;
      const west = this.corner === 'nw' || this.corner === 'sw';
      const south = this.corner === 'sw' || this.corner === 'se';
      const x = west ? r.x + side - u * 0.2 : r.x + r.w - u * 0.2;
      const y = south ? r.y + u * 0.45 : r.y + r.h - u * 0.12;
      text(
        ctx,
        theme,
        this.label,
        x,
        y,
        u * 0.36,
        theme.ink,
        'right',
        south ? 'top' : 'alphabetic',
        side - u * 0.4,
      );
    }
  }
}

/** A bar, its ends rounded or square, with an optional title on a black ground set into it. */
export class Bar extends UiNode {
  constructor(
    public colour = 'frame',
    public caps: Caps = 'none',
    public title = '',
    readonly options: NodeOptions & { titleAlign?: 'left' | 'right' } = {},
  ) {
    super(options);
  }
  setTitle(title: string) {
    this.change('title', title);
  }
  setColour(colour: string) {
    this.change('colour', colour);
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const r = this.rect;
    if (r.w <= 0 || r.h <= 0) return;
    ctx.fillStyle = colourOf(theme, this.colour);
    tracePath(ctx, pillPath(r, this.caps));
    ctx.fill();
    if (!this.title) return;
    // As joernweissenborn/lcars's bar title: a black block cut into the bar.
    const px = r.h * 1.25;
    ctx.font = fontOf(theme, px);
    const w = ctx.measureText(lettered(theme, this.title)).width + r.h * 0.6;
    const right = this.options.titleAlign !== 'left';
    const x = right ? r.x + r.w - w - r.h * 1.2 : r.x + r.h * 1.2;
    ctx.fillStyle = theme.background;
    ctx.fillRect(x, r.y - 1, w, r.h * 1.5 + 1);
    text(
      ctx,
      theme,
      this.title,
      x + w / 2,
      r.y + r.h * 1.38,
      px,
      'accent',
      'center',
      'alphabetic',
      w,
    );
  }
}

export interface ButtonOptions extends NodeOptions {
  label?: string;
  /** A second, smaller line, as joernweissenborn/lcars's element addition. */
  sub?: string;
  colour?: string;
  /** Its colour while lit. */
  litColour?: string;
  caps?: Caps;
  lit?: boolean;
  disabled?: boolean;
  /** Flashing (an alarm's button). */
  flashing?: boolean;
  /** The action its press names. */
  action?: string;
  /** What its press does; its answer is the sound (null for none, nothing for a confirm). */
  onPress?: () => UiSound | null | void;
}

/** A block button (a pill by default): lit, pressed, disabled and flashing as asked. */
export class Button extends UiNode {
  label: string;
  sub: string;
  colour: string;
  litColour: string;
  caps: Caps;
  lit: boolean;
  disabled: boolean;
  flashing: boolean;
  private blinkShown = true;
  constructor(readonly options: ButtonOptions = {}) {
    super(options);
    this.label = options.label ?? '';
    this.sub = options.sub ?? '';
    this.colour = options.colour ?? 'primary';
    this.litColour = options.litColour ?? 'lit';
    this.caps = options.caps ?? 'both';
    this.lit = options.lit ?? false;
    this.disabled = options.disabled ?? false;
    this.flashing = options.flashing ?? false;
  }
  setLabel(label: string) {
    this.change('label', label);
  }
  setSub(sub: string) {
    this.change('sub', sub);
  }
  setLit(lit: boolean) {
    this.change('lit', lit);
  }
  setColour(colour: string) {
    this.change('colour', colour);
  }
  setDisabled(disabled: boolean) {
    this.change('disabled', disabled);
  }
  setFlashing(flashing: boolean) {
    this.change('flashing', flashing);
  }
  get pressable() {
    return true;
  }
  press(): PressOutcome {
    if (this.disabled) return { action: null, sound: 'deny' };
    return {
      action: this.options.action ?? this.id ?? null,
      sound: soundOf(this.options.onPress?.()),
    };
  }
  tick(seconds: number) {
    const on = !this.flashing || blinkOn(seconds, 0.5);
    if (on !== this.blinkShown) {
      this.blinkShown = on;
      this.markDirty();
    }
  }
  /** The colour it shows now. */
  shownColour(theme: Theme) {
    if (this.pressed && !this.disabled) return theme.pressed;
    if (this.disabled) return colourOf(theme, 'dim');
    if (this.flashing)
      return this.blinkShown
        ? colourOf(theme, 'alert')
        : colourOf(theme, 'dim');
    return colourOf(theme, this.lit ? this.litColour : this.colour);
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const r = this.rect;
    if (r.w <= 0 || r.h <= 0) return;
    ctx.fillStyle = this.shownColour(theme);
    tracePath(ctx, pillPath(r, this.caps));
    ctx.fill();
    // Its label low and to the right, inset as agent-P's buttons are.
    const rightInset =
      this.caps === 'both' || this.caps === 'right' ? r.h * 0.42 : r.h * 0.2;
    const leftInset =
      this.caps === 'both' || this.caps === 'left' ? r.h * 0.42 : r.h * 0.2;
    const room = r.w - rightInset - leftInset;
    const ink = this.disabled ? '#1a1a1a' : theme.ink;
    if (this.sub) {
      text(
        ctx,
        theme,
        this.label,
        r.x + r.w - rightInset,
        r.y + r.h * 0.5,
        r.h * 0.34,
        ink,
        'right',
        'alphabetic',
        room,
      );
      text(
        ctx,
        theme,
        this.sub,
        r.x + r.w - rightInset,
        r.y + r.h * 0.88,
        r.h * 0.3,
        ink,
        'right',
        'alphabetic',
        room,
        400,
      );
    } else
      text(
        ctx,
        theme,
        this.label,
        r.x + r.w - rightInset,
        r.y + r.h * 0.84,
        r.h * 0.42,
        ink,
        'right',
        'alphabetic',
        room,
      );
  }
}

/** A button that holds on or off: lit while on. Its handler may refuse (answer 'deny'). */
export class Toggle extends Button {
  on: boolean;
  constructor(
    readonly toggleOptions: ButtonOptions & {
      on?: boolean;
      labelOn?: string;
      onToggle?: (next: boolean) => UiSound | null | void;
    } = {},
  ) {
    super({ ...toggleOptions, onPress: undefined });
    this.on = toggleOptions.on ?? false;
    this.lit = this.on;
  }
  setOn(on: boolean) {
    this.change('on', on);
    this.setLit(on);
  }
  press(): PressOutcome {
    if (this.disabled) return { action: null, sound: 'deny' };
    const next = !this.on;
    const answer = this.toggleOptions.onToggle?.(next);
    if (answer !== 'deny') this.setOn(next);
    return { action: this.id ?? null, sound: soundOf(answer) };
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const label = this.label;
    if (this.on && this.toggleOptions.labelOn)
      this.label = this.toggleOptions.labelOn;
    super.draw(ctx, theme);
    this.label = label;
  }
}

/**
 * A row (or column) of buttons of which one is chosen: HAND · OFF ·
 * AUTO, or I · 0 · II. A press asks `onSelect`, which may refuse it by
 * answering 'deny' (an interlock); otherwise the choice moves.
 */
export class Segmented extends UiNode {
  selected: number;
  readonly buttons: Button[];
  constructor(
    readonly options: NodeOptions & {
      options: readonly string[];
      selected?: number;
      colour?: string;
      litColour?: string;
      direction?: 'row' | 'column';
      gap?: number;
      onSelect?: (index: number) => UiSound | null | void;
    },
  ) {
    super(options);
    this.selected = options.selected ?? 0;
    const n = options.options.length;
    const row = (options.direction ?? 'row') === 'row';
    this.buttons = options.options.map(
      (label, i) =>
        new Button({
          label,
          colour: options.colour ?? 'tertiary',
          litColour: options.litColour ?? 'lit',
          caps: row
            ? n === 1
              ? 'both'
              : i === 0
                ? 'left'
                : i === n - 1
                  ? 'right'
                  : 'none'
            : 'both',
          lit: i === this.selected,
          id: options.id ? `${options.id}/${i}` : undefined,
          onPress: () => this.choose(i),
        }),
    );
    this.add(
      new Stack(row ? 'row' : 'column', this.buttons, { gap: options.gap }),
    );
  }
  /** Choose `index` as a press would: asked of `onSelect` first. */
  choose(index: number): UiSound | null {
    const answer = this.options.onSelect?.(index);
    if (answer === 'deny') return 'deny';
    this.select(index);
    return soundOf(answer);
  }
  /** Show `index` chosen (the state's own, from outside). */
  select(index: number) {
    this.change('selected', index);
    this.buttons.forEach((b, i) => b.setLit(i === index));
  }
}

/** Lettering in its rectangle: its height a share of the rectangle's. */
export class Label extends UiNode {
  constructor(
    public words: string,
    readonly options: NodeOptions & {
      colour?: string;
      align?: CanvasTextAlign;
      scale?: number;
      weight?: number;
    } = {},
  ) {
    super(options);
    this.colour = options.colour ?? 'accent';
  }
  colour: string;
  setText(words: string) {
    this.change('words', words);
  }
  setColour(colour: string) {
    this.change('colour', colour);
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const r = this.rect;
    const align = this.options.align ?? 'left';
    const x =
      align === 'left' ? r.x : align === 'right' ? r.x + r.w : r.x + r.w / 2;
    const px = r.h * (this.options.scale ?? 0.8);
    text(
      ctx,
      theme,
      this.words,
      x,
      r.y + r.h / 2 + px * 0.36,
      px,
      this.colour,
      align,
      'alphabetic',
      r.w,
      this.options.weight,
    );
  }
}

/** A numeric read-out: its name small above, its value large, its unit after; red and flashing in alarm. */
export class Readout extends UiNode {
  value = '';
  alarm = false;
  private blinkShown = true;
  constructor(
    public label: string,
    public unit = '',
    readonly options: NodeOptions & { colour?: string } = {},
  ) {
    super(options);
  }
  set(value: string, alarm = false) {
    this.change('value', value);
    this.change('alarm', alarm);
  }
  tick(seconds: number) {
    const on = !this.alarm || blinkOn(seconds, 0.75);
    if (on !== this.blinkShown) {
      this.blinkShown = on;
      this.markDirty();
    }
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const r = this.rect;
    const colour = this.alarm
      ? this.blinkShown
        ? 'alert'
        : 'dim'
      : (this.options.colour ?? 'info');
    ctx.fillStyle = colourOf(theme, colour);
    ctx.fillRect(r.x, r.y, Math.max(2, r.h * 0.06), r.h);
    text(
      ctx,
      theme,
      this.label,
      r.x + r.h * 0.14,
      r.y + r.h * 0.3,
      r.h * 0.26,
      colour,
      'left',
      'alphabetic',
      r.w * 0.95,
    );
    const unitW = this.unit ? r.h * 0.7 : 0;
    text(
      ctx,
      theme,
      this.value,
      r.x + r.w - unitW - r.h * 0.1,
      r.y + r.h * 0.95,
      r.h * 0.62,
      colour,
      'right',
      'alphabetic',
      r.w - unitW - r.h * 0.3,
      600,
    );
    if (this.unit)
      text(
        ctx,
        theme,
        this.unit,
        r.x + r.w,
        r.y + r.h * 0.95,
        r.h * 0.26,
        colour,
        'right',
        'alphabetic',
        unitW,
      );
  }
}

/** A bar gauge of blocks: a value from 0 to 1, with marks (low, high) across it. */
export class Gauge extends UiNode {
  value = 0;
  words = '';
  colour: string;
  constructor(
    public label: string,
    readonly options: NodeOptions & {
      colour?: string;
      vertical?: boolean;
      marks?: readonly number[];
      blocks?: number;
    } = {},
  ) {
    super(options);
    this.colour = options.colour ?? 'info';
  }
  set(value: number, words = '', colour?: string) {
    this.change('value', Math.max(0, Math.min(1, value)));
    this.change('words', words);
    if (colour) this.change('colour', colour);
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const r = this.rect;
    const vertical = this.options.vertical ?? false;
    const labelH = vertical ? r.w * 0.32 : 0;
    const track = vertical
      ? rect(r.x, r.y + labelH, r.w, r.h - labelH * 2.2)
      : rect(r.x + r.w * 0.28, r.y, r.w * 0.52, r.h);
    const n = this.options.blocks ?? (vertical ? 12 : 16);
    const gap = Math.max(1, (vertical ? track.h : track.w) / n / 6);
    const lit = Math.round(this.value * n);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = colourOf(theme, i < lit ? this.colour : 'track');
      if (vertical) {
        const bh = (track.h - gap * (n - 1)) / n;
        ctx.fillRect(
          track.x,
          track.y + track.h - (i + 1) * bh - i * gap,
          track.w,
          bh,
        );
      } else {
        const bw = (track.w - gap * (n - 1)) / n;
        ctx.fillRect(
          track.x + i * (bw + gap),
          track.y + track.h * 0.15,
          bw,
          track.h * 0.7,
        );
      }
    }
    ctx.fillStyle = colourOf(theme, 'lit');
    for (const m of this.options.marks ?? []) {
      if (vertical)
        ctx.fillRect(
          track.x - 3,
          track.y + track.h * (1 - m) - 1,
          track.w + 6,
          2,
        );
      else ctx.fillRect(track.x + track.w * m - 1, track.y, 2, track.h);
    }
    if (vertical) {
      text(
        ctx,
        theme,
        this.label,
        r.x + r.w / 2,
        r.y + labelH * 0.8,
        labelH * 0.8,
        this.colour,
        'center',
        'alphabetic',
        r.w,
      );
      text(
        ctx,
        theme,
        this.words,
        r.x + r.w / 2,
        r.y + r.h - labelH * 0.2,
        labelH * 0.9,
        'accent',
        'center',
        'alphabetic',
        r.w,
      );
    } else {
      text(
        ctx,
        theme,
        this.label,
        r.x,
        r.y + r.h * 0.72,
        r.h * 0.6,
        this.colour,
        'left',
        'alphabetic',
        r.w * 0.26,
      );
      text(
        ctx,
        theme,
        this.words,
        r.x + r.w,
        r.y + r.h * 0.72,
        r.h * 0.6,
        'accent',
        'right',
        'alphabetic',
        r.w * 0.18,
      );
    }
  }
}

/** A small trend: the last samples as a line, a band (the good range) behind. */
export class Trend extends UiNode {
  values: number[] = [];
  constructor(
    public label: string,
    readonly options: NodeOptions & {
      min: number;
      max: number;
      capacity?: number;
      colour?: string;
      band?: readonly [number, number];
    },
  ) {
    super(options);
  }
  /** Add a sample, dropping the oldest past its capacity. */
  push(value: number) {
    this.values.push(value);
    const cap = this.options.capacity ?? 60;
    while (this.values.length > cap) this.values.shift();
    this.markDirty();
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const r = this.rect;
    const plot = inset(rect(r.x, r.y + r.h * 0.18, r.w, r.h * 0.82), 2);
    const { min, max, band } = this.options;
    ctx.strokeStyle = colourOf(theme, 'tertiary');
    ctx.lineWidth = Math.max(1, r.h / 60);
    ctx.strokeRect(plot.x, plot.y, plot.w, plot.h);
    if (band) {
      const [lo, hi] = trendPoints([band[0], band[1]], plot, min, max);
      ctx.fillStyle = 'rgba(153, 204, 255, 0.16)';
      ctx.fillRect(plot.x, hi.y, plot.w, lo.y - hi.y);
    }
    const pts = trendPoints(this.values, plot, min, max);
    if (pts.length > 1) {
      ctx.strokeStyle = colourOf(theme, this.options.colour ?? 'primary');
      ctx.lineWidth = Math.max(2, r.h / 40);
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
    text(
      ctx,
      theme,
      this.label,
      r.x,
      r.y + r.h * 0.14,
      r.h * 0.15,
      this.options.colour ?? 'primary',
      'left',
      'alphabetic',
      r.w,
    );
  }
}

/** An alarm banner: a coloured bar of words, flashing while `flashing`; blank when it has nothing to say. */
export class Banner extends UiNode {
  words = '';
  flashing = false;
  colour = 'alert';
  private blinkShown = true;
  constructor(options: NodeOptions = {}) {
    super(options);
  }
  set(words: string, flashing = false, colour = 'alert') {
    this.change('words', words);
    this.change('flashing', flashing);
    this.change('colour', colour);
  }
  tick(seconds: number) {
    const on = !this.flashing || blinkOn(seconds, 0.5);
    if (on !== this.blinkShown) {
      this.blinkShown = on;
      this.markDirty();
    }
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    if (!this.words) return;
    const r = this.rect;
    const lit = this.blinkShown;
    ctx.fillStyle = colourOf(theme, lit ? this.colour : 'dim');
    tracePath(ctx, pillPath(r, 'both'));
    ctx.fill();
    text(
      ctx,
      theme,
      this.words,
      r.x + r.w / 2,
      r.y + r.h * 0.8,
      r.h * 0.7,
      lit ? theme.ink : this.colour,
      'center',
      'alphabetic',
      r.w - r.h,
      600,
    );
  }
}

/** A row of a list: words at the left, a value at the right, its colour, flashing if asked. */
export interface ListRow {
  words: string;
  right?: string;
  colour?: string;
  flashing?: boolean;
}

/** A list of rows; a press on one asks `onRow` with its index. */
export class List extends UiNode {
  rows: readonly ListRow[] = [];
  private key = '';
  private blinkShown = true;
  constructor(
    readonly options: NodeOptions & {
      rowHeight?: number;
      onRow?: (index: number) => UiSound | null | void;
    } = {},
  ) {
    super(options);
  }
  set(rows: readonly ListRow[]) {
    const key = JSON.stringify(rows);
    if (key === this.key) return;
    this.key = key;
    this.rows = rows;
    this.markDirty();
  }
  private rowH() {
    return this.options.rowHeight ?? this.rect.h / 8;
  }
  /** The row at `y`, if any. */
  rowAt(y: number): number | null {
    const i = Math.floor((y - this.rect.y) / this.rowH());
    return i >= 0 && i < this.rows.length ? i : null;
  }
  get pressable() {
    return this.options.onRow !== undefined;
  }
  protected hitsSelf(_x: number, y: number) {
    return this.rowAt(y) !== null;
  }
  press(_x: number, y: number): PressOutcome | null {
    const i = this.rowAt(y);
    if (i === null) return null;
    return {
      action: this.id ? `${this.id}/${i}` : null,
      sound: soundOf(this.options.onRow?.(i)),
    };
  }
  tick(seconds: number) {
    const on = blinkOn(seconds, 0.5);
    if (on !== this.blinkShown && this.rows.some((r) => r.flashing)) {
      this.blinkShown = on;
      this.markDirty();
    }
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const r = this.rect;
    const h = this.rowH();
    this.rows.forEach((row, i) => {
      const y = r.y + i * h;
      if (y + h > r.y + r.h + 0.5) return;
      const colour =
        row.flashing && !this.blinkShown ? 'dim' : (row.colour ?? 'primary');
      ctx.fillStyle = colourOf(theme, colour);
      ctx.fillRect(r.x, y + h * 0.12, h * 0.3, h * 0.76);
      text(
        ctx,
        theme,
        row.words,
        r.x + h * 0.45,
        y + h * 0.78,
        h * 0.62,
        colour,
        'left',
        'alphabetic',
        r.w * 0.68,
      );
      if (row.right)
        text(
          ctx,
          theme,
          row.right,
          r.x + r.w,
          y + h * 0.78,
          h * 0.62,
          colour,
          'right',
          'alphabetic',
          r.w * 0.3,
        );
    });
  }
}

/** Pages, one shown at a time: a router for a panel's screens. */
export class PageStack extends UiNode {
  current: string;
  private readonly pages = new Map<string, UiNode>();
  private readonly listeners = new Set<(page: string) => void>();
  constructor(
    pages: Readonly<Record<string, UiNode>>,
    current?: string,
    options: NodeOptions = {},
  ) {
    super(options);
    for (const [id, node] of Object.entries(pages)) {
      this.pages.set(id, node);
      this.add(node);
    }
    this.current = current ?? Object.keys(pages)[0];
    this.showOnly();
  }
  get ids() {
    return [...this.pages.keys()];
  }
  private showOnly() {
    for (const [id, node] of this.pages) node.setHidden(id !== this.current);
  }
  /** Show page `id`: whether it changed (false for one it has not, or already showing). */
  show(id: string) {
    if (!this.pages.has(id) || id === this.current) return false;
    this.current = id;
    this.showOnly();
    this.markDirty();
    for (const l of this.listeners) l(id);
    return true;
  }
  onChange(listener: (page: string) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** A button that shows page `id` of `stack`, lit while that page is shown; its press asks for the page sound. */
export function pageButton(
  stack: PageStack,
  page: string,
  options: ButtonOptions = {},
): Button {
  const button = new Button({
    label: page,
    ...options,
    id: options.id ?? `page/${page}`,
    lit: stack.current === page,
    onPress: () => (stack.show(page) ? 'page' : 'confirm'),
  });
  stack.onChange((now) => button.setLit(now === page));
  return button;
}

/**
 * A frame after the style's sidebar layout: an elbow at its top left and
 * bottom left joined by a column of sidebar slots (buttons, with a filler
 * bar below them), a bar along its top carrying the title and along its
 * bottom carrying a footer, and the content in the space they enclose.
 * Sized from `unit`, a sidebar button's height (by default a ninth of the
 * frame's height).
 */
export class Frame extends UiNode {
  readonly top: Elbow;
  readonly bottom: Elbow;
  readonly topBar: Bar;
  readonly bottomBar: Bar;
  readonly filler: Bar;
  constructor(
    readonly options: NodeOptions & {
      title?: string;
      footer?: string;
      colour?: string;
      sidebar?: UiNode[];
      content: UiNode;
      unit?: number;
      /** The top elbow's label (a code, a number). */
      code?: string;
    },
  ) {
    super(options);
    const colour = options.colour ?? 'frame';
    this.top = new Elbow('nw', colour, options.code ?? '');
    this.bottom = new Elbow('sw', colour);
    this.topBar = new Bar(colour, 'right', options.title ?? '');
    this.bottomBar = new Bar(colour, 'right', options.footer ?? '');
    this.filler = new Bar('tertiary', 'none');
    this.add(
      this.top,
      this.topBar,
      ...(options.sidebar ?? []),
      this.filler,
      this.bottom,
      this.bottomBar,
      options.content,
    );
  }
  /** The sidebar slot height and the content's rectangle, for `r` (pure). */
  static geometry(r: Rect, theme: Theme, unit?: number) {
    const p = theme.proportions;
    const u = unit ?? r.h / 9;
    const side = u * p.buttonWidth;
    const arm = u * p.arm;
    const gap = Math.max(2, u * p.gap);
    const elbowH = u * p.elbowHeight;
    const elbowW = side + u * 1.4;
    return {
      u,
      side,
      arm,
      gap,
      top: rect(r.x, r.y, elbowW, elbowH),
      bottom: rect(r.x, r.y + r.h - elbowH, elbowW, elbowH),
      topBar: rect(
        r.x + elbowW + gap,
        r.y,
        Math.max(0, r.w - elbowW - gap),
        arm,
      ),
      bottomBar: rect(
        r.x + elbowW + gap,
        r.y + r.h - arm,
        Math.max(0, r.w - elbowW - gap),
        arm,
      ),
      sidebar: rect(
        r.x,
        r.y + elbowH + gap,
        side,
        Math.max(0, r.h - 2 * elbowH - 2 * gap),
      ),
      content: rect(
        r.x + side + u * 0.6,
        r.y + arm + u * 0.5,
        Math.max(0, r.w - side - u * 0.6),
        Math.max(0, r.h - 2 * arm - u * 1.0),
      ),
    };
  }
  protected layoutChildren(r: Rect, theme: Theme) {
    const g = Frame.geometry(r, theme, this.options.unit);
    for (const e of [this.top, this.bottom]) {
      e.side = g.side;
      e.arm = g.arm;
      e.unit = g.u;
    }
    this.top.layout(g.top, theme);
    this.bottom.layout(g.bottom, theme);
    this.topBar.layout(g.topBar, theme);
    this.bottomBar.layout(g.bottomBar, theme);
    const slots = (this.options.sidebar ?? []).filter((s) => !s.hidden);
    const items = [...slots.map((s) => ({ size: s.size ?? g.u })), { grow: 1 }];
    const rects = stackLayout(g.sidebar, 'column', g.gap, items);
    slots.forEach((s, i) => s.layout(rects[i], theme));
    this.filler.layout(rects[rects.length - 1], theme);
    this.options.content.layout(g.content, theme);
  }
}

/** A diagram's pipe: its points in the diagram's units, its colour, and its flow. */
export interface DiagramLine {
  id?: string;
  points: readonly (readonly [number, number])[];
  colour?: string;
  /** Pixels, at the diagram's scale for one of its units (default a share of the drawing). */
  width?: number;
  flow?: 'forward' | 'back' | 'still';
}

/** A diagram's symbol: a machine, a valve, a vessel. */
export interface DiagramSymbol {
  id: string;
  shape: 'circle' | 'bowtie' | 'capsule' | 'box';
  at: readonly [number, number];
  /** Its size in the diagram's units (width; a capsule or box is `aspect` times as tall). */
  size: number;
  aspect?: number;
  /** Turned a quarter (a valve in an upright pipe). */
  upright?: boolean;
  colour?: string;
  label?: string;
  state?: 'on' | 'off' | 'fault' | 'between';
  /** Its press; with none it is not pressable. */
  onPress?: () => UiSound | null | void;
}

/**
 * A line diagram of a process: pipes drawn thick in their colours with
 * their flows moving along them as dashes, and symbols (machines, valves,
 * vessels) filled when on, hollow when off, flashing in a fault; a press
 * near a pressable symbol is its press.
 */
export class Diagram extends UiNode {
  lines: DiagramLine[];
  symbols: DiagramSymbol[];
  private step = -1;
  private blinkShown = true;
  constructor(
    readonly options: NodeOptions & {
      bounds: Bounds;
      yUp?: boolean;
      lines: DiagramLine[];
      symbols: DiagramSymbol[];
      texts?: {
        words: string;
        at: readonly [number, number];
        size?: number;
        colour?: string;
      }[];
      /** Seconds a flow's dashes take to move one step. */
      stepSeconds?: number;
    },
  ) {
    super(options);
    this.lines = options.lines;
    this.symbols = options.symbols;
  }
  private fit() {
    return fitBounds(this.options.bounds, this.rect, this.options.yUp ?? true);
  }
  /** Set a line's flow, by its id. */
  setFlow(id: string, flow: DiagramLine['flow']) {
    for (const l of this.lines)
      if (l.id === id && l.flow !== flow) {
        l.flow = flow;
        this.markDirty();
      }
  }
  /** Set a symbol's state (and colour), by its id. */
  setSymbol(id: string, state: DiagramSymbol['state'], colour?: string) {
    const s = this.symbols.find((k) => k.id === id);
    if (!s) return;
    if (s.state !== state || (colour && s.colour !== colour)) {
      s.state = state;
      if (colour) s.colour = colour;
      this.markDirty();
    }
  }
  /** The pressable symbol nearest `(x, y)` within its reach, pixels. */
  symbolAt(x: number, y: number): DiagramSymbol | null {
    const f = this.fit();
    let best: DiagramSymbol | null = null;
    let bestD = Infinity;
    for (const s of this.symbols) {
      if (!s.onPress) continue;
      const p = f.toPx(s.at[0], s.at[1]);
      const reach = Math.max(14, s.size * f.scale * 0.8);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d <= reach && d < bestD) {
        best = s;
        bestD = d;
      }
    }
    return best;
  }
  get pressable() {
    return this.symbols.some((s) => s.onPress);
  }
  protected hitsSelf(x: number, y: number) {
    return this.symbolAt(x, y) !== null;
  }
  press(x: number, y: number): PressOutcome | null {
    const s = this.symbolAt(x, y);
    if (!s) return null;
    return { action: s.id, sound: soundOf(s.onPress?.()) };
  }
  tick(seconds: number) {
    const moving = this.lines.some(
      (l) => l.flow === 'forward' || l.flow === 'back',
    );
    const step = Math.floor(seconds / (this.options.stepSeconds ?? 0.12));
    if (moving && step !== this.step) {
      this.step = step;
      this.markDirty();
    }
    const on = blinkOn(seconds, 0.5);
    if (
      on !== this.blinkShown &&
      this.symbols.some((s) => s.state === 'fault')
    ) {
      this.blinkShown = on;
      this.markDirty();
    }
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const f = this.fit();
    const base = Math.max(3, Math.min(this.rect.w, this.rect.h) / 60);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const l of this.lines) {
      const w = l.width ?? base;
      ctx.beginPath();
      l.points.forEach(([x, y], i) => {
        const p = f.toPx(x, y);
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      });
      const colour = colourOf(theme, l.colour ?? 'info');
      ctx.setLineDash([]);
      ctx.strokeStyle = colour;
      ctx.globalAlpha = l.flow === 'forward' || l.flow === 'back' ? 0.45 : 0.3;
      ctx.lineWidth = w;
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (l.flow === 'forward' || l.flow === 'back') {
        const dash = w * 2.2;
        ctx.setLineDash([dash, dash * 1.4]);
        ctx.lineDashOffset =
          (l.flow === 'forward' ? -1 : 1) * (this.step % 12) * dash * 0.2;
        ctx.strokeStyle = colourOf(theme, 'lit');
        ctx.lineWidth = w * 0.55;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    for (const s of this.symbols) this.drawSymbol(ctx, theme, s, f);
    for (const t of this.options.texts ?? []) {
      const p = f.toPx(t.at[0], t.at[1]);
      text(
        ctx,
        theme,
        t.words,
        p.x,
        p.y,
        (t.size ?? 0.05) * f.scale,
        t.colour ?? 'accent',
        'center',
        'middle',
      );
    }
  }
  private drawSymbol(
    ctx: CanvasRenderingContext2D,
    theme: Theme,
    s: DiagramSymbol,
    f: ReturnType<typeof fitBounds>,
  ) {
    const c = f.toPx(s.at[0], s.at[1]);
    const w = s.size * f.scale;
    const h = w * (s.aspect ?? 1);
    const fault = s.state === 'fault';
    const colour = colourOf(
      theme,
      fault ? (this.blinkShown ? 'alert' : 'dim') : (s.colour ?? 'primary'),
    );
    const filled = s.state === 'on' || fault;
    ctx.save();
    ctx.translate(c.x, c.y);
    if (s.upright) ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    if (s.shape === 'circle') ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
    else if (s.shape === 'bowtie') {
      ctx.moveTo(-w / 2, -h / 3);
      ctx.lineTo(w / 2, h / 3);
      ctx.lineTo(w / 2, -h / 3);
      ctx.lineTo(-w / 2, h / 3);
      ctx.closePath();
    } else if (s.shape === 'capsule')
      tracePath(ctx, pillPath(rect(-w / 2, -h / 2, w, h), 'both'));
    else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = theme.background;
    ctx.fill();
    if (filled) {
      ctx.fillStyle = colour;
      ctx.fill();
    } else if (s.state === 'between') {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = colour;
      ctx.fillRect(-w / 2, 0, w, h / 2);
      ctx.restore();
    }
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(2, w * 0.08);
    ctx.stroke();
    ctx.restore();
    if (s.label)
      text(
        ctx,
        theme,
        s.label,
        c.x,
        c.y + (s.upright ? w : h) / 2 + Math.max(10, w * 0.32),
        Math.max(10, w * 0.3),
        s.colour ?? 'primary',
        'center',
        'middle',
      );
  }
}
