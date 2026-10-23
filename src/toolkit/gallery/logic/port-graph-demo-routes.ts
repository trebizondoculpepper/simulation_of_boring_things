import { demoGraph } from '../../../game/plant/port-graph-demo';
import type { DemoKind } from '../../../game/plant/port-graph-demo';
import { withPortLeads } from '../../components/core/logic/pipe-route';
import { pipeClashes } from '../../components/core/logic/pipe-route';
import type {
  PipeJoint,
  PortEnd,
  Vec3,
} from '../../components/core/logic/pipe-route';
import type { PlantRoomLayout } from './plant-room-layout';
import type { PlaceItem, PlaceLink } from './machine-placement';
import { choosePipe } from '../../components/core/logic/plumber';
import type { PipeRequest } from '../../components/core/logic/plumber';
import { PIPE_KINDS } from '../../components/core/views/pipe-kinds';
import { pricePerMetre } from '../../components/core/logic/pipe-costs';
import { routeVoxelLines } from '../../components/core/logic/voxel-router';
import type { DrawnRun } from '../../components/core/logic/pipe-route';
import { remoteValveGeometry } from '../../components/plant/logic/remote-valve';
import {
  SHELL_TUBE,
  exchangerPlacing,
  exchangerPorts,
} from '../../components/plant/logic/shell-tube-exchanger';
import type { ExchangerVariant } from '../../components/plant/logic/shell-tube-exchanger';
import { BASE_MODEL } from '../../../game/plant/demo-variants';
import type { DemoModel } from '../../../game/plant/demo-variants';
import { runEntersRegion } from './room-regions';
import type { Region } from './room-regions';
import {
  placeInline,
  splitAt,
} from '../../components/core/logic/inline-placement';
import {
  expandForPlumbing,
  operatorFor,
} from '../../../game/plant/plumbing-expansion';
import {
  plumbedDemoGraph,
  plumbedGraphIssues,
} from '../../../game/plant/plumbed-demo-graph';
import type {
  Actuation,
  FittingKind,
  Operator,
} from '../../../game/plant/plumbing-expansion';

type Medium = 'gas' | 'water' | 'power' | 'flue';
export interface DemoRoute {
  edgeId: string;
  medium: Medium;
  points: Vec3[];
  startPort: PortEnd;
  endPort?: PortEnd;
}

/** Local connection positions in metres. Every physical port of a visible node is listed. */
const anchors: Partial<Record<DemoKind, Record<string, Vec3>>> = {
  'gas-main': { gas: [0.3, 0.75, 0] },
  'gas-meter': { in: [-0.24, 0.82, 0], out: [0.24, 0.82, 0] },
  mains: { feeder: [0, 1.1, -0.1] },
  'makeup-main': { supply: [0.3, 0.75, 0] },
  boiler: {
    fuel: [0.2, 1.76, -0.05],
    flue: [0, 1.8, -0.13],
    'water-in': [0.27, 1.78, -0.21],
    'water-out': [-0.27, 1.78, -0.21],
    power: [0.32, 1.05, -0.33],
  },
  'water-tank': { supply: [0.8, 0.55, 0], return: [0.8, 0.85, 0] },
  circulator: {
    suction: [-1, 0.68, 0],
    discharge: [-0.57, 1.26, 0.12],
    power: [0.55, 0.8, 0.2],
  },
  'pool-pump': {
    suction: [-1, 0.68, 0],
    discharge: [-0.57, 1.26, 0.12],
    power: [0.55, 0.8, 0.2],
  },
  pool: { inlet: [1.5, 0.48, 0], overflow: [-1.5, 0.68, 0] },
  'pool-info-sign': { power: [0, 0.16, 0] },
  'balance-tank': {
    overflow: [-0.65, 0.65, 0],
    makeup: [-0.65, 0.95, 0],
    supply: [0.65, 0.4, 0],
  },
  'sand-filter': { in: [-0.75, 1.6, 0], out: [0.75, 0.85, 0] },
  treatment: {
    in: [-0.4, 0.76, 0],
    out: [0.4, 0.76, 0],
    power: [0, 1.2, -0.2],
  },
  'heat-exchanger': {
    'primary-in': [-0.22, 0.88, -0.12],
    'primary-out': [-0.22, 0.22, -0.12],
    'pool-in': [-0.22, 0.88, 0.12],
    'pool-out': [-0.22, 0.22, 0.12],
  },
  'remote-breaker': {
    in: [-0.23, 0.88, 0],
    out: [0.23, 0.88, 0],
    'motor-power': [0.2, 1.15, -0.1],
  },
  mimic: { power: [0.85, 2.35, -0.1] },
  'pool-mimic': { power: [0.85, 2.35, -0.1] },
};

/** Local outward normals. Inline devices expose their two connections on opposite ends. */
const normals: Partial<Record<DemoKind, Record<string, Vec3>>> = {
  'gas-main': { gas: [1, 0, 0] },
  'gas-meter': { in: [-1, 0, 0], out: [1, 0, 0] },
  mains: { feeder: [0, 1, 0] },
  'makeup-main': { supply: [1, 0, 0] },
  boiler: {
    fuel: [1, 0, 0],
    flue: [0, 1, 0],
    'water-in': [1, 0, 0],
    'water-out': [-1, 0, 0],
    power: [1, 0, 0],
  },
  'water-tank': { supply: [1, 0, 0], return: [1, 0, 0] },
  circulator: { suction: [-1, 0, 0], discharge: [0, 1, 0], power: [1, 0, 0] },
  'pool-pump': { suction: [-1, 0, 0], discharge: [0, 1, 0], power: [1, 0, 0] },
  pool: { inlet: [1, 0, 0], overflow: [-1, 0, 0] },
  'pool-info-sign': { power: [1, 0, 0] },
  'balance-tank': {
    overflow: [-1, 0, 0],
    makeup: [-1, 0, 0],
    supply: [1, 0, 0],
  },
  'sand-filter': { in: [-1, 0, 0], out: [1, 0, 0] },
  treatment: { in: [-1, 0, 0], out: [1, 0, 0], power: [0, 1, 0] },
  'heat-exchanger': {
    'primary-in': [-1, 0, 0],
    'primary-out': [-1, 0, 0],
    'pool-in': [-1, 0, 0],
    'pool-out': [-1, 0, 0],
  },
  'remote-breaker': {
    in: [-1, 0, 0],
    out: [1, 0, 0],
    'motor-power': [0, 1, 0],
  },
  mimic: { power: [1, 0, 0] },
  'pool-mimic': { power: [1, 0, 0] },
};

const isValve = (kind: DemoKind) =>
  kind === 'remote-gas-valve' || kind === 'remote-water-valve';

/**
 * Devices the plumber sets into a line rather than placement onto the
 * floor: the remote valves. Each line passes through by an entry port and
 * an exit port. (The shell-and-tube heat exchanger, though the pool water
 * passes straight through it, stands on its own plinth and is placed.)
 */
const isInline = (kind: DemoKind) => isValve(kind);
const THROUGH: Partial<Record<DemoKind, readonly [string, string]>> = {
  'remote-gas-valve': ['in', 'out'],
  'remote-water-valve': ['in', 'out'],
};

/** The outside diameter of the line a remote valve sits in, metres. */
export function demoValveOd(nodeId: string): number {
  for (const edge of demoGraph.edges) {
    if (edge.sourceId !== nodeId && edge.targetId !== nodeId) continue;
    const port = edge.sourceId === nodeId ? edge.sourcePort : edge.targetPort;
    if (port !== 'in' && port !== 'out') continue;
    const source = demoGraph.nodes.find((node) => node.id === edge.sourceId)!;
    const medium = source.ports?.find((p) => p.name === edge.sourcePort)?.data
      .medium;
    if (medium === 'gas' || medium === 'water')
      return demoPipeSpec(edge.id, medium).od;
  }
  return 0.05;
}

/** A remote valve's geometry, at the size of its line (`remote-valve.ts`). */
export function demoValveGeometry(nodeId: string, kind: DemoKind) {
  // In its line, its middle on the pipe's axis.
  return remoteValveGeometry(
    kind === 'remote-gas-valve' ? 'gas' : 'water',
    demoValveOd(nodeId),
    0,
  );
}

/** A node's visible ports in its own frame: where, and which way each faces. */
/** The variant a node is built as (`DemoModel.variants`), or its kind's first. */
export function exchangerVariantOf(
  nodeId: string,
  model: DemoModel = BASE_MODEL,
): ExchangerVariant {
  return (model.variants?.[nodeId] as ExchangerVariant) ?? 'shell-tube-plinth';
}

export function demoPorts(
  nodeId: string,
  kind: DemoKind,
  model: DemoModel = BASE_MODEL,
): Record<string, { at: Vec3; out: Vec3 }> {
  if (isValve(kind)) return demoValveGeometry(nodeId, kind).ports;
  if (kind === 'heat-exchanger')
    return exchangerPorts(exchangerVariantOf(nodeId, model));
  return Object.fromEntries(
    Object.entries(anchors[kind] ?? {}).map(([port, at]) => [
      port,
      { at, out: normals[kind]?.[port] ?? [0, 1, 0] },
    ]),
  );
}

export function demoLocalPortAnchor(
  nodeId: string,
  kind: DemoKind,
  port: string,
  model: DemoModel = BASE_MODEL,
): Vec3 {
  const point = demoPorts(nodeId, kind, model)[port]?.at;
  if (!point) throw new Error(`${kind}.${port}: missing model port anchor`);
  return point;
}

export function demoPortPositions(
  layout: PlantRoomLayout,
  model: DemoModel = BASE_MODEL,
) {
  const positions = new Map<string, Vec3>();
  model.bindings.forEach(({ nodeId, kind }, i) => {
    const place = layout.places[i];
    if (!place) throw new Error(`${nodeId}: no exhibit placement`);
    for (const [port, { at }] of Object.entries(demoPorts(nodeId, kind, model)))
      positions.set(`${nodeId}.${port}`, toRoom(place, at));
  });
  return positions;
}

export function demoPortEnd(
  layout: PlantRoomLayout,
  nodeId: string,
  port: string,
  at: Vec3,
  model: DemoModel = BASE_MODEL,
): PortEnd {
  const index = model.bindings.findIndex(
    (binding) => binding.nodeId === nodeId,
  );
  const binding = model.bindings[index];
  const place = layout.places[index];
  const normal = binding
    ? demoPorts(nodeId, binding.kind, model)[port]?.out
    : undefined;
  if (!place || !normal)
    throw new Error(`${nodeId}.${port}: missing port direction`);
  return { at, outward: turnToRoom(place, normal) };
}

/** A direction in an exhibit's own frame, in the room's: its tilt (about z), then its yaw. */
export function turnToRoom(
  place: { yaw: number; tilt?: number },
  [x, y, z]: Vec3,
): Vec3 {
  const t = place.tilt ?? 0;
  const tx = x * Math.cos(t) - y * Math.sin(t);
  const ty = x * Math.sin(t) + y * Math.cos(t);
  const c = Math.cos(place.yaw);
  const s = Math.sin(place.yaw);
  return [tx * c + z * s, ty, -tx * s + z * c];
}

/** A point in an exhibit's own frame, in the room's. */
export function toRoom(
  place: { x: number; y: number; z: number; yaw: number; tilt?: number },
  local: Vec3,
): Vec3 {
  const [dx, dy, dz] = turnToRoom(place, local);
  return [place.x + dx, place.y + dy, place.z + dz];
}

const primaryEdges = new Set([
  'primary-supply',
  'primary-valve-to-pump',
  'primary-pump-to-boiler',
  'boiler-to-hx',
  'hx-to-tank',
]);
export function demoPipeSpec(
  edgeId: string,
  medium: Medium,
): {
  kind: ReturnType<typeof choosePipe>['kind'];
  od: number;
  joint: PipeJoint;
} {
  const choice = choosePipe(demoLineRequest(edgeId, medium));
  return {
    kind: choice.kind,
    od: choice.od,
    joint: PIPE_KINDS[choice.kind].joint,
  };
}

/** Nominal capacities for the trial plant; the helper selects material and bore. */
export function demoLineRequest(edgeId: string, medium: Medium): PipeRequest {
  const length = 40; // Allow for the route through the room, including its leads.
  if (medium === 'gas') return { commodity: 'natural-gas', flow: 1.6, length };
  if (medium === 'flue') return { commodity: 'flue-gas', power: 15, length };
  if (medium === 'power')
    return {
      commodity: 'ac-230v',
      current: edgeId === 'boiler-feed' ? 32 : 10,
      length,
    };
  if (primaryEdges.has(edgeId)) return { commodity: 'lthw', flow: 1.8, length };
  if (edgeId.startsWith('makeup-'))
    return { commodity: 'mains-water', flow: 0.072, length };
  return {
    commodity: 'pool-water',
    flow: 5.4,
    length,
    role:
      edgeId === 'pool-overflow' ||
      edgeId === 'balance-supply' ||
      edgeId === 'pool-suction'
        ? 'suction'
        : 'pressure',
  };
}

/** Physical routes derived only from typed graph edges and their visual port twins. */
export function demoServiceRoutes(layout: PlantRoomLayout): DemoRoute[] {
  const positions = demoPortPositions(layout);
  const count: Record<Medium, number> = { gas: 0, water: 0, power: 0, flue: 0 };
  const laneY: Record<Medium, number> = {
    gas: 2.15,
    water: 2.55,
    power: 3.25,
    flue: layout.height - 0.1,
  };
  const routes: DemoRoute[] = [];
  for (const edge of demoGraph.edges) {
    const source = demoGraph.nodes.find((node) => node.id === edge.sourceId)!;
    const medium = source.ports?.find((port) => port.name === edge.sourcePort)
      ?.data.medium;
    if (medium === 'heat' || medium === 'control') continue;
    const kind = medium as Medium;
    const start = positions.get(`${edge.sourceId}.${edge.sourcePort}`);
    if (!start) throw new Error(`${edge.id}: source has no visual port`);
    const startPort = demoPortEnd(
      layout,
      edge.sourceId,
      edge.sourcePort!,
      start,
    );
    const { od, joint } = demoPipeSpec(edge.id, kind);
    if (kind === 'flue') {
      routes.push({
        edgeId: edge.id,
        medium: kind,
        points: withPortLeads(
          [start, [start[0], laneY.flue, start[2]]],
          od,
          joint,
          { start: startPort },
        ),
        startPort,
      });
      continue;
    }
    const finish = positions.get(`${edge.targetId}.${edge.targetPort}`);
    if (!finish) throw new Error(`${edge.id}: target has no visual port`);
    const endPort = demoPortEnd(
      layout,
      edge.targetId,
      edge.targetPort!,
      finish,
    );
    const index = count[kind]++;
    const y = Math.min(layout.height - 0.35, laneY[kind] + (index % 6) * 0.09);
    const z = -layout.halfZ + 0.38 + Math.floor(index / 6) * 0.18;
    routes.push({
      edgeId: edge.id,
      medium: kind,
      startPort,
      endPort,
      points: withPortLeads(
        [
          start,
          [start[0], y, start[2]],
          [start[0], y, z],
          [finish[0], y, z],
          [finish[0], y, finish[2]],
          finish,
        ],
        od,
        joint,
        { start: startPort, end: endPort },
      ),
    });
  }
  return routes;
}

/**
 * Where each kind belongs (the owner, 2026-10-23): the big tanks in
 * corners, panels and signs on walls, pumps and process vessels
 * freestanding. The inline valves go wherever their pipes take them.
 */
const SITES: Partial<Record<DemoKind, PlaceItem['site']>> = {
  pool: 'corner',
  'balance-tank': 'corner',
  'water-tank': 'corner',
  mimic: 'wall',
  'pool-mimic': 'wall',
  'pool-info-sign': 'wall',
  'remote-breaker': 'wall',
  'gas-meter': 'wall',
  circulator: 'free',
  'pool-pump': 'free',
  'sand-filter': 'free',
  'heat-exchanger': 'free',
  treatment: 'free',
  boiler: 'free',
};

/** Withdrawal space by kind, metres (estimates, after the machines' arrangement). */
const WITHDRAWAL: Partial<Record<DemoKind, PlaceItem['withdrawal']>> = {
  'pool-pump': { right: 0.6 },
  circulator: { right: 0.6 },
  'sand-filter': { top: 1 },
};

/**
 * What placement needs to know of each exhibit, in `demoVisualBindings`'
 * order: its ports, the incoming supplies on the supply wall (west), and
 * the boiler's rising flue.
 */
export function demoPlaceItems(
  model: DemoModel = BASE_MODEL,
): Partial<PlaceItem>[] {
  return model.bindings.map(({ nodeId, kind }) => ({
    ports: demoPorts(nodeId, kind, model),
    ...(kind === 'gas-main' || kind === 'mains' || kind === 'makeup-main'
      ? { walls: ['west' as const] }
      : {}),
    // Nothing over what must connect straight up: the boiler's flue, the
    // heat exchanger's heating branches on top.
    ...(kind === 'boiler' ||
    (kind === 'heat-exchanger' &&
      exchangerPlacing(exchangerVariantOf(nodeId, model)).clearAbove)
      ? { clearAbove: true }
      : {}),
    ...(SITES[kind] ? { site: SITES[kind] } : {}),
    // The remote valves sit in their lines: the plumber places them.
    ...(isInline(kind) ? { inline: true } : {}),
    // Machines of a kind stand together as a battery.
    group: kind,
    // Room to take parts out (process layout practice): a pump's motor
    // drawn off its +x end, a plate exchanger's pack opened at its +x end,
    // a filter's internals lifted out of its top.
    ...(kind === 'heat-exchanger'
      ? {
          withdrawal: exchangerPlacing(exchangerVariantOf(nodeId, model))
            .withdrawal,
        }
      : WITHDRAWAL[kind]
        ? { withdrawal: WITHDRAWAL[kind] }
        : {}),
  }));
}

/**
 * The links that pull machines together: the graph's pipes, weighted by
 * their outside diameter (lagging included) against 25 mm. Power and
 * control go to the room's buses and the flue to the roof, so they do not
 * pull.
 */
export function demoPlaceLinks(model: DemoModel = BASE_MODEL): PlaceLink[] {
  const at = new Map(model.bindings.map(({ nodeId }, i) => [nodeId, i]));
  const links: PlaceLink[] = [];
  // Machine to machine, through any valve in the line.
  for (const line of demoLines(model)) {
    if (line.medium !== 'gas' && line.medium !== 'water') continue;
    const a = at.get(line.from.id);
    const b = at.get(line.to.id);
    if (a === undefined || b === undefined) continue;
    // Pulled together by what their pipe costs a metre (prompt 020), in
    // units of £25 a metre.
    const { kind, od } = demoPipeSpec(line.edges[0], line.medium);
    links.push({
      a: String(a),
      aPort: line.from.port,
      b: String(b),
      bPort: line.to.port,
      weight: pricePerMetre(kind, od) / 25,
      // A pump's suction, kept short.
      ...(line.to.port === 'suction' ? { suction: true } : {}),
    });
  }
  return links;
}

// ---- The plumber: lines, their fittings, and where they go ---------------------------

/** A line: machine port to machine port, through any valves set into it. */
export interface DemoLine {
  medium: Medium;
  /** Its base links, in order. */
  edges: string[];
  from: { id: string; port: string };
  to: { id: string; port: string };
  /** The designed valves it passes through, in order. */
  through: string[];
}

const mediumOf = (
  edge: (typeof demoGraph.edges)[number],
  graph: DemoModel['graph'] = demoGraph,
) =>
  graph.nodes
    .find((node) => node.id === edge.sourceId)
    ?.ports?.find((port) => port.name === edge.sourcePort)?.data.medium;
const kindOf = (id: string, graph: DemoModel['graph'] = demoGraph) =>
  graph.nodes.find((node) => node.id === id)?.data.kind as DemoKind;

/**
 * Magic terminals (the owner, 2026-10-23, after prompt 008's magic flues
 * and drains): nodes of the model whose ports the plumber works out from
 * the line that reaches them. A line to one is terminated where its most
 * direct route meets the ceiling (a flue's or a vent's) or the floor (a
 * drain's, at a gully). Dev19's stack is the ceiling's.
 */
export type MagicTerminal = 'ceiling' | 'floor';
export const MAGIC_TERMINALS: Partial<Record<DemoKind, MagicTerminal>> = {
  stack: 'ceiling',
};

/** A layout's reserved regions, if it has them. */
const regionsOf = (layout: PlantRoomLayout): readonly Region[] =>
  'regions' in layout ? (layout as { regions: Region[] }).regions : [];

/** Dev19's lines, each base link once. */
export function demoLines(model: DemoModel = BASE_MODEL): DemoLine[] {
  const { graph } = model;
  const lines: DemoLine[] = [];
  for (const edge of graph.edges) {
    const medium = mediumOf(edge, graph);
    if (
      medium !== 'gas' &&
      medium !== 'water' &&
      medium !== 'power' &&
      medium !== 'flue'
    )
      continue;
    const sourceKind = kindOf(edge.sourceId, graph);
    if (isInline(sourceKind) && edge.sourcePort === THROUGH[sourceKind]?.[1])
      continue;
    const line: DemoLine = {
      medium,
      edges: [edge.id],
      from: { id: edge.sourceId, port: edge.sourcePort! },
      to: { id: edge.targetId, port: edge.targetPort! },
      through: [],
    };
    // On through each valve set into the line.
    while (
      isInline(kindOf(line.to.id, graph)) &&
      line.to.port === THROUGH[kindOf(line.to.id, graph)]?.[0]
    ) {
      const valve = line.to.id;
      const exit = THROUGH[kindOf(valve, graph)]![1];
      const next = graph.edges.find(
        (e) => e.sourceId === valve && e.sourcePort === exit,
      );
      if (!next) break;
      line.through.push(valve);
      line.edges.push(next.id);
      line.to = { id: next.targetId, port: next.targetPort! };
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Two sets of plumbing rules, to compare (the owner, 2026-10-23): Claude's
 * first (Dev19), and Codex's, from its review of prompt 018 (Dev19b):
 *
 * - **Non-return valves:** Claude's on every pump's discharge; Codex's only
 *   where the circuit needs one. Dev19's pumps are single pumps with a
 *   flooded suction, so none does.
 * - **Power isolators:** Claude's in each feed straight from the supply;
 *   Codex's in the last feed to every powered device, so the boiler beyond
 *   its motor breaker has one too.
 * - **Reach:** Claude's by height alone; Codex's by height and a place to
 *   stand: clear floor beside it, not a machine or a wall.
 * - **Out of reach:** Claude's sets a fitting there anyway and reports it;
 *   Codex's reports it and leaves it out rather than draw one nobody can
 *   use.
 */
export interface PlumbingRules {
  name: string;
  nonReturn: 'every-pump' | 'where-needed';
  powerIsolators: 'supply-feeds' | 'every-device';
  reach: 'height' | 'height-and-standing';
  unreachable: 'place-anyway' | 'report';
  /**
   * How a line leaves a machine: up to the overhead lanes at once, or first
   * along a straight at the port's height, if that is within reach, long
   * enough for the fittings that belong at that end.
   */
  routing: 'lanes' | 'reachable-ends' | 'voxel';
}
export const CLAUDE_RULES: PlumbingRules = {
  name: "Claude's rules",
  nonReturn: 'every-pump',
  powerIsolators: 'supply-feeds',
  reach: 'height',
  unreachable: 'place-anyway',
  routing: 'lanes',
};
export const CODEX_RULES: PlumbingRules = {
  name: "Codex's rules",
  nonReturn: 'where-needed',
  powerIsolators: 'every-device',
  reach: 'height-and-standing',
  unreachable: 'report',
  routing: 'lanes',
};
/**
 * The rules adopted for Dev19 (the owner, 2026-10-23): Codex's, with each
 * line leaving its machine on a reachable straight for its fittings.
 */
export const ADOPTED_RULES: PlumbingRules = {
  ...CODEX_RULES,
  name: "Codex's rules, with reachable ends",
  routing: 'voxel',
};

/** The plumber's expansion of Dev19 (`plumbing-expansion.ts`). */
export function demoExpansion(
  rules: PlumbingRules = CLAUDE_RULES,
  omit: ReadonlySet<string> = new Set(),
  model: DemoModel = BASE_MODEL,
) {
  const { graph } = model;
  return expandForPlumbing(
    graph.nodes.map((n) => ({ id: n.id, kind: n.data.kind })),
    graph.edges.flatMap((e) => {
      const medium = mediumOf(e, graph);
      return medium
        ? [
            {
              id: e.id,
              sourceId: e.sourceId,
              sourcePort: e.sourcePort!,
              targetId: e.targetId,
              targetPort: e.targetPort!,
              medium,
            },
          ]
        : [];
    }),
    {
      isolate: new Set([
        'pool-pump',
        'circulator',
        'sand-filter',
        'heat-exchanger',
      ]),
      pumps: new Set(['pool-pump', 'circulator']),
      switchgear: new Set(['remote-breaker']),
      supplies: new Set(['mains']),
      nonReturn:
        rules.nonReturn === 'every-pump'
          ? new Set(['pool-pump', 'circulator'])
          : new Set(),
      powerIsolators: rules.powerIsolators,
      omit,
    },
  );
}

/** How Dev19's valves are worked: by hand within reach, by motor beyond it. */
export const DEMO_ACTUATION: Actuation = 'automatic-where-hard-to-reach';

export interface PlumbedRun {
  id: string;
  /** The base link whose pipe it is. */
  edgeId: string;
  medium: Medium;
  points: Vec3[];
  startPort?: PortEnd;
  endPort?: PortEnd;
}

export interface PlumbedDevice {
  id: string;
  /** The base link of the line it is set into. */
  edgeId: string;
  kind: FittingKind | 'remote-valve';
  medium: Medium;
  /** The pipe's outside diameter there. */
  od: number;
  at: Vec3;
  along: Vec3;
  reachable: boolean;
  operator: Operator;
}

/** How long each inline device is along its pipe, metres. */
function inlineLength(kind: PlumbedDevice['kind'], od: number, valve?: number) {
  if (kind === 'remote-valve') return valve ?? 0.12;
  if (kind === 'non-return-valve') return Math.max(0.07, 2 * od + 0.02);
  if (kind === 'power-isolator') return 0.16;
  return Math.max(0.06, 1.4 * od);
}

/** A designed valve's place, set into its line at `at`, its pipe running `along`. */
function inlinePlace(at: Vec3, along: Vec3) {
  const [dx, dy, dz] = along;
  // Its actuator into the room, away from the walls.
  const r = Math.hypot(at[0], at[2]) || 1;
  const [ix, iz] = [-at[0] / r, -at[2] / r];
  if (dy > 0.5)
    return {
      x: at[0],
      y: at[1],
      z: at[2],
      tilt: Math.PI / 2,
      yaw: Math.atan2(iz, -ix),
      inline: true,
    };
  if (dy < -0.5)
    return {
      x: at[0],
      y: at[1],
      z: at[2],
      tilt: -Math.PI / 2,
      yaw: Math.atan2(-iz, ix),
      inline: true,
    };
  return {
    x: at[0],
    y: at[1],
    z: at[2],
    tilt: 0,
    yaw: Math.atan2(-dz, dx),
    inline: true,
  };
}

/**
 * Dev19 plumbed: each line routed machine to machine (the old lanes, until
 * the new router lands), the plumber's fittings and the designed valves set
 * into it where a person can reach them, and the runs split between them;
 * then the power feeds, to wherever the valves' actuators ended up, each
 * with its isolator on its drop. The designed valves' places come back in
 * `places`, for the room to stand them in.
 */
export function demoPlumbing(
  layout: PlantRoomLayout,
  rules: PlumbingRules = CLAUDE_RULES,
  model: DemoModel = BASE_MODEL,
) {
  const expansion = demoExpansion(rules, new Set(), model);
  // Somewhere to stand within arm's reach: clear floor, not a machine or a wall.
  const feet = layout.solids.filter((f) => f.maxX > f.minX);
  const clear = (x: number, z: number) =>
    Math.abs(x) < layout.halfX - 0.3 &&
    Math.abs(z) < layout.halfZ - 0.3 &&
    !feet.some(
      (f) =>
        x > f.minX - 0.15 &&
        x < f.maxX + 0.15 &&
        z > f.minZ - 0.15 &&
        z < f.maxZ + 0.15,
    );
  // Within arm's reach (0.8 m) of clear floor, and clear of every
  // fitting already set into another line.
  const set: Vec3[] = [];
  const crowded = (at: Vec3) =>
    set.some(
      (p) => Math.hypot(p[0] - at[0], p[1] - at[1], p[2] - at[2]) < 0.25,
    );
  const standing = (at: Vec3) =>
    !crowded(at) &&
    (rules.reach === 'height' ||
      [0.3, 0.55, 0.8].some((d) =>
        Array.from({ length: 8 }, (_, k) => (k * Math.PI) / 4).some((a) =>
          clear(at[0] + d * Math.cos(a), at[2] + d * Math.sin(a)),
        ),
      ));
  const places = [...layout.places];
  const indexOf = new Map(model.bindings.map((b, i) => [b.nodeId, i]));
  const runs: PlumbedRun[] = [];
  const devices: PlumbedDevice[] = [];
  /** Where lines met their magic terminals. */
  const terminals: { id: string; kind: MagicTerminal; at: Vec3; od: number }[] =
    [];
  const problems: string[] = [];
  const routed: DrawnRun[] = [];
  /**
   * Each routed line's group: the port it leaves from. Lines leaving one
   * port share their way out, as a bus (power feeds from the mains) or a
   * header (a pump feeding a battery of filters), so they need not keep
   * clear of each other; everything else must.
   */
  const groupOf = new Map<string, readonly [string, string]>();
  const ends = (line: DemoLine) =>
    [
      `from ${line.from.id}.${line.from.port}`,
      `to ${line.to.id}.${line.to.port}`,
    ] as const;
  // Those leaving the same port, or arriving at the same port (a header on
  // the way in, as filters' outlets joining at the treatment cabinet).
  const others = (line: DemoLine) => {
    const [a, b] = ends(line);
    return routed.filter((r) => {
      const g = groupOf.get(r.name);
      return !g || (g[0] !== a && g[1] !== b);
    });
  };
  /** Fittings that could not be set where anyone can reach them: not installed. */
  const leftOut = new Set<string>();
  const count: Record<Medium, number> = { gas: 0, water: 0, power: 0, flue: 0 };
  const laneY: Record<Medium, number> = {
    gas: 2.15,
    water: 2.55,
    power: 3.25,
    flue: layout.height - 0.1,
  };
  const lines = demoLines(model);
  const REACH: readonly [number, number] = [0.5, 1.8];
  /** How far a line runs straight out of its port first: `ext` metres, if its port faces level and is within reach. */
  const reachEnd = (end: PortEnd, ext: number): Vec3 | null =>
    ext > 0 &&
    Math.abs(end.outward[1]) < 0.5 &&
    end.at[1] >= REACH[0] &&
    end.at[1] <= REACH[1]
      ? [
          end.at[0] + end.outward[0] * ext,
          end.at[1],
          end.at[2] + end.outward[2] * ext,
        ]
      : null;
  const route = (
    line: DemoLine,
    at: PlantRoomLayout,
    ext: { start: number; end: number } = { start: 0, end: 0 },
  ) => {
    const positions = demoPortPositions(at, model);
    const start = positions.get(`${line.from.id}.${line.from.port}`);
    if (!start)
      throw new Error(`${line.edges[0]}: its start has no visual port`);
    const startPort = demoPortEnd(
      at,
      line.from.id,
      line.from.port,
      start,
      model,
    );
    const { od, joint } = demoPipeSpec(line.edges[0], line.medium);
    // A magic terminal (the owner, 2026-10-23): its port is where the most
    // direct route from the line's start meets the ceiling, and reaching it
    // terminates the line. The route is checked, not assumed, clear.
    const magic = MAGIC_TERMINALS[kindOf(line.to.id, model.graph)];
    if (magic === 'ceiling') {
      const offsets: readonly [number, number][] = [
        [0, 0],
        [0.5, 0],
        [-0.5, 0],
        [0, 0.5],
        [0, -0.5],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      let selected: {
        points: Vec3[];
        top: Vec3;
        endPort: PortEnd;
        check: DrawnRun;
      } | null = null;
      for (const [dx, dz] of offsets) {
        const top: Vec3 = [start[0] + dx, layout.height, start[2] + dz];
        const endPort: PortEnd = { at: top, outward: [0, -1, 0] };
        const points = withPortLeads(
          dx || dz
            ? [
                start,
                [
                  start[0],
                  Math.min(layout.height - 0.5, start[1] + 1),
                  start[2],
                ],
                [top[0], Math.min(layout.height - 0.5, start[1] + 1), top[2]],
                top,
              ]
            : [start, top],
          od,
          joint,
          { start: startPort, end: endPort },
        );
        if (
          points.some(
            (p) =>
              Math.abs(p[0]) + od / 2 >= layout.halfX ||
              Math.abs(p[2]) + od / 2 >= layout.halfZ,
          )
        )
          continue;
        if (
          points
            .slice(1)
            .some((p, k) =>
              runEntersRegion(points[k], p, od / 2, regionsOf(at)),
            )
        )
          continue;
        const check: DrawnRun = { name: line.edges[0], points, od, joint };
        if (routed.some((other) => pipeClashes([other, check]).length))
          continue;
        selected = { points, top, endPort, check };
        break;
      }
      if (!selected) {
        problems.push(`${line.edges[0]}: no clash-free route to the ceiling`);
        return null;
      }
      const { points, top, endPort, check } = selected;
      routed.push(check);
      terminals.push({
        id: `${line.to.id}.${line.to.port}`,
        kind: magic,
        at: top,
        od,
      });
      return { points, startPort, endPort, od };
    }
    const finish = positions.get(`${line.to.id}.${line.to.port}`);
    if (!finish)
      throw new Error(`${line.edges[0]}: its end has no visual port`);
    const endPort = demoPortEnd(at, line.to.id, line.to.port, finish, model);
    if (rules.routing === 'voxel') {
      const result = routeVoxelLines(
        {
          halfX: at.halfX,
          halfZ: at.halfZ,
          height: at.height,
          regions: regionsOf(at),
        },
        [
          {
            id: line.edges[0],
            start: startPort,
            end: endPort,
            od,
            joint,
            price: pricePerMetre(
              demoPipeSpec(line.edges[0], line.medium).kind,
              od,
            ),
            startStraight: ext.start,
            endStraight: ext.end,
          },
        ],
        others(line),
      );
      const points = result.routes.get(line.edges[0]);
      if (!points) {
        problems.push(...result.problems);
        return null;
      }
      routed.push({ name: line.edges[0], points, od, joint });
      groupOf.set(line.edges[0], ends(line));
      return { points, startPort, endPort, od };
    }
    const index = count[line.medium]++;
    const y = Math.min(
      layout.height - 0.35,
      laneY[line.medium] + (index % 6) * 0.09,
    );
    const z = -layout.halfZ + 0.38 + Math.floor(index / 6) * 0.18;
    // Out of each port along a reachable straight first, where wanted,
    // but never out into a walkway: shortened until the straight and the
    // rise at its end keep out of every reserved region.
    const clearEnd = (end: PortEnd, want: number) => {
      for (let e = want; e > 0.05; e *= 0.7) {
        const p = reachEnd(end, e);
        if (!p) return null;
        const top: Vec3 = [p[0], laneY[line.medium], p[2]];
        const regions = regionsOf(at);
        if (
          !runEntersRegion(end.at, p, od / 2, regions) &&
          !runEntersRegion(p, top, od / 2, regions)
        )
          return p;
      }
      return null;
    };
    const a = clearEnd(startPort, ext.start);
    const b = clearEnd(endPort, ext.end);
    const from = a ?? start;
    const to = b ?? finish;
    const points = withPortLeads(
      [
        start,
        ...(a ? [a] : []),
        [from[0], y, from[2]],
        [from[0], y, z],
        [to[0], y, z],
        [to[0], y, to[2]],
        ...(b ? [b] : []),
        finish,
      ],
      od,
      joint,
      { start: startPort, end: endPort },
    );
    return { points, startPort, endPort, od };
  };
  const plumb = (line: DemoLine, at: PlantRoomLayout) => {
    const { od: lineOd } = demoPipeSpec(line.edges[0], line.medium);
    // The line's inline devices: its fittings by the ends they serve, and
    // its designed valves, near its start.
    const fittings = line.edges.flatMap((e) => expansion.along.get(e) ?? []);
    const wanted = [
      ...fittings
        .filter((f) => f.serves === line.from.id)
        .map((f) => ({
          id: f.id,
          kind: f.kind as PlumbedDevice['kind'],
          near: 'start' as const,
        })),
      // The designed devices in the line: its valves, its heat exchanger
      // (level, on a plinth).
      ...line.through.map((id) => ({
        id,
        kind: 'remote-valve' as const,
        near: 'start' as const,
        level: kindOf(id, model.graph) === 'heat-exchanger',
      })),
      ...fittings
        .filter((f) => f.serves !== line.from.id)
        .map((f) => ({
          id: f.id,
          kind: f.kind as PlumbedDevice['kind'],
          near: 'end' as const,
        })),
    ];
    const lengths = new Map(
      wanted.map((w) => [
        w.id,
        inlineLength(
          w.kind,
          lineOd,
          w.kind === 'remote-valve'
            ? kindOf(w.id, model.graph) === 'heat-exchanger'
              ? SHELL_TUBE.length
              : demoValveGeometry(w.id, kindOf(w.id, model.graph)).length
            : undefined,
        ),
      ]),
    );
    // Room at each end for its fittings: their lengths, a gap each, and
    // the port's lead and the bend's fitting.
    const room = (near: 'start' | 'end') => {
      const at = wanted.filter((w) => w.near === near);
      return at.length
        ? at.reduce((sum, w) => sum + lengths.get(w.id)! + 0.08, 0.45)
        : 0;
    };
    const r = route(
      line,
      at,
      rules.routing === 'reachable-ends' || rules.routing === 'voxel'
        ? { start: room('start'), end: room('end') }
        : { start: 0, end: 0 },
    );
    if (!r) return;
    if (line.medium === 'flue') {
      runs.push({
        id: line.edges[0],
        edgeId: line.edges[0],
        medium: line.medium,
        points: r.points,
        startPort: r.startPort,
        endPort: r.endPort,
      });
      return;
    }
    const { spots, problems: missed } = placeInline(
      r.points,
      wanted.map((w) => ({
        id: w.id,
        length: lengths.get(w.id)!,
        near: w.near,
        level: (w as { level?: boolean }).level ?? false,
      })),
      // Past each port's lead, and each bend's fitting.
      { ends: 0.25, bends: 0.12, standing },
    );
    problems.push(...missed);
    // Codex's rule: a fitting nobody can reach is reported, not installed.
    const kept = spots.filter(
      (spot) =>
        rules.unreachable === 'place-anyway' ||
        spot.reachable ||
        line.through.includes(spot.id),
    );
    for (const spot of spots)
      if (!kept.includes(spot) && !line.through.includes(spot.id))
        leftOut.add(spot.id);
    if (kept.length < spots.length)
      problems.push(
        ...spots
          .filter((spot) => !kept.includes(spot))
          .map((spot) => `${spot.id}: left out, nowhere reachable to fit it`),
      );
    spots.splice(0, spots.length, ...kept);
    // What later lines must keep clear of.
    set.push(...spots.map((spot) => spot.at));
    const pieces = splitAt(r.points, spots, lengths);
    pieces.forEach((points, k) =>
      runs.push({
        id: `${line.edges[0]}#${k}`,
        edgeId: line.edges[0],
        medium: line.medium,
        points,
        startPort: k === 0 ? r.startPort : undefined,
        endPort: k === pieces.length - 1 ? r.endPort : undefined,
      }),
    );
    for (const spot of spots) {
      const w = wanted.find((x) => x.id === spot.id)!;
      if (w.kind === 'remote-valve') {
        const i = indexOf.get(w.id)!;
        places[i] = inlinePlace(spot.at, spot.along);
        devices.push({
          id: w.id,
          kind: w.kind,
          medium: line.medium,
          od: r.od,
          at: spot.at,
          along: spot.along,
          reachable: spot.reachable,
          edgeId: line.edges[0],
          operator:
            kindOf(w.id, model.graph) === 'heat-exchanger'
              ? 'self'
              : line.medium === 'gas'
                ? 'solenoid'
                : 'motor',
        });
        continue;
      }
      const f = fittings.find((x) => x.id === w.id)!;
      devices.push({
        id: w.id,
        kind: w.kind,
        medium: line.medium,
        od: r.od,
        at: spot.at,
        along: spot.along,
        reachable: spot.reachable,
        edgeId: line.edges[0],
        operator: operatorFor(f, spot.reachable, DEMO_ACTUATION),
      });
    }
  };
  // Pipes first, which places the valves; then power and flue, which reach them.
  // Lines through inline devices first, which places them; then the rest
  // of the pipes, which may end at them (the heating flow and return to the
  // heat exchanger's top).
  // The flue first: it must rise straight through the roof.
  for (const line of lines) if (line.medium === 'flue') plumb(line, layout);
  // The hardest to move first: dearest a metre (lagged heating), then down.
  const dearness = (l: DemoLine) => {
    const { kind, od } = demoPipeSpec(l.edges[0], l.medium);
    return pricePerMetre(kind, od);
  };
  const pipes = lines
    .filter((l) => l.medium === 'gas' || l.medium === 'water')
    .sort((a, b) => dearness(b) - dearness(a));
  for (const line of pipes) if (line.through.length) plumb(line, layout);
  const throughPlaced = { ...layout, places };
  for (const line of pipes)
    if (!line.through.length) plumb(line, throughPlaced);
  const placed = { ...layout, places };
  for (const line of lines) if (line.medium === 'power') plumb(line, placed);
  // What the plumber installed, as the graph the room runs (prompt 018,
  // "The bound room"): the plan with its installed fittings as nodes.
  for (const id of problems.flatMap(
    (p) => p.match(/^(\S+): no straight/)?.[1] ?? [],
  ))
    leftOut.add(id);
  const graph = plumbedDemoGraph(
    demoExpansion(rules, leftOut, model),
    model.graph,
  );
  problems.push(...plumbedGraphIssues(graph));
  // Which runs share a port's bus or header, by run.
  const shares = new Map(
    runs.map((r) => {
      const line = lines.find((l) => l.edges[0] === r.edgeId);
      return [r.id, line ? [...ends(line)] : [r.id]] as const;
    }),
  );
  return { places, runs, devices, terminals, problems, graph, shares };
}
