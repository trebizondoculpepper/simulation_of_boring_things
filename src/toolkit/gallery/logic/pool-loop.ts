import {
  alongCorridor,
  CORRIDOR_WIDTH,
  layoutCorridor,
  pieceLength,
} from '../../components/architectural/logic/corridor-path';
import type {
  CorridorPiece,
  Heading,
  PlacedPiece,
} from '../../components/architectural/logic/corridor-path';
import { galleryPlan, POOL_HALLS } from './pool-halls';
import type { PoolHallId } from './pool-halls';

/**
 * The pool loop: the version-one pool halls joined one after another by
 * short corridors of the kit's pieces, round and round for ever. The
 * world makes no three-dimensional sense and does not try to (`AGENTS.md`):
 * each room is a block whose corridors are its own; walking along one
 * hands the walker on to the next room's scene, where the same corridor
 * carries on into it. Each corridor is a short straight, a turn or a
 * flight of stairs, and a short straight (`legPieces`).
 *
 * Each corridor leaves a room by a door in its north wall and enters the
 * next by a door in its south, so a walker keeps going forward and, coming
 * in, can usually see the way out across the room. The Olympic pool is
 * passed through twice: over its deck, and under the water along its
 * viewing gallery, entered at its west end and left at its east. Pure.
 */

/** Where a leg's corridor joins a room: a doorway, or the gallery's ends. */
export type LoopRoom = PoolHallId | 'pool_02_gallery';

export interface LoopLeg {
  from: LoopRoom;
  to: LoopRoom;
  pieces: readonly CorridorPiece[];
}

/** A small seeded random number source (mulberry32), for the corridors. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The kit's straights: the long corridor, and the short one at each door. */
export const LONG: CorridorPiece = { kind: 'straight', length: 4 };
export const SHORT: CorridorPiece = { kind: 'straight', length: 1 };

/** What the middle of a corridor may be. */
const MIDDLES: readonly CorridorPiece[] = [
  { kind: 'left' },
  { kind: 'right' },
  { kind: 'stairs', rise: 2 },
  { kind: 'stairs', rise: -2 },
];

/**
 * A corridor between two rooms: a short straight out of the door, one
 * piece chosen at random (a left or right turn, or stairs up or down),
 * and a short straight into the next door, so a corridor always meets a
 * room square on. The same for the same seed, so the world stays put.
 */
export function legPieces(seed: number): CorridorPiece[] {
  const next = random(seed);
  return [SHORT, MIDDLES[Math.floor(next() * MIDDLES.length)], SHORT];
}

const ORDER: readonly LoopRoom[] = [
  'pool_01',
  'pool_02',
  'pool_03',
  'pool_04',
  'pool_02_gallery',
];

/** The loop's legs, in order, the last back to the first. */
export const LOOP_LEGS: readonly LoopLeg[] = ORDER.map((from, i) => ({
  from,
  to: ORDER[(i + 1) % ORDER.length],
  // The lounge-to-Olympic link descends; the jacuzzi-to-footbath link has
  // a longer departure before its bend or flight.
  pieces:
    i === 0
      ? [
          SHORT,
          { kind: 'stairs', rise: -2 },
          { kind: 'left' },
          SHORT,
          { kind: 'right' },
          SHORT,
        ]
      : i === 1
        ? // The Olympic pool to the jacuzzi: long, down the stairs, long.
          [LONG, { kind: 'stairs', rise: -2 }, LONG]
        : i === 2
          ? // The jacuzzi to the footbath: short, the rotunda, short.
            [SHORT, { kind: 'rotunda' }, SHORT]
          : i === 3
            ? // The footbath to the gallery: short, left, short, right, short.
              [SHORT, { kind: 'left' }, SHORT, { kind: 'right' }, SHORT]
            : i === 4
              ? [
                  SHORT,
                  { kind: 'left' },
                  { kind: 'right' },
                  { kind: 'stairs', rise: 2 },
                  SHORT,
                ]
              : legPieces(2004 + i * 31),
}));

/** Where a room is joined: the doorway's middle, its floor, and facing out. */
interface Joint {
  x: number;
  z: number;
  y: number;
  /** The heading of a walker leaving the room through it. */
  out: Heading;
}

/** A room's way out (to the next leg) and its way in (from the last). */
export function joints(room: LoopRoom): { exit: Joint; entry: Joint } {
  if (room === 'pool_02_gallery') {
    const g = galleryPlan(POOL_HALLS.pool_02)!;
    return {
      // Left at its east end, heading on east; entered at its west end.
      exit: { x: g.x1, z: g.z, y: g.floor, out: 0 },
      entry: { x: g.x0, z: g.z, y: g.floor, out: 2 },
    };
  }
  const s = POOL_HALLS[room];
  const x = s.doorX ?? 0;
  return {
    exit: { x, z: -s.d / 2, y: 0, out: 1 },
    entry: { x, z: s.d / 2, y: 0, out: 3 },
  };
}

const turn = (h: number) => ((h % 4) + 4) % 4;
/** Turn (x, z) about the origin by `steps` quarter turns to the left. */
function rotate([x, z]: readonly [number, number], steps: number) {
  let p: [number, number] = [x, z];
  for (let i = 0; i < turn(steps); i++) p = [p[1], -p[0]];
  return p;
}

/** A corridor's copy in one room's scene: its pieces laid out, and their start. */
export interface CorridorCopy {
  leg: number;
  placed: PlacedPiece[];
  start: { x: number; z: number; y: number; heading: Heading };
  length: number;
}

const legLength = (leg: LoopLeg) =>
  leg.pieces.reduce((sum, p) => sum + pieceLength(p), 0);

/**
 * The corridors in a room's scene: the one leaving it, laid from its way
 * out; and the one coming in, laid so that it ends at its way in, heading
 * into the room, wherever and however it began.
 */
export function roomCorridors(room: LoopRoom): {
  leaving: CorridorCopy;
  arriving: CorridorCopy;
} {
  const { exit, entry } = joints(room);
  const out = LOOP_LEGS.findIndex((l) => l.from === room);
  const into = LOOP_LEGS.findIndex((l) => l.to === room);
  const leavingStart = { x: exit.x, z: exit.z, y: exit.y, heading: exit.out };
  const leaving: CorridorCopy = {
    leg: out,
    placed: layoutCorridor(LOOP_LEGS[out].pieces, leavingStart).placed,
    start: leavingStart,
    length: legLength(LOOP_LEGS[out]),
  };
  // Laid from the origin heading east, then turned and moved to end at
  // the way in, heading into the room (opposite its way out).
  const leg = LOOP_LEGS[into];
  const { end } = layoutCorridor(leg.pieces, { x: 0, z: 0, heading: 0 });
  const inward = turn(entry.out + 2) as Heading;
  const steps = inward - end.heading;
  const [ex, ez] = rotate([end.x, end.z], steps);
  const start = {
    x: entry.x - ex,
    z: entry.z - ez,
    y: entry.y - end.y,
    heading: turn(steps) as Heading,
  };
  return {
    leaving,
    arriving: {
      leg: into,
      placed: layoutCorridor(leg.pieces, start).placed,
      start,
      length: legLength(leg),
    },
  };
}

/** A pose carried from one copy of a corridor to another. */
export interface Pose {
  x: number;
  z: number;
  /** The floor's level, and the yaw (forward is (sin yaw, −cos yaw)). */
  y: number;
  yaw: number;
}

/** Carry `pose` from corridor copy `a` to copy `b` of the same corridor. */
export function carry(pose: Pose, a: CorridorCopy, b: CorridorCopy): Pose {
  const steps = b.start.heading - a.start.heading;
  const [x, z] = rotate([pose.x - a.start.x, pose.z - a.start.z], steps);
  return {
    x: b.start.x + x,
    z: b.start.z + z,
    y: pose.y - a.start.y + b.start.y,
    // A quarter turn to the left takes yaw a quarter down.
    yaw: pose.yaw - (turn(steps) * Math.PI) / 2,
  };
}

/**
 * Loading as the walker goes round (agreed with the owner, then revised
 * so no doorway ever shows an unbuilt room): while in a room, both rooms
 * either side of it in the loop are built, unseen. The one drawn, beyond
 * the far end of its corridor, is the one on the walker's side of the
 * room: the next room in its exit half, the last in its entry half, with
 * a band across the middle where whichever is drawn stays drawn. In a
 * corridor, the room at its far end is drawn. In a corridor's far short
 * straight, once that room is drawn, the walker is handed over to it.
 * Rooms are let go once they are no longer either side of the room the
 * walker is in (`src/main.ts`).
 */
export const LOADING = {
  /** Half the band across a room's middle where neither side takes over, metres. */
  band: 1,
} as const;

/** Whether each of a room's corridors has the room beyond it drawn. */
export interface LoopState {
  leaving: boolean;
  arriving: boolean;
}

/**
 * How far toward its way out (+) or its way in (−) a point in a room is,
 * from the room's middle along the line between them, metres.
 */
export function towardExit(room: LoopRoom, x: number, z: number) {
  const { exit, entry } = joints(room);
  const ux = exit.x - entry.x;
  const uz = exit.z - entry.z;
  const length = Math.hypot(ux, uz) || 1;
  const mx = (exit.x + entry.x) / 2;
  const mz = (exit.z + entry.z) / 2;
  return ((x - mx) * ux + (z - mz) * uz) / length;
}

/**
 * The next state of a room's two corridors with the walker at (x, z),
 * and whether to hand over to the room beyond one of them: only once
 * that room is drawn (`seen`), and the walker is in its far short
 * straight. One side is drawn at a time.
 */
export function loopStep(
  room: LoopRoom,
  x: number,
  z: number,
  state: LoopState,
  seen: { leaving: boolean; arriving: boolean },
): { state: LoopState; handTo: LoopRoom | null } {
  const { leaving, arriving } = roomCorridors(room);
  // The straights at the far ends: the leaving corridor's last piece, and
  // the arriving corridor's first (at the last room's door).
  const outPieces = LOOP_LEGS[leaving.leg].pieces;
  const farOut = pieceLength(outPieces[outPieces.length - 1]);
  const farBack = pieceLength(LOOP_LEGS[arriving.leg].pieces[0]);
  const out = alongCorridor(leaving.placed, x, z);
  const back = alongCorridor(arriving.placed, x, z);
  let nextState: LoopState;
  if (out !== null) nextState = { leaving: true, arriving: false };
  else if (back !== null) nextState = { leaving: false, arriving: true };
  else {
    const t = towardExit(room, x, z);
    nextState =
      t > LOADING.band
        ? { leaving: true, arriving: false }
        : t < -LOADING.band
          ? { leaving: false, arriving: true }
          : // In the middle band: as it was, or the way out if neither.
            state.leaving || state.arriving
            ? state
            : { leaving: true, arriving: false };
  }
  let handTo: LoopRoom | null = null;
  const fromDoor = back === null ? null : arriving.length - back;
  if (out !== null && out > leaving.length - farOut && seen.leaving)
    handTo = LOOP_LEGS[leaving.leg].to;
  else if (
    fromDoor !== null &&
    fromDoor > arriving.length - farBack &&
    seen.arriving
  )
    handTo = LOOP_LEGS[arriving.leg].from;
  return { state: nextState, handTo };
}

/** How far along a corridor copy (from its start) a point is, if on its first piece. */
export function intoCorridor(copy: CorridorCopy, x: number, z: number) {
  const h = copy.start.heading;
  const dir = [
    [1, 0],
    [0, -1],
    [-1, 0],
    [0, 1],
  ][h];
  const along = (x - copy.start.x) * dir[0] + (z - copy.start.z) * dir[1];
  const across = Math.abs(
    (x - copy.start.x) * -dir[1] + (z - copy.start.z) * dir[0],
  );
  return across < CORRIDOR_WIDTH / 2 + 0.05 ? along : null;
}

/**
 * When to hand the walker on: a step into the corridor leaving, onward to
 * the next room; a step back out of the corridor arriving (past where it
 * began, which is the last room's door), back to the last room.
 */
// Short of a turn's middle (0.6 m in), so a corridor that turns at once
// still hands over; the gap between the two keeps it from flickering.
export const HAND_OVER = { onward: 0.45, back: 0.2 } as const;

/**
 * A cap across each corridor's far end, as a footprint: the leaving
 * corridor's last end and the arriving corridor's first, where the walker
 * stops until the room beyond is drawn (and is handed over before them).
 */
export function corridorEnds(leaving: CorridorCopy, arriving: CorridorCopy) {
  const half = CORRIDOR_WIDTH / 2 + 0.2;
  const dir = [
    [1, 0],
    [0, -1],
    [-1, 0],
    [0, 1],
  ] as const;
  const leg = LOOP_LEGS[leaving.leg];
  const { end } = layoutCorridor(leg.pieces, leaving.start);
  const cap = (x: number, z: number, heading: number, outward: number) => {
    const [dx, dz] = dir[heading];
    const cx = x + dx * outward * 0.1;
    const cz = z + dz * outward * 0.1;
    return {
      minX: cx - (dx ? 0.1 : half),
      maxX: cx + (dx ? 0.1 : half),
      minZ: cz - (dz ? 0.1 : half),
      maxZ: cz + (dz ? 0.1 : half),
    };
  };
  return [
    cap(end.x, end.z, end.heading, 1),
    cap(arriving.start.x, arriving.start.z, arriving.start.heading, -1),
  ];
}
