import type { Footprint } from '../../controls/logic/walk-collision';
import type { Placed, RoomBox } from './room-equipment';
import { DAY_TANKS } from '../../../game/plant/chemical-distribution';
import type { Chemical } from '../../../game/plant/chemicals';
import { bottleBund, isDoseBottle } from '../../../game/plant/dose-bottle';

/**
 * The floor marking round a bunded tank (prompt 089, item 3; the owner,
 * 2026-10-27): a 50 mm yellow-and-black hazard stripe a short way out
 * from the bund's foot all round, the zone kept clear round it, and the
 * chemical's name stencilled on the floor before it. Drawn from where the
 * tank is placed, so it follows it; where a wall, another machine or a
 * kept-clear zone is in the way, the stripe comes in closer, then gives
 * way (a side against a wall is not marked, a length across a machine is
 * left out). Set decoration. Pure: metres, the room's frame.
 */

/** The stripe's width. */
export const STRIPE = 0.05;
/** How far out from the bund the stripe may be, furthest first. */
export const GAPS = [0.12, 0.08, 0.04] as const;
/** The clearance kept from a wall or another thing. */
const CLEAR = 0.02;
/** The shortest length of stripe worth painting. */
const SHORTEST = 0.1;
/** The stencil's letters' height. */
export const STENCIL_HEIGHT = 0.09;

export type Rect = Footprint;
export type Side = 'north' | 'south' | 'east' | 'west';

export interface Stripe extends Rect {
  /** Which way it runs. */
  along: 'x' | 'z';
}

export interface Stencil {
  text: string;
  x: number;
  z: number;
  /** Its letters' width across and height, and which way their tops face (toward the tank). */
  w: number;
  h: number;
  top: Side;
}

export interface BundMarking {
  chemical: Chemical;
  stripes: Stripe[];
  stencil: Stencil | null;
}

/** What is stencilled for each chemical. */
export const STENCIL_TEXT: Record<Chemical, string> = {
  hypochlorite: 'SODIUM HYPOCHLORITE',
  acid: 'HYDROCHLORIC ACID',
};

const overlap = (a: Rect, b: Rect) =>
  a.minX < b.maxX - 1e-9 &&
  a.maxX > b.minX + 1e-9 &&
  a.minZ < b.maxZ - 1e-9 &&
  a.maxZ > b.minZ + 1e-9;
const inside = (a: Rect, b: Rect) =>
  a.minX >= b.minX - 1e-9 &&
  a.maxX <= b.maxX + 1e-9 &&
  a.minZ >= b.minZ - 1e-9 &&
  a.maxZ <= b.maxZ + 1e-9;
const grow = (f: Rect, by: number): Rect => ({
  minX: f.minX - by,
  maxX: f.maxX + by,
  minZ: f.minZ - by,
  maxZ: f.maxZ + by,
});

/** A side's strip of stripe, `gap` out from the bund. */
function strip(bund: Rect, side: Side, gap: number): Stripe {
  const o = gap + STRIPE;
  switch (side) {
    case 'north':
      return {
        minX: bund.minX - o,
        maxX: bund.maxX + o,
        minZ: bund.minZ - o,
        maxZ: bund.minZ - gap,
        along: 'x',
      };
    case 'south':
      return {
        minX: bund.minX - o,
        maxX: bund.maxX + o,
        minZ: bund.maxZ + gap,
        maxZ: bund.maxZ + o,
        along: 'x',
      };
    case 'west':
      return {
        minX: bund.minX - o,
        maxX: bund.minX - gap,
        minZ: bund.minZ - gap,
        maxZ: bund.maxZ + gap,
        along: 'z',
      };
    case 'east':
      return {
        minX: bund.maxX + gap,
        maxX: bund.maxX + o,
        minZ: bund.minZ - gap,
        maxZ: bund.maxZ + gap,
        along: 'z',
      };
  }
}

/** A strip cut to the room and round what is in its way, in lengths. */
function cut(s: Stripe, room: Rect, obstacles: readonly Rect[]): Stripe[] {
  const x = s.along === 'x';
  let lo = Math.max(x ? s.minX : s.minZ, (x ? room.minX : room.minZ) + CLEAR);
  const hi = Math.min(x ? s.maxX : s.maxZ, (x ? room.maxX : room.maxZ) - CLEAR);
  if (hi - lo < SHORTEST) return [];
  // The intervals along it that something else takes.
  const blocked = obstacles
    .map((o) => grow(o, CLEAR))
    .filter((o) => overlap(o, s))
    .map((o) => (x ? [o.minX, o.maxX] : [o.minZ, o.maxZ]) as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const out: Stripe[] = [];
  const keep = (a: number, b: number) => {
    if (b - a < SHORTEST) return;
    out.push(x ? { ...s, minX: a, maxX: b } : { ...s, minZ: a, maxZ: b });
  };
  for (const [a, b] of blocked) {
    if (b <= lo) continue;
    if (a >= hi) break;
    keep(lo, Math.min(a, hi));
    lo = Math.max(lo, b);
  }
  keep(lo, hi);
  return out;
}

/** The side a placed machine's front faces, from its yaw (0 faces +z). */
export function faceOf(yaw: number): Side {
  const s = Math.round(Math.sin(yaw));
  const c = Math.round(Math.cos(yaw));
  if (c === 1) return 'south';
  if (c === -1) return 'north';
  return s === 1 ? 'east' : 'west';
}

/**
 * The marking round one bund: its stripe on each side, at the furthest of
 * `GAPS` that keeps it inside the room and off everything else's floor
 * (or none against a wall), cut round anything still in its way; and its
 * stencil before its front, or beside it, where there is floor for it.
 */
export function bundMarking(
  bund: Rect,
  {
    chemical,
    face,
    room,
    obstacles,
  }: {
    chemical: Chemical;
    face: Side;
    room: Rect;
    obstacles: readonly Rect[];
  },
): BundMarking {
  const floor = grow(room, -CLEAR);
  const stripes: Stripe[] = [];
  const sides: Side[] = ['north', 'south', 'east', 'west'];
  for (const side of sides) {
    // Its line inside the walls (its length is cut to them after).
    const within = (g: number) => {
      const st = strip(bund, side, g);
      return st.along === 'x'
        ? st.minZ >= floor.minZ && st.maxZ <= floor.maxZ
        : st.minX >= floor.minX && st.maxX <= floor.maxX;
    };
    // The furthest out whose middle third is clear of what stands by it;
    // else the furthest inside the walls, cut round what is in its way.
    const gap =
      GAPS.find(
        (g) =>
          within(g) &&
          !obstacles.some((o) =>
            overlap(grow(o, CLEAR), middle(strip(bund, side, g))),
          ),
      ) ?? GAPS.find(within);
    if (gap === undefined) continue;
    stripes.push(...cut(strip(bund, side, gap), room, obstacles));
  }
  // The stencil: before its front if it fits, else the other sides in turn.
  const text = STENCIL_TEXT[chemical];
  const h = STENCIL_HEIGHT;
  const order: Side[] = [
    face,
    ...sides.filter((s) => s !== face && s !== opposite(face)),
    opposite(face),
  ];
  let stencil: Stencil | null = null;
  for (const side of order) {
    const across = side === 'north' || side === 'south';
    const span = across ? bund.maxX - bund.minX : bund.maxZ - bund.minZ;
    // Its letters about 0.6 of their height wide each, filling the bund's width at most.
    const w = Math.min(text.length * h * 0.62, span + 2 * (GAPS[0] + STRIPE));
    const height = (w / (text.length * h * 0.62)) * h;
    const out = GAPS[0] + STRIPE + 0.06 + height / 2;
    // Centred on the bund, or slid along to keep off the walls.
    const slide = (mid: number, lo: number, hi: number) =>
      Math.min(Math.max(mid, lo + w / 2), hi - w / 2);
    const mx = slide((bund.minX + bund.maxX) / 2, floor.minX, floor.maxX);
    const mz = slide((bund.minZ + bund.maxZ) / 2, floor.minZ, floor.maxZ);
    const at =
      side === 'north'
        ? { x: mx, z: bund.minZ - out }
        : side === 'south'
          ? { x: mx, z: bund.maxZ + out }
          : side === 'west'
            ? { x: bund.minX - out, z: mz }
            : { x: bund.maxX + out, z: mz };
    const rect = across
      ? {
          minX: at.x - w / 2,
          maxX: at.x + w / 2,
          minZ: at.z - height / 2,
          maxZ: at.z + height / 2,
        }
      : {
          minX: at.x - height / 2,
          maxX: at.x + height / 2,
          minZ: at.z - w / 2,
          maxZ: at.z + w / 2,
        };
    if (!inside(rect, floor)) continue;
    if (obstacles.some((o) => overlap(grow(o, CLEAR), rect))) continue;
    stencil = { text, ...at, w, h: height, top: opposite(side) };
    break;
  }
  return { chemical, stripes, stencil };
}

const opposite = (s: Side): Side =>
  ({ north: 'south', south: 'north', east: 'west', west: 'east' })[s] as Side;

/** A strip's middle third, along it. */
function middle(s: Stripe): Rect {
  if (s.along === 'x') {
    const third = (s.maxX - s.minX) / 3;
    return { ...s, minX: s.minX + third, maxX: s.maxX - third };
  }
  const third = (s.maxZ - s.minZ) / 3;
  return { ...s, minZ: s.minZ + third, maxZ: s.maxZ - third };
}

/** A placed tank's bund, on the floor: a dose bottle's spill pallet, else its footprint. */
export function bundOf(p: Placed): Rect {
  const [kind, chemical, arg] = p.item.key.split(':');
  if (kind === 'chem-day') {
    const tank = DAY_TANKS[chemical as Chemical]?.find((t) => t.site === arg);
    if (tank && isDoseBottle(tank.litres)) {
      const half = bottleBund(tank.litres).side / 2;
      return {
        minX: p.x - half,
        maxX: p.x + half,
        minZ: p.z - half,
        maxZ: p.z + half,
      };
    }
  }
  return p.footprint;
}

/** Whether a placed item is a bunded tank: a plant room's day tank, or a store's bulk tank. */
export const isBundedTank = (key: string) =>
  key.startsWith('chem-day:') || key.startsWith('chem-bulk:');

/** Every bunded tank's marking in a laid-out room. */
export function roomBundMarkings(layout: {
  box: RoomBox;
  placed: readonly Placed[];
}): BundMarking[] {
  const { box, placed } = layout;
  const room = {
    minX: -box.w / 2,
    maxX: box.w / 2,
    minZ: -box.d / 2,
    maxZ: box.d / 2,
  };
  return placed
    .filter((p) => isBundedTank(p.item.key))
    .map((p) => {
      const others = placed
        .filter((q) => q !== p && q.item.mount === 'floor' && !q.item.walkable)
        .map((q) =>
          isBundedTank(q.item.key)
            ? grow(bundOf(q), GAPS[0] + STRIPE)
            : q.footprint,
        );
      return bundMarking(bundOf(p), {
        chemical: p.item.key.split(':')[1] as Chemical,
        face: faceOf(p.yaw),
        room,
        obstacles: [...others, ...box.keepClear, ...box.solid],
      });
    });
}
