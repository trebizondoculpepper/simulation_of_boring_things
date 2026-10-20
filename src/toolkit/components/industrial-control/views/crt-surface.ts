import { PlaneGeometry } from 'three';

/** A convex CRT face, with common curvature for glass and its inset picture. */
export function createCrtSurface(width: number, height: number) {
  const geometry = new PlaneGeometry(width, height, 12, 10);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) / 0.152;
    const y = position.getY(i) / 0.123;
    position.setZ(i, -0.008 * x * x - 0.006 * y * y);
  }
  geometry.computeVertexNormals();
  return geometry;
}
