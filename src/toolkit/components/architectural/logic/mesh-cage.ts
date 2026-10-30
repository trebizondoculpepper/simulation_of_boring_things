/**
 * A welded-mesh cage's layout (the owner, 2026-10-30): the gas cylinder
 * cages in the goods yard, and any storage cage, after the galvanised
 * cylinder cages sold for BCGA CP 44 compounds: square-tube posts on a
 * regular spacing, top and bottom rails, 50 mm welded mesh infill on all
 * four sides, a mesh roof or none, a hinged mesh door in its own frame,
 * mesh partitions across it, and base plates or feet. Pure: where every
 * post, panel, partition and the door go, and the door's swing.
 *
 * Metres, in the cage's frame: its floor at y = 0, its middle at x = z =
 * 0, its front facing +z (the front at z = d/2, the back at z = −d/2, the
 * left end at x = −w/2, the right at x = w/2).
 */

export type CageSide = 'front' | 'back' | 'left' | 'right';

export interface CageDoorSpec {
  side: CageSide;
  /** The door's middle along its side, from the side's middle, metres (+ toward the side's +x or +z). */
  at: number;
  /** Its clear width, metres. */
  width: number;
  /** Its hinge's end, as one stands outside facing it. */
  hinge: 'left' | 'right';
  /** Which way it swings. */
  opens: 'out' | 'in';
}

export interface MeshCageSpec {
  w: number;
  d: number;
  h: number;
  door: CageDoorSpec;
  /** Posts at most this far apart, metres. */
  postSpacing?: number;
  /** A mesh roof, or an open top. */
  roof?: boolean;
  /** Mesh partitions across the cage, front to back, at these x. */
  partitions?: readonly number[];
  /** What it stands on. */
  base?: 'plates' | 'feet';
  /** The mesh's squares, and its wire's diameter, metres. */
  pitch?: number;
  wire?: number;
}

/** The usual: 1.2 m bays, 50 mm squares of 4 mm wire, a roof, base plates. */
export const CAGE_DEFAULTS = {
  postSpacing: 1.2,
  roof: true,
  base: 'plates',
  pitch: 0.05,
  wire: 0.004,
  /** The posts' square tube, and the rails' height off the ground. */
  post: 0.05,
  rail: 0.05,
  /** A regular post closer than this to a door jamb is left out. */
  clearOfJamb: 0.2,
} as const;

/** A side's length, and how a distance along it maps to (x, z). */
export function sideLine(w: number, d: number, side: CageSide) {
  const along = side === 'front' || side === 'back' ? 'x' : 'z';
  const length = along === 'x' ? w : d;
  const fixed =
    side === 'front'
      ? d / 2
      : side === 'back'
        ? -d / 2
        : side === 'left'
          ? -w / 2
          : w / 2;
  /** The outward normal, as (x, z). */
  const out: [number, number] =
    side === 'front'
      ? [0, 1]
      : side === 'back'
        ? [0, -1]
        : side === 'left'
          ? [-1, 0]
          : [1, 0];
  const at = (s: number): [number, number] =>
    along === 'x' ? [s, fixed] : [fixed, s];
  return { along, length, fixed, out, at };
}

/** Evenly spaced posts along a length, both ends included, no bay over `spacing`. */
export function evenPosts(length: number, spacing: number): number[] {
  const bays = Math.max(1, Math.ceil(length / spacing - 1e-9));
  return Array.from(
    { length: bays + 1 },
    (_, i) => -length / 2 + (length * i) / bays,
  );
}

export interface CagePanel {
  side: CageSide;
  from: number;
  to: number;
}

export interface CageLayout {
  /** Every post, (x, z), corners first, each once. */
  posts: [number, number][];
  /** Each side's posts along it, in order, the door's jambs among them. */
  sidePosts: Record<CageSide, number[]>;
  /** Mesh infill between neighbouring posts, the doorway left open. */
  panels: CagePanel[];
  /** The partitions' x. */
  partitions: number[];
  door: {
    side: CageSide;
    /** Its jambs along its side. */
    from: number;
    to: number;
    /** Its hinge's place along its side, and (x, z). */
    hingeAlong: number;
    hinge: [number, number];
    /** The leaf runs from the hinge this way along the side (+1 or −1), its width. */
    toward: 1 | -1;
    width: number;
  };
}

/** The cage's layout, checked: throws if the door does not fit its side or meets a partition. */
export function cageLayout(spec: MeshCageSpec): CageLayout {
  const spacing = spec.postSpacing ?? CAGE_DEFAULTS.postSpacing;
  const partitions = [...(spec.partitions ?? [])].sort((a, b) => a - b);
  for (const x of partitions)
    if (Math.abs(x) >= spec.w / 2)
      throw new Error(`partition at ${x} is outside the cage`);
  const { door } = spec;
  const line = sideLine(spec.w, spec.d, door.side);
  const from = door.at - door.width / 2;
  const to = door.at + door.width / 2;
  if (from < -line.length / 2 + 1e-9 || to > line.length / 2 - 1e-9)
    throw new Error('the door does not fit its side');
  if (line.along === 'x')
    for (const x of partitions)
      if (x > from - 0.05 && x < to + 0.05)
        throw new Error('a partition meets the door');
  const sides: CageSide[] = ['front', 'back', 'left', 'right'];
  const sidePosts = {} as Record<CageSide, number[]>;
  for (const side of sides) {
    const l = sideLine(spec.w, spec.d, side);
    let ps = evenPosts(l.length, spacing);
    // Partitions meet the front and the back at posts of their own.
    if (l.along === 'x') ps = [...ps, ...partitions];
    if (side === door.side) {
      const ends = new Set([ps[0], ps[ps.length - 1]]);
      ps = ps.filter(
        (p) =>
          ends.has(p) ||
          partitions.includes(p) ||
          p < from - CAGE_DEFAULTS.clearOfJamb ||
          p > to + CAGE_DEFAULTS.clearOfJamb,
      );
      ps = ps.filter(
        (p) => Math.abs(p - from) > 1e-6 && Math.abs(p - to) > 1e-6,
      );
      ps.push(from, to);
    }
    sidePosts[side] = [
      ...new Set(ps.map((p) => Math.round(p * 1e6) / 1e6)),
    ].sort((a, b) => a - b);
  }
  const panels: CagePanel[] = [];
  for (const side of sides) {
    const ps = sidePosts[side];
    for (let i = 0; i < ps.length - 1; i++) {
      const isDoor =
        side === door.side &&
        Math.abs(ps[i] - from) < 1e-6 &&
        Math.abs(ps[i + 1] - to) < 1e-6;
      if (!isDoor && ps[i + 1] - ps[i] > 1e-6)
        panels.push({ side, from: ps[i], to: ps[i + 1] });
    }
  }
  const key = (p: [number, number]) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
  const seen = new Map<string, [number, number]>();
  const corners: [number, number][] = [
    [-spec.w / 2, -spec.d / 2],
    [spec.w / 2, -spec.d / 2],
    [spec.w / 2, spec.d / 2],
    [-spec.w / 2, spec.d / 2],
  ];
  for (const c of corners) seen.set(key(c), c);
  for (const side of sides) {
    const l = sideLine(spec.w, spec.d, side);
    for (const p of sidePosts[side]) {
      const at = l.at(p);
      if (!seen.has(key(at))) seen.set(key(at), at);
    }
  }
  // Seen from outside, "left" along the side: the side's outward normal
  // crossed with up. Front: outside looking −z, left is −x; and so on.
  const leftward: Record<CageSide, 1 | -1> = {
    front: -1,
    back: 1,
    left: -1,
    right: 1,
  };
  const hingeAlong =
    door.hinge === 'left'
      ? leftward[door.side] < 0
        ? from
        : to
      : leftward[door.side] < 0
        ? to
        : from;
  return {
    posts: [...seen.values()],
    sidePosts,
    panels,
    partitions,
    door: {
      side: door.side,
      from,
      to,
      hingeAlong,
      hinge: line.at(hingeAlong),
      toward: hingeAlong === from ? 1 : -1,
      width: door.width,
    },
  };
}

/** Where a mesh's wires run across a panel `length` long: every `pitch`, inside its frame. */
export function meshWires(length: number, pitch: number): number[] {
  const n = Math.max(0, Math.floor(length / pitch + 1e-6));
  const start = -length / 2 + (length - n * pitch) / 2;
  return Array.from({ length: n + 1 }, (_, i) => start + i * pitch);
}

/** The door's leaf angle, radians about y, `open` 0 (shut) to 1 (open a right angle), signed so it swings `opens`. */
export function doorLeafAngle(spec: MeshCageSpec, open: number): number {
  const l = cageLayout(spec);
  const line = sideLine(spec.w, spec.d, spec.door.side);
  // The leaf lies along the side from the hinge; swinging out turns its
  // free end toward the outward normal.
  const t = l.door.toward;
  const [ox, oz] = line.out;
  const dir: [number, number] = line.along === 'x' ? [t, 0] : [0, t];
  // The turn (about +y) that takes `dir` toward `out` is positive when dir × out has +y... rotation by +θ about y takes (x, z) to (x cosθ + z sinθ, −x sinθ + z cosθ).
  const cross = dir[1] * ox - dir[0] * oz;
  const sign = (cross >= 0 ? 1 : -1) * (spec.door.opens === 'out' ? 1 : -1);
  return sign * open * (Math.PI / 2);
}

/** The door eased toward open (1) or shut (0) at `rate` a second. */
export function easeDoor(
  current: number,
  target: number,
  dt: number,
  rate = 1.5,
): number {
  return current < target
    ? Math.min(target, current + dt * rate)
    : Math.max(target, current - dt * rate);
}
