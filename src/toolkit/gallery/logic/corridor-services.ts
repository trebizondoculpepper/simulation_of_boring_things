import { CORRIDOR_DOORS, MAIN_CORRIDOR } from './main-corridor';
import type { CorridorDoor } from './main-corridor';

/**
 * The services through the ring corridor, as decoration (prompt 088; the
 * research, `doc/research/corridor-services.md`; the owner's rulings,
 * 2026-10-27): nothing worked and nothing bound to the plant model, but
 * every line a plausible size, in a plausible place, going the right way.
 *
 * The power already runs round the ring on its cable ladder, close under
 * the outside walls (`cable-containment.ts`), so the wet services keep to
 * the other side, on brackets along the wet hall's walls, and never above
 * the electrics: top down, the heating flow and return ring (DN80, the
 * boiler house's own size, lagged), the boosted make-up ring (76.1 mm
 * copper), the backwash main (160 mm PVC-U) from the Lounge's and the
 * Olympic's plant rooms, and lowest the chemical lines (32 mm PVC-U in
 * their containment): the two mains from the stores (beyond the loading
 * bay) to the wet hall, and the eight branches from the wet hall to the
 * four pool plant rooms. Each room takes its lines straight across the
 * corridor into its wall beside its doors, any that must cross another
 * line of its tier stepping over or under it. Levels between rooms do
 * not matter (the owner, 2026-10-27): each line runs at its tier's height
 * and goes into a wall at it.
 *
 * Pure: metres, the corridor's frame (the ring's north-west outside
 * corner at the origin, x east, z south, the floor at y = 0); every run's
 * points in the way it flows.
 */

export type Vec3 = readonly [number, number, number];

export type CorridorService =
  | 'heating flow'
  | 'heating return'
  | 'make-up'
  | 'cold water'
  | 'hot water'
  | 'drainage'
  | 'hypochlorite'
  | 'acid';

/** Where a run goes into a wall: the wall's middle, and its face's normal into the corridor. */
export interface CorridorPenetration {
  at: Vec3;
  normal: Vec3;
}

export interface CorridorRun {
  name: string;
  kind: 'lagged-heating' | 'copper' | 'pvc-pressure';
  od: number;
  service: CorridorService;
  label: string;
  points: Vec3[];
  /** Its wall penetrations, each fire-stopped. */
  through: CorridorPenetration[];
  /** A chemical line, in its containment. */
  contained?: boolean;
  /** The rooms it serves, or comes from (by id). */
  rooms: string[];
}

const C = MAIN_CORRIDOR;
const S = C.side;
/** The wet hall's walls' corridor faces stand this far in from the outside walls' faces. */
const W = C.width;
/** How far into a wall a run goes (it disappears into it). */
const INTO = C.wall;

/** The headroom kept clear over the corridor's walkway (the research's 2.8 m). */
export const CORRIDOR_HEADROOM = 2.8;

/** Each tier's height (the research's O1–O4), under the cable ladder (4.4 m). */
export const TIER = {
  heating: 4.2,
  /** Where a heating flow tee drops to, to pass under the return ring. */
  heatingUnder: 3.95,
  makeUp: 3.65,
  cold: 3.4,
  backwash: 3.15,
  /** Where a chemical line steps up to, to cross the others of its tier. */
  chemicalOver: 3.0,
  chemical: 2.9,
} as const;

/** Each line's distance out from the wet hall's walls. */
const INSET = {
  flow: 0.2,
  return: 0.48,
  makeUp: 0.2,
  backwash: 0.3,
  /** The two chemical mains, hypochlorite then acid. */
  main: [0.15, 0.45],
  /** The first branch, and the spacing of the eight. */
  branch: 0.75,
  branchStep: 0.14,
} as const;

type Side = 'north' | 'east' | 'south' | 'west';

/**
 * A loop round the wet hall's block at `inset` out from its walls,
 * measured clockwise from its north-west corner: `at(s)` the point `s`
 * metres round; `of(side, along)` how far round a place on a side is (x
 * along the north and south, z along the east and west, clamped to the
 * loop); `path(s0, s1, y)` the points clockwise from one to the other.
 */
function loop(inset: number) {
  const a = W - inset;
  const b = S - a;
  const len = b - a;
  const total = 4 * len;
  const at = (s: number): [number, number] => {
    const t = ((s % total) + total) % total;
    if (t < len) return [a + t, a];
    if (t < 2 * len) return [b, a + (t - len)];
    if (t < 3 * len) return [b - (t - 2 * len), b];
    return [a, b - (t - 3 * len)];
  };
  const of = (side: Side, along: number) => {
    const c = Math.min(b, Math.max(a, along));
    return side === 'north'
      ? c - a
      : side === 'east'
        ? len + (c - a)
        : side === 'south'
          ? 2 * len + (b - c)
          : 3 * len + (b - c);
  };
  const path = (s0: number, s1: number, y: number): Vec3[] => {
    const end = s1 >= s0 ? s1 : s1 + total;
    const out: Vec3[] = [];
    const push = (s: number) => {
      const [x, z] = at(s);
      out.push([x, y, z]);
    };
    push(s0);
    for (let k = Math.floor(s0 / len) + 1; k * len < end - 1e-9; k++)
      push(k * len);
    push(end);
    return out;
  };
  return { a, b, len, total, at, of, path };
}

type Loop = ReturnType<typeof loop>;

/** The way out of the corridor through each side's outside wall, in plan. */
const OUT: Record<Side, readonly [number, number]> = {
  north: [0, -1],
  south: [0, 1],
  west: [-1, 0],
  east: [1, 0],
};

const sideOf = (d: CorridorDoor) => d.wall.replace('inner-', '') as Side;

/**
 * From a line's point on its loop across the corridor into a wall: the
 * outside wall (a room off the ring) or the wet hall's. With `step`, it
 * first rises or drops to that height to pass the lines between.
 * Returns the points, from the loop outward, and the wall penetration.
 */
function across(
  l: Loop,
  side: Side,
  along: number,
  y: number,
  to: 'outer' | 'inner',
  step?: number,
): { points: Vec3[]; through: CorridorPenetration } {
  const [x, z] = l.at(l.of(side, along));
  const [ox, oz] = OUT[side];
  const dir = to === 'outer' ? 1 : -1;
  // The wall's corridor face, along the way out.
  const face =
    to === 'outer'
      ? side === 'north' || side === 'west'
        ? 0
        : S
      : side === 'north' || side === 'west'
        ? W
        : S - W;
  const end = (d: number): [number, number] =>
    ox !== 0 ? [face + ox * dir * d, z] : [x, face + oz * dir * d];
  const h = step ?? y;
  const points: Vec3[] = [[x, y, z]];
  if (step !== undefined) points.push([x, h, z]);
  const [ex, ez] = end(INTO);
  points.push([ex, h, ez]);
  const [mx, mz] = end(INTO / 2);
  return {
    points,
    through: {
      at: [mx, h, mz],
      normal: [-ox * dir, 0, -oz * dir],
    },
  };
}

const doorOf = (to: string) => {
  const d = CORRIDOR_DOORS.find((door) => door.to === to);
  if (!d) throw new Error(`no corridor door to ${to}`);
  return d;
};

/** Toward the middle of a room's frontage, away from the ring's corners. */
const inward = (d: CorridorDoor) => (d.at < S / 2 ? 1 : -1);

/** The four pool plant rooms each chemical reaches, in the order its branches lie out from the wall. */
export const CHEMICAL_ROOMS = [
  'plant_pool_02',
  'plant_pool_04',
  'plant_pool_03',
  'plant_pool_01',
] as const;

/** The rooms off the ring heated off the heating ring and fed off the make-up ring. */
export const RING_ROOMS = [
  'plant_pool_01',
  'plant_pool_02',
  'plant_pool_03',
  'plant_pool_04',
  'air_plant',
] as const;

const reversed = <T>(xs: T[]) => [...xs].reverse();

export function corridorServices(): CorridorRun[] {
  const runs: CorridorRun[] = [];
  const add = (
    r: Omit<CorridorRun, 'through'> & { through?: CorridorPenetration[] },
  ) => runs.push({ through: [], ...r });

  // ---- The rings, each drawn side by side (one length, and its label, to
  // a side), overlapping round each corner. -------------------------------
  const ring = (
    name: string,
    kind: CorridorRun['kind'],
    od: number,
    inset: number,
    y: number,
    service: CorridorService,
    label: string,
    clockwise: boolean,
  ) => {
    const l = loop(inset);
    const sides: Side[] = ['north', 'east', 'south', 'west'];
    sides.forEach((side, i) => {
      let points = l.path(i * l.len, (i + 1) * l.len + 0.3, y);
      if (!clockwise) points = reversed(points);
      add({
        name: `${name}, ${side}`,
        kind,
        od,
        service,
        label,
        points,
        rooms: [],
      });
    });
    return l;
  };
  const flow = ring(
    'LTHW flow ring',
    'lagged-heating',
    0.0889,
    INSET.flow,
    TIER.heating,
    'heating flow',
    'LTHW FLOW',
    true,
  );
  const ret = ring(
    'LTHW return ring',
    'lagged-heating',
    0.0889,
    INSET.return,
    TIER.heating,
    'heating return',
    'LTHW RETURN',
    false,
  );
  const make = ring(
    'Make-up ring',
    'copper',
    0.0761,
    INSET.makeUp,
    TIER.makeUp,
    'make-up',
    'BOOSTED MAKE-UP',
    true,
  );

  // ---- Each room's tees off the rings, beside its doors. ----------------
  for (const room of RING_ROOMS) {
    const d = doorOf(room);
    const side = sideOf(d);
    const k = -inward(d);
    const f = across(
      flow,
      side,
      d.at + k * 1.6,
      TIER.heating,
      'outer',
      TIER.heatingUnder,
    );
    add({
      name: `LTHW flow to ${room}`,
      kind: 'lagged-heating',
      od: 0.0603,
      service: 'heating flow',
      label: 'LTHW FLOW',
      points: f.points,
      through: [f.through],
      rooms: [room],
    });
    const r = across(ret, side, d.at + k * 2.1, TIER.heating, 'outer');
    add({
      name: `LTHW return from ${room}`,
      kind: 'lagged-heating',
      od: 0.0603,
      service: 'heating return',
      label: 'LTHW RETURN',
      points: reversed(r.points),
      through: [r.through],
      rooms: [room],
    });
    const m = across(make, side, d.at + k * 2.6, TIER.makeUp, 'outer');
    add({
      name: `Make-up to ${room}`,
      kind: 'copper',
      od: 0.054,
      service: 'make-up',
      label: 'BOOSTED MAKE-UP',
      points: m.points,
      through: [m.through],
      rooms: [room],
    });
  }
  // The boiler house feeds the heating ring: its flow out into it, its
  // return back from it, each its own DN80.
  {
    const d = doorOf('boiler_house');
    const side = sideOf(d);
    const f = across(
      flow,
      side,
      d.at - 1.6,
      TIER.heating,
      'outer',
      TIER.heatingUnder,
    );
    add({
      name: 'LTHW flow from the boiler house',
      kind: 'lagged-heating',
      od: 0.0889,
      service: 'heating flow',
      label: 'LTHW FLOW',
      points: reversed(f.points),
      through: [f.through],
      rooms: ['boiler_house'],
    });
    const r = across(ret, side, d.at - 2.2, TIER.heating, 'outer');
    add({
      name: 'LTHW return to the boiler house',
      kind: 'lagged-heating',
      od: 0.0889,
      service: 'heating return',
      label: 'LTHW RETURN',
      points: r.points,
      through: [r.through],
      rooms: ['boiler_house'],
    });
    // The cold water main from the wet hall to the calorifier (the owner's
    // default, 2026-10-27), straight across.
    const cold = loop(0.1);
    const out = across(cold, side, d.at + 1.8, TIER.cold, 'outer');
    const into = across(cold, side, d.at + 1.8, TIER.cold, 'inner');
    add({
      name: 'Cold water main to the boiler house',
      kind: 'copper',
      od: 0.042,
      service: 'cold water',
      label: 'COLD WATER',
      points: [...reversed(into.points), ...out.points.slice(1)],
      through: [into.through, out.through],
      rooms: ['wet_hall', 'boiler_house'],
    });
    // The hot water flow and return to the building: out of the boiler
    // house under the cable ladder, and up beside it into the services
    // ceiling (the owner's default, 2026-10-27).
    for (const [k, name, label] of [
      [2.6, 'Hot water flow to the building', 'HWS FLOW'],
      [2.9, 'Hot water return from the building', 'HWS RETURN'],
    ] as const) {
      const l = loop(W - 0.9);
      const w = across(l, side, d.at + k, TIER.cold, 'outer');
      const [x, , z] = w.points[0];
      const points: Vec3[] = [...reversed(w.points), [x, 6.6, z]];
      add({
        name,
        kind: 'lagged-heating',
        od: 0.0337,
        service: 'hot water',
        label,
        points: k === 2.6 ? points : reversed(points),
        through: [w.through],
        rooms: ['boiler_house'],
      });
    }
  }
  // The make-up ring's feed: out of the wet hall's north wall into it.
  {
    const w = across(make, 'north', 19.2, TIER.makeUp, 'inner');
    add({
      name: 'Make-up from the wet hall',
      kind: 'copper',
      od: 0.0761,
      service: 'make-up',
      label: 'BOOSTED MAKE-UP',
      points: reversed(w.points),
      through: [w.through],
      rooms: ['wet_hall'],
    });
  }

  // ---- The backwash: from the Lounge's plant room, round by the west and
  // the north, joined by the Olympic's, into the wet hall. --------------
  {
    const l = loop(INSET.backwash);
    const pl1 = doorOf('plant_pool_01');
    const start = across(
      l,
      'south',
      pl1.at - inward(pl1) * 3.1,
      TIER.backwash,
      'outer',
    );
    const main = l.path(
      l.of('south', pl1.at - inward(pl1) * 3.1),
      l.of('north', 8.5),
      TIER.backwash,
    );
    const end = across(l, 'north', 8.5, TIER.backwash, 'inner');
    add({
      name: 'Backwash main to the wet hall',
      kind: 'pvc-pressure',
      od: 0.16,
      service: 'drainage',
      label: 'BACKWASH',
      points: [...reversed(start.points), ...main.slice(1, -1), ...end.points],
      through: [start.through, end.through],
      rooms: ['plant_pool_01', 'wet_hall'],
    });
    const pl2 = doorOf('plant_pool_02');
    const b = across(
      l,
      'north',
      pl2.at - inward(pl2) * 3.1,
      TIER.backwash,
      'outer',
    );
    add({
      name: 'Backwash from plant_pool_02',
      kind: 'pvc-pressure',
      od: 0.11,
      service: 'drainage',
      label: 'BACKWASH',
      points: reversed(b.points),
      through: [b.through],
      rooms: ['plant_pool_02'],
    });
  }

  // ---- The chemicals ----------------------------------------------------
  const CHEMICALS = [
    ['hypochlorite', 'SODIUM HYPOCHLORITE', 'Hypochlorite'],
    ['acid', 'HYDROCHLORIC ACID', 'Acid'],
  ] as const;
  const bay = doorOf('loading_bay');
  CHEMICALS.forEach(([chemical, label, Name], ci) => {
    // Its main: in from the loading bay, the stores beyond it, round by
    // the north into the wet hall's east wall.
    const l = loop(INSET.main[ci]);
    const z0 = bay.at - 1.5 + ci * 0.3;
    const z1 = 17.3 + ci * 0.7;
    const start = across(
      l,
      'west',
      z0,
      TIER.chemical,
      'outer',
      TIER.chemicalOver,
    );
    const main = l.path(l.of('west', z0), l.of('east', z1), TIER.chemical);
    const end = across(l, 'east', z1, TIER.chemical, 'inner');
    add({
      name: `${Name} main to the wet hall`,
      kind: 'pvc-pressure',
      od: 0.032,
      service: chemical,
      label,
      contained: true,
      points: [...reversed(start.points), ...main.slice(1, -1), ...end.points],
      through: [start.through, end.through],
      rooms: [chemical === 'acid' ? 'acid_store' : 'hypo_store', 'wet_hall'],
    });
    // Its branches: out of the wet hall's north wall, and west along it
    // and round, each to its plant room.
    CHEMICAL_ROOMS.forEach((room, ri) => {
      const d = doorOf(room);
      const bl = loop(
        INSET.branch + (ci * CHEMICAL_ROOMS.length + ri) * INSET.branchStep,
      );
      const x0 = 20.0 + ci * 1.3 + ri * 0.3;
      const along = d.at + inward(d) * (2.2 + ci * 0.4);
      const out = across(
        bl,
        'north',
        x0,
        TIER.chemical,
        'inner',
        TIER.chemicalOver,
      );
      const route = reversed(
        bl.path(bl.of(sideOf(d), along), bl.of('north', x0), TIER.chemical),
      );
      const into = across(
        bl,
        sideOf(d),
        along,
        TIER.chemical,
        'outer',
        TIER.chemicalOver,
      );
      add({
        name: `${Name} branch to ${room}`,
        kind: 'pvc-pressure',
        od: 0.032,
        service: chemical,
        label,
        contained: true,
        points: [
          ...reversed(out.points),
          ...route.slice(1, -1),
          ...into.points,
        ],
        through: [out.through, into.through],
        rooms: ['wet_hall', room],
      });
    });
  });
  return runs.map((r) => ({ ...r, points: straightened(r.points) }));
}

/** The points with any repeated, or between two in line with it, dropped. */
function straightened(points: Vec3[]): Vec3[] {
  const same = (p: Vec3, q: Vec3) =>
    Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-6;
  const pts = points.filter((p, i) => i === 0 || !same(p, points[i - 1]));
  return pts.filter((p, i) => {
    if (i === 0 || i === pts.length - 1) return true;
    const a = pts[i - 1];
    const b = pts[i + 1];
    const u = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const v = [b[0] - p[0], b[1] - p[1], b[2] - p[2]];
    const cross = Math.hypot(
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    );
    return cross > 1e-9 || u[0] * v[0] + u[1] * v[1] + u[2] * v[2] < 0;
  });
}
