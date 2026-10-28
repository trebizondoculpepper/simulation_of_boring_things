/**
 * An articulated delivery lorry's dimensions (prompt 097): a Haulmark 4 × 2
 * tractor unit after the 2000s European cab-overs (DAF XF, Volvo FH,
 * Scania R) coupled to a tri-axle skeletal container trailer, carrying one
 * 20 ft ISO container at its rear. Metres; pure.
 *
 * The unit's frame: on the ground at its rear axle's middle, its front
 * toward +z. The trailer's frame: on the ground under its kingpin, its
 * rear toward −z. Coupled, the kingpin is over the fifth wheel.
 */
export const UNIT = {
  /** Over the cab's sides (mirrors aside), and the tyres'. */
  width: 2.49,
  wheelbase: 3.6,
  /** The bumper's front, ahead of the front axle. */
  frontOverhang: 1.45,
  /** The chassis rails' end, behind the rear axle. */
  rearOverhang: 0.9,
  /** The fifth wheel's lead ahead of the rear axle, and its height. */
  fifthWheel: { z: 0.45, y: 1.15 },
  /** The cab: its floor, roof and back face (its front is the bumper's line). */
  cab: { floor: 1.25, roof: 3.6, back: 2.75, spoiler: 3.95 },
  /** A 315/80 R22.5 tyre. */
  tyre: { r: 0.535, w: 0.3 },
} as const;

export const TRAILER = {
  width: 2.5,
  /** The front beam's lead ahead of the kingpin. */
  front: 1.2,
  length: 12.5,
  /** The top of its bolsters, where a container's corner castings sit. */
  deck: 1.27,
  /** Its three axles, behind the kingpin, and their tyres (385/65 R22.5). */
  axles: [8.0, 9.31, 10.62],
  tyre: { r: 0.535, w: 0.38 },
  /** Its landing legs, behind the kingpin. */
  legs: 1.0,
} as const;

/** A 20 ft ISO container's outside, ISO 668. */
export const TWENTY_FOOT = { l: 6.058, w: 2.438, h: 2.591 } as const;

/** Where the trailer's kingpin is in the unit's frame, coupled. */
export const KINGPIN_ON_UNIT = UNIT.fifthWheel.z;

/** The rig's length, bumper to trailer's rear. */
export const RIG_LENGTH =
  UNIT.wheelbase +
  UNIT.frontOverhang +
  KINGPIN_ON_UNIT +
  TRAILER.length -
  TRAILER.front;

/**
 * The container's middle along the trailer, in its frame (z, negative):
 * a 20 ft carried at the rear, its back end flush with the trailer's.
 */
export const CONTAINER_Z = -(
  TRAILER.length -
  TRAILER.front -
  TWENTY_FOOT.l / 2
);

/**
 * A coupled rig's footprint on the ground, in the rig's frame: the
 * trailer's rear end at z = 0, its front toward +z, x across. The walker
 * is kept out of the whole of it (between the wheels is not a place to
 * stand), with `margin` round it.
 */
export function rigFootprint(margin = 0.1) {
  const half = Math.max(UNIT.width, TRAILER.width) / 2 + margin;
  return { minX: -half, maxX: half, minZ: -margin, maxZ: RIG_LENGTH + margin };
}

/**
 * Where the unit's origin (its rear axle on the ground) is in the rig's
 * frame, the trailer's rear end at z = 0; and the trailer's kingpin.
 */
export function rigLayout() {
  const kingpin = TRAILER.length - TRAILER.front;
  return {
    kingpin,
    unit: kingpin - KINGPIN_ON_UNIT,
    container: kingpin + CONTAINER_Z,
  };
}
