import {
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
 * carries on into it.
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

const CHOICES: readonly CorridorPiece[] = [
  { kind: 'straight', length: 4 },
  { kind: 'left' },
  { kind: 'right' },
  { kind: 'stairs', rise: 2 },
  { kind: 'stairs', rise: -2 },
];

/**
 * Two pieces chosen at random, but never two straights; the same for the
 * same seed, so the world stays put.
 */
export function legPieces(seed: number): CorridorPiece[] {
  const next = random(seed);
  const pick = () => CHOICES[Math.floor(next() * CHOICES.length)];
  for (;;) {
    const a = pick();
    const b = pick();
    if (a.kind !== 'straight' || b.kind !== 'straight') return [a, b];
  }
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
  pieces: legPieces(1997 + i * 31),
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
