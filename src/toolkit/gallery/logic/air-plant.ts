import type { Footprint } from '../../controls/logic/walk-collision';
import { POOLS } from '../../../game/plant-sizing/pools.config';
import { sizePlant } from '../../../game/plant-sizing/sizing';
import { ahuSizeFor, ductSize } from '../../../game/plant-sizing/ahu-range';
import type { AhuSize } from '../../../game/plant-sizing/ahu-range';
import type { Item, Placed, RoomBox } from './room-equipment';
import { shellRoomBox } from './room-equipment';

/**
 * The air handling plant: the pool halls' air handling units (the DanX
 * XWPS range, `ahu-range.ts`), stacked; their ducts; and the gantries and
 * stair that reach the stacks' upper units. Pure: metres, the room's
 * frame (x east, z south, its floor at 0).
 *
 * The Olympic hall's units stand in stacks of three along the west wall,
 * two gantries along their fronts at the upper units' floors, reached by
 * a stair at the south end; the other halls' units stand one each along
 * the east wall. Each unit's four ducts leave its ends (outside air and
 * exhaust at one, supply and extract at the other), each at its own
 * height, and turn into the wall behind, so none crosses another.
 */

export type AirHall = 'lounge' | 'olympic' | 'jacuzzi' | 'footbath';

export interface AirUnit {
  /** Its tag: AHU-801 and on. */
  tag: string;
  hall: AirHall;
  /** What it serves, for its plates. */
  serves: string;
  size: AhuSize;
  /** Its design airflow, m³/h. */
  airflow: number;
}

const HALL_OF: Record<string, AirHall> = {
  pool_01: 'lounge',
  pool_02: 'olympic',
  pool_03: 'jacuzzi',
  pool_04: 'footbath',
};
const SERVES: Record<AirHall, string> = {
  lounge: 'LOUNGE POOL HALL',
  olympic: 'OLYMPIC POOL HALL',
  jacuzzi: 'JACUZZI ROOM',
  footbath: 'FOOTBATH PASSAGE',
};

/** Every unit, from the plant sizing: each hall's airflow over its units, each the size to carry it. */
export const AIR_UNITS: readonly AirUnit[] = (() => {
  const halls = sizePlant(POOLS).halls;
  const order: AirHall[] = ['lounge', 'olympic', 'jacuzzi', 'footbath'];
  const units: AirUnit[] = [];
  for (const hall of order) {
    const h = halls.find((x) => HALL_OF[x.attraction.room] === hall);
    if (!h) continue;
    const each = h.airflow / h.units;
    for (let i = 0; i < h.units; i++)
      units.push({
        tag: `AHU-${801 + units.length}`,
        hall,
        serves: h.units > 1 ? `${SERVES[hall]} ${i + 1}` : SERVES[hall],
        size: ahuSizeFor(each),
        airflow: Math.round(each),
      });
  }
  return units;
})();

/** The steel frame between a stack's units, metres. */
export const STACK_FRAME = 0.15;
/** How far a unit's duct spigot, with its flexible connection, stands off its end. */
export const SPIGOT = 0.15;
/** Clear space behind a stack, against its wall. */
export const STACK_BACK = 0.3;

/** A stack's units, bottom first: all of one size. */
export interface Stack {
  units: readonly AirUnit[];
}

/** The Olympic's in threes; every other hall's unit on its own. */
export const STACKS: readonly Stack[] = (() => {
  const olympic = AIR_UNITS.filter((u) => u.hall === 'olympic');
  const stacks: Stack[] = [];
  for (let i = 0; i < olympic.length; i += 3)
    stacks.push({ units: olympic.slice(i, i + 3) });
  for (const u of AIR_UNITS.filter((x) => x.hall !== 'olympic'))
    stacks.push({ units: [u] });
  return stacks;
})();

/** Where a stack's unit `k` stands, from the floor. */
export const unitBase = (size: AhuSize, k: number) =>
  k * (size.height + STACK_FRAME);
/** How far a stack's ducts reach past each of its ends: the spigot, then the turn. */
export const ductZone = (size: AhuSize) => SPIGOT + ductSize(size).w + 0.1;

/** A stack as a machine for the room's layout. */
export function stackItem(stack: Stack): Item {
  const s = stack.units[0].size;
  const n = stack.units.length;
  return {
    key: `ahu-stack:${stack.units.map((u) => u.tag).join('+')}`,
    label: `Air handling ${n > 1 ? 'units' : 'unit'} ${stack.units
      .map((u) => u.tag)
      .join(', ')}: ${stack.units[0].serves.replace(/ \d+$/, '')}`,
    w: s.length + 2 * ductZone(s),
    d: s.depth,
    h: n * s.height + (n - 1) * STACK_FRAME,
    mount: 'floor',
    back: STACK_BACK,
  };
}

/** The units of a stack's item, by its key. */
export function stackOf(key: string): Stack | null {
  const [kind, tags] = key.split(':');
  if (kind !== 'ahu-stack' || !tags) return null;
  return (
    STACKS.find((s) => s.units.map((u) => u.tag).join('+') === tags) ?? null
  );
}

/** The air plant's room. */
export const airBox = (): RoomBox => shellRoomBox('air_plant');

/** The stacks placed: the Olympic's along the west wall from its north end, the rest along the east. */
export function placeStacks(box: RoomBox): { item: Item; at: Placement }[] {
  const hw = box.w / 2;
  const hd = box.d / 2;
  const out: { item: Item; at: Placement }[] = [];
  const row = (stacks: readonly Stack[], side: 'west' | 'east') => {
    let z = -hd + 0.1;
    for (const st of stacks) {
      const item = stackItem(st);
      const x =
        side === 'west'
          ? -hw + STACK_BACK + item.d / 2
          : hw - STACK_BACK - item.d / 2;
      out.push({
        item,
        at: { x, z: z + item.w / 2, face: side === 'west' ? 'east' : 'west' },
      });
      z += item.w + 0.3;
    }
  };
  row(
    STACKS.filter((s) => s.units[0].hall === 'olympic'),
    'west',
  );
  row(
    STACKS.filter((s) => s.units[0].hall !== 'olympic'),
    'east',
  );
  return out;
}

type Placement = { x: number; z: number; face: 'east' | 'west' };

// ---- Ports and ducts --------------------------------------------------------

export type AirRole = 'outdoor' | 'exhaust' | 'supply' | 'extract';

/** A unit's four ducts at its ends, in its stack's frame (front +z, along x). */
export function stackPorts(stack: Stack) {
  const s = stack.units[0].size;
  const end = s.length / 2 + SPIGOT;
  const { w, h } = ductSize(s);
  return stack.units.flatMap((u, k) => {
    const base = unitBase(s, k);
    const lower = base + s.height * 0.27;
    const upper = base + s.height * 0.73;
    // Outside air into its upper deck and exhaust out of its lower, at
    // its west end (-x); supply out of its upper deck and the hall's
    // extract into its lower, at its east (+x).
    const port = (role: AirRole, x: number, y: number) => ({
      name: `${role}-${u.tag}`,
      role,
      unit: u,
      at: [x, y, 0] as const,
      outward: [Math.sign(x), 0, 0] as const,
      w,
      h,
    });
    return [
      port('outdoor', -end, upper),
      port('exhaust', -end, lower),
      port('supply', end, upper),
      port('extract', end, lower),
    ];
  });
}

export type Vec3 = [number, number, number];

export interface Duct {
  name: string;
  role: AirRole;
  tag: string;
  /** Its section: width (horizontal, across its run) and height, metres. */
  w: number;
  h: number;
  points: Vec3[];
}

/** A point of a stack's frame in the room's. */
function toRoom(p: Placed, at: readonly [number, number, number]): Vec3 {
  const c = Math.cos(p.yaw);
  const s = Math.sin(p.yaw);
  return [p.x + at[0] * c + at[2] * s, at[1], p.z - at[0] * s + at[2] * c];
}

/**
 * Each unit's ducts: out of its end, round, and straight back into the
 * wall behind the stack, at the port's own height.
 */
export function airDucts(placed: readonly Placed[], box: RoomBox): Duct[] {
  const out: Duct[] = [];
  for (const p of placed) {
    const stack = stackOf(p.item.key);
    if (!stack) continue;
    const back = toRoom(p, [0, 0, -1]);
    const backDir = [back[0] - p.x, 0, back[2] - p.z];
    for (const port of stackPorts(stack)) {
      const a = toRoom(p, port.at);
      const turn = toRoom(p, [
        port.at[0] + port.outward[0] * (port.w / 2 + 0.05),
        port.at[1],
        0,
      ]);
      // Back to the wall behind the stack.
      const wall: Vec3 =
        Math.abs(backDir[0]) > 0.5
          ? [Math.sign(backDir[0]) * (box.w / 2), turn[1], turn[2]]
          : [turn[0], turn[1], Math.sign(backDir[2]) * (box.d / 2)];
      out.push({
        name: `${port.unit.tag} ${port.role} duct`,
        role: port.role,
        tag: port.unit.tag,
        w: port.w,
        h: port.h,
        points: [a, turn, wall],
      });
    }
  }
  return out;
}

// ---- Gantries and the stair ------------------------------------------------

/** A walking surface above the floor: level, or a flight rising from (a) to (b). */
export interface Surface {
  name: string;
  area: Footprint;
  /** Its height: level, or rising along x or z from `from` to `to`. */
  y:
    | number
    | { along: 'x' | 'z'; at0: number; y0: number; at1: number; y1: number };
}

/** The gantries' width, the stair's going and its flights' width, metres. */
export const GANTRY_WIDTH = 1.2;

/** A flight's going (its length on plan), metres: 2.4 m rise over 3 m, about 39 degrees. */
export const FLIGHT = 3.0;
/** How far the stair's foot stands north of the stacks' south end, clear of the door, metres. */
export const STAIR_SET_BACK = 2.5;

/**
 * The gantries along the west stacks' fronts at each upper unit's floor,
 * and their stair, outside them (the owner, 2026-10-24: the stair on the
 * outside of the three-storey structure, two flights on in the same
 * direction with a small landing at the middle floor): in a band of its
 * own just east of the gantries, from its foot set back from the door,
 * a flight north up to a landing beside the first gantry, then a second
 * flight straight on north up to a landing beside the second. Nothing is
 * over either flight, and the floor under the first gantry stays clear
 * for working on the lowest units.
 */
export function gantries(box: RoomBox): Surface[] {
  const west = placeStacks(box).filter((s) => s.at.face === 'east');
  if (!west.length) return [];
  const units = stackOf(west[0].item.key)!.units;
  const size = units[0].size;
  const front = west[0].at.x + west[0].item.d / 2;
  const x0 = front;
  const x1 = front + GANTRY_WIDTH;
  const x2 = x1 + GANTRY_WIDTH;
  const north = Math.min(...west.map((s) => s.at.z - s.item.w / 2));
  const south = Math.max(...west.map((s) => s.at.z + s.item.w / 2));
  const levels = units.slice(1).map((_, k) => unitBase(size, k + 1));
  const out: Surface[] = levels.map((y, k) => ({
    name: `Gantry ${k + 1}`,
    area: { minX: x0, maxX: x1, minZ: north, maxZ: south },
    y,
  }));
  // Up the band from its foot, set back from the door, each flight then
  // its landing.
  let z = south - STAIR_SET_BACK;
  let below = 0;
  const ORDINAL = ['first', 'second', 'third'];
  levels.forEach((y, k) => {
    out.push(
      {
        name: `Stair, ${ORDINAL[k]} flight`,
        area: { minX: x1, maxX: x2, minZ: z - FLIGHT, maxZ: z },
        y: { along: 'z', at0: z, y0: below, at1: z - FLIGHT, y1: y },
      },
      {
        name:
          k === 0
            ? 'First landing'
            : k === 1
              ? 'Second landing'
              : `Landing ${k + 1}`,
        area: {
          minX: x1,
          maxX: x2,
          minZ: z - FLIGHT - GANTRY_WIDTH,
          maxZ: z - FLIGHT,
        },
        y,
      },
    );
    z -= FLIGHT + GANTRY_WIDTH;
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
export function airFloorAt(
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
 * underside where it is too low to pass; up on a gantry, its handrails,
 * every edge of the surfaces of that level except where one meets
 * another or a flight of the stair.
 */
export function levelSolids(
  surfaces: readonly Surface[],
  y: number,
): Footprint[] {
  const { level } = levelOf(surfaces, y);
  if (level < 0.5) {
    // Climbing the first flight, not under it: nothing stops the walker
    // but the floor's level's rails, of which there are none.
    if (y > STEP_UP / 2) return [];
    // Under the first flight, where its underside is below a head.
    const first = surfaces.find((s) => s.name === 'Stair, first flight');
    if (!first || typeof first.y === 'number') return [];
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
    const a = s.area;
    const edges: [Footprint, 'x' | 'z'][] = [
      [{ minX: a.minX, maxX: a.maxX, minZ: a.minZ - T, maxZ: a.minZ }, 'x'],
      [{ minX: a.minX, maxX: a.maxX, minZ: a.maxZ, maxZ: a.maxZ + T }, 'x'],
      [{ minX: a.minX - T, maxX: a.minX, minZ: a.minZ, maxZ: a.maxZ }, 'z'],
      [{ minX: a.maxX, maxX: a.maxX + T, minZ: a.minZ, maxZ: a.maxZ }, 'z'],
    ];
    for (const [edge, along] of edges) {
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
