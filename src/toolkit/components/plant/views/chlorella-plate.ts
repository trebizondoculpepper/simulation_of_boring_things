import type { Mesh } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { brandLivery } from '../../core/views/brand-livery';
import { drawBrandMark, wordmarkFont } from '../../core/views/brand-logo';

/**
 * Chlorella's maker's plate (the owner, 2026-10-27: every specialist
 * chemical handling component is supplied by Chlorella): its mark and
 * wordmark on its livery, a line of what the thing is beneath. `w` metres
 * wide, a third as tall; facing +z.
 */
export function chlorellaPlate(kit: PanelKit, w: number, line: string): Mesh {
  return brandPlate(kit, 'chlorella', w, line);
}

/** Any maker's plate, as Chlorella's: its mark and wordmark, a line beneath. */
export function brandPlate(
  kit: PanelKit,
  id: Parameters<typeof brandLivery>[1],
  w: number,
  line: string,
): Mesh {
  const brand = brandLivery(kit, id);
  return tools(kit).printed(
    w,
    w * 0.32,
    (c, cw, ch) => {
      c.fillStyle = brand.palette.main;
      c.fillRect(0, 0, cw, ch);
      drawBrandMark(c, brand.brand, 34, ch / 2, 22, brand.palette.main);
      c.fillStyle = brand.palette.onMain;
      c.font = wordmarkFont(brand.brand, 34);
      c.textBaseline = 'middle';
      c.fillText(brand.brand.wordmark ?? brand.brand.name, 64, ch / 2 - 10);
      c.font = '15px sans-serif';
      c.fillText(line, 64, ch / 2 + 22, cw - 72);
    },
    512,
  ).mesh;
}
