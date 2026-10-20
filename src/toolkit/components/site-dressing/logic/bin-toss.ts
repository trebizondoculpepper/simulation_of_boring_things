/**
 * Putting things in the bin (dev13): whether a released object goes in the
 * bin or on the floor, the arc it follows into the bin, and where it comes
 * to rest as the bin fills. Pure logic; metres, y up, the floor at y = 0.
 */

/** How near the bin, metres, the player must stand to get things into it. */
export const BIN_REACH = 1.5;
/** Magnetic action range from the nearest point of the bin opening. */
export const BIN_MAGNET_REACH = 2;
/** How far off the line of sight the bin may be and still be faced, radians. */
export const BIN_FACING = (40 * Math.PI) / 180;

export interface Point {
  x: number;
  z: number;
}
export interface Point3 extends Point {
  y: number;
}

/**
 * Whether an object let go of now goes in the bin: the player is within
 * `reach` of the bin's middle (on the floor plan) and facing it, the bin
 * within `BIN_FACING` of the way they look. `facing` is the direction they
 * look, on the floor plan; it need not be of unit length. Standing almost
 * over the bin, any facing will do.
 */
export function aimsAtBin(
  player: Point,
  facing: Point,
  bin: Point,
  reach = BIN_REACH,
) {
  const dx = bin.x - player.x;
  const dz = bin.z - player.z;
  const distance = Math.hypot(dx, dz);
  if (distance >= reach) return false;
  if (distance < 0.3) return true;
  const look = Math.hypot(facing.x, facing.z);
  if (look < 1e-6) return false;
  const cos = (dx * facing.x + dz * facing.z) / (distance * look);
  return cos >= Math.cos(BIN_FACING);
}

/** How far past a bin's edge, metres, a let-go object still falls in. */
export const BIN_LIP = 0.25;

/**
 * Whether an object let go of at `point` is over the bin, or so near its
 * edge that it would hit the rim: then it goes in, whichever way the
 * player faces, rather than falling through the bin to the floor. The
 * bin's footprint is `size` (its length along its own x), its middle at
 * `bin`, turned `turn` radians about the vertical.
 */
export function overBin(
  point: Point,
  bin: Point,
  size: { x: number; z: number },
  turn = 0,
  lip = BIN_LIP,
) {
  const dx = point.x - bin.x;
  const dz = point.z - bin.z;
  // Into the bin's own frame: undo its turn about the vertical.
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  const x = dx * c - dz * s;
  const z = dx * s + dz * c;
  return Math.abs(x) <= size.x / 2 + lip && Math.abs(z) <= size.z / 2 + lip;
}

/** Horizontal distance from a part to the nearest edge of a turned bin. */
export function distanceToBin(
  point: Point,
  bin: Point,
  size: { x: number; z: number },
  turn = 0,
) {
  const dx = point.x - bin.x;
  const dz = point.z - bin.z;
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  const x = Math.max(0, Math.abs(dx * c - dz * s) - size.x / 2);
  const z = Math.max(0, Math.abs(dx * s + dz * c) - size.z / 2);
  return Math.hypot(x, z);
}

/** Seconds an object takes to fly `distance` metres into the bin. */
export function arcSeconds(distance: number) {
  return 0.4 + 0.22 * distance;
}

/**
 * Where an object is on its way into the bin, `t` from 0 (let go) to 1
 * (landed): straight across the floor plan, and a parabola in height that
 * passes through both ends and rises `lift` metres above the higher one.
 */
export function binArc(from: Point3, to: Point3, t: number, lift = 0.25) {
  const k = Math.min(1, Math.max(0, t));
  const top = Math.max(from.y, to.y) + lift;
  // y = a + b k + c k², through from.y at 0, to.y at 1 and `top` at its
  // highest: solve for the peak's place and the curvature together.
  const rise = top - from.y;
  const fall = top - to.y;
  const peak = Math.sqrt(rise) / (Math.sqrt(rise) + Math.sqrt(fall));
  const c = -rise / (peak * peak);
  return {
    x: from.x + (to.x - from.x) * k,
    y: top + c * (k - peak) * (k - peak),
    z: from.z + (to.z - from.z) * k,
  };
}

/** The bin's inside, metres, relative to the middle of its floor. */
export interface BinShape {
  /** Half the inside's width and depth at the bottom. */
  halfX: number;
  halfZ: number;
  /** Height of the inside floor and of the rim. */
  floor: number;
  rim: number;
  /** How much each object raises the pile. */
  layer: number;
  /** How far the heap can rise above the rim before it stops growing. */
  heap: number;
}

/** Where the `index`th object (from 0) comes to rest, and how it lies. */
export interface BinRest extends Point3 {
  /** Turned about the vertical, then tipped from lying flat, radians. */
  yaw: number;
  tilt: number;
}

/**
 * Where the `index`th object put in the bin comes to rest: on top of
 * everything before it, a `layer` higher each time, anywhere across the
 * inside, until the heap stands `heap` above the rim and grows no more.
 * Early ones lie nearly flat on the bottom; as the bin fills they land at
 * steeper and steeper angles, jammed in among the others, until the last
 * stick up out of the top. `random` gives numbers in [0, 1).
 */
export function binRest(
  index: number,
  shape: BinShape,
  random: () => number,
): BinRest {
  const height = Math.min(
    shape.floor + index * shape.layer,
    shape.rim + shape.heap,
  );
  const full = Math.min(1, (height - shape.floor) / (shape.rim - shape.floor));
  // Roughly along the bin's length, the only way most boards fit in it.
  const spread = 0.5;
  return {
    x: (random() * 2 - 1) * shape.halfX * spread,
    y: height,
    z: (random() * 2 - 1) * shape.halfZ * spread,
    yaw: (random() < 0.5 ? 0 : Math.PI) + (random() - 0.5) * 0.5,
    tilt: (0.15 + 0.85 * full) * (0.25 + random() * 0.75) * (Math.PI / 2.4),
  };
}
