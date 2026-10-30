import {
  FITTINGS,
  LINKS,
  LINK_DN,
  chemicalOf,
  hall3Expansion,
} from '../../../game/plant/museum-3-dosing';
import type {
  HallFitting,
  LinkId,
  MachineId,
} from '../../../game/plant/museum-3-dosing';
import type { Expansion } from '../../../game/plant/plumbing-expansion';
import { SOURCE_SHAPE } from '../../../game/plant/experimental-source';
import { routeVoxelLines } from '../../components/core/logic/voxel-router';
import type {
  RouterLine,
  RouterRegion,
} from '../../components/core/logic/voxel-router';
import { pipeClashes } from '../../components/core/logic/pipe-route';
import type { PipeJoint, Vec3 } from '../../components/core/logic/pipe-route';
import { pointAlong } from './source-sink-plumbing';
import { columnKeepOut, hallInterior, hallOrigin } from './museum-plan';

/**
 * Hall 3's plant, laid out (107c): along the hall's street (north) wall,
 * read left to right by a visitor facing it (rule 5): the hypochlorite's
 * store, day tank and pump on the west, then the acid's, kept apart; the
 * sample cell and its controller on the wall in the middle; the balance
 * tank, the circulation pump and the pool on the east, the pool on the
 * right. The return main runs overhead past the sample tapping and the two
 * injection points to the pool; the dose lines run along the wall to them.
 * Every pipe is routed by the voxel router between its machines' ports,
 * clear of the visitors' floor and the columns; each fitting set in its
 * line in the plumber's order. Every place is measured from the hall's own
 * walls (`hallInterior`), so it follows the hall's size. Pure; metres, in
 * the hall's own frame (its middle at the origin, y up, north −z).
 */

export const interior = (() => {
  const i = hallInterior('museum3');
  const o = hallOrigin('museum3');
  return {
    minX: i.minX - o.x,
    maxX: i.maxX - o.x,
    minZ: i.minZ - o.z,
    maxZ: i.maxZ - o.z,
  };
})();

const W = interior.minX;
const E = interior.maxX;
/** The north wall's face. */
export const NORTH = interior.minZ;

/** The router's room: the whole hall, up to under its roof's beams. */
export const ROOM = {
  halfX: Math.max(-W, E),
  halfZ: Math.max(-interior.minZ, interior.maxZ),
  height: 4.5,
} as const;

/** The plant's floor along the north wall; south of it, the visitors'. */
export const PLANT_DEPTH = 2.9;
export const PLANT_EDGE = NORTH + PLANT_DEPTH;

/** The ideal pool's vessel, the balance tank's, a day tank's (60 l: 0.4 m across, 0.6 m tall on its 0.12 m bund). */
export const POOL_SHAPE = { w: 2.4, d: 2.2, h: 1.9 } as const;
export const POOL_WATER = 1.7;
export const TANK_SHAPE = { w: 1.2, d: 1.2, h: 1.4 } as const;
export const DAY_TANK = { r: 0.2, h: 0.6, bund: 0.12 } as const;
/** The dosing pumps' plinths, m tall. */
export const PLINTH = 0.75;
/** The sample panel's middle above the floor, on the wall. */
export const PANEL_Y = 1.25;
/** The overhead return main's level. */
const MAIN_Y = 2.7;

export interface MachinePlace {
  x: number;
  z: number;
  yaw: number;
  /** Its height above the floor (a point in a line, a panel on the wall). */
  y?: number;
}

/**
 * Where the plant's west end starts (layout C, 112): both archways are now
 * at the hall's west end, the way on to Hall 4 in the north wall, so the
 * hypochlorite and the acid stand east of it, clear of its approach.
 */
export const DOOR_CLEAR = 5.0;
export const WEST = W + DOOR_CLEAR;

/** The middle's place: the sample cell, between the acid's pump and the balance tank. */
export const MIDDLE_X = (WEST + 6.7 + (E - 6.9)) / 2;

/** Each machine's place, west to east. */
export const PLACES: Record<MachineId, MachinePlace> = {
  hypoStore: { x: WEST + 0.7, z: NORTH + 0.6, yaw: 0 },
  hypoTank: { x: WEST + 1.8, z: NORTH + 0.6, yaw: 0 },
  hypoPump: { x: WEST + 2.9, z: NORTH + 0.7, yaw: 0 },
  acidStore: { x: WEST + 4.5, z: NORTH + 0.6, yaw: 0 },
  acidTank: { x: WEST + 5.6, z: NORTH + 0.6, yaw: 0 },
  acidPump: { x: WEST + 6.7, z: NORTH + 0.7, yaw: 0 },
  sampleCell: { x: MIDDLE_X, z: NORTH, yaw: 0, y: PANEL_Y },
  drain: { x: MIDDLE_X + 0.75, z: NORTH + 0.35, yaw: 0 },
  balanceTank: { x: E - 6.9, z: NORTH + 1.0, yaw: 0 },
  poolPump: { x: E - 4.6, z: NORTH + 1.0, yaw: 0 },
  sampleTee: { x: E - 3.6, z: NORTH + 0.5, yaw: 0, y: MAIN_Y },
  hypoInjection: { x: E - 3.0, z: NORTH + 0.5, yaw: 0, y: MAIN_Y },
  acidInjection: { x: E - 2.4, z: NORTH + 0.5, yaw: 0, y: MAIN_Y },
  pool: { x: E - 1.5, z: NORTH + 1.6, yaw: 0 },
};

export interface Port {
  at: Vec3;
  out: Vec3;
}

const studTop = SOURCE_SHAPE.height + SOURCE_SHAPE.stud;
const tankTop = DAY_TANK.bund + DAY_TANK.h;

/** Each machine's ports in its own frame. */
export const PORTS: Record<MachineId, Record<string, Port>> = {
  hypoStore: { 'out-1': { at: [0, studTop, 0], out: [0, 1, 0] } },
  acidStore: { 'out-1': { at: [0, studTop, 0], out: [0, 1, 0] } },
  hypoTank: {
    in: { at: [0, tankTop + 0.05, 0], out: [0, 1, 0] },
    out: { at: [DAY_TANK.r + 0.05, DAY_TANK.bund + 0.08, 0], out: [1, 0, 0] },
  },
  acidTank: {
    in: { at: [0, tankTop + 0.05, 0], out: [0, 1, 0] },
    out: { at: [DAY_TANK.r + 0.05, DAY_TANK.bund + 0.08, 0], out: [1, 0, 0] },
  },
  // The pump on its plinth: its suction tube out of the plinth's west face, its discharge up from its head.
  hypoPump: {
    suction: { at: [-0.25, PLINTH - 0.15, 0], out: [-1, 0, 0] },
    discharge: { at: [-0.08, PLINTH + 0.4, 0], out: [0, 1, 0] },
  },
  acidPump: {
    suction: { at: [-0.25, PLINTH - 0.15, 0], out: [-1, 0, 0] },
    discharge: { at: [-0.08, PLINTH + 0.4, 0], out: [0, 1, 0] },
  },
  // The sample panel on the wall (`createSamplePanel`): IN and OUT at its foot.
  sampleCell: {
    in: { at: [-0.27, -0.36, 0.04], out: [0, -1, 0] },
    out: { at: [0.27, -0.36, 0.04], out: [0, -1, 0] },
  },
  drain: { in: { at: [0, 0.12, 0], out: [0, 1, 0] } },
  balanceTank: {
    in: { at: [0, TANK_SHAPE.h + 0.05, 0], out: [0, 1, 0] },
    outlet: { at: [TANK_SHAPE.w / 2 + 0.05, 0.68, 0], out: [1, 0, 0] },
  },
  // The pump (`createEndSuctionPump`): axial suction toward −x, radial discharge up.
  poolPump: {
    suction: { at: [-1.0, 0.68, 0], out: [-1, 0, 0] },
    discharge: { at: [-0.57, 1.26, 0.12], out: [0, 1, 0] },
  },
  sampleTee: {
    in: { at: [-0.15, 0, 0], out: [-1, 0, 0] },
    run: { at: [0.15, 0, 0], out: [1, 0, 0] },
    branch: { at: [0, -0.15, 0], out: [0, -1, 0] },
  },
  hypoInjection: {
    in: { at: [-0.15, 0, 0], out: [-1, 0, 0] },
    out: { at: [0.15, 0, 0], out: [1, 0, 0] },
    dose: { at: [0, 0, -0.15], out: [0, 0, -1] },
  },
  acidInjection: {
    in: { at: [-0.15, 0, 0], out: [-1, 0, 0] },
    out: { at: [0.15, 0, 0], out: [1, 0, 0] },
    dose: { at: [0, 0, -0.15], out: [0, 0, -1] },
  },
  pool: {
    overflow: {
      at: [-POOL_SHAPE.w / 2 - 0.05, 1.5, -0.5],
      out: [-1, 0, 0],
    },
    inlet: { at: [-0.6, POOL_SHAPE.h + 0.1, -0.6], out: [0, 1, 0] },
  },
};

const box = (w: number, h: number, d: number, y0 = 0) => ({
  min: [-w / 2, y0, -d / 2] as Vec3,
  max: [w / 2, y0 + h, d / 2] as Vec3,
});

/** Each machine's box in its own frame, for routing round and walking into. */
export const BOXES: Record<MachineId, { min: Vec3; max: Vec3 }> = {
  hypoStore: box(
    SOURCE_SHAPE.radius * 2,
    SOURCE_SHAPE.height,
    SOURCE_SHAPE.radius * 2,
  ),
  acidStore: box(
    SOURCE_SHAPE.radius * 2,
    SOURCE_SHAPE.height,
    SOURCE_SHAPE.radius * 2,
  ),
  hypoTank: box(0.6, tankTop, 0.6),
  acidTank: box(0.6, tankTop, 0.6),
  hypoPump: box(0.4, PLINTH + 0.3, 0.4),
  acidPump: box(0.4, PLINTH + 0.3, 0.4),
  sampleCell: { min: [-0.3, -0.31, 0], max: [0.3, 0.31, 0.12] },
  drain: box(0.3, 0.05, 0.3),
  balanceTank: box(TANK_SHAPE.w, TANK_SHAPE.h, TANK_SHAPE.d),
  poolPump: { min: [-0.95, 0, -0.32], max: [0.95, 1.2, 0.3] },
  sampleTee: box(0, 0, 0),
  hypoInjection: box(0, 0, 0),
  acidInjection: box(0, 0, 0),
  pool: box(POOL_SHAPE.w, POOL_SHAPE.h, POOL_SHAPE.d),
};

/** The points in their lines: not machines to route round. */
export const POINTS: readonly MachineId[] = [
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

/** A point of a machine's frame in the hall. */
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

/** Each bore's outside diameter, m: PVC-U for the pool's water; PVC tube for sample and chemicals. */
export const OD: Record<15 | 150, number> = { 15: 0.02, 150: 0.16 };

const SPACING = {
  'isolating-valve': 0.3,
  'non-return-valve': 0.3,
  flowmeter: 0.5,
} as const;
type Spaced = keyof typeof SPACING;
const FIRST = 0.3;

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
  pipe: 'pvc-pressure' | 'chemical-tube';
  chemical: 'hypochlorite' | 'acid' | null;
  points: Vec3[];
}

export interface Hall3Room {
  expansion: Expansion;
  lines: HallLine[];
  items: PlacedItem[];
  regions: RouterRegion[];
  problems: string[];
  solids: { minX: number; maxX: number; minZ: number; maxZ: number }[];
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

/** Lines laid first: the widest, then the most fitted. */
const PRIORITY: Partial<Record<LinkId, number>> = {
  discharge: 9,
  returnA: 8.8,
  returnB: 8.7,
  returnC: 8.6,
  suction: 8.5,
  overflow: 8.4,
};

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

/** Lay out and plumb Hall 3. */
export function plumbHall3(): Hall3Room {
  const expansion = hall3Expansion();
  const regions: RouterRegion[] = [
    {
      min: [W, 0, PLANT_EDGE],
      max: [E, ROOM.height, interior.maxZ],
      forbids: { runs: true },
    },
  ];
  const machines = (Object.keys(PLACES) as MachineId[]).filter(
    (id) => !POINTS.includes(id),
  );
  // The columns, kept clear by a margin (`columnKeepOut`).
  const columns = columnKeepOut('museum3', ROOM.height);
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
      joint: (dn === 150 ? 'socket' : 'thread') as PipeJoint,
      price: dn / 100,
      priority: PRIORITY[l.id] ?? dn / 100,
      startStraight: reach(things.source),
      endStraight: reach(things.target),
      ...(l.id === 'overflow' || l.id === 'sampleDrain'
        ? { gravity: true as const }
        : {}),
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
    const dn = LINK_DN[l.id];
    lines.push({
      edge: l.id,
      od: OD[dn],
      pipe: dn === 150 ? 'pvc-pressure' : 'chemical-tube',
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
  return { expansion, lines, items, regions, problems, solids };
}

/** Every clash between the hall's pipes (none for a sound layout). */
export function hall3PipeClashes(room: Hall3Room): string[] {
  return pipeClashes(
    room.lines.map((l) => ({
      name: l.edge,
      points: l.points,
      od: l.od,
      joint: (l.pipe === 'pvc-pressure' ? 'socket' : 'thread') as PipeJoint,
    })),
  ).map((c) => JSON.stringify(c));
}

/** The hall is long enough for its row: the chemicals' 7.6 m from the west, the circulation's 7.6 m from the east, and the sample cell between. */
export const fitsHall = () => E - W >= 15.2 + 1.2;

export const fittingOf = (id: string): HallFitting | undefined =>
  FITTINGS.find((f) => f.id === id);

/**
 * Each station's lectern along the visitors' side of the plant (its x; all
 * stand at `PLANT_EDGE + 0.4`, facing south), each clear of the hall's
 * columns, which stand on the same line (2026-10-29: lecterns 2 and 7 had
 * stood inside columns).
 */
export const LECTERN_Z = PLANT_EDGE + 0.4;
export const LECTERNS: Record<number, number> = {
  1: E - 2.0,
  2: PLACES.sampleCell.x + 0.1,
  3: PLACES.sampleCell.x + 1.2,
  4: PLACES.hypoPump.x,
  5: PLACES.hypoTank.x,
  6: PLACES.sampleCell.x - 1.5,
  7: PLACES.acidTank.x,
};

/**
 * The DPD test kit's place on the lecterns' line: beside its own placard
 * (station 6), between it and The sample's, clear of every other lectern
 * and column (layout C squeezed the middle: the columns stand on this
 * line at x −6, 0 and 6).
 */
export const TEST_KIT_X = (LECTERNS[6] + LECTERNS[2]) / 2;
