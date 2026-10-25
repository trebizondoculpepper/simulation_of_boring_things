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
  /**
   * On an open path, the least time to reach this key from the one before,
   * seconds: the owner's own pacing, where a stretch should take longer
   * than its flight, turn and zoom would.
   */
  seconds?: number;
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
 * round). Two keys or more; two make a dolly (`createDolly`). Given
 * `within`, its camera never strays outside those walls, where a curve
 * flown close along one would bulge a little through it.
 */
export function createCameraLoop(
  keys: readonly CameraKey[],
  speed: number,
  within?: CameraBounds,
): CameraMove {
  const n = keys.length;
  if (n < 2) throw new Error('A camera loop needs two keys or more');
  if (n === 2) return createDolly(keys[0], keys[1], speed);
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
    open: false,
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

/** A camera move: a loop, a dolly, or an open path. */
export interface CameraMove {
  /** An open path runs once, start to end; a loop or a dolly goes round. */
  open: boolean;
  /** Metres along it, and seconds to fly it (once round, or start to end). */
  length: number;
  period: number;
  /** Each key's time along it, seconds. */
  times: readonly number[];
  /** The pose `seconds` into it: round and round, or held at its ends. */
  sample(seconds: number): CameraSample;
}

/** A loop, by its old name. */
export type CameraLoop = CameraMove;

/**
 * Two keys: a dolly, out from the first to the second and back, round and
 * round, slowing to rest at each end and easing away again (a half cosine
 * each way, its average speed `speed`); its yaw, pitch, roll and zoom eased
 * with it, the short way round. A loop through two points would run out
 * and back along one line and turn about at full speed.
 */
function createDolly(a: CameraKey, b: CameraKey, speed: number) {
  const length = Math.max(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), 1e-6);
  const leg = length / speed;
  const period = 2 * leg;
  const turn = (from: number, to: number) => from + wrap180(to - from);
  const radians = (d: number) => (d * Math.PI) / 180;
  const ends = {
    yaw: [a.yaw, turn(a.yaw, b.yaw)],
    pitch: [a.pitch, b.pitch],
    roll: [a.roll ?? 0, turn(a.roll ?? 0, b.roll ?? 0)],
    zoom: [Math.log(a.zoom ?? 1), Math.log(b.zoom ?? 1)],
  };
  return {
    open: false,
    length: 2 * length,
    period,
    times: [0, leg],
    sample(seconds: number): CameraSample {
      const t = ((seconds % period) + period) % period;
      // Out, 0 to 1 over its leg, and back: eased at each end.
      const f = (1 - Math.cos((Math.PI * t) / leg)) / 2;
      const at = ([from, to]: number[]) => from + (to - from) * f;
      return {
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        z: a.z + (b.z - a.z) * f,
        yaw: radians(at(ends.yaw)),
        pitch: radians(at(ends.pitch)),
        roll: radians(at(ends.roll)),
        zoom: Math.exp(at(ends.zoom)),
      };
    },
  };
}

/** How fast an open path turns and zooms at most, degrees and log-zoom a second. */
export const PATH_RATES = { turn: 30, zoom: 0.3, hold: 0.5 } as const;

/**
 * An open path through `keys` (the owner, 2026-10-25: "this one isn't
 * supposed to be an orbit"): from the first to the last, once, easing from
 * rest and to rest. Its line is a centripetal Catmull-Rom spline through
 * the keys' positions, its ends mirrored. Each stretch between keys takes
 * as long as the slowest of: flying it at `speed`, turning its yaw, pitch
 * or roll at `PATH_RATES.turn`, changing its zoom at `PATH_RATES.zoom`,
 * and `PATH_RATES.hold`; so two keys in one place, the camera only turning
 * between them, still take their time. Its distance along the line in time
 * is a monotone cubic through each key's time and distance (Fritsch and
 * Carlson), so it never runs backwards, meets each key on time, and its
 * speed changes smoothly through every key; its angles and zoom are cubic
 * in the same times, never swinging past a key.
 */
export function createCameraPath(
  keys: readonly CameraKey[],
  speed: number,
  /** Walls its camera keeps inside, where its curve would bulge through one (as a loop's). */
  within?: CameraBounds,
): CameraMove {
  const n = keys.length;
  if (n < 2) throw new Error('A camera path needs two keys or more');
  const points: V3[] = keys.map((k) => [k.x, k.y, k.z]);
  const p = (i: number): V3 => {
    if (i < 0) {
      const [a, b] = [points[0], points[1]];
      return [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
    }
    if (i > n - 1) {
      const [a, b] = [points[n - 1], points[n - 2]];
      return [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
    }
    return points[i];
  };
  const segment = (i: number, u: number) =>
    centripetal(p(i - 1), p(i), p(i + 1), p(i + 2), u);
  const tables = points.slice(0, n - 1).map((_, i) => {
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
  const length = starts[n - 1];
  // Each channel unwrapped the short way between keys.
  const unwrap = (pick: (k: CameraKey) => number) => {
    const out = [pick(keys[0])];
    for (let i = 1; i < n; i++)
      out.push(out[i - 1] + wrap180(pick(keys[i]) - pick(keys[i - 1])));
    return out;
  };
  const yaws = unwrap((k) => k.yaw);
  const pitches = unwrap((k) => k.pitch);
  const rolls = unwrap((k) => k.roll ?? 0);
  const zooms = keys.map((k) => Math.log(k.zoom ?? 1));
  // Each stretch's time: the slowest of its flight, its turn and its zoom.
  const times = [0];
  for (let i = 0; i < n - 1; i++) {
    const turn = Math.max(
      Math.abs(yaws[i + 1] - yaws[i]),
      Math.abs(pitches[i + 1] - pitches[i]),
      Math.abs(rolls[i + 1] - rolls[i]),
    );
    times.push(
      times[i] +
        Math.max(
          (starts[i + 1] - starts[i]) / speed,
          turn / PATH_RATES.turn,
          Math.abs(zooms[i + 1] - zooms[i]) / PATH_RATES.zoom,
          PATH_RATES.hold,
          keys[i + 1].seconds ?? 0,
        ),
    );
  }
  const period = times[n - 1];
  const distance = monotoneChannel(starts, times);
  const yaw = monotoneChannel(yaws, times);
  const pitch = monotoneChannel(pitches, times);
  const roll = monotoneChannel(rolls, times);
  const zoom = monotoneChannel(zooms, times);
  /** The position `d` metres along the line. */
  const positionAt = (d: number): V3 => {
    const at = Math.min(length, Math.max(0, d));
    let i = n - 2;
    while (i > 0 && starts[i] > at) i--;
    const table = tables[i];
    const local = at - starts[i];
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
  const radians = (d: number) => (d * Math.PI) / 180;
  return {
    open: true,
    length,
    period,
    times,
    sample(seconds: number): CameraSample {
      const t = Math.min(period, Math.max(0, seconds));
      const [x, y, z] = positionAt(distance(t));
      const clamp = (v: number, lo: number, hi: number) =>
        Math.min(hi, Math.max(lo, v));
      return {
        x: within ? clamp(x, within.minX, within.maxX) : x,
        y,
        z: within ? clamp(z, within.minZ, within.maxZ) : z,
        yaw: radians(yaw(t)),
        pitch: radians(pitch(t)),
        roll: radians(roll(t)),
        zoom: Math.exp(zoom(t)),
      };
    },
  };
}

/**
 * An open channel through `values` at `times`: a cubic Hermite, its slopes
 * the three-point derivative but none where it turns back or holds (so it
 * never overshoots a key) and none at its ends (it eases from rest and to
 * rest), each limited after Fritsch and Carlson so a rising stretch never
 * dips. Held at its ends beyond them.
 */
function monotoneChannel(values: readonly number[], times: readonly number[]) {
  const n = values.length;
  const h = (i: number) => times[i + 1] - times[i];
  const d = (i: number) =>
    h(i) < EPS ? 0 : (values[i + 1] - values[i]) / h(i);
  const slopes = values.map((_, i) => {
    if (i === 0 || i === n - 1) return 0;
    const d0 = d(i - 1),
      d1 = d(i);
    if (d0 * d1 <= 0) return 0;
    const m = (h(i) * d0 + h(i - 1) * d1) / (h(i - 1) + h(i));
    // Fritsch and Carlson: no more than three times either side's slope.
    return (
      Math.sign(m) * Math.min(Math.abs(m), 3 * Math.abs(d0), 3 * Math.abs(d1))
    );
  });
  return (t: number) => {
    if (t <= times[0]) return values[0];
    if (t >= times[n - 1]) return values[n - 1];
    let i = n - 2;
    while (i > 0 && times[i] > t) i--;
    const span = h(i);
    const s = span < EPS ? 1 : (t - times[i]) / span;
    const s2 = s * s,
      s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * values[i] +
      (s3 - 2 * s2 + s) * slopes[i] * span +
      (-2 * s3 + 3 * s2) * values[i + 1] +
      (s3 - s2) * slopes[i + 1] * span
    );
  };
}
