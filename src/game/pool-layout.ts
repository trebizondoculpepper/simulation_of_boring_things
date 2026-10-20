import type { PlanFootprint } from './facility-plan';

/** Metres in the main hall; the basins are empty and deliberately simple. */
export interface Basin extends PlanFootprint {
  id: 'main' | 'learner' | 'spa';
  depth: number;
}

export const BASINS: readonly Basin[] = [
  { id: 'main', minX: 8, maxX: 58, minZ: 10, maxZ: 30, depth: 1.8 },
  { id: 'learner', minX: 63, maxX: 74, minZ: 10, maxZ: 18, depth: 0.9 },
  { id: 'spa', minX: 64, maxX: 73, minZ: 22, maxZ: 30, depth: 1.1 },
];

/** Subtract rectangular basins from a floor without triangulating the deck. */
export function cutBasins(
  floor: PlanFootprint,
  basins: readonly PlanFootprint[] = BASINS,
): PlanFootprint[] {
  let pieces = [floor];
  for (const basin of basins) {
    const next: PlanFootprint[] = [];
    for (const piece of pieces) {
      const left = Math.max(piece.minX, basin.minX);
      const right = Math.min(piece.maxX, basin.maxX);
      const top = Math.max(piece.minZ, basin.minZ);
      const bottom = Math.min(piece.maxZ, basin.maxZ);
      if (left >= right || top >= bottom) {
        next.push(piece);
        continue;
      }
      if (piece.minX < left)
        next.push({
          minX: piece.minX,
          maxX: left,
          minZ: piece.minZ,
          maxZ: piece.maxZ,
        });
      if (right < piece.maxX)
        next.push({
          minX: right,
          maxX: piece.maxX,
          minZ: piece.minZ,
          maxZ: piece.maxZ,
        });
      if (piece.minZ < top)
        next.push({ minX: left, maxX: right, minZ: piece.minZ, maxZ: top });
      if (bottom < piece.maxZ)
        next.push({ minX: left, maxX: right, minZ: bottom, maxZ: piece.maxZ });
    }
    pieces = next;
  }
  return pieces;
}
