import type { Footprint } from '../toolkit/controls/logic/walk-collision';

/**
 * dev_corridor's plan: a corridor that loops round a square, 50 m a side
 * on its centre line and 3 m wide, so that walking 50 m, turning, four
 * times over brings you back to where you started (200 m of corridor). It
 * is the hub of the dev rooms: spring doors on its outer walls lead to
 * them, and one in the middle of each side's inner wall to the courtyard
 * inside the loop. Metres, y up; the
 * square's middle is the origin, north is −z.
 *
 * The square's corners hide each side from the next, so the corridor is
 * divided into zones (each side's two ends and its middle, and the four
 * corners) and only those that can be seen from where the player stands
 * are drawn (`visibleZones`).
 */

/** Half the square's side, on the corridor's centre line. */
export const LOOP_HALF = 25;
/** The corridor's width, and so its walls' half-widths from the centre line. */
export const LOOP_WIDTH = 3;
export const LOOP_OUTER = LOOP_HALF + LOOP_WIDTH / 2;
export const LOOP_INNER = LOOP_HALF - LOOP_WIDTH / 2;
/** The corridor's height to its ceiling. */
export const LOOP_CEILING = 3;
/** How far along a side, from its corner, its end zone reaches. */
export const LOOP_END = 6;

export type LoopSide = 'north' | 'east' | 'south' | 'west';
export type LoopCorner = 'nw' | 'ne' | 'se' | 'sw';
export type LoopZone = LoopCorner | `${LoopSide}.${'a' | 'b' | 'middle'}`;

/**
 * Each side: the axis it runs along, where its centre line is, its letter
 * on the signs, and its corners at its low (a) and high (b) end.
 */
export const LOOP_SIDES: Record<
  LoopSide,
  {
    along: 'x' | 'z';
    at: number;
    letter: string;
    a: LoopCorner;
    b: LoopCorner;
  }
> = {
  north: { along: 'x', at: -LOOP_HALF, letter: 'A', a: 'nw', b: 'ne' },
  east: { along: 'z', at: LOOP_HALF, letter: 'B', a: 'ne', b: 'se' },
  south: { along: 'x', at: LOOP_HALF, letter: 'C', a: 'sw', b: 'se' },
  west: { along: 'z', at: -LOOP_HALF, letter: 'D', a: 'nw', b: 'sw' },
};
export const LOOP_SIDE_IDS = Object.keys(LOOP_SIDES) as LoopSide[];
export const LOOP_CORNERS: Record<LoopCorner, { x: number; z: number }> = {
  nw: { x: -LOOP_HALF, z: -LOOP_HALF },
  ne: { x: LOOP_HALF, z: -LOOP_HALF },
  se: { x: LOOP_HALF, z: LOOP_HALF },
  sw: { x: -LOOP_HALF, z: LOOP_HALF },
};

/** A point on a side's centre line, `t` metres along it from the middle. */
export function onSide(side: LoopSide, t: number) {
  const s = LOOP_SIDES[side];
  return s.along === 'x' ? { x: t, z: s.at } : { x: s.at, z: t };
}

/** Whether (x, z) is on the corridor's floor. */
export function onLoop(x: number, z: number) {
  const r = Math.max(Math.abs(x), Math.abs(z));
  return r <= LOOP_OUTER && r >= LOOP_INNER;
}

/** The zone (x, z) is in, or null off the corridor. */
export function zoneAt(x: number, z: number): LoopZone | null {
  if (!onLoop(x, z)) return null;
  const inX = Math.abs(x) > LOOP_INNER;
  const inZ = Math.abs(z) > LOOP_INNER;
  if (inX && inZ)
    return `${z < 0 ? 'n' : 's'}${x < 0 ? 'w' : 'e'}` as LoopCorner;
  const side: LoopSide = inZ
    ? z < 0
      ? 'north'
      : 'south'
    : x < 0
      ? 'west'
      : 'east';
  const t = LOOP_SIDES[side].along === 'x' ? x : z;
  const end = LOOP_INNER - LOOP_END;
  return `${side}.${t < -end ? 'a' : t > end ? 'b' : 'middle'}`;
}

/** The side end that meets a corner. */
function endAt(side: LoopSide, corner: LoopCorner): LoopZone {
  return `${side}.${LOOP_SIDES[side].a === corner ? 'a' : 'b'}`;
}

/** What can be seen from anywhere on a side: it, its corners, a stub beyond. */
function fromSide(side: LoopSide) {
  const s = LOOP_SIDES[side];
  const seen = new Set<LoopZone>([
    `${side}.a`,
    `${side}.middle`,
    `${side}.b`,
    s.a,
    s.b,
  ]);
  for (const corner of [s.a, s.b])
    for (const other of LOOP_SIDE_IDS)
      if (
        other !== side &&
        [LOOP_SIDES[other].a, LOOP_SIDES[other].b].includes(corner)
      )
        seen.add(endAt(other, corner));
  return seen;
}

/**
 * The zones that can be seen from (x, z): from a side, the whole side,
 * its two corners and the end of each side round them (seen obliquely);
 * from a corner, both its sides and what can be seen from them. The side
 * opposite is never seen. Off the corridor (in a doorway), the nearest.
 */
export function visibleZones(x: number, z: number): Set<LoopZone> {
  const zone =
    zoneAt(x, z) ??
    zoneAt(
      Math.max(-LOOP_OUTER, Math.min(LOOP_OUTER, x)),
      Math.max(-LOOP_OUTER, Math.min(LOOP_OUTER, z)),
    ) ??
    'north.middle';
  if (zone.includes('.')) return fromSide(zone.split('.')[0] as LoopSide);
  const seen = new Set<LoopZone>();
  for (const side of LOOP_SIDE_IDS) {
    const s = LOOP_SIDES[side];
    if (s.a === zone || s.b === zone)
      for (const each of fromSide(side)) seen.add(each);
  }
  return seen;
}

/** Every zone, for building and drawing them one by one. */
export const LOOP_ZONES: readonly LoopZone[] = [
  ...(Object.keys(LOOP_CORNERS) as LoopCorner[]),
  ...LOOP_SIDE_IDS.flatMap((side) =>
    (['a', 'middle', 'b'] as const).map((part) => `${side}.${part}` as const),
  ),
];

/** Where along a side the outer walls' doors are: about one every 7 m. */
export const DOOR_SPACING = 7;
export const LOOP_DOOR_STATIONS = [-21, -14, -7, 0, 7, 14, 21];
/**
 * The courtyard, the room inside the loop, is reached from whichever side
 * the player is on: a door in the middle of each side's inner wall.
 */
export const COURTYARD_DOOR_AT = 0;

export interface LoopDoor {
  side: LoopSide;
  /** How far along the side, from its middle. */
  t: number;
  /** On the outer wall (to a dev room) or the inner (to the courtyard). */
  wall: 'outer' | 'inner';
}

/** Every door: seven on each side's outer wall, one a side to the courtyard. */
export const LOOP_DOORS: readonly LoopDoor[] = [
  ...LOOP_SIDE_IDS.flatMap((side) =>
    LOOP_DOOR_STATIONS.map((t) => ({ side, t, wall: 'outer' as const })),
  ),
  ...LOOP_SIDE_IDS.map((side) => ({
    side,
    t: COURTYARD_DOOR_AT,
    wall: 'inner' as const,
  })),
];

/**
 * Fire points, so that nobody is ever more than 30 m from an extinguisher
 * (BS 5306-8): two on each side's outer wall, between its doors.
 */
export const LOOP_FIRE_POINTS = LOOP_SIDE_IDS.flatMap((side) =>
  [-17.5, 17.5].map((t) => ({ side, t })),
);

/** Each side's landmark, so nobody gets lost: on its inner wall, mid-side. */
export const LOOP_LANDMARKS: Record<
  LoopSide,
  'mop' | 'scrubber' | 'trolley' | 'alcove'
> = { north: 'mop', east: 'scrubber', south: 'trolley', west: 'alcove' };
/** Where along its side each landmark stands (clear of the inner door). */
export const LANDMARK_AT = 8;

/** The fluorescent fittings down the middle of each side, every 5 m. */
export const LOOP_FITTINGS = LOOP_SIDE_IDS.flatMap((side) =>
  [-22.5, -17.5, -12.5, -7.5, -2.5, 2.5, 7.5, 12.5, 17.5, 22.5].map((t) => ({
    side,
    t,
    ...onSide(side, t),
  })),
);

/** The corridor's walls, for walking: the outer square's and the inner block. */
export const LOOP_OUTER_BOUNDS: Footprint = {
  minX: -LOOP_OUTER,
  maxX: LOOP_OUTER,
  minZ: -LOOP_OUTER,
  maxZ: LOOP_OUTER,
};
export const LOOP_INNER_BLOCK: Footprint = {
  minX: -LOOP_INNER,
  maxX: LOOP_INNER,
  minZ: -LOOP_INNER,
  maxZ: LOOP_INNER,
};

/**
 * A door's doorway on the corridor's side: the middle of its wall's face,
 * and the way out of the corridor through it (a unit vector on the floor).
 */
export function doorway(door: LoopDoor) {
  const s = LOOP_SIDES[door.side];
  const out = Math.sign(s.at) * (door.wall === 'outer' ? 1 : -1);
  const face =
    door.wall === 'outer'
      ? s.at + Math.sign(s.at) * (LOOP_OUTER - LOOP_HALF)
      : s.at - Math.sign(s.at) * (LOOP_HALF - LOOP_INNER);
  return s.along === 'x'
    ? { x: door.t, z: face, out: { x: 0, z: out } }
    : { x: face, z: door.t, out: { x: out, z: 0 } };
}

/** How near the doorway's face, and within how much of its middle, one goes through. */
const THROUGH = { face: 0.6, half: 0.5 };

/** Whether someone at (x, z) has walked into an open door's doorway. */
export function walkedThrough(door: LoopDoor, x: number, z: number) {
  const d = doorway(door);
  const across = d.out.x !== 0;
  const along = across ? Math.abs(z - d.z) : Math.abs(x - d.x);
  const toFace = across ? (d.x - x) * d.out.x : (d.z - z) * d.out.z;
  return along <= THROUGH.half && toFace >= -0.05 && toFace <= THROUGH.face;
}

/**
 * Where to stand, having come back through a door: 1.3 m into the
 * corridor in front of it, facing away from it (forward is (sin yaw,
 * −cos yaw), as the controls have it).
 */
export function arrivalAt(door: LoopDoor) {
  const d = doorway(door);
  const fx = -d.out.x;
  const fz = -d.out.z;
  return {
    x: d.x + fx * 1.3,
    z: d.z + fz * 1.3,
    yaw: Math.atan2(fx, -fz),
    pitch: 0,
  };
}
