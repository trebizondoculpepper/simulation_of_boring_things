import { dot } from './font-5x7';

/**
 * A low-resolution graphic dot-matrix LCD's frame (the owner, 2026-10-27:
 * the pumps' screens as a 1980s-style matrix display, every pixel a
 * visible dot): `width` × `height` dots, each lit or not, drawn on by
 * text in the controller's 5 × 7 font at a whole-number scale, lines,
 * boxes and circles. Pure.
 */
export interface DotFrame {
  width: number;
  height: number;
  dots: Uint8Array;
}

export function dotFrame(width: number, height: number): DotFrame {
  return { width, height, dots: new Uint8Array(width * height) };
}

export function setDot(f: DotFrame, x: number, y: number, lit = true) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= f.width || yi >= f.height) return;
  f.dots[yi * f.width + xi] = lit ? 1 : 0;
}

export const isLit = (f: DotFrame, x: number, y: number) =>
  f.dots[y * f.width + x] === 1;

/** A filled box, lit or cleared. */
export function fillBox(
  f: DotFrame,
  x: number,
  y: number,
  w: number,
  h: number,
  lit = true,
) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) setDot(f, x + i, y + j, lit);
}

/** A box's outline. */
export function box(f: DotFrame, x: number, y: number, w: number, h: number) {
  for (let i = 0; i < w; i++) {
    setDot(f, x + i, y);
    setDot(f, x + i, y + h - 1);
  }
  for (let j = 0; j < h; j++) {
    setDot(f, x, y + j);
    setDot(f, x + w - 1, y + j);
  }
}

/** A circle's outline about (cx, cy). */
export function circle(f: DotFrame, cx: number, cy: number, r: number) {
  const n = Math.max(12, Math.round(r * 8));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    setDot(f, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
}

/** The width in dots of `text` at `scale`: 6 dots a character, less the last gap. */
export const textWidth = (text: string, scale = 1) =>
  Math.max(0, text.length * 6 * scale - scale);

/**
 * `text` with its top left at (x, y), each font dot `scale` × `scale`
 * frame dots; `lit` false draws it cleared, as on an inverted bar.
 */
export function text(
  f: DotFrame,
  x: number,
  y: number,
  s: string,
  scale = 1,
  lit = true,
) {
  [...s].forEach((ch, k) => {
    if (ch === ' ') return;
    const x0 = x + k * 6 * scale;
    for (let col = 0; col < 5; col++)
      for (let row = 0; row < 7; row++)
        if (dot(ch, col, row))
          fillBox(f, x0 + col * scale, y + row * scale, scale, scale, lit);
  });
}
