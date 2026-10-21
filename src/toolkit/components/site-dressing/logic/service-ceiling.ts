/**
 * A procedural services ceiling: set decoration, not plant (`AGENTS.md`).
 * Lays out the runs of an exposed industrial ceiling as installers do:
 * each system at its own height below the deck, so systems cross over and
 * under one another, never through; runs mostly along the room's length,
 * with right-angle jogs and bends; hangers at each system's spacing; and
 * drops to the odd diffuser or sprinkler head. Pure, and seeded: one room
 * and one seed always give the same ceiling. Metres, plan in (x, z).
 */

export type ServiceSystem =
  | 'sprinkler'
  | 'duct'
  | 'lagged-duct'
  | 'pipe'
  | 'conduit'
  | 'tray'
  | 'basket'
  | 'ladder';

export interface SystemSpec {
  /** Depth of the run's middle below the deck. */
  drop: number;
  /** Width in plan (a tray's or duct's), metres. */
  size: number;
  /** Clear space kept beside it from others in its layer. */
  gap: number;
  /** Hangers' spacing along it. */
  hangEvery: number;
  /** Radius of its bends, to its centre line. */
  bend: number;
  /** How many runs to try for, at density 1. */
  runs: number;
  /** Spacing of drops (sprinkler heads, diffusers), or 0 for none. */
  dropEvery: number;
}

/** The systems, top down, after the coordination of a real soffit. */
export const SYSTEMS: Record<ServiceSystem, SystemSpec> = {
  sprinkler: {
    drop: 0.2,
    size: 0.09,
    gap: 0.3,
    hangEvery: 3,
    bend: 0.1,
    runs: 2,
    dropEvery: 3,
  },
  conduit: {
    drop: 0.12,
    size: 0.03,
    gap: 0.12,
    hangEvery: 1.5,
    bend: 0.15,
    runs: 4,
    dropEvery: 0,
  },
  pipe: {
    drop: 0.32,
    size: 0.07,
    gap: 0.2,
    hangEvery: 2,
    bend: 0.12,
    runs: 3,
    dropEvery: 0,
  },
  duct: {
    drop: 0.55,
    size: 0.4,
    gap: 0.3,
    hangEvery: 2.4,
    bend: 0.4,
    runs: 1,
    dropEvery: 4.5,
  },
  'lagged-duct': {
    drop: 0.55,
    size: 0.5,
    gap: 0.3,
    hangEvery: 2.4,
    bend: 0.5,
    runs: 1,
    dropEvery: 0,
  },
  tray: {
    drop: 0.85,
    size: 0.3,
    gap: 0.2,
    hangEvery: 1.5,
    bend: 0.3,
    runs: 2,
    dropEvery: 0,
  },
  basket: {
    drop: 0.95,
    size: 0.2,
    gap: 0.15,
    hangEvery: 1.5,
    bend: 0.2,
    runs: 2,
    dropEvery: 0,
  },
  ladder: {
    drop: 1.05,
    size: 0.45,
    gap: 0.25,
    hangEvery: 1.5,
    bend: 0.6,
    runs: 1,
    dropEvery: 0,
  },
};

/** Which systems share a layer, and so must keep clear of each other. */
export const LAYER: Record<ServiceSystem, string> = {
  sprinkler: 'top',
  conduit: 'deck',
  pipe: 'pipes',
  duct: 'air',
  'lagged-duct': 'air',
  tray: 'cables',
  basket: 'cables',
  ladder: 'ladder',
};

export interface ServiceRun {
  system: ServiceSystem;
  /** Height of its centre line. */
  y: number;
  /** Its centre line in plan: corners where it turns. */
  points: readonly (readonly [number, number])[];
  /** Where it hangs from the deck. */
  hangers: readonly (readonly [number, number])[];
  /** Where something drops from it (a head, a diffuser). */
  drops: readonly (readonly [number, number])[];
}

export interface CeilingRoom {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** The underside of the deck. */
  deckY: number;
}

export interface CeilingOptions {
  seed: number;
  /** How busy: 1 is like the photographs; 0.5 sparse; 1.5 crowded. */
  density?: number;
  /** Which systems to include; all by default. */
  systems?: readonly ServiceSystem[];
  /**
   * Plan areas no run in the given layers may touch: for fittings fixed
   * to the soffit, such as the smoke detectors' battens.
   */
  keepClear?: readonly { layers: readonly string[]; box: Box }[];
}

/**
 * Smoke detectors over the room on a square grid, `spacing` apart (BS
 * 5839-1 gives each point detector about 7.5 m of radius under a flat
 * ceiling; a grid at 7.5 m covers it), in rows along x.
 */
export function detectorRows(room: CeilingRoom, spacing = 7.5) {
  const along = (min: number, max: number) => {
    const n = Math.max(1, Math.round((max - min) / spacing));
    const step = (max - min) / n;
    return Array.from({ length: n }, (_, i) => min + step * (i + 0.5));
  };
  const xs = along(room.minX, room.maxX);
  return along(room.minZ, room.maxZ).map((z) => ({
    z,
    detectors: xs.map((x) => [x, z] as const),
  }));
}

/** A small seeded random number generator (mulberry32). */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** The plan footprint of each straight of a run, grown by `grow`. */
export function runFootprint(
  points: readonly (readonly [number, number])[],
  grow: number,
): Box[] {
  const boxes: Box[] = [];
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1];
    const [bx, bz] = points[i];
    boxes.push({
      minX: Math.min(ax, bx) - grow,
      maxX: Math.max(ax, bx) + grow,
      minZ: Math.min(az, bz) - grow,
      maxZ: Math.max(az, bz) + grow,
    });
  }
  return boxes;
}

const overlaps = (a: Box, b: Box) =>
  a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;

/** Points every `every` along a polyline, starting half a space in. */
function along(
  points: readonly (readonly [number, number])[],
  every: number,
): [number, number][] {
  const out: [number, number][] = [];
  let carry = every / 2;
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1];
    const [bx, bz] = points[i];
    const length = Math.hypot(bx - ax, bz - az);
    let s = carry;
    for (; s < length; s += every)
      out.push([ax + ((bx - ax) * s) / length, az + ((bz - az) * s) / length]);
    carry = s - length;
  }
  return out;
}

/**
 * The ceiling's runs. Each run starts at one end wall and leaves by the
 * other, or turns to leave by a side wall; most jog once on the way. A
 * candidate that would touch another in its layer is redrawn, a few times,
 * and dropped if it cannot be fitted.
 */
export function layOutServiceCeiling(
  room: CeilingRoom,
  options: CeilingOptions,
): ServiceRun[] {
  const random = seeded(options.seed);
  const density = options.density ?? 1;
  const systems = options.systems ?? (Object.keys(SYSTEMS) as ServiceSystem[]);
  const taken = new Map<string, Box[]>();
  const runs: ServiceRun[] = [];
  const pick = (a: number, b: number) => a + (b - a) * random();
  for (const system of systems) {
    const s = SYSTEMS[system];
    const layer = LAYER[system];
    const boxes =
      taken.get(layer) ??
      (options.keepClear ?? [])
        .filter((k) => k.layers.includes(layer))
        .map((k) => k.box);
    taken.set(layer, boxes);
    const wanted = Math.max(0, Math.round(s.runs * density + (random() - 0.5)));
    const margin = s.size / 2 + 0.15;
    for (let n = 0; n < wanted; n++) {
      for (let attempt = 0; attempt < 12; attempt++) {
        const z0 = pick(room.minZ + margin, room.maxZ - margin);
        const points: [number, number][] = [[room.minX, z0]];
        const shape = random();
        if (shape < 0.35) {
          // Straight through.
          points.push([room.maxX, z0]);
        } else if (shape < 0.75) {
          // One jog to another lane, then on to the far wall.
          const x1 = pick(room.minX + 1.5, room.maxX - 1.5);
          const z1 = pick(room.minZ + margin, room.maxZ - margin);
          if (Math.abs(z1 - z0) < 2 * s.bend + 0.2) continue;
          points.push([x1, z0], [x1, z1], [room.maxX, z1]);
        } else {
          // A turn to leave by a side wall.
          const x1 = pick(room.minX + 1.5, room.maxX - 1.5);
          const side = random() < 0.5 ? room.minZ : room.maxZ;
          points.push([x1, z0], [x1, side]);
        }
        const footprint = runFootprint(points, s.size / 2 + s.gap / 2);
        if (footprint.some((a) => boxes.some((b) => overlaps(a, b)))) continue;
        boxes.push(...footprint);
        runs.push({
          system,
          y: room.deckY - s.drop,
          points,
          hangers: along(points, s.hangEvery),
          drops: s.dropEvery ? along(points, s.dropEvery) : [],
        });
        break;
      }
    }
  }
  return runs;
}
