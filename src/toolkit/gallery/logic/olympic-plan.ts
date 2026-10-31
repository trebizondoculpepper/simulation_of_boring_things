import type { Footprint } from '../../controls/logic/walk-collision';
import {
  EQUIPMENT_OPENING,
  PLANT_DOORWAY,
  PLANT_ROOM,
  plantRoomPlan,
} from './plant-rooms';
import type { ShellPlan } from './shell-plan';

/**
 * The Olympic plant room's redo, in plan (prompt 033, stage 2): where each
 * machine stands, as the owner has arranged it (2026-10-23), before the
 * pipeline places and routes it.
 *
 * The room is 22 × 14 m inside, two storeys: long enough for the five 3 m
 * round filters in one line along the north wall, a battery on common
 * headers along its front, and no deeper than its machines need. The pool
 * door is in the east wall at deck level, onto a landing in the south-east
 * corner; the stair runs down from it along the south wall, heading west;
 * the equipment doors to the main plant are in the south wall under the
 * landing; the balance tank hall's doors are in the west wall, just south
 * of the battery.
 *
 * The pumps stand against the west wall beside those doors, their suctions
 * short through it; the treatment (ozone contact, UV) in the middle; the
 * heat exchanger by its side-stream's stubs on the battery's outlet header;
 * the dosing on the south wall, where the chemicals come from the main plant; the panel on the east wall,
 * where power and control come in. Pure; metres, the room's middle at
 * x = z = 0, x east, z south.
 */

export type Facing = 'north' | 'south' | 'east' | 'west';
export type Wall = Facing;

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
  /** For wall equipment, the height of its fixing, metres. */
  y?: number;
  /** For floor equipment raised on a steel stand, the stand's height, metres. */
  stand?: number;
}

export interface PlanDoor {
  wall: Wall;
  /** Its middle along its wall (z on the east and west, x on the north and south). */
  at: number;
  width: number;
  /** At deck level (the pool's, onto the landing), or on the plant floor. */
  deck: boolean;
  label: string;
}

/** The room, inside its walls. */
export const OLYMPIC_ROOM = { w: 22, d: 14 } as const;
const hx = OLYMPIC_ROOM.w / 2;
const hz = OLYMPIC_ROOM.d / 2;

/** Each machine's size, as the room's equipment has it (`retired0`). */
const SIZE = {
  filter: { w: 3.6, d: 3.8, h: 3.55 },
  pumps: { w: 3.2, d: 2.4, h: 1.9 },
  contact: { w: 3.45, d: 3.45, h: 3.05 },
  generator: { w: 1.6, d: 0.5, h: 1.95 },
  uv: { w: 1.7, d: 1.6, h: 1.7 },
  exchanger: { w: 1.5, d: 0.7, h: 1.2 },
  panel: { w: 2.7, d: 0.6, h: 2.45 },
  // The Dr Aqualis Trio's cabinet (mission 114, `aqualis-cabinet.ts`).
  controller: { w: 0.6, d: 0.3, h: 1.8 },
  hypo: { w: 1.2, d: 0.3, h: 1.0 },
  acid: { w: 0.7, d: 0.35, h: 0.8 },
  // Dev28's Penfold balance tank panel (`BALANCE_PANEL`).
  tankPanel: { w: 0.8, d: 0.25, h: 0.9 },
} as const;

/** The dosing's fixing heights on the wall (as the room's equipment has them). */
const WALL_HEIGHT: Record<string, number> = {
  tankPanel: 1.45,
  hypo: 1.3,
  acid: 1.3,
};

/** The gap behind the pump pair, along the west wall, metres. */
const PUMP_BACK = 0.8;
/** The UV unit's middle along the south wall, metres. */
const UV_X = -3.4;

/** Maintenance access in front of each machine, metres. */
export const PLAN_ACCESS = 0.8;
/** Between the filters' outlines, metres. */
export const FILTER_GAP = 0.6;
/** The common headers' strip in front of the battery, metres. */
export const HEADERS = 0.6;
/** The walkway in front of the battery's headers, metres. */
const BATTERY_WALK = 1.2;
/** Machines stand this far off a wall, for their pipes and fixings behind. */
const OFF_WALL = 0.2;
/** The space kept clear inside a pair of equipment doors: across the opening, and into the room. */
const DOOR_CLEAR = { across: 2.6, into: 1.6 } as const;

const P = PLANT_ROOM;
const steps = Math.round(P.storey / P.stair.riser);
/**
 * The landing at deck level in the south-east corner, the pool door onto it.
 * It and the gantry are cantilevered from the walls on steel brackets (the
 * owner, 2026-10-23): no legs, so the plant floor under them is clear; the
 * walls they hang from (east and south) are built to carry them.
 */
const LANDING = { minX: hx - 3, maxX: hx, minZ: hz - 2.4, maxZ: hz } as const;
/** The gantry along the east wall at deck level, from the landing to the north wall: a viewing walkway over the plant. */
export const GANTRY_WIDTH = 1.2;
const GANTRY = {
  minX: hx - GANTRY_WIDTH,
  maxX: hx,
  minZ: -hz,
  maxZ: LANDING.minZ,
} as const;
/** The underside of the landing and gantry over the plant floor, metres: a storey less their depth. */
export const DECK_SOFFIT = PLANT_ROOM.storey - 0.15;
/** The stair: down from the landing's west edge, along the south wall, heading west. */
const STAIR = {
  minX: LANDING.minX - (steps - 1) * P.stair.going,
  maxX: LANDING.minX,
  minZ: hz - P.stair.width,
  maxZ: hz,
  steps,
} as const;
/** The battery's strip along the north wall: the filters, their headers, the walkway in front. */
const BATTERY = OFF_WALL + SIZE.filter.d + HEADERS + BATTERY_WALK;

const DOORS: Record<'pool' | 'main' | 'tank', PlanDoor> = {
  pool: {
    wall: 'east',
    at: (LANDING.minZ + LANDING.maxZ) / 2,
    width: PLANT_DOORWAY,
    deck: true,
    label: 'POOL DOOR (deck level, onto the landing)',
  },
  // Under the landing: 3.5 m over the plant floor, so its 2.46 m doors clear it.
  main: {
    wall: 'south',
    at: (LANDING.minX + LANDING.maxX) / 2,
    width: EQUIPMENT_OPENING,
    deck: false,
    label: 'EQUIPMENT DOORS (under the landing)',
  },
  // Just south of the battery's strip, its clear space clear of it.
  tank: {
    wall: 'west',
    at: -hz + BATTERY + DOOR_CLEAR.across / 2,
    width: EQUIPMENT_OPENING,
    deck: false,
    label: 'BALANCE TANK DOORS',
  },
};

/** The room's plan: its size, landing, stair and doors. */
export const olympicRoomPlan = () => ({
  halfX: hx,
  halfZ: hz,
  landing: LANDING,
  gantry: GANTRY,
  cantilevered: true,
  stair: STAIR,
  doors: DOORS,
});

/** The space kept clear inside each pair of equipment doors, and at the stair's foot. */
export function keptClear(): Footprint[] {
  const tank = DOORS.tank;
  const main = DOORS.main;
  return [
    {
      minX: -hx,
      maxX: -hx + DOOR_CLEAR.into,
      minZ: tank.at - DOOR_CLEAR.across / 2,
      maxZ: tank.at + DOOR_CLEAR.across / 2,
    },
    {
      minX: main.at - DOOR_CLEAR.across / 2,
      maxX: Math.min(hx, main.at + DOOR_CLEAR.across / 2),
      minZ: hz - DOOR_CLEAR.into,
      maxZ: hz,
    },
    // The stair's foot: a 1.2 m landing on the plant floor.
    {
      minX: STAIR.minX - 1.2,
      maxX: STAIR.minX,
      minZ: STAIR.minZ,
      maxZ: STAIR.maxZ,
    },
  ];
}

/** What machines may not stand in: the stair itself. (The floor under the landing is the way in from the main plant, kept clear inside its doors.) */
export const solids = (): Footprint[] => [
  { minX: STAIR.minX, maxX: STAIR.maxX, minZ: STAIR.minZ, maxZ: STAIR.maxZ },
];

const item = (
  key: string,
  label: string,
  size: { w: number; d: number; h: number },
  at: { x: number; z: number; facing: Facing },
  mount: PlanItem['mount'] = 'floor',
): PlanItem => ({ key, label, ...size, ...at, mount });

/** A machine's place with its back on `wall`, `along` it. */
const against = (
  wall: Wall,
  along: number,
  size: { w: number; d: number },
  off = OFF_WALL,
) =>
  wall === 'west'
    ? { x: -hx + off + size.d / 2, z: along, facing: 'east' as const }
    : wall === 'east'
      ? { x: hx - off - size.d / 2, z: along, facing: 'west' as const }
      : wall === 'south'
        ? { x: along, z: hz - off - size.d / 2, facing: 'north' as const }
        : { x: along, z: -hz + off + size.d / 2, facing: 'south' as const };

export function olympicPlan(): PlanItem[] {
  const out: PlanItem[] = [];
  // The battery: five filters along the north wall, facing south, from
  // 0.3 m off the west wall, so the line ends clear of the east gantry
  // overhead (the filters stand taller than its deck).
  const f = SIZE.filter;
  for (let i = 0; i < 5; i++)
    out.push(
      item(
        `filter-${i + 1}`,
        `Sand filter ${i + 1}`,
        f,
        against('north', -hx + 0.3 + f.w / 2 + i * (f.w + FILTER_GAP), f),
      ),
    );
  // The pumps against the west wall, just south of the balance tank doors'
  // clear space: the pair's suctions leave its left side (`machinePorts`),
  // so it stands facing south with that side to the wall, each suction a
  // short straight through it into the balance tank hall.
  const p = SIZE.pumps;
  const tank = DOORS.tank;
  out.push(
    item('pumps', 'Circulation pumps, duty and standby', p, {
      // A maintenance gap behind it along the wall, to work its suction valves from.
      x: -hx + OFF_WALL + PUMP_BACK + p.w / 2,
      z: tank.at + DOOR_CLEAR.across / 2 + 0.3 + p.d / 2,
      facing: 'south',
    }),
  );
  // The balance tank's panel on the west wall just north of the tank
  // hall's doors, clear of their clear space, by the battery's walkway
  // (the owner, 2026-10-23): its level, its floats, its make-up and the
  // pumps' START and STOP, worked beside the doors to the tank.
  const tp = SIZE.tankPanel;
  out.push({
    ...item(
      'tankPanel',
      'Balance tank panel',
      tp,
      against('west', tank.at - DOOR_CLEAR.across / 2 - 0.15 - tp.w / 2, tp, 0),
      'wall',
    ),
    y: WALL_HEIGHT.tankPanel,
  });
  // The middle band, south of the battery's walkway: the contact tank, the UV.
  const band = -hz + BATTERY;
  const c = SIZE.contact;
  const cz = band + 0.4 + c.d / 2;
  out.push(
    item('contact', 'Ozone contact tank', c, { x: 4.6, z: cz, facing: 'west' }),
  );
  // The UV unit by the south wall, west of the dosing, so the return main
  // leaving it passes the dosing pumps along the wall, where the chemicals
  // are dosed into it: acid and hypochlorite lines never run over a
  // walkway (the owner, 2026-10-23). Its panel faces north into the
  // room; the outlet doubles back along the wall to the dosing spool.
  const u = SIZE.uv;
  out.push(
    item('uv', 'UV unit', u, {
      x: UV_X,
      z: hz - PLAN_ACCESS - u.d / 2,
      facing: 'north',
    }),
  );
  // On the east wall, south of the battery's walkway: the panel, then the ozone generator.
  const pn = SIZE.panel;
  const pz = band + 0.2 + pn.w / 2;
  out.push(item('panel', 'Local control panel', pn, against('east', pz, pn)));
  const g = SIZE.generator;
  out.push(
    item(
      'generator',
      'Ozone generator',
      g,
      against('east', pz + pn.w / 2 + 0.4 + g.w / 2, g),
    ),
  );
  // The heat exchanger just south of the battery's walkway, between filters 2 and 3, by its side-stream's stubs on the outlet header (the owner, 2026-10-23); its heating comes from the main plant to it.
  const x = SIZE.exchanger;
  const between = -hx + 0.3 + 2 * SIZE.filter.w + 1.5 * FILTER_GAP;
  out.push(
    // On a 0.6 m steel stand (the owner, 2026-10-25): its low connections,
    // and the pipes to them, clear of the floor; its high ones and their
    // valves still within reach.
    {
      ...item('exchanger', 'Heat exchanger', x, {
        x: between,
        z: band + 0.35 + x.d / 2,
        facing: 'north',
      }),
      stand: 0.6,
    },
  );
  // The dosing on the south wall, west of the stair's foot, where the chemicals come in.
  const foot = STAIR.minX - 1.2;
  let at = foot - 0.6;
  // The Dr Aqualis Trio (mission 114; the owner, 2026-10-31), in the old
  // controller's place, which was a metre of wall: a floor cabinet, its
  // middle where the old unit's was, its back 0.05 m off the wall.
  const old = 1.0;
  const trio = SIZE.controller;
  out.push(
    item(
      'controller',
      'Dosing controller, Dr Aqualis Trio',
      trio,
      against('south', at - old / 2, trio, 0.05),
    ),
  );
  at -= old + 0.4;
  for (const [key, label, size] of [
    ['hypo', 'Hypochlorite dosing pumps', SIZE.hypo],
    ['acid', 'Acid dosing pump', SIZE.acid],
  ] as const) {
    out.push({
      ...item(
        key,
        label,
        size,
        against('south', at - size.w / 2, size, 0),
        'wall',
      ),
      y: WALL_HEIGHT[key],
    });
    at -= size.w + 0.4;
  }
  return out;
}

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

/**
 * The room's shell, for the shell's view, walking and doorways
 * (`shell-plan.ts`): the landing and the east gantry its decks, hung from
 * the walls; the stair down the south wall heading west; the pool door
 * east, the main plant's doors south under the landing, the balance tank
 * hall's west; its rails along the decks' open edges.
 */
export function olympicShellPlan(): ShellPlan {
  const large = plantRoomPlan('large');
  const L = LANDING;
  const G = olympicRoomPlan().gantry;
  const S = STAIR;
  return {
    hx,
    hz,
    stepFree: false,
    floor: large.floor,
    roof: large.roof,
    decks: [L, G],
    cantilevered: true,
    rails: [
      // The gantry's open (west) edge, from the north wall to the landing.
      [
        [G.minX, -hz],
        [G.minX, L.minZ],
      ],
      // The landing's open edges: north, from the gantry; west, to the stair's top.
      [
        [L.minX, L.minZ],
        [G.minX, L.minZ],
      ],
      [
        [L.minX, L.minZ],
        [L.minX, S.minZ],
      ],
    ],
    stair: {
      minX: S.minX,
      maxX: S.maxX,
      minZ: S.minZ,
      maxZ: S.maxZ,
      steps: S.steps,
      riser: PLANT_ROOM.storey / S.steps,
      heading: 'west',
      top: S.maxX,
      bottom: S.minX,
      offAt: PLANT_ROOM.stair.offAt,
      openSide: [
        [S.maxX, S.minZ],
        [S.minX, S.minZ],
      ],
    },
    door: { wall: 'east', at: DOORS.pool.at, width: DOORS.pool.width },
    equipment: { wall: 'south', at: DOORS.main.at, width: DOORS.main.width },
    tankDoor: { wall: 'west', at: DOORS.tank.at, width: DOORS.tank.width },
    // On the west wall, seen from the gantry and the floor alike.
    title: { wall: 'west', at: -hz + 3.2, y: 1.8 },
    label: `${OLYMPIC_ROOM.w} × ${OLYMPIC_ROOM.d} m · two storeys`,
    seed: 37,
    lamps: 2,
  };
}

/** The room's box for its machines' layout: kept clear inside its doors and at the stair's foot; the stair solid. */
export function olympicRoomBox() {
  return {
    w: OLYMPIC_ROOM.w,
    d: OLYMPIC_ROOM.d,
    keepClear: keptClear(),
    solid: solids(),
    pipes: {},
    entry: { x: DOORS.main.at, z: hz - 0.6 },
  };
}
