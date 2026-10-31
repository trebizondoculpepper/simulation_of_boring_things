/**
 * The pool rooms, laid out: a small piece of the endless, implausible
 * world of pools (`doc/design/poolrooms-layout.md`), as bare as it can be.
 * Zones on four levels, joined by openings in their shared walls, stairs
 * and ramps, and a water slide; pools in them, some to be waded through;
 * and in every zone a door marked Authorised Personnel Only, which leads
 * out of the pool rooms altogether to a plain grey room standing in for
 * its plant room (the two realms, `doc/design/two-realms.md`). Within the
 * pool rooms, geometry is consistent: no two zones overlap in plan, so
 * every point has one floor. Pure; metres, x east, z south, y up.
 */

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type ZoneKind =
  | 'gallery'
  | 'hall'
  | 'lane'
  | 'stair'
  | 'terraces'
  | 'spa'
  | 'grotto'
  | 'river'
  | 'meander'
  | 'plant';

export interface Zone {
  id: string;
  name: string;
  kind: ZoneKind;
  rect: Rect;
  /**
   * Its floor: level at `y`, or a stair or ramp, at `y` on its max side
   * along `along` and at `to` on its min side.
   */
  y: number;
  to?: number;
  along?: 'x' | 'z';
  /** Ceiling height above its highest floor, metres. */
  height: number;
  /** Its colour, so each zone is known by it. */
  tint: string;
}

export interface Pool {
  zone: string;
  /** In plan; a round pool's square, `round` for a jacuzzi; a winding river's bounds. */
  rect: Rect;
  round?: boolean;
  /**
   * A winding river: its course, through points (x, z) that its centre
   * line passes smoothly through, and its width, metres.
   */
  course?: readonly (readonly [number, number])[];
  width?: number;
  /** Water depth, metres: its water at the zone's floor, its floor this far below. */
  depth: number;
  /** Shallow enough to wade through (footbaths, the children's terraces). */
  wade: boolean;
  /**
   * Its water treatment display board, on its deck, by the name the board
   * gives it. Footbaths, and the main pool's lane where it runs out of the
   * hall, have none.
   */
  board?: string;
}

/** An opening between two zones in the wall they share, `from`–`to` along it. */
export interface Link {
  a: string;
  b: string;
  from: number;
  to: number;
}

export type Side = 'north' | 'south' | 'east' | 'west';

/** A door marked Authorised Personnel Only, in a zone's wall, `at` along it. */
export interface StaffDoor {
  zone: string;
  side: Side;
  at: number;
  /** The grey room it leads to (a plant zone). */
  to: string;
}

/** A water slide: its path from its top to its splash, through points (x, y, z). */
export interface Slide {
  id: string;
  from: string;
  to: string;
  path: readonly (readonly [number, number, number])[];
}

const rect = (
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): Rect => ({
  minX,
  maxX,
  minZ,
  maxZ,
});

/** The levels, metres: the grotto below, the halls, the terraces, the spa. */
export const LEVELS = { grotto: -4, ground: 0, terraces: 4, spa: 9 } as const;

export const ZONES: readonly Zone[] = [
  {
    id: 'gallery',
    name: 'Footbath gallery',
    kind: 'gallery',
    rect: rect(-3, 3, 30, 54),
    y: 0,
    height: 4,
    tint: '#e9f1ef',
  },
  {
    id: 'hall',
    name: 'The water chapel',
    kind: 'hall',
    rect: rect(-20, 20, -30, 30),
    y: 0,
    height: 33,
    tint: '#ece9e0',
  },
  {
    id: 'lane',
    name: 'The endless lane',
    kind: 'lane',
    rect: rect(-3, 3, -90, -30),
    y: 0,
    height: 3.2,
    tint: '#e6eef4',
  },
  {
    id: 'stair-terraces',
    name: 'Stair to the terraces',
    kind: 'stair',
    rect: rect(-36, -20, -6, 0),
    y: 0,
    to: 4,
    along: 'x',
    height: 4,
    tint: '#eceae4',
  },
  {
    id: 'terraces',
    name: 'Children’s terraces',
    kind: 'terraces',
    rect: rect(-60, -36, -20, 10),
    y: 4,
    height: 6,
    tint: '#f6ece6',
  },
  {
    id: 'stair-spa',
    name: 'Stair to the spa',
    kind: 'stair',
    rect: rect(-56, -52, -50, -20),
    y: 4,
    to: 9,
    along: 'z',
    height: 3.5,
    tint: '#ece6f0',
  },
  {
    id: 'spa',
    name: 'Spa rotunda',
    kind: 'spa',
    rect: rect(-64, -44, -70, -50),
    y: 9,
    height: 10,
    tint: '#efe8f3',
  },
  {
    id: 'grotto',
    name: 'Splash grotto',
    kind: 'grotto',
    rect: rect(-40, -16, -80, -50),
    y: -4,
    height: 3.5,
    // Dim: below ground, its lamps its only light.
    tint: '#8e9c99',
  },
  {
    id: 'river',
    name: 'The rising river',
    kind: 'river',
    rect: rect(-30, -24, -50, -14),
    y: 0,
    to: -4,
    along: 'z',
    height: 3,
    tint: '#e3eeea',
  },
  {
    id: 'meander',
    name: 'The winding river',
    kind: 'meander',
    rect: rect(20, 52, -30, 14),
    y: 0,
    height: 9,
    tint: '#f4faf6',
  },
  {
    id: 'river-landing',
    name: 'River landing',
    kind: 'river',
    rect: rect(-30, -20, -14, -8),
    y: 0,
    height: 3,
    tint: '#e3eeea',
  },
];

/** The pool rooms' zones. */
export const POOL_ZONES: readonly Zone[] = ZONES;

/** Where the grey rooms stand: far off, out of the pool rooms' world. */
const PLANT_AT = 1000;
const PLANT_SIZE = 6;

export const STAFF_DOORS: readonly StaffDoor[] = [
  { zone: 'gallery', side: 'west', at: 50, to: 'plant-gallery' },
  { zone: 'hall', side: 'east', at: 0, to: 'plant-hall' },
  { zone: 'lane', side: 'east', at: -86, to: 'plant-lane' },
  { zone: 'terraces', side: 'south', at: -40, to: 'plant-terraces' },
  { zone: 'spa', side: 'west', at: -56, to: 'plant-spa' },
  { zone: 'grotto', side: 'south', at: -18, to: 'plant-grotto' },
  { zone: 'river', side: 'east', at: -30, to: 'plant-river' },
  { zone: 'meander', side: 'east', at: 4, to: 'plant-meander' },
];

/** The grey rooms behind the staff doors, standing in for the plant rooms. */
export const PLANT_ZONES: readonly Zone[] = STAFF_DOORS.map((door, i) => ({
  id: door.to,
  name: `Plant room behind ${POOL_ZONES.find((z) => z.id === door.zone)!.name}`,
  kind: 'plant',
  rect: rect(PLANT_AT + i * 20, PLANT_AT + i * 20 + PLANT_SIZE, 0, PLANT_SIZE),
  y: 0,
  height: 3.5,
  tint: '#8d9091',
}));

export const ALL_ZONES: readonly Zone[] = [...POOL_ZONES, ...PLANT_ZONES];

export const LINKS: readonly Link[] = [
  { a: 'gallery', b: 'hall', from: -2, to: 2 },
  { a: 'hall', b: 'lane', from: -3, to: 3 },
  { a: 'hall', b: 'stair-terraces', from: -6, to: 0 },
  { a: 'stair-terraces', b: 'terraces', from: -6, to: 0 },
  { a: 'terraces', b: 'stair-spa', from: -56, to: -52 },
  { a: 'stair-spa', b: 'spa', from: -56, to: -52 },
  { a: 'grotto', b: 'river', from: -30, to: -24 },
  { a: 'river', b: 'river-landing', from: -30, to: -24 },
  { a: 'river-landing', b: 'hall', from: -14, to: -8 },
  { a: 'hall', b: 'meander', from: -22, to: -14 },
];

/** The winding river's course, wall to wall. */
const WINDING: readonly (readonly [number, number])[] = [
  [36, -30],
  [36, -25],
  [29, -19],
  [27, -11],
  [34, -5],
  [43, -1],
  [44, 6],
  [37, 10],
  [31, 11],
  [30, 14],
];

export const POOLS: readonly Pool[] = [
  // Two footbaths across the gallery, to be waded through.
  { zone: 'gallery', rect: rect(-3, 3, 44, 46), depth: 0.15, wade: true },
  { zone: 'gallery', rect: rect(-3, 3, 36, 38), depth: 0.15, wade: true },
  // The main pool: the water chapel's whole floor, wall to wall but for
  // a ledge round it to walk on; and the lane that leaves it through the
  // north wall and does not come back.
  {
    zone: 'hall',
    rect: rect(-18.5, 18.5, -28.5, 28.5),
    depth: 2,
    wade: false,
    board: 'MAIN POOL',
  },
  { zone: 'hall', rect: rect(-1.25, 1.25, -30, -28.5), depth: 2, wade: false },
  {
    zone: 'lane',
    rect: rect(-1.25, 1.25, -88, -30),
    depth: 2,
    wade: false,
    board: 'LANE',
  },
  // The children's terraces: three shallow pools, ever shallower.
  {
    zone: 'terraces',
    rect: rect(-58, -50, -18, -8),
    depth: 0.6,
    wade: true,
    board: 'TERRACE 1',
  },
  {
    zone: 'terraces',
    rect: rect(-58, -50, -6, 2),
    depth: 0.45,
    wade: true,
    board: 'TERRACE 2',
  },
  {
    zone: 'terraces',
    rect: rect(-48, -40, -6, 4),
    depth: 0.3,
    wade: true,
    board: 'TERRACE 3',
  },
  // The jacuzzi, round, in the rotunda's middle.
  {
    zone: 'spa',
    rect: rect(-57, -51, -63, -57),
    round: true,
    depth: 0.9,
    wade: false,
    board: 'SPA',
  },
  // The splash pool, where the slide comes down.
  {
    zone: 'grotto',
    rect: rect(-34, -22, -76, -62),
    depth: 0.9,
    wade: true,
    board: 'SPLASH POOL',
  },
  // The river, running uphill beside its ramp.
  {
    zone: 'river',
    rect: rect(-29.5, -27, -50, -14),
    depth: 0.3,
    wade: true,
    board: 'RIVER',
  },
  // The winding river: out of a culvert in the north wall, across the
  // room and away into another in the south, flat decks either side.
  {
    zone: 'meander',
    rect: rect(24, 48, -30, 14),
    course: WINDING,
    width: 3,
    depth: 0.9,
    wade: true,
    board: 'WINDING RIVER',
  },
];

/** The slide from the spa down through the dark to the grotto's splash pool. */
export const SLIDES: readonly Slide[] = [
  {
    id: 'spa-grotto',
    from: 'spa',
    to: 'grotto',
    path: [
      [-46, 9.75, -60],
      [-43, 9.55, -60],
      [-40, 8.2, -62],
      [-37, 6.5, -66],
      [-34, 4.8, -61],
      [-37, 3, -55],
      [-42, 1.2, -58],
      [-41.5, -0.4, -63],
      [-38, -2.2, -66],
      [-33, -3.4, -69],
      [-28, -3.7, -70],
    ],
  },
];

/** The slide's radius, metres. */
export const SLIDE_RADIUS = 0.6;

/** A hole through a wall, where the slide passes: `from`–`to` along it, `bottom`–`top` up. */
export interface WallHole {
  zone: string;
  side: Side;
  from: number;
  to: number;
  bottom: number;
  top: number;
}

/** Where the slide leaves the spa and comes into the grotto. */
export const WALL_HOLES: readonly WallHole[] = [
  // The winding river's culverts, where it comes in and goes out.
  {
    zone: 'meander',
    side: 'north',
    from: 34.3,
    to: 37.7,
    bottom: -0.9,
    top: 1.1,
  },
  {
    zone: 'meander',
    side: 'south',
    from: 28.3,
    to: 31.7,
    bottom: -0.9,
    top: 1.1,
  },
  { zone: 'spa', side: 'east', from: -60.75, to: -59.25, bottom: 9, top: 10.4 },
  {
    zone: 'grotto',
    side: 'west',
    from: -65.3,
    to: -63.3,
    bottom: -2,
    top: -0.5,
  },
];

export const zoneById = (id: string) => ALL_ZONES.find((z) => z.id === id)!;

const inside = (r: Rect, x: number, z: number) =>
  x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;

/** A zone's floor at (x, z), before any pool in it. */
export function zoneFloor(zone: Zone, x: number, z: number): number {
  if (zone.to === undefined || !zone.along) return zone.y;
  const r = zone.rect;
  const s =
    zone.along === 'x'
      ? (r.maxX - x) / (r.maxX - r.minX)
      : (r.maxZ - z) / (r.maxZ - r.minZ);
  // From `y` at its max side (where it is entered from the lower or
  // higher level) to `to` at its min side.
  return zone.y + (zone.to - zone.y) * Math.min(1, Math.max(0, s));
}

/** The zone at (x, z) nearest in height to `y`, if any. */
export function zoneAt(x: number, z: number, y = 0): Zone | null {
  let best: Zone | null = null;
  for (const zone of ALL_ZONES)
    if (
      inside(zone.rect, x, z) &&
      (!best ||
        Math.abs(zoneFloor(zone, x, z) - y) <
          Math.abs(zoneFloor(best, x, z) - y))
    )
      best = zone;
  return best;
}

/**
 * A winding river's centre line, sampled smoothly through its course (a
 * Catmull–Rom curve), `step` metres apart or so: each point with the
 * unit normal to its left.
 */
export function riverLine(pool: Pool, step = 0.5) {
  const c = pool.course!;
  const points: { x: number; z: number; nx: number; nz: number }[] = [];
  const at = (i: number) => c[Math.max(0, Math.min(c.length - 1, i))];
  for (let i = 0; i < c.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const length = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(2, Math.ceil(length / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const f = (a: number, b: number, c2: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + c2) * t +
          (2 * a - 5 * b + 4 * c2 - d) * t * t +
          (-a + 3 * b - 3 * c2 + d) * t * t * t);
      points.push({
        x: f(p0[0], p1[0], p2[0], p3[0]),
        z: f(p0[1], p1[1], p2[1], p3[1]),
        nx: 0,
        nz: 0,
      });
    }
  }
  const last = c[c.length - 1];
  points.push({ x: last[0], z: last[1], nx: 0, nz: 0 });
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1;
    points[i].nx = -dz / l;
    points[i].nz = dx / l;
  }
  return points;
}

/** How far (x, z) is from a winding river's centre line, metres. */
export function distanceToCourse(pool: Pool, x: number, z: number): number {
  const line = riverLine(pool);
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1],
      b = line[i];
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const t = Math.max(
      0,
      Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)),
    );
    best = Math.min(best, Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz)));
  }
  return best;
}

/** The pool at (x, z) in `zone`, if any. */
export function poolAt(zone: Zone, x: number, z: number): Pool | null {
  return (
    POOLS.find(
      (p) =>
        p.zone === zone.id &&
        (p.course
          ? distanceToCourse(p, x, z) <= p.width! / 2
          : p.round
            ? Math.hypot(
                x - (p.rect.minX + p.rect.maxX) / 2,
                z - (p.rect.minZ + p.rect.maxZ) / 2,
              ) <=
              (p.rect.maxX - p.rect.minX) / 2
            : inside(p.rect, x, z)),
    ) ?? null
  );
}

/** The floor under a walker at (x, z) who stood at `previousY`: in a pool to be waded, its floor. */
export function floorAt(x: number, z: number, previousY: number): number {
  const zone = zoneAt(x, z, previousY);
  if (!zone) return previousY;
  const floor = zoneFloor(zone, x, z);
  const pool = poolAt(zone, x, z);
  return pool?.wade ? floor - pool.depth : floor;
}

/** Each side's line and its extent along it. */
export function sideOf(r: Rect, side: Side) {
  switch (side) {
    case 'north':
      return { along: 'x' as const, at: r.minZ, from: r.minX, to: r.maxX };
    case 'south':
      return { along: 'x' as const, at: r.maxZ, from: r.minX, to: r.maxX };
    case 'west':
      return { along: 'z' as const, at: r.minX, from: r.minZ, to: r.maxZ };
    case 'east':
      return { along: 'z' as const, at: r.maxX, from: r.minZ, to: r.maxZ };
  }
}

const SIDES: readonly Side[] = ['north', 'south', 'east', 'west'];
const OPPOSITE: Record<Side, Side> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

/** The side of `a` that `b` shares, if they share one. */
export function sharedSide(a: Rect, b: Rect): Side | null {
  for (const side of SIDES) {
    const s = sideOf(a, side);
    const t = sideOf(b, OPPOSITE[side]);
    if (Math.abs(s.at - t.at) < 1e-6 && s.from < t.to && t.from < s.to)
      return side;
  }
  return null;
}

/** The wall of a zone: its runs between openings, each `from`–`to` along `side`. */
export interface WallRun {
  zone: string;
  side: Side;
  along: 'x' | 'z';
  at: number;
  from: number;
  to: number;
}

/** A staff door's width, metres. */
export const DOOR_WIDTH = 1;

/** The gaps in a zone's `side`: its links' openings, and its staff door's. */
export function gapsIn(zone: Zone, side: Side): [number, number][] {
  const gaps: [number, number][] = [];
  for (const link of LINKS) {
    const other =
      link.a === zone.id ? link.b : link.b === zone.id ? link.a : null;
    if (!other) continue;
    if (sharedSide(zone.rect, zoneById(other).rect) === side)
      gaps.push([link.from, link.to]);
  }
  return gaps.sort((p, q) => p[0] - q[0]);
}

/** Every zone's walls, as runs between their openings. */
export function wallRuns(zones: readonly Zone[] = ALL_ZONES): WallRun[] {
  const runs: WallRun[] = [];
  for (const zone of zones)
    for (const side of SIDES) {
      const s = sideOf(zone.rect, side);
      let from = s.from;
      for (const [a, b] of gapsIn(zone, side)) {
        if (a > from) runs.push({ zone: zone.id, side, ...s, from, to: a });
        from = Math.max(from, b);
      }
      if (s.to > from) runs.push({ zone: zone.id, side, ...s, from, to: s.to });
    }
  return runs;
}

/** Where a staff door stands, and where one coming through it arrives. */
export function doorPlace(zone: Zone, side: Side, at: number) {
  const s = sideOf(zone.rect, side);
  const inward = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] }[
    side
  ];
  const x = s.along === 'x' ? at : s.at;
  const z = s.along === 'x' ? s.at : at;
  return {
    x,
    z,
    y: zoneFloor(zone, x, z),
    /** One metre in from it, facing into the zone. */
    arrive: {
      x: x + inward[0] * 1.2,
      z: z + inward[1] * 1.2,
      yaw: Math.atan2(inward[0], -inward[1]),
    },
  };
}

/** Each grey room's door back: on its west wall, in the middle. */
export function plantDoor(plant: Zone) {
  return doorPlace(plant, 'west', (plant.rect.minZ + plant.rect.maxZ) / 2);
}

/**
 * Where a pool's display board stands: on its deck by its north-west
 * corner, a little way back from the edge, kept inside its zone; facing
 * the pool.
 */
export function boardPlace(pool: Pool) {
  const zone = zoneById(pool.zone);
  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(hi - 0.4, Math.max(lo + 0.4, v));
  const x = clamp(pool.rect.minX - 0.7, zone.rect.minX, zone.rect.maxX);
  const z = clamp(pool.rect.minZ - 0.7, zone.rect.minZ, zone.rect.maxZ);
  const cx = (pool.rect.minX + pool.rect.maxX) / 2;
  const cz = (pool.rect.minZ + pool.rect.maxZ) / 2;
  return { x, z, y: zoneFloor(zone, x, z), yaw: Math.atan2(cx - x, cz - z) };
}

// ---- Arches ----------------------------------------------------------------

/** An arch: a round-headed opening in a wall or an arcade, `from`–`to` along a line. */
export interface Arch {
  along: 'x' | 'z';
  /** The line it stands on, metres. */
  at: number;
  from: number;
  to: number;
  /** The floor at its feet, where its head springs from, and the top of the wall over it. */
  floor: number;
  spring: number;
  top: number;
  /** How high its head rises over its spring: half its width for a round arch, less for a flattened one. */
  rise: number;
  /** How high the wall over it goes: to the taller of the two zones' ceilings. */
  wallTop: number;
  /** Its head: a half circle, gothic and pointed, or flattened (half an ellipse). */
  style: 'round' | 'pointed' | 'flat';
  /** Whether it is an opening between zones (in a wall) or one of an arcade's (free-standing). */
  kind: 'link' | 'arcade';
  /** How thick its wall or arcade is, metres. */
  thickness: number;
}

/** How high the chapel's arcades stand, where its vault springs from, metres. */
export const ARCADE_TOP = 14;
/** The chapel's vault: from the arcades' tops at x = ±16, pointed, to its apex, metres. */
export const VAULT = {
  from: -16,
  to: 16,
  spring: ARCADE_TOP,
  rise: 18,
} as const;

/** How high the vault's underside is at `x`, if `x` is under it. */
export function vaultHeightAt(x: number): number | null {
  if (x < VAULT.from || x > VAULT.to) return null;
  const curve = archCurve(
    VAULT.from,
    VAULT.to,
    VAULT.spring,
    VAULT.rise,
    'pointed',
    48,
  );
  for (let i = 1; i < curve.length; i++) {
    const [u0, v0] = curve[i - 1];
    const [u1, v1] = curve[i];
    if ((x - u0) * (x - u1) <= 0)
      return u1 === u0
        ? Math.max(v0, v1)
        : v0 + ((x - u0) / (u1 - u0)) * (v1 - v0);
  }
  return null;
}

/** The main hall's columns: on an 8 m grid, some standing in the pool. */
export const HALL_COLUMNS: readonly (readonly [number, number])[] = (() => {
  const columns: [number, number][] = [];
  for (let x = -16; x <= 16; x += 8)
    for (let z = -24; z <= 24; z += 8) columns.push([x, z]);
  return columns;
})();
export const COLUMN_RADIUS = 0.45;

/** How high an arch's head springs above its floor: at least, and as a rule, metres. */
const SPRING_LEAST = 2.1;
const SPRING = 2.4;
/** The wall left over an arch's crown, metres. */
const CROWN = 0.3;

/**
 * An arch over `from`–`to`, under a wall reaching `top`: round-headed,
 * a half circle, where there is the height for it, or, `gothic`, pointed
 * (as tall as an equilateral arch, its two arcs struck from its jambs);
 * flattened, half an ellipse, where a wide opening is in a low wall.
 */
function archUnder(
  along: 'x' | 'z',
  at: number,
  from: number,
  to: number,
  floor: number,
  top: number,
  thickness: number,
  gothic = false,
): Omit<Arch, 'kind'> {
  const half = (to - from) / 2;
  const room = top - CROWN - (floor + SPRING_LEAST);
  const pointed = gothic && room >= half * 1.05;
  const rise = pointed
    ? Math.min(half * Math.sqrt(3), room)
    : Math.max(0.3, Math.min(half, room));
  const spring = Math.max(
    floor + SPRING_LEAST,
    Math.min(floor + SPRING + 2, top - CROWN - rise),
  );
  return {
    along,
    at,
    from,
    to,
    floor,
    spring,
    rise,
    top,
    wallTop: top,
    thickness,
    style: pointed ? 'pointed' : rise >= half - 1e-9 ? 'round' : 'flat',
  };
}

/**
 * The inner curve of an arch's head, from its left jamb at its spring
 * over to its right, as points (u along its wall, v up): a half circle,
 * a pointed arch's two arcs, or half an ellipse.
 */
export function archCurve(
  from: number,
  to: number,
  spring: number,
  rise: number,
  style: Arch['style'],
  segments = 24,
): [number, number][] {
  const half = (to - from) / 2;
  const mid = from + half;
  const points: [number, number][] = [];
  if (style === 'pointed') {
    // Each arc's centre on the springing line, `d` in from its jamb.
    const d = (half * half + rise * rise) / (2 * half);
    const apex = Math.atan2(rise, d - half);
    for (let i = 0; i <= segments; i++) {
      const a = Math.PI - (apex * i) / segments;
      points.push([from + d + d * Math.cos(a), spring + d * Math.sin(a)]);
    }
    for (let i = segments - 1; i >= 0; i--) {
      const a = (apex * i) / segments;
      points.push([to - d + d * Math.cos(a), spring + d * Math.sin(a)]);
    }
    return points;
  }
  for (let i = 0; i <= segments * 2; i++) {
    const a = Math.PI - (Math.PI * i) / (segments * 2);
    points.push([mid + half * Math.cos(a), spring + rise * Math.sin(a)]);
  }
  return points;
}

/** Every opening between zones, arched; and the main hall's two arcades. */
export function arches(): Arch[] {
  const list: Arch[] = [];
  for (const link of LINKS) {
    const a = zoneById(link.a);
    const b = zoneById(link.b);
    const side = sharedSide(a.rect, b.rect)!;
    const s = sideOf(a.rect, side);
    const mid = (link.from + link.to) / 2;
    const [x, z] = s.along === 'x' ? [mid, s.at] : [s.at, mid];
    const floor = zoneFloor(a, x, z);
    const ceiling = (zone: Zone) =>
      Math.max(zone.y, zone.to ?? zone.y) + zone.height;
    list.push({
      ...archUnder(
        s.along,
        s.at,
        link.from,
        link.to,
        floor,
        Math.min(ceiling(a), ceiling(b)),
        0.3,
        // The chapel's openings are gothic.
        link.a === 'hall' || link.b === 'hall',
      ),
      wallTop: Math.max(ceiling(a), ceiling(b)),
      kind: 'link',
    });
  }
  // The arcades: down each side of the main pool, column to column.
  const hall = zoneById('hall');
  for (const x of [-16, 16]) {
    const zs = HALL_COLUMNS.filter(([cx]) => cx === x).map(([, z]) => z);
    for (let i = 1; i < zs.length; i++)
      list.push({
        ...archUnder(
          'z',
          x,
          zs[i - 1] + COLUMN_RADIUS,
          zs[i] - COLUMN_RADIUS,
          hall.y,
          hall.y + ARCADE_TOP,
          0.6,
          true,
        ),
        kind: 'arcade',
      });
  }
  return list;
}

// ---- Fake plants -------------------------------------------------------------

export type PlantKind = 'palm' | 'fern' | 'monstera';

/** A fake plant in its planter, on a deck: where, which kind, how big. */
export interface FakePlant {
  x: number;
  z: number;
  y: number;
  kind: PlantKind;
  /** Its height, metres. */
  height: number;
}

/**
 * The winding river's banks, planted: a fake plant every few metres down
 * each side, a metre back from the edge, where it stands on deck clear of
 * the water (where the river doubles back, the bank may be the other
 * reach's), of the walls, and of the way in from the hall.
 */
export function bankPlants(): FakePlant[] {
  const river = POOLS.find((p) => p.course && p.zone === 'meander')!;
  const zone = zoneById(river.zone);
  const kinds: PlantKind[] = ['palm', 'fern', 'monstera', 'fern'];
  const plants: FakePlant[] = [];
  const line = riverLine(river, 0.5);
  const every = 8;
  let n = 0;
  for (let i = 4; i < line.length - 4; i += every)
    for (const side of [1, -1]) {
      const p = line[i];
      const back = river.width! / 2 + 1.1;
      const x = p.x + side * p.nx * back;
      const z = p.z + side * p.nz * back;
      const r = zone.rect;
      if (x < r.minX + 1 || x > r.maxX - 1 || z < r.minZ + 1 || z > r.maxZ - 1)
        continue;
      if (distanceToCourse(river, x, z) < river.width! / 2 + 0.7) continue;
      // Clear of the arch from the hall.
      if (x < r.minX + 3 && z > -24 && z < -12) continue;
      if (plants.some((q) => Math.hypot(q.x - x, q.z - z) < 1.6)) continue;
      // Clear of the loungers and the bar.
      if (
        LOUNGE_KEEP_CLEAR.some(
          (k) =>
            x > k.minX - 0.6 &&
            x < k.maxX + 0.6 &&
            z > k.minZ - 0.6 &&
            z < k.maxZ + 0.6,
        )
      )
        continue;
      const kind = kinds[n % kinds.length];
      plants.push({
        x,
        z,
        y: zone.y,
        kind,
        height:
          kind === 'palm'
            ? 2.2 + (n % 3) * 0.3
            : kind === 'monstera'
              ? 1.3
              : 0.9,
      });
      n++;
    }
  return plants;
}

// ---- Skylights, windows and lamps ------------------------------------------

/** A skylight in a zone's ceiling: a square or oblong lantern, or a round oculus. */
export interface Skylight {
  zone: string;
  rect: Rect;
  round?: boolean;
}

export const SKYLIGHTS: readonly Skylight[] = [
  // The gallery: small squares down its length.
  ...[34, 41, 48].map((z) => ({
    zone: 'gallery',
    rect: rect(-0.9, 0.9, z - 0.9, z + 0.9),
  })),
  { zone: 'terraces', rect: rect(-48, -42, -16, -10) },
  { zone: 'terraces', rect: rect(-48, -42, 4, 8) },
  // The spa's oculus, over the jacuzzi.
  { zone: 'spa', rect: rect(-56.5, -51.5, -62.5, -57.5), round: true },
  // The river room: four great skylights, its ceiling's quadrants, between
  // two beams, so that the sun, coming in at a slant, falls on most of the
  // river and some of the loungers, and the rest lie in shade.
  { zone: 'meander', rect: rect(22, 35, -28, -9) },
  { zone: 'meander', rect: rect(37, 50, -28, -9) },
  { zone: 'meander', rect: rect(22, 35, -7, 12) },
  { zone: 'meander', rect: rect(37, 50, -7, 12) },
];

/** A window in a zone's wall: `from`–`to` along it, its sill and head above the zone's floor. */
export interface ZoneWindow {
  zone: string;
  side: Side;
  from: number;
  to: number;
  sill: number;
  head: number;
  /** Its shape: square-headed, a gothic lancet (pointed, its head the apex), or a round rose window. */
  shape?: 'rect' | 'lancet' | 'rose';
}

/** A lancet: its width, its sill and apex above the floor. */
const lancet = (
  zone: string,
  side: Side,
  from: number,
  sill = 5,
  head = 21,
): ZoneWindow => ({
  zone,
  side,
  from,
  to: from + 3,
  sill,
  head,
  shape: 'lancet',
});

export const WINDOWS: readonly ZoneWindow[] = [
  // The water chapel: tall lancets down its sides and across its south
  // end, and its rose window high over the arch where the lane leaves.
  ...[-28, -22, 6, 14, 22].map((z) => lancet('hall', 'west', z)),
  ...[-28, -11, -5, 6, 14, 22].map((z) => lancet('hall', 'east', z)),
  ...[-16, -10, 7, 13].map((x) => lancet('hall', 'south', x)),
  ...[-16, 13].map((x) => lancet('hall', 'north', x)),
  {
    zone: 'hall',
    side: 'north',
    from: -6,
    to: 6,
    sill: 13,
    head: 25,
    shape: 'rose',
  },
  // The terraces look out west, low enough for a child.
  { zone: 'terraces', side: 'west', from: -16, to: 6, sill: 0.9, head: 4.5 },
  // The spa: one tall window, floor to near its ceiling.
  { zone: 'spa', side: 'north', from: -60, to: -48, sill: 1.2, head: 8 },
  // The river room, along its east wall.
  { zone: 'meander', side: 'east', from: -26, to: -6, sill: 2.2, head: 5.6 },
];

export type LampKind = 'pendant' | 'sconce' | 'globe' | 'post';

/** A lamp: where its light is, metres, and how it hangs. */
export interface Lamp {
  zone: string;
  kind: LampKind;
  x: number;
  y: number;
  z: number;
  /** For a sconce, the wall it is on. */
  side?: Side;
  /** Warm (the grotto's) or the halls' cool white. */
  warm?: boolean;
}

/** Every lamp in the pool rooms. */
export function lamps(): Lamp[] {
  const list: Lamp[] = [];
  // The main hall: frosted globes on long rods, down both arcades' inner sides.
  for (const x of [-12, 12])
    for (let z = -20; z <= 20; z += 8)
      list.push({ zone: 'hall', kind: 'pendant', x, y: 7, z });
  // The endless lane: sconces down both walls, on and on.
  for (let z = -36, i = 0; z >= -84; z -= 6, i++)
    for (const side of ['west', 'east'] as const)
      list.push({
        zone: 'lane',
        kind: 'sconce',
        side,
        x: side === 'west' ? -3 : 3,
        y: 2.2,
        z: z - (side === 'east' ? 3 : 0),
      });
  // The gallery: globes on its ceiling, between its skylights.
  for (const z of [37.5, 44.5, 51.5])
    list.push({ zone: 'gallery', kind: 'globe', x: 0, y: 3.9, z });
  // The stairs: a sconce on each side wall, halfway.
  list.push({
    zone: 'stair-spa',
    kind: 'sconce',
    side: 'west',
    x: -56,
    y: 4 + 2.5 + 2.2,
    z: -35,
  });
  list.push({
    zone: 'stair-terraces',
    kind: 'sconce',
    side: 'north',
    x: -28,
    y: 2 + 2.2,
    z: -6,
  });
  // The grotto: warm lamps on its walls, the only light down there.
  for (const [x, z, side] of [
    [-40, -70, 'west'],
    [-16, -64, 'east'],
    [-28, -80, 'north'],
    [-34, -50, 'south'],
  ] as const)
    list.push({
      zone: 'grotto',
      kind: 'sconce',
      side,
      x,
      y: -4 + 2.2,
      z,
      warm: true,
    });
  // The winding river: globes on posts along its banks.
  for (const [x, z] of [
    [24, -26],
    [32, -14],
    [22.5, -6],
    [38, -8],
    [47.5, 4],
    [36, 4],
    [26, 12],
  ] as const)
    list.push({ zone: 'meander', kind: 'post', x, y: 2.6, z });
  return list;
}

// ---- The river room's lounge: sun loungers and a closed bar --------------------

/** A sun lounger: its middle, and which way its head is (radians about the vertical, 0 toward −z). */
export interface Lounger {
  x: number;
  z: number;
  yaw: number;
}

/** A lounger's length and width, metres. */
export const LOUNGER = { length: 2, width: 0.7 } as const;

/**
 * The tiki bar, closed: its counter's footprint, metres, its serving
 * front toward the river (south of it, the bar faces north).
 */
export const TIKI_BAR = {
  rect: rect(46, 50.5, 9.5, 12.5),
  front: 'north' as Side,
};

/** Where the loungers are set out, in groups, on the river room's wider decks. */
const LOUNGE_SITES: readonly Rect[] = [
  rect(38, 44, -24, -18),
  rect(22, 27, -4, 1),
  rect(27.5, 33.5, 3, 8),
];

/** The lounge's footprints, for plants and lamps to keep clear of. */
const LOUNGE_KEEP_CLEAR: Rect[] = [TIKI_BAR.rect, ...LOUNGE_SITES];

/** A lounger's footprint. */
export function loungerRect(l: Lounger): Rect {
  const along = Math.abs(Math.cos(l.yaw)) > 0.5;
  const hw = (along ? LOUNGER.width : LOUNGER.length) / 2;
  const hd = (along ? LOUNGER.length : LOUNGER.width) / 2;
  return rect(l.x - hw, l.x + hw, l.z - hd, l.z + hd);
}

/**
 * The sun loungers: a row of up to three at each of the river room's
 * lounging places, some in the sun from its skylights and some in shade,
 * heads toward the north
 * (−z), each where it stands whole on the deck, clear of the water.
 */
export function loungers(): Lounger[] {
  const river = POOLS.find((p) => p.course && p.zone === 'meander')!;
  const zone = zoneById('meander');
  const list: Lounger[] = [];
  for (const site of LOUNGE_SITES) {
    const cx = (site.minX + site.maxX) / 2;
    const cz = (site.minZ + site.maxZ) / 2;
    for (const dx of [-1.5, 0, 1.5]) {
      const l = { x: cx + dx, z: cz, yaw: 0 };
      const r = loungerRect(l);
      const corners: [number, number][] = [
        [r.minX, r.minZ],
        [r.maxX, r.minZ],
        [r.minX, r.maxZ],
        [r.maxX, r.maxZ],
      ];
      if (
        corners.every(
          ([x, z]) =>
            zoneAt(x, z, 0)?.id === zone.id &&
            distanceToCourse(river, x, z) > river.width! / 2 + 0.5,
        )
      )
        list.push(l);
    }
  }
  return list;
}
