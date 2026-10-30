/**
 * Baked ambient occlusion, the ray side: where a vertex's rays go, how a
 * hit's distance counts, and a bake job that works through a mesh's
 * vertices a slice of rays at a time. Pure: the ray caster is passed in
 * (three-mesh-bvh in the worker, anything in a test).
 */

/**
 * `count` directions over the hemisphere about +z, cosine-weighted, from a
 * Hammersley sequence: evenly spread, the same every time. x, y, z each.
 */
export function hemisphereSamples(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count;
    // Van der Corput radical inverse, base 2.
    let bits = i;
    bits = ((bits << 16) | (bits >>> 16)) >>> 0;
    bits = (((bits & 0x55555555) << 1) | ((bits & 0xaaaaaaaa) >>> 1)) >>> 0;
    bits = (((bits & 0x33333333) << 2) | ((bits & 0xcccccccc) >>> 2)) >>> 0;
    bits = (((bits & 0x0f0f0f0f) << 4) | ((bits & 0xf0f0f0f0) >>> 4)) >>> 0;
    bits = (((bits & 0x00ff00ff) << 8) | ((bits & 0xff00ff00) >>> 8)) >>> 0;
    const v = bits / 4294967296;
    const r = Math.sqrt(u);
    const phi = 2 * Math.PI * v;
    out[i * 3] = r * Math.cos(phi);
    out[i * 3 + 1] = r * Math.sin(phi);
    out[i * 3 + 2] = Math.sqrt(Math.max(0, 1 - u));
  }
  return out;
}

/**
 * Two unit vectors at right angles to the unit normal and to each other
 * (Duff et al. 2017, branchless): t, b, n is a right-handed frame.
 */
export function tangentBasis(nx: number, ny: number, nz: number) {
  const sign = nz >= 0 ? 1 : -1;
  const a = -1 / (sign + nz);
  const b = nx * ny * a;
  return {
    t: [1 + sign * nx * nx * a, sign * b, -sign * nx] as const,
    b: [b, sign + ny * ny * a, -ny] as const,
  };
}

/**
 * How much a hit at `distance` occludes: 1 touching, falling smoothly to 0
 * at `maxDistance`, so far walls darken a corner less than near ones and
 * nothing beyond the reach counts at all.
 */
export function occlusionFalloff(distance: number, maxDistance: number) {
  if (!(distance >= 0) || distance >= maxDistance) return 0;
  const f = distance / maxDistance;
  return 1 - f * f;
}

/** A light level 0–1 as a byte, rounded. */
export const toAoByte = (light: number) =>
  Math.max(0, Math.min(255, Math.round(light * 255)));

/**
 * A ray caster: the distance to the first surface hit along the unit
 * direction from the origin, or null if none within `far`.
 */
export type CastFirst = (
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  far: number,
) => number | null;

export interface VertexAoInput {
  /** x, y, z per vertex, scene units. */
  positions: Float32Array;
  /** Unit normals, x, y, z per vertex. */
  normals: Float32Array;
  /** Rays a vertex. */
  rays: number;
  /** Reach, scene units. */
  distance: number;
  /** How far off the surface rays start, scene units (so a face does not hit itself). */
  bias: number;
  /**
   * A vertex most of whose rays hit within this, scene units, is buried
   * (inside a flange, a wall, another part): marked in `buried`, its own
   * value meaningless (0 if not given).
   */
  bury?: number;
  /**
   * Seen from either side (a double-sided material, perhaps with its
   * normals the wrong way): the brighter of its two sides is kept.
   */
  twoSided?: boolean;
}

/**
 * A bake of one mesh's vertices, done a slice at a time (`step`, at most
 * so many rays), so a worker can stop between slices to hear that it is
 * paused or cancelled. Vertices at the same place with the same normal
 * (the corners shared by a non-indexed mesh's triangles) are baked once
 * and share the result, so they always agree. Each vertex's ray set is
 * turned about its normal by an angle from its position, so neighbouring
 * vertices' errors do not line up into bands.
 */
export function createVertexAoJob(input: VertexAoInput, cast: CastFirst) {
  const { positions, normals, rays, distance, bias } = input;
  const count = positions.length / 3;
  const result = new Uint8Array(count);
  const buried = new Uint8Array(count);
  const bury = input.bury ?? 0;
  const samples = hemisphereSamples(rays);
  // The first vertex of each distinct place-and-normal; the rest copy it.
  const firstOf = new Int32Array(count);
  const seen = new Map<string, number>();
  const unique: number[] = [];
  const q = (v: number) => Math.round(v * 1e4);
  for (let i = 0; i < count; i++) {
    const p = i * 3;
    const key = `${q(positions[p])},${q(positions[p + 1])},${q(positions[p + 2])},${Math.round(normals[p] * 100)},${Math.round(normals[p + 1] * 100)},${Math.round(normals[p + 2] * 100)}`;
    const first = seen.get(key);
    if (first === undefined) {
      seen.set(key, i);
      firstOf[i] = i;
      unique.push(i);
    } else firstOf[i] = first;
  }
  let next = 0;
  let cast_ = 0;
  const bakeVertex = (i: number) =>
    input.twoSided ? Math.max(bakeSide(i, 1), bakeSide(i, -1)) : bakeSide(i, 1);
  const bakeSide = (i: number, side: number) => {
    const p = i * 3;
    let nx = normals[p] * side;
    let ny = normals[p + 1] * side;
    let nz = normals[p + 2] * side;
    const l = Math.hypot(nx, ny, nz);
    if (!(l > 0)) return 255;
    nx /= l;
    ny /= l;
    nz /= l;
    const { t, b } = tangentBasis(nx, ny, nz);
    const ox = positions[p] + nx * bias;
    const oy = positions[p + 1] + ny * bias;
    const oz = positions[p + 2] + nz * bias;
    // A turn from the place, the same for the same place every time.
    const spin =
      (Math.abs(
        Math.sin(ox * 12.9898 + oy * 78.233 + oz * 37.719) * 43758.5453,
      ) %
        1) *
      2 *
      Math.PI;
    const cs = Math.cos(spin);
    const sn = Math.sin(spin);
    let occluded = 0;
    let near = 0;
    for (let s = 0; s < rays; s++) {
      const lx = samples[s * 3] * cs - samples[s * 3 + 1] * sn;
      const ly = samples[s * 3] * sn + samples[s * 3 + 1] * cs;
      const lz = samples[s * 3 + 2];
      const dx = t[0] * lx + b[0] * ly + nx * lz;
      const dy = t[1] * lx + b[1] * ly + ny * lz;
      const dz = t[2] * lx + b[2] * ly + nz * lz;
      const hit = cast(ox, oy, oz, dx, dy, dz, distance);
      if (hit !== null) {
        occluded += occlusionFalloff(hit, distance);
        if (hit < bury) near++;
      }
    }
    cast_ += rays;
    if (near * 2 > rays) {
      if (side === 1) buried[i] = 1;
    } else if (side === -1) buried[i] = 0;
    return toAoByte(1 - occluded / rays);
  };
  return {
    /** Vertices in all, and those needing rays of their own. */
    vertices: count,
    unique: unique.length,
    /** Rays cast so far. */
    get raysCast() {
      return cast_;
    },
    /** Work on, up to about `maxRays` rays; true once every vertex is baked. */
    step(maxRays: number) {
      const stop = cast_ + Math.max(rays, maxRays);
      while (next < unique.length && cast_ < stop) {
        const i = unique[next++];
        result[i] = bakeVertex(i);
      }
      if (next < unique.length) return false;
      for (let i = 0; i < count; i++) {
        result[i] = result[firstOf[i]];
        buried[i] = buried[firstOf[i]];
      }
      return true;
    },
    /** One byte a vertex, 255 unoccluded; complete once `step` has returned true. */
    result,
    /** 1 for each vertex found buried (`bury`). */
    buried,
  };
}
