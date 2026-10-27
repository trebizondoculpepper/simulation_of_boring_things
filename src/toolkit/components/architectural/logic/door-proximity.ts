/**
 * Whether someone is near enough a doorway that its self-closing door
 * should wait for them (the owner, 2026-10-27: "An opened door should not
 * close if you are standing near to it"). Pure, in metres.
 *
 * A doorway is measured by its opening: the box its doorway makes through
 * its wall, the doorway's width along the wall and the wall's thickness
 * across it, as every doorway in the building is square to the plan's
 * axes. The clearance is from the edge of the walker's body (its radius
 * taken off once, here) to the nearest point of that box, so it is the
 * same on either side of the wall, along the leaf's sweep and at either
 * end of a wide pair. It is a separate thing from the doorway's collision
 * and its threshold, which stay as narrow as they were.
 *
 * Presence has hysteresis: someone comes near within `enter` of the
 * opening and stays near until they are beyond `release`, so standing on
 * the edge does not set the door opening and closing, frame by frame.
 * Nothing here looks at where the walker looks or what they press.
 */

/** How near, metres from body to opening, one comes and leaves. Provisional (mission 090). */
export const DOOR_PROXIMITY = {
  enter: 1.5,
  release: 1.75,
  /** A walker more than this above or below a doorway's floor is not at it (a pit, a stair). */
  rise: 1,
} as const;

export type DoorProximityRule = {
  enter: number;
  release: number;
  rise: number;
};

/**
 * A doorway's opening through its wall, metres; `floor`, its sill's
 * height, where a walker might be on another level (else any level).
 */
export interface DoorwayOpening {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floor?: number;
}

/** Someone who may be near a doorway: where they stand, how wide their body is, their floor. */
export interface DoorwayActor {
  x: number;
  z: number;
  radius: number;
  floor?: number;
}

/**
 * How far the edge of `actor`'s body is from `opening`, metres: 0 when it
 * touches or stands in it, Infinity when on another level.
 */
export function doorwayClearance(
  opening: DoorwayOpening,
  actor: DoorwayActor,
  rule: DoorProximityRule = DOOR_PROXIMITY,
): number {
  if (
    actor.floor !== undefined &&
    opening.floor !== undefined &&
    Math.abs(actor.floor - opening.floor) > rule.rise
  )
    return Infinity;
  const dx = Math.max(opening.minX - actor.x, 0, actor.x - opening.maxX);
  const dz = Math.max(opening.minZ - actor.z, 0, actor.z - opening.maxZ);
  return Math.max(0, Math.hypot(dx, dz) - actor.radius);
}

/** Whether someone is near, given whether they were and their clearance now. */
export const nextDoorPresence = (
  wasNear: boolean,
  clearance: number,
  rule: DoorProximityRule = DOOR_PROXIMITY,
) => clearance <= (wasNear ? rule.release : rule.enter);

/**
 * One doorway's presence, remembered from frame to frame: `update` with
 * the walker (or null, when the room is not the one the player is in:
 * drawn under another, its own walker left where it was) says whether
 * someone is near it now. Keep one per doorway, not per leaf or room.
 */
export function createDoorPresence(
  opening: DoorwayOpening | (() => DoorwayOpening),
  rule: DoorProximityRule = DOOR_PROXIMITY,
) {
  let near = false;
  return {
    update(actor: DoorwayActor | null): boolean {
      const o = typeof opening === 'function' ? opening() : opening;
      near = actor
        ? nextDoorPresence(near, doorwayClearance(o, actor, rule), rule)
        : false;
      return near;
    },
    get near() {
      return near;
    },
  };
}

/**
 * The walker as a room's doors see it, in metres from a scene in `metre`
 * units: null while the room only follows another's eye (drawn under the
 * room the player is in), so a walker parked there holds no door open.
 */
export function doorActor(
  walk: {
    following: boolean;
    walker: { x: number; z: number };
    floorY?: number;
  },
  metre: number,
  radius: number,
): DoorwayActor | null {
  if (walk.following) return null;
  return {
    x: walk.walker.x / metre,
    z: walk.walker.z / metre,
    radius,
    ...(walk.floorY === undefined ? {} : { floor: walk.floorY / metre }),
  };
}
