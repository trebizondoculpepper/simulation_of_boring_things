/**
 * Plan geometry for the pool-room styles (`doc/design/pool-styles.md`):
 * points, rectangles and outlines in metres (x east, z south), and the
 * tests a plan needs of them. Pure.
 */

export type Point = readonly [number, number];

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const rect = (
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): Rect => ({
  minX,
  maxX,
  minZ,
  maxZ,
});

/** Whether (x, z) is inside the closed outline `polygon` (even–odd). */
export function insidePolygon(
  polygon: readonly Point[],
  x: number,
  z: number,
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)
      inside = !inside;
  }
  return inside;
}

/** Whether (x, z) is inside `r`. */
export const insideRect = (r: Rect, x: number, z: number) =>
  x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;

/** How far (x, z) is from the nearest point of the polyline `line`. */
export function distanceToLine(
  line: readonly Point[],
  x: number,
  z: number,
): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1];
    const [bx, bz] = line[i];
    const dx = bx - ax,
      dz = bz - az;
    const t = Math.max(
      0,
      Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)),
    );
    best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  }
  return best;
}
