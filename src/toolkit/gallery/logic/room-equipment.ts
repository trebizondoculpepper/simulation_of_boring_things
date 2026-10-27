import { CHEMICALS } from '../../../game/plant/chemicals';
import {
  DAY_TANKS,
  dayTankFootprint,
} from '../../../game/plant/chemical-distribution';
import type { PoolId } from '../../../game/plant/pools';
import { placedPort } from './machine-ports';
import { HEADERS, olympicPlan, olympicRoomBox } from './olympic-plan';
import { olympicItems } from './olympic-plumbing';
import { retiredLayout } from './retired-rooms';
import { placeStacks } from './air-plant';
import type { Footprint } from '../../controls/logic/walk-collision';
import { plantRoomPlan, PLANT_ROOM } from './plant-rooms';
import type { PlantRoomSize } from './plant-rooms';
import { POOL_HALLS } from './pool-halls';
import {
  SHELL_OPENING,
  SHELL_ROOMS,
  shellDoorPlace,
  WET_HALL,
  wetHallRamp,
  wetHallRoom,
  WET_HALL_LAYOUT,
  wetHallPartition,
} from './shell-rooms';
import type { ShellRoomId, ShellWall } from './shell-rooms';
import {
  BOOSTER,
  FLOWMETER,
  METER,
  OUTLET_METER_GAP,
} from '../../components/plant/logic/booster-set';
import { LIGHTING_BOARD, MAIN_SWITCH } from './switch-room';
import { ROOM_SIGNS, SIGN_ITEMS } from './building-signs';
import { loungeRoomBox } from './lounge-plant-plan';

/**
 * Where each room's machines stand: the plant sizing's inventory
 * (`doc/plans/plant-sizing.md`), each machine one of the development
 * rooms' working models, packed against the room's walls (the west wall
 * first, as `doc/plant-model.md` has it), then in islands, clear of the
 * doors' swing, the stair, the ramp and the pipe zones along the walls
 * the pipes come through, each with clear space in front of it to work at
 * it. No pipes, flues or ducts yet: this is the room for them all. Pure:
 * metres, the room's middle at x = z = 0, its floor at y = 0, x east, z
 * south.
 */

export type Side = ShellWall;

/** A machine to place: its model (`key`, `views/room-equipment.ts`), and the space it takes. */
export interface Item {
  key: string;
  label: string;
  /** Its footprint: along its front (w) and front to back (d), and height, metres. */
  w: number;
  d: number;
  h: number;
  /** On the floor, or hung on a wall at `y`, the height of its middle. */
  mount: 'floor' | 'wall';
  y?: number;
  /** On the floor raised on a steel stand this high, metres (`machine-stand.ts`). */
  stand?: number;
  /** Clear space behind it, against its wall, for its pipework and access, metres. */
  back?: number;
  /** The walls it may stand against, in the order to try them. */
  walls?: readonly Side[];
  /** Floor that may be walked over: a lorry's bay, painted. */
  walkable?: boolean;
  /** A pit below the floor (the wet hall's backwash pit), its ports its own. */
  pit?: boolean;
  /** A wall panel that may hang over a machine on the floor, clear of its top. */
  over?: boolean;
  /**
   * A vessel's nozzles: standing square out of its front (the default), or
   * radial, each normal to the shell where it leaves it, pointing at the
   * vessel's axis (the owner, 2026-10-23).
   */
  nozzles?: 'square' | 'radial';
}

export interface Placed {
  item: Item;
  /** The middle of its footprint (floor), or of its back in the wall's face (wall). */
  x: number;
  z: number;
  y: number;
  /** Turned as Three turns an object: 0 faces south (+z). */
  yaw: number;
  footprint: Footprint;
  /** The clear space in front of it, where someone stands to work at it. */
  access: Footprint;
  side: Side | 'island';
}

export interface RoomBox {
  /** Its inside, metres. */
  w: number;
  d: number;
  /** Floor kept clear of machines and their access: doorways, stairs, ramps. */
  keepClear: Footprint[];
  /** Floor no one walks on: under a landing, the stair, the ramp. */
  solid: Footprint[];
  /** The depth of the pipe zone along each wall that has one. */
  pipes: Partial<Record<Side, number>>;
  /** Where someone comes in, on the floor. */
  entry: { x: number; z: number };
}

/** Clear space between machines side by side, and the depth to stand in front of one, metres. */
export const GAP = 0.6;
export const ACCESS = 0.9;
/** Wall panels' gap between each other. */
export const WALL_GAP = 0.3;
/** How far a panel hung over a machine on the floor clears its top, metres. */
export const HUNG_CLEAR = 0.05;
/** The deepest machine a panel may hang over, its controls reached across it, metres. */
export const REACH_OVER = 0.6;

const overlap = (a: Footprint, b: Footprint) =>
  a.minX < b.maxX - 1e-9 &&
  a.maxX > b.minX + 1e-9 &&
  a.minZ < b.maxZ - 1e-9 &&
  a.maxZ > b.minZ + 1e-9;
const grow = (f: Footprint, by: number): Footprint => ({
  minX: f.minX - by,
  maxX: f.maxX + by,
  minZ: f.minZ - by,
  maxZ: f.maxZ + by,
});

/** A machine stood against a wall (or in the open, facing `face`), its footprint and access. */
function stand(
  room: RoomBox,
  item: Item,
  side: Side,
  along: number,
  off = 0,
): Placed {
  const hw = room.w / 2;
  const hd = room.d / 2;
  const back = (room.pipes[side] ?? 0) + (item.back ?? 0) + off;
  const depth = item.mount === 'wall' ? item.d : item.d;
  const a = ACCESS;
  // Out from the wall, along it: each side's frame.
  const make = (
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    ax0: number,
    ax1: number,
    az0: number,
    az1: number,
    x: number,
    z: number,
    yaw: number,
  ): Placed => ({
    item,
    x,
    z,
    y: item.mount === 'wall' ? (item.y ?? 1.5) : 0,
    yaw,
    footprint: { minX: x0, maxX: x1, minZ: z0, maxZ: z1 },
    access: { minX: ax0, maxX: ax1, minZ: az0, maxZ: az1 },
    side,
  });
  const half = item.w / 2;
  // Room to stand in front of it, however narrow it is.
  const reach = Math.max(item.w, 0.8) / 2;
  switch (side) {
    case 'north': {
      const z0 = -hd + back;
      const z1 = z0 + depth;
      return make(
        along - half,
        along + half,
        z0,
        z1,
        along - reach,
        along + reach,
        z1,
        z1 + a,
        along,
        item.mount === 'wall' ? -hd : (z0 + z1) / 2,
        0,
      );
    }
    case 'south': {
      const z1 = hd - back;
      const z0 = z1 - depth;
      return make(
        along - half,
        along + half,
        z0,
        z1,
        along - reach,
        along + reach,
        z0 - a,
        z0,
        along,
        item.mount === 'wall' ? hd : (z0 + z1) / 2,
        Math.PI,
      );
    }
    case 'west': {
      const x0 = -hw + back;
      const x1 = x0 + depth;
      return make(
        x0,
        x1,
        along - half,
        along + half,
        x1,
        x1 + a,
        along - reach,
        along + reach,
        item.mount === 'wall' ? -hw : (x0 + x1) / 2,
        along,
        Math.PI / 2,
      );
    }
    case 'east': {
      const x1 = hw - back;
      const x0 = x1 - depth;
      return make(
        x0,
        x1,
        along - half,
        along + half,
        x0 - a,
        x0,
        along - reach,
        along + reach,
        item.mount === 'wall' ? hw : (x0 + x1) / 2,
        along,
        -Math.PI / 2,
      );
    }
  }
}

/**
 * Pack `items`, in order, into `room`: each floor machine against the
 * first of its walls with room for it, sliding along from the wall's
 * start; failing every wall, out in the open, in rows facing south; then
 * each wall panel on the first of its walls with a clear stretch, nothing
 * on the floor in front of it. Returns what it placed, and what would not
 * fit.
 */
export function packRoom(room: RoomBox, items: readonly Item[]) {
  const placed: Placed[] = [];
  const failed: Item[] = [];
  const hw = room.w / 2;
  const hd = room.d / 2;
  const inside: Footprint = {
    minX: -hw + (room.pipes.west ?? 0),
    maxX: hw - (room.pipes.east ?? 0),
    minZ: -hd + (room.pipes.north ?? 0),
    maxZ: hd - (room.pipes.south ?? 0),
  };
  const within = (f: Footprint, box: Footprint) =>
    f.minX >= box.minX - 1e-9 &&
    f.maxX <= box.maxX + 1e-9 &&
    f.minZ >= box.minZ - 1e-9 &&
    f.maxZ <= box.maxZ + 1e-9;
  const room0: Footprint = { minX: -hw, maxX: hw, minZ: -hd, maxZ: hd };
  const fits = (p: Placed) => {
    const wall = p.item.mount === 'wall';
    if (!within(p.footprint, wall ? room0 : inside)) return false;
    if (!within(p.access, room0)) return false;
    const blocked = [...room.keepClear, ...room.solid];
    if (blocked.some((b) => overlap(b, p.footprint) || overlap(b, p.access)))
      return false;
    for (const q of placed) {
      const qWall = q.item.mount === 'wall';
      if (wall && qWall) {
        // Panels on the same wall keep apart; their access may be shared.
        if (
          q.side === p.side &&
          overlap(grow(q.footprint, WALL_GAP), p.footprint)
        )
          return false;
        continue;
      }
      // A panel hung clear above a machine on the floor (a board over a
      // desk) does not meet it.
      const [hung, stood] = wall ? [p, q] : [q, p];
      if (
        wall !== qWall &&
        hung.item.over &&
        stood.item.d <= REACH_OVER &&
        hung.y - hung.item.h / 2 >= stood.item.h + HUNG_CLEAR - 1e-9
      )
        continue;
      // A walkable bay may be stood in front of, but not built on.
      if (q.item.walkable && !wall) {
        if (overlap(q.footprint, p.footprint)) return false;
        continue;
      }
      if (overlap(grow(q.footprint, wall || qWall ? 0 : GAP), p.footprint))
        return false;
      if (!q.item.walkable && overlap(q.footprint, p.access)) return false;
      if (overlap(q.access, p.footprint)) return false;
    }
    return true;
  };
  const order = (i: Item) =>
    i.walls ?? (['west', 'south', 'north', 'east'] as const);
  const tryWalls = (item: Item) => {
    for (const side of order(item)) {
      const len = side === 'north' || side === 'south' ? room.w : room.d;
      for (
        let s = -len / 2 + item.w / 2;
        s <= len / 2 - item.w / 2 + 1e-9;
        s += 0.1
      ) {
        const p = stand(room, item, side, s);
        if (fits(p)) return p;
      }
    }
    return null;
  };
  const tryIsland = (item: Item) => {
    for (let z = -hd + item.d / 2; z <= hd - item.d / 2; z += 0.25)
      for (let x = -hw + item.w / 2; x <= hw - item.w / 2; x += 0.25)
        for (const yaw of [0, Math.PI]) {
          const f = {
            minX: x - item.w / 2,
            maxX: x + item.w / 2,
            minZ: z - item.d / 2,
            maxZ: z + item.d / 2,
          };
          const access =
            yaw === 0
              ? {
                  minX: f.minX,
                  maxX: f.maxX,
                  minZ: f.maxZ,
                  maxZ: f.maxZ + ACCESS,
                }
              : {
                  minX: f.minX,
                  maxX: f.maxX,
                  minZ: f.minZ - ACCESS,
                  maxZ: f.minZ,
                };
          const p: Placed = {
            item,
            x,
            z,
            y: 0,
            yaw,
            footprint: f,
            access,
            side: 'island',
          };
          if (fits(p)) return p;
        }
    return null;
  };
  const floor = items.filter((i) => i.mount === 'floor');
  const wall = items.filter((i) => i.mount === 'wall');
  for (const item of floor) {
    const p = tryWalls(item) ?? tryIsland(item);
    if (p) placed.push(p);
    else failed.push(item);
  }
  for (const item of wall) {
    const p = tryWalls(item);
    if (p) placed.push(p);
    else failed.push(item);
  }
  return { placed, failed };
}

// ---- The rooms ---------------------------------------------------------

/** A plant room's box: its stair and landing kept out of, the pipe zones north and south. */
export function plantRoomBox(
  size: PlantRoomSize,
  options: { tankHall?: boolean } = {},
): RoomBox {
  const p = plantRoomPlan(size, options);
  const h = p.h;
  const pipes = { north: 0.5, south: 0.5 };
  const doorway = (x: number, z0: number, z1: number, half: number) => ({
    minX: x - half,
    maxX: x + half,
    minZ: Math.min(z0, z1),
    maxZ: Math.max(z0, z1),
  });
  // Inside the equipment doors, their leaves' swing and a trolley's turn.
  const keepClear: Footprint[] = [doorway(p.equipment.x, h, h - 1.6, 1.3)];
  // Inside the balance tank hall's doors, the same (west wall).
  if (p.tankDoor)
    keepClear.push({
      minX: -h,
      maxX: -h + 1.6,
      minZ: p.tankDoor.z - 1.3,
      maxZ: p.tankDoor.z + 1.3,
    });
  const solid: Footprint[] = [];
  if (p.stepFree) keepClear.push(doorway(p.door.x, -h, -h + 1.4, 0.8));
  else {
    // Under the landing, behind its rail; the stair; clear at its foot.
    solid.push({
      minX: p.landing.minX - 0.05,
      maxX: h,
      minZ: -h,
      maxZ: p.landing.maxZ + 0.05,
    });
    solid.push({
      minX: p.stair.minX - 0.05,
      maxX: h,
      minZ: p.stair.top,
      maxZ: p.stair.bottom,
    });
    keepClear.push({
      minX: p.stair.minX - 0.3,
      maxX: h,
      minZ: p.stair.bottom,
      maxZ: p.stair.bottom + 1.2,
    });
  }
  return {
    w: p.side,
    d: p.side,
    keepClear,
    solid,
    pipes,
    entry: { x: p.equipment.x, z: h - 0.6 },
  };
}

/** A shell room's box: clear inside each of its doors. */
export function shellRoomBox(id: ShellRoomId): RoomBox {
  const spec = SHELL_ROOMS[id];
  const keepClear = spec.doors.map((door) => insideDoor(spec, door));
  const first = shellDoorPlace(spec, spec.doors[0]);
  return {
    w: spec.w,
    d: spec.d,
    keepClear,
    solid: [],
    pipes: {},
    entry: {
      x: first.inner.x + first.into[0] * 0.6,
      z: first.inner.z + first.into[1] * 0.6,
    },
  };
}

function insideDoor(
  room: { w: number; d: number },
  door: { wall: Side; at: number },
  depth = 1.6,
): Footprint {
  const p = shellDoorPlace(room, door);
  const half = SHELL_OPENING / 2 + 0.35;
  const x1 = p.inner.x + p.into[0] * depth;
  const z1 = p.inner.z + p.into[1] * depth;
  return p.alongX
    ? {
        minX: p.inner.x - half,
        maxX: p.inner.x + half,
        minZ: Math.min(p.inner.z, z1),
        maxZ: Math.max(p.inner.z, z1),
      }
    : {
        minX: Math.min(p.inner.x, x1),
        maxX: Math.max(p.inner.x, x1),
        minZ: p.inner.z - half,
        maxZ: p.inner.z + half,
      };
}

/** The wet hall's box: its east stair and landing, and the ramp, kept out of, clear at their feet. */
export function wetHallBox(): RoomBox {
  const room = wetHallRoom();
  const R = room.w / 2;
  const L = WET_HALL.landing;
  const S = WET_HALL.stair;
  const run = (S.risers - 1) * S.going;
  const r = wetHallRamp();
  // The east entrance: landing, stair, toward the west.
  const landingX = R - L.depth;
  const stairEnd = landingX - run;
  const solid: Footprint[] = [
    {
      minX: landingX - 0.05,
      maxX: R,
      minZ: -L.width / 2 - 0.05,
      maxZ: L.width / 2 + 0.05,
    },
    {
      minX: stairEnd,
      maxX: landingX,
      minZ: -S.width / 2 - 0.05,
      maxZ: S.width / 2 + 0.05,
    },
    // The make-up bay's partition (prompt 036).
    ...wetHallPartition(),
    // The ramp, its landings and flights.
    { minX: -R, maxX: r.first.maxX + 0.05, minZ: -R, maxZ: R },
    {
      minX: r.second.minX,
      maxX: r.second.maxX + 0.05,
      minZ: r.second.z1 + 1.5,
      maxZ: R,
    },
  ];
  const keepClear: Footprint[] = [
    // At the stair's foot, and the ramp's, room to step and to turn a trolley.
    {
      minX: stairEnd - 1.5,
      maxX: stairEnd,
      minZ: -S.width / 2 - 0.3,
      maxZ: S.width / 2 + 0.3,
    },
    {
      minX: r.second.minX,
      maxX: r.second.maxX + 1.2,
      minZ: r.second.z1 - 2,
      maxZ: r.second.z1 + 1.5,
    },
  ];
  return {
    w: room.w,
    d: room.d,
    keepClear,
    solid,
    pipes: {},
    entry: { x: (r.second.minX + r.second.maxX) / 2, z: r.second.z1 - 1 },
  };
}

// ---- What goes in each ---------------------------------------------------

/** A sand filter's model's footprint, by its diameter (`createSandFilter`). */
export const filterSize = (dia: number) => ({
  w: dia + 0.6,
  d: dia + 0.8,
  h: Math.round((dia * 0.8 + 1.15) * 100) / 100,
});
/** A GRP sectional tank's footprint, by its panels (`createTank`). */
export const sectionalSize = (nx: number, nz: number, ny: number) => ({
  w: nx + 0.1,
  // Its caged ladder up its face (`TANK_LADDER`), if taller than a reach.
  d: nz + 0.2 + (ny >= 2 ? 0.7 : 0),
  h: ny + 0.35,
});

const size = (s: { w: number; d: number; h: number }) =>
  [s.w, s.d, s.h] as const;
const floor = (
  key: string,
  label: string,
  w: number,
  d: number,
  h: number,
  more: Partial<Item> = {},
): Item => ({ key, label, w, d, h, mount: 'floor', back: 0.6, ...more });
const wall = (
  key: string,
  label: string,
  w: number,
  d: number,
  h: number,
  y: number,
  more: Partial<Item> = {},
): Item => ({ key, label, w, d, h, y, mount: 'wall', ...more });

/** A pool plant room's machines: its own circuit, in the order the water goes. */
function poolPlant(
  room: string,
  name: string,
  tank: { nx: number; nz: number; ny: number },
  filters: { count: number; dia: number },
  contact: number,
): Item[] {
  const f = filterSize(filters.dia);
  const t = sectionalSize(tank.nx, tank.nz, tank.ny);
  const contactSide = Math.max(2, contact);
  return [
    floor(
      `balance-tank:${tank.nx}x${tank.nz}x${tank.ny}`,
      `${name} balance tank`,
      t.w,
      t.d,
      t.h,
    ),
    floor(
      'pump-pair',
      `${name} circulation pumps, duty and standby, with strainers`,
      3.2,
      2.4,
      1.9,
    ),
    ...Array.from({ length: filters.count }, (_, i) =>
      floor(
        `sand-filter:${filters.dia}`,
        `${name} sand filter ${i + 1}`,
        f.w,
        f.d,
        f.h,
        { nozzles: 'radial' },
      ),
    ),
    floor('uv-unit', `${name} UV unit`, 1.7, 1.6, 1.7),
    // Its local control panel: the circulation's controls and its mimic,
    // fed from the central switchboard through the south wall.
    floor('pump-panel', `${name} local control panel`, 2.7, 0.6, 2.45, {
      walls: ['south', 'west', 'east'],
    }),
    floor('heat-exchanger', `${name} plate heat exchanger`, 1.5, 0.7, 1.2),
    // Its room's ozone detection is on it (`ozone-generator:<room>`).
    floor(`ozone-generator:${room}`, `${name} ozone generator`, 1.6, 0.5, 1.95),
    floor(
      'contact-tank',
      `${name} ozone contact tank`,
      contactSide,
      contactSide,
      3.05,
    ),
    // Its dosing on the east wall, by the stair, clear of the pipe zones.
    wall(
      'dosing-controller',
      `${name} dosing controller and sample cells`,
      1,
      0.25,
      1.4,
      1.35,
      { walls: ['east', 'west'] },
    ),
    wall('hypo-pumps', `${name} hypochlorite dosing pumps`, 1.2, 0.3, 1, 1.3, {
      walls: ['east', 'west'],
    }),
    wall('acid-pump', `${name} acid dosing pump`, 0.7, 0.35, 0.8, 1.3, {
      walls: ['east', 'west'],
    }),
  ];
}

// ---- The chemical distribution (plan 085) -----------------------------------

/** A store's framed bulk tank, its transfer pump, a selector: w, d, h, metres. */
const BULK_TANK = [2.7, 1.65, 2.6] as const;
const TRANSFER_PUMP = [2.2, 1.0, 1.6] as const;
const SELECTOR = [3.1, 0.8, 2.0] as const;

/** A plant room's day tanks, one per chemical it doses, each in its bund. */
function chemDays(pool: PoolId): Item[] {
  return CHEMICALS.flatMap((c) => {
    const i = DAY_TANKS[c].findIndex((t) => t.site === pool);
    if (i < 0) return [];
    const fp = dayTankFootprint(DAY_TANKS[c][i].litres);
    return [
      floor(
        `chem-day:${c}:${pool}`,
        `${c === 'acid' ? 'Acid' : 'Hypochlorite'} day tank`,
        fp.w,
        fp.d,
        fp.h,
        { back: 0 },
      ),
    ];
  });
}

type At = { x: number; z: number; face: Side } | { wall: Side; along: number };
/**
 * Where each room's chemical machines stand (plan 085): each plant room's
 * day tanks in floor its machines leave free, acid and hypochlorite apart;
 * the wet hall's selectors on its dirty side, east of the backwash pit.
 */
const CHEM_AT: Record<string, Record<string, At>> = {
  plant_pool_01: {
    'chem-day:hypochlorite:pool_01': { x: 3.65, z: -2.95, face: 'south' },
    'chem-day:acid:pool_01': { x: 2.35, z: 2.65, face: 'east' },
  },
  plant_pool_02: {
    'chem-day:hypochlorite:pool_02': { x: -7.5, z: 5.9, face: 'north' },
    'chem-day:acid:pool_02': { x: 6.9, z: 4.2, face: 'north' },
  },
  plant_pool_03: {
    'chem-day:hypochlorite:pool_03': { x: 1.2, z: -1.7, face: 'west' },
    'chem-day:acid:pool_03': { x: 1.9, z: 1.2, face: 'west' },
  },
  plant_pool_04: {
    'chem-day:hypochlorite:pool_04': { x: 0.95, z: -0.6, face: 'east' },
    'chem-day:acid:pool_04': { x: 1.95, z: 1.75, face: 'north' },
  },
  wet_hall: {
    // In the south-east corner, clear of the hall's fire point on the east
    // wall (z 2.6), its sewer monitor and the pit's davit.
    'chem-selector:hypochlorite': { x: 7.4, z: 9.35, face: 'north' },
    'chem-selector:acid': { x: 9.35, z: 7.4, face: 'west' },
    'chem-panel': { wall: 'south', along: 4.8 },
  },
};

/** The chemical machines of a hand-laid room, placed. */
function chemPlaced(
  room: string,
  box: RoomBox,
  items: readonly Item[],
): Placed[] {
  const at = CHEM_AT[room];
  if (!at) return [];
  return items.flatMap((item) =>
    at[item.key] ? [put(box, item, at[item.key])] : [],
  );
}

/** Each room's machines, and its box. */
export function roomEquipment(
  room: string,
): { box: RoomBox; items: Item[] } | null {
  const plant = (hall: keyof typeof POOL_HALLS) =>
    plantRoomBox(POOL_HALLS[hall].plantDoor!.size);
  switch (room) {
    case 'plant_pool_01':
      // Lounge: 11.1 m³ tank, 2 × 1.2 m filters (the sizing's plant).
      return {
        box: loungeRoomBox(),
        items: [
          ...poolPlant(
            'plant_pool_01',
            'Lounge pool',
            { nx: 3, nz: 2, ny: 2 },
            { count: 2, dia: 1.2 },
            0.96,
          ),
          ...chemDays('pool_01'),
        ],
      };
    case 'plant_pool_02':
      // Olympic: cleared for its redo (the owner, 2026-10-23,
      // `doc/prompts/done/033-olympic-plant-redo.md`): an empty large hall, its
      // balance tank now in a hall of its own through its west doors. The
      // room as it was is kept as `retired0`.
      // Laid out by the owner's plan (`olympic-plan.ts`), plumbed by the
      // pipeline (`olympic-plumbing.ts`): 22 × 14 m.
      return {
        box: olympicRoomBox(),
        items: [...olympicItems(), ...chemDays('pool_02')],
      };
    case 'plant_pool_03':
      return {
        // In front of its mimic board, in the middle of the north wall. Its
        // cabinet stands 0.9 m off its wall (the owner, 2026-10-23): the
        // services' lanes behind it, and room to work its back stubs' valves.
        box: (() => {
          const b = plant('pool_03');
          b.keepClear.push({
            // The 1.2 m mimic's working width; the music rack now sits to its left.
            minX: -0.7,
            maxX: 0.7,
            minZ: -b.d / 2,
            maxZ: -b.d / 2 + 1.5,
          });
          return b;
        })(),
        items: [
          floor('jacuzzi-pack', 'Packaged Jacuzzi plant cabinet', 3.2, 3, 2.2, {
            back: 0.9,
          }),
          // Its sand filter, outside its cabinet beside it (the owner,
          // 2026-10-25): Ø0.6 m (`SPA_FILTERS`).
          floor(
            'sand-filter:spa-jacuzzi',
            'Jacuzzi sand filter',
            0.8,
            0.8,
            1.75,
          ),
          ...chemDays('pool_03'),
        ],
      };
    case 'plant_pool_04':
      return {
        // In front of its valve panel on the east wall (`cabinetValvePanel`).
        box: (() => {
          const b = plant('pool_04');
          b.keepClear.push({
            minX: b.w / 2 - 1,
            maxX: b.w / 2,
            minZ: 0,
            maxZ: 1,
          });
          return b;
        })(),
        items: [
          // 0.9 m off its wall (the owner, 2026-10-23): room behind it to
          // work the valves on its back stubs. Of every place along the
          // room's walls that keeps the doors clear, this is where its
          // services cost least (`cabinetPipes`'s trial placings).
          floor('spa-pack', 'Packaged spa set, footbath', 2.1, 1.9, 2.2, {
            back: 0.9,
          }),
          // Its sand filter, outside its cabinet beside it: Ø0.5 m.
          floor(
            'sand-filter:spa-footSpa',
            'Footbath sand filter',
            0.8,
            0.8,
            1.5,
          ),
          ...chemDays('pool_04'),
        ],
      };
    case 'wet_hall':
      return {
        box: wetHallBox(),
        items: [
          // Its Category 5 break tank, the sizing's 13.2 m³ (3 × 3).
          floor(
            'break-tank',
            'Make-up break tank (Category 5)',
            ...size(sectionalSize(3, 3, 2)),
          ),
          floor(
            'booster-set',
            'Make-up booster set, duty and standby',
            BOOSTER.w,
            BOOSTER.d,
            BOOSTER.h,
          ),
          floor(
            'water-meter',
            'Make-up water meter',
            2 * METER.half + 0.1,
            0.4,
            0.6,
          ),
          // The backwash pit (prompt 036): below the floor, its opening
          // covered by gratings and railed round, not walked on (the
          // owner, 2026-10-26); its footprint its walls, its rail, its
          // pump panel on the east and its pumps' davit on the south.
          floor(
            'backwash-tank',
            'Backwash holding tank',
            WET_HALL_LAYOUT.pit.maxX -
              WET_HALL_LAYOUT.pit.minX +
              2 * (WET_HALL_LAYOUT.pitWall + 0.2) +
              2 * WET_HALL_LAYOUT.pitDavitShift,
            // And its pumps' davit on its south side (the owner,
            // 2026-10-26), centred: as far again on the north.
            WET_HALL_LAYOUT.pit.maxZ -
              WET_HALL_LAYOUT.pit.minZ +
              2 * (WET_HALL_LAYOUT.pitWall + 0.2 + 0.35),
            1.8,
            { back: 0, pit: true },
          ),
          wall('mimic-wet', 'Mimic: wet hall', 2.2, 0.08, 1.2, 1.6),
          // Our own flowmeter, straight after the utility's meter.
          floor(
            'make-up-flowmeter',
            'Make-up flowmeter',
            2 * FLOWMETER.half + 0.1,
            0.4,
            0.6,
          ),
          // The make-up water's recorder, its pen plotting the water used.
          wall(
            'make-up-recorder',
            'Make-up water recorder',
            0.6,
            0.12,
            0.8,
            1.5,
          ),
          // The sewer outfall's monitor and its chart recorder.
          wall('sewer-monitor', 'Sewer outfall monitor', 0.6, 0.12, 0.8, 1.5),
          // The chemical distribution's two transfer selectors on the dirty
          // side, well apart (plan 085).
          floor(
            'chem-selector:hypochlorite',
            'Hypochlorite transfer selector',
            ...SELECTOR,
          ),
          floor('chem-selector:acid', 'Acid transfer selector', ...SELECTOR),
          // And its panel, between them and the pit (plan 085).
          wall(
            'chem-panel',
            'Chemical distribution panel',
            1.6,
            0.22,
            1.1,
            1.5,
          ),
        ],
      };
    case 'boiler_house':
      return {
        box: shellRoomBox('boiler_house'),
        items: [
          // Six boilers in three cascades: five the sizing's, one more.
          ...[1, 2, 3].map((i) =>
            floor(
              `boiler-cascade:${i}`,
              `Condensing boilers, cascade ${i}`,
              3,
              1,
              3.2,
              { walls: ['west', 'east'] },
            ),
          ),
          floor('low-loss-header', 'Low-loss header', 1, 0.5, 1.7),
          floor('lthw-pumps', 'Twin-head LTHW circulator', 1.6, 0.8, 1.3),
          floor(
            'pressurisation',
            'Pressurisation unit and expansion vessel',
            1.4,
            0.7,
            1.6,
          ),
          floor('calorifier', 'Hot-water calorifier', 1.7, 1.2, 2.3),
          floor('gas-train', 'Gas train', 2.2, 0.6, 1.7, { back: 0.3 }),
          wall('dosing-pot', 'Dosing pot', 0.7, 0.3, 1.2, 1.2),
          wall(
            'gas-safety',
            'Gas detection and emergency stop',
            1.4,
            0.15,
            1.8,
            1.6,
          ),
          wall('mimic-gas', 'Mimic: boiler house gas', 1.9, 0.08, 1.1, 1.7),
          wall(
            'mimic-boiler-heat',
            'Mimic: boiler status and heat output',
            2.5,
            0.08,
            1.9,
            1.85,
          ),
          // On the east wall to the right of the boiler mimic (the owner's
          // place for it), so the boiler house's instruments read as one.
          wall(
            'combustion-panel',
            'Combustion and ventilation panel',
            1,
            0.25,
            0.75,
            1.5,
            { walls: ['east'] },
          ),
        ],
      };
    case 'hypo_store':
      return {
        box: shellRoomBox('hypo_store'),
        items: [
          // Framed 4,000 l tanks (plan 085), and the transfer pump that
          // sends their hypochlorite to the plant rooms' day tanks.
          ...[1, 2, 3].map((i) =>
            floor(
              `chem-bulk:hypochlorite:${i}`,
              `Sodium hypochlorite bulk tank ${i}`,
              ...BULK_TANK,
              { back: 0.2 },
            ),
          ),
          floor(
            'chem-pump:hypochlorite',
            'Hypochlorite transfer pump',
            ...TRANSFER_PUMP,
          ),
          floor('safety-shower', 'Safety shower and eyewash', 1.25, 1.4, 2.3, {
            back: 0,
          }),
          floor('spill-kit', 'Chemical spill kit', 0.65, 0.75, 1, { back: 0 }),
          wall('ppe-cabinet', 'PPE cabinet', 0.6, 0.35, 1.25, 1.3),
          wall(
            `store-extract:${room}`,
            'Extract and chlorine detection',
            1,
            0.3,
            2.2,
            1.25,
          ),
          wall('store-signs', 'Store signs', 1.6, 0.05, 1, 1.5),
        ],
      };
    case 'acid_store':
      return {
        box: shellRoomBox('acid_store'),
        items: [
          // One framed 4,000 l tank of 10% hydrochloric acid (plan 085), in
          // place of the IBC, and its transfer pump.
          floor(
            'chem-bulk:acid:1',
            'Hydrochloric acid bulk tank',
            ...BULK_TANK,
            { back: 0.2 },
          ),
          floor('chem-pump:acid', 'Acid transfer pump', ...TRANSFER_PUMP),
          floor('safety-shower', 'Safety shower and eyewash', 1.25, 1.4, 2.3, {
            back: 0,
          }),
          floor('spill-kit', 'Chemical spill kit', 0.65, 0.75, 1, { back: 0 }),
          wall('ppe-cabinet', 'PPE cabinet', 0.6, 0.35, 1.25, 1.3),
          wall(
            `store-extract:${room}`,
            'Extract and chlorine detection',
            1,
            0.3,
            2.2,
            1.25,
          ),
          wall('store-signs', 'Store signs', 1.6, 0.05, 1, 1.5),
        ],
      };
    case 'loading_bay':
      return {
        box: shellRoomBox('loading_bay'),
        items: [
          // Each store's fill cabinet on the wall of its own store.
          wall(
            'fill-cabinet',
            'Delivery fill cabinet: hypochlorite',
            1,
            1.05,
            1.7,
            1.2,
            { walls: ['east'] },
          ),
          wall(
            'fill-cabinet',
            'Delivery fill cabinet: acid',
            1,
            1.05,
            1.7,
            1.2,
            { walls: ['west'] },
          ),
        ],
      };
    case 'switch_room':
      return {
        box: shellRoomBox('switch_room'),
        items: [
          // A metre and more clear in front of each board (BS 7671).
          // Flush to their walls, their heavy trunking up and into them.
          floor('lv-switchboard', 'LV main switchboard', 2.62, 0.66, 2, {
            back: 0,
            walls: ['west', 'east'],
          }),
          // The whole site's supply, where it is found first.
          floor(
            'main-switch',
            'Main incoming switch',
            MAIN_SWITCH.w,
            MAIN_SWITCH.d,
            MAIN_SWITCH.h,
            { back: 0, walls: ['east'] },
          ),
          floor(
            'central-battery',
            'Emergency lighting central battery',
            0.62,
            0.5,
            1.8,
            { back: 0 },
          ),
          // The lighting board, DB-L1: a way for each lighting zone.
          wall(
            'lighting-board',
            'Lighting distribution board DB-L1',
            LIGHTING_BOARD.w,
            LIGHTING_BOARD.d,
            LIGHTING_BOARD.h,
            1.5,
            // Clear of the room's feeder isolator on the west wall and its
            // title card on the north.
            { walls: ['east'] },
          ),
          wall(
            'generator-point',
            'Generator connection point',
            0.62,
            0.4,
            0.77,
            1.3,
          ),
          wall(
            'earthing-terminal',
            'Main earthing terminal',
            0.76,
            0.1,
            0.6,
            1.2,
          ),
        ],
      };
    case 'air_plant':
      return {
        box: shellRoomBox('air_plant'),
        items: [
          // The halls' air handling units, stacked (`air-plant.ts`).
          ...placeStacks(shellRoomBox('air_plant')).map((p) => p.item),
          // Their mimic and control panel, on the floor's level, by the door.
          wall('mimic-air', 'Mimic: air handling plant', 2.3, 0.08, 1.3, 1.6),
        ],
      };
    case 'control_room':
      return {
        box: shellRoomBox('control_room'),
        items: [
          // Its chair and keyboard come 0.4 m past the desk's declared depth.
          floor('operator-desk', "Operator's desk, POOLMON", 1.3, 1.9, 1.4, {
            back: 0.3,
          }),
          floor('alarm-printer', 'Alarm printer', 0.7, 1.5, 1.3, { back: 0.1 }),
          floor('water-test-kit', 'Water-test kit', 0.8, 0.5, 1.1, {
            back: 0.1,
          }),
          wall('mimic-pool', 'Mimic: main pool circuit', 2.5, 0.08, 1.3, 1.7, {
            walls: ['north', 'west', 'east'],
          }),
          wall('mimic-heating', 'Mimic: heating', 2.1, 0.08, 1.2, 1.7, {
            walls: ['north', 'west', 'east'],
          }),
          // Its board is 2.2 m (`air-mimic.ts`), its frame round it, and
          // 5 cm more clear of the corner.
          wall('mimic-air', 'Mimic: air handling', 2.4, 0.08, 1.3, 1.7, {
            walls: ['north', 'west', 'east'],
          }),
          // On the west wall toward the operator's desk, in view of it,
          // over the water-test kit, across which its ACCEPT and RESET are
          // in reach (not over the desk, 1.9 m deep, out of reach).
          wall('annunciator', 'Alarm annunciator', 0.9, 0.2, 1.1, 1.75, {
            walls: ['west'],
            over: true,
          }),
          wall('chart-recorders', 'Chart recorders', 1.3, 0.2, 0.6, 1.5),
          wall('readout-board', 'Readout board', 1.3, 0.12, 0.55, 1.5),
          wall('bms-outstation', 'BMS outstation', 0.62, 0.75, 0.78, 1.4),
          wall('fire-repeater', 'Fire alarm repeater', 0.34, 0.1, 0.26, 1.5, {
            walls: ['east'],
          }),
          wall('cctv', 'CCTV monitor', 0.4, 0.42, 0.45, 1.8),
        ],
      };
    case 'engineers_office':
      return {
        box: shellRoomBox('engineers_office'),
        items: [
          floor('desk', 'Engineer’s desk', 1.6, 0.8, 0.75, { back: 0 }),
          floor(
            'storage-cupboard:solid',
            'Parts stores cupboard',
            0.96,
            0.5,
            1.98,
            { back: 0 },
          ),
          floor(
            'storage-cupboard:glass',
            'Test equipment cupboard',
            0.96,
            0.5,
            1.98,
            { back: 0 },
          ),
          // The Encabulator's Hyperplasc Scenario Simulator: a 42U rack,
          // its door and handle a little proud of its front; and room on
          // its hinge side (its left, from in front) for its open door's
          // pull, so the door swings clear of any wall.
          floor(
            'scenario-simulator',
            'Hyperplasc Scenario Simulator',
            SIMULATOR_SPACE,
            0.9,
            2.05,
            { back: 0 },
          ),
        ],
      };
  }
  return null;
}

/**
 * The scenario simulator's width on the floor: its 0.64 m cabinet, and
 * 0.1 m on its hinge side for its door, stopping square, and its pull.
 */
export const SIMULATOR_SPACE = 0.74;

/** The rooms that have machines placed. */
export const EQUIPPED_ROOMS = [
  'plant_pool_01',
  'plant_pool_02',
  'plant_pool_03',
  'plant_pool_04',
  'wet_hall',
  'boiler_house',
  'hypo_store',
  'acid_store',
  'loading_bay',
  'switch_room',
  'air_plant',
  'control_room',
  'engineers_office',
] as const;

/** A room's machines, placed. */
/** Where every equipped room's feeder isolator hangs, on its west wall, m. */
export const FEEDER_ISOLATOR = { fromSouth: 1.1, y: 1.5 } as const;

/** The wall space the feeder isolator takes, kept clear of other things. */
export function feederIsolatorSpace(box: RoomBox): Footprint {
  const z = box.d / 2 - FEEDER_ISOLATOR.fromSouth;
  return {
    minX: -box.w / 2,
    maxX: -box.w / 2 + 0.25,
    minZ: z - 0.2,
    maxZ: z + 0.2,
  };
}

/** A room's machines, placed: a retired room's frozen layout (`retired-rooms.ts`), or its own, laid out now. */
export function layoutRoom(room: string) {
  return retiredLayout(room) ?? layoutRoomLive(room);
}

/** A room's machines, placed by its generator. */
export function layoutRoomLive(room: string) {
  const found = roomEquipment(room);
  if (!found) return null;
  // Its notices and signs, laid out with its machines (`building-signs.ts`).
  const r = {
    ...found,
    // The room's feeder isolator is on its west wall by the entrance
    // (`views/room-services.ts`, `FEEDER_ISOLATOR`): nothing goes there.
    box: {
      ...found.box,
      keepClear: [...found.box.keepClear, feederIsolatorSpace(found.box)],
    },
    items: [
      ...found.items,
      ...(ROOM_SIGNS[room] ?? []).map((id) => {
        const s = SIGN_ITEMS[id];
        // By preference on the wall with the room's way in, where everyone
        // passes; else the next wall round.
        const door = (
          SHELL_ROOMS as Record<string, { doors?: readonly { wall: Side }[] }>
        )[room]?.doors?.[0]?.wall;
        // Never on the wall facing the door, which has the room's title card.
        const opposite: Record<Side, Side> = {
          north: 'south',
          south: 'north',
          east: 'west',
          west: 'east',
        };
        const sides: readonly Side[] = ['west', 'south', 'north', 'east'];
        return wall(`sign:${id}`, s.label, s.w, 0.03, s.h, s.y, {
          walls: door
            ? [door, ...sides.filter((x) => x !== door && x !== opposite[door])]
            : sides,
        });
      }),
    ],
  };
  const fixed = FIXED[room]?.(r.box, r.items).concat(
    chemPlaced(room, r.box, r.items),
  );
  return {
    ...r,
    ...(fixed ? { placed: fixed, failed: [] } : packRoom(r.box, r.items)),
  };
}

/**
 * A machine set down by hand: the middle of its footprint, which way its
 * front faces; a wall panel by the wall it hangs on and its middle along
 * it. Pure.
 */
export function put(
  box: RoomBox,
  item: Item,
  at: { x: number; z: number; face: Side } | { wall: Side; along: number },
): Placed {
  if ('wall' in at)
    return stand(box, item, at.wall, at.along, -(box.pipes[at.wall] ?? 0));
  const { x, z, face } = at;
  const across = face === 'east' || face === 'west';
  const hw = (across ? item.d : item.w) / 2;
  const hd = (across ? item.w : item.d) / 2;
  const footprint = { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd };
  const reach = Math.max(item.w, 0.8) / 2;
  const access =
    face === 'south'
      ? {
          minX: x - reach,
          maxX: x + reach,
          minZ: footprint.maxZ,
          maxZ: footprint.maxZ + ACCESS,
        }
      : face === 'north'
        ? {
            minX: x - reach,
            maxX: x + reach,
            minZ: footprint.minZ - ACCESS,
            maxZ: footprint.minZ,
          }
        : face === 'east'
          ? {
              minX: footprint.maxX,
              maxX: footprint.maxX + ACCESS,
              minZ: z - reach,
              maxZ: z + reach,
            }
          : {
              minX: footprint.minX - ACCESS,
              maxX: footprint.minX,
              minZ: z - reach,
              maxZ: z + reach,
            };
  const yaw = {
    south: 0,
    north: Math.PI,
    east: Math.PI / 2,
    west: -Math.PI / 2,
  }[face];
  return { item, x, z, y: 0, yaw, footprint, access, side: 'island' };
}

/** Clear walkway left all round a sectional tank, for its flanges' bolts, metres. */
export const TANK_SURROUND = 0.8;

/**
 * The rooms laid out by hand, where the order of the water decides more
 * than packing does.
 *
 * (The Olympic pool's plant room was laid out here by hand until its redo,
 * 2026-10-23; that room is kept as `retired0`.)
 */
const FIXED: Record<string, (box: RoomBox, items: Item[]) => Placed[]> = {
  engineers_office: (box, items) => {
    const at = (key: string) => items.find((item) => item.key === key)!;
    const onWall = (
      item: Item,
      x: number,
      z: number,
      face: Side,
      side: Side,
    ) => ({
      ...put(box, item, { x, z, face }),
      side,
    });
    return [
      // Keep the desk and simulator exactly where the original packed
      // office placed them; the two cupboards occupy the old filing bay.
      onWall(at('desk'), -1.6, -2.2, 'east', 'west'),
      onWall(at('storage-cupboard:solid'), -1.75, -0.32, 'east', 'west'),
      onWall(at('storage-cupboard:glass'), -1.75, 0.72, 'east', 'west'),
      onWall(at('scenario-simulator'), 1.55, -2.53, 'west', 'east'),
    ];
  },
  // The boiler house (the owner, 2026-10-24: re-planned): the cascades
  // along the west wall, the low-loss header at their south end, the twin
  // circulator east of the door; the calorifier and the pressurisation
  // unit, which the search had put in the far corners, brought together
  // in the south-east by the circulator, so the heating's flow and
  // return run short and in order;
  // the gas train where the gas comes in, the north-east; the panels on
  // the east wall in the owner's order.
  boiler_house: (box, items) => {
    const at = (key: string) => items.find((i) => i.key === key)!;
    const onWall = (p: Placed, side: Side): Placed => ({ ...p, side });
    return [
      // Those standing against a wall are fed down it (`room-services.ts`).
      ...[1, 2, 3].map((n, i) =>
        onWall(
          put(box, at(`boiler-cascade:${n}`), {
            x: -2.9,
            z: -4.75 + i * 3.6,
            face: 'east',
          }),
          'west',
        ),
      ),
      onWall(
        put(box, at('low-loss-header'), { x: -3.15, z: 5.05, face: 'east' }),
        'west',
      ),
      onWall(
        put(box, at('lthw-pumps'), { x: 2.2, z: 5.25, face: 'north' }),
        'south',
      ),
      // The calorifier's coil on its east side, toward the circulator;
      // the pressurisation unit just north of it, its fill to the return.
      put(box, at('calorifier'), { x: 1.4, z: 2.0, face: 'south' }),
      put(box, at('pressurisation'), { x: 1.4, z: 0.0, face: 'north' }),
      onWall(
        put(box, at('gas-train'), { x: 3.4, z: -5.15, face: 'west' }),
        'east',
      ),
      put(box, at('dosing-pot'), { wall: 'south', along: -2.45 }),
      put(box, at('gas-safety'), { wall: 'east', along: -3.35 }),
      put(box, at('mimic-gas'), { wall: 'east', along: -1.4 }),
      put(box, at('mimic-boiler-heat'), { wall: 'east', along: 1.1 }),
      put(box, at('combustion-panel'), { wall: 'east', along: 3.15 }),
    ];
  },
  // The switch room (043, 2026-10-24: only what works): where the search
  // had each before its motor control centre, rotary isolators and spare
  // distribution board went, so nothing else moved: the switchboard on
  // the west wall, the main switch on the east, a door's width north of
  // the lighting board; their panels and its poster where they were.
  switch_room: (box, items) => {
    const at = (key: string) => items.find((i) => i.key === key)!;
    const onWall = (p: Placed, side: Side): Placed => ({ ...p, side });
    return [
      onWall(
        put(box, at('lv-switchboard'), { x: -2.17, z: -2.69, face: 'east' }),
        'west',
      ),
      onWall(
        put(box, at('main-switch'), { x: 2.275, z: -1.12, face: 'west' }),
        'east',
      ),
      onWall(
        put(box, at('central-battery'), { x: -2.25, z: -0.39, face: 'east' }),
        'west',
      ),
      put(box, at('lighting-board'), { wall: 'east', along: -0.34 }),
      put(box, at('generator-point'), { wall: 'south', along: -1.79 }),
      put(box, at('earthing-terminal'), { wall: 'west', along: 3.58 }),
      put(box, at('sign:shock-poster'), { wall: 'south', along: 1.75 }),
    ];
  },
  // The Olympic's: where its plan stands each machine (`olympic-plan.ts`).
  plant_pool_02: (box, items) =>
    olympicPlan().flatMap((p, i) => {
      const item = items[i];
      if (!item) return [];
      if (p.mount === 'wall')
        return [
          // Its back on the wall it faces away from, along that wall.
          put(box, item, {
            wall: (
              {
                north: 'south',
                south: 'north',
                east: 'west',
                west: 'east',
              } as const
            )[p.facing],
            along: p.facing === 'east' || p.facing === 'west' ? p.z : p.x,
          }),
        ];
      const placed = {
        ...put(box, item, { x: p.x, z: p.z, face: p.facing }),
        // On its stand, if it has one.
        y: p.stand ?? 0,
      };
      // A filter is worked from the battery's walkway, beyond its headers.
      return [
        p.key.startsWith('filter')
          ? {
              ...placed,
              access: {
                ...placed.access,
                minZ: placed.access.minZ + HEADERS,
                maxZ: placed.access.maxZ + HEADERS,
              },
            }
          : placed,
      ];
    }),
  // The wet hall: along its north wall, west to east, in the order the
  // water goes: the break tank, the booster set, the meter; the mimic;
  // then the backwash tank. Each faces the room, its back to the wall.
  // The wet hall as the owner's plan lays it out (prompt 036,
  // `WET_HALL_LAYOUT`): the make-up bay's machines in a row across it,
  // facing the aisle; the backwash pit in its opening to the south; the
  // clean side's mimic on the bay's north wall, the outfall's monitor on
  // the dirty side's east wall.
  wet_hall: (box, items) => {
    const at = (key: string) => items.find((i) => i.key === key)!;
    const L = WET_HALL_LAYOUT;
    return [
      // The make-up line west to east (the owner, 2026-10-26): the town
      // main in at the bay's west end, the utility's meter and our own
      // flowmeter in line, then the break tank they fill, then the booster
      // set drawing from it, its discharge rising at the bay's east end
      // to the make-up main out (`WET_HALL_LAYOUT`).
      put(box, at('water-meter'), {
        x: -4.25 + L.lineShift,
        z: -6.3,
        face: 'south',
      }),
      put(box, at('make-up-flowmeter'), {
        x: -4.25 + L.lineShift + METER.half + 0.3 + FLOWMETER.half,
        z: -6.3,
        face: 'south',
      }),
      put(box, at('break-tank'), {
        x: -1.1 + L.lineShift + L.tankShift,
        z: -6.3,
        face: 'south',
      }),
      // The booster set with its suction in line with the tank's outlet,
      // a flowmeter's room between them, planned (`OUTLET_METER_GAP`).
      put(box, at('booster-set'), {
        x:
          breakTankOutlet(box, at('break-tank'), L).x +
          OUTLET_METER_GAP +
          BOOSTER.w / 2,
        z: breakTankOutlet(box, at('break-tank'), L).z - BOOSTER.suctionZ,
        face: 'south',
      }),
      // The clean side's mimic on the bay's north wall, the make-up
      // recorder beside it, over the booster set.
      put(box, at('mimic-wet'), { wall: 'north', along: 6.9 }),
      put(box, at('make-up-recorder'), { wall: 'north', along: 4.2 }),
      // Its middle over the opening's, its davit's 0.4 m to the east.
      put(box, at('backwash-tank'), {
        x: (L.pit.minX + L.pit.maxX) / 2 + L.pitDavitShift,
        z: (L.pit.minZ + L.pit.maxZ) / 2,
        face: 'south',
      }),
      put(box, at('sewer-monitor'), { wall: 'east', along: 5.5 }),
    ];
  },
  // The air plant: its stacks where `air-plant.ts` stands them, under
  // their gantries; the mimic on the south wall, west of the doorway.
  air_plant: (box, items) => [
    ...placeStacks(box).map(({ item, at }) =>
      put(
        box,
        items.find((i) => i.key === item.key)!,
        at,
      ),
    ),
    put(
      box,
      items.find((i) => i.key === 'mimic-air')!,
      {
        wall: 'south',
        along: box.keepClear[0].minX - 0.25 - 2.3 / 2,
      },
    ),
  ],
  // The lounge's plant room (medium, 12 m): as the Olympic's, but its
  // gantry and stair take the north-east corner. The tank in the north-west,
  // a walkway all round it; the pumps off its face; the two filters on the
  // south wall west of the doors, their backwash short to the drainage;
  // east of the doors the heat exchanger by the heating ring and the
  // dosing pumps where their lines come in; the panel and the dosing
  // controller on the east wall south of the stair's foot; the contact
  // tank and the ozone generator along the north, east of the tank; the
  // UV in the middle, clear of the gantry.
  plant_pool_01: (box, items) => {
    const h = box.w / 2;
    const hz = box.d / 2;
    const at = (label: string) => items.find((i) => i.label.endsWith(label))!;
    const north = -hz + (box.pipes.north ?? 0);
    const south = hz - (box.pipes.south ?? 0);
    const s = TANK_SURROUND;
    const out: Placed[] = [];
    const tank = at('balance tank');
    const tx0 = -h + s;
    const tz0 = north + s;
    out.push(
      put(box, tank, {
        x: tx0 + tank.w / 2,
        z: tz0 + tank.d / 2,
        face: 'south',
      }),
    );
    const tankSouth = tz0 + tank.d;
    const tankEast = tx0 + tank.w;
    const pumps = at('circulation pumps, duty and standby, with strainers');
    out.push(
      put(box, pumps, {
        x: -h + s + pumps.w / 2,
        z: tankSouth + ACCESS + pumps.d / 2,
        face: 'south',
      }),
    );
    const filters = items.filter((i) => i.key.startsWith('sand-filter'));
    const f = filters[0];
    const door = Math.min(
      ...box.keepClear.filter((k) => k.maxZ >= hz - 1e-9).map((k) => k.minX),
    );
    filters.forEach((item, i) =>
      out.push(
        put(box, item, {
          x: door - f.w / 2 - i * (f.w + 0.6),
          z: south - f.d / 2,
          face: 'north',
        }),
      ),
    );
    const doorEast = Math.max(
      ...box.keepClear.filter((k) => k.maxZ >= hz - 1e-9).map((k) => k.maxX),
    );
    const phe = at('plate heat exchanger');
    out.push(
      put(box, phe, {
        x: doorEast + 0.6 + phe.w / 2,
        z: south - 0.6 - phe.d / 2,
        face: 'north',
      }),
    );
    let x = doorEast + 0.6 + phe.w + 0.6;
    const hypo = at('hypochlorite dosing pumps');
    const hypoPlaced = put(box, hypo, { wall: 'south', along: x + hypo.w / 2 });
    out.push(hypoPlaced);
    // The east wall south of the stair's foot.
    const foot = Math.max(
      ...box.keepClear
        .filter((k) => k.maxX >= h - 1e-9 && k.maxZ < hz - 2)
        .map((k) => k.maxZ),
    );
    const controller = at('dosing controller and sample cells');
    out.push(
      put(box, controller, {
        wall: 'east',
        along: foot + 0.3 + controller.w / 2,
      }),
    );
    // Keep the acid pump with the other dosing supply on the south wall,
    // clear of the control panel on the east wall and its vertical conduit.
    const acid = at('acid dosing pump');
    out.push(
      put(box, acid, {
        wall: 'south',
        along: hypoPlaced.footprint.minX - WALL_GAP - acid.w / 2,
      }),
    );
    const panel = at('local control panel');
    out.push(
      put(box, panel, {
        x: h - panel.d / 2,
        z: south - 0.3 - panel.w / 2,
        face: 'west',
      }),
    );
    // The north row, east of the tank, short of the gantry.
    x = tankEast + s;
    for (const label of ['ozone contact tank', 'ozone generator']) {
      const item = at(label);
      out.push(
        put(box, item, {
          x: x + item.w / 2,
          z: north + item.d / 2,
          face: 'south',
        }),
      );
      x += item.w + 0.6;
    }
    const uv = at('UV unit');
    out.push(
      put(box, uv, {
        x: tankEast + s + uv.w / 2 + 1.2,
        z: tankSouth + ACCESS + 0.3 + uv.d / 2,
        face: 'south',
      }),
    );
    return out;
  },
  // The Jacuzzi's cabinet against the west wall, facing east, 0.65 m south
  // of the room's middle: of every place along the walls that keeps the
  // doors and the mimic's floor clear, where its services cost least
  // (`cabinetPipes`'s trial placings, 2026-10-23).
  plant_pool_03: (box, items) => {
    const cabinet = items.find((i) => i.key === 'jacuzzi-pack')!;
    const back = cabinet.back ?? 0;
    // Its filter in the room's south-west corner, south of it and clear of
    // the doorway's floor and the heating's lanes overhead: its balance
    // tank stands to the north.
    const filter = items.find((i) => i.key === 'sand-filter:spa-jacuzzi')!;
    return [
      put(box, cabinet, {
        x: -box.w / 2 + back + cabinet.d / 2,
        z: 0.65,
        face: 'east',
      }),
      put(box, filter, {
        // Facing north, its unions east and west, each with room to be
        // reached.
        x: -box.w / 2 + 0.6,
        z: box.d / 2 - 0.05 - filter.d / 2,
        face: 'north',
      }),
    ];
  },
  // The footbath's cabinet against the tiny room's west wall, facing east,
  // its services' lanes behind it, clear of both doors.
  plant_pool_04: (box, items) => {
    const cabinet = items.find((i) => i.key === 'spa-pack')!;
    const back = cabinet.back ?? 0;
    const filter = items.find((i) => i.key === 'sand-filter:spa-footSpa')!;
    return [
      put(box, cabinet, {
        x: -box.w / 2 + back + cabinet.d / 2,
        z: -0.3,
        face: 'east',
      }),
      put(box, filter, {
        x: -box.w / 2 + 0.1 + filter.d / 2,
        z: -0.3 - cabinet.w / 2 - 0.1 - filter.w / 2,
        face: 'east',
      }),
    ];
  },
};

/** The plant room's storey, for its machines' floor. */
export const PLANT_FLOOR = -PLANT_ROOM.storey;

/** The wet hall's break tank's outlet, where it is placed (`machinePorts`). */
function breakTankOutlet(box: RoomBox, tank: Item, L: typeof WET_HALL_LAYOUT) {
  const placed = put(box, tank, {
    x: -1.1 + L.lineShift + L.tankShift,
    z: -6.3,
    face: 'south',
  });
  const [x, , z] = placedPort(placed, 'outlet').at;
  return { x, z };
}
