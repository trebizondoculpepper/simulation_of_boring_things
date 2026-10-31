import {
  FITTINGS,
  INSTRUMENTS,
  LINKS,
  LINK_DN,
  hall1Expansion,
  isPrimary,
} from '../../../game/plant/museum-1-heating';
import type {
  Instrument,
  LinkId,
  MachineId,
  HallFitting,
} from '../../../game/plant/museum-1-heating';
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
 * Hall 1's plant, laid out (107a): the schematic's machines placed by hand
 * along the hall's street (west) wall in the process's order, the gas and
 * the boiler on the south (the visitor's left, facing them), the pool on
 * the north (the right), so that walking north from Hall 0 the visitor
 * walks with the flow (rule 5); every pipe routed between its machines'
 * ports by the voxel router, clear of the visitors' floor and the hall's
 * columns; each fitting set into its line in the plumber's order; the
 * flue straight up from the boiler to the roof deck. Pure; metres, in the
 * hall's own frame (its middle at the origin, y up, north −z).
 */

const interior = (() => {
  const i = hallInterior('museum1');
  const o = hallOrigin('museum1');
  return {
    minX: i.minX - o.x,
    maxX: i.maxX - o.x,
    minZ: i.minZ - o.z,
    maxZ: i.maxZ - o.z,
  };
})();

/** The router's room: the whole hall, up to its roof deck. */
export const ROOM = {
  halfX: interior.maxX,
  halfZ: interior.maxZ,
  height: 5.2,
} as const;

/** The plant's floor along the west wall; east of it, the visitors' floor, where no pipe goes. */
export const PLANT_EDGE = -2.5;
export const VISITOR_FLOOR = {
  minX: PLANT_EDGE,
  maxX: interior.maxX,
  minZ: interior.minZ,
  maxZ: interior.maxZ,
} as const;

/**
 * Layout C (112): both archways are now at the hall's west end, where the
 * plant stood along the street wall, so the whole exhibit stands turned
 * half round about the hall's middle (`STANDS`): the plant along the east
 * wall, the walk down the west side from archway to archway. Everything
 * here is as laid out; the exhibit turns it, and its routes with it.
 */
export const STANDS = { turn: Math.PI } as const;

/** A footprint as the exhibit stands, turned half round (`STANDS`). */
export const turnedHalfRound = <
  F extends { minX: number; maxX: number; minZ: number; maxZ: number },
>(
  f: F,
): F => ({ ...f, minX: -f.maxX, maxX: -f.minX, minZ: -f.maxZ, maxZ: -f.minZ });

/** The flue's terminal: through the roof deck, m. */
export const ROOF = 9.5;

/** The ideal pool's vessel. */
export const POOL_SHAPE = { w: 3.0, d: 2.2, h: 1.9 } as const;
/** The plate exchanger's plinth. */
export const HX_PLINTH = 0.3;
/** The boiler's cabinet (Remeha Gas 220 Ace): 800 wide, 1662 high, 657 deep. */
export const BOILER = { w: 0.8, h: 1.662, d: 0.657 } as const;

export interface MachinePlace {
  x: number;
  z: number;
  yaw: number;
}

const studTop = SOURCE_SHAPE.height + SOURCE_SHAPE.stud;

/** Each machine's place, south (gas) to north (pool). */
export const PLACES: Record<MachineId, MachinePlace> = {
  gasMain: { x: -5.0, z: 6.1, yaw: 0 },
  boiler: { x: -5.4, z: 4.0, yaw: Math.PI / 2 },
  atmosphere: { x: -5.4, z: 4.0, yaw: Math.PI / 2 },
  pressurisation: { x: -7.15, z: 5.7, yaw: Math.PI / 2 },
  primaryPump: { x: -6.9, z: 2.4, yaw: -Math.PI / 2 },
  flowTee: { x: -4.2, z: 1.9, yaw: 0 },
  returnTee: { x: -4.2, z: 1.9, yaw: 0 },
  hx: { x: -5.0, z: 0.9, yaw: Math.PI },
  poolPump: { x: -4.8, z: -1.9, yaw: -Math.PI / 2 },
  pool: { x: -6.15, z: -5.3, yaw: 0 },
};

export interface Port {
  at: Vec3;
  out: Vec3;
}

const TEE_Y = { flow: 2.4, ret: 0.45 } as const;

/** Each machine's ports in its own frame. */
export const PORTS: Record<MachineId, Record<string, Port>> = {
  gasMain: { 'out-1': { at: [0, studTop, 0], out: [0, 1, 0] } },
  // On top, at the back (`createCondensingBoiler`): flue Ø250, flow and
  // return DN65, gas R2; and the fill's tapping.
  boiler: {
    flue: {
      at: [0, BOILER.h + 0.14, -BOILER.d / 2 + 0.2],
      out: [0, 1, 0],
    },
    flow: {
      at: [-0.27, BOILER.h + 0.12, -BOILER.d / 2 + 0.12],
      out: [0, 1, 0],
    },
    return: {
      at: [0.27, BOILER.h + 0.12, -BOILER.d / 2 + 0.12],
      out: [0, 1, 0],
    },
    gas: { at: [0.2, BOILER.h + 0.1, -BOILER.d / 2 + 0.36], out: [0, 1, 0] },
    fill: { at: [-0.2, BOILER.h + 0.04, 0.12], out: [0, 1, 0] },
  },
  atmosphere: {
    in: { at: [0, ROOF, -BOILER.d / 2 + 0.2], out: [0, -1, 0] },
  },
  // The pressurisation unit's pumped line, up from its cabinet.
  pressurisation: { out: { at: [0.55, 1.5, 0], out: [0, 1, 0] } },
  // The twin-head circulator's run (`createTwinHeadPump`): along x at 0.75 m.
  primaryPump: {
    suction: { at: [-0.75, 0.75, 0], out: [-1, 0, 0] },
    discharge: { at: [0.75, 0.75, 0], out: [1, 0, 0] },
  },
  flowTee: {
    in: { at: [0, TEE_Y.flow, 0.15], out: [0, 0, 1] },
    run: { at: [0, TEE_Y.flow, -0.15], out: [0, 0, -1] },
    branch: { at: [0, TEE_Y.flow - 0.15, 0], out: [0, -1, 0] },
  },
  returnTee: {
    run: { at: [0, TEE_Y.ret, -0.15], out: [0, 0, -1] },
    out: { at: [0, TEE_Y.ret, 0.15], out: [0, 0, 1] },
    branch: { at: [0, TEE_Y.ret + 0.15, 0], out: [0, 1, 0] },
  },
  // The frame plate's four ports, facing −x, on its plinth (`createPlateHeatExchanger`).
  hx: {
    'secondary-in': { at: [-0.2, HX_PLINTH + 0.22, 0.12], out: [-1, 0, 0] },
    'secondary-out': { at: [-0.2, HX_PLINTH + 0.884, 0.12], out: [-1, 0, 0] },
    'primary-in': { at: [-0.2, HX_PLINTH + 0.884, -0.12], out: [-1, 0, 0] },
    'primary-out': { at: [-0.2, HX_PLINTH + 0.22, -0.12], out: [-1, 0, 0] },
  },
  // The pump (`createEndSuctionPump`): axial suction toward −x, radial discharge up.
  poolPump: {
    suction: { at: [-1.0, 0.68, 0], out: [-1, 0, 0] },
    discharge: { at: [-0.57, 1.26, 0.12], out: [0, 1, 0] },
  },
  pool: {
    outlet: { at: [0.5, 0.68, POOL_SHAPE.d / 2 + 0.05], out: [0, 0, 1] },
    inlet: { at: [-0.9, 1.45, POOL_SHAPE.d / 2 + 0.05], out: [0, 0, 1] },
  },
};

/** Each machine's box in its own frame, for routing round and walking into. */
export const BOXES: Record<MachineId, { min: Vec3; max: Vec3 }> = {
  gasMain: {
    min: [-SOURCE_SHAPE.radius, 0, -SOURCE_SHAPE.radius],
    max: [SOURCE_SHAPE.radius, SOURCE_SHAPE.height, SOURCE_SHAPE.radius],
  },
  boiler: {
    min: [-BOILER.w / 2, 0, -BOILER.d / 2],
    max: [BOILER.w / 2, BOILER.h, BOILER.d / 2 + 0.05],
  },
  atmosphere: { min: [0, 0, 0], max: [0, 0, 0] },
  pressurisation: { min: [-0.68, 0, -0.33], max: [0.66, 1.3, 0.33] },
  primaryPump: { min: [-0.68, 0, -0.3], max: [0.68, 1.0, 0.3] },
  flowTee: { min: [0, 0, 0], max: [0, 0, 0] },
  returnTee: { min: [0, 0, 0], max: [0, 0, 0] },
  hx: { min: [-0.05, 0, -0.3], max: [1.12, HX_PLINTH + 1.1, 0.3] },
  poolPump: { min: [-0.95, 0, -0.32], max: [0.95, 1.2, 0.3] },
  pool: {
    min: [-POOL_SHAPE.w / 2, 0, -POOL_SHAPE.d / 2],
    max: [POOL_SHAPE.w / 2, POOL_SHAPE.h, POOL_SHAPE.d / 2],
  },
};

/** The points in their lines, and the sky: not machines to route round. */
export const POINTS: readonly MachineId[] = [
  'flowTee',
  'returnTee',
  'atmosphere',
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
  return [round(place.x + x), round(y), round(place.z + z)];
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

/** Each bore's outside diameter, m: PVC-U for the pool's water, steel for heating and gas, the flue's twin wall. */
export const OD: Record<15 | 40 | 50 | 65 | 150 | 250, number> = {
  15: 0.022,
  40: 0.048,
  50: 0.06,
  65: 0.076,
  150: 0.16,
  250: 0.3,
};

/** What stands on a line, and how far from the last it stands, m. */
const SPACING = {
  'isolating-valve': 0.36,
  'non-return-valve': 0.32,
  flowmeter: 0.5,
  thermometer: 0.3,
  gauge: 0.3,
  'flow-switch': 0.3,
  thermostat: 0.36,
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
  pipe: 'pvc-pressure' | 'lagged-heating' | 'steel-gas' | 'flue';
  points: Vec3[];
}

export interface Hall1Room {
  expansion: Expansion;
  lines: HallLine[];
  items: PlacedItem[];
  regions: RouterRegion[];
  problems: string[];
  /** What the walker cannot walk into: the machines and the low pipes, in the hall's frame. */
  solids: { minX: number; maxX: number; minZ: number; maxZ: number }[];
}

const instrumentKind = (i: Instrument): Spaced =>
  i.kind === 'temperature'
    ? 'thermometer'
    : i.kind === 'pressure'
      ? 'gauge'
      : i.kind;

/** The instruments on a line, and at which end each goes: by the machine whose water it reads. */
const INSTRUMENT_END: Record<string, 'source' | 'target'> = {
  'gas.pi': 'target',
  'hxIn.ti': 'target',
  'hxOut.ti': 'source',
  'boilerFlow.ti': 'source',
  'boilerReturn.ti': 'target',
  'poolDischarge.fs': 'target',
  'poolOut.tc': 'source',
};

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
  for (const i of INSTRUMENTS)
    if (i.edge === edge) {
      const thing = { id: i.id, kind: instrumentKind(i) };
      if (INSTRUMENT_END[i.id] === 'target') target.push(thing);
      else source.push(thing);
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

const pipeOf = (edge: LinkId): HallLine['pipe'] =>
  edge === 'flue'
    ? 'flue'
    : edge === 'gas'
      ? 'steel-gas'
      : isPrimary(edge)
        ? 'lagged-heating'
        : 'pvc-pressure';

/** Lines laid first: the widest, then the most fitted. */
const PRIORITY: Partial<Record<LinkId, number>> = {
  poolDischarge: 9,
  poolReturn: 8.5,
  gas: 7,
  primaryFlow: 6,
  primaryReturn: 5.9,
  primarySuction: 5.8,
  hxFlow: 5.7,
  hxReturn: 5.6,
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

/** Lay out and plumb Hall 1. */
export function plumbHall1(): Hall1Room {
  const expansion = hall1Expansion();
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
  // The columns, kept clear by a margin (`columnKeepOut`).
  const columns = columnKeepOut('museum1', ROOM.height);
  const obstacles = [...machines.map((id) => boxInHall(id)), ...columns];
  const requests: RouterLine[] = LINKS.map((l) => {
    const dn = LINK_DN[l.id];
    const things = itemsOf(expansion, l.id);
    const heating = isPrimary(l.id);
    const start = portInHall(l.sourceId as MachineId, l.sourcePort);
    const end = portInHall(l.targetId as MachineId, l.targetPort);
    return {
      id: l.id,
      start: { at: start.at, outward: start.out },
      end: { at: end.at, outward: end.out },
      od: OD[dn],
      joint: (l.id === 'poolOut' ||
      l.id === 'poolDischarge' ||
      l.id === 'poolReturn'
        ? 'socket'
        : 'thread') as PipeJoint,
      price: dn / 100,
      priority: PRIORITY[l.id] ?? dn / 100,
      startStraight: reach(things.source),
      endStraight: reach(things.target),
      ...(heating ? { insulation: 0.025 } : {}),
    };
  });
  // Ports facing each other on one line are joined straight: the flue,
  // the pool's suction, the bypass.
  const straight = requests.filter((q) => facing(q.start, q.end));
  const fixed = straight.map((q) => ({
    name: q.id,
    points: [q.start.at, q.end.at],
    od: q.od,
    joint: q.joint,
    ...(q.insulation ? { insulation: q.insulation } : {}),
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
export function hall1PipeClashes(room: Hall1Room): string[] {
  return pipeClashes(
    room.lines.map((l) => ({
      name: l.edge,
      points: l.points,
      od: l.od,
      joint: (l.pipe === 'pvc-pressure' ? 'socket' : 'thread') as PipeJoint,
      ...(l.pipe === 'lagged-heating' ? { insulation: 0.025 } : {}),
    })),
  ).map((c) => JSON.stringify(c));
}

/** A fitting of the schematic by its id. */
export const fittingOf = (id: string): HallFitting | undefined =>
  FITTINGS.find((f) => f.id === id);
