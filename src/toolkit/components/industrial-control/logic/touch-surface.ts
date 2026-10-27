/**
 * A touch surface's geometry (mission 093): a flat black backing frame of
 * any outline, in metres in its own plane (x right, y up, origin at its
 * middle), with rectangular screens set into it, each surrounded by a
 * bezel of frame; and the maps from a touch on a screen (its texture's
 * coordinates, or a point in the frame's plane) to the pixel of the 2D
 * tree it shows. Pure: no DOM or Three.js.
 */

export type Point2 = readonly [number, number];

/** A screen's opening in the frame, metres: its middle and size. */
export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A rectangle's outline, `w` × `h`, about the middle. */
export const rectOutline = (w: number, h: number): Point2[] => [
  [-w / 2, -h / 2],
  [w / 2, -h / 2],
  [w / 2, h / 2],
  [-w / 2, h / 2],
];

/** A rectangle with its corners rounded by `r`, each in `steps` straight pieces. */
export function roundedOutline(
  w: number,
  h: number,
  r: number,
  steps = 6,
): Point2[] {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const corners: [number, number, number][] = [
    [w / 2 - rr, -h / 2 + rr, -Math.PI / 2],
    [w / 2 - rr, h / 2 - rr, 0],
    [-w / 2 + rr, h / 2 - rr, Math.PI / 2],
    [-w / 2 + rr, -h / 2 + rr, Math.PI],
  ];
  const out: Point2[] = [];
  for (const [cx, cy, a0] of corners)
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (Math.PI / 2) * (i / steps);
      out.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
  return out;
}

/** A trapezium, `bottom` wide at its foot and `top` wide at its head, `h` high. */
export const trapeziumOutline = (
  bottom: number,
  top: number,
  h: number,
): Point2[] => [
  [-bottom / 2, -h / 2],
  [bottom / 2, -h / 2],
  [top / 2, h / 2],
  [-top / 2, h / 2],
];

/** A regular polygon of `n` sides about the middle, `radius` to its corners, a flat at its foot. */
export function polygonOutline(n: number, radius: number): Point2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + Math.PI / n + (2 * Math.PI * i) / n;
    return [radius * Math.cos(a), radius * Math.sin(a)] as const;
  });
}

/** Whether `p` is inside the outline `poly` (even-odd: concave outlines too). */
export function insideOutline(poly: readonly Point2[], p: Point2): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (
      yi > p[1] !== yj > p[1] &&
      p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi
    )
      inside = !inside;
  }
  return inside;
}

/** A screen's opening grown by `bezel` on every side: the frame it needs round it. */
export const withBezel = (s: ScreenRect, bezel: number): ScreenRect => ({
  x: s.x,
  y: s.y,
  w: s.w + 2 * bezel,
  h: s.h + 2 * bezel,
});

/** Whether two screens' rectangles overlap. */
const overlap = (a: ScreenRect, b: ScreenRect) =>
  Math.abs(a.x - b.x) * 2 < a.w + b.w - 1e-9 &&
  Math.abs(a.y - b.y) * 2 < a.h + b.h - 1e-9;

/**
 * What is wrong with `screens` set into `outline`, if anything: each
 * screen with its bezel must lie inside the frame (its corners and edges,
 * checked at `samples` points a side, so a concave notch is found), and
 * no two screens' bezels may overlap (they may share one bezel's width).
 */
export function checkScreens(
  outline: readonly Point2[],
  screens: readonly ScreenRect[],
  bezel: number,
  samples = 8,
): string[] {
  const problems: string[] = [];
  screens.forEach((s, i) => {
    const b = withBezel(s, bezel);
    const edge: Point2[] = [];
    for (let k = 0; k <= samples; k++) {
      const f = k / samples - 0.5;
      edge.push(
        [b.x + f * b.w, b.y - b.h / 2],
        [b.x + f * b.w, b.y + b.h / 2],
        [b.x - b.w / 2, b.y + f * b.h],
        [b.x + b.w / 2, b.y + f * b.h],
      );
    }
    // Pulled in a hair, so a bezel exactly on the frame's edge fits.
    const e = 1e-6;
    if (
      edge.some(
        ([x, y]) =>
          !insideOutline(outline, [
            x + Math.sign(b.x - x) * e,
            y + Math.sign(b.y - y) * e,
          ]),
      )
    )
      problems.push(`screen ${i} and its bezel run off the frame`);
    screens.forEach((t, j) => {
      if (j > i && overlap(withBezel(s, bezel / 2), withBezel(t, bezel / 2)))
        problems.push(`screens ${i} and ${j} overlap`);
    });
  });
  return problems;
}

/**
 * The smallest rounded-rectangle frame round `screens` with `bezel` all
 * round them, its corners rounded by `radius`.
 */
export function outlineAround(
  screens: readonly ScreenRect[],
  bezel: number,
  radius = 0,
): { outline: Point2[]; centre: Point2; w: number; h: number } {
  const minX = Math.min(...screens.map((s) => s.x - s.w / 2)) - bezel;
  const maxX = Math.max(...screens.map((s) => s.x + s.w / 2)) + bezel;
  const minY = Math.min(...screens.map((s) => s.y - s.h / 2)) - bezel;
  const maxY = Math.max(...screens.map((s) => s.y + s.h / 2)) + bezel;
  const w = maxX - minX;
  const h = maxY - minY;
  const centre: Point2 = [(minX + maxX) / 2, (minY + maxY) / 2];
  const base =
    radius > 0
      ? roundedOutline(w, h, Math.min(radius, bezel + Math.min(w, h) / 2))
      : rectOutline(w, h);
  return {
    outline: base.map(([x, y]) => [x + centre[0], y + centre[1]] as const),
    centre,
    w,
    h,
  };
}

/**
 * Screens in a grid filling the box `w` × `h` (about the middle) inside
 * a bezel, `gap` metres between them (one bezel's width if not given):
 * rows from the top, each row's share of the height given by `rows`
 * and each screen's share of its row by the row's numbers.
 */
export function screenGrid(
  w: number,
  h: number,
  bezel: number,
  rows: readonly (readonly number[])[],
  rowShares: readonly number[] = rows.map(() => 1),
  gap = bezel,
): ScreenRect[] {
  const innerW = w - 2 * bezel;
  const innerH = h - 2 * bezel - gap * (rows.length - 1);
  const total = rowShares.reduce((a, b) => a + b, 0);
  let top = h / 2 - bezel;
  const out: ScreenRect[] = [];
  rows.forEach((row, r) => {
    const rh = (innerH * rowShares[r]) / total;
    const sum = row.reduce((a, b) => a + b, 0);
    const rw = innerW - gap * (row.length - 1);
    let left = -w / 2 + bezel;
    for (const share of row) {
      const sw = (rw * share) / sum;
      out.push({ x: left + sw / 2, y: top - rh / 2, w: sw, h: rh });
      left += sw + gap;
    }
    top -= rh + gap;
  });
  return out;
}

/** A screen's pixel for a touch at its texture's `(u, v)` (u right, v up). */
export const uvToPixel = (
  u: number,
  v: number,
  width: number,
  height: number,
) => ({
  x: u * width,
  y: (1 - v) * height,
});

/** The screen under the point `(x, y)` of the frame's plane, if any. */
export function screenAt(
  screens: readonly ScreenRect[],
  x: number,
  y: number,
): number | null {
  const i = screens.findIndex(
    (s) => Math.abs(x - s.x) <= s.w / 2 && Math.abs(y - s.y) <= s.h / 2,
  );
  return i < 0 ? null : i;
}

/** The pixel of screen `s` (`width` × `height` pixels) under the frame-plane point `(x, y)`. */
export function planeToPixel(
  s: ScreenRect,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return uvToPixel(
    (x - (s.x - s.w / 2)) / s.w,
    (y - (s.y - s.h / 2)) / s.h,
    width,
    height,
  );
}

/**
 * Where a flat point `x` along a curved strip goes, bent round a
 * vertical axis `radius` metres in front of it (the strip wrapping round
 * the viewer: its middle where it was, its ends coming forward). A
 * radius of 0 or Infinity leaves it flat.
 */
export function bend(x: number, radius: number): { x: number; z: number } {
  if (!Number.isFinite(radius) || radius <= 0) return { x, z: 0 };
  const a = x / radius;
  return { x: radius * Math.sin(a), z: radius * (1 - Math.cos(a)) };
}
