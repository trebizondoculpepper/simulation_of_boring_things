import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * Decks at several levels along a wall, and a straight stair up to them
 * outside their band: the stair helper, first the air plant's
 * (`air-plant.ts`). Pure: metres, the room's frame (x east, z south, its
 * floor at 0). The decks run along z in a band from `deck.minX` to
 * `deck.maxX`; the stair runs in a band of its own just east of them,
 * from its foot northward, a flight up to a landing beside each deck in
 * turn, every flight on in the same direction. What a walker stands on
 * (`surfaceFloorAt`) and what stops them at each level (`levelSolids`)
 * follow from the surfaces alone.
 */

/** A walking surface above the floor: level, or a flight rising from (a) to (b). */
export interface Surface {
  name: string;
  area: Footprint;
  /** Its height: level, or rising along x or z from `from` to `to`. */
  y:
    | number
    | { along: 'x' | 'z'; at0: number; y0: number; at1: number; y1: number };
}

/** The decks' width, the landings' length and the flights' width, metres. */
export const GANTRY_WIDTH = 1.2;

/** A flight's going (its length on plan), metres: 2.4 m rise over 3 m, about 39 degrees. */
export const FLIGHT = 3.0;

export interface StairRun {
  /** The decks' band: x across it, z along it. */
  deck: Footprint;
  /** Each deck's height over the floor, lowest first; a flight and a landing to each. */
  levels: readonly number[];
  /** Where the stair's foot stands, z: it climbs north (toward -z) from here. */
  foot: number;
  /** Each flight's going, metres (`FLIGHT` by default). */
  flight?: number;
  /** The decks' names, by their level's index from 0 (`Gantry 1` and on by default). */
  name?: (k: number) => string;
  /** The wall the decks stand against, the stair on their room side: west (the default) or east. */
  side?: 'west' | 'east';
  /** What its flights and landings are called, where a room has more than one (`Stair, first flight`, `First landing` by default). */
  label?: string;
}

const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
const ordinal = (k: number) => ORDINAL[k] ?? `${k + 1}th`;
const capital = (w: string) => w[0].toUpperCase() + w.slice(1);

/**
 * The decks and their stair: a deck at each level along the band, and
 * the stair just beside it on the room side, from its foot a flight north up to a landing
 * beside the first deck, then each next flight straight on north up to a
 * landing beside the next. Nothing is over any flight.
 */
export function decksAndStair(run: StairRun): Surface[] {
  const flight = run.flight ?? FLIGHT;
  const east = run.side === 'east';
  const x1 = east ? run.deck.minX - GANTRY_WIDTH : run.deck.maxX;
  const x2 = x1 + GANTRY_WIDTH;
  const label = run.label ?? 'Stair';
  const out: Surface[] = run.levels.map((y, k) => ({
    name: run.name?.(k) ?? `Gantry ${k + 1}`,
    area: { ...run.deck },
    y,
  }));
  // Up the band from its foot, each flight then its landing.
  let z = run.foot;
  let below = 0;
  run.levels.forEach((y, k) => {
    out.push(
      {
        name: `${label}, ${ordinal(k)} flight`,
        area: { minX: x1, maxX: x2, minZ: z - flight, maxZ: z },
        y: { along: 'z', at0: z, y0: below, at1: z - flight, y1: y },
      },
      {
        name: run.label
          ? `${run.label}, ${ordinal(k)} landing`
          : `${capital(ordinal(k))} landing`,
        area: {
          minX: x1,
          maxX: x2,
          minZ: z - flight - GANTRY_WIDTH,
          maxZ: z - flight,
        },
        y,
      },
    );
    z -= flight + GANTRY_WIDTH;
    below = y;
  });
  return out;
}

const inside = (f: Footprint, x: number, z: number) =>
  x >= f.minX - 1e-9 &&
  x <= f.maxX + 1e-9 &&
  z >= f.minZ - 1e-9 &&
  z <= f.maxZ + 1e-9;

/** A surface's height at (x, z). */
export function surfaceY(s: Surface, x: number, z: number): number {
  if (typeof s.y === 'number') return s.y;
  const t = ((s.y.along === 'x' ? x : z) - s.y.at0) / (s.y.at1 - s.y.at0);
  return s.y.y0 + (s.y.y1 - s.y.y0) * Math.max(0, Math.min(1, t));
}

/** How high a walker steps up without a stair's flight. */
export const STEP_UP = 0.45;

/**
 * The floor under a walker at (x, z), come from height `previous`: the
 * highest of the floor and the surfaces there that is no more than a
 * step above where they were. So one walks under a gantry, or on it.
 */
export function surfaceFloorAt(
  surfaces: readonly Surface[],
  x: number,
  z: number,
  previous: number,
): number {
  let best = 0;
  for (const s of surfaces) {
    if (!inside(s.area, x, z)) continue;
    const y = surfaceY(s, x, z);
    if (y <= previous + STEP_UP && y > best) best = y;
  }
  return best;
}

/** The surfaces one may walk on, at the level of `y`: about the floor, the first gantry, the second. */
function levelOf(surfaces: readonly Surface[], y: number) {
  const levels = [
    0,
    ...new Set(
      surfaces.filter((s) => typeof s.y === 'number').map((s) => s.y as number),
    ),
  ].sort((a, b) => a - b);
  let k = 0;
  for (let i = 0; i < levels.length; i++)
    if (Math.abs(levels[i] - y) < Math.abs(levels[k] - y)) k = i;
  return { level: levels[k], k };
}

/**
 * What stops a walker at height `y`: on the floor, the first flight's
 * underside where it is too low to pass; up on a deck, its handrails,
 * every edge of the decks and landings of that level except where one
 * meets another or a flight's mouth, and the sides of the flights that
 * reach it (never a flight's ends: one is its mouth here, the other a
 * storey away, under or over the walker).
 */
export function levelSolids(
  surfaces: readonly Surface[],
  y: number,
): Footprint[] {
  return railsAt(surfaces, y, true);
}

/**
 * The handrails to draw at a deck's level `y`: its decks' and landings'
 * open edges only. A flight's own handrails slope with it, drawn with it;
 * a level rail along a flight's side would hang over the flight below
 * it or float under the one above.
 */
export const deckRails = (surfaces: readonly Surface[], y: number) =>
  railsAt(surfaces, y, false);

function railsAt(
  surfaces: readonly Surface[],
  y: number,
  flights: boolean,
): Footprint[] {
  const { level } = levelOf(surfaces, y);
  if (level < 0.5) {
    // Climbing the first flight, not under it: nothing stops the walker
    // but the floor's level's rails, of which there are none.
    if (y > STEP_UP / 2) return [];
    // Under each stair's first flight, where its underside is below a head.
    return surfaces.flatMap((first) => {
      if (typeof first.y === 'number' || first.y.y0 !== 0) return [];
      const { at0, at1, y0, y1 } = first.y;
      const low = at0 + ((1.0 - y0) / (y1 - y0)) * (at1 - at0);
      const high = at1;
      return [
        {
          minX: first.area.minX,
          maxX: first.area.maxX,
          minZ: Math.min(low, high),
          maxZ: Math.max(low, high),
        },
      ];
    });
  }
  // The surfaces at this level, and the flights that reach it.
  const here = surfaces.filter((s) =>
    typeof s.y === 'number'
      ? Math.abs(s.y - level) < 0.01
      : Math.abs(s.y.y0 - level) < 0.01 || Math.abs(s.y.y1 - level) < 0.01,
  );
  // What opens a rail: a level surface, or a flight's mouth at this level
  // (its end at this height), never the rest of a flight beside it.
  const openings = here.map((o) => {
    if (typeof o.y === 'number') return o.area;
    const z = Math.abs(o.y.y0 - level) < 0.01 ? o.y.at0 : o.y.at1;
    return o.y.along === 'z'
      ? { ...o.area, minZ: z - 0.05, maxZ: z + 0.05 }
      : { ...o.area, minX: z - 0.05, maxX: z + 0.05 };
  });
  const rails: Footprint[] = [];
  const T = 0.04;
  for (const [i, s] of here.entries()) {
    if (typeof s.y !== 'number' && !flights) continue;
    const a = s.area;
    const edges: [Footprint, 'x' | 'z'][] = [
      [{ minX: a.minX, maxX: a.maxX, minZ: a.minZ - T, maxZ: a.minZ }, 'x'],
      [{ minX: a.minX, maxX: a.maxX, minZ: a.maxZ, maxZ: a.maxZ + T }, 'x'],
      [{ minX: a.minX - T, maxX: a.minX, minZ: a.minZ, maxZ: a.maxZ }, 'z'],
      [{ minX: a.maxX, maxX: a.maxX + T, minZ: a.minZ, maxZ: a.maxZ }, 'z'],
    ];
    for (const [edge, along] of edges) {
      // A flight's sides only.
      if (typeof s.y !== 'number' && along !== s.y.along) continue;
      // Cut out where another surface of this level lies across it.
      let pieces: [number, number][] =
        along === 'x' ? [[edge.minX, edge.maxX]] : [[edge.minZ, edge.maxZ]];
      for (const [j, b] of openings.entries()) {
        if (j === i) continue;
        const touches =
          along === 'x'
            ? b.minZ < edge.maxZ + 1e-6 && b.maxZ > edge.minZ - 1e-6
            : b.minX < edge.maxX + 1e-6 && b.maxX > edge.minX - 1e-6;
        if (!touches) continue;
        const [c0, c1] = along === 'x' ? [b.minX, b.maxX] : [b.minZ, b.maxZ];
        pieces = pieces.flatMap(([p0, p1]) => {
          const keep: [number, number][] = [];
          if (c0 > p0) keep.push([p0, Math.min(p1, c0)]);
          if (c1 < p1) keep.push([Math.max(p0, c1), p1]);
          return keep.filter(([q0, q1]) => q1 - q0 > 1e-6);
        });
      }
      for (const [p0, p1] of pieces)
        rails.push(
          along === 'x'
            ? { ...edge, minX: p0, maxX: p1 }
            : { ...edge, minZ: p0, maxZ: p1 },
        );
    }
  }
  return rails;
}

/**
 * The stair test room's (dev34): a wide room four storeys tall, with a
 * deck at each upper storey along its west wall and another along its
 * east, and a stair outside each, three flights on in the same direction
 * from the floor to the top: the west's painted mild steel, the east's
 * stainless.
 */
export const STAIR_TOWER = {
  w: 14,
  d: 24,
  height: 12.5,
  storey: 3,
  /** Each flight's going: a 3 m storey over 3.75 m, about 39 degrees. */
  flight: 3.75,
} as const;

/** A stair's finish: painted mild steel (the air plant's), or stainless. */
export type StairFinish = 'painted' | 'stainless';

/** The stair test room's two runs, each its decks and stair, and its finish and wall. */
export function stairTowerRuns() {
  const { w, d, storey, flight } = STAIR_TOWER;
  const levels = [1, 2, 3].map((k) => k * storey);
  const run = (side: 'west' | 'east', finish: StairFinish) => ({
    side,
    finish,
    surfaces: decksAndStair({
      deck:
        side === 'west'
          ? { minX: -w / 2, maxX: -w / 2 + 1.2, minZ: -d / 2, maxZ: d / 2 }
          : { minX: w / 2 - 1.2, maxX: w / 2, minZ: -d / 2, maxZ: d / 2 },
      levels,
      foot: d / 2 - 2,
      flight,
      side,
      label: side === 'west' ? 'West stair' : 'East stair',
      name: (k) => `${side === 'west' ? 'West' : 'East'} storey ${k + 2} deck`,
    }),
  });
  return [run('west', 'painted'), run('east', 'stainless')];
}

/** Every walking surface in the stair test room. */
export const stairTowerSurfaces = () =>
  stairTowerRuns().flatMap((r) => r.surfaces);
