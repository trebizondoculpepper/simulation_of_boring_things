import {
  FITTINGS,
  LINKS,
  LINK_DN,
  chemicalOf,
  hall9Expansion,
} from '../../../game/plant/museum-9-plant';
import type {
  HallFitting,
  LinkId,
  MachineId,
} from '../../../game/plant/museum-9-plant';
import type { Expansion } from '../../../game/plant/plumbing-expansion';
import { routeVoxelLines } from '../../components/core/logic/voxel-router';
import type {
  RouterLine,
  RouterRegion,
} from '../../components/core/logic/voxel-router';
import { pipeClashes } from '../../components/core/logic/pipe-route';
import type { PipeJoint, Vec3 } from '../../components/core/logic/pipe-route';
import { pointAlong } from './source-sink-plumbing';
import { hallColumns, hallInterior, hallOrigin } from './museum-plan';
import {
  BOILER,
  BOXES as HALL1_BOXES,
  HX_PLINTH,
  PORTS as HALL1_PORTS,
} from './museum-1-layout';
import {
  BOXES as HALL2_BOXES,
  FILTER_SHAPE,
  PORTS as HALL2_PORTS,
  TANK_SHAPE,
} from './museum-2-layout';
import {
  BOXES as HALL3_BOXES,
  DAY_TANK,
  PANEL_Y,
  PLINTH,
  POOL_SHAPE,
  POOL_WATER,
  PORTS as HALL3_PORTS,
} from './museum-3-layout';

export { BOILER, DAY_TANK, FILTER_SHAPE, HX_PLINTH, PANEL_Y, PLINTH };
export { POOL_SHAPE, POOL_WATER, TANK_SHAPE };

/**
 * Hall 9's plant, laid out (107e): the finale's 24 × 14 m hall (23.4 ×
 * 13.4 m inside), the route through it east to west, from Hall 8's
 * archway to the doorway into Hall 0. Along the north (courtyard) wall,
 * left to right as a visitor facing it reads it (rule 5): the heat, its
 * gas main, pressurisation unit, boiler and flue, primary pump and bypass
 * tees, and the exchanger; then the water, the sand filter with its nest,
 * tees and drain, the pump, its basket strainer and the balance tank, and
 * the pool on the right; the return main runs overhead from the exchanger
 * back past the sample tapping and the two injection points to the pool.
 * Along the south (street) wall's east half, the chemistry, facing north:
 * the stores, day tanks and metering pumps, the sample panel with its CX-7
 * controller and drain; their tubes cross the hall overhead. The desk
 * stands in the south-west corner by the way out, the closing wall beside
 * it. Each machine's ports and box are its view's, as Halls 1 to 3 have
 * them (imported); every pipe is routed by the voxel router between its
 * machines' ports, clear of the visitors' floor below 3 m and of the
 * columns and the hall's title; each fitting set in its line in the
 * plumber's order. Pure; metres, in the hall's own frame (north −z).
 */

export const interior = (() => {
  const i = hallInterior('museum9');
  const o = hallOrigin('museum9');
  return {
    minX: i.minX - o.x,
    maxX: i.maxX - o.x,
    minZ: i.minZ - o.z,
    maxZ: i.maxZ - o.z,
  };
})();

export const NORTH = interior.minZ;
export const SOUTH = interior.maxZ;
const W = interior.minX;
const E = interior.maxX;

export const ROOM = {
  halfX: Math.max(-W, E),
  halfZ: Math.max(-NORTH, SOUTH),
  height: 4.5,
} as const;

/** The plant's floor along the north wall, and the chemistry's along the south; between them, the visitors'. */
export const PLANT_EDGE = NORTH + 4.2;
export const CHEM_EDGE = SOUTH - 1.6;
/** Pipes may cross the visitors' floor only above this. */
export const OVERHEAD = 3.0;
/** Where the chemistry's tubes and the sample line may cross the hall, overhead (the owner, 2026-10-28: no pipes hanging out over the room). */
export const CROSSING = { minX: 2.0, maxX: 7.6 } as const;
/** The desk's place in the south-west corner, its front (+z of its frame) north, toward the visitor. */
export const DESK = {
  x: W + 2.5,
  z: SOUTH - 0.55,
  yaw: Math.PI,
  w: 4.6,
} as const;
/** The fault pedestal with its scoreboard, beside the desk. */
export const PEDESTAL = { x: W + 5.55, z: SOUTH - 1.9, yaw: Math.PI } as const;
/** The hall's title vinyl high on the street wall (`museum-hall.ts`), kept clear of pipes. */
export const TITLE = { minX: 0.4, maxX: 6.8, minY: 2.3, maxY: 4.9 } as const;

export interface MachinePlace {
  x: number;
  z: number;
  yaw: number;
  y?: number;
}

const BACK = NORTH + 0.05;
const S = Math.PI;
const MAIN_Y = 2.7;
const CHEM_Z = SOUTH - 0.6;

/** Each machine's place. */
export const PLACES: Record<MachineId, MachinePlace> = {
  gasMain: { x: W + 2.6, z: NORTH + 1.7, yaw: 0 },
  pressurisation: { x: W + 0.75, z: NORTH + 2.6, yaw: 0 },
  boiler: { x: W + 1.3, z: BACK + BOILER.d / 2, yaw: 0 },
  atmosphere: { x: W + 1.3, z: BACK + BOILER.d / 2, yaw: 0 },
  primaryPump: { x: W + 3.6, z: NORTH + 0.5, yaw: S },
  flowTee: { x: W + 5.1, z: NORTH + 1.4, yaw: 0 },
  returnTee: { x: W + 5.1, z: NORTH + 1.4, yaw: 0 },
  hx: { x: W + 6.2, z: NORTH + 0.5, yaw: 0 },
  hxTeeIn: { x: W + 6.9, z: NORTH + 1.5, yaw: 0, y: 3.3 },
  hxTeeOut: { x: W + 6.9, z: NORTH + 1.5, yaw: 0, y: 3.9 },
  wasteTee: { x: W + 10.8, z: NORTH + 3.5, yaw: 0 },
  drain: { x: W + 10.8, z: NORTH + 3.5, yaw: 0 },
  filter: { x: W + 9.1, z: BACK + 1.75, yaw: 0 },
  feedTee: { x: W + 6.9, z: NORTH + 3.9, yaw: 0 },
  poolPump: { x: W + 12.4, z: NORTH + 1.1, yaw: S },
  strainer: { x: W + 14.05, z: NORTH + 1.1, yaw: S },
  balanceTank: { x: W + 16.7, z: BACK + TANK_SHAPE.d / 2, yaw: 0 },
  sampleTee: { x: W + 18.3, z: NORTH + 0.4, yaw: 0, y: MAIN_Y },
  hypoInjection: { x: W + 18.9, z: NORTH + 0.4, yaw: 0, y: MAIN_Y },
  acidInjection: { x: W + 19.5, z: NORTH + 0.4, yaw: 0, y: MAIN_Y },
  pool: { x: E - 1.4, z: NORTH + 1.4, yaw: 0 },
  hypoStore: { x: E - 1.9, z: CHEM_Z, yaw: S },
  hypoTank: { x: E - 2.9, z: CHEM_Z, yaw: S },
  hypoPump: { x: E - 3.9, z: CHEM_Z - 0.1, yaw: S },
  acidStore: { x: E - 5.2, z: CHEM_Z, yaw: S },
  acidTank: { x: E - 6.2, z: CHEM_Z, yaw: S },
  acidPump: { x: E - 7.2, z: CHEM_Z - 0.1, yaw: S },
  sampleCell: { x: E - 8.9, z: SOUTH, yaw: S, y: PANEL_Y },
  sampleDrain: { x: E - 9.65, z: SOUTH - 0.35, yaw: S },
};

export interface Port {
  at: Vec3;
  out: Vec3;
}

/** A tee or injection point in a run along x: in from −x, on to +x, its branch down (a tee) or up (a dose). */
const runPoint = (branch: 'down' | 'up', name = 'branch') => ({
  in: { at: [-0.15, 0, 0] as Vec3, out: [-1, 0, 0] as Vec3 },
  [branch === 'down' ? 'run' : 'out']: {
    at: [0.15, 0, 0] as Vec3,
    out: [1, 0, 0] as Vec3,
  },
  [name]: {
    at: [0, branch === 'down' ? -0.15 : 0.15, 0] as Vec3,
    out: [0, branch === 'down' ? -1 : 1, 0] as Vec3,
  },
});

/** Each machine's ports in its own frame, its view's (Halls 1 to 3's, imported) or this hall's own. */
export const PORTS: Record<MachineId, Record<string, Port>> = {
  gasMain: HALL1_PORTS.gasMain,
  boiler: HALL1_PORTS.boiler,
  atmosphere: HALL1_PORTS.atmosphere,
  pressurisation: HALL1_PORTS.pressurisation,
  primaryPump: HALL1_PORTS.primaryPump,
  flowTee: HALL1_PORTS.flowTee,
  returnTee: HALL1_PORTS.returnTee,
  hx: HALL1_PORTS.hx,
  hxTeeIn: {
    in: { at: [0.15, 0, 0], out: [1, 0, 0] },
    run: { at: [-0.15, 0, 0], out: [-1, 0, 0] },
    branch: { at: [0, 0.15, 0], out: [0, 1, 0] },
  },
  hxTeeOut: {
    run: { at: [-0.15, 0, 0], out: [-1, 0, 0] },
    branch: { at: [0, -0.15, 0], out: [0, -1, 0] },
    out: { at: [0.15, 0, 0], out: [1, 0, 0] },
  },
  wasteTee: HALL2_PORTS.wasteTee,
  drain: { in: HALL2_PORTS.drain['in-1'] },
  filter: HALL2_PORTS.filter,
  feedTee: HALL2_PORTS.feedTee,
  poolPump: HALL2_PORTS.pump,
  strainer: {
    in: { at: [-0.3, 0.68, 0], out: [-1, 0, 0] },
    out: { at: [0.3, 0.68, 0], out: [1, 0, 0] },
  },
  balanceTank: {
    inlet: { at: [TANK_SHAPE.w / 2 + 0.05, 1.0, 0], out: [1, 0, 0] },
    outlet: HALL2_PORTS.tank.outlet,
  },
  sampleTee: runPoint('down'),
  hypoInjection: runPoint('up', 'dose'),
  acidInjection: runPoint('up', 'dose'),
  pool: {
    overflow: { at: [-POOL_SHAPE.w / 2 - 0.05, 1.5, 0.3], out: [-1, 0, 0] },
    inlet: { at: [-0.6, POOL_SHAPE.h + 0.1, -0.6], out: [0, 1, 0] },
  },
  hypoStore: HALL3_PORTS.hypoStore,
  hypoTank: HALL3_PORTS.hypoTank,
  hypoPump: HALL3_PORTS.hypoPump,
  acidStore: HALL3_PORTS.acidStore,
  acidTank: HALL3_PORTS.acidTank,
  acidPump: HALL3_PORTS.acidPump,
  sampleCell: HALL3_PORTS.sampleCell,
  sampleDrain: HALL3_PORTS.drain,
};

const point = { min: [0, 0, 0] as Vec3, max: [0, 0, 0] as Vec3 };

/** Each machine's box in its own frame. */
export const BOXES: Record<MachineId, { min: Vec3; max: Vec3 }> = {
  gasMain: HALL1_BOXES.gasMain,
  boiler: HALL1_BOXES.boiler,
  atmosphere: point,
  pressurisation: HALL1_BOXES.pressurisation,
  primaryPump: HALL1_BOXES.primaryPump,
  flowTee: point,
  returnTee: point,
  hx: HALL1_BOXES.hx,
  hxTeeIn: point,
  hxTeeOut: point,
  wasteTee: point,
  drain: HALL2_BOXES.drain,
  filter: HALL2_BOXES.filter,
  feedTee: point,
  poolPump: HALL2_BOXES.pump,
  strainer: { min: [-0.25, 0, -0.2], max: [0.25, 0.95, 0.2] },
  balanceTank: HALL2_BOXES.tank,
  sampleTee: point,
  hypoInjection: point,
  acidInjection: point,
  pool: {
    min: [-POOL_SHAPE.w / 2, 0, -POOL_SHAPE.d / 2],
    max: [POOL_SHAPE.w / 2, POOL_SHAPE.h, POOL_SHAPE.d / 2],
  },
  hypoStore: HALL3_BOXES.hypoStore,
  hypoTank: HALL3_BOXES.hypoTank,
  hypoPump: HALL3_BOXES.hypoPump,
  acidStore: HALL3_BOXES.acidStore,
  acidTank: HALL3_BOXES.acidTank,
  acidPump: HALL3_BOXES.acidPump,
  sampleCell: HALL3_BOXES.sampleCell,
  sampleDrain: HALL3_BOXES.drain,
};

/** Points in their lines, and the sky: not machines to route round. */
export const POINTS: readonly MachineId[] = [
  'atmosphere',
  'flowTee',
  'returnTee',
  'hxTeeIn',
  'hxTeeOut',
  'wasteTee',
  'feedTee',
  'sampleTee',
  'hypoInjection',
  'acidInjection',
];

const round = (v: number) => Math.round(v * 1e4) / 1e4;
const turn = ([x, y, z]: Vec3, yaw: number): Vec3 => [
  x * Math.cos(yaw) + z * Math.sin(yaw),
  y,
  -x * Math.sin(yaw) + z * Math.cos(yaw),
];

export function inHall(id: MachineId, p: Vec3): Vec3 {
  const place = PLACES[id];
  const [x, y, z] = turn(p, place.yaw);
  return [round(place.x + x), round((place.y ?? 0) + y), round(place.z + z)];
}

export function portInHall(id: MachineId, port: string): Port {
  const p = PORTS[id][port];
  if (!p) throw new Error(`${id} has no port ${port}`);
  const out = turn(p.out, PLACES[id].yaw).map(round) as unknown as Vec3;
  return { at: inHall(id, p.at), out };
}

export function boxInHall(id: MachineId): { min: Vec3; max: Vec3 } {
  const b = BOXES[id];
  const c = [inHall(id, b.min), inHall(id, b.max)];
  return {
    min: [0, 1, 2].map((k) => Math.min(c[0][k], c[1][k])) as unknown as Vec3,
    max: [0, 1, 2].map((k) => Math.max(c[0][k], c[1][k])) as unknown as Vec3,
  };
}

/** Each bore's outside diameter, m. */
export const OD: Record<15 | 40 | 50 | 65 | 150 | 250, number> = {
  15: 0.022,
  40: 0.048,
  50: 0.06,
  65: 0.076,
  150: 0.16,
  250: 0.3,
};

const SPACING = {
  'isolating-valve': 0.36,
  'non-return-valve': 0.32,
  flowmeter: 0.5,
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

export type PipeKind =
  | 'pvc-pressure'
  | 'chemical-tube'
  | 'steel-screwed'
  | 'gas-steel'
  | 'flue';

export interface HallLine {
  edge: LinkId;
  od: number;
  pipe: PipeKind;
  chemical: 'hypochlorite' | 'acid' | null;
  points: Vec3[];
}

export interface Hall9Room {
  expansion: Expansion;
  lines: HallLine[];
  items: PlacedItem[];
  regions: RouterRegion[];
  problems: string[];
  solids: { minX: number; maxX: number; minZ: number; maxZ: number }[];
}

/** A link's pipe: PVC-U for the pool's water, steel for heating, gas steel, the flue's twin wall, PVC tube for sample and chemicals. */
export function pipeOf(id: LinkId): PipeKind {
  if (id === 'gas') return 'gas-steel';
  if (id === 'flue') return 'flue';
  const dn = LINK_DN[id];
  if (dn === 15) return 'chemical-tube';
  if (dn === 150) return 'pvc-pressure';
  return 'steel-screwed';
}

function itemsOf(expansion: Expansion, edge: LinkId) {
  const along = expansion.along.get(edge) ?? [];
  const fit = (f: { id: string; kind: string }) => ({
    id: f.id,
    kind: f.kind as Spaced,
  });
  return {
    source: along.filter((f) => f.end === 'source').map(fit),
    target: along
      .filter((f) => f.end === 'target')
      .reverse()
      .map(fit),
  };
}

const reach = (things: readonly { kind: Spaced }[]) =>
  things.length
    ? FIRST + things.reduce((s, t) => s + SPACING[t.kind], 0) + 0.1
    : 0.2;

const lengthOf = (points: readonly Vec3[]) =>
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

/** Lines laid first: the filter's crowded nest. */
const FIRST_LAID: Partial<Record<LinkId, number>> = {
  toUnderdrain: 4,
  toInlet: 3,
  rinse: 3,
  backwashOut: 2,
  filtered: 2,
  heated: 2.5,
  hypoDose: 2.4,
  acidDose: 2.3,
  sample: 2.2,
};

const GRAVITY: readonly LinkId[] = ['overflow', 'waste', 'sampleOut'];

let cached: Hall9Room | null = null;

/** Lay out and plumb Hall 9 (worked out once). */
export function plumbHall9(): Hall9Room {
  if (cached) return cached;
  const expansion = hall9Expansion();
  const regions: RouterRegion[] = [
    // The visitors' floor: crossed only overhead, and only in the
    // chemistry's corridor; everything else keeps to its plant zone.
    {
      min: [CROSSING.minX, 0, PLANT_EDGE],
      max: [CROSSING.maxX, OVERHEAD, CHEM_EDGE],
      forbids: { runs: true },
    },
    {
      min: [W, 0, PLANT_EDGE],
      max: [CROSSING.minX, ROOM.height, CHEM_EDGE],
      forbids: { runs: true },
    },
    {
      min: [CROSSING.maxX, 0, PLANT_EDGE],
      max: [E, ROOM.height, CHEM_EDGE],
      forbids: { runs: true },
    },
    {
      min: [W, 0, CHEM_EDGE],
      max: [E - 10.0, ROOM.height, SOUTH],
      forbids: { runs: true },
    },
    {
      min: [TITLE.minX, TITLE.minY, SOUTH - 0.6],
      max: [TITLE.maxX, TITLE.maxY, SOUTH],
      forbids: { runs: true },
    },
  ];
  const machines = (Object.keys(PLACES) as MachineId[]).filter(
    (id) => !POINTS.includes(id),
  );
  const columns = hallColumns('museum9').map((c) => ({
    min: [c.x - 0.3, 0, c.z - 0.3] as Vec3,
    max: [c.x + 0.3, ROOM.height, c.z + 0.3] as Vec3,
  }));
  const obstacles = [...machines.map((id) => boxInHall(id)), ...columns];
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
      joint: (dn === 15
        ? 'thread'
        : dn === 150
          ? 'socket'
          : 'weld') as PipeJoint,
      price: dn / 100,
      priority:
        (FIRST_LAID[l.id] ?? 0) +
        dn / 100 +
        (l.medium === 'chemical' ? 0 : 0.01),
      startStraight: reach(things.source),
      endStraight: reach(things.target),
      ...(GRAVITY.includes(l.id) ? { gravity: true as const } : {}),
    };
  });
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
      pipe: pipeOf(l.id),
      chemical: chemicalOf(l.id),
      points,
    });
    const total = lengthOf(points);
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
    ...obstacles
      .filter((b) => b.max[1] > 0.3 && b.min[1] < 2)
      .map((b) => ({
        minX: b.min[0],
        maxX: b.max[0],
        minZ: b.min[2],
        maxZ: b.max[2],
      })),
    ...lowPipeFootprints(lines),
  ];
  cached = { expansion, lines, items, regions, problems, solids };
  return cached;
}

export function hall9PipeClashes(room: Hall9Room): string[] {
  return pipeClashes(
    room.lines.map((l) => ({
      name: l.edge,
      points: l.points,
      od: l.od,
      joint: (l.pipe === 'pvc-pressure'
        ? 'socket'
        : l.pipe === 'chemical-tube'
          ? 'thread'
          : 'weld') as PipeJoint,
    })),
  ).map((c) => JSON.stringify(c));
}

/**
 * Whether the 24 × 14 m hall holds the plant: the north row's machines
 * between its end walls, clear of each other; the chemistry's row between
 * the desk's corner and the east wall.
 */
export function fitsHall(): boolean {
  const ids = (Object.keys(PLACES) as MachineId[]).filter(
    (id) => !POINTS.includes(id),
  );
  const boxes = ids.map((id) => ({ id, ...boxInHall(id) }));
  for (const b of boxes)
    if (b.min[0] < W - 1e-6 || b.max[0] > E + 1e-6) return false;
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (
        (a.id === 'drain' && b.id === 'wasteTee') ||
        (a.id === 'boiler' && b.id === 'atmosphere')
      )
        continue;
      if (
        a.min[0] < b.max[0] - 1e-6 &&
        b.min[0] < a.max[0] - 1e-6 &&
        a.min[2] < b.max[2] - 1e-6 &&
        b.min[2] < a.max[2] - 1e-6
      )
        return false;
    }
  return true;
}

export const fittingOf = (id: string): HallFitting | undefined =>
  FITTINGS.find((f) => f.id === id);
