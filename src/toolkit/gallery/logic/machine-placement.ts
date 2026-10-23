import type { Footprint } from '../../controls/logic/walk-collision';
import { MACHINE_GAP, ACCESS } from './room-sizer';
import type { Region, RegionRoom, Side, Vec3 } from './room-regions';
import { WALK_HEADROOM } from './room-regions';

/**
 * The placement helper (`doc/prompts/017-room-sizer-gantries-placement.md`),
 * the third of a room's four layers: where each machine stands in a room
 * already sized, round its reserved regions, so that what is piped
 * together stands together.
 *
 * A plant room is laid out in bands, as real ones are: machines with their
 * backs to the walls, and perhaps an island of machines back to back down
 * the middle, every one facing a walkway that runs round between them. So
 * each layout pattern is a set of bands and the walkways they face, and
 * placing is choosing which band each machine stands in and in what order
 * along it: tidy by construction, every machine's access on a walkway.
 *
 * Hard rules, each a penalty the search drives to nothing:
 * - every machine within its band's length and depth (none sticking out
 *   into a walkway);
 * - nothing standing in a region that forbids machines (a stair, a
 *   doorway's approach), or under one that forbids runs if its flue or
 *   vent rises (`clearAbove`);
 * - a machine tied to walls (an incoming supply on the supply wall) in a
 *   band against one of them;
 * - every access reachable on foot from a doorway (checked on a grid).
 *
 * What it minimises: each link's length, port's lead to port's lead (so a
 * port facing away from what it joins costs more), weighted by the pipe's
 * size. Control and power links go to the room's buses and do not pull.
 *
 * Simulated annealing over the bands' contents and order, from each
 * pattern, seeded, so the same room always comes out the same. Pure;
 * metres, the room's middle at x = z = 0, north −z; a machine's yaw 0
 * faces south (+z), its back to the north.
 */

export interface PlaceItem {
  key: string;
  /** Width along its front, depth front to back, height, metres. */
  w: number;
  d: number;
  h: number;
  /** Its maintenance access, in front, metres deep. */
  access?: number;
  /** Its back to one of these walls, if given. */
  walls?: readonly Side[];
  /**
   * Where it belongs (the owner, 2026-10-23): the big tanks in a corner,
   * placed first, biggest first; panels, mimics and signs against a wall;
   * pumps and the like freestanding, in the island where there is one (a
   * preference, which a much shorter run of pipe may outweigh).
   */
  site?: 'corner' | 'wall' | 'free';
  /** Nothing over it may forbid runs: a flue or a vent rises from it. */
  clearAbove?: boolean;
  /** Its ports: where, in its own frame (yaw 0), and which way each faces. */
  ports?: Readonly<Record<string, { at: Vec3; out: Vec3 }>>;
  /** Set into a line (a valve): left out of the room's layout, for the plumber. */
  inline?: boolean;
  /**
   * Machines of the same kind (the owner, 2026-10-23): those sharing a
   * group stand together, as a battery, side by side in one band.
   */
  group?: string;
  /**
   * A block of two rows back to back (`unit-blocks.ts`): it stands across
   * the island's two faces, each row facing a walkway.
   */
  bothFaces?: boolean;
}

export interface PlaceLink {
  a: string;
  aPort?: string;
  b: string;
  bPort?: string;
  /** What joining them costs per metre: the pipe's size, or 1. */
  weight: number;
}

export interface Placement {
  key: string;
  x: number;
  z: number;
  /** Turn about y: 0 faces south, π/2 east, π north, 3π/2 west. */
  yaw: number;
  footprint: Footprint;
  access: Footprint;
  /** The band it stands in. */
  band: string;
}

/** A strip machines stand in, side by side, backs on one edge, facing out of the other. */
export interface Band {
  name: string;
  /** Its start, on its back edge, and the way along it (x or z, + or −). */
  from: readonly [number, number];
  along: readonly [number, number];
  /** The way its machines face, out of it. */
  facing: readonly [number, number];
  length: number;
  depth: number;
  /** The wall at its back, if it has one. */
  wall?: Side;
}

export interface PlaceOptions {
  seed?: number;
  /** Annealing steps for each pattern. */
  iterations?: number;
  /** The main walkways' clear width, metres. */
  walkway?: number;
}

export interface PlaceResult {
  placed: Placement[];
  /** The bands and walkways of the pattern used. */
  bands: Band[];
  walkways: Region[];
  /** The weighted link length, metres. */
  length: number;
  /** Which pattern won. */
  pattern: string;
  problems: string[];
}

/** Half the clear width of a way to every access, metres: 0.9 m clear. */
const WALKER = 0.45;
/** How far out of its port a lead runs before the pipe may turn, metres. */
const LEAD = 0.5;
/** The main walkways round the bands, metres (the corridors' width). */
export const MAIN_WALKWAY = 1.2;

const area = (f: Footprint) =>
  Math.max(0, f.maxX - f.minX) * Math.max(0, f.maxZ - f.minZ);
const meet = (a: Footprint, b: Footprint): Footprint => ({
  minX: Math.max(a.minX, b.minX),
  maxX: Math.min(a.maxX, b.maxX),
  minZ: Math.max(a.minZ, b.minZ),
  maxZ: Math.min(a.maxZ, b.maxZ),
});
const overlapArea = (a: Footprint, b: Footprint) => area(meet(a, b));
const grow = (f: Footprint, by: number): Footprint => ({
  minX: f.minX - by,
  maxX: f.maxX + by,
  minZ: f.minZ - by,
  maxZ: f.maxZ + by,
});
const plan = (r: Region): Footprint => ({
  minX: r.min[0],
  maxX: r.max[0],
  minZ: r.min[2],
  maxZ: r.max[2],
});
const box = (ax: number, az: number, bx: number, bz: number): Footprint => ({
  minX: Math.min(ax, bx),
  maxX: Math.max(ax, bx),
  minZ: Math.min(az, bz),
  maxZ: Math.max(az, bz),
});

/** A seeded random number generator (mulberry32). */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A band's strip on the floor. */
export function bandFootprint(b: Band): Footprint {
  const [x0, z0] = b.from;
  const x1 = x0 + b.along[0] * b.length;
  const z1 = z0 + b.along[1] * b.length;
  return box(x0, z0, x1 + b.facing[0] * b.depth, z1 + b.facing[1] * b.depth);
}

/**
 * A layout pattern's bands and walkways. `ring`: a band along each wall,
 * a walkway round inside them, and an island of two bands back to back
 * down the middle if there is room for one; `perimeter`: the wall bands
 * only, the middle all walkway.
 */
export function patternBands(
  room: RegionRoom,
  pattern: 'ring' | 'perimeter',
  depth: number,
  walkway = MAIN_WALKWAY,
): { bands: Band[]; walkways: Region[] } {
  const hw = room.w / 2;
  const hd = room.d / 2;
  const bands: Band[] = [
    // North and south bands run the room's whole width; east and west
    // between them.
    {
      name: 'north wall',
      from: [-hw, -hd],
      along: [1, 0],
      facing: [0, 1],
      length: room.w,
      depth,
      wall: 'north',
    },
    {
      name: 'south wall',
      from: [hw, hd],
      along: [-1, 0],
      facing: [0, -1],
      length: room.w,
      depth,
      wall: 'south',
    },
    {
      name: 'east wall',
      from: [hw, -hd + depth],
      along: [0, 1],
      facing: [-1, 0],
      length: room.d - 2 * depth,
      depth,
      wall: 'east',
    },
    {
      name: 'west wall',
      from: [-hw, hd - depth],
      along: [0, -1],
      facing: [1, 0],
      length: room.d - 2 * depth,
      depth,
      wall: 'west',
    },
  ];
  const walkways: Region[] = [];
  const inner = { x: hw - depth, z: hd - depth };
  const ring = (x: number, z: number, name: string) =>
    walkways.push({
      name,
      kind: 'walkway',
      min: [-x, 0, -z],
      max: [x, WALK_HEADROOM, z],
      forbids: { machines: true, runs: true },
    });
  if (pattern === 'perimeter') {
    ring(inner.x, inner.z, 'The middle, all walkway');
    return { bands, walkways };
  }
  // The island, along the room's longer side, two bands back to back.
  const island = {
    x: inner.x - walkway,
    z: inner.z - walkway,
  };
  const longX = island.x >= island.z;
  const half = longX ? island.z : island.x;
  const length = 2 * (longX ? island.x : island.z);
  const islandDepth = Math.min(depth, half);
  if (half > 0.8 && length > 1.5) {
    if (longX) {
      bands.push(
        {
          name: 'island, north face',
          from: [-island.x, 0],
          along: [1, 0],
          facing: [0, -1],
          length,
          depth: islandDepth,
        },
        {
          name: 'island, south face',
          from: [island.x, 0],
          along: [-1, 0],
          facing: [0, 1],
          length,
          depth: islandDepth,
        },
      );
    } else {
      bands.push(
        {
          name: 'island, west face',
          from: [0, island.z],
          along: [0, -1],
          facing: [-1, 0],
          length,
          depth: islandDepth,
        },
        {
          name: 'island, east face',
          from: [0, -island.z],
          along: [0, 1],
          facing: [1, 0],
          length,
          depth: islandDepth,
        },
      );
    }
  }
  // The ring walkway, as four strips.
  const w = walkway;
  for (const [name, f] of [
    ['north', box(-inner.x, -inner.z, inner.x, -inner.z + w)],
    ['south', box(-inner.x, inner.z - w, inner.x, inner.z)],
    ['west', box(-inner.x, -inner.z + w, -inner.x + w, inner.z - w)],
    ['east', box(inner.x - w, -inner.z + w, inner.x, inner.z - w)],
  ] as const)
    walkways.push({
      name: `Walkway, ${name} side`,
      kind: 'walkway',
      min: [f.minX, 0, f.minZ],
      max: [f.maxX, WALK_HEADROOM, f.maxZ],
      forbids: { machines: true, runs: true },
    });
  return { bands, walkways };
}

/** The quarter-turn that faces (fx, fz): south 0, east 1, north 2, west 3. */
const turnFacing = (f: readonly [number, number]) =>
  f[1] > 0.5 ? 0 : f[0] > 0.5 ? 1 : f[1] < -0.5 ? 2 : 3;

/** A point in a machine's own frame, in the room's, for a quarter-turn `r`. */
function toRoom(p: Vec3, x: number, z: number, r: number): Vec3 {
  const yaw = (r * Math.PI) / 2;
  const c = Math.round(Math.cos(yaw));
  const s = Math.round(Math.sin(yaw));
  return [x + p[0] * c + p[2] * s, p[1], z - p[0] * s + p[2] * c];
}

interface State {
  /** Each machine's band. */
  band: number[];
  /** Its place in its band's order. */
  order: number[];
  /** Extra space before it, metres. */
  pad: number[];
}

export function placeMachines(
  room: RegionRoom,
  regions: readonly Region[],
  items: readonly PlaceItem[],
  links: readonly PlaceLink[],
  { seed = 1, iterations = 6000, walkway = MAIN_WALKWAY }: PlaceOptions = {},
): PlaceResult {
  const n = items.length;
  const hw = room.w / 2;
  const hd = room.d / 2;
  const index = new Map(items.map((item, i) => [item.key, i]));
  const keepOut = regions.filter((r) => r.forbids.machines);
  const noRuns = regions.filter((r) => r.forbids.runs);
  const doors = regions.filter((r) => r.kind === 'door').map(plan);
  const pulls = links
    .map((l) => ({ ...l, i: index.get(l.a), j: index.get(l.b) }))
    .filter(
      (l): l is typeof l & { i: number; j: number } =>
        l.i !== undefined && l.j !== undefined && l.i !== l.j,
    );
  // The bands' depth: the deepest machine with the gap at its back.
  // A block across the island needs only half its depth in each face.
  const depth =
    Math.max(...items.map((i) => (i.bothFaces ? i.d / 2 : i.d))) +
    MACHINE_GAP / 2;

  interface Laid {
    x: number;
    z: number;
    r: number;
    /** Its band. */
    k: number;
    footprint: Footprint;
    /** How far it stands from the nearer end of its band, metres. */
    fromEnd: number;
    /** How far it runs past its band's end, metres. */
    over: number;
  }

  const solve = (pattern: 'ring' | 'perimeter') => {
    const { bands, walkways } = patternBands(room, pattern, depth, walkway);
    const strips = bands.map(bandFootprint);
    // Which bands each machine may stand in.
    const allowed = items.map((item) =>
      bands
        .map((_, k) => k)
        .filter((k) =>
          item.bothFaces
            ? // Across the island: in its first face, the second kept clear.
              bands[k].name === 'island, north face' ||
              bands[k].name === 'island, west face'
            : item.walls?.length
              ? bands[k].wall !== undefined &&
                item.walls.includes(bands[k].wall!)
              : item.site === 'corner'
                ? // Only the bands that run the room's whole width end in its corners.
                  bands[k].wall === 'north' || bands[k].wall === 'south'
                : item.site === 'wall'
                  ? bands[k].wall !== undefined
                  : true,
        ),
    );
    /** The stretches along each band a machine of height `h` may not stand in: [from, to] along it. */
    const blockedAlong = (k: number, item: PlaceItem) => {
      const b = bands[k];
      const out: [number, number][] = [];
      const consider = [
        ...keepOut.filter((r) => r.min[1] < item.h && r.max[1] > 0),
        ...(item.clearAbove ? noRuns.filter((r) => r.max[1] > item.h) : []),
      ];
      for (const r of consider) {
        const m = meet(strips[k], plan(r));
        if (area(m) <= 1e-9) continue;
        const s = (x: number, z: number) =>
          (x - b.from[0]) * b.along[0] + (z - b.from[1]) * b.along[1];
        const a = s(m.minX, m.minZ);
        const c = s(m.maxX, m.maxZ);
        out.push([Math.min(a, c), Math.max(a, c)]);
      }
      return out;
    };
    const blockedCache = new Map<string, [number, number][]>();
    const blocked = (k: number, i: number) => {
      const key = `${k}:${i}`;
      let v = blockedCache.get(key);
      if (!v) blockedCache.set(key, (v = blockedAlong(k, items[i])));
      return v;
    };

    // A block across the island with no island to stand in may stand in
    // any band, but breaks a rule there.
    allowed.forEach((list, i) => {
      if (!list.length) allowed[i] = bands.map((_, k) => k);
    });
    const lay = (s: State): Laid[] => {
      const laid: Laid[] = Array(n);
      /** Stretches of the island's second face taken by blocks across both. */
      const across = new Map<number, [number, number][]>();
      for (let k = 0; k < bands.length; k++) {
        const b = bands[k];
        const members = [];
        for (let i = 0; i < n; i++) if (s.band[i] === k) members.push(i);
        members.sort((a, c) => s.order[a] - s.order[c]);
        let cursor = MACHINE_GAP / 2;
        for (const [rank, i] of members.entries()) {
          const item = items[i];
          let at = cursor + s.pad[i];
          // The last in a band, if it belongs in a corner, goes right to
          // the band's end, into its corner.
          if (
            rank === members.length - 1 &&
            members.length > 1 &&
            item.site === 'corner'
          )
            at = Math.max(at, b.length - item.w - MACHINE_GAP / 2);
          // Past anything it may not stand in.
          for (let moved = true; moved;) {
            moved = false;
            for (const [lo, hi] of [...blocked(k, i), ...(across.get(k) ?? [])])
              if (
                at < hi + MACHINE_GAP / 2 &&
                at + item.w > lo - MACHINE_GAP / 2
              ) {
                at = hi + MACHINE_GAP / 2;
                moved = true;
              }
          }
          const mid = at + item.w / 2;
          // Across the island, centred on its spine; else its back to the band's back.
          const back = item.bothFaces ? 0 : MACHINE_GAP / 2 + item.d / 2;
          if (item.bothFaces)
            across.set(k + 1, [
              ...(across.get(k + 1) ?? []),
              [b.length - at - item.w, b.length - at],
            ]);
          const x = b.from[0] + b.along[0] * mid + b.facing[0] * back;
          const z = b.from[1] + b.along[1] * mid + b.facing[1] * back;
          const r = turnFacing(b.facing);
          const [hx, hz] =
            r % 2 === 0 ? [item.w / 2, item.d / 2] : [item.d / 2, item.w / 2];
          laid[i] = {
            x,
            z,
            r,
            k,
            footprint: {
              minX: x - hx,
              maxX: x + hx,
              minZ: z - hz,
              maxZ: z + hz,
            },
            over: Math.max(0, at + item.w + MACHINE_GAP / 2 - b.length),
            fromEnd: Math.max(
              0,
              Math.min(
                at - MACHINE_GAP / 2,
                b.length - (at + item.w + MACHINE_GAP / 2),
              ),
            ),
          };
          cursor = at + item.w + MACHINE_GAP;
        }
      }
      return laid;
    };

    const leadOf = (
      laid: Laid[],
      i: number,
      port: string | undefined,
    ): Vec3 => {
      const p = port ? items[i].ports?.[port] : undefined;
      const { x, z, r } = laid[i];
      if (!p) return [x, 0, z];
      return toRoom(
        [
          p.at[0] + p.out[0] * LEAD,
          p.at[1] + p.out[1] * LEAD,
          p.at[2] + p.out[2] * LEAD,
        ],
        x,
        z,
        r,
      );
    };
    const linkLength = (laid: Laid[]) => {
      let total = 0;
      for (const l of pulls) {
        const a = leadOf(laid, l.i, l.aPort);
        const b = leadOf(laid, l.j, l.bPort);
        total +=
          l.weight *
          (Math.abs(a[0] - b[0]) +
            Math.abs(a[1] - b[1]) +
            Math.abs(a[2] - b[2]));
      }
      return total;
    };
    /** Broken rules, metres or m², with each machine's share. */
    const breaches = (laid: Laid[], blame?: number[]) => {
      let total = 0;
      const add = (i: number, v: number) => {
        if (v <= 1e-9) return;
        total += v;
        if (blame) blame[i] += v;
      };
      for (let i = 0; i < n; i++) {
        add(i, laid[i].over * 2);
        // A corner machine not in its corner.
        if (items[i].site === 'corner') add(i, laid[i].fromEnd);
        // Deeper than its band: out into the walkway.
        add(
          i,
          Math.max(
            0,
            (items[i].bothFaces
              ? items[i].d / 2
              : items[i].d + MACHINE_GAP / 2) - bands[laid[i].k].depth,
          ) * items[i].w,
        );
        // A block across the island, not in the island.
        if (items[i].bothFaces && bands[laid[i].k].wall !== undefined)
          add(i, items[i].w * items[i].d);
        for (let j = i + 1; j < n; j++) {
          const v = overlapArea(
            grow(laid[i].footprint, MACHINE_GAP / 2 - 1e-6),
            grow(laid[j].footprint, MACHINE_GAP / 2 - 1e-6),
          );
          add(i, v / 2);
          add(j, v / 2);
        }
        for (const r of keepOut)
          if (r.min[1] < items[i].h && r.max[1] > 0)
            add(i, overlapArea(laid[i].footprint, plan(r)));
        if (items[i].clearAbove)
          for (const r of noRuns)
            if (r.max[1] > items[i].h)
              add(i, overlapArea(laid[i].footprint, plan(r)));
      }
      return total;
    };
    const BREACH = 400;
    /** What a freestanding machine against a wall costs, as metres of pipe. */
    const AGAINST_WALL = 4;
    /** What splitting a battery costs: across bands, and with another machine between two of it. */
    const SPLIT_BAND = 30;
    const BETWEEN = 8;
    const groups = new Map<string, number[]>();
    items.forEach((item, i) => {
      if (item.group)
        groups.set(item.group, [...(groups.get(item.group) ?? []), i]);
    });
    const batteries = [...groups.values()].filter((g) => g.length > 1);
    /** How broken up the batteries are. */
    const scattering = (s: State) => {
      let cost = 0;
      for (const members of batteries) {
        const bandsUsed = new Set(members.map((i) => s.band[i]));
        cost += (bandsUsed.size - 1) * SPLIT_BAND;
        for (const k of bandsUsed) {
          const inBand = [...Array(n).keys()]
            .filter((i) => s.band[i] === k)
            .sort((a, b) => s.order[a] - s.order[b]);
          const at = inBand
            .map((i, rank) => (members.includes(i) ? rank : -1))
            .filter((rank) => rank >= 0);
          // The others standing between the first of it and the last.
          if (at.length > 1)
            cost += (at.at(-1)! - at[0] + 1 - at.length) * BETWEEN;
        }
      }
      return cost;
    };
    const cost = (s: State) => {
      const laid = lay(s);
      let preference = 0;
      for (let i = 0; i < n; i++)
        if (items[i].site === 'free' && bands[laid[i].k].wall !== undefined)
          preference += AGAINST_WALL;
      return (
        linkLength(laid) + BREACH * breaches(laid) + preference + scattering(s)
      );
    };

    const rand = random(seed * 104729 + (pattern === 'ring' ? 1 : 2));
    // Start: the corner machines first, biggest first, each to an end of a
    // band; then the wall machines; then the rest, freestanding ones to the
    // island; each to the band it may use with the most room left.
    const s: State = { band: Array(n), order: Array(n), pad: Array(n).fill(0) };
    const used = bands.map(() => 0);
    [...items.keys()]
      .sort((a, b) => {
        const rank = (i: number) =>
          items[i].site === 'corner' ? 0 : items[i].site === 'wall' ? 1 : 2;
        return (
          rank(a) - rank(b) || items[b].w * items[b].d - items[a].w * items[a].d
        );
      })
      .forEach((i, rank) => {
        const island = allowed[i].filter((k) => bands[k].wall === undefined);
        const options =
          items[i].site === 'free' && island.length ? island : allowed[i];
        const k = options.reduce(
          (best, k) =>
            used[k] / bands[k].length < used[best] / bands[best].length
              ? k
              : best,
          options[0],
        );
        s.band[i] = k;
        // A corner machine at its band's start or end, by turns.
        s.order[i] =
          items[i].site === 'corner' ? (rank % 2 === 0 ? -100 : 100) : rank;
        used[k] += items[i].w + MACHINE_GAP;
      });
    let c = cost(s);
    let best = { band: [...s.band], order: [...s.order], pad: [...s.pad] };
    let bestCost = c;
    const t0 = 30;
    const t1 = 0.05;
    for (let it = 0; it < iterations; it++) {
      const t = t0 * (t1 / t0) ** (it / iterations);
      const next = { band: [...s.band], order: [...s.order], pad: [...s.pad] };
      const i = Math.floor(rand() * n);
      const move = rand();
      if (move < 0.35) {
        // To another band, somewhere in its order.
        const options = allowed[i];
        next.band[i] = options[Math.floor(rand() * options.length)];
        next.order[i] = rand() * n;
      } else if (move < 0.7) {
        // Swap places with another.
        const j = Math.floor(rand() * n);
        if (
          j === i ||
          !allowed[i].includes(s.band[j]) ||
          !allowed[j].includes(s.band[i])
        )
          continue;
        next.band[i] = s.band[j];
        next.band[j] = s.band[i];
        next.order[i] = s.order[j];
        next.order[j] = s.order[i];
      } else if (move < 0.85) {
        next.order[i] = s.order[i] + (rand() - 0.5) * 3;
      } else {
        next.pad[i] = Math.max(
          0,
          Math.round((s.pad[i] + (rand() - 0.5) * 1.5) * 4) / 4,
        );
      }
      const nc = cost(next);
      if (nc <= c || rand() < Math.exp((c - nc) / t)) {
        s.band = next.band;
        s.order = next.order;
        s.pad = next.pad;
        c = nc;
        if (c < bestCost) {
          best = { band: [...s.band], order: [...s.order], pad: [...s.pad] };
          bestCost = c;
        }
      }
    }
    const laid = lay(best);
    const blame = Array(n).fill(0);
    breaches(laid, blame);
    return {
      bands,
      walkways,
      laid,
      cost: bestCost,
      blame,
      linkLength: linkLength(laid),
      best,
    };
  };

  // The walking check: from the doors, on a grid, a walker's width clear.
  const cell = 0.25;
  const nx = Math.ceil(room.w / cell);
  const nz = Math.ceil(room.d / cell);
  const unreachable = (laid: Laid[]): number[] => {
    const blockedCells = new Uint8Array(nx * nz);
    const seen = new Uint8Array(nx * nz);
    const queue = new Int32Array(nx * nz);
    const cellsOf = (f: Footprint) => ({
      i0: Math.max(0, Math.floor((f.minX + hw) / cell)),
      i1: Math.min(nx - 1, Math.ceil((f.maxX + hw) / cell) - 1),
      k0: Math.max(0, Math.floor((f.minZ + hd) / cell)),
      k1: Math.min(nz - 1, Math.ceil((f.maxZ + hd) / cell) - 1),
    });
    const mark = (f: Footprint) => {
      const { i0, i1, k0, k1 } = cellsOf(f);
      for (let k = k0; k <= k1; k++)
        for (let i = i0; i <= i1; i++) blockedCells[k * nx + i] = 1;
    };
    for (let i = 0; i < nx; i++)
      for (let k = 0; k < nz; k++) {
        const x = -hw + (i + 0.5) * cell;
        const z = -hd + (k + 0.5) * cell;
        if (hw - Math.abs(x) < WALKER || hd - Math.abs(z) < WALKER)
          blockedCells[k * nx + i] = 1;
      }
    for (const l of laid) mark(grow(l.footprint, WALKER - 1e-6));
    for (const r of regions)
      if (r.kind === 'stair') mark(grow(plan(r), WALKER));
    let head = 0;
    let tail = 0;
    for (const door of doors) {
      const { i0, i1, k0, k1 } = cellsOf(door);
      for (let k = k0; k <= k1; k++)
        for (let i = i0; i <= i1; i++) {
          const c = k * nx + i;
          if (!blockedCells[c] && !seen[c]) {
            seen[c] = 1;
            queue[tail++] = c;
          }
        }
    }
    while (head < tail) {
      const c = queue[head++];
      const i = c % nx;
      const k = (c - i) / nx;
      const step = (a: number, b: number) => {
        if (a < 0 || b < 0 || a >= nx || b >= nz) return;
        const d = b * nx + a;
        if (blockedCells[d] || seen[d]) return;
        seen[d] = 1;
        queue[tail++] = d;
      };
      step(i + 1, k);
      step(i - 1, k);
      step(i, k + 1);
      step(i, k - 1);
    }
    const lost: number[] = [];
    laid.forEach((l, j) => {
      // The strip just in front of it, a walker's depth.
      const r = l.r;
      const front = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ][r];
      const f = l.footprint;
      const probe =
        front[0] === 1
          ? box(f.maxX, f.minZ, f.maxX + 2 * WALKER + cell, f.maxZ)
          : front[0] === -1
            ? box(f.minX - 2 * WALKER - cell, f.minZ, f.minX, f.maxZ)
            : front[1] === 1
              ? box(f.minX, f.maxZ, f.maxX, f.maxZ + 2 * WALKER + cell)
              : box(f.minX, f.minZ - 2 * WALKER - cell, f.maxX, f.minZ);
      const { i0, i1, k0, k1 } = cellsOf(probe);
      let ok = false;
      for (let k = k0; k <= k1 && !ok; k++)
        for (let i = i0; i <= i1 && !ok; i++) ok = seen[k * nx + i] === 1;
      if (!ok) lost.push(j);
    });
    return lost;
  };

  const tried = (['ring', 'perimeter'] as const).map((pattern) => {
    const solved = solve(pattern);
    const lost = unreachable(solved.laid);
    return { pattern, ...solved, lost, score: solved.cost + 60 * lost.length };
  });
  const won = tried.reduce((a, b) => (b.score < a.score ? b : a));
  const problems = [
    ...won.blame.flatMap((v, i) =>
      v > 1e-6
        ? [`${items[i].key}: breaks a placing rule by ${v.toFixed(2)}`]
        : [],
    ),
    ...won.lost.map(
      (i) => `${items[i].key}: no way to walk to its front from a door`,
    ),
  ];
  return {
    placed: items.map((item, i) => {
      const l = won.laid[i];
      const a = item.access ?? ACCESS;
      const f = l.footprint;
      const access =
        l.r === 0
          ? box(f.minX, f.maxZ, f.maxX, f.maxZ + a)
          : l.r === 1
            ? box(f.maxX, f.minZ, f.maxX + a, f.maxZ)
            : l.r === 2
              ? box(f.minX, f.minZ - a, f.maxX, f.minZ)
              : box(f.minX - a, f.minZ, f.minX, f.maxZ);
      return {
        key: item.key,
        x: l.x,
        z: l.z,
        yaw: (l.r * Math.PI) / 2,
        footprint: f,
        access,
        band: won.bands[won.best.band[i]].name,
      };
    }),
    bands: won.bands,
    walkways: won.walkways,
    length: won.linkLength,
    pattern: won.pattern,
    problems,
  };
}
