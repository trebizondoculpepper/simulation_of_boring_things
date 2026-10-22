/**
 * Pipe supports: how far apart a run's supports may be, by what it is
 * made of and its size, and where each of a run's supports goes and what
 * it is fixed to (`doc/prompts/008-pipe-supports.md`). Pure: metres, the
 * room's floor at y = 0.
 *
 * The rules, after UK practice of the plant's period:
 *
 * - **Spacing.** Supports at most one spacing apart along every
 *   horizontal length, and at the vertical spacing up a riser that has a
 *   wall to clamp to. Closer for plastic, for small bores and, for
 *   plastic, for warm water.
 * - **Fittings.** One within 300 mm of every bend, tee and valve, so a
 *   fitting's weight never hangs on the pipe.
 * - **What holds it.** A run within reach of a wall that runs beside it
 *   is bracketed to the wall; one low down stands on the floor; one out
 *   in the room hangs from the soffit on drop rods. Hangers side by side
 *   share a trapeze; a pipe with another right over it hangs on a
 *   trapeze of its own, its rods either side of the pipe above. A run
 *   close beside a machine may be bracketed off the machine's frame. A
 *   run under the floor lies in its duct. Pipe inside a machine is
 *   carried by the machine.
 * - **The ends of a run are held** by what they meet: a machine's port, a
 *   wall it passes through, the services ceiling it rises into, the floor
 *   or a tee on its main. A riser out in the room, with no wall near, is
 *   held at its two ends, as a drop to a machine is.
 * - **Nothing is skipped silently**: a support that cannot be placed, its
 *   rod, bracket or stand blocked whichever way it is tried, is returned
 *   as a problem.
 */
import type { PipeKindId } from '../../core/views/pipe-kinds';

export type Vec3 = readonly [number, number, number];

/** A support's distance from a bend, tee or valve, at most, metres. */
export const NEAR_FITTING = 0.3;
/** And where the planner puts it: a little nearer, to leave room to shift. */
const AT_FITTING = 0.2;
/** The most a support by a bend or fitting may move round an obstacle. */
const FIXED_SHIFT = NEAR_FITTING - AT_FITTING;
/** And any other, round an obstacle or onto a trapeze. */
const FILL_SHIFT = 0.15;
/** Under this over the floor, a run stands on the floor rather than hanging. */
export const LOW = 2.0;
/** A run this near a wall beside it, surface to face, is bracketed to the wall. */
export const WALL_REACH = 0.35;
/** A landing's rail over its deck, and the deck's depth (`roomStructure`). */
const LANDING_RAIL = 1.1;
const LANDING_DEPTH = 0.1;
/** A run this near a machine, surface to frame, may be bracketed off it. */
export const MACHINE_REACH = 0.4;
/** The heating's lagging (`pipe-kinds.ts`, `lagged-heating`): its hangers go round it. */
export const LAGGED_HEATING_INSULATION = 0.04;

export interface Spacing {
  /** The most between supports along a horizontal length, and up a riser. */
  horizontal: number;
  vertical: number;
}

/** The spacing for the first band of `bands` whose largest size takes `od`, or the last. */
const band = (
  od: number,
  bands: readonly (readonly [number, number, number])[],
): Spacing => {
  const b = bands.find(([max]) => od <= max + 1e-9) ?? bands[bands.length - 1];
  return { horizontal: b[1], vertical: b[2] };
};

/**
 * The spacing for a run, by what it is and its outside diameter: copper
 * after the UK Copper Board's figures; steel after Engineering ToolBox's
 * table; steel conduit after the IET On-Site Guide's Table 4.12; PVC-U
 * pressure pipe after Vinidex (AS/NZS 2032), its horizontal spacing cut a
 * quarter for every 10 °C above 20 °C; PVC-U drainage after makers' soil
 * and waste guides; chemical tube clipped every 0.4 m. Null for what
 * needs no supports of its own: flexible hose and cable, which lie where
 * they fall between their ends.
 */
export function supportSpacing(
  kind: PipeKindId | 'rectangular-duct' | 'flex-cable',
  od: number,
  { conduit = false, temperature = 20 } = {},
): Spacing | null {
  if (conduit)
    return band(od, [
      [0.016, 0.75, 1.0],
      [0.025, 1.75, 2.0],
      [0.04, 2.0, 2.25],
      [Infinity, 2.25, 2.5],
    ]);
  switch (kind) {
    case 'flex-cable':
    case 'pressure-hose':
      return null;
    case 'rectangular-duct':
      return { horizontal: 3.0, vertical: 3.0 };
    case 'copper':
      return band(od, [
        [0.022, 1.2, 1.8],
        [0.028, 1.8, 2.4],
        [0.054, 2.4, 3.0],
        [Infinity, 2.7, 3.0],
      ]);
    case 'steel-screwed':
    case 'steel-flanged':
    case 'grooved-fire':
    case 'stainless':
    case 'lagged-heating':
      return band(od, [
        [0.02, 1.5, 1.8],
        [0.06, 2.4, 3.0],
        [Infinity, 3.0, 3.6],
      ]);
    case 'pvc-pressure':
    case 'abs-chemical': {
      const s = band(od, [
        [0.032, 0.9, 1.8],
        [0.05, 1.1, 2.2],
        [0.075, 1.3, 2.6],
        [0.11, 1.5, 3.0],
        [0.16, 1.8, 3.0],
        [0.25, 2.1, 3.0],
        [Infinity, 2.4, 3.0],
      ]);
      const warm = Math.max(0.4, 1 - 0.025 * Math.max(0, temperature - 20));
      return { horizontal: s.horizontal * warm, vertical: s.vertical };
    }
    case 'pvc-drain':
      return band(od, [
        [0.05, 0.5, 1.2],
        [0.075, 0.8, 1.5],
        [0.11, 1.1, 2.0],
        [Infinity, 1.2, 2.0],
      ]);
    case 'chemical-tube':
      return { horizontal: 0.4, vertical: 0.4 };
    case 'flue':
    case 'twin-wall-flue':
      return { horizontal: 1.8, vertical: 2.0 };
  }
}

// ---- The planner ---------------------------------------------------------------

/** A run to support: as drawn, in the room's frame. */
export interface SupportRun {
  name: string;
  kind: PipeKindId | 'rectangular-duct' | 'flex-cable';
  od: number;
  /** Its outside radius, round its lagging if lagged. */
  radius: number;
  points: readonly Vec3[];
  /** Its valves and tees: each wants a support within `NEAR_FITTING`. */
  fittings?: readonly Vec3[];
  /** Its water's temperature, °C, for plastic. */
  temperature?: number;
  /** An electrical conduit: spaced by the wiring regulations. */
  conduit?: boolean;
  /** A machine's own pipework: carried by that machine's frame. */
  carriedBy?: string;
}

/** A box no support may pass through: a machine, a doorway's clear space, a landing. */
export interface SupportObstacle {
  name: string;
  /** A machine (whose frame may carry a bracket), or a clear space or landing. */
  kind?: 'machine' | 'clear' | 'landing';
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/** The room as the planner needs it (`roomStructure` gives it). */
export interface SupportStructure {
  soffit: number;
  walls: Readonly<Record<'west' | 'east' | 'north' | 'south', number>>;
  obstacles: readonly SupportObstacle[];
}

export type SupportType =
  | 'hanger'
  | 'trapeze'
  | 'in-duct'
  | 'wall-bracket'
  | 'wall-clamp'
  | 'floor-stand'
  | 'machine';

export interface Support {
  run: string;
  type: SupportType;
  /** On the pipe's centre line. */
  at: Vec3;
  /** Where it meets the structure: the soffit, a wall's face, the floor, or the machine. */
  to: Vec3;
  /** The pipe's outside radius there. */
  radius: number;
  /** The way the pipe runs there. */
  along: 'x' | 'y' | 'z';
  /** A trapeze's: the shared channel, between its two rods. */
  trapeze?: number;
  /** A trapeze of its own: its channel's ends, each with its rod up to the soffit. */
  own?: readonly [Vec3, Vec3];
}

export interface Trapeze {
  /** The channel's ends, under the pipes it carries, and its rods' tops. */
  from: Vec3;
  to: Vec3;
  top: number;
  runs: string[];
}

export interface SupportPlan {
  supports: Support[];
  trapezes: Trapeze[];
  problems: string[];
}

// ---- Geometry -------------------------------------------------------------------

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3) => Math.sqrt(dot(a, a));

/** The nearest distance between two segments. */
function segmentDistance(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3) {
  const d1 = sub(q1, p1);
  const d2 = sub(q2, p2);
  const r = sub(p1, p2);
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  let s = 0;
  let t = 0;
  if (a <= 1e-12 && e > 1e-12) t = Math.min(1, Math.max(0, f / e));
  else if (a > 1e-12) {
    const c = dot(d1, r);
    if (e <= 1e-12) s = Math.min(1, Math.max(0, -c / a));
    else {
      const b = dot(d1, d2);
      const den = a * e - b * b;
      s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.min(1, Math.max(0, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.min(1, Math.max(0, (b - c) / a));
      }
    }
  }
  return len(sub(add(p1, scale(d1, s)), add(p2, scale(d2, t))));
}

/** Whether a segment, thickened by `r`, passes through a box. */
function hitsBox(a: Vec3, b: Vec3, r: number, box: SupportObstacle) {
  let t0 = 0;
  let t1 = 1;
  const lo = [box.minX - r, box.minY - r, box.minZ - r];
  const hi = [box.maxX + r, box.maxY + r, box.maxZ + r];
  for (let k = 0; k < 3; k++) {
    const d = b[k] - a[k];
    if (Math.abs(d) < 1e-12) {
      if (a[k] <= lo[k] || a[k] >= hi[k]) return false;
      continue;
    }
    let u = (lo[k] - a[k]) / d;
    let v = (hi[k] - a[k]) / d;
    if (u > v) [u, v] = [v, u];
    t0 = Math.max(t0, u);
    t1 = Math.min(t1, v);
    if (t0 >= t1) return false;
  }
  return true;
}

interface Piece {
  run: SupportRun;
  a: Vec3;
  b: Vec3;
}

/** Which way a straight runs: along x or z (level, or nearly, as a drain falls), or y. */
function axisOf(a: Vec3, b: Vec3): 'x' | 'y' | 'z' {
  const d = sub(b, a);
  const level = Math.hypot(d[0], d[2]);
  if (Math.abs(d[1]) > level) return 'y';
  return Math.abs(d[0]) >= Math.abs(d[2]) ? 'x' : 'z';
}

/** The points with repeats dropped and points in line merged. */
function clean(points: readonly Vec3[]): Vec3[] {
  const kept: Vec3[] = [];
  for (const p of points)
    if (!kept.length || len(sub(p, kept[kept.length - 1])) > 1e-6) kept.push(p);
  return kept.filter((p, i) => {
    if (i === 0 || i === kept.length - 1) return true;
    const u = sub(p, kept[i - 1]);
    const v = sub(kept[i + 1], p);
    return dot(u, v) / (len(u) * len(v)) < 1 - 1e-9;
  });
}

// ---- Planning ---------------------------------------------------------------------

/**
 * Every run's supports, in one room: placed by the rules above, each
 * fixed to structure along a path clear of the room's obstacles and of
 * the other runs, hangers side by side gathered onto trapezes.
 */
export function planSupports(
  runs: readonly SupportRun[],
  structure: SupportStructure,
): SupportPlan {
  const supports: Support[] = [];
  const problems: string[] = [];
  // Each support's straight, and those held by a bend or fitting, which
  // may not move onto a trapeze.
  const pieceOf = new Map<Support, Piece>();
  const pinned = new Set<Support>();
  const pieces: Piece[] = runs.flatMap((run) => {
    const p = clean(run.points);
    return p.slice(1).map((b, i) => ({ run, a: p[i], b }));
  });
  const W = structure.walls;

  /** Whether a support's member, from `a` to `b`, passes clear of everything but its own pipe. */
  const clear = (
    a: Vec3,
    b: Vec3,
    self: Piece,
    /** What the member is fixed to, which it may meet. */
    fixedTo?: SupportObstacle,
  ) =>
    structure.obstacles.every(
      (o) => o === fixedTo || !hitsBox(a, b, 0.01, o),
    ) &&
    pieces.every(
      (p) =>
        p === self || segmentDistance(a, b, p.a, p.b) > p.run.radius + 0.012,
    );

  /** The wall beside a straight along `axis` within reach of `at`, if any: its name and face. */
  const wallBeside = (at: Vec3, axis: 'x' | 'y' | 'z', reach: number) => {
    const sides =
      axis === 'x'
        ? (['north', 'south'] as const)
        : axis === 'z'
          ? (['west', 'east'] as const)
          : (['west', 'east', 'north', 'south'] as const);
    let best: { to: Vec3; gap: number } | null = null;
    for (const side of sides) {
      const face = W[side];
      const k = side === 'west' || side === 'east' ? 0 : 2;
      const gap = Math.abs(at[k] - face);
      if (gap > reach) continue;
      const to = [...at] as [number, number, number];
      to[k] = face;
      if (!best || gap < best.gap) best = { to, gap };
    }
    return best;
  };

  /** A support at `at` on piece `piece`, by the first way of holding it whose member is clear. */
  const holdAt = (at: Vec3, piece: Piece): Support | null => {
    const { run } = piece;
    const r = run.radius;
    const along = axisOf(piece.a, piece.b);
    if (run.carriedBy)
      return { run: run.name, type: 'machine', at, to: at, radius: r, along };
    // Under the floor: in its duct, on the duct's bed.
    if (at[1] < 0)
      return {
        run: run.name,
        type: 'in-duct',
        at,
        to: [at[0], at[1] - r, at[2]],
        radius: r,
        along,
      };
    const tries: (() => Support | null)[] = [];
    const bracket =
      (reach: number, type: 'wall-bracket' | 'wall-clamp') => () => {
        const w = wallBeside(at, along, r + reach);
        if (!w) return null;
        const from = add(
          at,
          scale(
            sub(w.to, at),
            Math.min(1, (r + 0.005) / Math.max(w.gap, 1e-9)),
          ),
        );
        return clear(from, w.to, piece)
          ? { run: run.name, type, at, to: w.to, radius: r, along }
          : null;
      };
    const stand = () => {
      const bottom = at[1] - r;
      if (bottom < 0.05) return null;
      const foot: Vec3 = [at[0], 0, at[2]];
      return clear([at[0], bottom, at[2]], foot, piece)
        ? {
            run: run.name,
            type: 'floor-stand' as const,
            at,
            to: foot,
            radius: r,
            along,
          }
        : null;
    };
    const hanger = () => {
      const top = at[1] + r;
      if (top >= structure.soffit - 0.02) return null;
      const fix: Vec3 = [at[0], structure.soffit, at[2]];
      return clear([at[0], top, at[2]], fix, piece)
        ? {
            run: run.name,
            type: 'hanger' as const,
            at,
            to: fix,
            radius: r,
            along,
          }
        : null;
    };
    /**
     * A trapeze of its own: a channel under the pipe, its two rods either
     * side, clear of a pipe right over it.
     */
    const ownTrapeze = () => {
      if (along === 'y') return null;
      const k = along === 'x' ? 2 : 0;
      const y = at[1] - r - 0.03;
      for (const reach of [0.15, 0.25, 0.4, 0.6]) {
        const ends = [-1, 1].map((side) => {
          const p = [...at] as [number, number, number];
          p[k] += side * (r + reach);
          p[1] = y;
          return p as Vec3;
        });
        if (ends.every((p) => clear(p, [p[0], structure.soffit, p[2]], piece)))
          return {
            run: run.name,
            type: 'trapeze' as const,
            at,
            to: [at[0], y, at[2]] as Vec3,
            radius: r,
            along,
            own: ends as [Vec3, Vec3],
          };
      }
      return null;
    };
    /** A bracket off the frame of a machine close beside it. */
    const machineBracket = () => {
      for (const o of structure.obstacles) {
        if (o.kind !== 'machine') continue;
        const nearest: Vec3 = [
          Math.min(o.maxX, Math.max(o.minX, at[0])),
          Math.min(o.maxY, Math.max(o.minY, at[1])),
          Math.min(o.maxZ, Math.max(o.minZ, at[2])),
        ];
        // Inside its envelope, the gap is negative: one of the machine's
        // own connections, on its frame.
        const gap = len(sub(nearest, at)) - r;
        if (gap > MACHINE_REACH) continue;
        return {
          run: run.name,
          type: 'machine' as const,
          at,
          to: nearest,
          radius: r,
          along,
        };
      }
      return null;
    };
    /** Under a landing or gantry: hung from its deck's underside. */
    const underLanding = () => {
      for (const o of structure.obstacles) {
        if (o.kind !== 'landing') continue;
        if (
          at[0] < o.minX ||
          at[0] > o.maxX ||
          at[2] < o.minZ ||
          at[2] > o.maxZ
        )
          continue;
        const deck = o.maxY - LANDING_RAIL - LANDING_DEPTH;
        if (at[1] + r >= deck) continue;
        const fix: Vec3 = [at[0], deck, at[2]];
        if (clear([at[0], at[1] + r, at[2]], fix, piece, o))
          return {
            run: run.name,
            type: 'hanger' as const,
            at,
            to: fix,
            radius: r,
            along,
          };
      }
      return null;
    };
    /** A riser clamp on a drop rod beside the riser, from the soffit. */
    const riserRod = () => {
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const side = r + 0.08;
        const p: Vec3 = [at[0] + dx * side, at[1], at[2] + dz * side];
        const top: Vec3 = [p[0], structure.soffit, p[2]];
        if (clear(p, top, piece))
          return {
            run: run.name,
            type: 'hanger' as const,
            at,
            to: top,
            radius: r,
            along,
          };
      }
      return null;
    };
    if (along === 'y')
      tries.push(
        bracket(WALL_REACH, 'wall-clamp'),
        bracket(1.0, 'wall-clamp'),
        machineBracket,
        riserRod,
      );
    else {
      tries.push(underLanding);
      tries.push(bracket(WALL_REACH, 'wall-bracket'));
      if (at[1] < LOW) tries.push(stand, hanger, ownTrapeze);
      else tries.push(hanger, ownTrapeze, stand);
      // A longer bracket off a wall a little further away, or off a
      // machine beside it.
      tries.push(bracket(1.0, 'wall-bracket'), machineBracket);
    }
    for (const t of tries) {
      const s = t();
      if (s) return s;
    }
    return null;
  };

  for (const run of runs) {
    const spacing = supportSpacing(run.kind, run.od, {
      conduit: run.conduit,
      temperature: run.temperature,
    });
    if (!spacing) continue;
    const mine = pieces.filter((p) => p.run === run);
    const fittings = run.fittings ?? [];
    for (const [i, piece] of mine.entries()) {
      const { a, b } = piece;
      const L = len(sub(b, a));
      if (L < 1e-6) continue;
      const along = axisOf(a, b);
      const vertical = along === 'y';
      // A riser with no wall to clamp to is held at its ends, unless a
      // fitting on it needs one of its own.
      const open =
        vertical &&
        !run.carriedBy &&
        !wallBeside(a, 'y', run.radius + WALL_REACH);
      const gap = vertical ? spacing.vertical : spacing.horizontal;
      // Where it must have a support: near each bend it ends at, held from
      // the level side where there is one (the run's own ends are held by
      // what they meet), and beside each fitting on it.
      const level = (k: number) =>
        k >= 0 && k < mine.length && axisOf(mine[k].a, mine[k].b) !== 'y';
      const wanted: number[] = [];
      if (i > 0 && (!vertical || !level(i - 1)))
        wanted.push(Math.min(AT_FITTING, L / 2));
      if (i < mine.length - 1 && (!vertical || !level(i + 1)))
        wanted.push(Math.max(L - AT_FITTING, L / 2));
      const first = clean(run.points)[0];
      const last = clean(run.points).at(-1)!;
      for (const f of fittings) {
        // At the run's very end: held by what the run meets there.
        if (len(sub(f, first)) < 0.02 || len(sub(f, last)) < 0.02) continue;
        const t = dot(sub(f, a), sub(b, a)) / (L * L);
        if (t < -1e-6 || t > 1 + 1e-6) continue;
        if (len(sub(f, add(a, scale(sub(b, a), t)))) > 0.02) continue;
        const at = t * L;
        // Beside it, on whichever side has room.
        wanted.push(
          at + AT_FITTING <= L ? at + AT_FITTING : Math.max(0, at - AT_FITTING),
        );
      }
      // An open riser: only its fittings' supports, at the fitting's height.
      if (open) {
        wanted.length = 0;
        for (const f of fittings) {
          if (len(sub(f, first)) < 0.02 || len(sub(f, last)) < 0.02) continue;
          const t = dot(sub(f, a), sub(b, a)) / (L * L);
          if (t < -1e-6 || t > 1 + 1e-6) continue;
          if (len(sub(f, add(a, scale(sub(b, a), t)))) > 0.02) continue;
          wanted.push(Math.min(L, Math.max(0, t * L)));
        }
        if (!wanted.length) continue;
      }
      // Fill: the held points along it are its ends and the wanted
      // supports; no gap between them may exceed the spacing, less the
      // little a support may later move (round an obstacle, or onto a
      // trapeze).
      const fill = Math.max(gap - FILL_SHIFT, gap * 0.8);
      const held = [0, ...[...wanted].sort((x, y) => x - y), L];
      const positions = wanted.map((at) => ({ at, fixed: true }));
      for (let k = 1; !open && k < held.length; k++) {
        const span = held[k] - held[k - 1];
        const n = Math.ceil(span / fill - 1e-9) - 1;
        for (let m = 1; m <= n; m++)
          positions.push({
            at: held[k - 1] + (span * m) / (n + 1),
            fixed: false,
          });
      }
      for (const { at: s, fixed } of positions.sort((x, y) => x.at - y.at)) {
        const at = add(a, scale(sub(b, a), s / L));
        let placed = holdAt(at, piece);
        // Blocked: shift it a little along the pipe, either way.
        const most = fixed ? FIXED_SHIFT : FILL_SHIFT;
        for (let k = 1; !placed && k * 0.05 <= most + 1e-9; k++)
          for (const sign of [1, -1]) {
            const t = s + sign * k * 0.05;
            if (t <= 0.02 || t >= L - 0.02) continue;
            placed = holdAt(add(a, scale(sub(b, a), t / L)), piece);
            if (placed) break;
          }
        if (placed) {
          supports.push(placed);
          pieceOf.set(placed, piece);
          if (fixed) pinned.add(placed);
        } else
          problems.push(
            `${run.name}: no way to support it at (${at.map((v) => v.toFixed(2)).join(', ')})`,
          );
      }
    }
  }

  // Hangers side by side, on level runs the same way, onto one trapeze:
  // each moves along its own pipe to the trapeze's line.
  const trapezes: Trapeze[] = [];
  const hangers = supports.filter((s) => s.type === 'hanger' && !pinned.has(s));
  const used = new Set<Support>();
  const onPiece = (o: Support, at: number, lengthwise: 0 | 2) => {
    const p = pieceOf.get(o)!;
    const lo = Math.min(p.a[lengthwise], p.b[lengthwise]) + 0.02;
    const hi = Math.max(p.a[lengthwise], p.b[lengthwise]) - 0.02;
    return at >= lo && at <= hi;
  };
  for (const h of hangers) {
    if (used.has(h) || h.along === 'y') continue;
    const across = h.along === 'x' ? 2 : 0;
    const lengthwise = h.along === 'x' ? 0 : 2;
    const line = h.at[lengthwise];
    const group = hangers.filter(
      (o) =>
        o !== h &&
        !used.has(o) &&
        o.along === h.along &&
        o.run !== h.run &&
        Math.abs(o.at[lengthwise] - line) <= FILL_SHIFT &&
        Math.abs(o.at[across] - h.at[across]) <= 1.2 &&
        Math.abs(o.at[1] - h.at[1]) <= 0.3 &&
        onPiece(o, line, lengthwise),
    );
    if (!group.length) continue;
    const all = [h, ...group];
    const lo = Math.min(...all.map((o) => o.at[across] - o.radius)) - 0.1;
    const hi = Math.max(...all.map((o) => o.at[across] + o.radius)) + 0.1;
    const y = Math.min(...all.map((o) => o.at[1] - o.radius)) - 0.03;
    const point = (c: number): Vec3 =>
      lengthwise === 0 ? [line, y, c] : [c, y, line];
    const [from, to] = [point(lo), point(hi)];
    const members = new Set(all.map((o) => o.run));
    // Its two rods must be clear, as a hanger's would.
    const rodClear = (p: Vec3) => {
      const top: Vec3 = [p[0], structure.soffit, p[2]];
      return (
        structure.obstacles.every((o) => !hitsBox(p, top, 0.01, o)) &&
        pieces.every(
          (q) =>
            members.has(q.run.name) ||
            segmentDistance(p, top, q.a, q.b) > q.run.radius + 0.012,
        )
      );
    };
    if (!rodClear(from) || !rodClear(to)) continue;
    const index = trapezes.length;
    trapezes.push({ from, to, top: structure.soffit, runs: [...members] });
    for (const o of all) {
      used.add(o);
      // Along its own pipe to the line, at the pipe's height there (a
      // drain falls).
      const p = pieceOf.get(o)!;
      const t = (line - p.a[lengthwise]) / (p.b[lengthwise] - p.a[lengthwise]);
      const at = add(p.a, scale(sub(p.b, p.a), t));
      o.at = at;
      o.type = 'trapeze';
      o.trapeze = index;
      o.to = lengthwise === 0 ? [line, y, at[2]] : [at[0], y, line];
    }
  }
  return { supports, trapezes, problems };
}
