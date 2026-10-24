import { ductSize } from '../../../game/plant-sizing/ahu-range';
import type { AhuSize } from '../../../game/plant-sizing/ahu-range';
import type { Item, Placed, RoomBox } from './room-equipment';
import { shellRoomBox } from './room-equipment';
import { decksAndStair, GANTRY_WIDTH } from './stair-run';
import type { Surface } from './stair-run';

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

export { AIR_UNITS } from '../../../game/plant/air-handling';
export type { AirHall, AirUnit } from '../../../game/plant/air-handling';
import { AIR_UNITS } from '../../../game/plant/air-handling';
import type { AirUnit } from '../../../game/plant/air-handling';

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

export {
  FLIGHT,
  GANTRY_WIDTH,
  levelSolids,
  STEP_UP,
  surfaceFloorAt as airFloorAt,
  surfaceY,
} from './stair-run';
export type { Surface } from './stair-run';

/** How far the stair's foot stands north of the stacks' south end, clear of the door, metres. */
export const STAIR_SET_BACK = 2.5;

/**
 * The gantries along the west stacks' fronts at each upper unit's floor,
 * and their stair, outside them (the owner, 2026-10-24: the stair on the
 * outside of the three-storey structure, two flights on in the same
 * direction with a small landing at the middle floor): the stair helper's
 * (`stair-run.ts`), its foot set back from the door. The floor under the
 * first gantry stays clear for working on the lowest units.
 */
export function gantries(box: RoomBox): Surface[] {
  const west = placeStacks(box).filter((s) => s.at.face === 'east');
  if (!west.length) return [];
  const units = stackOf(west[0].item.key)!.units;
  const size = units[0].size;
  const front = west[0].at.x + west[0].item.d / 2;
  const north = Math.min(...west.map((s) => s.at.z - s.item.w / 2));
  const south = Math.max(...west.map((s) => s.at.z + s.item.w / 2));
  return decksAndStair({
    deck: { minX: front, maxX: front + GANTRY_WIDTH, minZ: north, maxZ: south },
    levels: units.slice(1).map((_, k) => unitBase(size, k + 1)),
    foot: south - STAIR_SET_BACK,
  });
}
