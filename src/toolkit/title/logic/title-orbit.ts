/**
 * The title backdrop's camera (`doc/plans/title-screen.md`): it neither
 * pans nor tilts, but makes a very slow partial orbit about a room's
 * middle, always looking at it: simple harmonic motion through a small arc
 * (1° in all, by the owner's specification), 10 seconds to a cycle, so the
 * room turns gently in depth. Pure; metres, seconds, radians out.
 */

export interface TitleOrbit {
  /** What it looks at, room-centred metres. */
  centre: { x: number; y: number; z: number };
  /** Its distance from the centre across the floor, and its height. */
  radius: number;
  height: number;
  /** The bearing of its middle, degrees from +z (south), and its whole arc, degrees. */
  bearing: number;
  arc: number;
  /** Seconds to a cycle. */
  period: number;
}

/** The Olympic hall's: from the south, 17 m out and 12 m up. */
export const OLYMPIC_ORBIT: TitleOrbit = {
  centre: { x: 0, y: 1, z: 0 },
  radius: 17,
  height: 12,
  bearing: 0,
  arc: 1,
  period: 10,
};

/**
 * Where the camera is at `seconds`, and which way it looks (as the
 * walker turns: yaw 0 faces −z, pitch up is positive).
 */
export function orbitPose(o: TitleOrbit, seconds: number) {
  const swing = (o.arc / 2) * Math.sin((seconds / o.period) * Math.PI * 2);
  const theta = ((o.bearing + swing) * Math.PI) / 180;
  return {
    x: o.centre.x + o.radius * Math.sin(theta),
    z: o.centre.z + o.radius * Math.cos(theta),
    y: o.height,
    yaw: -theta,
    pitch: -Math.atan2(o.height - o.centre.y, o.radius),
  };
}
