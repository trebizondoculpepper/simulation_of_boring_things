/**
 * Settling things into a skip: a plausible, cheap rule, not physics. The
 * pile is a height map over the skip's inside, starting as its floor and
 * its sloping ends. A thing thrown in is a slab (a board, a panel: length,
 * width and thickness) let fall flat at some spot and turn; it comes to
 * rest on the pile as a board would: on the face of the pile's upper hull
 * under its middle, so flat on a level heap, tipped onto its highest
 * supports on an uneven one. Where that face is steeper than a board would
 * stay on, it slides downhill and settles again. Then it is stamped into
 * the height map for the next to land on. Flat things laid down this way
 * pack far closer than things tipped in at random, so a skip takes many
 * more before it is full. Pure logic; metres, y up, in the skip's own
 * frame (its origin the middle of the floor under it, its length along x).
 */

/** The skip's inside. */
export interface PileBounds {
  /** Half its inside length along the floor, and at the rim (sloping ends). */
  floorHalfX: number;
  topHalfX: number;
  /** Half its inside width (upright sides). */
  halfZ: number;
  /** Heights of its inside floor and its rim. */
  floor: number;
  rim: number;
}

/** A thing to settle: its sizes, length ≥ width ≥ thickness. */
export interface Slab {
  length: number;
  width: number;
  thickness: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Where a slab came to rest: its middle and its own axes. */
export interface PileRest {
  /** Which slab it is, to take it out again (`remove`). */
  id: number;
  /** Its middle. */
  centre: Vec3;
  /** Unit vectors: along its length, up out of its face, across it. */
  along: Vec3;
  up: Vec3;
  across: Vec3;
  /** How far it is tipped from lying flat, radians. */
  tilt: number;
}

/** How steep, radians, a face a slab will stay on; steeper, it slides. */
export const PILE_MAX_SLOPE = (35 * Math.PI) / 180;
/** How far a slab slides downhill each try, metres. */
const SLIDE = 0.04;
/** How many times a slab may slide before it stays where it is. */
const SLIDES = 40;
/** Sample points along and across a slab, for its supports. */
const ALONG = 5;
const ACROSS = 3;

export function createSkipPile(bounds: PileBounds, { cell = 0.025 } = {}) {
  const nx = Math.ceil((bounds.topHalfX * 2) / cell);
  const nz = Math.ceil((bounds.halfZ * 2) / cell);
  const heights = new Float32Array(nx * nz);
  /** The skip's own floor and ends, under a point. */
  const ground = (x: number) => {
    const past = Math.abs(x) - bounds.floorHalfX;
    if (past <= 0) return bounds.floor;
    const run = bounds.topHalfX - bounds.floorHalfX;
    return (
      bounds.floor + (Math.min(past, run) / run) * (bounds.rim - bounds.floor)
    );
  };
  const cellX = (i: number) => -bounds.topHalfX + (i + 0.5) * cell;
  const cellZ = (k: number) => -bounds.halfZ + (k + 0.5) * cell;
  /** The top of the highest thing thrown in. */
  let pileTop = bounds.floor;
  const reset = () => {
    for (let i = 0; i < nx; i++)
      for (let k = 0; k < nz; k++) heights[i * nz + k] = ground(cellX(i));
    pileTop = bounds.floor;
  };
  reset();
  /** The pile's height at a point, the skip's walls rising round it. */
  const heightAt = (x: number, z: number) => {
    const i = Math.floor((x + bounds.topHalfX) / cell);
    const k = Math.floor((z + bounds.halfZ) / cell);
    if (i < 0 || i >= nx || k < 0 || k >= nz) return bounds.rim;
    return heights[i * nz + k];
  };

  /** How far a slab turned `yaw` reaches from its middle, along x and z. */
  const reach = (slab: Slab, yaw: number) => {
    const c = Math.abs(Math.cos(yaw));
    const s = Math.abs(Math.sin(yaw));
    return {
      x: (slab.length * c + slab.width * s) / 2,
      z: (slab.length * s + slab.width * c) / 2,
    };
  };

  /**
   * The plane a slab at (x, z) turned `yaw` rests on: through three of the
   * pile's points under it, above all of them, its middle within the
   * three; the lowest such, there. As h = a + b x + c z.
   */
  const support = (slab: Slab, x: number, z: number, yaw: number) => {
    const ux = Math.cos(yaw);
    const uz = -Math.sin(yaw);
    const points: { x: number; z: number; h: number }[] = [];
    for (let a = 0; a < ALONG; a++)
      for (let b = 0; b < ACROSS; b++) {
        const u = (a / (ALONG - 1) - 0.5) * slab.length;
        const v = (b / (ACROSS - 1) - 0.5) * slab.width;
        const px = x + u * ux + v * -uz;
        const pz = z + u * uz + v * ux;
        points.push({ x: px, z: pz, h: heightAt(px, pz) });
      }
    let best: { a: number; b: number; c: number } | null = null;
    let lowest = Infinity;
    for (let i = 0; i < points.length; i++)
      for (let j = i + 1; j < points.length; j++)
        for (let k = j + 1; k < points.length; k++) {
          const p = points[i];
          const q = points[j];
          const r = points[k];
          // Solve h = a + b x + c z through the three.
          const d1x = q.x - p.x;
          const d1z = q.z - p.z;
          const d2x = r.x - p.x;
          const d2z = r.z - p.z;
          const det = d1x * d2z - d1z * d2x;
          if (Math.abs(det) < 1e-9) continue;
          const dh1 = q.h - p.h;
          const dh2 = r.h - p.h;
          const b = (dh1 * d2z - dh2 * d1z) / det;
          const c = (d1x * dh2 - d2x * dh1) / det;
          const a = p.h - b * p.x - c * p.z;
          // The middle must lie within the three (it can balance).
          const w1 = ((x - p.x) * d2z - (z - p.z) * d2x) / det;
          const w2 = (d1x * (z - p.z) - d1z * (x - p.x)) / det;
          if (w1 < -1e-6 || w2 < -1e-6 || w1 + w2 > 1 + 1e-6) continue;
          // And above every point under it.
          if (points.some((s) => s.h > a + b * s.x + c * s.z + 1e-4)) continue;
          const at = a + b * x + c * z;
          if (at < lowest) {
            lowest = at;
            best = { a, b, c };
          }
        }
    // All in a line (it cannot happen with a grid of samples): lie flat.
    return best ?? { a: Math.max(...points.map((s) => s.h)), b: 0, c: 0 };
  };
  /** The highest point of the pile under a slab. */
  const highest = (slab: Slab, x: number, z: number, yaw: number) => {
    const ux = Math.cos(yaw);
    const uz = -Math.sin(yaw);
    let top = -Infinity;
    for (let a = 0; a < ALONG; a++)
      for (let b = 0; b < ACROSS; b++) {
        const u = (a / (ALONG - 1) - 0.5) * slab.length;
        const v = (b / (ACROSS - 1) - 0.5) * slab.width;
        top = Math.max(
          top,
          heightAt(x + u * ux + v * -uz, z + u * uz + v * ux),
        );
      }
    return top;
  };

  /** Raise the pile to the top of a slab at rest on plane `p`. */
  const stamp = (
    slab: Slab,
    x: number,
    z: number,
    yaw: number,
    p: { a: number; b: number; c: number },
    rise: number,
  ) => {
    const ux = Math.cos(yaw);
    const uz = -Math.sin(yaw);
    const { x: rx, z: rz } = reach(slab, yaw);
    for (
      let i = Math.max(0, Math.floor((x - rx + bounds.topHalfX) / cell));
      i < Math.min(nx, Math.ceil((x + rx + bounds.topHalfX) / cell));
      i++
    )
      for (
        let k = Math.max(0, Math.floor((z - rz + bounds.halfZ) / cell));
        k < Math.min(nz, Math.ceil((z + rz + bounds.halfZ) / cell));
        k++
      ) {
        const dx = cellX(i) - x;
        const dz = cellZ(k) - z;
        // Within the slab's outline, in its own frame.
        if (
          Math.abs(dx * ux + dz * uz) > slab.length / 2 ||
          Math.abs(-dx * uz + dz * ux) > slab.width / 2
        )
          continue;
        const top = p.a + p.b * cellX(i) + p.c * cellZ(k) + rise;
        if (top > heights[i * nz + k]) heights[i * nz + k] = top;
        if (top > pileTop) pileTop = top;
      }
  };

  let count = 0;
  /** Each slab at rest, as stamped, so one can be taken out again. */
  const resting = new Map<
    number,
    {
      slab: Slab;
      x: number;
      z: number;
      yaw: number;
      plane: { a: number; b: number; c: number };
      rise: number;
    }
  >();
  let serial = 0;
  return {
    /**
     * Settle `slab` let fall flat at (x, z), turned `yaw` about the
     * vertical: kept inside the skip (turned along it if it is too long to
     * lie across), slid down anything too steep, and laid on the pile,
     * which it then joins.
     */
    settle(slab: Slab, at: { x: number; z: number; yaw: number }): PileRest {
      let { x, z, yaw } = at;
      // Too long to lie across the skip: it goes along it.
      if (reach(slab, yaw).z > bounds.halfZ)
        yaw = Math.round(yaw / Math.PI) * Math.PI;
      const keepIn = () => {
        const r = reach(slab, yaw);
        const limitX = Math.max(0, bounds.topHalfX - r.x);
        const limitZ = Math.max(0, bounds.halfZ - r.z);
        x = Math.min(limitX, Math.max(-limitX, x));
        z = Math.min(limitZ, Math.max(-limitZ, z));
      };
      keepIn();
      let plane = support(slab, x, z, yaw);
      for (let i = 0; i < SLIDES; i++) {
        const steep = Math.hypot(plane.b, plane.c);
        if (Math.atan(steep) <= PILE_MAX_SLOPE) break;
        // Downhill, by a slide's length.
        x -= (plane.b / steep) * SLIDE;
        z -= (plane.c / steep) * SLIDE;
        keepIn();
        plane = support(slab, x, z, yaw);
      }
      // Still too steep, with nowhere left to slide: it jams, lying flat on
      // the highest thing under it.
      if (Math.atan(Math.hypot(plane.b, plane.c)) > PILE_MAX_SLOPE)
        plane = { a: highest(slab, x, z, yaw), b: 0, c: 0 };
      // Its own axes, lying on the plane.
      const normal = norm({ x: -plane.b, y: 1, z: -plane.c });
      const flat = { x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) };
      const along = norm(sub(flat, scale(normal, dot(flat, normal))));
      const across = cross(along, normal);
      // Its underside on the plane: the plane's height under its middle
      // is along the vertical, so step up its thickness along its normal.
      const base = plane.a + plane.b * x + plane.c * z;
      const half = slab.thickness / 2;
      const centre = {
        x: x + normal.x * half,
        y: base + normal.y * half,
        z: z + normal.z * half,
      };
      // Its top, measured up the vertical, for those landing on it.
      const rise = slab.thickness / normal.y;
      stamp(slab, x, z, yaw, plane, rise);
      count++;
      const id = ++serial;
      resting.set(id, { slab, x, z, yaw, plane, rise });
      return {
        id,
        centre,
        along,
        up: normal,
        across,
        tilt: Math.acos(Math.min(1, normal.y)),
      };
    },
    /** The pile's height at a point (the walls, beyond the inside). */
    heightAt,
    /** How high the pile of things thrown in stands at its highest. */
    top: () => pileTop,
    /** How many slabs have been settled since it was emptied. */
    get count() {
      return count;
    },
    /**
     * Take one slab out again (despawned): the pile is what is left, each
     * where it lay. What rested on it stays put (it is not settled again).
     */
    remove(id: number) {
      if (!resting.delete(id)) return;
      reset();
      count = resting.size;
      for (const r of resting.values())
        stamp(r.slab, r.x, r.z, r.yaw, r.plane, r.rise);
    },
    /** Empty the skip. */
    reset() {
      reset();
      resting.clear();
      count = 0;
    },
  };
}

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const scale = (a: Vec3, k: number) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const sub = (a: Vec3, b: Vec3) => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
const cross = (a: Vec3, b: Vec3) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const norm = (a: Vec3) => scale(a, 1 / Math.hypot(a.x, a.y, a.z));
