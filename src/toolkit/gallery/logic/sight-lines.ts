/**
 * Sight lines: whether a straight line from a reader's eye to a sign is
 * crossed by a pipe (a run of straight segments of a given bore) or a
 * column (an upright box). Pure; metres.
 */
export type V3 = readonly [number, number, number];

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** The least distance between segments `p0p1` and `q0q1`. */
export function segmentDistance(p0: V3, p1: V3, q0: V3, q1: V3): number {
  const d1 = sub(p1, p0);
  const d2 = sub(q1, q0);
  const r = sub(p0, q0);
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  let s = 0;
  let t = 0;
  if (a < 1e-12 && e < 1e-12) return Math.sqrt(dot(r, r));
  if (a < 1e-12) t = clamp(f / e);
  else {
    const c = dot(d1, r);
    if (e < 1e-12) s = clamp(-c / a);
    else {
      const b = dot(d1, d2);
      const den = a * e - b * b;
      s = den > 1e-12 ? clamp((b * f - c * e) / den) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a);
      }
    }
  }
  const cp: V3 = [p0[0] + d1[0] * s, p0[1] + d1[1] * s, p0[2] + d1[2] * s];
  const cq: V3 = [q0[0] + d2[0] * t, q0[1] + d2[1] * t, q0[2] + d2[2] * t];
  const d = sub(cp, cq);
  return Math.sqrt(dot(d, d));
}

/** Whether segment `a`→`b` passes through the box. */
export function segmentHitsBox(a: V3, b: V3, min: V3, max: V3): boolean {
  let t0 = 0;
  let t1 = 1;
  for (let k = 0; k < 3; k++) {
    const d = b[k] - a[k];
    if (Math.abs(d) < 1e-12) {
      if (a[k] < min[k] || a[k] > max[k]) return false;
      continue;
    }
    let ta = (min[k] - a[k]) / d;
    let tb = (max[k] - a[k]) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

export interface SightPipe {
  name: string;
  od: number;
  points: readonly V3[];
}
export interface SightBox {
  name: string;
  min: V3;
  max: V3;
}

/** What crosses the sight line from `eye` to `sign`: the names of the pipes and boxes in the way. */
export function sightBlockers(
  eye: V3,
  sign: V3,
  pipes: readonly SightPipe[],
  boxes: readonly SightBox[],
): string[] {
  const out: string[] = [];
  for (const p of pipes)
    for (let i = 1; i < p.points.length; i++)
      if (segmentDistance(eye, sign, p.points[i - 1], p.points[i]) < p.od / 2) {
        out.push(p.name);
        break;
      }
  for (const b of boxes)
    if (segmentHitsBox(eye, sign, b.min, b.max)) out.push(b.name);
  return out;
}
