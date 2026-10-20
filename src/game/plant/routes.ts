import { CIRCUITS } from './inventory';
import type { Rect } from '../pool-styles/geometry';
import { packAll } from './packing';
import type { Placed } from './packing';
import { LEVEL_HEIGHT } from './placement';
import {
  CHAMBERS,
  RISERS,
  chamberById,
  sharedSide,
  sideOf,
  span,
} from './warren-plan';
import type { Carried, Chamber, Riser } from './warren-plan';

/**
 * The major pipes and cables, routed: each from the machine it leaves to
 * the machine it serves, as a pipe fitter would run it. It rises from its
 * source into the zone under the ceiling kept for services, runs square
 * (along one axis, then the other) through its rooms, passes through
 * walls in sleeves (never through an escape stair), changes level only
 * inside a riser that carries it, and drops to the machine it serves.
 * Each service runs at its own height in the service zone, so that they
 * lie in parallel layers and each can be traced by its colour. Pure;
 * metres.
 */

export type Point3 = readonly [number, number, number];

export interface Route {
  id: string;
  medium: Carried;
  from: string;
  to: string;
  /** The route, through points (x, y, z): straight runs between them. */
  points: readonly Point3[];
  /** The chambers and risers it passes through, in order. */
  via: readonly string[];
}

/** Each service's layer in the service zone, below the ceiling, metres. */
export const LAYER: Record<Carried, number> = {
  power: 0.15,
  signal: 0.15,
  lighting: 0.15,
  lthw: 0.35,
  gas: 0.5,
  'make-up': 0.6,
  chemical: 0.7,
  drain: 0.85,
};

/** Stairs that are escape routes: no services run in them. */
const ESCAPE = new Set(['stair-main', 'stair-down', 'stair-roof']);

/**
 * A chamber's run height for `medium`: one height on each level (3 m over
 * the level's floor, less its layer), so that pipes do not climb or dip
 * between rooms of a level, kept under a lower ceiling where there is
 * one (a sunken room's pipes still run at the level's height above it).
 */
function runHeight(c: Chamber, medium: Carried): number {
  const { high } = span(c);
  const ceiling = c.open ? Infinity : high + c.height;
  return Math.min(LEVEL_HEIGHT[c.level] + 3, ceiling - 0.05) - LAYER[medium];
}

const touches = (a: Rect, b: Rect) =>
  a.minX <= b.maxX &&
  b.minX <= a.maxX &&
  a.minZ <= b.maxZ &&
  b.minZ <= a.maxZ &&
  !(a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ);

/** Where a riser meets a chamber on a level: the middle of their shared edge. */
function riserMouth(r: Riser, c: Chamber): [number, number] {
  const x0 = Math.max(r.rect.minX, c.rect.minX),
    x1 = Math.min(r.rect.maxX, c.rect.maxX);
  const z0 = Math.max(r.rect.minZ, c.rect.minZ),
    z1 = Math.min(r.rect.maxZ, c.rect.maxZ);
  return [(x0 + x1) / 2, (z0 + z1) / 2];
}

const LEVEL_ORDER = ['roof', 'surface', 'treatment', 'basement'] as const;

/** The chambers a riser opens onto, by level. */
function riserLandings(r: Riser): Map<string, Chamber[]> {
  const top = LEVEL_ORDER.indexOf(r.top);
  const bottom = LEVEL_ORDER.indexOf(r.bottom);
  const map = new Map<string, Chamber[]>();
  for (const level of LEVEL_ORDER.slice(top, bottom + 1))
    map.set(
      level,
      CHAMBERS.filter(
        (c) =>
          c.level === level && !ESCAPE.has(c.id) && touches(r.rect, c.rect),
      ),
    );
  return map;
}

/** One step from a chamber: through a wall to a neighbour, or into a riser to another level. */
interface Step {
  to: string;
  /** Through a wall at this point (x, z), or by a riser. */
  wall?: [number, number];
  riser?: Riser;
}

function steps(medium: Carried): Map<string, Step[]> {
  const map = new Map<string, Step[]>();
  const add = (a: string, s: Step) => {
    if (!map.has(a)) map.set(a, []);
    map.get(a)!.push(s);
  };
  const usable = CHAMBERS.filter((c) => !ESCAPE.has(c.id));
  for (const a of usable)
    for (const b of usable) {
      if (a === b || a.level !== b.level) continue;
      const side = sharedSide(a.rect, b.rect);
      if (!side) continue;
      const s = sideOf(a.rect, side);
      const t = sideOf(
        b.rect,
        side === 'north'
          ? 'south'
          : side === 'south'
            ? 'north'
            : side === 'east'
              ? 'west'
              : 'east',
      );
      const mid = (Math.max(s.from, t.from) + Math.min(s.to, t.to)) / 2;
      add(a.id, {
        to: b.id,
        wall: s.along === 'x' ? [mid, s.at] : [s.at, mid],
      });
    }
  for (const r of RISERS.filter((x) => x.carries.includes(medium))) {
    const landings = [...riserLandings(r).values()].flat();
    for (const a of landings)
      for (const b of landings)
        if (a !== b && a.level !== b.level) add(a.id, { to: b.id, riser: r });
  }
  return map;
}

/** The fewest-steps way from one chamber to another for `medium`. */
function chamberPath(
  from: string,
  to: string,
  medium: Carried,
): { chamber: string; step?: Step }[] | null {
  const next = steps(medium);
  const back = new Map<string, { from: string; step: Step }>();
  const queue = [from];
  const seen = new Set([from]);
  while (queue.length) {
    const at = queue.shift()!;
    if (at === to) break;
    for (const s of next.get(at) ?? []) {
      if (seen.has(s.to)) continue;
      seen.add(s.to);
      back.set(s.to, { from: at, step: s });
      queue.push(s.to);
    }
  }
  if (!seen.has(to)) return null;
  const path: { chamber: string; step?: Step }[] = [{ chamber: to }];
  for (let at = to; at !== from;) {
    const b = back.get(at)!;
    path[0].step = b.step;
    path.unshift({ chamber: b.from });
    at = b.from;
  }
  return path;
}

/** A square run inside a chamber, at height `y`, from (x0, z0) to (x1, z1): along x, then z. */
const square = (
  _x0: number,
  z0: number,
  x1: number,
  z1: number,
  y: number,
): Point3[] => [
  [x1, y, z0],
  [x1, y, z1],
];

/** A machine's top middle, where its pipe or cable leaves or arrives. */
const topOf = (p: Placed): Point3 => [
  (p.rect.minX + p.rect.maxX) / 2,
  p.y + p.size.h,
  (p.rect.minZ + p.rect.maxZ) / 2,
];

/** Route one service from one machine to another, if it can be. */
export function route(
  id: string,
  medium: Carried,
  from: Placed,
  to: Placed,
): Route | null {
  const path = chamberPath(from.chamber, to.chamber, medium);
  if (!path) return null;
  const points: Point3[] = [];
  const start = topOf(from);
  let y = runHeight(chamberById(from.chamber), medium);
  points.push(start, [start[0], y, start[2]]);
  let [x, z] = [start[0], start[2]];
  const via: string[] = [from.chamber];
  for (let i = 1; i < path.length; i++) {
    const step = path[i].step!;
    const here = chamberById(path[i - 1].chamber);
    const there = chamberById(path[i].chamber);
    if (step.wall) {
      const [wx, wz] = step.wall;
      points.push(...square(x, z, wx, wz, y));
      [x, z] = [wx, wz];
      const ny = runHeight(there, medium);
      // Through the wall; then to its height in the next room.
      if (Math.abs(ny - y) > 1e-6) points.push([x, ny, z]);
      y = ny;
    } else {
      const r = step.riser!;
      const [mx, mz] = riserMouth(r, here);
      points.push(...square(x, z, mx, mz, y));
      const cx = (r.rect.minX + r.rect.maxX) / 2,
        cz = (r.rect.minZ + r.rect.maxZ) / 2;
      // Into the riser square, up or down it, and out square.
      points.push([cx, y, mz], [cx, y, cz]);
      const ny = runHeight(there, medium);
      points.push([cx, ny, cz]);
      const [ox, oz] = riserMouth(r, there);
      points.push([cx, ny, oz], [ox, ny, oz]);
      [x, z] = [ox, oz];
      y = ny;
      via.push(r.id);
    }
    via.push(there.id);
  }
  const end = topOf(to);
  points.push(...square(x, z, end[0], end[2], y), end);
  // Drop repeats.
  const clean = points.filter(
    (p, i) =>
      i === 0 ||
      Math.hypot(
        p[0] - points[i - 1][0],
        p[1] - points[i - 1][1],
        p[2] - points[i - 1][2],
      ) > 1e-6,
  );
  return { id, medium, from: from.id, to: to.id, points: clean, via };
}

/** The major routes: heat, gas, power, chemicals, make-up water and drains, from source to every user. */
export function majorRoutes(): { routes: Route[]; unrouted: string[] } {
  const { placed } = packAll();
  const at = (id: string) => placed.find((p) => p.id === id);
  const plantRooms = ['municipal', 'tunnel', 'reservoir', 'white', 'atrium'];
  const firstCircuit = (attraction: string) =>
    CIRCUITS.find((c) => c.attraction === attraction)!.id;
  const wanted: [string, Carried, string, string][] = [];
  for (const a of plantRooms) {
    const c = firstCircuit(a);
    wanted.push([`lthw-${a}`, 'lthw', 'lthw-header', `hx-${c}`]);
    wanted.push([`power-${a}`, 'power', 'lv-board', `panel-${a}`]);
    wanted.push([
      `chemical-${a}`,
      'chemical',
      'hypochlorite-bulk',
      `dosing-${c}`,
    ]);
    wanted.push([`drain-${a}`, 'drain', `filters-${c}-1`, 'backwash-tank']);
  }
  wanted.push(['lthw-roof', 'lthw', 'lthw-header', 'ahu-municipal']);
  wanted.push(['power-roof', 'power', 'lv-board', 'ahu-municipal']);
  wanted.push(['power-boilers', 'power', 'lv-board', 'boiler-1']);
  wanted.push(['gas-boilers', 'gas', 'gas-meter', 'boiler-1']);
  wanted.push(['make-up', 'make-up', 'break-tank', 'balance-municipal-main']);
  wanted.push(['sewer', 'drain', 'backwash-tank', 'sewer-connection']);
  const routes: Route[] = [];
  const unrouted: string[] = [];
  for (const [id, medium, from, to] of wanted) {
    const a = at(from),
      b = at(to);
    const r = a && b ? route(id, medium, a, b) : null;
    if (r) routes.push(r);
    else unrouted.push(id);
  }
  return { routes, unrouted };
}

export { LEVEL_HEIGHT };
