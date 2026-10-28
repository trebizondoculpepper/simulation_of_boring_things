import {
  FITTINGS,
  INSTRUMENTS,
  LINKS,
  LINK_DN,
  PUMPS,
  TANK,
  hall6Expansion,
  hasSuction,
  pumpId,
} from '../../../game/plant/museum-6-pumps';
import type {
  HallFitting,
  HallPump,
  LinkId,
  MachineId,
  PumpNo,
} from '../../../game/plant/museum-6-pumps';
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

/**
 * Hall 6's plant, laid out (107j). The ideal reservoir CW1 is a long
 * trough against the street (east) wall; the eleven pumps stand in a row
 * in front of it, smallest at the north (where the visitor comes in) to
 * the split-case showpiece at the south, each drawing straight from the
 * trough; each fill line rises from its pump to the overhead inlet header
 * HD1, which feeds the test tank TK1 standing in the hall's middle, west
 * of the column line; the tank's drain and overflow fall to the ideal
 * drain DR1, a gully at its foot. Each pump's RUN stand and plaque in
 * front of it. Sized from `hallInterior('museum6')`, so it follows the
 * hall's size. Pure; metres, the hall's own frame (middle at the origin,
 * y up, north −z).
 */

const interior = (() => {
  const i = hallInterior('museum6');
  const o = hallOrigin('museum6');
  return {
    minX: i.minX - o.x,
    maxX: i.maxX - o.x,
    minZ: i.minZ - o.z,
    maxZ: i.maxZ - o.z,
  };
})();
export const INTERIOR = interior;

export const ROOM = {
  halfX: interior.maxX,
  halfZ: interior.maxZ,
  height: 5.2,
} as const;

/** The trough: its depth from the east wall and its height. */
export const TROUGH = { d: 0.6, h: 1.05, gap: 0.05 } as const;
const TROUGH_FACE = interior.maxX - TROUGH.gap - TROUGH.d;
/** Where each pump's suction port stands: room for its valve in front of the trough. */
const SUCTION_X = TROUGH_FACE - 0.85;
/** The header: overhead, west of the pumps and east of the column line. */
export const HEADER = { x: 2.7, y: 3.7, od: 0.32 } as const;
/** The tank's place, on the visitors' floor's west side. */
export const TANK_AT = { x: -1.6, z: 0 } as const;
export const TANK_TOP = TANK.stand + 1.25;
/** The drain gully, at the tank's foot. */
export const GULLY_AT = { x: -1.6, z: 1.7 } as const;

export interface MachinePlace {
  x: number;
  z: number;
  yaw: number;
}
export interface Port {
  at: Vec3;
  out: Vec3;
}

/** Each pump's shape in its own frame: suction toward +x (yaw 0), except the end-suction views (toward −x, turned round). */
interface PumpShape {
  /** Its width along the row (z), and how far it reaches along it beyond its place (the showpiece's motor). */
  w: number;
  ahead: number;
  yaw: number;
  suction?: Port;
  discharge: Port;
  box: { min: Vec3; max: Vec3 };
}

/** A dosing pump's stand: its top. */
export const DOSING_STAND = 0.9;

const shapeOf = (p: HallPump): PumpShape => {
  if (p.family === 'displacement')
    return {
      w: 0.55,
      ahead: 0,
      yaw: 0,
      suction: { at: [0.25, DOSING_STAND + 0.05, 0], out: [1, 0, 0] },
      discharge: { at: [-0.05, DOSING_STAND + 0.35, 0], out: [0, 1, 0] },
      box: { min: [-0.25, 0, -0.22], max: [0.25, DOSING_STAND + 0.3, 0.22] },
    };
  switch (p.node) {
    case 'mag-drive-pump':
      return {
        w: 0.6,
        ahead: 0,
        yaw: 0,
        suction: { at: [0.3, 0.25, 0], out: [1, 0, 0] },
        discharge: { at: [0.12, 0.5, 0], out: [0, 1, 0] },
        box: { min: [-0.4, 0, -0.18], max: [0.28, 0.42, 0.18] },
      };
    case 'submersible-pump':
      return {
        w: 0.6,
        ahead: 0,
        yaw: 0,
        discharge: { at: [0, TROUGH.h + 0.25, 0], out: [0, 1, 0] },
        box: { min: [0, 0, 0], max: [0, 0, 0] },
      };
    case 'spa-pump':
      return {
        w: 0.55,
        ahead: 0,
        yaw: 0,
        suction: { at: [0.3, 0.22, 0], out: [1, 0, 0] },
        discharge: { at: [-0.02, 0.5, 0], out: [0, 1, 0] },
        box: { min: [-0.3, 0, -0.16], max: [0.28, 0.42, 0.16] },
      };
    case 'twin-head-pump':
      return {
        w: 0.7,
        ahead: 0,
        yaw: 0,
        suction: { at: [0.75, 0.75, 0], out: [1, 0, 0] },
        discharge: { at: [-0.75, 0.75, 0], out: [-1, 0, 0] },
        box: { min: [-0.68, 0, -0.3], max: [0.68, 1.0, 0.3] },
      };
    case 'end-suction-pump':
      return {
        w: 0.85,
        ahead: 0,
        yaw: Math.PI,
        suction: { at: [-1.0, 0.68, 0], out: [-1, 0, 0] },
        discharge: { at: [-0.57, 1.26, 0.12], out: [0, 1, 0] },
        box: { min: [-0.95, 0, -0.4], max: [0.95, 1.2, 0.4] },
      };
    default:
      // The split case: its shaft along the row, its motor ahead (south).
      return {
        w: 1.2,
        ahead: 2.4,
        yaw: 0,
        suction: { at: [0.62, SPLIT.axis, 0], out: [1, 0, 0] },
        discharge: { at: [-0.62, SPLIT.axis, 0], out: [-1, 0, 0] },
        box: { min: [-0.62, 0, -0.6], max: [0.62, 1.5, 2.95] },
      };
  }
};

/** The showpiece's shaft height. */
export const SPLIT = { axis: 0.85 } as const;

export const SHAPES: Record<PumpNo, PumpShape> = Object.fromEntries(
  PUMPS.map((p) => [p.no, shapeOf(p)]),
) as Record<PumpNo, PumpShape>;

/** The place along the row of each pump, its x so its suction port meets the line before the trough. */
function placePumps(): Record<PumpNo, MachinePlace> {
  const start = interior.minZ + 1.0;
  const end = interior.maxZ - 0.8;
  const widths = PUMPS.map((p) => SHAPES[p.no].w + SHAPES[p.no].ahead);
  const used = widths.reduce((a, b) => a + b, 0);
  const gap = Math.max(0.2, (end - start - used) / (PUMPS.length - 1));
  const out = {} as Record<PumpNo, MachinePlace>;
  let z = start;
  for (const p of PUMPS) {
    const s = SHAPES[p.no];
    const zc = z + s.w / 2;
    z += s.w + s.ahead + gap;
    if (p.family === 'centrifugal' && p.submersible) {
      out[p.no] = { x: TROUGH_FACE + TROUGH.d / 2, z: zc, yaw: 0 };
      continue;
    }
    // The suction port's x in the hall, from its frame and yaw.
    const sx = s.suction!.at[0] * Math.cos(s.yaw);
    out[p.no] = { x: SUCTION_X - sx, z: zc, yaw: s.yaw };
  }
  return out;
}

const PUMP_PLACES = placePumps();

export const PLACES: Record<MachineId, MachinePlace> = {
  ...(Object.fromEntries(
    PUMPS.map((p) => [pumpId(p.no), PUMP_PLACES[p.no]]),
  ) as Record<`p${PumpNo}`, MachinePlace>),
  source: { x: TROUGH_FACE + TROUGH.d / 2, z: 0, yaw: 0 },
  header: { x: HEADER.x, z: 0, yaw: 0 },
  tank: { x: TANK_AT.x, z: TANK_AT.z, yaw: 0 },
  drain: { x: GULLY_AT.x, z: GULLY_AT.z, yaw: 0 },
};

const zOf = (no: PumpNo) => PUMP_PLACES[no].z;
/** The header's length along z, from the first pump's line to the last's. */
export const HEADER_SPAN = {
  minZ: Math.min(...PUMPS.map((p) => zOf(p.no))) - 0.3,
  maxZ: Math.max(...PUMPS.map((p) => zOf(p.no))) + 0.3,
};

const R = TANK.diameter / 2;

/** Each machine's ports, in its own frame. */
export const PORTS: Record<MachineId, Record<string, Port>> = {
  ...(Object.fromEntries(
    PUMPS.map((p) => {
      const s = SHAPES[p.no];
      return [
        pumpId(p.no),
        s.suction
          ? { suction: s.suction, discharge: s.discharge }
          : { discharge: s.discharge },
      ];
    }),
  ) as Record<`p${PumpNo}`, Record<string, Port>>),
  // The trough's outlets on its west face, one opposite each pump's suction.
  source: Object.fromEntries(
    PUMPS.filter(hasSuction).map((p) => {
      const s = SHAPES[p.no];
      return [
        `out-${p.no}`,
        {
          at: [-TROUGH.d / 2, s.suction!.at[1], zOf(p.no)] as Vec3,
          out: [-1, 0, 0] as Vec3,
        },
      ];
    }),
  ),
  // The header: an inlet on its east side opposite each pump; its outlet at its west.
  header: {
    ...Object.fromEntries(
      PUMPS.map((p) => [
        `in-${p.no}`,
        {
          at: [HEADER.od / 2, HEADER.y, zOf(p.no)] as Vec3,
          out: [1, 0, 0] as Vec3,
        },
      ]),
    ),
    out: { at: [-HEADER.od / 2, HEADER.y, 0], out: [-1, 0, 0] },
  },
  tank: {
    inlet: { at: [0, TANK_TOP + 0.15, 0], out: [0, 1, 0] },
    overflow: {
      at: [0.25, TANK.stand + TANK.overflowM, R + 0.15],
      out: [0, 0, 1],
    },
    drain: { at: [-0.25, 0.22, R + 0.15], out: [0, 0, 1] },
  },
  drain: {
    'in-1': { at: [0.25, 0.05, 0], out: [0, 1, 0] },
    'in-2': { at: [-0.25, 0.05, 0], out: [0, 1, 0] },
  },
};

export const BOXES: Record<MachineId, { min: Vec3; max: Vec3 }> = {
  ...(Object.fromEntries(
    PUMPS.map((p) => [pumpId(p.no), SHAPES[p.no].box]),
  ) as Record<`p${PumpNo}`, { min: Vec3; max: Vec3 }>),
  source: {
    min: [-TROUGH.d / 2, 0, interior.minZ + 0.4],
    max: [TROUGH.d / 2, TROUGH.h, interior.maxZ - 0.4],
  },
  header: {
    min: [-HEADER.od / 2, HEADER.y - HEADER.od / 2, HEADER_SPAN.minZ],
    max: [HEADER.od / 2, HEADER.y + HEADER.od / 2, HEADER_SPAN.maxZ],
  },
  tank: { min: [-R - 0.1, 0, -R - 0.1], max: [R + 0.1, TANK_TOP, R + 0.1] },
  drain: { min: [0, 0, 0], max: [0, 0, 0] },
};

/** Not obstacles to route round: the gully in the floor, the sump pump in the trough. */
export const POINTS: readonly MachineId[] = ['drain', 'p6'];

const round = (v: number) => Math.round(v * 1e4) / 1e4;
const turn = ([x, y, z]: Vec3, yaw: number): Vec3 => [
  x * Math.cos(yaw) + z * Math.sin(yaw),
  y,
  -x * Math.sin(yaw) + z * Math.cos(yaw),
];

export function inHall(id: MachineId, p: Vec3): Vec3 {
  const place = PLACES[id];
  const [x, y, z] = turn(p, place.yaw);
  return [round(place.x + x), round(y), round(place.z + z)];
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

/** Outside diameters, m. */
export const odOf = (dn: number) =>
  dn <= 6
    ? 0.008
    : ({ 25: 0.032, 40: 0.05, 65: 0.075, 150: 0.16, 200: 0.225, 250: 0.28, 300: 0.315 } as Record<number, number>)[dn] ?? dn / 900;

const SPACING = {
  'isolating-valve': 0.36,
  'non-return-valve': 0.32,
  flowmeter: 0.5,
} as const;
type Spaced = keyof typeof SPACING;
const FIRST = 0.32;
/** Fittings on the big lines take more room. */
const scale = (dn: number) => (dn >= 150 ? 1.6 : dn <= 6 ? 0.45 : 1);

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
  dn: number;
  pipe: 'pvc-pressure' | 'tube';
  points: Vec3[];
}

export interface Hall6Room {
  expansion: Expansion;
  lines: HallLine[];
  items: PlacedItem[];
  regions: RouterRegion[];
  problems: string[];
  solids: { minX: number; maxX: number; minZ: number; maxZ: number }[];
}

function itemsOf(expansion: Expansion, edge: string) {
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

function reach(things: readonly { kind: Spaced }[], dn: number) {
  if (!things.length) return 0.25;
  return (FIRST + things.reduce((s, t) => s + SPACING[t.kind], 0)) * scale(dn) + 0.1;
}

const lengthOf = (points: readonly Vec3[]) =>
  points
    .slice(1)
    .reduce(
      (s, p, k) =>
        s +
        Math.hypot(p[0] - points[k][0], p[1] - points[k][1], p[2] - points[k][2]),
      0,
    );

function facing(a: { at: Vec3; outward: Vec3 }, b: { at: Vec3; outward: Vec3 }) {
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

/** Where each pump's RUN stand and plaque stand: in front of it, on the visitors' side. */
export function standOf(no: PumpNo): { x: number; z: number } {
  const b = boxInHall(pumpId(no));
  const x = (no === 6 ? TROUGH_FACE : b.min[0]) - 0.55;
  return { x: Math.min(x, TROUGH_FACE - 0.55), z: PUMP_PLACES[no].z };
}

/** Lay out and plumb Hall 6. */
export function plumbHall6(): Hall6Room {
  const expansion = hall6Expansion();
  // No pipe runs low over the visitors' floor: west of the pumps, below 2.4 m, but round the tank.
  const westOfPumps = Math.min(...PUMPS.map((p) => boxInHall(pumpId(p.no)).min[0])) - 0.2;
  const regions: RouterRegion[] = [
    {
      min: [TANK_AT.x + 1.2, 0, interior.minZ],
      max: [westOfPumps, 2.4, interior.maxZ],
      forbids: { runs: true },
    },
  ];
  const machines = (Object.keys(PLACES) as MachineId[]).filter(
    (id) => !POINTS.includes(id),
  );
  const o = hallOrigin('museum6');
  const columns = hallColumns('museum6').map((c) => ({
    min: [c.x - o.x - 0.3, 0, c.z - o.z - 0.3] as Vec3,
    max: [c.x - o.x + 0.3, ROOM.height, c.z - o.z + 0.3] as Vec3,
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
      od: odOf(dn),
      joint: 'socket' as PipeJoint,
      price: dn / 100,
      priority: dn / 100,
      startStraight: reach(things.source, dn),
      endStraight: reach(things.target, dn),
      ...(l.id === 'overflow' || l.id === 'drainLine' ? { gravity: true as const } : {}),
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
      od: odOf(dn),
      dn,
      pipe: dn <= 6 ? 'tube' : 'pvc-pressure',
      points,
    });
    const total = lengthOf(points);
    const things = itemsOf(expansion, l.id);
    const sc = scale(dn);
    for (const [end, list] of [
      ['source', things.source],
      ['target', things.target],
    ] as const) {
      let d = FIRST * sc;
      list.forEach((thing, k) => {
        if (k > 0)
          d += (SPACING[thing.kind] / 2 + SPACING[list[k - 1].kind] / 2) * sc;
        const { at, along } = pointAlong(points, end === 'source' ? d : total - d);
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
      .filter((b) => b.min[1] < 2)
      .map((b) => ({ minX: b.min[0], maxX: b.max[0], minZ: b.min[2], maxZ: b.max[2] })),
    ...lowPipeFootprints(lines),
  ];
  return { expansion, lines, items, regions, problems, solids };
}

export function hall6PipeClashes(room: Hall6Room): string[] {
  return pipeClashes(
    room.lines.map((l) => ({
      name: l.edge,
      points: l.points,
      od: l.od,
      joint: 'socket' as PipeJoint,
    })),
  ).map((c) => JSON.stringify(c));
}

export const fittingOf = (id: string): HallFitting | undefined =>
  FITTINGS.find((f) => f.id === id);
export { INSTRUMENTS };
