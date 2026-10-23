import type { Footprint } from '../../controls/logic/walk-collision';
import { plantRoomPlan } from './plant-rooms';
import { plantRoomBox } from './room-equipment';

/**
 * The Olympic plant room's redo, in plan (prompt 033, stage 2): where each
 * machine stands, as the owner has arranged it (2026-10-23), before the
 * pipeline places and routes it. The five 3 m round filters in one line
 * along the north wall, a battery on common headers along its front; the
 * pumps against the west wall, beside the balance tank hall's doors, their
 * suctions short through it; the treatment (ozone, contact, UV) east; the
 * heat exchanger and the dosing on the south wall, where the heating and
 * the chemicals come from the main plant; the panel on the east wall,
 * where power and control come in. Each line leaves by its wall's role.
 * Pure; metres, the room's middle at x = z = 0, x east, z south.
 */

export type Facing = 'north' | 'south' | 'east' | 'west';

export interface PlanItem {
  key: string;
  label: string;
  /** Along its front, front to back, height, metres. */
  w: number;
  d: number;
  h: number;
  x: number;
  z: number;
  facing: Facing;
  mount: 'floor' | 'wall';
}

/** Each machine's size, as the room's equipment has it (`retired0`). */
const SIZE = {
  filter: { w: 3.6, d: 3.8, h: 3.55 },
  pumps: { w: 3.2, d: 2.4, h: 1.9 },
  contact: { w: 3.45, d: 3.45, h: 3.05 },
  generator: { w: 1.6, d: 0.5, h: 1.95 },
  uv: { w: 1.7, d: 1.6, h: 1.7 },
  exchanger: { w: 1.5, d: 0.7, h: 1.2 },
  panel: { w: 2.7, d: 0.6, h: 2.45 },
  controller: { w: 1.0, d: 0.25, h: 1.4 },
  hypo: { w: 1.2, d: 0.3, h: 1.0 },
  acid: { w: 0.7, d: 0.35, h: 0.8 },
} as const;

/** Maintenance access in front of each machine, metres. */
export const PLAN_ACCESS = 0.8;
/** Between the filters' outlines, and their line's start off the west wall, metres. */
export const FILTER_GAP = 0.6;
const FILTER_START = 0.3;
/** The common headers' strip in front of the battery, metres. */
export const HEADERS = 0.6;
/** Machines stand this far off a wall, for their pipes and fixings behind. */
const OFF_WALL = 0.2;

const plan = plantRoomPlan('large', { tankHall: true });
const h = plan.h;
/** The floor's north edge: the landing above, the floor kept out under it. */
const NORTH = plan.landing.maxZ + 0.05;

const item = (
  key: string,
  label: string,
  size: { w: number; d: number; h: number },
  x: number,
  z: number,
  facing: Facing,
  mount: PlanItem['mount'] = 'floor',
): PlanItem => ({ key, label, ...size, x, z, facing, mount });

/** Where along its wall, from the facing: a machine's back on its wall. */
const against = (
  wall: Facing,
  along: number,
  size: { w: number; d: number },
  off = OFF_WALL,
) => {
  const back = h - off - size.d / 2;
  return wall === 'west'
    ? { x: -back, z: along, facing: 'east' as const }
    : wall === 'east'
      ? { x: back, z: along, facing: 'west' as const }
      : wall === 'south'
        ? { x: along, z: back, facing: 'north' as const }
        : { x: along, z: -back, facing: 'south' as const };
};

export function olympicPlan(): PlanItem[] {
  const out: PlanItem[] = [];
  // The battery: five filters along the north, facing south.
  const f = SIZE.filter;
  for (let i = 0; i < 5; i++)
    out.push(
      item(
        `filter-${i + 1}`,
        `Sand filter ${i + 1}`,
        f,
        -h + FILTER_START + f.w / 2 + i * (f.w + FILTER_GAP),
        NORTH + f.d / 2,
        'south',
      ),
    );
  // The pumps against the west wall, just south of the doors' clear space.
  const door = plan.tankDoor!;
  const p = SIZE.pumps;
  const pz = door.z + 1.3 + 0.3 + p.w / 2;
  out.push(
    item(
      'pumps',
      'Circulation pumps, duty and standby',
      p,
      ...xz(against('west', pz, p)),
    ),
  );
  // Ozone: the contact tank east of the room's middle, its generator on the east wall beside it.
  const c = SIZE.contact;
  const cz = NORTH + f.d + HEADERS + 1.2 + PLAN_ACCESS + c.d / 2;
  out.push(item('contact', 'Ozone contact tank', c, 6.9, cz, 'west'));
  const g = SIZE.generator;
  out.push(
    item('generator', 'Ozone generator', g, ...xz(against('east', cz, g))),
  );
  // The UV unit south of the contact tank, on the way back to the pool.
  const u = SIZE.uv;
  out.push(item('uv', 'UV unit', u, 6.9, cz + c.d / 2 + 1.6 + u.d / 2, 'west'));
  // The panel on the east wall, where power and control come in.
  const pn = SIZE.panel;
  out.push(
    item('panel', 'Local control panel', pn, ...xz(against('east', 4.2, pn))),
  );
  // On the south wall, east of the doors: the heat exchanger by the heating; the dosing where the chemicals come in.
  const x = SIZE.exchanger;
  out.push(
    item(
      'exchanger',
      'Heat exchanger',
      x,
      ...xz(against('south', 3.6, x, 0.5)),
    ),
  );
  let at = 6.0;
  for (const [key, label, size] of [
    ['acid', 'Acid dosing pump', SIZE.acid],
    ['hypo', 'Hypochlorite dosing pumps', SIZE.hypo],
    ['controller', 'Dosing controller and sample cells', SIZE.controller],
  ] as const) {
    out.push(
      item(
        key,
        label,
        size,
        ...xz(against('south', at + size.w / 2, size, 0)),
        'wall',
      ),
    );
    at += size.w + 0.4;
  }
  return out;
}

const xz = (a: { x: number; z: number; facing: Facing }) =>
  [a.x, a.z, a.facing] as const;

/** A machine's footprint in plan: its front along x when it faces north or south. */
export function footprintOf(i: PlanItem): Footprint {
  const across = i.facing === 'north' || i.facing === 'south';
  const hw = (across ? i.w : i.d) / 2;
  const hd = (across ? i.d : i.w) / 2;
  return { minX: i.x - hw, maxX: i.x + hw, minZ: i.z - hd, maxZ: i.z + hd };
}

/** The strip in front of it kept for its maintenance. */
export function accessOf(i: PlanItem, depth = PLAN_ACCESS): Footprint {
  const f = footprintOf(i);
  switch (i.facing) {
    case 'south':
      return { ...f, minZ: f.maxZ, maxZ: f.maxZ + depth };
    case 'north':
      return { ...f, minZ: f.minZ - depth, maxZ: f.minZ };
    case 'east':
      return { ...f, minX: f.maxX, maxX: f.maxX + depth };
    case 'west':
      return { ...f, minX: f.minX - depth, maxX: f.minX };
  }
}

/** The room the plan is laid in: its box (kept-clear spaces, the landing and stair). */
export const olympicBox = () => plantRoomBox('large', { tankHall: true });
export const olympicRoomPlan = () => plan;
