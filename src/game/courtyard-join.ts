import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import {
  LOOP_INNER,
  LOOP_SIDES,
  LOOP_SIDE_IDS,
  doorway,
} from './dev-corridor-plan';
import type { LoopSide } from './dev-corridor-plan';

/**
 * How the courtyard (dev_courtyard) is joined to the corridor (dev_corridor)
 * so that one can walk from one to the other. They do not fit: the
 * courtyard is an 18 m square, the space inside the loop 47 m. So the
 * courtyard is put, in the corridor's frame, behind whichever of the four
 * inner doors is in use, its own door on that side lying in the corridor
 * door's doorway (`anchor`), and moved behind another when another is
 * used, which only happens while it cannot be seen. Its own door on that
 * side is then not shown: the corridor's door is the door between them.
 * Pure: metres, y up, north −z; yaw as the scene's rotation about y.
 */

/** Half the courtyard's width: an 18 m square light well. */
export const COURTYARD_HALF = 9;
/** How thick its walls are. */
export const COURTYARD_WALL = 0.3;
/**
 * Which wall leads back to which side of the corridor: the north wall's
 * door to Corridor A (the north side), and so on, round.
 */
export const COURTYARD_WALLS: readonly LoopSide[] = [
  'north',
  'east',
  'south',
  'west',
];
/** Each wall's door's middle, in the courtyard's frame, and the way in. */
export const COURTYARD_DOORS = COURTYARD_WALLS.map((side, i) => ({
  side,
  x: [0, COURTYARD_HALF, 0, -COURTYARD_HALF][i],
  z: [-COURTYARD_HALF, 0, COURTYARD_HALF, 0][i],
  inward: [
    { x: 0, z: 1 },
    { x: -1, z: 0 },
    { x: 0, z: -1 },
    { x: 1, z: 0 },
  ][i],
}));
/** Half a doorway's width, for walking through it. */
export const DOORWAY_HALF = 0.5;
/**
 * How far the courtyard's face stands back from the corridor's inner
 * wall: its own wall's thickness and a centimetre, so its back is hidden
 * just behind the corridor's wall.
 */
export const JOIN_DEPTH = COURTYARD_WALL + 0.01;

/** Where the courtyard stands: turned by `yaw`, its middle at (x, z). */
export interface Anchor {
  side: LoopSide;
  yaw: number;
  x: number;
  z: number;
}

const angle = (v: { x: number; z: number }) => Math.atan2(v.x, v.z);
/** (x, z) turned by `yaw` about y, as Three turns an object. */
export function turn(yaw: number, x: number, z: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: x * c + z * s, z: -x * s + z * c };
}

/** The courtyard behind the corridor's inner door on `side`. */
export function anchor(side: LoopSide): Anchor {
  const d = doorway({ side, t: 0, wall: 'inner' });
  const door = COURTYARD_DOORS.find((w) => w.side === side)!;
  const yaw = angle(d.out) - angle(door.inward);
  const at = turn(yaw, door.x, door.z);
  return {
    side,
    yaw,
    x: d.x + d.out.x * JOIN_DEPTH - at.x,
    z: d.z + d.out.z * JOIN_DEPTH - at.z,
  };
}

/** A point in the courtyard's frame, in the corridor's. */
export function toWorld(a: Anchor, x: number, z: number) {
  const p = turn(a.yaw, x, z);
  return { x: p.x + a.x, z: p.z + a.z };
}

/** A point in the corridor's frame, in the courtyard's. */
export function toLocal(a: Anchor, x: number, z: number) {
  return turn(-a.yaw, x - a.x, z - a.z);
}

/** Whether a point in the corridor's frame is in the courtyard. */
export function inCourtyard(a: Anchor, x: number, z: number) {
  const p = toLocal(a, x, z);
  return Math.max(Math.abs(p.x), Math.abs(p.z)) < COURTYARD_HALF;
}

/**
 * A pose moved with the courtyard from one anchor to another, so that it
 * stays where it was in the courtyard: a yaw as the controls have it
 * (forward is (sin yaw, −cos yaw)), which turns the other way.
 */
export function carry(
  from: Anchor,
  to: Anchor,
  pose: { x: number; z: number; yaw: number },
) {
  const local = toLocal(from, pose.x, pose.z);
  return {
    ...toWorld(to, local.x, local.z),
    yaw: pose.yaw - (to.yaw - from.yaw),
  };
}

/** A rectangle in the courtyard's frame, in the corridor's. */
function rectToWorld(a: Anchor, r: Footprint): Footprint {
  const corners = [toWorld(a, r.minX, r.minZ), toWorld(a, r.maxX, r.maxZ)];
  return {
    minX: Math.min(corners[0].x, corners[1].x),
    maxX: Math.max(corners[0].x, corners[1].x),
    minZ: Math.min(corners[0].z, corners[1].z),
    maxZ: Math.max(corners[0].z, corners[1].z),
  };
}

/**
 * A wall along x (`along` 'x') or z from `from` to `to`, between `inner`
 * and `outer` across it, with a doorway in its middle left open if `open`.
 */
function wallWithDoor(
  along: 'x' | 'z',
  from: number,
  to: number,
  across: [number, number],
  open: boolean,
): Footprint[] {
  const [a0, a1] = [Math.min(...across), Math.max(...across)];
  const spans: [number, number][] = open
    ? [
        [from, -DOORWAY_HALF],
        [DOORWAY_HALF, to],
      ]
    : [[from, to]];
  return spans.map(([s0, s1]) =>
    along === 'x'
      ? { minX: s0, maxX: s1, minZ: a0, maxZ: a1 }
      : { minX: a0, maxX: a1, minZ: s0, maxZ: s1 },
  );
}

/**
 * What one walks into between the corridor and the courtyard: the
 * corridor's inner walls, as thick as the join, with a doorway through
 * the one whose door is open (`open`, a side, or null); and the
 * courtyard's walls, with a doorway through the one joined to the
 * corridor while its door is open. The corridor's outer walls are the
 * corridor's own.
 */
export function joinedWalls(a: Anchor, open: LoopSide | null): Footprint[] {
  const walls: Footprint[] = [];
  for (const side of LOOP_SIDE_IDS) {
    const s = LOOP_SIDES[side];
    const face = Math.sign(s.at) * LOOP_INNER;
    const back = face - Math.sign(s.at) * JOIN_DEPTH;
    walls.push(
      ...wallWithDoor(
        s.along,
        -LOOP_INNER,
        LOOP_INNER,
        [face, back],
        open === side,
      ),
    );
  }
  const H = COURTYARD_HALF;
  const T = COURTYARD_WALL;
  COURTYARD_DOORS.forEach((door) => {
    const along = door.inward.x === 0 ? 'x' : 'z';
    const face = along === 'x' ? door.z : door.x;
    const back = face - (along === 'x' ? door.inward.z : door.inward.x) * T;
    const pieces = wallWithDoor(
      along,
      -H - T,
      H + T,
      [face, back],
      open === a.side && door.side === a.side,
    );
    walls.push(...pieces.map((r) => rectToWorld(a, r)));
  });
  return walls;
}

/**
 * Whether someone at (x, z) is in the doorway joining the corridor and the
 * courtyard, between the two rooms' faces with a little to spare, so its
 * door is held open while they pass.
 */
export function inJoinedDoorway(a: Anchor, x: number, z: number) {
  const d = doorway({ side: a.side, t: 0, wall: 'inner' });
  const along = d.out.x !== 0 ? Math.abs(z - d.z) : Math.abs(x - d.x);
  const depth = (x - d.x) * d.out.x + (z - d.z) * d.out.z;
  return (
    along <= DOORWAY_HALF + 0.1 && depth >= -0.7 && depth <= JOIN_DEPTH + 0.7
  );
}
