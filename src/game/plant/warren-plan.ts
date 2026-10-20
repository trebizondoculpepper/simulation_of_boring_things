import type { Rect } from '../pool-styles/geometry';
import { rect } from '../pool-styles/geometry';
import { LEVEL_HEIGHT } from './placement';
import type { Level } from './placement';

/**
 * The plant rooms laid out: the warren behind the pool rooms, in plan
 * and in section (`doc/plant-model.md`, "How the plant rooms are
 * arranged"; the rules in `placement.ts`). Each room of the inventory is
 * a chamber, a rectangle on its level, sized for its equipment; chambers
 * on one level open into each other through doorways in their shared
 * walls; stairs climb between the levels. On the treatment level, the
 * balance-tank hall is the centre, ringed by the service corridor, with
 * each attraction's plant room outside the ring; the main stair rises
 * from the ring to a lobby at the surface, round which the core rooms
 * stand, the outer rooms (the loading bay, the intakes) on the edge; a
 * stair goes down to the boiler house and the drainage in the basement,
 * and another up to the roof's air plant. Chambers on different levels
 * may stand over one another; on one level, none overlap. Pure; metres.
 */

export interface Chamber {
  id: string;
  name: string;
  /** The inventory's room it is (`inventory.ts`), if it is one; corridors, lobbies and stairs are not. */
  room?: string;
  rect: Rect;
  level: Level;
  /** Its floor: level, or a stair, at `y` on its max side along `along` and `to` on its min side. */
  y: number;
  to?: number;
  along?: 'x' | 'z';
  height: number;
  /** Open to the sky (the roof): no ceiling, no walls but railings. */
  open?: boolean;
}

const L = LEVEL_HEIGHT;
const room = (
  id: string,
  name: string,
  r: Rect,
  level: Level,
  height: number,
  inventory?: string,
): Chamber => ({
  id,
  name,
  room: inventory ?? id,
  rect: r,
  level,
  y: L[level],
  height,
});
const way = (
  id: string,
  name: string,
  r: Rect,
  level: Level,
  height: number,
): Chamber => ({
  id,
  name,
  rect: r,
  level,
  y: L[level],
  height,
});
const stair = (
  id: string,
  name: string,
  r: Rect,
  top: Level,
  bottom: Level,
  along: 'x' | 'z',
  /** Which end is the top: its max side or its min side. */
  topAt: 'max' | 'min',
): Chamber => ({
  id,
  name,
  rect: r,
  level: top,
  y: topAt === 'max' ? L[top] : L[bottom],
  to: topAt === 'max' ? L[bottom] : L[top],
  along,
  height: 4,
});

/** A short flight inside a level: from `high` at its `highAt` end down to `low`. */
const steps = (
  id: string,
  r: Rect,
  level: Level,
  along: 'x' | 'z',
  highAt: 'max' | 'min',
  high: number,
  low: number,
): Chamber => ({
  id,
  name: 'Steps down',
  rect: r,
  level,
  y: highAt === 'max' ? high : low,
  to: highAt === 'max' ? low : high,
  along,
  height: 4,
});

export const CHAMBERS: readonly Chamber[] = [
  // ---- Treatment: the tank hall at the centre, the ring round it, the
  // attractions' plant rooms outside.
  // Tall: its tanks stand 4 m and nothing is over it, so its ceiling
  // rises through the surface level.
  room(
    'balance-tanks',
    'Balance-tank hall',
    rect(-12, 12, -8, 8),
    'treatment',
    9.5,
  ),
  {
    ...way(
      'ring-north',
      'Service corridor',
      rect(-15, 15, -11, -8),
      'treatment',
      3,
    ),
    room: 'service-corridor',
  },
  {
    ...way(
      'ring-south',
      'Service corridor',
      rect(-15, 15, 8, 11),
      'treatment',
      3,
    ),
    room: 'service-corridor',
  },
  {
    ...way(
      'ring-west',
      'Service corridor',
      rect(-15, -12, -8, 8),
      'treatment',
      3,
    ),
    room: 'service-corridor',
  },
  {
    ...way(
      'ring-east',
      'Service corridor',
      rect(12, 15, -8, 8),
      'treatment',
      3,
    ),
    room: 'service-corridor',
  },
  // Stepped down a short flight from the ring, its ceiling level with the
  // corridor's, so that it stands 6 m: room for five filters and ozone.
  steps(
    'stair-reservoir',
    rect(-2, 2, -14, -11),
    'treatment',
    'z',
    'max',
    L.treatment,
    L.treatment - 1.5,
  ),
  {
    ...room(
      'plant-reservoir',
      'Plant room: The Reservoir',
      rect(-12, 12, -25, -14),
      'treatment',
      6,
    ),
    y: L.treatment - 1.5,
  },
  room(
    'plant-municipal',
    'Plant room: The Municipal Infinite',
    rect(-35, -15, -7, 7),
    'treatment',
    4.5,
  ),
  // An L: an annex for its learner pool's circuit, lower.
  {
    ...room(
      'plant-municipal-annex',
      'Plant room: The Municipal Infinite (learner pool)',
      rect(-37, -28, 7, 15),
      'treatment',
      3.5,
    ),
    room: 'plant-municipal',
  },
  room(
    'plant-atrium',
    'Plant room: The Slide Atrium',
    rect(15, 29, -7, 7),
    'treatment',
    4.5,
  ),
  room(
    'plant-white',
    'Plant room: The White Room',
    rect(-15, -3, 11, 21),
    'treatment',
    4.5,
  ),
  room(
    'plant-tunnel',
    'Plant room: The Porthole Tunnel',
    rect(3, 13, 11, 19),
    'treatment',
    3.5,
  ),
  // ---- The stairs: up to the surface from the ring's south, down to the
  // basement from its north-west, up to the roof from the surface corridor.
  stair(
    'stair-main',
    'Main stair',
    rect(-2, 2, 11, 23),
    'surface',
    'treatment',
    'z',
    'max',
  ),
  stair(
    'stair-down',
    'Stair to the basement',
    rect(-17, -13, -25, -11),
    'treatment',
    'basement',
    'z',
    'max',
  ),
  stair(
    'stair-roof',
    'Stair to the roof hatch',
    rect(24, 28, 32, 46),
    'roof',
    'surface',
    'z',
    'max',
  ),
  // ---- Basement.
  way(
    'basement-lobby',
    'Basement lobby',
    rect(-17, -12, -42, -25),
    'basement',
    4.5,
  ),
  // Down a flight from the lobby, its ceiling kept at the lobby's: a
  // double-height hall, 7.5 m, for its boilers and their flue header.
  steps(
    'stair-boiler',
    rect(-12, -6, -35, -31),
    'basement',
    'x',
    'min',
    L.basement,
    L.basement - 3,
  ),
  {
    ...room(
      'boiler-house',
      'Boiler house',
      rect(-6, 18, -42, -25),
      'basement',
      7.5,
    ),
    y: L.basement - 3,
  },
  room(
    'drainage',
    'Backwash holding and drainage',
    rect(-30, -17, -42, -30),
    'basement',
    4.5,
  ),
  // The service tunnel, under everything, from the drainage south to the
  // freight lift.
  way(
    'service-tunnel',
    'Service tunnel',
    rect(-27, -24, -30, 34),
    'basement',
    3.5,
  ),
  // ---- The goods passage, at the treatment level: from the ring west and
  // south to the freight lift.
  way(
    'goods-passage',
    'Goods passage',
    rect(-24, -15, 8, 11),
    'treatment',
    3.5,
  ),
  way(
    'goods-passage-south',
    'Goods passage',
    rect(-27, -24, 8, 34),
    'treatment',
    3.5,
  ),
  // ---- Surface: the lobby at the stair's head, the core round it, the
  // outer rooms on the edge.
  way('lobby', 'Lobby', rect(-4, 4, 23, 29), 'surface', 4),
  way('surface-corridor', 'Corridor', rect(-24, 29, 29, 32), 'surface', 2.8),
  room('control-room', 'Control room', rect(4, 16, 19, 29), 'surface', 4),
  room('office', 'Duty manager’s office', rect(16, 24, 21, 29), 'surface', 2.7),
  // Every utility comes in here: the electricity to its 800 A main
  // isolator, the gas to its main valve, the water to its stopcock. Shut
  // all three, and the whole facility is starved.
  room(
    'utilities-intake',
    'Utilities intake: electricity, gas and water',
    rect(-24, -14, 23, 29),
    'surface',
    3.5,
  ),
  room(
    'make-up',
    'Make-up water: break tank',
    rect(-14, -4, 23, 29),
    'surface',
    4,
  ),
  room('loading-bay', 'Loading bay', rect(-24, 0, 32, 46), 'surface', 6),
  room('chemical-store', 'Chemical store', rect(0, 12, 32, 42), 'surface', 4),
  room(
    'switch-room',
    'Electrical switch room',
    rect(12, 24, 32, 42),
    'surface',
    4,
  ),
  // ---- Roof: the air plant's railed platform, open to the white.
  {
    ...room(
      'air-plant',
      'Air handling plant',
      rect(10, 40, 46, 66),
      'roof',
      30,
    ),
    open: true,
  },
];

/** A doorway between two chambers in the wall they share, `from`–`to` along it. */
export interface Doorway {
  a: string;
  b: string;
  from: number;
  to: number;
  /** A window as well as a door (the office into the control room). */
  window?: boolean;
}

export const DOORWAYS: readonly Doorway[] = [
  // The ring, and what opens off it.
  { a: 'ring-north', b: 'ring-west', from: -15, to: -12 },
  { a: 'ring-north', b: 'ring-east', from: 12, to: 15 },
  { a: 'ring-south', b: 'ring-west', from: -15, to: -12 },
  { a: 'ring-south', b: 'ring-east', from: 12, to: 15 },
  { a: 'balance-tanks', b: 'ring-north', from: -1.5, to: 1.5 },
  { a: 'balance-tanks', b: 'ring-south', from: -1.5, to: 1.5 },
  { a: 'balance-tanks', b: 'ring-west', from: -1.5, to: 1.5 },
  { a: 'balance-tanks', b: 'ring-east', from: -1.5, to: 1.5 },
  { a: 'stair-reservoir', b: 'ring-north', from: -2, to: 2 },
  { a: 'stair-reservoir', b: 'plant-reservoir', from: -2, to: 2 },
  { a: 'plant-municipal', b: 'ring-west', from: -1.5, to: 1.5 },
  { a: 'plant-municipal', b: 'plant-municipal-annex', from: -32, to: -30 },
  { a: 'ring-south', b: 'goods-passage', from: 8.5, to: 10.5 },
  { a: 'goods-passage', b: 'goods-passage-south', from: 8.5, to: 10.5 },
  { a: 'drainage', b: 'service-tunnel', from: -27, to: -24 },
  { a: 'plant-atrium', b: 'ring-east', from: -1.5, to: 1.5 },
  { a: 'plant-white', b: 'ring-south', from: -10, to: -8 },
  { a: 'plant-tunnel', b: 'ring-south', from: 7, to: 9 },
  { a: 'stair-main', b: 'ring-south', from: -2, to: 2 },
  { a: 'stair-down', b: 'ring-north', from: -15, to: -13 },
  // The basement.
  { a: 'stair-down', b: 'basement-lobby', from: -17, to: -13 },
  { a: 'basement-lobby', b: 'stair-boiler', from: -35, to: -31 },
  { a: 'stair-boiler', b: 'boiler-house', from: -35, to: -31 },
  { a: 'basement-lobby', b: 'drainage', from: -38, to: -34 },
  // The surface.
  { a: 'stair-main', b: 'lobby', from: -2, to: 2 },
  { a: 'lobby', b: 'surface-corridor', from: -4, to: 4 },
  { a: 'utilities-intake', b: 'surface-corridor', from: -20, to: -18 },
  { a: 'make-up', b: 'surface-corridor', from: -10, to: -8 },
  { a: 'control-room', b: 'surface-corridor', from: 8, to: 10 },
  { a: 'office', b: 'surface-corridor', from: 19, to: 21 },
  { a: 'control-room', b: 'office', from: 23, to: 27, window: true },
  { a: 'loading-bay', b: 'surface-corridor', from: -14, to: -10 },
  { a: 'chemical-store', b: 'surface-corridor', from: 4, to: 6 },
  { a: 'switch-room', b: 'surface-corridor', from: 16, to: 18 },
  { a: 'loading-bay', b: 'chemical-store', from: 36, to: 39 },
  { a: 'stair-roof', b: 'surface-corridor', from: 24, to: 28 },
  // The roof hatch.
  { a: 'stair-roof', b: 'air-plant', from: 24, to: 28 },
];

/** The loading bay's two docks, in its south wall onto the white: from–to along it. */
export const DOCKS: readonly (readonly [number, number])[] = [
  [-20, -16.5],
  [-10, -6.5],
];

export const chamberById = (id: string) => CHAMBERS.find((c) => c.id === id)!;

const inside = (r: Rect, x: number, z: number) =>
  x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;

/** A chamber's floor at (x, z). */
export function chamberFloor(c: Chamber, x: number, z: number): number {
  if (c.to === undefined || !c.along) return c.y;
  const r = c.rect;
  const s =
    c.along === 'x'
      ? (r.maxX - x) / (r.maxX - r.minX)
      : (r.maxZ - z) / (r.maxZ - r.minZ);
  return c.y + (c.to - c.y) * Math.min(1, Math.max(0, s));
}

/** Its lowest and highest floor. */
export function span(c: Chamber) {
  const to = c.to ?? c.y;
  return { low: Math.min(c.y, to), high: Math.max(c.y, to) };
}

/** The chamber at (x, z) whose floor is nearest `y`, if any. */
export function chamberAt(x: number, z: number, y = 0): Chamber | null {
  let best: Chamber | null = null;
  for (const c of CHAMBERS)
    if (
      inside(c.rect, x, z) &&
      (!best ||
        Math.abs(chamberFloor(c, x, z) - y) <
          Math.abs(chamberFloor(best, x, z) - y))
    )
      best = c;
  return best;
}

/** The floor under a walker at (x, z) who stood at `previous`. */
export function floorAt(x: number, z: number, previous: number): number {
  const c = chamberAt(x, z, previous);
  return c ? chamberFloor(c, x, z) : previous;
}

export type Side = 'north' | 'south' | 'east' | 'west';
const SIDES: readonly Side[] = ['north', 'south', 'east', 'west'];
const OPPOSITE: Record<Side, Side> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

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

/** The side of `a` that `b` shares, if any. */
export function sharedSide(a: Rect, b: Rect): Side | null {
  for (const side of SIDES) {
    const s = sideOf(a, side);
    const t = sideOf(b, OPPOSITE[side]);
    if (Math.abs(s.at - t.at) < 1e-6 && s.from < t.to && t.from < s.to)
      return side;
  }
  return null;
}

/** The doorways in a chamber's side. */
export function gapsIn(c: Chamber, side: Side): [number, number][] {
  const gaps: [number, number][] = [];
  for (const d of DOORWAYS) {
    const other = d.a === c.id ? d.b : d.b === c.id ? d.a : null;
    if (other && sharedSide(c.rect, chamberById(other).rect) === side)
      gaps.push([d.from, d.to]);
  }
  return gaps.sort((p, q) => p[0] - q[0]);
}

export interface WallRun {
  chamber: string;
  side: Side;
  along: 'x' | 'z';
  at: number;
  from: number;
  to: number;
}

/** Every chamber's walls, as runs between its doorways. */
export function wallRuns(): WallRun[] {
  const runs: WallRun[] = [];
  for (const c of CHAMBERS)
    for (const side of SIDES) {
      const s = sideOf(c.rect, side);
      let from = s.from;
      for (const [a, b] of gapsIn(c, side)) {
        if (a > from) runs.push({ chamber: c.id, side, ...s, from, to: a });
        from = Math.max(from, b);
      }
      if (s.to > from) runs.push({ chamber: c.id, side, ...s, from, to: s.to });
    }
  return runs;
}

/**
 * The walls a walker standing at height `y` meets: those of the chambers
 * whose floors are within reach of it (so that a room above or below does
 * not wall them in), as thin rectangles.
 */
export function wallsAt(y: number, thickness = 0.3): Rect[] {
  const h = thickness / 2;
  return wallRuns()
    .filter((w) => {
      const { low, high } = span(chamberById(w.chamber));
      return y >= low - 1 && y <= high + 1;
    })
    .map((w) =>
      w.along === 'x'
        ? rect(w.from, w.to, w.at - h, w.at + h)
        : rect(w.at - h, w.at + h, w.from, w.to),
    );
}

// ---- Risers ------------------------------------------------------------------

/** What a riser carries, as the inventory names its media. */
export type Carried =
  | 'lthw'
  | 'gas'
  | 'power'
  | 'chemical'
  | 'make-up'
  | 'drain'
  | 'signal'
  | 'lighting';

/**
 * A riser: a vertical shaft for pipes and cables between levels, beside
 * a stair, opening by an access panel into a chamber on each level it
 * serves.
 */
export interface Riser {
  id: string;
  name: string;
  rect: Rect;
  /** The levels it runs between, top and bottom. */
  top: Level;
  bottom: Level;
  carries: readonly Carried[];
}

export const RISERS: readonly Riser[] = [
  {
    id: 'riser-main',
    name: 'Main riser',
    rect: rect(2, 3, 11, 23),
    top: 'surface',
    bottom: 'treatment',
    carries: [
      'drain',
      'power',
      'signal',
      'chemical',
      'make-up',
      'lthw',
      'gas',
      'lighting',
    ],
  },
  {
    id: 'riser-basement',
    name: 'Basement riser',
    rect: rect(-13, -12, -25, -11),
    top: 'treatment',
    bottom: 'basement',
    carries: ['lthw', 'gas', 'power', 'signal', 'drain'],
  },
  {
    id: 'riser-roof',
    name: 'Roof riser',
    rect: rect(28, 29, 32, 46),
    top: 'roof',
    bottom: 'surface',
    carries: ['lthw', 'power', 'signal'],
  },
];

// ---- The freight lift --------------------------------------------------------

/**
 * The freight lift: a shaft (the lift itself is not yet modelled) from
 * the basement to the surface, opening at each level onto a chamber: the
 * loading bay at the surface, the goods passage at the treatment level,
 * the service tunnel in the basement. Big enough for a boiler or an
 * ozone generator on a pallet truck.
 */
export const FREIGHT_LIFT = {
  id: 'freight-lift',
  name: 'Freight lift',
  rect: rect(-27, -24, 34, 38),
  top: 'surface' as Level,
  bottom: 'basement' as Level,
  landings: {
    surface: 'loading-bay',
    treatment: 'goods-passage-south',
    basement: 'service-tunnel',
  } as Record<string, string>,
};
