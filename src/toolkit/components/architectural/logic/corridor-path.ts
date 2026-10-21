import type { Footprint } from '../../../controls/logic/walk-collision';

/**
 * Corridors as a list of pieces (`AGENTS.md`: one section everywhere,
 * 1.2 m wide and 2.5 m tall): straights of any length; left and right
 * turns, each a 1.2 m square whose outer wall is a quarter round; and
 * stairs, one straight flight up (a positive rise) or down (a negative
 * one): the same flight, met from its foot or its head. Laying
 * the list out from a start gives each piece's place and heading and the
 * footprints of its walls, for walking collision. Pure; metres, x east, z
 * south; a heading is the direction of travel, 0 east, then turning left
 * (toward −z, north) a quarter at a time.
 */

export const CORRIDOR_WIDTH = 1.2;
export const CORRIDOR_HEIGHT = 2.5;
export const CORRIDOR_WALL = 0.2;

export type CorridorPiece =
  | { kind: 'straight'; length: number }
  | { kind: 'left' }
  | { kind: 'right' }
  | { kind: 'stairs'; rise: number };

/** A flight's steps: as near 170 mm risers as fit, on 280 mm goings. */
export const STAIR = { riser: 0.17, going: 0.28 } as const;

/** A flight of `rise`: its number of steps, each step's rise, and its length. */
export function flight(rise: number) {
  const steps = Math.max(2, Math.round(Math.abs(rise) / STAIR.riser));
  return {
    steps,
    riser: Math.abs(rise) / steps,
    length: steps * STAIR.going,
  };
}

/** How far a piece runs along its heading. */
export const pieceLength = (piece: CorridorPiece) =>
  piece.kind === 'straight'
    ? piece.length
    : piece.kind === 'stairs'
      ? flight(piece.rise).length
      : CORRIDOR_WIDTH;

/** Headings: 0 east (+x), 1 north (−z), 2 west (−x), 3 south (+z). */
export type Heading = 0 | 1 | 2 | 3;

const DIRECTION: Record<Heading, readonly [number, number]> = {
  0: [1, 0],
  1: [0, -1],
  2: [-1, 0],
  3: [0, 1],
};

/** A piece laid out: where its entry's middle is, and its heading there. */
export interface PlacedPiece {
  piece: CorridorPiece;
  /** The middle of its entry, and its floor's level there. */
  x: number;
  z: number;
  y: number;
  heading: Heading;
  /** The turn about y (radians) that takes a piece built heading east here. */
  yaw: number;
}

/** The turn about y for a heading: east 0, north a quarter anticlockwise. */
export const headingYaw = (h: Heading) => (h * Math.PI) / 2;

/** Lay out `pieces` from (x, z), heading `heading`. */
export function layoutCorridor(
  pieces: readonly CorridorPiece[],
  start: { x: number; z: number; y?: number; heading: Heading },
) {
  let { x, z, heading } = start;
  let y = start.y ?? 0;
  const placed: PlacedPiece[] = [];
  for (const piece of pieces) {
    placed.push({ piece, x, z, y, heading, yaw: headingYaw(heading) });
    const [dx, dz] = DIRECTION[heading];
    if (piece.kind === 'straight' || piece.kind === 'stairs') {
      const length = pieceLength(piece);
      x += dx * length;
      z += dz * length;
      if (piece.kind === 'stairs') y += piece.rise;
      continue;
    }
    // A turn: across half its square, then out of its side.
    const half = CORRIDOR_WIDTH / 2;
    const next = ((heading + (piece.kind === 'left' ? 1 : 3)) % 4) as Heading;
    const [nx, nz] = DIRECTION[next];
    x += dx * half + nx * half;
    z += dz * half + nz * half;
    heading = next;
  }
  return { placed, end: { x, z, y, heading } };
}

/** A box in a piece's own frame (built heading east, entry at the origin), placed. */
function placeBox(
  p: PlacedPiece,
  [x0, x1]: readonly [number, number],
  [z0, z1]: readonly [number, number],
): Footprint {
  const [dx, dz] = DIRECTION[p.heading];
  // Local +x is the heading; local +z is to the right of it.
  const rx = -dz;
  const rz = dx;
  const corners = [
    [x0, z0],
    [x1, z0],
    [x0, z1],
    [x1, z1],
  ].map(([a, b]) => [p.x + dx * a + rx * b, p.z + dz * a + rz * b] as const);
  return {
    minX: Math.min(...corners.map(([cx]) => cx)),
    maxX: Math.max(...corners.map(([cx]) => cx)),
    minZ: Math.min(...corners.map(([, cz]) => cz)),
    maxZ: Math.max(...corners.map(([, cz]) => cz)),
  };
}

/**
 * The walls of a laid-out corridor as footprints: each straight's two
 * side walls; each turn's two outer walls, round its outer corner. The
 * ends are left open, to be joined or closed.
 */
export function corridorFootprints(
  placed: readonly PlacedPiece[],
): Footprint[] {
  const half = CORRIDOR_WIDTH / 2;
  const w = CORRIDOR_WALL;
  const out: Footprint[] = [];
  for (const p of placed) {
    if (p.piece.kind === 'straight' || p.piece.kind === 'stairs') {
      const L = pieceLength(p.piece);
      out.push(placeBox(p, [0, L], [-half - w, -half]));
      out.push(placeBox(p, [0, L], [half, half + w]));
      continue;
    }
    // The outer side is the one the turn goes away from: right of the
    // heading for a left turn.
    const side = p.piece.kind === 'left' ? 1 : -1;
    const outer: readonly [number, number] =
      side > 0 ? [half, half + w] : [-half - w, -half];
    out.push(placeBox(p, [0, CORRIDOR_WIDTH + w], outer));
    out.push(
      placeBox(p, [CORRIDOR_WIDTH, CORRIDOR_WIDTH + w], [-half - w, half + w]),
    );
  }
  return out;
}

/** The piece whose floor (x, z) is on, if any. */
function pieceAt(placed: readonly PlacedPiece[], x: number, z: number) {
  const half = CORRIDOR_WIDTH / 2;
  return placed.find((p) => {
    const f = placeBox(p, [0, pieceLength(p.piece)], [-half, half]);
    return x >= f.minX && x <= f.maxX && z >= f.minZ && z <= f.maxZ;
  });
}

/** Whether (x, z) is inside the corridor's floor (for walking checks). */
export const insideCorridor = (
  placed: readonly PlacedPiece[],
  x: number,
  z: number,
) => Boolean(pieceAt(placed, x, z));

/**
 * The floor's level at (x, z): a piece's own, or on stairs the tread
 * there, each riser at the start of its going from the flight's foot;
 * null off the corridor.
 */
export function corridorFloorAt(
  placed: readonly PlacedPiece[],
  x: number,
  z: number,
): number | null {
  const p = pieceAt(placed, x, z);
  if (!p) return null;
  if (p.piece.kind !== 'stairs') return p.y;
  const [dx, dz] = DIRECTION[p.heading];
  const along = (x - p.x) * dx + (z - p.z) * dz;
  const { steps, riser, length } = flight(p.piece.rise);
  const up = p.piece.rise > 0;
  // Distance from the flight's foot, and the treads climbed there.
  const fromFoot = up ? along : length - along;
  const climbed = Math.min(steps, Math.floor(fromFoot / STAIR.going) + 1);
  const foot = up ? p.y : p.y + p.piece.rise;
  return foot + climbed * riser;
}

/**
 * How far along a laid-out corridor (x, z) is, from its start, metres:
 * the lengths of the pieces before the one it is on, and how far into
 * that one along its heading; null off the corridor.
 */
export function alongCorridor(
  placed: readonly PlacedPiece[],
  x: number,
  z: number,
): number | null {
  const p = pieceAt(placed, x, z);
  if (!p) return null;
  let before = 0;
  for (const q of placed) {
    if (q === p) break;
    before += pieceLength(q.piece);
  }
  const [dx, dz] = DIRECTION[p.heading];
  const into = (x - p.x) * dx + (z - p.z) * dz;
  return before + Math.min(pieceLength(p.piece), Math.max(0, into));
}
