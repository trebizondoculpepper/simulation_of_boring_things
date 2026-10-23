import {
  SOURCE_SHAPE,
  SUBSTANCES,
  createExperimentalSink,
  createExperimentalSource,
} from '../../../game/plant/experimental-source';
import type {
  SourceMedium,
  SourcePort,
  Substance,
} from '../../../game/plant/experimental-source';
import { STOREY } from '../../../game/plant/network/common';
import { expandForPlumbing } from '../../../game/plant/plumbing-expansion';
import type {
  Expansion,
  FittingKind,
  PlumbEdge,
  PlumbMedium,
} from '../../../game/plant/plumbing-expansion';
import { routeVoxelLines } from '../../components/core/logic/voxel-router';
import type {
  RouterLine,
  RouterRegion,
} from '../../components/core/logic/voxel-router';
import type { PipeJoint, Vec3 } from '../../components/core/logic/pipe-route';
import type { PlantRoomLayout } from './plant-room-layout';

/**
 * The source-to-sink room (Dev21; the owner, 2026-10-23): an experimental
 * source of every substance along the north wall, its sink across the room
 * on the south, each source joined to its sink by the plumber. The plumber
 * sets a valve into each end of every line (an isolator on power) and,
 * told to, leaves them all closed: open both, and the substance flows.
 *
 * The plumber's layers, as in Dev19: the graph (each source's `out-1` to
 * its sink's `in-1`), expanded with its fittings as nodes
 * (`plumbing-expansion.ts`); the lines routed overhead, clear of the
 * walkway, by the voxel router; each fitting placed on its line's straight
 * lead from its port. Pure.
 */

/** Centre to centre along a row, metres. */
export const PAIR_SPACING = 1.1;
/** The room's depth, wall to wall, and its height. */
export const ROOM_DEPTH = 9;
/** Two storeys (the owner, 2026-10-23). */
export const ROOM_HEIGHT = 2 * STOREY;
/** A cylinder's middle from its wall's inner face. */
const FROM_WALL = 0.8;
/** The walkway down the middle, kept clear below this height. */
export const WALKWAY_CLEAR = 2.5;
const WALKWAY_HALF = ROOM_DEPTH / 2 - 1.9;
/** How far along a line from its port each end's fitting sits, metres. */
export const FITTING_OFFSET = 0.3;

/** Each medium's pipe: its kind of pipe (`pipe-kinds.ts`), outside diameter and joint. */
export const LINE_PIPES: Record<
  SourceMedium,
  { kind: string; od: number; joint: PipeJoint }
> = {
  water: { kind: 'pvc-pressure', od: 0.05, joint: 'socket' },
  gas: { kind: 'steel-screwed', od: 0.0337, joint: 'thread' },
  chemical: { kind: 'abs-chemical', od: 0.032, joint: 'socket' },
  oil: { kind: 'steel-screwed', od: 0.0337, joint: 'thread' },
  // Power runs in steel conduit.
  power: { kind: 'steel-screwed', od: 0.025, joint: 'thread' },
};

export const sourceId = (s: Substance) => `exp.${s}`;
export const sinkId = (s: Substance) => `sink.${s}`;

const turn = (
  [x, y, z]: readonly number[],
  yaw: number,
): [number, number, number] => [
  x * Math.cos(yaw) + z * Math.sin(yaw),
  y,
  -x * Math.sin(yaw) + z * Math.cos(yaw),
];
const round = (v: number) => Math.round(v * 1e4) / 1e4;
const round3 = (v: readonly number[]): Vec3 => [
  round(v[0]),
  round(v[1]),
  round(v[2]),
];

/** A port in the room: where it is and which way it faces. */
function placed(
  port: SourcePort,
  place: { x: number; z: number; yaw: number },
) {
  const [x, y, z] = turn(port.at, place.yaw);
  return {
    at: [round(place.x + x), round(y), round(place.z + z)] as Vec3,
    outward: round3(turn(port.out, place.yaw)),
  };
}

/**
 * The room laid out: the sources (in `substances`' order, then the sinks)
 * along the north and south walls, each facing into the room (a source
 * yaw 0, a sink yaw π), its control port to the wall, its fluid ports up.
 */
export function layoutSourceSinkRoom(
  substances: readonly Substance[],
): PlantRoomLayout {
  const n = substances.length;
  const halfX = Math.max(6, (n * PAIR_SPACING) / 2 + 3);
  const halfZ = ROOM_DEPTH / 2;
  const xs = substances.map((_, i) => (i - (n - 1) / 2) * PAIR_SPACING);
  const r = SOURCE_SHAPE.radius;
  const north = -halfZ + 0.15 + FROM_WALL;
  const south = halfZ - 0.15 - FROM_WALL;
  const places = [
    ...xs.map((x) => ({ x, z: north, y: 0, yaw: 0 })),
    ...xs.map((x) => ({ x, z: south, y: 0, yaw: Math.PI })),
  ];
  return {
    halfX,
    halfZ,
    height: ROOM_HEIGHT,
    places,
    solids: places.map((p) => ({
      minX: p.x - r,
      maxX: p.x + r,
      minZ: p.z - r,
      maxZ: p.z + r,
    })),
  };
}

const plumbMedium = (m: SourceMedium): PlumbMedium => m;

export interface SourceSinkLine {
  /** The base link, source to sink. */
  edge: string;
  substance: Substance;
  medium: SourceMedium;
  od: number;
  pipe: string;
  joint: PipeJoint;
  points: Vec3[];
}

export interface PlacedFitting {
  id: string;
  kind: FittingKind;
  medium: PlumbMedium;
  normally: 'open' | 'closed';
  /** The line it is set into. */
  edge: string;
  /** Its middle, and its pipe's way through it there. */
  at: Vec3;
  along: Vec3;
}

export interface SourceSinkPlumbing {
  layout: PlantRoomLayout;
  /** The expanded graph: the sources, sinks and fittings, and their links. */
  expansion: Expansion;
  lines: SourceSinkLine[];
  fittings: PlacedFitting[];
  walkway: RouterRegion;
  problems: string[];
}

/** The point `d` metres along a polyline from its start, and its direction there. */
export function pointAlong(points: readonly Vec3[], d: number) {
  let left = d;
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1];
    const b = points[k];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (len === 0) continue;
    const dir: Vec3 = [
      (b[0] - a[0]) / len,
      (b[1] - a[1]) / len,
      (b[2] - a[2]) / len,
    ];
    if (left <= len || k === points.length - 1) {
      const t = Math.min(left, len);
      return {
        at: [a[0] + dir[0] * t, a[1] + dir[1] * t, a[2] + dir[2] * t] as Vec3,
        along: dir,
      };
    }
    left -= len;
  }
  return { at: points[0], along: [1, 0, 0] as Vec3 };
}

/**
 * Plumb the room: each source to its sink, a fitting into each end, all
 * left `normally` (closed, the owner asked), routed clear of the walkway.
 */
export function plumbSourceSinkRoom(
  substances: readonly Substance[],
  { normally = 'closed' as 'open' | 'closed' } = {},
): SourceSinkPlumbing {
  const layout = layoutSourceSinkRoom(substances);
  const n = substances.length;
  const nodes = substances.flatMap((s) => [
    { id: sourceId(s), kind: 'experimental-source' },
    { id: sinkId(s), kind: 'experimental-sink' },
  ]);
  const edges: PlumbEdge[] = substances.map((s) => ({
    id: `${s}.line`,
    sourceId: sourceId(s),
    sourcePort: 'out-1',
    targetId: sinkId(s),
    targetPort: 'in-1',
    medium: plumbMedium(SUBSTANCES[s].medium),
  }));
  const expansion = expandForPlumbing(nodes, edges, {
    isolate: new Set(['experimental-source', 'experimental-sink']),
    pumps: new Set(),
    isolateMedia: new Set<PlumbMedium>([
      'water',
      'gas',
      'chemical',
      'oil',
      'power',
    ]),
    normally,
  });

  const walkway: RouterRegion = {
    min: [-layout.halfX, 0, -WALKWAY_HALF],
    max: [layout.halfX, WALKWAY_CLEAR, WALKWAY_HALF],
    forbids: { runs: true },
  };
  const r = SOURCE_SHAPE.radius;
  const obstacles = layout.places.map((p) => ({
    min: [p.x - r, 0, p.z - r] as Vec3,
    max: [p.x + r, SOURCE_SHAPE.height + 0.06, p.z + r] as Vec3,
  }));
  const requests: RouterLine[] = substances.map((s, i) => {
    const pipe = LINE_PIPES[SUBSTANCES[s].medium];
    const out = createExperimentalSource({
      id: sourceId(s),
      substance: s,
    }).ports.find((p) => p.name === 'out-1')!;
    const into = createExperimentalSink({
      id: sinkId(s),
      substance: s,
    }).ports.find((p) => p.name === 'in-1')!;
    return {
      id: `${s}.line`,
      start: placed(out, layout.places[i]),
      end: placed(into, layout.places[n + i]),
      od: pipe.od,
      joint: pipe.joint,
      price: 1,
      // Straight out of each port, room for its fitting.
      startStraight: FITTING_OFFSET + 0.25,
      endStraight: FITTING_OFFSET + 0.25,
    };
  });
  const routed = routeVoxelLines(
    {
      halfX: layout.halfX,
      halfZ: layout.halfZ,
      height: layout.height,
      regions: [walkway],
      obstacles,
    },
    requests,
  );
  const problems = [...routed.problems];
  const lines: SourceSinkLine[] = [];
  const fittings: PlacedFitting[] = [];
  substances.forEach((s, i) => {
    const edge = edges[i].id;
    const points = routed.routes.get(edge);
    if (!points) {
      problems.push(`${edge}: not routed`);
      return;
    }
    const pipe = LINE_PIPES[SUBSTANCES[s].medium];
    lines.push({
      edge,
      substance: s,
      medium: SUBSTANCES[s].medium,
      od: pipe.od,
      pipe: pipe.kind,
      joint: pipe.joint,
      points,
    });
    const length = points
      .slice(1)
      .reduce(
        (sum, p, k) =>
          sum +
          Math.hypot(
            p[0] - points[k][0],
            p[1] - points[k][1],
            p[2] - points[k][2],
          ),
        0,
      );
    for (const f of expansion.along.get(edge) ?? []) {
      const { at, along } = pointAlong(
        points,
        f.end === 'source' ? FITTING_OFFSET : length - FITTING_OFFSET,
      );
      fittings.push({
        id: f.id,
        kind: f.kind,
        medium: f.medium,
        normally: f.normally,
        edge,
        at: round3(at),
        along: round3(along),
      });
    }
  });
  return { layout, expansion, lines, fittings, walkway, problems };
}
