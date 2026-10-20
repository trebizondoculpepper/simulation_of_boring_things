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

/** The room whose door from `room` is open, if any. */
export function openJoint(room: RoomId): RoomId | null {
  for (const [k, joint] of joints) {
    const [from, to] = k.split('>') as [RoomId, RoomId];
    if (from === room && joint.open()) return to;
  }
  return null;
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
 * as the controls have it (forward is (sin yaw, −cos yaw)); height and
 * pitch are unchanged.
 */
export function throughDoor(
  from: DoorFrame,
  to: DoorFrame,
  pose: { x: number; z: number; yaw: number },
) {
  const local = turn(-from.yaw, pose.x - from.x, pose.z - from.z);
  const at = turn(to.yaw, -local.x, -local.z);
  const ahead = turn(-from.yaw, Math.sin(pose.yaw), -Math.cos(pose.yaw));
  const way = turn(to.yaw, -ahead.x, -ahead.z);
  return {
    x: to.x + at.x,
    z: to.z + at.z,
    yaw: Math.atan2(way.x, -way.z),
  };
}

/**
 * How far in front of its door a point is, into the door's room (scene
 * units): negative once through the doorway's plane.
 */
export function inFront(frame: DoorFrame, x: number, z: number) {
  return turn(-frame.yaw, x - frame.x, z - frame.z).z;
}
