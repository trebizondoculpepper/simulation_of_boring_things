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

/**
 * The doors' sizes: a goods lift's centre-opening, four-panel telescopic
 * doors (the owner, 2026-10-30), two panels each side, the fast one
 * travelling twice as far as the slow, both stacking behind the wall
 * either side; the car's door and every landing's the same.
 */
export const LIFT_DOOR = {
  /** Clear opening, wide and tall. */
  // As wide as the car takes (the owner, 2026-10-30: up to about 1.8 m
  // in a car about 2.6 m wide): the stack (three quarters of this and the
  // lap, 1.31 m) must hide behind the car's front returns.
  clear: 1.7,
  height: 2.2,
  /** The steel frame's jambs and head, each side. */
  frame: 0.1,
  /** How deep the doorway's reveal is, behind the face: where the leaves (or the car's gate) run. */
  depth: 0.14,
  /**
   * A landing's doors set back behind its wall's face (the owner,
   * 2026-10-30: at least a brick's depth, room for the mechanism), in a
   * reveal lined round its jambs and head, a sill plate across it.
   */
  recess: 0.15,
  /** Each panel's overlap: the fast over the slow, the slow into the frame. */
  lap: 0.03,
  /** The two tracks' depths behind the face: the fast panel's (nearer) and the slow's. */
  fastTrack: 0.035,
  slowTrack: 0.085,
} as const;

/**
 * How far behind a landing's wall face the car's sill edge stands: the
 * recess, then the landing doors' tracks (`depth`), the landing sill and
 * the car sill meeting with a small running gap within it.
 */
export const LANDING_SET = LIFT_DOOR.recess + LIFT_DOOR.depth;

/** One door panel's width: a quarter of the opening, and its overlap. */
export const PANEL_WIDTH = LIFT_DOOR.clear / 4 + LIFT_DOOR.lap;

/**
 * How far from the doorway's middle the panels reach, open, each side:
 * the stack behind the wall (three quarters of the opening and the lap).
 * The wall either side of a landing must be solid this far out.
 */
export const DOOR_STACK = (3 * LIFT_DOOR.clear) / 4 + LIFT_DOOR.lap;

/**
 * The door operator's motion: how far along its travel a door stands
 * when its opening (the world's `open`, which runs evenly) is `k`; eased
 * in and out (smoothstep), as a variable-speed operator starts and stops
 * gently.
 */
export function doorTravel(k: number): number {
  const t = Math.min(1, Math.max(0, k));
  return t * t * (3 - 2 * t);
}

/**
 * Each panel's middle, `u` from the doorway's middle, on the right-hand
 * side (+u; the left mirrors it), when the doors stand `k` open: shut,
 * the fast panel meets its fellow at the middle and the slow one laps the
 * frame; open, both stack beside the opening, the fast panel having
 * travelled twice as far as the slow (half the opening, and a quarter).
 */
export function doorPanels(k: number): { fast: number; slow: number } {
  const t = doorTravel(k);
  const c = LIFT_DOOR.clear;
  const shutFast = PANEL_WIDTH / 2;
  const shutSlow = c / 4 + PANEL_WIDTH / 2;
  return { fast: shutFast + t * (c / 2), slow: shutSlow + t * (c / 4) };
}

/**
 * The car (inside): wide, deep and clear high. The owner, 2026-10-30:
 * wide enough for the four-panel doors to stack behind its front returns, a 2000 kg, 26-person goods car; its
 * front returns either side of the doorway as wide as the doors' stack.
 */
export const LIFT_CAR = { w: 2.62, d: 2.8, h: 2.4 } as const;

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
export function liftDoorway(place: LiftPlace, landing = false) {
  const half = LIFT_DOOR.clear / 2;
  const d = LIFT_DOOR.depth;
  // A landing's doors stand in its recess, the car's sill edge (where the
  // two rooms join) `LANDING_SET` behind its face; the car's own doorway
  // is its sill edge.
  const back = landing ? LIFT_DOOR.recess : 0;
  const set = landing ? LANDING_SET : 0;
  const edge = liftWorld(place, 0, -set);
  const frame: DoorFrame = { x: edge.x, z: edge.z, yaw: place.yaw, y: 0 };
  return {
    frame,
    half,
    leaf: box(place, -half, half, -back - d, -back),
    beyond: box(place, -half, half, -back - d - 0.3, -back - d),
    opening: box(place, -half, half, -set - 2.5, 0.4),
    /** The frame's jambs (a landing's, its reveal's linings) either side, solid. */
    jambs: [
      box(place, -half - LIFT_DOOR.frame, -half, -Math.max(set, d), 0),
      box(place, half, half + LIFT_DOOR.frame, -Math.max(set, d), 0),
    ],
    /** Gone out past the sill's edge, within the opening. */
    through(x: number, z: number) {
      const { u, v } = liftLocal(place, x, z);
      return v < -set - 0.05 && Math.abs(u) < half;
    },
    /** In the doorway, or near enough the face for the light curtain. */
    inDoorway(x: number, z: number, radius = 0.3) {
      const { u, v } = liftLocal(place, x, z);
      return (
        Math.abs(u) < half + radius * 0.5 &&
        v > -set - d - radius &&
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
