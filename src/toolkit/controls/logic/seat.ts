/**
 * Sitting on a chair (the owner, 2026-10-27: "using a chair should
 * position you in seated position for that console"). A chair declares
 * a seat (`SeatDeclaration`, on its object's `userData.seat`): how high
 * its seat is, and, for a console's chair, the point of the console its
 * sitter looks at. Using the chair seats the walker there: the eye at a
 * seated height over the seat, facing the chair's way, or the console,
 * looking a little down at it. C or V, or any step, stands them up again
 * where they stood before sitting. Pure logic: lengths in whatever units
 * the caller gives, all alike.
 */

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/** What a chair declares, in its own frame (before any scaling). */
export interface SeatDeclaration {
  /** Its seat's height above the chair's foot, metres. */
  height: number;
  /** How far forward of the chair's middle the sitter's eye is, metres (a little, leaning in). */
  forward?: number;
  /** What a console's chair faces: a point in the chair's parent's frame (its panel's middle). */
  lookAt?: Point3;
}

/** How far a sitter's eye is above the seat, metres: about 1.2 m off the floor on a low chair. */
export const SEATED_EYE_ABOVE_SEAT = 0.72;
/** How far forward of the chair's middle the eye is by default, metres. */
export const SEATED_LEAN = 0.06;
/** The pitch a sitter looks at with nothing to face: a little down, radians. */
export const SEATED_PITCH = -0.15;
/** The pitch a sitter may be given toward a console, radians. */
export const SEATED_PITCH_RANGE = { min: -0.9, max: 0.25 } as const;

/** Where the sitter's eye is, and how it looks (yaw 0 north, -z; looking along `(sin yaw, -cos yaw)`). */
export interface SeatPose {
  x: number;
  z: number;
  /** The eye's height, absolute. */
  eyeY: number;
  yaw: number;
  pitch: number;
}

/** The walker's yaw looking along the horizontal direction (dx, dz). */
export const yawAlong = (dx: number, dz: number) => Math.atan2(dx, -dz);

/**
 * The seated pose on a chair: `seat`, its seat's middle (world), and
 * `front`, the way the chair faces (a horizontal direction, any length);
 * `eyeAbove`, the eye over the seat; `lean`, the eye forward of it; and
 * `lookAt`, what it faces, if a console (world). The eye is over the seat,
 * leaning a little forward, facing the chair's way, or, with a console,
 * turned and pitched to look at it.
 */
export function seatPose(
  seat: Point3,
  front: { x: number; z: number },
  eyeAbove: number,
  lean: number,
  lookAt?: Point3,
): SeatPose {
  const length = Math.hypot(front.x, front.z) || 1;
  const fx = front.x / length;
  const fz = front.z / length;
  const x = seat.x + fx * lean;
  const z = seat.z + fz * lean;
  const eyeY = seat.y + eyeAbove;
  if (!lookAt)
    return { x, z, eyeY, yaw: yawAlong(fx, fz), pitch: SEATED_PITCH };
  const dx = lookAt.x - x;
  const dz = lookAt.z - z;
  const across = Math.hypot(dx, dz);
  // Right over the eye (or under it), nothing to turn to: the chair's way.
  const yaw = across > 1e-6 ? yawAlong(dx, dz) : yawAlong(fx, fz);
  const pitch = Math.max(
    SEATED_PITCH_RANGE.min,
    Math.min(SEATED_PITCH_RANGE.max, Math.atan2(lookAt.y - eyeY, across)),
  );
  return { x, z, eyeY, yaw, pitch };
}

/** What the walker asked for this frame, while seated. */
export interface SeatedInput {
  /** Any step ahead, back or aside (keys, sticks, the on-screen pad). */
  moving: boolean;
  /** C or V, the crouch button, the pad's B: a change of stance. */
  stance: boolean;
}

/** Whether a seated walker gets up: on a change of stance, or any step. Looking about and using things keep them seated. */
export const standsUp = (input: SeatedInput) => input.moving || input.stance;
