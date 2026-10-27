import { WALL_FACE } from './plant-room-layout';
import type {
  ExhibitPlace,
  ExhibitSize,
  PlantRoomLayout,
} from './plant-room-layout';

/**
 * A gallery of wall exhibits hung round all four walls in tiers (mission
 * 093's dev48, its many reinterpreted panels): the room sized, about 1.4
 * times as long as deep, so every exhibit fits, each tier going round the
 * walls in turn (south, east, north, west), clear of the corners and of
 * the door near the west wall's south end. Pure.
 */

export interface GalleryWallOptions {
  /** Each tier's middle height, metres, the lowest first. */
  tiers?: readonly number[];
  /** Between exhibits along a wall, metres. */
  gap?: number;
  /** Kept clear at each corner, metres. */
  corner?: number;
  /** Kept clear for the door, from the west wall's south corner, metres. */
  door?: number;
}

type Wall = 'south' | 'east' | 'north' | 'west';
const WALLS: readonly Wall[] = ['south', 'east', 'north', 'west'];

export function galleryWallLayout(
  sizes: readonly ExhibitSize[],
  {
    tiers = [1.35, 2.6],
    gap = 0.45,
    corner = 0.6,
    door = 2.4,
  }: GalleryWallOptions = {},
): PlantRoomLayout {
  const run = sizes.reduce((t, s) => t + s.w + gap, 0) / tiers.length;
  // 2 × (X + Z) less the corners and the door holds a tier, X = 1.4 Z.
  let halfZ = Math.max(4, (run + 8 * corner + door) / (4 * 2.4) + 0.5);
  for (let tries = 0; tries < 40; tries++) {
    const placed = attempt(sizes, halfZ * 1.4, halfZ, tiers, gap, corner, door);
    if (placed) {
      const top = Math.max(...sizes.map((s, i) => placed[i].y + s.h / 2));
      return {
        halfX: halfZ * 1.4,
        halfZ,
        height: Math.max(4, Math.ceil((top + 0.6) * 2) / 2),
        places: placed,
        solids: [],
      };
    }
    halfZ += 0.25;
  }
  throw new Error('gallery walls: the exhibits will not fit');
}

/** Hang every exhibit, or null if they do not all fit. */
function attempt(
  sizes: readonly ExhibitSize[],
  halfX: number,
  halfZ: number,
  tiers: readonly number[],
  gap: number,
  corner: number,
  door: number,
): ExhibitPlace[] | null {
  const out: ExhibitPlace[] = [];
  let i = 0;
  for (const y of tiers)
    for (const wall of WALLS) {
      const along = wall === 'south' || wall === 'north' ? halfX : halfZ;
      // From one end of the wall to the other, as the walker faces it.
      const from = -along + corner;
      let to = along - corner;
      // The door near the west wall's south end (z positive).
      if (wall === 'west') to = Math.min(to, halfZ - door);
      let at = from;
      while (i < sizes.length && at + sizes[i].w <= to + 1e-9) {
        const s = sizes[i];
        const mid = at + s.w / 2;
        out.push(place(wall, mid, y, halfX, halfZ));
        at += s.w + gap;
        i++;
      }
    }
  return i === sizes.length ? out : null;
}

function place(
  wall: Wall,
  mid: number,
  y: number,
  halfX: number,
  halfZ: number,
): ExhibitPlace {
  if (wall === 'south')
    return { x: -mid, z: halfZ - WALL_FACE, y, yaw: Math.PI };
  if (wall === 'north') return { x: mid, z: -halfZ + WALL_FACE, y, yaw: 0 };
  if (wall === 'east')
    return { x: halfX - WALL_FACE, z: mid, y, yaw: -Math.PI / 2 };
  return { x: -halfX + WALL_FACE, z: mid, y, yaw: Math.PI / 2 };
}
