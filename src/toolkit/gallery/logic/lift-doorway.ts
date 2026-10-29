import type { Footprint } from '../../controls/logic/walk-collision';
import type { DoorFrame } from './door-joins';

/**
 * A lift doorway (mission 108): a landing's, or the car's, in its room.
 * Its middle on the floor in the room's face of the doorway, and its turn
 * (`yaw`, as Three turns an object), its local +z facing into its room;
 * the doors stand in the reveal behind the face. Pure: metres.
 */
export interface LiftPlace {
  x: number;
  z: number;
  yaw: number;
}

/** The doors' sizes: a goods lift's vertical bi-parting doors (BS EN 81-20's goods sizes). */
export const LIFT_DOOR = {
  /** Clear opening, wide and tall. */
  clear: 1.8,
  height: 2.2,
  /** The steel frame's jambs and head, each side. */
  frame: 0.1,
  /** How deep the doorway's reveal is, behind the face: where the leaves (or the car's gate) run. */
  depth: 0.14,
} as const;

/** The car (inside): wide, deep and clear high (the owner: about 2.0 × 2.8 × 2.4). */
export const LIFT_CAR = { w: 2.0, d: 2.8, h: 2.4 } as const;

/** The walker's half-width given to the light curtain: within this of the doorway, it is held. */
const CURTAIN_REACH = 0.35;

/** A point in a place's frame: `u` along the doorway (right as one faces out of the room), `v` into its room. */
export function liftLocal(place: LiftPlace, x: number, z: number) {
  const dx = x - place.x;
  const dz = z - place.z;
  const c = Math.cos(place.yaw);
  const s = Math.sin(place.yaw);
  return { u: dx * c - dz * s, v: dx * s + dz * c };
}

/** A place's local point in its room. */
export function liftWorld(place: LiftPlace, u: number, v: number) {
  const c = Math.cos(place.yaw);
  const s = Math.sin(place.yaw);
  return { x: place.x + u * c + v * s, z: place.z - u * s + v * c };
}

/** A local box (`u` from `u0` to `u1`, `v` from `v0` to `v1`) as a footprint in the room. */
function box(
  place: LiftPlace,
  u0: number,
  u1: number,
  v0: number,
  v1: number,
): Footprint {
  const corners = [
    liftWorld(place, u0, v0),
    liftWorld(place, u1, v0),
    liftWorld(place, u0, v1),
    liftWorld(place, u1, v1),
  ];
  return {
    minX: Math.min(...corners.map((p) => p.x)),
    maxX: Math.max(...corners.map((p) => p.x)),
    minZ: Math.min(...corners.map((p) => p.z)),
    maxZ: Math.max(...corners.map((p) => p.z)),
  };
}

/**
 * A lift doorway's geometry in its room: the frame the app sees through
 * (`door-joins.ts`), the leaves' footprint (a stop while shut), the stop
 * just beyond (until the room there is seen), the doorway cut while it
 * is, its jambs, whether a point has gone out through it, and whether one
 * is in it (the light curtain).
 */
export function liftDoorway(place: LiftPlace) {
  const half = LIFT_DOOR.clear / 2;
  const d = LIFT_DOOR.depth;
  const frame: DoorFrame = { x: place.x, z: place.z, yaw: place.yaw, y: 0 };
  return {
    frame,
    half,
    leaf: box(place, -half, half, -d, 0),
    beyond: box(place, -half, half, -d - 0.3, -d),
    opening: box(place, -half, half, -2.5, 0.4),
    /** The frame's jambs either side, solid. */
    jambs: [
      box(place, -half - LIFT_DOOR.frame, -half, -d, 0),
      box(place, half, half + LIFT_DOOR.frame, -d, 0),
    ],
    /** Gone out past the face, within the opening. */
    through(x: number, z: number) {
      const { u, v } = liftLocal(place, x, z);
      return v < -0.05 && Math.abs(u) < half;
    },
    /** In the doorway, or near enough the face for the light curtain. */
    inDoorway(x: number, z: number, radius = 0.3) {
      const { u, v } = liftLocal(place, x, z);
      return (
        Math.abs(u) < half + radius * 0.5 &&
        v > -d - radius &&
        v < CURTAIN_REACH
      );
    },
  };
}

/**
 * Where the walker stands arriving at a landing by a link (`?from=` the
 * car), not walked through: a metre and a half out from the doors, facing
 * away from them, into the room. Yaw as the walker's (0 looks −z).
 */
export function landingArrival(place: LiftPlace) {
  const p = liftWorld(place, 0, 1.5);
  return { ...p, yaw: Math.PI - place.yaw };
}

/** The walker's yaw looking straight out of a place's room through its doorway. */
export const lookingOut = (place: LiftPlace) => -place.yaw;
