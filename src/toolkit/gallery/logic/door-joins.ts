import type { Footprint } from '../../controls/logic/walk-collision';
import type { RoomId } from './dev-room-links';

/**
 * The doors between rooms that are drawn apart (each by its own renderer)
 * but seen through one another: a room's door to another, and that room's
 * door back, are one doorway. Each room registers its side of each joint
 * (`registerJoint`); the app (`src/main.ts`) asks which door is open, draws
 * the room beyond underneath with its eye carried through the doorway
 * (`throughDoor`), and tells each side what to show. Pure: scene units.
 */

/**
 * Where a door stands in its room: its middle on the floor, in the wall's
 * face, and its turn about y (as Three turns an object), its +z facing
 * into its room.
 */
export interface DoorFrame {
  x: number;
  z: number;
  yaw: number;
  /** Its floor, if not 0: the doors of a doorway may stand at different heights. */
  y?: number;
}

/** One room's side of a doorway to another. */
export interface Joint {
  frame: DoorFrame;
  /** Whether its door is open at all. */
  open(): boolean;
  /** Its door's angle, and standing it at one (handed over). */
  angle(): number;
  swingTo(angle: number): void;
  /** The doorway cut through its walls while the other room is seen through it. */
  opening(): Footprint;
  /** Show the room beyond through it (true), or its own dark lobby. */
  see(on: boolean): void;
  /** This room is drawn under the other, seen through this door: hide its leaf. */
  peek(on: boolean): void;
  /**
   * A pool-loop neighbour, prepared by the loop's own policy rather than
   * competing to be the nearest closed door (`pool-loop.ts`).
   */
  lazy?: boolean;
  /**
   * A plant-room door, prioritized for the doorway view while open.
   * Its room can be prepared while this is the nearest closed door.
   */
  onOpen?: boolean;
}

const joints = new Map<string, Joint>();
const key = (room: RoomId, to: RoomId) => `${room}>${to}`;

/** Register `room`'s door to `to`; returns a function that withdraws it. */
export function registerJoint(room: RoomId, to: RoomId, joint: Joint) {
  joints.set(key(room, to), joint);
  return () => {
    if (joints.get(key(room, to)) === joint) joints.delete(key(room, to));
  };
}

export function jointOf(room: RoomId, to: RoomId) {
  return joints.get(key(room, to)) ?? null;
}

/** The rooms beyond `room`'s lazy joints: its neighbours in the pool loop. */
export function lazyNeighbours(room: RoomId): RoomId[] {
  const out: RoomId[] = [];
  for (const [k, joint] of joints) {
    const [from, to] = k.split('>') as [RoomId, RoomId];
    if (from === room && joint.lazy) out.push(to);
  }
  return out;
}

/** The room whose door from `room` is open, if any: a plant room door first. */
export function openJoint(room: RoomId): RoomId | null {
  let any: RoomId | null = null;
  for (const [k, joint] of joints) {
    const [from, to] = k.split('>') as [RoomId, RoomId];
    if (from !== room || !joint.open()) continue;
    if (joint.onOpen) return to;
    any ??= to;
  }
  return any;
}

/** The room beyond `room`'s open plant room door, if one is open. */
export function openDoorJoint(room: RoomId): RoomId | null {
  for (const [k, joint] of joints) {
    const [from, to] = k.split('>') as [RoomId, RoomId];
    if (from === room && joint.onOpen && joint.open()) return to;
  }
  return null;
}

/** The room whose door from `room` is nearest (x, z), in `room`'s units, if it has any. */
export function nearestJoint(
  room: RoomId,
  x: number,
  z: number,
): RoomId | null {
  let best: RoomId | null = null;
  let distance = Infinity;
  for (const [k, joint] of joints) {
    const [from, to] = k.split('>') as [RoomId, RoomId];
    if (from !== room || joint.lazy) continue;
    const d = Math.hypot(joint.frame.x - x, joint.frame.z - z);
    if (d < distance) {
      distance = d;
      best = to;
    }
  }
  return best;
}

const turn = (yaw: number, x: number, z: number) => {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: x * c + z * s, z: -x * s + z * c };
};

/**
 * A point and heading carried through a doorway, from the room whose door
 * stands at `from` to the room whose door stands at `to`: the two doors
 * face each other, so what is in front of one is behind the other. `yaw`
 * as the controls have it (forward is (sin yaw, −cos yaw)); pitch is
 * unchanged, and height (`y`, if given) rises or falls by the difference
 * between the two doors' floors.
 */
export function throughDoor(
  from: DoorFrame,
  to: DoorFrame,
  pose: { x: number; z: number; yaw: number; y?: number },
) {
  const local = turn(-from.yaw, pose.x - from.x, pose.z - from.z);
  const at = turn(to.yaw, -local.x, -local.z);
  const ahead = turn(-from.yaw, Math.sin(pose.yaw), -Math.cos(pose.yaw));
  const way = turn(to.yaw, -ahead.x, -ahead.z);
  return {
    x: to.x + at.x,
    z: to.z + at.z,
    yaw: Math.atan2(way.x, -way.z),
    ...(pose.y === undefined
      ? {}
      : { y: pose.y + (to.y ?? 0) - (from.y ?? 0) }),
  };
}

/**
 * How far in front of its door a point is, into the door's room (scene
 * units): negative once through the doorway's plane.
 */
export function inFront(frame: DoorFrame, x: number, z: number) {
  return turn(-frame.yaw, x - frame.x, z - frame.z).z;
}

/**
 * Two rooms joined by more than one doorway (the main corridor and the
 * wet hall, by two): each registers one joint to the other, whose frame
 * and door are those of the doorway in use, the one opened, numbered
 * alike on both sides.
 */
const doorways = new Map<string, number>();
const pair = (a: RoomId, b: RoomId) => [a, b].sort().join('|');

/** The doorway in use between `a` and `b`: 0 until one is opened. */
export const activeDoorway = (a: RoomId, b: RoomId) =>
  doorways.get(pair(a, b)) ?? 0;

/**
 * Of a set of doorways between two rooms, numbered alike on both sides,
 * which to use given which stand open: the one in use while it is open,
 * else the first open, else the one in use. Pure.
 */
export function pickDoorway(active: number, open: readonly boolean[]) {
  if (open[active]) return active;
  const first = open.indexOf(true);
  return first >= 0 ? first : active;
}

/** Use doorway `i` between `a` and `b`. */
export const useDoorway = (a: RoomId, b: RoomId, i: number) => {
  doorways.set(pair(a, b), i);
};
