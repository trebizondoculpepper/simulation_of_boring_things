/**
 * Smooth camera loops through authored poses (`doc/research/camera-splines.md`):
 * the owner frames each pose in noclip and copies its link; the camera
 * glides through them all, round and round. Its path is a closed
 * centripetal Catmull-Rom spline through the keys' positions (no cusps or
 * loops within a segment, however unevenly the keys are spaced), flown at
 * a steady speed by arc length, so each key is reached at the time its
 * distance round the loop says. Its yaw, pitch, roll and zoom (by its
 * logarithm, so a zoom changes at a steady rate) are each a periodic cubic
 * Hermite in time through the keys, so the camera turns smoothly through
 * every key and across the seam; yaw and roll unwrapped to the shortest
 * turn between keys, and a loop that turns round once carries on turning
 * the same way at its seam. Pure; metres, seconds.
 */

/** One pose from a noclip link: metres, and degrees (yaw 0 faces north, −z). */
export interface CameraKey {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  /** Degrees clockwise from level; 0 if not given. */
  roll?: number;
  /** Magnification; 1 if not given. */
  zoom?: number;
}

/** What the view needs each frame: metres, radians (as `orbitPose` gives). */
export interface CameraSample {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  zoom: number;
}

/** A noclip link's pose (`?x=…&y=…&z=…&yaw=…&pitch=…&zoom=…&roll=…`). */
export function parseViewLink(link: string): CameraKey {
  const query = link.includes('?') ? link.slice(link.indexOf('?')) : link;
  const params = new URLSearchParams(query);
  const number = (name: string, fallback?: number) => {
    const raw = params.get(name);
    const value = raw === null || raw.trim() === '' ? NaN : Number(raw);
    if (Number.isFinite(value)) return value;
    if (fallback !== undefined) return fallback;
    throw new Error(`A view link needs ${name}: ${link}`);
  };
  return {
    x: number('x'),
    y: number('y'),
    z: number('z'),
    yaw: number('yaw'),
    pitch: number('pitch', 0),
    roll: number('roll', 0),
    zoom: number('zoom', 1),
  };
}

type V3 = readonly [number, number, number];

const EPS = 1e-9;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dist = (a: V3, b: V3) => Math.hypot(...sub(a, b));
/** `a` and `b` mixed: `(t1 − t)/(t1 − t0)` of `a`, the rest `b`. */
const mix = (a: V3, b: V3, t0: number, t1: number, t: number): V3 => {
  const w = t1 - t0 < EPS ? 0.5 : (t - t0) / (t1 - t0);
  return [
    a[0] + (b[0] - a[0]) * w,
    a[1] + (b[1] - a[1]) * w,
    a[2] + (b[2] - a[2]) * w,
  ];
};

/**
 * A centripetal Catmull-Rom segment from `p1` to `p2` (`p0` and `p3` its
 * neighbours), at `u` from 0 to 1: Barry and Goldman's pyramid, its knots
 * spaced by the square root of the distance between points (Yuksel,
 * Schaefer and Keyser), never zero.
 */
export function centripetal(p0: V3, p1: V3, p2: V3, p3: V3, u: number): V3 {
  const knot = (a: V3, b: V3) => Math.max(Math.sqrt(dist(a, b)), 1e-4);
  const t0 = 0;
  const t1 = t0 + knot(p0, p1);
  const t2 = t1 + knot(p1, p2);
  const t3 = t2 + knot(p2, p3);
  const t = t1 + (t2 - t1) * u;
  const a1 = mix(p0, p1, t0, t1, t);
  const a2 = mix(p1, p2, t1, t2, t);
  const a3 = mix(p2, p3, t2, t3, t);
  const b1 = mix(a1, a2, t0, t2, t);
  const b2 = mix(a2, a3, t1, t3, t);
  return mix(b1, b2, t1, t2, t);
}

/** Wrap an angle in degrees into (−180, 180]. */
const wrap180 = (d: number) => {
  const w = ((((d + 180) % 360) + 360) % 360) - 180;
  return w === -180 ? 180 : w;
};

/**
 * A periodic channel through `values` at `times` (from 0, rising, each
 * key's), its period `period`, and `winding` added each time round (a
 * yaw that turns once round the loop: 360). Cubic Hermite, its slopes the
 * non-uniform three-point derivative (none at a key where it turns back,
 * so it never overshoots one), so it is smooth through every key and
 * across the seam.
 */
function periodicChannel(
  values: readonly number[],
  times: readonly number[],
  period: number,
  winding: number,
) {
  const n = values.length;
  const at = (i: number) => {
    const k = Math.floor(i / n);
    const j = i - k * n;
    return { v: values[j] + k * winding, t: times[j] + k * period };
  };
  const slopes = values.map((_, i) => {
    const a = at(i - 1),
      b = at(i),
      c = at(i + 1);
    const h0 = b.t - a.t,
      h1 = c.t - b.t;
    if (h0 < EPS || h1 < EPS) return 0;
    const d0 = (b.v - a.v) / h0,
      d1 = (c.v - b.v) / h1;
    // Where it turns back (or holds), it comes to rest at the key, so it
    // never swings past a pose the owner framed (Fritsch and Carlson's
    // first condition).
    if (d0 * d1 <= 0) return 0;
    return (h1 * d0 + h0 * d1) / (h0 + h1);
  });
  return (seconds: number) => {
    const turns = Math.floor(seconds / period);
    const t = seconds - turns * period;
    let i = n - 1;
    while (i > 0 && times[i] > t) i--;
    const a = at(i),
      b = at(i + 1);
    const h = b.t - a.t;
    const m0 = slopes[i] * h,
      m1 = slopes[(i + 1) % n] * h;
    const s = h < EPS ? 0 : (t - a.t) / h;
    const s2 = s * s,
      s3 = s2 * s;
    const v =
      (2 * s3 - 3 * s2 + 1) * a.v +
      (s3 - 2 * s2 + s) * m0 +
      (-2 * s3 + 3 * s2) * b.v +
      (s3 - s2) * m1;
    return v + turns * winding;
  };
}

/** Samples of each segment in its arc-length table. */
const SAMPLES = 64;

/** Walls a loop's camera keeps inside, metres. */
export interface CameraBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * A closed loop through `keys`, flown at `speed` metres a second: its
 * period, each key's time round it, and its pose at any time (wrapping
 * round). Two keys or more. Given `within`, its camera never strays
 * outside those walls, where a curve flown close along one would bulge a
 * little through it.
 */
export function createCameraLoop(
  keys: readonly CameraKey[],
  speed: number,
  within?: CameraBounds,
) {
  const n = keys.length;
  if (n < 2) throw new Error('A camera loop needs two keys or more');
  const points: V3[] = keys.map((k) => [k.x, k.y, k.z]);
  const p = (i: number) => points[((i % n) + n) % n];
  const segment = (i: number, u: number) =>
    centripetal(p(i - 1), p(i), p(i + 1), p(i + 2), u);
  // Each segment's arc-length table: (u, distance from its start).
  const tables = points.map((_, i) => {
    const lengths = [0];
    let last = segment(i, 0);
    for (let k = 1; k <= SAMPLES; k++) {
      const next = segment(i, k / SAMPLES);
      lengths.push(lengths[k - 1] + dist(last, next));
      last = next;
    }
    return lengths;
  });
  const starts = [0];
  for (const t of tables) starts.push(starts[starts.length - 1] + t[SAMPLES]);
  const length = starts[n];
  const period = length / speed;
  const times = starts.slice(0, n).map((s) => s / speed);
  /** The position `s` metres round the loop. */
  const positionAt = (s: number): V3 => {
    const d = ((s % length) + length) % length;
    let i = n - 1;
    while (i > 0 && starts[i] > d) i--;
    const table = tables[i];
    const local = d - starts[i];
    let lo = 0,
      hi = SAMPLES;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (table[mid] <= local) lo = mid;
      else hi = mid;
    }
    const span = table[hi] - table[lo];
    const u = (lo + (span < EPS ? 0 : (local - table[lo]) / span)) / SAMPLES;
    return segment(i, u);
  };
  /** An angle channel, unwrapped to the shortest turn between keys. */
  const angles = (pick: (k: CameraKey) => number) => {
    const unwrapped = [pick(keys[0])];
    for (let i = 1; i < n; i++)
      unwrapped.push(
        unwrapped[i - 1] + wrap180(pick(keys[i]) - pick(keys[i - 1])),
      );
    // Back round to the first key: how far it has turned in all.
    const back = unwrapped[n - 1] + wrap180(pick(keys[0]) - pick(keys[n - 1]));
    return periodicChannel(unwrapped, times, period, back - unwrapped[0]);
  };
  const yaw = angles((k) => k.yaw);
  const pitch = angles((k) => k.pitch);
  const roll = angles((k) => k.roll ?? 0);
  const zoom = periodicChannel(
    keys.map((k) => Math.log(k.zoom ?? 1)),
    times,
    period,
    0,
  );
  const radians = (d: number) => (d * Math.PI) / 180;
  return {
    /** Metres round it, and seconds to fly it. */
    length,
    period,
    /** Each key's time round it, seconds. */
    times,
    /** The pose `seconds` into its flight, round and round. */
    sample(seconds: number): CameraSample {
      const [x, y, z] = positionAt(seconds * speed);
      const clamp = (v: number, lo: number, hi: number) =>
        Math.min(hi, Math.max(lo, v));
      return {
        x: within ? clamp(x, within.minX, within.maxX) : x,
        y,
        z: within ? clamp(z, within.minZ, within.maxZ) : z,
        yaw: radians(yaw(seconds)),
        pitch: radians(pitch(seconds)),
        roll: radians(roll(seconds)),
        zoom: Math.exp(zoom(seconds)),
      };
    },
  };
}

export type CameraLoop = ReturnType<typeof createCameraLoop>;
