/**
 * A remotely operated valve, at its real size (the owner, 2026-10-23: they
 * are ordinary valves with a small actuator on one side, and ours were
 * drawn about four times too big). Pure: metres, the valve's own frame,
 * the pipe along x at `axis` over the floor, its actuator reaching back
 * (−z) from the stem, as these actuators are usually set to clear the
 * pipework in front.
 *
 * - **Water:** a threaded ball valve with a rotary actuator after Belimo's.
 *   The actuators are from Belimo's datasheets (LR24A-SR and SR24A-SR,
 *   en-gb, 2014-08-13): the 5 Nm LR, 118 × 71 × 85 mm, for valves to DN32,
 *   and the 20 Nm SR, 141 × 93 × 86 mm, for DN40 and DN50, each with its
 *   stem 25 or 33 mm from one end and a cable gland 42 or 43 mm long at
 *   the other. A DN50 threaded ball valve is 130 mm face to face (ATO's
 *   tables); the smaller sizes are estimates, in proportion.
 * - **Gas:** a safety shut-off, a solenoid valve after the Dungs MVD: a
 *   cast body with the coil standing on it and a plug on the coil's side.
 *   Estimated, in proportion to a 2-inch Honeywell gas valve's 213 mm.
 */

export type Vec3 = readonly [number, number, number];

export interface RemoteValveGeometry {
  medium: 'gas' | 'water';
  /** Its connections' outside diameter, metres. */
  od: number;
  /** Face to face, along the pipe. */
  length: number;
  /** The body's diameter (water) or square section (gas). */
  body: number;
  /** The pipe's height over the floor. */
  axis: number;
  /** The actuator or coil: its box (or cylinder), as min and max corners. */
  head: { min: Vec3; max: Vec3; shape: 'box' | 'cylinder' };
  /** Where its cable leaves, and its gland or plug. */
  gland: { at: Vec3; length: number };
  /** Its ports, and which way each faces. */
  ports: Record<'in' | 'out' | 'actuator-power', { at: Vec3; out: Vec3 }>;
  /** What it takes on the floor on its stand: width (x), depth (z), height. */
  size: { w: number; d: number; h: number };
  /** Which actuator, by its torque. */
  actuator: string;
}

/** Belimo's rotary actuators for ball valves, metres (datasheets, en-gb). */
export const ACTUATORS = {
  LR: {
    name: '5 Nm rotary actuator',
    length: 0.118,
    width: 0.071,
    height: 0.085,
    stemFromEnd: 0.025,
    gland: 0.042,
  },
  SR: {
    name: '20 Nm rotary actuator',
    length: 0.141,
    width: 0.093,
    height: 0.086,
    stemFromEnd: 0.033,
    gland: 0.043,
  },
} as const;

/** Face to face of a threaded ball valve, by the pipe's outside diameter: DN50 130 mm (ATO), the rest in proportion. */
const FACE_TO_FACE: readonly (readonly [number, number])[] = [
  [0.022, 0.065],
  [0.028, 0.075],
  [0.035, 0.09],
  [0.043, 0.105],
  [0.05, 0.12],
  [0.062, 0.13],
];

/** How far the stand keeps its foot clear of the valve's ends, metres. */
const STAND = 0.16;

export function remoteValveGeometry(
  medium: 'gas' | 'water',
  od: number,
  axis = 0.74,
): RemoteValveGeometry {
  if (medium === 'water') {
    const length =
      FACE_TO_FACE.find(([upTo]) => od <= upTo + 1e-6)?.[1] ??
      0.13 * (od / 0.06);
    const body = 1.7 * od;
    const a = od <= 0.043 ? ACTUATORS.LR : ACTUATORS.SR;
    // The stem and its bracket lift the actuator clear of the body.
    const base = axis + body / 2 + 0.03;
    const head = {
      min: [-a.width / 2, base, -(a.length - a.stemFromEnd)] as Vec3,
      max: [a.width / 2, base + a.height, a.stemFromEnd] as Vec3,
      shape: 'box' as const,
    };
    const glandAt: Vec3 = [0, base + a.height * 0.6, head.min[2]];
    const back = -head.min[2] + a.gland;
    return {
      medium,
      od,
      length,
      body,
      axis,
      head,
      gland: { at: glandAt, length: a.gland },
      ports: {
        in: { at: [-length / 2, axis, 0], out: [-1, 0, 0] },
        out: { at: [length / 2, axis, 0], out: [1, 0, 0] },
        'actuator-power': {
          at: [glandAt[0], glandAt[1], glandAt[2] - a.gland],
          out: [0, 0, -1],
        },
      },
      size: {
        w: Math.max(length, a.width, STAND),
        d: 2 * Math.max(back, body / 2, STAND / 2),
        h: base + a.height,
      },
      actuator: a.name,
    };
  }
  // Gas: a solenoid valve's cast body, its coil on top, a plug on the coil.
  const length = 0.065 + 1.6 * od;
  const body = 1.6 * od + 0.025;
  const coil = { r: 0.034, h: 0.085 };
  const base = axis + body / 2;
  const head = {
    min: [-coil.r, base, -coil.r] as Vec3,
    max: [coil.r, base + coil.h, coil.r] as Vec3,
    shape: 'cylinder' as const,
  };
  const plug = 0.035;
  const glandAt: Vec3 = [0, base + coil.h * 0.55, -coil.r];
  return {
    medium,
    od,
    length,
    body,
    axis,
    head,
    gland: { at: glandAt, length: plug },
    ports: {
      in: { at: [-length / 2, axis, 0], out: [-1, 0, 0] },
      out: { at: [length / 2, axis, 0], out: [1, 0, 0] },
      'actuator-power': {
        at: [0, glandAt[1], -coil.r - plug],
        out: [0, 0, -1],
      },
    },
    size: {
      w: Math.max(length, STAND),
      d: 2 * Math.max(coil.r + plug, body / 2, STAND / 2),
      h: base + coil.h,
    },
    actuator: 'solenoid coil',
  };
}
