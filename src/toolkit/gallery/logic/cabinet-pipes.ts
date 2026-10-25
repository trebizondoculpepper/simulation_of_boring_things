import { FEEDER_ISOLATOR, layoutRoom } from './room-equipment';
import { JACUZZI_BALANCE_TANK } from '../../../game/plant/spa-balance-tank';
import { choosePipe } from '../../components/core/logic/plumber';
import type { Placed } from './room-equipment';
import {
  BUSBAR_TAP_OFF,
  POWER_ISOLATOR,
  SWITCH_FUSE,
  TAP_OFF_GLAND,
  glandTop,
} from '../../components/industrial-control/logic/enclosures';

/**
 * The services of the rooms whose plant is one packaged cabinet: the
 * footbath's spa set, and the jacuzzi's with its jets and air. The
 * cabinet's own skid piping is part of the product; its connections are
 * the valved stubs out through its back panel and the cable gland on its
 * roof (`spa-pack.ts`), its ports. From each a run goes where it must:
 * the spa's water (its return, its overflow into the surge vessel, the
 * jets' suction and discharge, the air line) out through the north wall,
 * toward the pool; the heating ring's flow and return, lagged, and the
 * electricity, through the south, from the central plant; the drain down
 * into a tundish on a floor gully, which takes it under the floor to the
 * drainage. The electricity comes through a lockable isolator on the
 * wall at the cabinet's left. Where a run passes through a wall it has a
 * fire collar (plastic pipe) or a sleeve (metal), the plant room being a
 * fire compartment. Pure: metres, the room's frame, its floor at y = 0.
 */

export type Vec3 = readonly [number, number, number];

export type Service =
  | 'pool water'
  | 'make-up'
  | 'air'
  | 'heating flow'
  | 'heating return'
  | 'drainage'
  | 'electrical';

export type RunKind =
  | 'pvc-pressure'
  | 'pvc-drain'
  | 'lagged-heating'
  | 'steel-screwed'
  | 'busbar-trunking';

export interface CabinetPort {
  name: string;
  /** In the cabinet's frame: origin on the floor at its footprint's middle, front toward +z. */
  at: Vec3;
  /** Which way it points out of the cabinet. */
  out: 'back' | 'up';
  kind: RunKind;
  od: number;
  service: Service;
  /** What its run's label says. */
  label: string;
  /** Where its run goes. */
  to: 'pool' | 'plant' | 'drain' | 'isolator' | 'tank';
  /** Which way it flows: out of the cabinet along its run, or in. */
  flow: 'out' | 'in';
}

/** The cabinet's sizes, as `spa-pack.ts` has them. */
function cabinet(jets: boolean) {
  const w = jets ? 2.8 : 1.7;
  const d = jets ? 1.0 : 0.9;
  const leaf = w / 2 - 0.01;
  return {
    w,
    d,
    h: 2.1,
    /** The body is set back by half a door leaf. */
    bodyZ: -leaf / 2,
    skidX: jets ? -1.1 / 2 : 0,
    skidY: 0.16,
  };
}

/**
 * A cabinet's ports, where its back panel's stubs end and its roof's
 * gland stands. The numbers are `spa-pack.ts`'s (its stubs' and its
 * `SPA_DRAIN` and `spaGland`), carried through its frames;
 * `cabinet-ports.test.ts` checks there is a stub or gland at each.
 */
export function cabinetPorts(jets: boolean): CabinetPort[] {
  const c = cabinet(jets);
  const back = c.bodyZ - c.d / 2 - 0.03;
  const at = (x: number, y: number): Vec3 => [c.skidX + x, c.skidY + y, back];
  const ports: CabinetPort[] = [
    {
      name: 'Return to the spa',
      at: at(0.52, 0.08),
      out: 'back',
      kind: 'pvc-pressure',
      od: 0.05,
      service: 'pool water',
      label: 'SPA RETURN',
      flow: 'out',
      to: 'pool',
    },
    {
      name: 'Overflow from the spa',
      at: at(-0.66, 1.0),
      out: 'back',
      kind: 'pvc-pressure',
      od: 0.05,
      service: 'pool water',
      label: 'SPA OVERFLOW',
      flow: 'in',
      to: 'pool',
    },
    {
      name: 'Heating flow',
      at: at(0.315, 1.0),
      out: 'back',
      kind: 'lagged-heating',
      od: 0.0337,
      service: 'heating flow',
      label: 'LTHW FLOW',
      flow: 'in',
      to: 'plant',
    },
    {
      name: 'Heating return',
      at: at(0.2, 1.1),
      out: 'back',
      kind: 'lagged-heating',
      od: 0.0337,
      service: 'heating return',
      label: 'LTHW RETURN',
      flow: 'out',
      to: 'plant',
    },
    {
      name: 'Drain to waste',
      at: at(0.05, 0.05),
      out: 'back',
      kind: 'pvc-drain',
      od: 0.05,
      service: 'drainage',
      label: 'DRAIN',
      flow: 'out',
      to: 'drain',
    },
    {
      name: 'Electrical supply',
      at: [-c.w / 2 + 0.1, c.h + 0.06, c.bodyZ - c.d / 2 + 0.15],
      out: 'up',
      kind: 'steel-screwed',
      od: 0.025,
      service: 'electrical',
      label: '400 V SUPPLY',
      flow: 'in',
      to: 'isolator',
    },
  ];
  if (jets) {
    // The jacuzzi's cabinet is plumbed to an external balance tank
    // (`spa-balance-tank.ts`; the owner, 2026-10-24): its overflow stub is
    // its pump's suction from the tank; the spa's overflow goes to the tank.
    const overflow = ports.findIndex((p) => p.name === 'Overflow from the spa');
    ports[overflow] = {
      ...ports[overflow],
      name: 'Suction from the balance tank',
      label: 'TANK SUCTION',
      to: 'tank',
    };
    const jx = c.w / 2 - 1.1 / 2;
    const base = 0.1;
    ports.push(
      {
        name: 'Jets suction from the spa',
        at: [jx - 0.5, base + 0.35, back],
        out: 'back',
        kind: 'pvc-pressure',
        od: 0.09,
        service: 'pool water',
        label: 'JETS SUCTION',
        flow: 'in',
        to: 'pool',
      },
      {
        name: 'Jets discharge to the spa',
        // Stepped toward the bay's end, clear of the blower's air line
        // (`spa-pack.ts`, `JETS_DISCHARGE_STEP`).
        at: [jx - 0.1 + 0.12, base + 1.25, back],
        out: 'back',
        kind: 'pvc-pressure',
        od: 0.09,
        service: 'pool water',
        label: 'JETS DISCHARGE',
        flow: 'out',
        to: 'pool',
      },
      {
        name: 'Air to the spa’s blower ring',
        at: [jx + 0.2, base + 1.4, back],
        out: 'back',
        kind: 'pvc-pressure',
        od: 0.06,
        service: 'air',
        label: 'BLOWER AIR',
        flow: 'out',
        to: 'pool',
      },
    );
  }
  return ports;
}

/** The cabinet's body (doors shut) in its own frame: its half-width, its back and front. */
export function cabinetBody(jets: boolean) {
  const c = cabinet(jets);
  return {
    half: c.w / 2,
    back: c.bodyZ - c.d / 2,
    front: c.bodyZ + c.d / 2,
    h: c.h,
  };
}

/** A point of the cabinet's frame in the room's, by its placing. */
function inRoom(p: Placed, [x, y, z]: Vec3): Vec3 {
  const c = Math.cos(p.yaw);
  const s = Math.sin(p.yaw);
  return [p.x + x * c + z * s, y, p.z - x * s + z * c];
}

/** The cabinet's body in the room, as a box. */
export function cabinetBodyIn(p: Placed, jets: boolean) {
  const b = cabinetBody(jets);
  const corners = [
    inRoom(p, [-b.half, 0, b.back]),
    inRoom(p, [b.half, 0, b.front]),
  ];
  return {
    min: [
      Math.min(corners[0][0], corners[1][0]),
      0,
      Math.min(corners[0][2], corners[1][2]),
    ] as Vec3,
    max: [
      Math.max(corners[0][0], corners[1][0]),
      b.h,
      Math.max(corners[0][2], corners[1][2]),
    ] as Vec3,
  };
}

/** A wall a run passes through, and what is fitted where it does. */
export interface WallCrossing {
  /** The middle of the wall's thickness where the run crosses it. */
  at: Vec3;
  /** Its normal, into the room. */
  normal: Vec3;
  thickness: number;
  kind: 'fire-collar' | 'sleeve';
}

export interface CabinetRun {
  name: string;
  kind: RunKind;
  od: number;
  service: Service;
  label: string;
  /** Whether it flows the way its points go (from the cabinet, out), or against them. */
  flow: 1 | -1;
  points: Vec3[];
  /** Where it passes through the room's walls. */
  through: WallCrossing[];
  /** Its ends' finishes, if not open (a busbar's far end is capped). */
  ends?: readonly ['open' | 'cap', 'open' | 'cap'];
  /** Named operating valve mounted on this pipe in the room. */
  valve?: {
    id: string;
    at: Vec3;
    axis: 'x' | 'y' | 'z';
    /** Turn the operator around a vertical run to face the clear aisle. */
    facing?: number;
    /**
     * Its lever, or, out of reach overhead, a chain wheel (`CHAIN_TO`); or
     * a motorised ball valve worked from the room's valve panel
     * (`cabinetValvePanel`).
     */
    operator?: 'lever' | 'chain' | 'motor';
    /** Its axis may be its rise's. */
  } & ({ installed?: false } | { installed: true; name: string });
}

/** The room's isolator: on the wall at the cabinet's left, a working rotary switch-disconnector. */
export interface Isolator {
  /** Its back's middle in the wall's face, and its turn (front into the room). */
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Its box's size: wide, tall, deep. */
  w: number;
  h: number;
  d: number;
  /** Where its supply comes in at its top, and its feed to the cabinet leaves. */
  supplyIn: Vec3;
  feedOut: Vec3;
}

/** Out from a stub's valve and cap before a pipe turns, metres. */
const CLEAR = 0.15;
/** Space for the drain valve and its lever before the pipe drops to its gully. */
const FOOTBATH_DRAIN_REACH = 0.5;
/** The lowest height a pool pipe crosses the room at, over the cabinet's top. */
const LOWEST = 2.5;
const STEP = 0.2;
/** How much further out from the cabinet's back the heating's lane is. */
const HEATING_LANE = 0.17;
/** Over the head of a doorway (the equipment doors' 2.52 m) and clear of it. */
export const ABOVE_DOORS = 2.8;
/** The footbath's make-up main runs this high, above the plant lanes. */
export const MAKE_UP_LEVEL = 3.4;
/**
 * The room's electricity, in the owner's order (2026-10-24): a plug-in
 * busbar along the west wall at high level, in through the south wall
 * from the switch room; a tap-off unit on it over the room's switch-fuse;
 * the switch-fuse (the room's feeder, `room-services.ts`'s place for it),
 * fed into its first gland, feeding out of its second; the cabinet's
 * isolator; the cabinet. The busbar and the conduits are the plumber's
 * choice (`choosePipe`), each run between two components' glands.
 */
export const CABINET_BUS = {
  /** The bar's middle: its height, and how far off the wall. */
  y: 3.5,
  off: BUSBAR_TAP_OFF.d / 2,
  /** What it carries: the switch room's way for the spas. */
  current: 63,
} as const;
/** The bar, as the plumber chooses it. */
const BAR = choosePipe({
  commodity: 'ac-400v-3ph',
  current: CABINET_BUS.current,
  busbar: true,
});
/** The cabinet's circuit, as the plumber chooses its conduit: a 32 A way. */
const CIRCUIT = choosePipe({ commodity: 'ac-400v-3ph', current: 32 });
/** Where the switch-fuse's feed out runs up to before it crosses to the isolator. */
const CROSS_LEVEL = 2.25;

/**
 * The cabinet room's busbar and the components on its line: the bar's
 * run, its tap-off unit's place, and the switch-fuse's glands.
 */
export function cabinetBusbar(room: string, trial?: Placed) {
  const s = setting(room, trial);
  const iso = cabinetIsolator(room, trial);
  if (!s || !iso) return null;
  const hw = s.layout.box.w / 2;
  const h = s.h;
  const x = -hw + CABINET_BUS.off;
  // The switch-fuse, turned onto the west wall: its local +x is the room's
  // -z, so its first gland (supply in) is to the south.
  const feederZ = h - FEEDER_ISOLATOR.fromSouth;
  const [gIn, gOut] = SWITCH_FUSE.glands.x;
  const gx = -hw + SWITCH_FUSE.glands.z;
  const fuseTop = FEEDER_ISOLATOR.y + glandTop(SWITCH_FUSE);
  const fuseIn: Vec3 = [gx, fuseTop, feederZ - gIn];
  const fuseOut: Vec3 = [gx, fuseTop, feederZ - gOut];
  // The tap-off unit over the switch-fuse's supply gland, hung under the bar.
  const tapY = CABINET_BUS.y - BAR.od / 2 - BUSBAR_TAP_OFF.h / 2;
  const tap = { at: [x, tapY, fuseIn[2]] as Vec3, yaw: Math.PI / 2 };
  const tapGland: Vec3 = [gx, tapY - TAP_OFF_GLAND, fuseIn[2]];
  return {
    bar: {
      od: BAR.od,
      points: [
        [x, CABINET_BUS.y, h + WALL],
        [x, CABINET_BUS.y, -h + 0.2],
      ] as Vec3[],
      wallAt: [x, CABINET_BUS.y, h + WALL / 2] as Vec3,
    },
    tap,
    tapGland,
    fuseIn,
    fuseOut,
    isolatorIn: iso.supplyIn,
  };
}

/** Its feed to the cabinet crosses over the cabinet's roof this high. */
const FEED_LEVEL = 2.35;
/** The walls' thickness. */
const WALL = 0.2;
/** The isolator's box (`createPowerIsolator`, `POWER_ISOLATOR`), its middle this high. */
const ISOLATOR = {
  w: POWER_ISOLATOR.w,
  h: POWER_ISOLATOR.h,
  d: POWER_ISOLATOR.d,
  y: 1.5,
} as const;

const PLASTIC = new Set<RunKind>(['pvc-pressure', 'pvc-drain']);

/**
 * The room's cabinet, its placing, the way out of its back, and its wall's
 * line in its frame; `trial`, a placing to try in place of the room's own
 * (to compare where the cabinet might stand).
 */
function setting(room: string, trial?: Placed) {
  const layout = layoutRoom(room);
  const placed =
    trial ?? layout?.placed.find((p) => p.item.key.endsWith('-pack'));
  if (!layout || !placed) return null;
  const jets = placed.item.key === 'jacuzzi-pack';
  const outDir = inRoom({ ...placed, x: 0, z: 0 }, [0, 0, -1]);
  const wallLocal = -(placed.item.d / 2 + (placed.item.back ?? 0));
  return { layout, placed, jets, outDir, wallLocal, h: layout.box.d / 2 };
}

/** The cabinet's ports in the room: each one's place, and the way out of it. */
export function cabinetPortsInRoom(room: string, trial?: Placed) {
  const s = setting(room, trial);
  if (!s) return [];
  const up: Vec3 = [0, 1, 0];
  return cabinetPorts(s.jets).map((port) => ({
    ...port,
    at: inRoom(s.placed, port.at),
    outward: port.out === 'up' ? up : s.outDir,
  }));
}

/** The isolator on the wall at the cabinet's left (its −x, as you face it). */
export function cabinetIsolator(room: string, trial?: Placed): Isolator | null {
  const s = setting(room, trial);
  if (!s) return null;
  const { placed, outDir, wallLocal } = s;
  const along = -(placed.item.w / 2) - 0.35;
  const face = inRoom(placed, [along, 0, wallLocal]);
  const into = [-outDir[0], 0, -outDir[2]] as const;
  // Its glands' line, out from the wall.
  const g = POWER_ISOLATOR.glands;
  const centre: Vec3 = [
    face[0] + into[0] * g.z,
    ISOLATOR.y,
    face[2] + into[2] * g.z,
  ];
  // Along the wall, toward the cabinet: its local +x in the room.
  const toward = inRoom({ ...placed, x: 0, z: 0 }, [1, 0, 0]);
  // Its conduits end on its glands' tops.
  const top = ISOLATOR.y + glandTop(POWER_ISOLATOR);
  const [gIn, gOut] = [g.x[0], g.x[1]];
  return {
    x: face[0],
    z: face[2],
    yaw: Math.atan2(into[0], into[2]),
    ...ISOLATOR,
    supplyIn: [centre[0] + toward[0] * gIn, top, centre[2] + toward[2] * gIn],
    feedOut: [centre[0] + toward[0] * gOut, top, centre[2] + toward[2] * gOut],
  };
}

/** The rooms whose cabinet's valves are motorised, worked from a panel. */
const MOTORISED = new Set(['plant_pool_03', 'plant_pool_04']);

/**
 * The cabinet's valve panel, its back on a wall at eye height: the foot
 * spa's (the owner, 2026-10-23: its valves motorised, worked from a small
 * panel on the east wall) south of the pool door; the jacuzzi's (the
 * owner, 2026-10-24: like the foot spa's, too hard to work by hand in so
 * tight a room) on the north wall, beside its mimic.
 */
export function cabinetValvePanel(room: string, trial?: Placed) {
  if (!MOTORISED.has(room)) return null;
  const s = setting(room, trial);
  if (!s) return null;
  // Right of the mimic (1.2 m wide, at the wall's middle), a hand's gap off.
  if (room === 'plant_pool_03') return { x: 1.16, y: 1.72, z: -s.h, yaw: 0 };
  const x = s.layout.box.w / 2;
  const z = 0.5;
  return {
    x,
    y: 1.72,
    z,
    yaw: -Math.PI / 2,
  };
}

/**
 * The jacuzzi's balance tank (`JACUZZI_BALANCE_TANK`): standing north of
 * its cabinet in the room's north-west corner, clear of the walls and the
 * cabinet's runs; its nozzles, in the room: its suction outlet low on its
 * south side, toward the cabinet; the spa's overflow in through its lid;
 * its make-up's float valve on its lid; its overflow out high on its
 * north side, down into a tundish on a floor gully of its own; and its
 * drain to waste (the owner, 2026-10-25) out of its foot on its east
 * side, toward the room, south of its sight gauge, through a lever valve
 * a crouching hand reaches from the aisle, into a tundish on a gully of
 * its own beside it, behind the line of the cabinet's front, so out of
 * its doors' swing.
 */
export function cabinetBalanceTank(room: string) {
  if (room !== 'plant_pool_03') return null;
  const t = JACUZZI_BALANCE_TANK;
  const x = -3.2;
  const z = -2.3;
  const r = t.diameter / 2;
  const top = t.height;
  return {
    x,
    z,
    r,
    height: top,
    /** Where it stands, for the walker. */
    footprint: { minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r },
    /** Its suction outlet, low on its west side, toward the wall. */
    suction: [x - r, 0.3, z] as Vec3,
    overflowIn: [x - 0.25, top, z - 0.25] as Vec3,
    makeUp: [x - 0.4, top, z + 0.2] as Vec3,
    overflowOut: [x, top - 0.12, z - r] as Vec3,
    /** Its overflow's tundish and gully, beyond its north side. */
    gully: [x, 0, z - r - 0.3] as Vec3,
    /** Its drain's nozzle, at its foot on its east side, south of its gauge. */
    drainOut: [
      x + Math.sqrt(r * r - TANK_DRAIN_SOUTH ** 2),
      TANK_DRAIN_LEVEL,
      z + TANK_DRAIN_SOUTH,
    ] as Vec3,
    /** Its drain's tundish and gully, out toward the aisle. */
    drainGully: [x + r + TANK_DRAIN_REACH, 0, z + TANK_DRAIN_SOUTH] as Vec3,
  };
}

/** The tank's drain leaves its foot this high, over its tundish's rim. */
const TANK_DRAIN_LEVEL = 0.21;
/** This far south of the tank's middle, clear of its sight gauge (east, on its middle). */
const TANK_DRAIN_SOUTH = 0.3;
/** Its tundish this far out from the tank's side: room for the valve and its lever. */
const TANK_DRAIN_REACH = 0.5;

/** The spa's overflow comes through the north wall this high, then drops into the tank. */
const TANK_OVERFLOW_LEVEL = 2.25;
/** The tank's make-up runs in from the south this high, over the room's other lanes. */
const TANK_MAKE_UP_LEVEL = 3.0;
/**
 * The tank's suction runs low, as a flooded suction must (no high point
 * to trap air): this high, along the west wall in the cabinet's service
 * space, under every other stub; the one level run below head height.
 */
export const SUCTION_LEVEL = 0.3;
/** Its lane along the west wall, this far off it. */
const SUCTION_OFF_WALL = 0.15;

/** Where the drain's tundish and floor gully stand: under its stub's turn. */
export function cabinetGully(room: string, trial?: Placed): Vec3 | null {
  const s = setting(room, trial);
  if (!s) return null;
  const port = cabinetPorts(s.jets).find((p) => p.to === 'drain')!;
  const at = inRoom(s.placed, port.at);
  const reach = MOTORISED.has(room) ? FOOTBATH_DRAIN_REACH : CLEAR;
  return [at[0] + s.outDir[0] * reach, 0, at[2] + s.outDir[2] * reach];
}

/** Through a north or south wall at its end: carried on to the wall's outer face, its fitting in the wall. */
function throughWall(
  points: Vec3[],
  h: number,
  kind: RunKind,
): { points: Vec3[]; through: WallCrossing[] } {
  const end = points[points.length - 1];
  const side = Math.sign(end[2]);
  if (Math.abs(Math.abs(end[2]) - h) > 1e-6) return { points, through: [] };
  return {
    points: [...points.slice(0, -1), [end[0], end[1], side * (h + WALL)]],
    through: [
      {
        at: [end[0], end[1], side * (h + WALL / 2)],
        normal: [0, 0, -side],
        thickness: WALL,
        kind: PLASTIC.has(kind) ? 'fire-collar' : 'sleeve',
      },
    ],
  };
}

/**
 * The cabinet's runs in `room` (`plant_pool_03`, `plant_pool_04`):
 * - the spa's pipes out of their stubs, up behind the cabinet, each to its
 *   own height, the further south the higher (so none crosses another's
 *   riser), and north through the wall;
 * - the heating, in a lane of its own further out, straight up above the
 *   doors' height and south through the wall;
 * - the drain straight down into its tundish;
 * - the supply along the wall from the south, over everything, down into
 *   the isolator; and the isolator's feed up over the cabinet's roof and
 *   down into its gland.
 */
/**
 * The heights the cabinet's runs cross the room at: the spa's lowest
 * (each next one `poolStep` higher, the further south the higher) and the
 * heating's (each next `plantStep` higher). Each room's own, from a search
 * of what is cheapest and still clears head height, the doors, the
 * cabinet and every other run (`CABINET_LEVELS`).
 */
export interface CabinetLevels {
  pool: number;
  poolStep: number;
  plant: number;
  plantStep: number;
}

/** The levels the rules first gave every cabinet room. */
export const RULE_LEVELS: CabinetLevels = {
  pool: LOWEST,
  poolStep: STEP,
  plant: ABOVE_DOORS,
  plantStep: 0.15,
};

/**
 * Each room's levels, searched (the owner, 2026-10-23): the lowest that
 * keep every run's level lengths over head height, clear of the doors,
 * the cabinet and each other, and of the room's building services.
 */
export const CABINET_LEVELS: Record<string, CabinetLevels> = {
  // About 7 % cheaper than the rules' levels in each room (2026-10-23).
  plant_pool_03: { pool: 2.2, poolStep: 0.12, plant: 2.2, plantStep: 0.25 },
  plant_pool_04: { pool: 2.2, poolStep: 0.12, plant: 2.2, plantStep: 0.25 },
};

/**
 * A water run's isolating valve, on the vertical rise behind the cabinet
 * (the owner, 2026-10-23: not on the stub's short first length, where it
 * met the elbow): at a hand's height, clear of the elbows at both ends,
 * each next one up its own rise staggered so no two valves meet.
 */
function riserValve(points: Vec3[], index: number): Vec3 | null {
  const [a, b] = [points[1], points[2]];
  if (!a || !b || Math.abs(a[0] - b[0]) > 1e-6 || Math.abs(a[2] - b[2]) > 1e-6)
    return null;
  const lo = Math.min(a[1], b[1]) + 0.3;
  const hi = Math.max(a[1], b[1]) - 0.3;
  if (hi < lo) return null;
  const y = Math.min(hi, Math.max(lo, 1.0 + (index % 4) * 0.22));
  return [a[0], y, a[2]];
}

export function cabinetPipes(
  room: string,
  trial?: Placed,
  levels: CabinetLevels = CABINET_LEVELS[room] ?? RULE_LEVELS,
): CabinetRun[] {
  const s = setting(room, trial);
  if (!s) return [];
  const { placed, jets, outDir, h } = s;
  const ports = cabinetPorts(jets).map((port) => {
    const at = inRoom(placed, port.at);
    const off: Vec3 = [
      at[0] + outDir[0] * CLEAR,
      at[1],
      at[2] + outDir[2] * CLEAR,
    ];
    return { port, at, off };
  });
  const runs: CabinetRun[] = [];
  const add = (port: CabinetPort, points: Vec3[]) =>
    runs.push({
      name: port.name,
      kind: port.kind,
      od: port.od,
      service: port.service,
      label: port.label,
      flow: port.flow === 'out' ? 1 : -1,
      ...throughWall(points, h, port.kind),
    });
  // To the pool: north first, lowest.
  ports
    .filter((p) => p.port.to === 'pool')
    .sort((a, b) => a.off[2] - b.off[2])
    .forEach(({ port, at, off }, i) => {
      const y = levels.pool + i * levels.poolStep;
      add(port, [at, off, [off[0], y, off[2]], [off[0], y, -h]]);
    });
  // To the central plant.
  ports
    .filter((p) => p.port.to === 'plant')
    .forEach(({ port, at }, i) => {
      // A lane each, apart by more than their lagging (40 mm all round).
      const reach = CLEAR + HEATING_LANE + i * 0.15;
      const x = at[0] + outDir[0] * reach;
      const z = at[2] + outDir[2] * reach;
      const y = levels.plant + i * levels.plantStep;
      add(port, [at, [x, at[1], z], [x, y, z], [x, y, h]]);
    });
  // Each water run's isolating valve, up its rise behind the cabinet; the
  // footbath's return is the world's named valve, the rest installed ones.
  runs.forEach((run, i) => {
    const at = riserValve(run.points, i);
    if (!at) return;
    // The footbath's two close heating rises need their operators on the
    // outside faces. Lift the flow operator above the return's lever.
    const footbathFlow =
      room === 'plant_pool_04' && run.name === 'Heating flow';
    const clearAt: Vec3 = footbathFlow
      ? [at[0], Math.min(run.points[2][1] - 0.3, at[1] + 0.4), at[2]]
      : at;
    run.valve =
      room === 'plant_pool_04' && run.name === 'Return to the spa'
        ? { id: 'PL4-PW1-RV1', at: clearAt, axis: 'y', operator: 'motor' }
        : {
            id: `${run.name} valve`,
            at: clearAt,
            axis: 'y',
            ...(footbathFlow ? { facing: Math.PI / 2 } : {}),
            ...(MOTORISED.has(room) ? { operator: 'motor' as const } : {}),
            installed: true,
            name: `${run.name} valve`,
          };
  });
  // The drain, down into its tundish (its rim at 0.12 m, an air gap over it).
  for (const { port, at } of ports.filter((p) => p.port.to === 'drain')) {
    const reach = MOTORISED.has(room) ? FOOTBATH_DRAIN_REACH : CLEAR;
    const out: Vec3 = [
      at[0] + outDir[0] * reach,
      at[1],
      at[2] + outDir[2] * reach,
    ];
    add(port, [at, out, [out[0], 0.17, out[2]]]);
  }
  // The jacuzzi's drain valve, motorised on its one short length, as the
  // foot spa's (the owner, 2026-10-24: on its valve panel with the rest).
  if (room === 'plant_pool_03') {
    const drainRun = runs.find((r) => r.name === 'Drain to waste');
    if (drainRun) {
      const [a, b] = drainRun.points;
      drainRun.valve = {
        id: 'Drain to waste valve',
        at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
        axis: Math.abs(a[0] - b[0]) > Math.abs(a[2] - b[2]) ? 'x' : 'z',
        facing: -Math.PI / 2,
        operator: 'motor',
        installed: true,
        name: 'Drain to waste valve',
      };
    }
  }
  // The jacuzzi's balance tank's runs: the pump's suction from it, the
  // spa's overflow into it, its make-up, and its overflow to its gully.
  const tank = cabinetBalanceTank(room);
  const suction = ports.find((p) => p.port.to === 'tank');
  if (tank && suction) {
    const { at, off } = suction;
    const lane = -s.layout.box.w / 2 + SUCTION_OFF_WALL;
    const y = SUCTION_LEVEL;
    const [tx, , tz] = tank.suction;
    add(suction.port, [
      at,
      off,
      [off[0], y, off[2]],
      [lane, y, off[2]],
      [lane, y, tz],
      [tx, y, tz],
    ]);
    const run = runs[runs.length - 1];
    run.valve = {
      id: 'Suction from the balance tank valve',
      at: [off[0], (off[1] + y) / 2, off[2]],
      axis: 'y',
      operator: 'motor',
      installed: true,
      name: 'Suction from the balance tank valve',
    };
    // The spa's overflow: in through the north wall, down into the tank.
    const [ox, oy, oz] = tank.overflowIn;
    const overflow: CabinetRun = {
      name: 'Overflow from the spa',
      kind: 'pvc-pressure',
      od: 0.05,
      service: 'pool water',
      label: 'SPA OVERFLOW',
      // From the spa to the tank, against its points.
      flow: -1,
      ...throughWall(
        [
          [ox, oy, oz],
          [ox, TANK_OVERFLOW_LEVEL, oz],
          [ox, TANK_OVERFLOW_LEVEL, -h],
        ],
        h,
        'pvc-pressure',
      ),
    };
    overflow.valve = {
      id: 'Overflow from the spa valve',
      at: [ox, (oy + TANK_OVERFLOW_LEVEL) / 2, oz],
      axis: 'y',
      operator: 'motor',
      installed: true,
      name: 'Overflow from the spa valve',
    };
    runs.push(overflow);
    // Its make-up, in through the south wall from the water service, over
    // the room's other lanes, down to the float valve on its lid.
    const [mx, my, mz] = tank.makeUp;
    runs.push({
      name: 'Make-up to the balance tank',
      kind: 'pvc-pressure',
      od: 0.032,
      service: 'make-up',
      label: 'TANK MAKE-UP',
      flow: -1,
      ...throughWall(
        [
          [mx, my, mz],
          [mx, TANK_MAKE_UP_LEVEL, mz],
          [mx, TANK_MAKE_UP_LEVEL, h],
        ],
        h,
        'pvc-pressure',
      ),
    });
    // Its overflow, out and down into its tundish.
    const [vx, vy, vz] = tank.overflowOut;
    const [gx, , gz] = tank.gully;
    runs.push({
      name: 'Balance tank overflow',
      kind: 'pvc-drain',
      od: 0.05,
      service: 'drainage',
      label: 'TANK OVERFLOW',
      flow: 1,
      points: [
        [vx, vy, vz],
        [gx, vy, gz],
        [gx, 0.17, gz],
      ],
      through: [],
    });
    // Its drain to waste: out of its foot, through its lever valve, and
    // down into its own tundish. Worked by hand, unlike the cabinet's
    // motorised valves: a drain opened once in a while, to empty the tank.
    const [dx, dy, dz] = tank.drainOut;
    const [ex, , ez] = tank.drainGully;
    runs.push({
      name: 'Balance tank drain to waste',
      kind: 'pvc-drain',
      od: 0.05,
      service: 'drainage',
      label: 'TANK DRAIN',
      flow: 1,
      points: [
        [dx, dy, dz],
        [ex, dy, ez],
        [ex, 0.17, ez],
      ],
      through: [],
      valve: {
        id: 'Balance tank drain valve',
        at: [(dx + ex) / 2, dy, dz],
        axis: 'x',
        // Turned so its lever, shut, points south, away from the tank's
        // sight gauge, toward the hand reaching in from the aisle.
        facing: -Math.PI / 2,
        operator: 'lever',
        installed: true,
        name: 'Balance tank drain valve',
      },
    });
  }
  if (room === 'plant_pool_04') {
    const returnRun = runs.find((r) => r.name === 'Return to the spa');
    const drainRun = runs.find((r) => r.name === 'Drain to waste');
    // The drain's valve on its one short length (its return's is up its rise).
    void returnRun;
    for (const [run, id] of [[drainRun, 'PL4-PW1-DV1']] as const) {
      if (!run) continue;
      const a = run.points[0],
        b = run.points[1];
      run.valve = {
        id,
        at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
        axis: Math.abs(a[0] - b[0]) > Math.abs(a[2] - b[2]) ? 'x' : 'z',
        // The default points back through the nearby pipe stand. Point the
        // lever toward the gully instead, with room to work it from behind.
        facing: -Math.PI / 2,
        operator: 'motor',
      };
    }
    // Fresh water enters along the east wall and continues to the pool,
    // overhead, above every other lane (`MAKE_UP_LEVEL`); its valve
    // motorised, worked from the panel below it.
    const x = s.layout.box.w / 2 - 0.35;
    const y = MAKE_UP_LEVEL;
    runs.push({
      name: 'Footbath make-up main',
      kind: 'pvc-pressure',
      od: 0.05,
      service: 'make-up',
      label: 'FOOTBATH MAKE-UP',
      // In from the south, on north to the pool.
      flow: 1,
      points: [
        [x, y, h + WALL],
        [x, y, 0],
        [x, y, -h - WALL],
      ],
      through: [
        {
          at: [x, y, h + WALL / 2],
          normal: [0, 0, -1],
          thickness: WALL,
          kind: 'fire-collar',
        },
        {
          at: [x, y, -h - WALL / 2],
          normal: [0, 0, 1],
          thickness: WALL,
          kind: 'fire-collar',
        },
      ],
      valve: {
        id: 'PL4-MU1-LCV1',
        at: [x, y, 0],
        axis: 'z',
        operator: 'motor',
      },
    });
  }
  // The supply, along the wall from the south and down into the isolator;
  // the isolator's feed over the cabinet's roof and down into its gland.
  const iso = cabinetIsolator(room, trial)!;
  const supply = ports.find((p) => p.port.to === 'isolator')!;
  const [inX, , inZ] = iso.supplyIn;
  // The busbar, in through the south wall from the switch room, capped at
  // its far end; from its tap-off unit down into the switch-fuse's supply
  // gland; from the switch-fuse's feed gland up, across over the isolator,
  // and down into its supply gland.
  const bus = cabinetBusbar(room, trial)!;
  runs.push(
    {
      name: 'Busbar',
      kind: 'busbar-trunking',
      od: bus.bar.od,
      service: 'electrical',
      label: '400 V BUSBAR',
      flow: -1,
      points: [...bus.bar.points].reverse(),
      through: [
        {
          at: bus.bar.wallAt,
          normal: [0, 0, 1],
          thickness: WALL,
          kind: 'fire-collar',
        },
      ],
      ends: ['cap', 'open'],
    },
    {
      name: 'Busbar to the switch-fuse',
      kind: CIRCUIT.kind as RunKind,
      od: CIRCUIT.od,
      service: 'electrical',
      label: 'SUPPLY',
      flow: 1,
      points: [bus.tapGland, bus.fuseIn],
      through: [],
    },
  );
  runs.push({
    name: 'Switch-fuse to the isolator',
    kind: CIRCUIT.kind as RunKind,
    od: CIRCUIT.od,
    service: 'electrical',
    label: 'CABINET SUPPLY',
    flow: 1,
    points: [
      bus.fuseOut,
      [bus.fuseOut[0], CROSS_LEVEL, bus.fuseOut[2]],
      [inX, CROSS_LEVEL, inZ],
      [inX, iso.supplyIn[1], inZ],
    ],
    through: [],
  });
  const g = supply.at;
  const f = iso.feedOut;
  // Along the wall to the gland's place along it, then out over the roof.
  const toward = inRoom({ ...placed, x: 0, z: 0 }, [1, 0, 0]);
  const turn: Vec3 =
    Math.abs(toward[0]) > 0.5
      ? [g[0], FEED_LEVEL, f[2]]
      : [f[0], FEED_LEVEL, g[2]];
  runs.push({
    name: 'Isolator to the cabinet',
    kind: supply.port.kind,
    od: supply.port.od,
    service: 'electrical',
    label: 'CABINET SUPPLY',
    // From the isolator to the cabinet, as its points go.
    flow: 1,
    points: [f, [f[0], FEED_LEVEL, f[2]], turn, [g[0], FEED_LEVEL, g[2]], g],
    through: [],
  });
  return runs;
}
