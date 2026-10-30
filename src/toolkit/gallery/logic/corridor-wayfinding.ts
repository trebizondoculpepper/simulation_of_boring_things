import {
  CORRIDOR_DOORS,
  CORRIDOR_LIFT,
  MAIN_CORRIDOR,
  corridorWalls,
} from './main-corridor';
import type { CorridorWall } from './main-corridor';

/**
 * Wayfinding signs at the main corridor's corners (prompt 082; the owner,
 * 2026-10-26: the square corridor is confusing). At each of the ring's
 * four outside corners, one sign on each of the two outside walls that
 * meet there, near the corner, facing into the corridor: an arrow along
 * its side of the ring, away from the corner, then every room whose doors
 * are on that side (its outside wall and the inside wall opposite),
 * nearest first, then the rooms round the next corner. The service lift
 * (`freight_lift`, its landing `CORRIDOR_LIFT`) is listed as a room
 * (the owner, 2026-10-30). Derived from the corridor's door list and the
 * lift's landing, so it stays right when rooms move. Pure: the
 * corridor's frame (`main-corridor.ts`), x east, z south.
 */

type Side = 'north' | 'east' | 'south' | 'west';

/** Each side's inside wall, opposite its outside one. */
const INNER: Record<Side, CorridorWall> = {
  north: 'inner-north',
  east: 'inner-east',
  south: 'inner-south',
  west: 'inner-west',
};

/** The ring's corners, by name, and where each is. */
const S = MAIN_CORRIDOR.side;
const CORNERS = {
  'north-west': { x: 0, z: 0 },
  'north-east': { x: S, z: 0 },
  'south-east': { x: S, z: S },
  'south-west': { x: 0, z: S },
} as const;
type Corner = keyof typeof CORNERS;

/** Going round: each side's two ends, and the side beyond each end. */
const SIDES: Record<Side, { ends: [Corner, Corner]; beyond: [Side, Side] }> = {
  north: { ends: ['north-west', 'north-east'], beyond: ['west', 'east'] },
  east: { ends: ['north-east', 'south-east'], beyond: ['north', 'south'] },
  south: { ends: ['south-west', 'south-east'], beyond: ['west', 'east'] },
  west: { ends: ['north-west', 'south-west'], beyond: ['north', 'south'] },
};

/** How far from its corner a sign stands along its wall, metres. */
export const SIGN_FROM_CORNER = 0.9;

export interface WayfindingSign {
  corner: Corner;
  wall: Side;
  /** Along its wall from the wall's start, as `CORRIDOR_DOORS`' `at`. */
  at: number;
  /** The arrow, as the reader facing the sign sees it. */
  arrow: 'left' | 'right';
  /** The rooms along this side, nearest first. */
  along: string[];
  /** The rooms round the next corner, nearest first. */
  then: string[];
}

/** The rooms whose doors are on side `side`, ordered from `from` (0 or the side's length). */
function roomsAlong(side: Side, from: number): string[] {
  const doors = [
    ...CORRIDOR_DOORS,
    { wall: CORRIDOR_LIFT.wall, at: CORRIDOR_LIFT.at, to: 'freight_lift' },
  ]
    .filter((d) => d.wall === side || d.wall === INNER[side])
    .sort((a, b) => Math.abs(a.at - from) - Math.abs(b.at - from));
  const seen: string[] = [];
  for (const d of doors) if (!seen.includes(d.to)) seen.push(d.to);
  return seen;
}

/** The eight signs. */
export function wayfindingSigns(): WayfindingSign[] {
  const walls = corridorWalls();
  const signs: WayfindingSign[] = [];
  for (const side of Object.keys(SIDES) as Side[]) {
    const { ends, beyond } = SIDES[side];
    const w = walls[side];
    ends.forEach((corner, k) => {
      // From this corner along the side, toward its other end.
      const fromStart = k === 0;
      const at = fromStart
        ? w.from + SIGN_FROM_CORNER
        : w.to - SIGN_FROM_CORNER;
      const travel: [number, number] = w.alongX
        ? [fromStart ? 1 : -1, 0]
        : [0, fromStart ? 1 : -1];
      // The reader faces the wall, looking against `into`; their right is
      // (-look.z, look.x).
      const look = [-w.into[0], -w.into[1]];
      const right = [-look[1], look[0]];
      const arrow =
        travel[0] * right[0] + travel[1] * right[1] > 0 ? 'right' : 'left';
      const next = beyond[fromStart ? 1 : 0];
      // Round the next corner: the next side, from its end at that corner.
      const nextCorner = ends[fromStart ? 1 : 0];
      const nextFrom =
        SIDES[next].ends[0] === nextCorner ? walls[next].from : walls[next].to;
      signs.push({
        corner,
        wall: side,
        at,
        arrow,
        along: roomsAlong(side, fromStart ? w.from : w.to),
        then: roomsAlong(next, nextFrom),
      });
    });
  }
  return signs;
}

export { CORNERS };
