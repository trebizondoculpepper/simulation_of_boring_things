import type { Placed } from './room-equipment';
import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * The switch room's floor (prompt 089, item 5; the owner, 2026-10-27): the
 * working space before its switchgear marked out (BS 7671 and the
 * Electricity at Work Regulations, reg. 15: at least a metre clear before
 * each board, kept clear in the layout already), a 50 mm yellow line round
 * each; and insulating rubber matting (BS EN 61111) along the main
 * switchboard's front, inside its working space. Drawn from where the
 * boards are placed, so they follow them. Set decoration. Pure: metres,
 * the room's frame.
 */

/** The working space's depth before a board. */
export const WORKING_SPACE = 1.0;
/** The marking line's width. */
export const MARK_LINE = 0.05;
/** The matting's depth out from the board, and its gap from the line at each end. */
export const MAT = { depth: 0.8, inset: 0.08, thickness: 0.006 } as const;

/** What has its working space marked: the switchgear operated in this room. */
const MARKED = ['lv-switchboard', 'main-switch', 'changeover-switch'] as const;

/** The floor directly before a placed board, `depth` out from its front. */
export function infront(p: Placed, depth: number): Footprint | null {
  const f = p.footprint;
  switch (p.side) {
    case 'west':
      return { minX: f.maxX, maxX: f.maxX + depth, minZ: f.minZ, maxZ: f.maxZ };
    case 'east':
      return { minX: f.minX - depth, maxX: f.minX, minZ: f.minZ, maxZ: f.maxZ };
    case 'north':
      return { minX: f.minX, maxX: f.maxX, minZ: f.maxZ, maxZ: f.maxZ + depth };
    case 'south':
      return { minX: f.minX, maxX: f.maxX, minZ: f.minZ - depth, maxZ: f.minZ };
    default:
      return null;
  }
}

/**
 * The three lines marking a working space: along its far edge, and down
 * each end to the board's front (the board itself closes it), each a
 * rectangle on the floor.
 */
export function workingSpaceLines(p: Placed): Footprint[] {
  const s = infront(p, WORKING_SPACE);
  if (!s) return [];
  const l = MARK_LINE;
  if (p.side === 'west' || p.side === 'east') {
    const far = p.side === 'west' ? s.maxX : s.minX;
    const x0 = Math.min(far, p.side === 'west' ? s.minX : s.maxX);
    const x1 = Math.max(far, p.side === 'west' ? s.minX : s.maxX);
    return [
      { minX: far - l / 2, maxX: far + l / 2, minZ: s.minZ, maxZ: s.maxZ },
      { minX: x0, maxX: x1, minZ: s.minZ, maxZ: s.minZ + l },
      { minX: x0, maxX: x1, minZ: s.maxZ - l, maxZ: s.maxZ },
    ];
  }
  const far = p.side === 'north' ? s.maxZ : s.minZ;
  return [
    { minX: s.minX, maxX: s.maxX, minZ: far - l / 2, maxZ: far + l / 2 },
    { minX: s.minX, maxX: s.minX + l, minZ: s.minZ, maxZ: s.maxZ },
    { minX: s.maxX - l, maxX: s.maxX, minZ: s.minZ, maxZ: s.maxZ },
  ];
}

/** The matting before a board: inside its working space, clear of its lines. */
export function boardMat(p: Placed): Footprint | null {
  const s = infront(p, MAT.depth);
  if (!s) return null;
  const i = MAT.inset;
  return p.side === 'west' || p.side === 'east'
    ? { ...s, minZ: s.minZ + i, maxZ: s.maxZ - i }
    : { ...s, minX: s.minX + i, maxX: s.maxX - i };
}

/** The switch room's floor markings, from its placed switchgear. */
export function switchRoomFloor(placed: readonly Placed[]): {
  lines: Footprint[];
  mats: Footprint[];
} {
  const lines = placed
    .filter((p) => (MARKED as readonly string[]).includes(p.item.key))
    .flatMap(workingSpaceLines);
  const board = placed.find((p) => p.item.key === 'lv-switchboard');
  const mat = board ? boardMat(board) : null;
  return { lines, mats: mat ? [mat] : [] };
}
