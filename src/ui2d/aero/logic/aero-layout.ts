import { contains } from '../../geometry';
import type { Rect } from '../../geometry';

/**
 * The Aero kit's layout and state logic (mission 113,
 * `doc/plans/113/a-aero-widget-kit.md`): splitting rectangles, a list's
 * scroll window, a region hit test, word wrapping with an injected
 * measure, the hold clock, and the redraw gate. Pure: no canvas.
 */

export type { Rect };
export { contains };

/** `r` cut into `n` rows of equal height, `gap` between. */
export function rows(r: Rect, n: number, gap = 0): Rect[] {
  const h = (r.h - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({
    x: r.x,
    y: r.y + i * (h + gap),
    w: r.w,
    h,
  }));
}

/** `r` cut into `n` columns of equal width, `gap` between. */
export function columns(r: Rect, n: number, gap = 0): Rect[] {
  const w = (r.w - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({
    x: r.x + i * (w + gap),
    y: r.y,
    w,
    h: r.h,
  }));
}

/** A list's window on its rows: which show, which arrows work, the thumb. */
export interface ListWindow {
  top: number;
  shown: number[];
  canUp: boolean;
  canDown: boolean;
  /** The scroll thumb's start and length, as shares of the track. */
  thumb: { at: number; size: number };
}

const clampTop = (top: number, count: number, visible: number) =>
  Math.max(0, Math.min(top, Math.max(0, count - visible)));

export function listWindow(
  count: number,
  visible: number,
  top: number,
): ListWindow {
  const t = clampTop(top, count, visible);
  const n = Math.min(visible, count);
  return {
    top: t,
    shown: Array.from({ length: n }, (_, i) => t + i),
    canUp: t > 0,
    canDown: t + visible < count,
    thumb: count > 0 ? { at: t / count, size: n / count } : { at: 0, size: 1 },
  };
}

/** The window's top that keeps `selected` in view, moving as little as it can. */
export function keepInView(
  top: number,
  selected: number,
  visible: number,
  count: number,
) {
  let t = top;
  if (selected < t) t = selected;
  if (selected >= t + visible) t = selected - visible + 1;
  return clampTop(t, count, visible);
}

/** A named rectangle that answers a press. */
export interface Region<Id extends string = string> {
  id: Id;
  rect: Rect;
  /** A disabled region is drawn but answers nothing. */
  enabled?: boolean;
}

/** The id of the last (topmost) enabled region under (x, y), or null. */
export function hitRegion<Id extends string>(
  regions: readonly Region<Id>[],
  x: number,
  y: number,
): Id | null {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (r.enabled !== false && contains(r.rect, x, y)) return r.id;
  }
  return null;
}

/**
 * `text` wrapped to lines no wider than `width` by `measure`; a word too
 * long for a line is broken; past `maxLines` the last line ends in "…".
 */
export function wrapLines(
  text: string,
  width: number,
  measure: (s: string) => number,
  maxLines = Infinity,
): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const tryLine = line ? `${line} ${word}` : word;
      if (measure(tryLine) <= width) {
        line = tryLine;
        continue;
      }
      if (line) lines.push(line);
      let w = word;
      while (measure(w) > width && w.length > 1) {
        let k = w.length - 1;
        while (k > 1 && measure(w.slice(0, k)) > width) k--;
        lines.push(w.slice(0, k));
        w = w.slice(k);
      }
      line = w;
    }
    lines.push(line);
  }
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && measure(`${last}…`) > width) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

/** Remembers what a surface last drew, so it is drawn only when that changes. */
export class RedrawGate {
  private last: string | null = null;
  /** Whether `key` differs from what was drawn; it is taken as drawn. */
  needs(key: string) {
    if (key === this.last) return false;
    this.last = key;
    return true;
  }
  /** Forget, so the next key draws. */
  invalidate() {
    this.last = null;
  }
}
