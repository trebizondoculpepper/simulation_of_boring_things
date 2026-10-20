import type { Material, Mesh } from 'three';
import { brandById } from '../logic/brands';
import type { Brand, BrandId } from '../logic/brands';
import { brandPalette } from '../logic/brand-palette';
import type { BrandPalette } from '../logic/brand-palette';
import { createBrandBadge } from './brand-badge';
import { brandTypeface, drawBrandMark, wordmarkFont } from './brand-logo';
import type { PanelKit } from './eighties-controls';
import { tools } from './fitting-tools';

/**
 * A brand's livery for the things it makes: its house palette as paints,
 * its typeface, its badge, and printed plates in its colours and type, so
 * that anything Chlorella makes is in Chlorella's greens and set in
 * Chlorella's slab serif, and the world reads as made by real companies.
 *
 * - `paint.casing` for a machine's body, `paint.main` for its panels and
 *   trim, `paint.accent` for what should catch the eye (a handle, a
 *   start button, a warning band), `paint.shade` for frames and bases,
 *   `paint.tint` for light panels, `paint.second` and `paint.ink`.
 * - `font(size)` for any lettering, in the brand's typeface.
 * - `badge()` for its logo, `nameplate()` for a printed plate with the
 *   logo and lines of rating or instruction.
 */
export interface BrandLivery {
  brand: Brand;
  palette: BrandPalette;
  paint: Record<
    'casing' | 'main' | 'second' | 'ink' | 'accent' | 'tint' | 'shade',
    Material
  >;
  /** A CSS font in the brand's typeface: `weight` 400 to 800. */
  font: (pixels: number, weight?: number) => string;
  /** The brand's logo badge, `height` metres tall, facing +z. */
  badge: (height?: number) => Mesh;
  /**
   * A nameplate `w` × `h` metres facing +z: a band of the main colour with
   * the mark and wordmark, then `lines` in the brand's type on its tint.
   */
  nameplate: (lines: readonly string[], w?: number, h?: number) => Mesh;
}

export function brandLivery(kit: PanelKit, id: BrandId): BrandLivery {
  const brand = brandById(id);
  const palette = brandPalette(brand);
  const t = tools(kit);
  const paint = {
    casing: t.paint(palette.casing, 0.55),
    main: t.paint(palette.main, 0.45),
    second: t.paint(palette.second, 0.5),
    ink: t.paint(palette.ink, 0.5),
    accent: t.paint(palette.accent, 0.4),
    tint: t.paint(palette.tint, 0.6),
    shade: t.paint(palette.shade, 0.55),
  };
  const family = brandTypeface(brand);
  const font = (pixels: number, weight = 600) =>
    `${brand.type === 'script' ? 'italic ' : ''}${weight} ${pixels}px ${family}`;
  return {
    brand,
    palette,
    paint,
    font,
    badge: (height = 0.03) => createBrandBadge(kit, id, { height }),
    nameplate(lines, w = 0.16, h = 0.09) {
      const plate = t.printed(
        w,
        h,
        (c, cw, ch) => {
          const band = ch * 0.34;
          c.fillStyle = palette.tint;
          c.fillRect(0, 0, cw, ch);
          c.fillStyle = palette.main;
          c.fillRect(0, 0, cw, band);
          drawBrandMark(c, brand, band * 0.6, band / 2, band * 0.38);
          c.fillStyle = palette.onMain;
          c.textAlign = 'left';
          c.textBaseline = 'middle';
          c.font = wordmarkFont(brand, band * 0.5);
          c.fillText(
            brand.wordmark ?? brand.name,
            band * 1.15,
            band / 2,
            cw - band * 1.3,
          );
          c.fillStyle = palette.ink;
          c.font = font(
            ((ch - band) / Math.max(3, lines.length + 1)) * 0.8,
            500,
          );
          lines.forEach((line, i) =>
            c.fillText(
              line,
              band * 0.25,
              band + ((ch - band) / (lines.length + 1)) * (i + 1),
              cw - band * 0.5,
            ),
          );
          c.strokeStyle = palette.shade;
          c.lineWidth = Math.max(2, ch * 0.02);
          c.strokeRect(0, 0, cw, ch);
        },
        512,
      );
      plate.mesh.name = `Nameplate ${brand.name}`;
      return plate.mesh;
    },
  };
}
