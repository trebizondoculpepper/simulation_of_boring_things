/**
 * A floor slab with openings in it (prompt 036: the wet hall's backwash
 * pit): the rectangles of slab left round them, so a room's floor can be
 * drawn as solid pieces with real holes for what goes down through it.
 * Pure; metres, the room's frame, its middle at the origin.
 */

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * The slab `w` × `d` round `holes`: its grid cut at every hole's edges,
 * each cell kept unless it is inside a hole, cells in a row joined.
 */
export function slabAround(
  w: number,
  d: number,
  holes: readonly Rect[],
): Rect[] {
  const clip = (v: number, half: number) => Math.max(-half, Math.min(half, v));
  const inside = holes
    .map((h) => ({
      minX: clip(h.minX, w / 2),
      maxX: clip(h.maxX, w / 2),
      minZ: clip(h.minZ, d / 2),
      maxZ: clip(h.maxZ, d / 2),
    }))
    .filter((h) => h.maxX > h.minX && h.maxZ > h.minZ);
  const xs = [
    ...new Set([-w / 2, w / 2, ...inside.flatMap((h) => [h.minX, h.maxX])]),
  ].sort((a, b) => a - b);
  const zs = [
    ...new Set([-d / 2, d / 2, ...inside.flatMap((h) => [h.minZ, h.maxZ])]),
  ].sort((a, b) => a - b);
  const pieces: Rect[] = [];
  for (let j = 0; j < zs.length - 1; j++) {
    let run: Rect | null = null;
    for (let i = 0; i < xs.length - 1; i++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      const cz = (zs[j] + zs[j + 1]) / 2;
      const holed = inside.some(
        (h) => cx > h.minX && cx < h.maxX && cz > h.minZ && cz < h.maxZ,
      );
      if (holed) {
        if (run) pieces.push(run);
        run = null;
      } else if (run) run.maxX = xs[i + 1];
      else run = { minX: xs[i], maxX: xs[i + 1], minZ: zs[j], maxZ: zs[j + 1] };
    }
    if (run) pieces.push(run);
  }
  return pieces;
}
