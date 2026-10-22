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
} from './shell-rooms';
import type { ShellRoomId, ShellWall } from './shell-rooms';
import { BOOSTER } from '../../components/plant/logic/booster-set';

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
  /** Clear space behind it, against its wall, for its pipework and access, metres. */
  back?: number;
  /** The walls it may stand against, in the order to try them. */
  walls?: readonly Side[];
  /** Floor that may be walked over: a lorry's bay, painted. */
  walkable?: boolean;
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
export function plantRoomBox(size: PlantRoomSize): RoomBox {
  const p = plantRoomPlan(size);
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
      ),
    ),
    floor('uv-unit', `${name} UV unit`, 1.7, 1.6, 1.7),
    // Its local control panel: the circulation's controls and its mimic,
    // fed from the central switchboard through the south wall.
    floor('pump-panel', `${name} local control panel`, 2.7, 0.6, 2.45, {
      walls: ['south', 'west', 'east'],
    }),
    floor('heat-exchanger', `${name} plate heat exchanger`, 1.5, 0.7, 1.2),
    floor('ozone-generator', `${name} ozone generator`, 1.6, 0.5, 1.95),
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
        box: plant('pool_01'),
        items: poolPlant(
          'Lounge pool',
          { nx: 3, nz: 2, ny: 2 },
          { count: 2, dia: 1.2 },
          0.96,
        ),
      };
    case 'plant_pool_02':
      // Olympic: a 216 m³ tank, 5 × 3 m filters, a 3.45 m contact tank.
      return {
        box: plant('pool_02'),
        items: poolPlant(
          'Olympic pool',
          // 216 m³ for the sizing's 200, three panels tall: as tall as it
          // may be, its top below the pool's deck a storey up, so the
          // overflow still falls to it.
          { nx: 9, nz: 8, ny: 3 },
          { count: 5, dia: 3 },
          3.45,
        ),
      };
    case 'plant_pool_03':
      return {
        // In front of its mimic board, in the middle of the north wall. Its
        // cabinet stands 0.6 m off its wall: the services' lanes behind it.
        box: (() => {
          const b = plant('pool_03');
          b.keepClear.push({
            minX: -1.6,
            maxX: 1.6,
            minZ: -b.d / 2,
            maxZ: -b.d / 2 + 1.5,
          });
          return b;
        })(),
        items: [
          floor('jacuzzi-pack', 'Packaged Jacuzzi plant cabinet', 3.2, 3, 2.2, {
            back: 0.6,
          }),
        ],
      };
    case 'plant_pool_04':
      return {
        box: plant('pool_04'),
        items: [
          floor('spa-pack', 'Packaged spa set, footbath', 2.1, 1.9, 2.2, {
            back: 0.6,
          }),
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
          floor('water-meter', 'Make-up water meter', 1.6, 0.4, 1.2),
          floor(
            'backwash-tank',
            'Backwash holding tank',
            ...size(sectionalSize(4, 4, 2)),
          ),
          wall('mimic-wet', 'Mimic: wet hall', 2.2, 0.08, 1.2, 1.6),
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
          ...[1, 2, 3].map((i) =>
            floor(
              'hypo-tank',
              `Sodium hypochlorite bulk tank ${i}`,
              1.75,
              1.75,
              2,
              { back: 0.3 },
            ),
          ),
          floor('safety-shower', 'Safety shower and eyewash', 1.25, 1.4, 2.3, {
            back: 0,
          }),
          floor('spill-kit', 'Chemical spill kit', 0.65, 0.75, 1, { back: 0 }),
          wall('ppe-cabinet', 'PPE cabinet', 0.6, 0.35, 1.25, 1.3),
          wall(
            'store-extract',
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
          floor('acid-ibc', 'Acid IBC on spill pallet', 2, 1.4, 2.2, {
            back: 0.3,
          }),
          floor('safety-shower', 'Safety shower and eyewash', 1.25, 1.4, 2.3, {
            back: 0,
          }),
          floor('spill-kit', 'Chemical spill kit', 0.65, 0.75, 1, { back: 0 }),
          wall('ppe-cabinet', 'PPE cabinet', 0.6, 0.35, 1.25, 1.3),
          wall(
            'store-extract',
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
          // The tanker's stand, down the middle from the outside end:
          // painted floor, walked over, never built on.
          floor('tanker-stand', 'Tanker stand', 3.2, 9, 0, {
            back: 0,
            walls: ['north'],
            walkable: true,
          }),
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
          floor('mcc', 'Motor control centre', 1.82, 0.56, 2, {
            back: 0,
            walls: ['east', 'west'],
          }),
          floor(
            'central-battery',
            'Emergency lighting central battery',
            0.62,
            0.5,
            1.8,
            { back: 0 },
          ),
          wall(
            'distribution-board',
            'Distribution board',
            0.5,
            0.35,
            0.86,
            1.5,
          ),
          wall('rotary-isolators', 'Rotary isolators', 1.2, 0.2, 0.6, 1.4),
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
          wall('mimic-air', 'Mimic: air handling', 2.1, 0.08, 1.2, 1.7, {
            walls: ['north', 'west', 'east'],
          }),
          wall('annunciator', 'Alarm annunciator', 0.9, 0.2, 0.95, 1.65),
          wall('chart-recorders', 'Chart recorders', 1.3, 0.2, 0.6, 1.5),
          wall('readout-board', 'Readout board', 1.3, 0.12, 0.55, 1.5),
          wall('bms-outstation', 'BMS outstation', 0.62, 0.75, 0.78, 1.4),
          wall('fire-repeater', 'Fire alarm repeater', 0.34, 0.1, 0.26, 1.5),
          wall('cctv', 'CCTV monitor', 0.4, 0.42, 0.45, 1.8),
        ],
      };
    case 'engineers_office':
      return {
        box: shellRoomBox('engineers_office'),
        items: [
          floor('desk', 'Engineer’s desk', 1.6, 0.8, 0.75, { back: 0 }),
          floor('filing', 'Filing and spares cabinets', 2, 0.6, 2, { back: 0 }),
        ],
      };
  }
  return null;
}

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
export function layoutRoom(room: string) {
  const r = roomEquipment(room);
  if (!r) return null;
  const fixed = FIXED[room]?.(r.box, r.items);
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
 * The Olympic pool's plant room. Only the pool's own water crosses the
 * north wall, over the viewing gantry: the overflow and main drains in,
 * the return out. Everything the central plant supplies or takes away
 * crosses the south, by the equipment doors: the heating water, the
 * make-up, the backwash and drainage, the electricity, the dosing
 * chemicals. So: the balance tank in the north-west, under the pool's
 * pipes coming in, a walkway all round it for its flanges' bolts; the
 * pumps off its face; the filters two along the south wall, west of the
 * doors, and three down the east, their backwash short drops to the
 * drainage main; the heat exchanger on the south wall beside the heating
 * ring; the local control panel, with the circulation's mimic, beside
 * the doors, where the supply comes in and where everyone comes in; the
 * dosing in the south-east corner, where its chemical lines arrive; and
 * the last stages before the return (ozone contact, UV) along the north,
 * under the gantry. The middle of the room stays open for the pipework.
 */
const FIXED: Record<string, (box: RoomBox, items: Item[]) => Placed[]> = {
  // The wet hall: along its north wall, west to east, in the order the
  // water goes: the break tank, the booster set, the meter; the mimic;
  // then the backwash tank. Each faces the room, its back to the wall.
  wet_hall: (box, items) => {
    const at = (key: string) => items.find((i) => i.key === key)!;
    const north = -box.d / 2;
    const row = (key: string, x: number, gap: number) => {
      const item = at(key);
      return put(box, item, {
        x,
        z: north + gap + item.d / 2,
        face: 'south',
      });
    };
    return [
      row('break-tank', -5.6, 0.6),
      row('booster-set', -2.6, 0.4),
      row('water-meter', -0.3, 0.4),
      put(box, at('mimic-wet'), { wall: 'north', along: 2.0 }),
      row('backwash-tank', 6.0, 0.6),
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
    const at = (label: string) => items.find((i) => i.label.endsWith(label))!;
    const north = -h + (box.pipes.north ?? 0);
    const south = h - (box.pipes.south ?? 0);
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
      ...box.keepClear.filter((k) => k.maxZ >= h - 1e-9).map((k) => k.minX),
    );
    filters.forEach((item, i) =>
      out.push(
        put(box, item, {
          x: door - f.w / 2 - i * (f.w + 0.6),
          z: south - 0.6 - f.d / 2,
          face: 'north',
        }),
      ),
    );
    const doorEast = Math.max(
      ...box.keepClear.filter((k) => k.maxZ >= h - 1e-9).map((k) => k.maxX),
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
    out.push(put(box, hypo, { wall: 'south', along: x + hypo.w / 2 }));
    // The east wall south of the stair's foot.
    const foot = Math.max(
      ...box.keepClear
        .filter((k) => k.maxX >= h - 1e-9 && k.maxZ < h - 2)
        .map((k) => k.maxZ),
    );
    const controller = at('dosing controller and sample cells');
    out.push(
      put(box, controller, {
        wall: 'east',
        along: foot + 0.3 + controller.w / 2,
      }),
    );
    // The acid pump beside it, clear of the heating at the south.
    const acid = at('acid dosing pump');
    out.push(
      put(box, acid, {
        wall: 'east',
        along: foot + 0.3 + controller.w + WALL_GAP + acid.w / 2,
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
  // The footbath's cabinet against the tiny room's west wall, facing east,
  // its services' lanes behind it, clear of both doors.
  plant_pool_04: (box, items) => {
    const cabinet = items.find((i) => i.key === 'spa-pack')!;
    const back = cabinet.back ?? 0;
    return [
      put(box, cabinet, {
        x: -box.w / 2 + back + cabinet.d / 2,
        z: -0.3,
        face: 'east',
      }),
    ];
  },
  plant_pool_02: (box, items) => {
    const h = box.w / 2;
    // The floor's north edge: the gantry's rail above, the floor cut off under it.
    const north = box.solid.find(
      (b) => b.minX <= -h + 1e-6 && b.maxX >= h - 1e-6,
    )!.maxZ;
    const south = h - (box.pipes.south ?? 0);
    const door = Math.max(
      ...box.keepClear.filter((k) => k.maxZ >= h - 1e-9).map((k) => k.maxX),
    );
    const foot = Math.max(
      ...box.keepClear
        .filter((k) => k.maxX >= h - 1e-9 && k.maxZ < 0)
        .map((k) => k.maxZ),
    );
    const at = (label: string) => items.find((i) => i.label.endsWith(label))!;
    const filters = items.filter((i) => i.key.startsWith('sand-filter'));
    const f = filters[0];
    const s = TANK_SURROUND;
    const out: Placed[] = [];
    // The balance tank, a walkway all round it.
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
    const tankEast = tx0 + tank.w;
    const tankSouth = tz0 + tank.d;
    // The pumps off its face, at its west end.
    const pumps = at('circulation pumps, duty and standby, with strainers');
    out.push(
      put(box, pumps, {
        x: -h + 0.8 + pumps.w / 2,
        z: tankSouth + ACCESS + 0.6 + pumps.d / 2,
        face: 'south',
      }),
    );
    // Two filters on the south wall, west of the doors.
    const fz = south - 0.6 - f.d / 2;
    [-h + 0.8 + f.w / 2, -h + 0.8 + f.w * 1.5 + 0.6].forEach((x, i) =>
      out.push(put(box, filters[i], { x, z: fz, face: 'north' })),
    );
    // Three down the east wall, from the stair's foot.
    const fx = h - 0.6 - f.d / 2;
    for (let i = 0; i < 3; i++)
      out.push(
        put(box, filters[2 + i], {
          x: fx,
          z: foot + 0.4 + f.w / 2 + i * (f.w + 0.6),
          face: 'west',
        }),
      );
    // On the south wall east of the doors: the heat exchanger by the
    // heating ring, then the local control panel.
    const phe = at('plate heat exchanger');
    const panel = at('local control panel');
    let x = door + 0.6;
    for (const item of [phe, panel]) {
      out.push(
        put(box, item, {
          x: x + item.w / 2,
          z: south - 0.6 - item.d / 2,
          face: 'north',
        }),
      );
      x += item.w + 0.6;
    }
    // The last stages along the north, under the gantry, east of the tank.
    x = tankEast + s;
    for (const label of ['ozone contact tank', 'ozone generator', 'UV unit']) {
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
    // The dosing in the south-east corner, where its lines come in: the
    // controller and the hypochlorite pumps on the east wall, the acid
    // pump on the south.
    const lastFilter = foot + 0.4 + 3 * f.w + 2 * 0.6;
    let z = lastFilter + 0.5;
    for (const label of [
      'dosing controller and sample cells',
      'hypochlorite dosing pumps',
    ]) {
      const item = at(label);
      out.push(put(box, item, { wall: 'east', along: z + item.w / 2 }));
      z += item.w + WALL_GAP;
    }
    const acid = at('acid dosing pump');
    out.push(put(box, acid, { wall: 'south', along: h - 0.8 - acid.w / 2 }));
    return out;
  },
};

/** The plant room's storey, for its machines' floor. */
export const PLANT_FLOOR = -PLANT_ROOM.storey;
