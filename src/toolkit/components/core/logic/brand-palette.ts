import type { Brand } from './brands';

/**
 * Each brand's house palette, worked out from its three colours (main,
 * second, ink) by colour theory, so that anything a brand makes looks
 * like it came from the same company:
 *
 * - `accent`, a highlight that stands out against the main colour: of
 *   the main colour's complement and its two split complements (opposite
 *   on the colour wheel, and 30° either side), the one whose hue lies
 *   furthest from all three brand colours, its lightness moved until it
 *   contrasts with the main colour at least 3 : 1 (the WCAG ratio for
 *   graphics);
 * - `tint` and `shade`, the main colour lightened and darkened, for
 *   panels, trim and shadows in its own family;
 * - `casing`, a near-neutral body colour faintly of the main colour's hue,
 *   for the bulk of a machine, as industrial makers paint their kit;
 * - `onMain` and `onCasing`, whichever of white and the ink reads better
 *   printed over the main colour and over the casing.
 *
 * Pure data and arithmetic: no DOM, no Three.js.
 */

export interface BrandPalette {
  main: string;
  second: string;
  ink: string;
  accent: string;
  tint: string;
  shade: string;
  casing: string;
  onMain: string;
  onCasing: string;
}

/** Hue (degrees), saturation and lightness (0 to 1). */
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: readonly number[]) {
  const part = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function hexToHsl(hex: string): Hsl {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / d + 2) * 60
        : ((r - g) / d + 4) * 60;
  return { h, s, l };
}

export function hslToHex({ h, s, l }: Hsl) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

/** Relative luminance, as WCAG 2 defines it. */
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast ratio of two colours, 1 to 21. */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The shortest distance round the colour wheel between two hues, degrees. */
const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Whichever of white and `ink` reads better over `under`. */
const readableOver = (under: string, ink: string) =>
  contrast('#ffffff', under) >= contrast(ink, under) ? '#ffffff' : ink;

/** The house palette of `brand`. */
export function brandPalette(brand: Pick<Brand, 'colours'>): BrandPalette {
  const [main, second, ink] = brand.colours;
  const base = hexToHsl(main);
  const hues = brand.colours.map((c) => hexToHsl(c));
  // The accent's hue: of the complement and split complements, the one
  // furthest from every brand colour that has a hue to speak of.
  const coloured = hues.filter((c) => c.s > 0.12);
  const candidates = [180, 150, 210].map((turn) => (base.h + turn) % 360);
  const hue = candidates
    .map((h) => ({
      h,
      gap: Math.min(...coloured.map((c) => hueGap(h, c.h)), 180),
    }))
    .sort((a, b) => b.gap - a.gap)[0].h;
  // Strongly coloured; then made lighter or darker, whichever reaches a
  // 3 : 1 contrast with the main colour in the smaller step.
  const s = Math.max(0.6, Math.min(0.85, base.s + 0.15));
  const step = (direction: number) => {
    for (let i = 0; i <= 42; i++) {
      const l = 0.5 + direction * i * 0.01;
      const colour = hslToHex({ h: hue, s, l });
      if (contrast(colour, main) >= 3) return { colour, i };
    }
    return null;
  };
  const found = [step(1), step(-1)]
    .filter((x) => x !== null)
    .sort((a, b) => a.i - b.i)[0];
  const accent =
    found?.colour ??
    (base.l < 0.5
      ? hslToHex({ h: hue, s, l: 0.92 })
      : hslToHex({ h: hue, s, l: 0.08 }));
  const tint = hslToHex({ h: base.h, s: base.s * 0.55, l: 0.9 });
  const shade = hslToHex({ h: base.h, s: Math.min(1, base.s * 0.9), l: 0.18 });
  const casing = hslToHex({
    h: base.h,
    s: Math.min(0.12, base.s * 0.2),
    l: 0.8,
  });
  return {
    main,
    second,
    ink,
    accent,
    tint,
    shade,
    casing,
    onMain: readableOver(main, ink),
    onCasing: readableOver(casing, ink),
  };
}
