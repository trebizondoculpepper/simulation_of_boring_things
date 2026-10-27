import { ExtrudeGeometry, Shape } from 'three';

/**
 * A thin slab whose outline is a rectangle with rounded corners, `w` × `h`
 * with corner radius `r`, `depth` thick along z, centred on the origin:
 * the seam or gasket between a rounded case's halves. Unlike a thin
 * RoundedBoxGeometry (whose radius is capped at half its depth), its
 * corners follow the case's.
 */
export function roundedSlab(w: number, h: number, depth: number, r: number) {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new ExtrudeGeometry(s, {
    depth,
    bevelEnabled: false,
    curveSegments: 8,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}
