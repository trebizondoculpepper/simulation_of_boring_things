import {
  demoGraph,
  demoVisualBindings,
} from '../../../game/plant/port-graph-demo';
import type { DemoKind } from '../../../game/plant/port-graph-demo';
import { withPortLeads } from '../../components/core/logic/pipe-route';
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
import { remoteValveGeometry } from '../../components/plant/logic/remote-valve';

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
  return remoteValveGeometry(
    kind === 'remote-gas-valve' ? 'gas' : 'water',
    demoValveOd(nodeId),
  );
}

/** A node's visible ports in its own frame: where, and which way each faces. */
export function demoPorts(
  nodeId: string,
  kind: DemoKind,
): Record<string, { at: Vec3; out: Vec3 }> {
  if (isValve(kind)) return demoValveGeometry(nodeId, kind).ports;
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
): Vec3 {
  const point = demoPorts(nodeId, kind)[port]?.at;
  if (!point) throw new Error(`${kind}.${port}: missing model port anchor`);
  return point;
}

export function demoPortPositions(layout: PlantRoomLayout) {
  const positions = new Map<string, Vec3>();
  demoVisualBindings.forEach(({ nodeId, kind }, i) => {
    const place = layout.places[i];
    if (!place) throw new Error(`${nodeId}: no exhibit placement`);
    for (const [port, { at }] of Object.entries(demoPorts(nodeId, kind))) {
      const [x, y, z] = at;
      const c = Math.cos(place.yaw);
      const s = Math.sin(place.yaw);
      positions.set(`${nodeId}.${port}`, [
        place.x + x * c + z * s,
        place.y + y,
        place.z - x * s + z * c,
      ]);
    }
  });
  return positions;
}

export function demoPortEnd(
  layout: PlantRoomLayout,
  nodeId: string,
  port: string,
  at: Vec3,
): PortEnd {
  const index = demoVisualBindings.findIndex(
    (binding) => binding.nodeId === nodeId,
  );
  const binding = demoVisualBindings[index];
  const place = layout.places[index];
  const normal = binding
    ? demoPorts(nodeId, binding.kind)[port]?.out
    : undefined;
  if (!place || !normal)
    throw new Error(`${nodeId}.${port}: missing port direction`);
  const c = Math.cos(place.yaw);
  const s = Math.sin(place.yaw);
  return {
    at,
    outward: [
      normal[0] * c + normal[2] * s,
      normal[1],
      -normal[0] * s + normal[2] * c,
    ],
  };
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

/**
 * What placement needs to know of each exhibit, in `demoVisualBindings`'
 * order: its ports, the incoming supplies on the supply wall (west), and
 * the boiler's rising flue.
 */
export function demoPlaceItems(): Partial<PlaceItem>[] {
  return demoVisualBindings.map(({ nodeId, kind }) => ({
    ports: demoPorts(nodeId, kind),
    ...(kind === 'gas-main' || kind === 'mains' || kind === 'makeup-main'
      ? { walls: ['west' as const] }
      : {}),
    ...(kind === 'boiler' ? { clearAbove: true } : {}),
    ...(SITES[kind] ? { site: SITES[kind] } : {}),
  }));
}

/**
 * The links that pull machines together: the graph's pipes, weighted by
 * their outside diameter (lagging included) against 25 mm. Power and
 * control go to the room's buses and the flue to the roof, so they do not
 * pull.
 */
export function demoPlaceLinks(): PlaceLink[] {
  const at = new Map(demoVisualBindings.map(({ nodeId }, i) => [nodeId, i]));
  const links: PlaceLink[] = [];
  for (const edge of demoGraph.edges) {
    const source = demoGraph.nodes.find((node) => node.id === edge.sourceId)!;
    const medium = source.ports?.find((port) => port.name === edge.sourcePort)
      ?.data.medium;
    if (medium !== 'gas' && medium !== 'water') continue;
    const a = at.get(edge.sourceId);
    const b = at.get(edge.targetId);
    if (a === undefined || b === undefined) continue;
    const { kind, od } = demoPipeSpec(edge.id, medium);
    const lagging = PIPE_KINDS[kind].insulation?.thickness ?? 0;
    links.push({
      a: String(a),
      aPort: edge.sourcePort,
      b: String(b),
      bPort: edge.targetPort,
      weight: (od + 2 * lagging) / 0.025,
    });
  }
  return links;
}
