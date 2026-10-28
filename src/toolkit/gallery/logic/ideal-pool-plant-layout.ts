import {
  FITTINGS,
  INSTRUMENTS,
  LINKS,
  LINK_DN,
  PLANT,
  idealPlantExpansion,
} from '../../../game/plant/ideal-pool-plant';
import type {
  Instrument,
  LinkId,
  MachineId,
  PlantFitting,
} from '../../../game/plant/ideal-pool-plant';
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
import type { PlantRoomLayout } from './plant-room-layout';
import { pointAlong } from './source-sink-plumbing';

/**
 * Dev51, the ideal pool plant's room (mission 106): the machines of the
 * schematic (`ideal-pool-plant.ts`) placed by hand in the water's order
 * along the north wall, facing the visitors' floor, each port where its
 * product has it; the pipes routed between those ports by the voxel
 * router, clear of the visitors' floor below head height and of every
 * machine; each fitting set into its line in the plumber's order (the
 * expansion's `along`), from the end it serves, and each thermometer on
 * its line. Pure; metres, the room's middle at the origin, y up, north −z.
 */

export const ROOM = { halfX: 9, halfZ: 6.5, height: 5.2 } as const;

/** Where the visitors walk: no pipe below head height over it. */
export const VISITOR_FLOOR = {
  minX: -4.9,
  maxX: ROOM.halfX,
  minZ: -2.0,
  maxZ: ROOM.halfZ,
  clear: 2.6,
} as const;

/** The filter: Ø2.8 m, a 1.2 m shell, its face toward the room. */
export const FILTER_SHAPE = { dia: 2.8, shell: 1.2 } as const;
/** The ideal pool and balance tank: open-topped vessels, sizes in their own frames (w along x, d along z). */
export const POOL_SHAPE = { w: 3.0, d: 2.2, h: 1.9 } as const;
export const TANK_SHAPE = { w: 2.0, d: 1.4, h: 1.6 } as const;
/** The plate heat exchanger's plinth. */
export const HX_PLINTH = 0.3;

export interface MachinePlace {
  x: number;
  z: number;
  yaw: number;
}

/** Each machine's place: the water's order along the north wall, the pool on the west. */
export const PLACES: Record<MachineId, MachinePlace> = {
  pool: { x: -6.9, z: 0.3, yaw: Math.PI / 2 },
  tank: { x: -6.6, z: -4.9, yaw: 0 },
  pump: { x: -2.6, z: -4.6, yaw: 0 },
  filter: { x: 0.9, z: -4.6, yaw: 0 },
  hx: { x: 5.7, z: -4.9, yaw: 0 },
  // The tees, between the filter and the exchanger.
  split: { x: 3.6, z: -4.78, yaw: 0 },
  join: { x: 3.6, z: -4.78, yaw: 0 },
  heat: { x: 7.6, z: -4.9, yaw: 0 },
  heatReturn: { x: 6.1, z: -5.95, yaw: 0 },
  // The backwash: the feed tee in the discharge's drop, the waste tee over the drain.
  dischargeTee: { x: -0.9, z: -2.75, yaw: 0 },
  wasteTee: { x: 3.05, z: -5.95, yaw: 0 },
  drain: { x: 3.05, z: -5.95, yaw: 0 },
};

export interface Port {
  at: Vec3;
  out: Vec3;
}

const filterNozzles = sandFilterGeometry(FILTER_SHAPE.dia, FILTER_SHAPE.shell);
/** A nozzle's flange on the filter's face at `x`, z in its frame. */
const nozzleZ = (x: number) =>
  -0.35 + Math.sqrt((FILTER_SHAPE.dia / 2) ** 2 - x * x) + 0.1;
/** The tees' centres' heights, m. */
export const TEE_Y = { dischargeTee: 1.45, wasteTee: 2.0 } as const;
const studTop = SOURCE_SHAPE.height + SOURCE_SHAPE.stud;

/** Each machine's ports in its own frame (`createEndSuctionPump`, `sandFilterGeometry`, `createPlateHeatExchanger`, the experimental source's studs). */
export const PORTS: Record<MachineId, Record<string, Port>> = {
  pool: {
    overflow: { at: [POOL_SHAPE.w / 2 + 0.05, 1.55, 0.3], out: [1, 0, 0] },
    return: { at: [-0.6, 1.45, POOL_SHAPE.d / 2 + 0.05], out: [0, 0, 1] },
  },
  tank: {
    inlet: { at: [-0.4, 1.4, TANK_SHAPE.d / 2 + 0.05], out: [0, 0, 1] },
    outlet: { at: [TANK_SHAPE.w / 2 + 0.05, 0.68, 0.3], out: [1, 0, 0] },
  },
  pump: {
    // Axial suction toward −x on the shaft's line, radial discharge up.
    suction: { at: [-1.0, 0.68, 0], out: [-1, 0, 0] },
    discharge: { at: [-0.57, 1.26, 0.12], out: [0, 1, 0] },
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
    // The rest of the five-valve nest: backwash out from the top, opposite
    // the inlet; backwash in to the underdrain beside the outlet; rinse to
    // waste from the underdrain on the right.
    'backwash-out': {
      at: [
        -filterNozzles.inlet.x,
        filterNozzles.inlet.y,
        filterNozzles.inlet.flange,
      ],
      out: [0, 0, 1],
    },
    'backwash-in': {
      at: [-0.85, filterNozzles.outlet.y, nozzleZ(-0.85)],
      out: [0, 0, 1],
    },
    rinse: {
      at: [0.85, filterNozzles.outlet.y, nozzleZ(0.85)],
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
  // The bypass tee low, its branch to the exchanger's secondary inlet; the return tee above it.
  split: {
    in: { at: [-0.15, 0.52, 0], out: [-1, 0, 0] },
    run: { at: [0, 0.67, 0], out: [0, 1, 0] },
    branch: { at: [0.15, 0.52, 0], out: [1, 0, 0] },
  },
  join: {
    run: { at: [0, 2.4, 0], out: [0, -1, 0] },
    branch: { at: [0.15, 2.55, 0], out: [1, 0, 0] },
    out: { at: [0, 2.7, 0], out: [0, 1, 0] },
  },
  // The frame plate's four ports, facing −x; on its plinth.
  hx: {
    'secondary-in': { at: [-0.2, HX_PLINTH + 0.22, 0.12], out: [-1, 0, 0] },
    'secondary-out': { at: [-0.2, HX_PLINTH + 0.884, 0.12], out: [-1, 0, 0] },
    'primary-in': { at: [-0.2, HX_PLINTH + 0.884, -0.12], out: [-1, 0, 0] },
    'primary-out': { at: [-0.2, HX_PLINTH + 0.22, -0.12], out: [-1, 0, 0] },
  },
  dischargeTee: {
    in: { at: [0, 0.15 + TEE_Y.dischargeTee, 0], out: [0, 1, 0] },
    run: { at: [0.15, TEE_Y.dischargeTee, 0], out: [1, 0, 0] },
    branch: { at: [0, TEE_Y.dischargeTee - 0.15, 0], out: [0, -1, 0] },
  },
  wasteTee: {
    run: { at: [0, TEE_Y.wasteTee + 0.15, 0], out: [0, 1, 0] },
    branch: { at: [0, TEE_Y.wasteTee, 0.15], out: [0, 0, 1] },
    out: { at: [0, TEE_Y.wasteTee - 0.15, 0], out: [0, -1, 0] },
  },
  drain: { 'in-1': { at: [0, studTop, 0], out: [0, 1, 0] } },
  heat: { 'out-1': { at: [0, studTop, 0], out: [0, 1, 0] } },
  heatReturn: { 'in-1': { at: [0, studTop, 0], out: [0, 1, 0] } },
};

/** Each machine's box in its own frame, for routing round and walking into. */
export const BOXES: Record<MachineId, { min: Vec3; max: Vec3 }> = {
  pool: {
    min: [-POOL_SHAPE.w / 2, 0, -POOL_SHAPE.d / 2],
    max: [POOL_SHAPE.w / 2, POOL_SHAPE.h, POOL_SHAPE.d / 2],
  },
  tank: {
    min: [-TANK_SHAPE.w / 2, 0, -TANK_SHAPE.d / 2],
    max: [TANK_SHAPE.w / 2, TANK_SHAPE.h, TANK_SHAPE.d / 2],
  },
  pump: { min: [-0.95, 0, -0.32], max: [0.95, 1.2, 0.3] },
  filter: {
    min: [-FILTER_SHAPE.dia / 2, 0, -0.35 - FILTER_SHAPE.dia / 2],
    max: [
      FILTER_SHAPE.dia / 2,
      filterNozzles.cy + FILTER_SHAPE.shell / 2 + FILTER_SHAPE.dia * 0.18 + 0.2,
      -0.35 + FILTER_SHAPE.dia / 2,
    ],
  },
  split: { min: [0, 0, 0], max: [0, 0, 0] },
  join: { min: [0, 0, 0], max: [0, 0, 0] },
  hx: { min: [-0.05, 0, -0.3], max: [1.12, HX_PLINTH + 1.1, 0.3] },
  heat: {
    min: [-SOURCE_SHAPE.radius, 0, -SOURCE_SHAPE.radius],
    max: [SOURCE_SHAPE.radius, SOURCE_SHAPE.height, SOURCE_SHAPE.radius],
  },
  heatReturn: {
    min: [-SOURCE_SHAPE.radius, 0, -SOURCE_SHAPE.radius],
    max: [SOURCE_SHAPE.radius, SOURCE_SHAPE.height, SOURCE_SHAPE.radius],
  },
  dischargeTee: { min: [0, 0, 0], max: [0, 0, 0] },
  wasteTee: { min: [0, 0, 0], max: [0, 0, 0] },
  drain: {
    min: [-SOURCE_SHAPE.radius, 0, -SOURCE_SHAPE.radius],
    max: [SOURCE_SHAPE.radius, SOURCE_SHAPE.height, SOURCE_SHAPE.radius],
  },
};

/** The tees: points in their lines, not machines to route round. */
export const TEES: readonly MachineId[] = [
  'split',
  'join',
  'dischargeTee',
  'wasteTee',
];

const round = (v: number) => Math.round(v * 1e4) / 1e4;
const turn = ([x, y, z]: Vec3, yaw: number): Vec3 => [
  x * Math.cos(yaw) + z * Math.sin(yaw),
  y,
  -x * Math.sin(yaw) + z * Math.cos(yaw),
];

/** A point of a machine's frame in the room. */
export function inRoom(id: MachineId, p: Vec3): Vec3 {
  const place = PLACES[id];
  const [x, y, z] = turn(p, place.yaw);
  return [round(place.x + x), round(y), round(place.z + z)];
}

/** A machine's port in the room: where it is and which way it faces. */
export function portInRoom(id: MachineId, port: string): Port {
  const p = PORTS[id][port];
  if (!p) throw new Error(`${id} has no port ${port}`);
  const out = turn(p.out, PLACES[id].yaw).map(round) as unknown as Vec3;
  return { at: inRoom(id, p.at), out };
}

/** A machine's box in the room. */
export function boxInRoom(id: MachineId): { min: Vec3; max: Vec3 } {
  const b = BOXES[id];
  const corners = [
    inRoom(id, [b.min[0], b.min[1], b.min[2]]),
    inRoom(id, [b.max[0], b.max[1], b.max[2]]),
  ];
  return {
    min: [0, 1, 2].map((k) =>
      Math.min(corners[0][k], corners[1][k]),
    ) as unknown as Vec3,
    max: [0, 1, 2].map((k) =>
      Math.max(corners[0][k], corners[1][k]),
    ) as unknown as Vec3,
  };
}

/** Each bore's outside diameter, m: PVC-U for pool water, steel for the heating. */
export const OD: Record<40 | 100 | 150, number> = {
  150: 0.16,
  100: 0.11,
  40: 0.048,
};

/** How far from its port each fitting or instrument stands, metres, in the order from it outward. */
const SPACING: Record<
  | 'isolating-valve'
  | 'non-return-valve'
  | 'flowmeter'
  | 'thermometer'
  | 'sight-glass',
  number
> = {
  'isolating-valve': 0.36,
  'non-return-valve': 0.32,
  flowmeter: 0.5,
  thermometer: 0.3,
  'sight-glass': 0.4,
};
/** What stands on a line. */
type Spaced = keyof typeof SPACING;
/** The first fitting's centre from its port. */
const FIRST = 0.32;

export interface PlacedItem {
  /** A fitting's id, or an instrument's. */
  id: string;
  kind: PlantFitting['kind'] | 'thermometer' | 'sight-glass';
  edge: LinkId;
  at: Vec3;
  /** The pipe's way through it there, in the way the water flows. */
  along: Vec3;
}

export interface PlantLine {
  edge: LinkId;
  od: number;
  pipe: 'pvc-pressure' | 'lagged-heating';
  heating: boolean;
  points: Vec3[];
}

export interface IdealPlantRoom {
  layout: PlantRoomLayout;
  expansion: Expansion;
  lines: PlantLine[];
  items: PlacedItem[];
  regions: RouterRegion[];
  problems: string[];
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

/** A link's things from each end, in order outward: its fittings (the plumber's order) and its thermometer. */
function itemsOf(expansion: Expansion, edge: LinkId) {
  const along = expansion.along.get(edge) ?? [];
  const source = along.filter((f) => f.end === 'source');
  const target = along.filter((f) => f.end === 'target').reverse();
  const thermometer = INSTRUMENTS.filter(
    (i): i is Instrument & { edge: LinkId } =>
      (i.kind === 'temperature' || i.kind === 'sight-glass') && i.edge === edge,
  );
  // A thermometer goes on the line's far end from the machine whose water it reads.
  const atTarget =
    edge === 'suction' || edge === 'primaryFlow' || edge === 'returnMain';
  const t = thermometer.map((i) => ({
    id: i.id,
    kind: (i.kind === 'sight-glass' ? 'sight-glass' : 'thermometer') as Spaced,
  }));
  return {
    source: [
      ...source.map((f) => ({ id: f.id, kind: f.kind as Spaced })),
      ...(atTarget ? [] : t),
    ],
    target: [
      ...target.map((f) => ({ id: f.id, kind: f.kind as Spaced })),
      ...(atTarget ? t : []),
    ],
  };
}

/** The straight a line needs out of an end for its things there. */
function reach(things: readonly { kind: keyof typeof SPACING }[]) {
  if (!things.length) return 0.3;
  return FIRST + things.reduce((s, t) => s + SPACING[t.kind], 0) + 0.1;
}

/** Lines laid first: the widest, then those with most fittings. */
const PRIORITY: Partial<Record<LinkId, number>> = {
  overflow: 10,
  suction: 9,
  discharge: 8,
  filtered: 7,
  bypass: 6.5,
  hxIn: 6.4,
  hxOut: 6.3,
  returnMain: 5,
};

/** Whether two ports face each other along one straight line. */
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

/** Where the walker cannot go: under a pipe that runs below head height, a footprint along it. */
export function lowPipeFootprints(lines: readonly PlantLine[], below = 2.0) {
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

/** Lay out and plumb the room. */
export function plumbIdealPlantRoom(): IdealPlantRoom {
  const expansion = idealPlantExpansion();
  const regions: RouterRegion[] = [
    {
      min: [VISITOR_FLOOR.minX, 0, VISITOR_FLOOR.minZ],
      max: [VISITOR_FLOOR.maxX, VISITOR_FLOOR.clear, VISITOR_FLOOR.maxZ],
      forbids: { runs: true },
    },
  ];
  const machines = (Object.keys(PLACES) as MachineId[]).filter(
    (id) => !TEES.includes(id),
  );
  const obstacles = machines.map((id) => boxInRoom(id));
  const requests: RouterLine[] = LINKS.map((l) => {
    const dn = LINK_DN[l.id];
    const things = itemsOf(expansion, l.id);
    const heating = l.id === 'primaryFlow' || l.id === 'primaryReturn';
    const start = portInRoom(l.sourceId as MachineId, l.sourcePort);
    const end = portInRoom(l.targetId as MachineId, l.targetPort);
    return {
      id: l.id,
      start: { at: start.at, outward: start.out },
      end: { at: end.at, outward: end.out },
      od: OD[dn],
      joint: (heating ? 'thread' : 'socket') as PipeJoint,
      price: dn / 100,
      priority: PRIORITY[l.id] ?? dn / 100,
      startStraight: reach(things.source),
      endStraight: reach(things.target),
      ...(heating ? { insulation: 0.025 } : {}),
      ...(l.id === 'overflow' ? { gravity: true as const } : {}),
    };
  });
  // Ports facing each other on one line are joined straight (the suction,
  // the bypass): the router is given them as runs already laid.
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
  const lines: PlantLine[] = [];
  const items: PlacedItem[] = [];
  for (const l of LINKS) {
    const points = routed.routes.get(l.id);
    if (!points) {
      problems.push(`${l.id}: not routed`);
      continue;
    }
    const heating = l.id === 'primaryFlow' || l.id === 'primaryReturn';
    lines.push({
      edge: l.id,
      od: OD[LINK_DN[l.id]],
      pipe: heating ? 'lagged-heating' : 'pvc-pressure',
      heating,
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
  return {
    layout: {
      halfX: ROOM.halfX,
      halfZ: ROOM.halfZ,
      height: ROOM.height,
      places: [],
      solids,
    },
    expansion,
    lines,
    items,
    regions,
    problems,
  };
}

/** Every clash between the room's pipes, as sentences (none for a sound room). */
export function plantPipeClashes(room: IdealPlantRoom): string[] {
  return pipeClashes(
    room.lines.map((l) => ({
      name: l.edge,
      points: l.points,
      od: l.od,
      joint: l.heating ? 'thread' : 'socket',
      ...(l.heating ? { insulation: 0.025 } : {}),
    })),
  ).map((c) => JSON.stringify(c));
}

/** The fittings, by id, for the scene. */
export const fittingOf = (id: string) => FITTINGS.find((f) => f.id === id);
export { PLANT };

/**
 * A run with a gap cut out of it from `from` to `to` metres along it, for
 * an instrument that takes the pipe's place (a glass rotameter, whose tube
 * the pipe would hide): the lengths either side, each with two points or
 * more.
 */
export function cutLine(
  points: readonly Vec3[],
  from: number,
  to: number,
): Vec3[][] {
  const total = length(points);
  const piece = (a: number, b: number): Vec3[] => {
    if (b - a < 1e-6) return [];
    const out: Vec3[] = [pointAlong(points, a).at];
    let walked = 0;
    for (let k = 1; k < points.length; k++) {
      const p = points[k - 1];
      const q = points[k];
      walked += Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      if (walked > a + 1e-9 && walked < b - 1e-9) out.push(q);
    }
    out.push(pointAlong(points, b).at);
    return out;
  };
  return [
    piece(0, Math.max(0, from)),
    piece(Math.min(total, to), total),
  ].filter((p) => p.length >= 2);
}

/** How far along its line a placed item stands, metres. */
export function distanceAlong(points: readonly Vec3[], at: Vec3): number {
  let best = Infinity;
  let bestD = 0;
  let walked = 0;
  for (let k = 1; k < points.length; k++) {
    const p = points[k - 1];
    const q = points[k];
    const seg = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
    if (seg === 0) continue;
    const u = Math.max(
      0,
      Math.min(
        1,
        ((at[0] - p[0]) * (q[0] - p[0]) +
          (at[1] - p[1]) * (q[1] - p[1]) +
          (at[2] - p[2]) * (q[2] - p[2])) /
          (seg * seg),
      ),
    );
    const c = [0, 1, 2].map((i) => p[i] + (q[i] - p[i]) * u);
    const dist = Math.hypot(c[0] - at[0], c[1] - at[1], c[2] - at[2]);
    if (dist < best) {
      best = dist;
      bestD = walked + u * seg;
    }
    walked += seg;
  }
  return bestD;
}
