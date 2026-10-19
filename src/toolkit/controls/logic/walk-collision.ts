/** A solid footprint on the floor plan, in world units. */
export interface Footprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** True when a walker of this radius standing at (x, z) overlaps the footprint. */
export function overlaps(
  footprint: Footprint,
  x: number,
  z: number,
  radius: number,
) {
  return (
    x > footprint.minX - radius &&
    x < footprint.maxX + radius &&
    z > footprint.minZ - radius &&
    z < footprint.maxZ + radius
  );
}

/**
 * Move a walker by (dx, dz), sliding along anything solid: each axis is tried
 * separately, so walking diagonally into a wall keeps the motion along it.
 * A walker that somehow starts inside a footprint may still move out of it.
 */
export function slide(
  footprints: readonly Footprint[],
  x: number,
  z: number,
  dx: number,
  dz: number,
  radius: number,
) {
  const blocked = (nextX: number, nextZ: number) =>
    footprints.some(
      (item) =>
        overlaps(item, nextX, nextZ, radius) && !overlaps(item, x, z, radius),
    );
  // Long steps are split so a fast walker cannot pass through a thin wall.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (radius * 0.5)));
  for (let i = 0; i < steps; i++) {
    if (!blocked(x + dx / steps, z)) x += dx / steps;
    if (!blocked(x, z + dz / steps)) z += dz / steps;
  }
  return { x, z };
}

/**
 * `solids` with `openings` cut out of them: each solid that an opening
 * overlaps is split into the up to four pieces of it round the opening,
 * so a doorway can be walked through a wall built solid.
 */
export function cutOpenings(
  solids: readonly Footprint[],
  openings: readonly Footprint[],
): Footprint[] {
  let pieces = [...solids];
  for (const hole of openings) {
    const next: Footprint[] = [];
    for (const s of pieces) {
      const apart =
        hole.maxX <= s.minX ||
        hole.minX >= s.maxX ||
        hole.maxZ <= s.minZ ||
        hole.minZ >= s.maxZ;
      if (apart) {
        next.push(s);
        continue;
      }
      // Either side across x, then what is left above and below in z.
      if (hole.minX > s.minX) next.push({ ...s, maxX: hole.minX });
      if (hole.maxX < s.maxX) next.push({ ...s, minX: hole.maxX });
      const minX = Math.max(s.minX, hole.minX);
      const maxX = Math.min(s.maxX, hole.maxX);
      if (hole.minZ > s.minZ)
        next.push({ minX, maxX, minZ: s.minZ, maxZ: hole.minZ });
      if (hole.maxZ < s.maxZ)
        next.push({ minX, maxX, minZ: hole.maxZ, maxZ: s.maxZ });
    }
    pieces = next;
  }
  return pieces;
}
