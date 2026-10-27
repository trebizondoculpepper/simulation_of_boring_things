/**
 * The 2D kit's geometry: rectangles, the stacking layout, and the outlines
 * of its rounded shapes (elbows, pills), as plain numbers so they can be
 * tested without a canvas. Coordinates are pixels, x right, y down.
 *
 * The elbow's outline follows the corner of agent-P's LCARS JavaScript
 * Framework (`LCARSCorner.prototype.drawShape`, MIT, © 2019 Perry
 * Spagnola): a vertical column and a horizontal arm joined by a broad
 * outer curve and a tight inner one, each drawn as a quadratic curve.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const rect = (x: number, y: number, w: number, h: number): Rect => ({
  x,
  y,
  w,
  h,
});

/** Whether `(px, py)` is inside `r` (its left and top edges included). */
export const contains = (r: Rect, px: number, py: number) =>
  px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;

/** `r` shrunk by `d` on every side (never below nothing). */
export const inset = (r: Rect, d: number): Rect => ({
  x: r.x + d,
  y: r.y + d,
  w: Math.max(0, r.w - 2 * d),
  h: Math.max(0, r.h - 2 * d),
});

/** How a stacked child asks for room: a fixed size in pixels, or a share of what is left. */
export interface StackItem {
  /** Pixels along the stack, fixed. */
  size?: number;
  /** Its share of the room the fixed items leave (default 1). */
  grow?: number;
}

/**
 * Lay `items` along `r`, in a row (left to right) or a column (top to
 * bottom), `gap` pixels apart: the fixed ones at their size, the rest
 * sharing what remains by their `grow`. Each gets the full cross size.
 */
export function stackLayout(
  r: Rect,
  direction: 'row' | 'column',
  gap: number,
  items: readonly StackItem[],
): Rect[] {
  const along = direction === 'row' ? r.w : r.h;
  const fixed = items.reduce((t, i) => t + (i.size ?? 0), 0);
  const shares = items.reduce(
    (t, i) => t + (i.size === undefined ? (i.grow ?? 1) : 0),
    0,
  );
  const free = Math.max(0, along - fixed - gap * Math.max(0, items.length - 1));
  let at = direction === 'row' ? r.x : r.y;
  return items.map((i) => {
    const size = i.size ?? (shares > 0 ? (free * (i.grow ?? 1)) / shares : 0);
    const out =
      direction === 'row'
        ? { x: at, y: r.y, w: size, h: r.h }
        : { x: r.x, y: at, w: r.w, h: size };
    at += size + gap;
    return out;
  });
}

/** A path, as a canvas would draw it: moves, lines and quadratic curves. */
export type PathOp =
  | { op: 'M'; x: number; y: number }
  | { op: 'L'; x: number; y: number }
  | { op: 'Q'; cx: number; cy: number; x: number; y: number }
  /** A circular arc about `(cx, cy)`, clockwise on screen from `a0` to `a1` radians. */
  | { op: 'A'; cx: number; cy: number; r: number; a0: number; a1: number }
  | { op: 'Z' };

export type Corner = 'nw' | 'ne' | 'sw' | 'se';

/**
 * An elbow's outline filling `r`: a column `side` wide down its west (or
 * east) edge and an arm `arm` high along its north (or south) edge, the
 * outer corner rounded by `outer` and the inside of the bend by `inner`.
 * `corner` names where the bend is: 'nw' is the top-left of a frame.
 */
export function elbowPath(
  r: Rect,
  corner: Corner,
  side: number,
  arm: number,
  outer: number,
  inner: number,
): PathOp[] {
  side = Math.max(0, Math.min(side, r.w));
  arm = Math.max(0, Math.min(arm, r.h));
  const R = Math.max(0, Math.min(outer, side, r.h - arm, r.w));
  const ri = Math.max(0, Math.min(inner, r.w - side, r.h - arm));
  // Drawn for the north-west corner, in the rectangle's own frame.
  const pts: PathOp[] = [
    { op: 'M', x: 0, y: r.h },
    { op: 'L', x: 0, y: R },
    { op: 'Q', cx: 0, cy: 0, x: R, y: 0 },
    { op: 'L', x: r.w, y: 0 },
    { op: 'L', x: r.w, y: arm },
    { op: 'L', x: side + ri, y: arm },
    { op: 'Q', cx: side, cy: arm, x: side, y: arm + ri },
    { op: 'L', x: side, y: r.h },
    { op: 'Z' },
  ];
  const flipX = corner === 'ne' || corner === 'se';
  const flipY = corner === 'sw' || corner === 'se';
  const X = (x: number) => r.x + (flipX ? r.w - x : x);
  const Y = (y: number) => r.y + (flipY ? r.h - y : y);
  return pts.map((p) =>
    p.op === 'Z'
      ? p
      : p.op === 'Q'
        ? { op: 'Q', cx: X(p.cx), cy: Y(p.cy), x: X(p.x), y: Y(p.y) }
        : p.op === 'A'
          ? p
          : { op: p.op, x: X(p.x), y: Y(p.y) },
  );
}

/** Which ends of a bar or button are rounded into a half-circle cap. */
export type Caps = 'both' | 'left' | 'right' | 'none';

/**
 * A rectangle's outline with its left and/or right ends rounded into
 * half circles (the radius half its height, as both MIT libraries round
 * their elements), else square.
 */
export function pillPath(r: Rect, caps: Caps): PathOp[] {
  const rad = Math.min(r.h / 2, r.w / 2);
  const left = caps === 'both' || caps === 'left' ? rad : 0;
  const right = caps === 'both' || caps === 'right' ? rad : 0;
  const { x, y, w, h } = r;
  const ops: PathOp[] = [{ op: 'M', x: x + left, y }];
  ops.push({ op: 'L', x: x + w - right, y });
  if (right)
    ops.push({
      op: 'A',
      cx: x + w - right,
      cy: y + h / 2,
      r: right,
      a0: -Math.PI / 2,
      a1: Math.PI / 2,
    });
  else {
    ops.push({ op: 'L', x: x + w, y });
    ops.push({ op: 'L', x: x + w, y: y + h });
  }
  ops.push({ op: 'L', x: x + left, y: y + h });
  if (left)
    ops.push({
      op: 'A',
      cx: x + left,
      cy: y + h / 2,
      r: left,
      a0: Math.PI / 2,
      a1: (3 * Math.PI) / 2,
    });
  else {
    ops.push({ op: 'L', x, y: y + h });
    ops.push({ op: 'L', x, y });
  }
  ops.push({ op: 'Z' });
  return ops;
}

/** Whether a blinking thing is lit at `seconds`, blinking once every `period` seconds. */
export const blinkOn = (seconds: number, period: number) =>
  period <= 0 || (seconds % period) / period < 0.5;

/**
 * A trend's line in `r`: the samples spread evenly across it, oldest at
 * the left, each value from `min` (bottom) to `max` (top), clamped.
 */
export function trendPoints(
  values: readonly number[],
  r: Rect,
  min: number,
  max: number,
): { x: number; y: number }[] {
  const span = max - min || 1;
  const n = values.length;
  return values.map((v, i) => ({
    x: r.x + (n <= 1 ? r.w : (r.w * i) / (n - 1)),
    y: r.y + r.h - r.h * Math.max(0, Math.min(1, (v - min) / span)),
  }));
}

/** A box `{ minX, minY, maxX, maxY }` in some drawing's own units. */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * The map from a drawing's own units (`b`, y up when `yUp`) into pixels
 * inside `r`, keeping its proportions and centring it, and back.
 */
export function fitBounds(b: Bounds, r: Rect, yUp = true) {
  const bw = b.maxX - b.minX || 1;
  const bh = b.maxY - b.minY || 1;
  const scale = Math.min(r.w / bw, r.h / bh);
  const ox = r.x + (r.w - bw * scale) / 2;
  const oy = r.y + (r.h - bh * scale) / 2;
  return {
    scale,
    toPx: (x: number, y: number) => ({
      x: ox + (x - b.minX) * scale,
      y: yUp ? oy + (b.maxY - y) * scale : oy + (y - b.minY) * scale,
    }),
    fromPx: (px: number, py: number) => ({
      x: b.minX + (px - ox) / scale,
      y: yUp ? b.maxY - (py - oy) / scale : b.minY + (py - oy) / scale,
    }),
  };
}
