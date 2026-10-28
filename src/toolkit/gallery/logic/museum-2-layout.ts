import {
  FITTINGS,
  INSTRUMENTS,
  LINKS,
  LINK_DN,
  hall2Expansion,
} from '../../../game/plant/museum-2-clean-water';
import type {
  HallFitting,
  Instrument,
  LinkId,
  MachineId,
} from '../../../game/plant/museum-2-clean-water';
import type { Expansion } from '../../../game/plant/plumbing-expansion';
import { SOURCE_SHAPE } from '../../../game/plant/experimental-source';
import { routeVoxelLines } from '../../components/core/logic/voxel-router';
import type {
  RouterLine,
  RouterRegion,
} from '../../components/core/logic/voxel-router';
import { pipeClashes } from '../../components/core/logic/pipe-route';
import type { PipeJoint, Vec3 } from '../../components/core/logic/pipe-route';
import { sandFilterGeometry } from '../../components/plant/logic/sand-filter';
import { MACHINE_GAP, sizeRoom } from './room-sizer';
import type { RoomSize } from './room-sizer';
import { pointAlong } from './source-sink-plumbing';

/**
 * Hall 2's plant, laid out (107b): the schematic's machines placed by hand
 * in an L round the corner hall's two outer walls (the owner, 2026-10-28),
 * in the process's order, so the visitor walking round with the water
 * reads it left to right: along the west wall from the south, where they
 * come in from Hall 1, the ideal mains and dry air, the balance tank, the
 * pump, the sand filter and its drain, and the ozone bay (the generator
 * against the wall, its booster and venturi in front); then, turning along
 * the north wall towards the way on to Hall 3, the contact tank with its
 * off-gas destructor on top, the carbon deozoniser, the UV unit, and the
 * pool. Every pipe is routed between its machines' ports by the voxel
 * router, clear of the visitors' floor and of every machine; every fitting
 * is set into its line in the plumber's order. The pool's overflow, the
 * one line that runs right to left, keeps low along the back of both
 * walls. Pure; metres, in the hall's frame (its middle at the origin, y
 * up, north −z), the hall `museum2`'s 15.4 × 13.4 m inside.
 */

/** Along the west wall each machine faces east (+x), its own +x running north, the visitor's right. */
const FACING_EAST = Math.PI / 2;

/** Clear behind each machine, for the overflow's run along the back and for access, m. */
export const BEHIND = 0.6;
/** Clear at each end of the L, m. */
export const END_CLEAR = 0.6;

/** The filter: dev51's, Ø2.8 m, a 1.2 m shell. */
export const FILTER_SHAPE = { dia: 2.8, shell: 1.2 } as const;
/** The ideal balance tank, and the ideal pool turned with its short side along the row (w along the row, d deep). */
export const TANK_SHAPE = { w: 2.0, d: 1.4, h: 1.6 } as const;
export const POOL_SHAPE = { w: 2.2, d: 3.0, h: 1.9 } as const;
/** The ozone generator's cabinet: Trioxa's, after the BONa and Ozonia CFS-7 class (`ozone-plant.ts`'s cabinet). */
export const GENERATOR_SHAPE = { w: 1.6, d: 0.5, h: 1.95 } as const;
/** The contact tank (7 m³: Ø1.85 m, 2.6 m of water) and the destructor on its top. */
export const CONTACT_SHAPE = { dia: 1.85, h: 2.6 } as const;
export const DESTRUCTOR_SHAPE = {
  w: 0.5,
  d: 0.4,
  h: 0.6,
  above: 0.45,
} as const;
/** The carbon deozoniser: Ø2.5 m (about 37 m/h at the normal flow), 2.4 m tall. */
export const CARBON_SHAPE = { dia: 2.5, h: 2.4 } as const;
/** The UV unit (`createUvUnit`, after the VGE Pro 2000-219): its chamber along the row on its stands, its axis 0.8 m up, its panel on a stand in front. */
export const UV_SHAPE = { w: 1.6, d: 0.95, h: 1.55, axis: 0.8 } as const;
/** The booster pump (Grundflow, a small end-suction set). */
export const BOOSTER_SHAPE = { w: 0.95, d: 0.44, h: 0.9, axis: 0.6 } as const;

const filterNozzles = sandFilterGeometry(FILTER_SHAPE.dia, FILTER_SHAPE.shell);
const FILTER_BACK = 0.35 + FILTER_SHAPE.dia / 2;
const studTop = SOURCE_SHAPE.height + SOURCE_SHAPE.stud;

/** The hall's inside, m (`museum2`, the north-west corner: 15.4 × 13.4 m). */
export const HALL_WIDTH = 15.4;
export const HALL_DEPTH = 13.4;

/** The router's room: the hall up to its roof deck's services. */
export const ROOM = {
  halfX: HALL_WIDTH / 2,
  halfZ: HALL_DEPTH / 2,
  height: 5.2,
} as const;
const WEST = -ROOM.halfX;
const NORTH = -ROOM.halfZ;

/** The L's legs: along the west wall (read south to north) and along the north wall (read west to east). */
export type Leg = 'west' | 'north';

/** The row's slots, left to right: what stands in each, how wide along the row, and on which wall. */
const SLOTS: readonly { ids: MachineId[]; w: number; leg: Leg }[] = [
  { ids: ['air', 'mains'], w: 2 * SOURCE_SHAPE.radius + 0.2, leg: 'west' },
  { ids: ['tank', 'pump'], w: TANK_SHAPE.w, leg: 'west' },
  {
    ids: ['filter', 'feedTee', 'wasteTee', 'drain'],
    w: FILTER_SHAPE.dia,
    leg: 'west',
  },
  {
    ids: ['generator', 'sideTee', 'booster', 'injector', 'mixTee'],
    w: GENERATOR_SHAPE.w,
    leg: 'west',
  },
  { ids: ['contact', 'destructor'], w: CONTACT_SHAPE.dia, leg: 'north' },
  { ids: ['carbon'], w: CARBON_SHAPE.dia, leg: 'north' },
  { ids: ['uv'], w: UV_SHAPE.w, leg: 'north' },
  { ids: ['pool'], w: POOL_SHAPE.w, leg: 'north' },
];

/** The gap after each slot on its leg, m: the sizer's between machines, more where a line with fittings crosses it. */
const GAP_AFTER: readonly number[] = [
  0.3,
  0.9,
  MACHINE_GAP,
  0,
  MACHINE_GAP,
  MACHINE_GAP,
  1.25,
];

/** Where the north leg's first slot starts, x: past the ozone bay's reach from the west wall. */
export const NORTH_START = -3.75;

/** Each slot's centre along its wall: z on the west leg (left, south, is +z), x on the north (left, west, is −x). */
const SLOT_AT: readonly number[] = (() => {
  let z = ROOM.halfZ - END_CLEAR;
  let x = NORTH_START;
  return SLOTS.map((slot, k) => {
    const gap = GAP_AFTER[k] ?? 0;
    if (slot.leg === 'west') {
      const centre = z - slot.w / 2;
      z -= slot.w + gap;
      return Math.round(centre * 1000) / 1000;
    }
    const centre = x + slot.w / 2;
    x += slot.w + gap;
    return Math.round(centre * 1000) / 1000;
  });
})();
const slotOf = (id: MachineId) => SLOTS.findIndex((s) => s.ids.includes(id));

/** The wall a machine stands against. */
export const legOf = (id: MachineId): Leg => SLOTS[slotOf(id)].leg;

/** Each leg's extent along its wall, m: the west leg's z from its south end to its north, the north leg's x from its west end to its east. */
export const LEGS = (() => {
  const west = SLOTS.map((s, k) => ({ s, at: SLOT_AT[k] })).filter(
    (x) => x.s.leg === 'west',
  );
  const north = SLOTS.map((s, k) => ({ s, at: SLOT_AT[k] })).filter(
    (x) => x.s.leg === 'north',
  );
  return {
    west: {
      from: west[0].at + west[0].s.w / 2,
      to: west.at(-1)!.at - west.at(-1)!.s.w / 2,
    },
    north: {
      from: north[0].at - north[0].s.w / 2,
      to: north.at(-1)!.at + north.at(-1)!.s.w / 2,
    },
  };
})();

/** The plant's length along its walls, m: its slots, its gaps and its ends. */
export const PLANT_LENGTH =
  SLOTS.reduce((s, x) => s + x.w, 0) +
  GAP_AFTER.reduce((s, g) => s + g, 0) +
  2 * END_CLEAR;

/** The plant's floor: along the west wall to this x, along the north wall to this z; the rest is the visitors', where no pipe goes. */
export const PLANT_EDGE = -2.5;
export const PLANT_EDGE_NORTH = -2.4;
export const VISITOR_FLOOR = {
  minX: PLANT_EDGE,
  maxX: ROOM.halfX,
  minZ: PLANT_EDGE_NORTH,
  maxZ: ROOM.halfZ,
} as const;

/** Whether a point in plan is on the plant's floor (the L), not the visitors'. */
export const onPlantFloor = (x: number, z: number) =>
  x <= PLANT_EDGE + 1e-9 || z <= PLANT_EDGE_NORTH + 1e-9;

export interface MachinePlace {
  x: number;
  z: number;
  yaw: number;
}

/**
 * A place `along` m right of its slot's centre, its back `back` m from its
 * own centre, `forward` m off the wall's clearance, turned `yaw` as on the
 * west wall (facing east): on the north wall it is turned a quarter less,
 * to face south.
 */
function place(
  id: MachineId,
  back: number,
  along = 0,
  forward = 0,
  yaw = FACING_EAST,
): MachinePlace {
  const r = (v: number) => Math.round(v * 1000) / 1000;
  const at = SLOT_AT[slotOf(id)];
  const out = BEHIND + back + forward;
  return legOf(id) === 'west'
    ? { x: r(WEST + out), z: r(at - along), yaw }
    : { x: r(at + along), z: r(NORTH + out), yaw: yaw - Math.PI / 2 };
}

/**
 * The ozone bay, out from the wall's clearance: the generator against the
 * wall (0.3 m behind it), the booster in front of it, its shaft square to
 * the wall and its suction toward the side-stream tees further out, the
 * venturi above its discharge.
 */
const BAY = {
  tees: 2.9,
  booster: 2.9 - 0.15 - 1.1 - 0.5,
  injector: 2.9 - 0.15 - 1.1 - 0.75,
} as const;
/** Each machine's place, left to right. */
export const PLACES: Record<MachineId, MachinePlace> = {
  air: place('air', SOURCE_SHAPE.radius),
  mains: place('mains', SOURCE_SHAPE.radius, 0, 1.6),
  tank: place('tank', TANK_SHAPE.d / 2),
  // The pump in front of the tank, its shaft square to the wall, its suction toward the tank's outlet.
  pump: place('pump', 0, -0.3, TANK_SHAPE.d + 0.05 + 1.1 + 1.0, 0),
  filter: place('filter', FILTER_BACK),
  feedTee: place('feedTee', FILTER_BACK, -1.8, 1.85),
  // The drain in front of the filter's right, the waste tee over it.
  wasteTee: place('wasteTee', 0, 1.5, 4.3),
  drain: place('drain', 0, 1.5, 4.3),
  generator: place('generator', GENERATOR_SHAPE.d / 2 - 0.3),
  sideTee: place('sideTee', 0, 0, BAY.tees),
  booster: place('booster', 0, 0, BAY.booster, Math.PI),
  injector: place('injector', 0, 0, BAY.injector),
  mixTee: place('mixTee', 0, 0, BAY.tees),
  contact: place('contact', CONTACT_SHAPE.dia / 2),
  destructor: place('destructor', CONTACT_SHAPE.dia / 2),
  carbon: place('carbon', CARBON_SHAPE.dia / 2),
  uv: place('uv', 0.2, 0, 1.0),
  pool: place('pool', POOL_SHAPE.d / 2),
};

export interface Port {
  at: Vec3;
  out: Vec3;
}

/** The tees' heights, m. */
export const TEE_Y = {
  feedTee: 1.45,
  wasteTee: 2.0,
  sideTee: 0.6,
  mixTee: 3.0,
} as const;

/** Each machine's ports in its own frame (its front +z, its right +x). */
export const PORTS: Record<MachineId, Record<string, Port>> = {
  mains: { 'out-1': { at: [0, studTop, 0], out: [0, 1, 0] } },
  air: { 'out-1': { at: [0, studTop, 0], out: [0, 1, 0] } },
  tank: {
    makeup: { at: [-TANK_SHAPE.w / 2 - 0.05, 1.3, 0.3], out: [-1, 0, 0] },
    // The overflow comes in low at the back, from the pool along the wall.
    inlet: { at: [-0.4, 0.9, -TANK_SHAPE.d / 2 - 0.05], out: [0, 0, -1] },
    outlet: { at: [-0.3, 0.68, TANK_SHAPE.d / 2 + 0.05], out: [0, 0, 1] },
  },
  pump: {
    suction: { at: [-1.0, 0.68, 0], out: [-1, 0, 0] },
    discharge: { at: [-0.57, 1.26, 0.12], out: [0, 1, 0] },
  },
  feedTee: {
    in: { at: [0, 0.15 + TEE_Y.feedTee, 0], out: [0, 1, 0] },
    run: { at: [0.15, TEE_Y.feedTee, 0], out: [1, 0, 0] },
    branch: { at: [0, TEE_Y.feedTee - 0.15, 0], out: [0, -1, 0] },
  },
  filter: {
    inlet: {
      at: [
        filterNozzles.inlet.x,
        filterNozzles.inlet.y,
        filterNozzles.inlet.flange,
      ],
      out: [0, 0, 1],
    },
    'backwash-out': {
      at: [
        -filterNozzles.inlet.x,
        filterNozzles.inlet.y,
        filterNozzles.inlet.flange,
      ],
      out: [0, 0, 1],
    },
    'backwash-in': {
      at: [
        -0.85,
        filterNozzles.outlet.y,
        -0.35 + Math.sqrt((FILTER_SHAPE.dia / 2) ** 2 - 0.85 ** 2) + 0.1,
      ],
      out: [0, 0, 1],
    },
    // The rinse from the underdrain's drain nozzle, low on the right.
    rinse: {
      at: [
        filterNozzles.drain.x,
        filterNozzles.drain.y,
        filterNozzles.drain.flange,
      ],
      out: [0, 0, 1],
    },
    outlet: {
      at: [
        filterNozzles.outlet.x,
        filterNozzles.outlet.y,
        filterNozzles.outlet.flange,
      ],
      out: [0, 0, 1],
    },
  },
  wasteTee: {
    run: { at: [0, TEE_Y.wasteTee + 0.15, 0], out: [0, 1, 0] },
    branch: { at: [0, TEE_Y.wasteTee, -0.15], out: [0, 0, -1] },
    out: { at: [0, TEE_Y.wasteTee - 0.15, 0], out: [0, -1, 0] },
  },
  drain: { 'in-1': { at: [0, studTop, 0], out: [0, 1, 0] } },
  // The side stream: off the main low at TE3, through the booster and up
  // through the venturi, back into the main high at TE4.
  sideTee: {
    in: { at: [-0.15, TEE_Y.sideTee, 0], out: [-1, 0, 0] },
    run: { at: [0, TEE_Y.sideTee + 0.15, 0], out: [0, 1, 0] },
    branch: { at: [0, TEE_Y.sideTee, -0.15], out: [0, 0, -1] },
  },
  mixTee: {
    run: { at: [0, TEE_Y.mixTee - 0.15, 0], out: [0, -1, 0] },
    branch: { at: [0, TEE_Y.mixTee, -0.15], out: [0, 0, -1] },
    out: { at: [0, TEE_Y.mixTee + 0.15, 0], out: [0, 1, 0] },
  },
  booster: {
    suction: { at: [-0.5, BOOSTER_SHAPE.axis, 0], out: [-1, 0, 0] },
    discharge: {
      at: [BAY.booster - BAY.injector, BOOSTER_SHAPE.h + 0.05, 0],
      out: [0, 1, 0],
    },
  },
  injector: {
    inlet: { at: [0, 2.0, 0], out: [0, -1, 0] },
    outlet: { at: [0, 2.45, 0], out: [0, 1, 0] },
    gas: { at: [0, 2.22, -0.12], out: [0, 0, -1] },
  },
  generator: {
    air: {
      at: [-GENERATOR_SHAPE.w / 2 + 0.2, GENERATOR_SHAPE.h + 0.05, 0],
      out: [0, 1, 0],
    },
    ozone: {
      at: [GENERATOR_SHAPE.w / 2 - 0.2, GENERATOR_SHAPE.h + 0.05, 0],
      out: [0, 1, 0],
    },
  },
  contact: {
    inlet: { at: [-0.4, CONTACT_SHAPE.h + 0.05, 0.3], out: [0, 1, 0] },
    outlet: { at: [0.5, 0.4, CONTACT_SHAPE.dia / 2 + 0.05], out: [0, 0, 1] },
    vent: { at: [0, CONTACT_SHAPE.h + 0.05, -0.2], out: [0, 1, 0] },
  },
  destructor: {
    inlet: {
      at: [0, CONTACT_SHAPE.h + DESTRUCTOR_SHAPE.above, -0.2],
      out: [0, -1, 0],
    },
  },
  carbon: {
    inlet: { at: [-0.6, 2.0, CARBON_SHAPE.dia / 2 + 0.05], out: [0, 0, 1] },
    outlet: { at: [0.6, 0.45, CARBON_SHAPE.dia / 2 + 0.05], out: [0, 0, 1] },
  },
  uv: {
    inlet: { at: [-UV_SHAPE.w / 2 - 0.05, UV_SHAPE.axis, 0], out: [-1, 0, 0] },
    outlet: { at: [UV_SHAPE.w / 2 + 0.05, UV_SHAPE.axis, 0], out: [1, 0, 0] },
  },
  pool: {
    return: { at: [-POOL_SHAPE.w / 2 - 0.05, 1.45, 0.6], out: [-1, 0, 0] },
    overflow: { at: [0.5, 0.35, -POOL_SHAPE.d / 2 - 0.05], out: [0, 0, -1] },
  },
};

const box = (w: number, d: number, h: number, y0 = 0) => ({
  min: [-w / 2, y0, -d / 2] as Vec3,
  max: [w / 2, y0 + h, d / 2] as Vec3,
});
const point = { min: [0, 0, 0] as Vec3, max: [0, 0, 0] as Vec3 };
const source = box(
  2 * SOURCE_SHAPE.radius,
  2 * SOURCE_SHAPE.radius,
  SOURCE_SHAPE.height,
);

/** Each machine's box in its own frame, for routing round and walking into. */
export const BOXES: Record<MachineId, { min: Vec3; max: Vec3 }> = {
  mains: source,
  air: source,
  tank: box(TANK_SHAPE.w, TANK_SHAPE.d, TANK_SHAPE.h),
  pump: { min: [-0.95, 0, -0.32], max: [0.95, 1.2, 0.3] },
  feedTee: point,
  filter: {
    min: [-FILTER_SHAPE.dia / 2, 0, -FILTER_BACK],
    max: [
      FILTER_SHAPE.dia / 2,
      filterNozzles.cy + FILTER_SHAPE.shell / 2 + FILTER_SHAPE.dia * 0.18 + 0.2,
      -0.35 + FILTER_SHAPE.dia / 2,
    ],
  },
  wasteTee: point,
  drain: source,
  generator: box(GENERATOR_SHAPE.w, GENERATOR_SHAPE.d, GENERATOR_SHAPE.h),
  sideTee: point,
  // Its volute under the venturi, its motor on beyond it, toward the generator.
  booster: {
    min: [-0.45, 0, -BOOSTER_SHAPE.d / 2],
    max: [0.9, BOOSTER_SHAPE.h, BOOSTER_SHAPE.d / 2],
  },
  injector: point,
  mixTee: point,
  contact: box(CONTACT_SHAPE.dia, CONTACT_SHAPE.dia, CONTACT_SHAPE.h),
  destructor: box(
    DESTRUCTOR_SHAPE.w,
    DESTRUCTOR_SHAPE.d,
    DESTRUCTOR_SHAPE.h,
    CONTACT_SHAPE.h + DESTRUCTOR_SHAPE.above,
  ),
  carbon: box(CARBON_SHAPE.dia, CARBON_SHAPE.dia, CARBON_SHAPE.h),
  uv: {
    min: [-UV_SHAPE.w / 2, 0, -0.2],
    max: [UV_SHAPE.w / 2, UV_SHAPE.h, UV_SHAPE.d - 0.2],
  },
  pool: box(POOL_SHAPE.w, POOL_SHAPE.d, POOL_SHAPE.h),
};

/** The points in their lines: not machines to route round. */
export const POINTS: readonly MachineId[] = [
  'feedTee',
  'wasteTee',
  'sideTee',
  'mixTee',
  'injector',
];

const round = (v: number) => Math.round(v * 1e4) / 1e4;
const turn = ([x, y, z]: Vec3, yaw: number): Vec3 => [
  x * Math.cos(yaw) + z * Math.sin(yaw),
  y,
  -x * Math.sin(yaw) + z * Math.cos(yaw),
];

/** A point of a machine's frame in the hall. */
export function inHall(id: MachineId, p: Vec3): Vec3 {
  const at = PLACES[id];
  const [x, y, z] = turn(p, at.yaw);
  return [round(at.x + x), round(y), round(at.z + z)];
}

/** A machine's port in the hall. */
export function portInHall(id: MachineId, port: string): Port {
  const p = PORTS[id][port];
  if (!p) throw new Error(`${id} has no port ${port}`);
  const out = turn(p.out, PLACES[id].yaw).map(round) as unknown as Vec3;
  return { at: inHall(id, p.at), out };
}

/** A machine's box in the hall. */
export function boxInHall(id: MachineId): { min: Vec3; max: Vec3 } {
  const b = BOXES[id];
  const corners = [inHall(id, b.min), inHall(id, b.max)];
  return {
    min: [0, 1, 2].map((k) =>
      Math.min(corners[0][k], corners[1][k]),
    ) as unknown as Vec3,
    max: [0, 1, 2].map((k) =>
      Math.max(corners[0][k], corners[1][k]),
    ) as unknown as Vec3,
  };
}

/** Each bore's outside diameter, m: PVC-U for the water, PTFE-lined stainless for the gas. */
export const OD: Record<25 | 50 | 65 | 150, number> = {
  25: 0.032,
  50: 0.06,
  65: 0.076,
  150: 0.16,
};

/** What stands on a line, and how far from the last it stands, m. */
const SPACING = {
  'isolating-valve': 0.36,
  'non-return-valve': 0.32,
  flowmeter: 0.5,
  gauge: 0.3,
  analyser: 0.4,
  'sight-glass': 0.36,
} as const;
type Spaced = keyof typeof SPACING;
const FIRST = 0.32;

export interface PlacedItem {
  id: string;
  kind: Spaced;
  edge: LinkId;
  at: Vec3;
  along: Vec3;
}

export interface HallLine {
  edge: LinkId;
  od: number;
  pipe: 'pvc-pressure' | 'ozone-gas';
  points: Vec3[];
}

export interface Hall2Room {
  expansion: Expansion;
  lines: HallLine[];
  items: PlacedItem[];
  regions: RouterRegion[];
  problems: string[];
  /** What the walker cannot walk into: the machines and the low pipes, in the hall's frame. */
  solids: { minX: number; maxX: number; minZ: number; maxZ: number }[];
}

/** An instrument set into a line, and its kind there. */
const inlineKind = (i: Instrument): Spaced | null =>
  i.kind === 'dissolved-ozone'
    ? 'analyser'
    : i.kind === 'sight-glass'
      ? 'sight-glass'
      : null;

function itemsOf(expansion: Expansion, edge: LinkId) {
  const along = expansion.along.get(edge) ?? [];
  const fit = (f: { id: string; kind: string }) => ({
    id: f.id,
    kind: f.kind as Spaced,
  });
  const source = along.filter((f) => f.end === 'source').map(fit);
  const target = along
    .filter((f) => f.end === 'target')
    .reverse()
    .map(fit);
  // An instrument on a line stands by the machine whose water it reads: at the line's source.
  for (const i of INSTRUMENTS) {
    const kind = inlineKind(i);
    if (i.edge === edge && kind) source.push({ id: i.id, kind });
  }
  return { source, target };
}

function reach(things: readonly { kind: Spaced }[]) {
  if (!things.length) return 0.3;
  return FIRST + things.reduce((s, t) => s + SPACING[t.kind], 0) + 0.1;
}

const length = (points: readonly Vec3[]) =>
  points
    .slice(1)
    .reduce(
      (s, p, k) =>
        s +
        Math.hypot(
          p[0] - points[k][0],
          p[1] - points[k][1],
          p[2] - points[k][2],
        ),
      0,
    );

function facing(
  a: { at: Vec3; outward: Vec3 },
  b: { at: Vec3; outward: Vec3 },
): boolean {
  const d: Vec3 = [b.at[0] - a.at[0], b.at[1] - a.at[1], b.at[2] - a.at[2]];
  const len = Math.hypot(...d);
  if (len < 1e-6) return false;
  const u = d.map((v) => v / len);
  const along = u[0] * a.outward[0] + u[1] * a.outward[1] + u[2] * a.outward[2];
  const back = u[0] * b.outward[0] + u[1] * b.outward[1] + u[2] * b.outward[2];
  return along > 0.9999 && back < -0.9999;
}

const isGas = (edge: LinkId) =>
  LINKS.find((l) => l.id === edge)!.medium === 'air';

/** Lines laid first: the widest and longest, then the most fitted. */
const PRIORITY: Partial<Record<LinkId, number>> = {
  overflow: 9,
  returnMain: 8.5,
  toCarbon: 8,
  toContact: 7.9,
  filtered: 7.8,
  airFeed: 7,
  rinse: 8.2,
};

/** Low pipes the walker cannot pass under, as footprints. */
export function lowPipeFootprints(lines: readonly HallLine[], below = 2.0) {
  const out: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  for (const l of lines)
    for (let k = 1; k < l.points.length; k++) {
      const a = l.points[k - 1];
      const b = l.points[k];
      if (Math.min(a[1], b[1]) > below) continue;
      const r = l.od / 2 + 0.05;
      out.push({
        minX: Math.min(a[0], b[0]) - r,
        maxX: Math.max(a[0], b[0]) + r,
        minZ: Math.min(a[2], b[2]) - r,
        maxZ: Math.max(a[2], b[2]) + r,
      });
    }
  return out;
}

/** Lay out and plumb Hall 2. */
export function plumbHall2(): Hall2Room {
  const expansion = hall2Expansion();
  const regions: RouterRegion[] = [
    {
      min: [VISITOR_FLOOR.minX, 0, VISITOR_FLOOR.minZ],
      max: [VISITOR_FLOOR.maxX, ROOM.height, VISITOR_FLOOR.maxZ],
      forbids: { runs: true },
    },
  ];
  const machines = (Object.keys(PLACES) as MachineId[]).filter(
    (id) => !POINTS.includes(id),
  );
  const obstacles = machines.map((id) => boxInHall(id));
  const requests: RouterLine[] = LINKS.map((l) => {
    const dn = LINK_DN[l.id];
    const things = itemsOf(expansion, l.id);
    const start = portInHall(l.sourceId as MachineId, l.sourcePort);
    const end = portInHall(l.targetId as MachineId, l.targetPort);
    return {
      id: l.id,
      start: { at: start.at, outward: start.out },
      end: { at: end.at, outward: end.out },
      od: OD[dn],
      joint: (isGas(l.id) ? 'thread' : 'socket') as PipeJoint,
      price: dn / 100,
      priority: PRIORITY[l.id] ?? dn / 100,
      startStraight: reach(things.source),
      endStraight: reach(things.target),
    };
  });
  // Ports facing each other on one line are joined straight.
  const straight = requests.filter((q) => facing(q.start, q.end));
  const fixed = straight.map((q) => ({
    name: q.id,
    points: [q.start.at, q.end.at],
    od: q.od,
    joint: q.joint,
  }));
  const routed = routeVoxelLines(
    { ...ROOM, regions, obstacles },
    requests.filter((q) => !straight.includes(q)),
    fixed,
  );
  for (const q of straight) routed.routes.set(q.id, [q.start.at, q.end.at]);
  const problems = [...routed.problems];
  const lines: HallLine[] = [];
  const items: PlacedItem[] = [];
  for (const l of LINKS) {
    const points = routed.routes.get(l.id);
    if (!points) {
      problems.push(`${l.id}: not routed`);
      continue;
    }
    lines.push({
      edge: l.id,
      od: OD[LINK_DN[l.id]],
      pipe: isGas(l.id) ? 'ozone-gas' : 'pvc-pressure',
      points,
    });
    const total = length(points);
    const things = itemsOf(expansion, l.id);
    for (const [end, list] of [
      ['source', things.source],
      ['target', things.target],
    ] as const) {
      let d = FIRST;
      list.forEach((thing, k) => {
        if (k > 0) d += SPACING[thing.kind] / 2 + SPACING[list[k - 1].kind] / 2;
        const { at, along } = pointAlong(
          points,
          end === 'source' ? d : total - d,
        );
        items.push({
          id: thing.id,
          kind: thing.kind,
          edge: l.id,
          at: at.map(round) as unknown as Vec3,
          along: along.map(round) as unknown as Vec3,
        });
      });
    }
  }
  const solids = [
    ...obstacles.map((b) => ({
      minX: b.min[0],
      maxX: b.max[0],
      minZ: b.min[2],
      maxZ: b.max[2],
    })),
    ...lowPipeFootprints(lines),
  ];
  return { expansion, lines, items, regions, problems, solids };
}

/** Every clash between the hall's pipes, as sentences (none for a sound layout). */
export function hall2PipeClashes(room: Hall2Room): string[] {
  return pipeClashes(
    room.lines.map((l) => ({
      name: l.edge,
      points: l.points,
      od: l.od,
      joint: (l.pipe === 'pvc-pressure' ? 'socket' : 'thread') as PipeJoint,
    })),
  ).map((c) => JSON.stringify(c));
}

/** The sizer's estimate for the hall's plant (`room-sizer.ts`), one storey, for comparison with the row's length. */
export function sizerEstimate(): RoomSize {
  const items = (Object.keys(PLACES) as MachineId[])
    .filter((id) => !POINTS.includes(id) && id !== 'destructor')
    .map((id) => {
      const b = BOXES[id];
      return {
        w: b.max[0] - b.min[0],
        d: b.max[2] - b.min[2],
        h: b.max[1] - b.min[1],
      };
    });
  return sizeRoom(items, { storeys: 1, doors: 2 });
}

/** A fitting of the schematic by its id. */
export const fittingOf = (id: string): HallFitting | undefined =>
  FITTINGS.find((f) => f.id === id);
