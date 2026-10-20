import { cutOpenings } from '../toolkit/controls/logic/walk-collision';

/**
 * How big must the main plant room be? A fit study: set a list of
 * machines out on the room's lower floor, as a plant room is laid out, and
 * say whether they all go in.
 *
 * The room is a square of side `side` (inside its walls), with a gantry
 * `GANTRY` wide round it at the entry level and the lower floor inside
 * that; two stairs come down from the gantry at opposite corners (north-
 * east and south-west), each with a landing kept clear at its foot. The
 * machines stand in rows running east–west, each one's long side along
 * its row, and every row faces an aisle: the first row has its back to
 * the north pit wall (a clearance behind it) and faces south onto an
 * aisle; then rows go back to back in pairs, each facing its own aisle;
 * a cross aisle runs across each end of the rows. So every machine can be
 * reached, worked on and taken out. Pure; metres.
 */

export const GANTRY = 2.6;
/** An aisle's clear width, between rows and across their ends. */
export const AISLE = 1.5;
/** The gap between neighbours in a row, and behind a row at a pit wall. */
export const BETWEEN = 1.0;
export const BEHIND = 0.8;
/** A stair: its width (with rails), its run, and the landing kept clear at its foot. */
export const STAIR = { width: 2.1, run: 6, landing: 1.5 };

export interface FitItem {
  name: string;
  /** Its footprint, either way round. */
  w: number;
  d: number;
}

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Placed extends FitItem {
  rect: Rect;
}

export interface Fit {
  side: number;
  /** The lower floor's side. */
  floor: number;
  placed: Placed[];
  unplaced: FitItem[];
  /** The rows' rectangles, and the stairs' (with their landings). */
  rows: Rect[];
  stairs: Rect[];
  /** How much of the lower floor the machines' footprints cover, 0–1. */
  cover: number;
}

const overlaps = (a: Rect, b: Rect) =>
  a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;

/** The two stairs and their landings on a lower floor of half-side `h`, as in `main-plant-plan.ts`. */
export function stairZones(side: number): Rect[] {
  const h = side / 2 - GANTRY;
  const x = h - 1.4;
  const reach = STAIR.run + STAIR.landing;
  return [
    // North-east: down from the north pit edge, southward.
    {
      minX: x - STAIR.width / 2,
      maxX: x + STAIR.width / 2,
      minZ: -h,
      maxZ: -h + reach,
    },
    // South-west: down from the south pit edge, northward.
    {
      minX: -x - STAIR.width / 2,
      maxX: -x + STAIR.width / 2,
      minZ: h - reach,
      maxZ: h,
    },
  ];
}

/**
 * Set `items` out in a room of side `side`: the deepest first, each into
 * the first row it fits along (sliding past a stair), a new row when none
 * has room; rows in back-to-back pairs from the north wall southward.
 */
export function fitPlant(side: number, items: readonly FitItem[]): Fit {
  const floor = side - 2 * GANTRY;
  const h = floor / 2;
  const stairs = stairZones(side);
  // Each machine its long side along the row.
  const todo = items
    .map((i) => ({ ...i, w: Math.max(i.w, i.d), d: Math.min(i.w, i.d) }))
    .sort((a, b) => b.d - a.d || b.w - a.w);
  // The rows' extent along x: a cross aisle at each end.
  const x0 = -h + AISLE,
    x1 = h - AISLE;
  const rows: { rect: Rect; items: Placed[] }[] = [];
  const placed: Placed[] = [];
  const unplaced: FitItem[] = [];
  /**
   * Where the next row starts (its north edge), given the rows so far.
   * An even row faces south and an odd row north: an aisle follows an
   * even row, and an odd row is followed back to back by the next.
   */
  const nextRowAt = () => {
    if (!rows.length) return -h + BEHIND;
    const last = rows[rows.length - 1].rect.maxZ;
    return (rows.length - 1) % 2 === 0 ? last + AISLE : last;
  };
  /** Whether a row's front (its aisle side) is its south edge. */
  const facesSouth = (index: number) => index % 2 === 0;
  /** The first free x in `row` for a machine `w` along, clear of stairs, if any. */
  const slot = (row: Rect, used: Placed[], w: number, d: number) => {
    let x = x0;
    const sorted = [...used].sort((a, b) => a.rect.minX - b.rect.minX);
    for (;;) {
      if (x + w > x1 + 1e-9) return null;
      const r = { minX: x, maxX: x + w, minZ: row.minZ, maxZ: row.minZ + d };
      // One machine deep: a slot is taken across the row's whole depth.
      const across = { ...r, maxZ: Math.max(r.maxZ, row.maxZ) };
      const block =
        sorted.find((p) =>
          overlaps(
            {
              minX: p.rect.minX - BETWEEN,
              maxX: p.rect.maxX + BETWEEN,
              minZ: p.rect.minZ,
              maxZ: p.rect.maxZ,
            },
            across,
          ),
        )?.rect ??
        stairs.find((s) =>
          overlaps(
            {
              minX: s.minX - BETWEEN / 2,
              maxX: s.maxX + BETWEEN / 2,
              minZ: s.minZ,
              maxZ: s.maxZ,
            },
            across,
          ),
        );
      if (!block) return r;
      x = block.maxX + BETWEEN;
    }
  };
  for (const item of todo) {
    let done = false;
    for (const row of rows) {
      if (item.d > row.rect.maxZ - row.rect.minZ + 1e-9) continue;
      // A shallower machine stands at the row's aisle side.
      const r = slot(row.rect, row.items, item.w, item.d);
      if (!r) continue;
      const rect = facesSouth(rows.indexOf(row))
        ? { ...r, minZ: row.rect.maxZ - item.d, maxZ: row.rect.maxZ }
        : { ...r, minZ: row.rect.minZ, maxZ: row.rect.minZ + item.d };
      const p = { ...item, rect };
      row.items.push(p);
      placed.push(p);
      done = true;
      break;
    }
    if (done) continue;
    const z = nextRowAt();
    // A new row: beyond it, its aisle (facing south) or the clearance at
    // the south pit wall (facing north) must fit too.
    const beyond = facesSouth(rows.length) ? AISLE : BEHIND;
    const row = {
      rect: { minX: x0, maxX: x1, minZ: z, maxZ: z + item.d },
      items: [] as Placed[],
    };
    const r =
      z + item.d + beyond <= h + 1e-9
        ? slot(row.rect, [], item.w, item.d)
        : null;
    if (!r) {
      unplaced.push(item);
      continue;
    }
    rows.push(row);
    const p = { ...item, rect: r };
    row.items.push(p);
    placed.push(p);
  }
  const area = placed.reduce(
    (s, p) => s + (p.rect.maxX - p.rect.minX) * (p.rect.maxZ - p.rect.minZ),
    0,
  );
  return {
    side,
    floor,
    placed,
    unplaced,
    rows: rows.map((r) => r.rect),
    stairs,
    cover: area / (floor * floor),
  };
}

/** The smallest side, in steps of `step` from `from`, that takes every item. */
export function smallestSide(
  items: readonly FitItem[],
  from = 20,
  to = 60,
  step = 0.5,
): number | null {
  for (let side = from; side <= to + 1e-9; side += step)
    if (fitPlant(side, items).unplaced.length === 0) return side;
  return null;
}

/** A plan drawing of a fit, as SVG: the gantry, the stairs, the rows and the machines. */
export function fitSvg(fit: Fit, scale = 14): string {
  const half = fit.side / 2;
  const px = (v: number) => ((v + half) * scale).toFixed(1);
  const size = (fit.side * scale).toFixed(0);
  const rect = (r: Rect, fill: string, stroke = 'none') =>
    `<rect x="${px(r.minX)}" y="${px(r.minZ)}" width="${((r.maxX - r.minX) * scale).toFixed(1)}" height="${((r.maxZ - r.minZ) * scale).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
  const h = fit.floor / 2;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Number(size) + 40}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    rect({ minX: -half, maxX: half, minZ: -half, maxZ: half }, '#c9cdcd'),
    rect({ minX: -h, maxX: h, minZ: -h, maxZ: h }, '#eef0ee'),
    ...fit.rows.map((r) => rect(r, 'none', '#b5bcbc')),
    ...fit.stairs.map((r) => rect(r, '#e1bd53')),
    ...fit.placed.map((p) => rect(p.rect, '#5d7d8a', '#2f4650')),
    `<text x="8" y="${Number(size) + 26}" font-size="16" fill="#1d2526">${fit.side} × ${fit.side} m: ${fit.placed.length} placed, ${fit.unplaced.length} left over, ${(fit.cover * 100).toFixed(0)}% of the lower floor covered</text>`,
    '</svg>',
  ];
  return parts.join('\n');
}

/** The lower floor's depth below the gantry, metres, and the stairs' walking width. */
export const DROP = 3;
export const STAIR_WALK = 1.8;

/** The stairs' centre lines: x, where each leaves the gantry, and which way it runs down. */
export function stairLines(side: number) {
  const h = side / 2 - GANTRY;
  const x = h - 1.4;
  return [
    { x, startZ: -h, direction: 1 },
    { x: -x, startZ: h, direction: -1 },
  ] as const;
}

/** The floor at (x, z) in a room of side `side`: the gantry at 0, the lower floor at -DROP, the stairs between. */
export function fitFloor(side: number, x: number, z: number): number {
  for (const s of stairLines(side)) {
    const along = (z - s.startZ) * s.direction;
    if (Math.abs(x - s.x) <= STAIR_WALK / 2 && along >= 0 && along <= STAIR.run)
      return (-DROP * along) / STAIR.run;
  }
  const h = side / 2 - GANTRY;
  return Math.max(Math.abs(x), Math.abs(z)) < h ? -DROP : 0;
}

/**
 * What a walker meets in a room of side `side`, metres: its walls (`wall`
 * thick), the gantry's edge but where the stairs leave it, the stairs'
 * side rails, and the machines' footprints.
 */
export function fitSolids(
  side: number,
  machines: readonly Rect[],
  wall = 0.22,
): Rect[] {
  const half = side / 2;
  const pit = half - GANTRY;
  const t = wall / 2;
  const walls: Rect[] = [
    { minX: -half - t, maxX: half + t, minZ: -half - t, maxZ: -half + t },
    { minX: -half - t, maxX: half + t, minZ: half - t, maxZ: half + t },
    { minX: -half - t, maxX: -half + t, minZ: -half, maxZ: half },
    { minX: half - t, maxX: half + t, minZ: -half, maxZ: half },
  ];
  const e = 0.08;
  const edge: Rect[] = [
    { minX: -pit, maxX: pit, minZ: -pit - e, maxZ: -pit + e },
    { minX: -pit, maxX: pit, minZ: pit - e, maxZ: pit + e },
    { minX: -pit - e, maxX: -pit + e, minZ: -pit, maxZ: pit },
    { minX: pit - e, maxX: pit + e, minZ: -pit, maxZ: pit },
  ];
  const stairs = stairLines(side);
  const gaps = stairs.map((s) => ({
    minX: s.x - STAIR_WALK / 2,
    maxX: s.x + STAIR_WALK / 2,
    minZ: s.startZ - 0.4,
    maxZ: s.startZ + 0.4,
  }));
  const rails = stairs.flatMap((s) => {
    const a = Math.min(s.startZ, s.startZ + s.direction * STAIR.run);
    const b = Math.max(s.startZ, s.startZ + s.direction * STAIR.run);
    return [-1, 1].map((k) => ({
      minX: s.x + k * (STAIR_WALK / 2 + 0.05) - 0.05,
      maxX: s.x + k * (STAIR_WALK / 2 + 0.05) + 0.05,
      minZ: a,
      maxZ: b,
    }));
  });
  return [...walls, ...cutOpenings(edge, gaps), ...rails, ...machines];
}
