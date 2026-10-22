import {
  demoGraph,
  demoVisualBindings,
} from '../../../game/plant/port-graph-demo';
import type { DemoKind } from '../../../game/plant/port-graph-demo';
import type { Vec3 } from '../../components/core/logic/pipe-route';
import type { PlantRoomLayout } from './plant-room-layout';

type Medium = 'gas' | 'water' | 'power' | 'flue';
export interface DemoRoute {
  edgeId: string;
  medium: Medium;
  points: Vec3[];
}

/** Port centres on the existing machine views, in metres from each exhibit origin. */
const anchors: Partial<Record<DemoKind, Record<string, Vec3>>> = {
  'fuel-store': { gas: [0, 1.06, -0.08] },
  boiler: {
    fuel: [0.2, 1.76, -0.05],
    flue: [0, 1.8, -0.13],
    'water-in': [0.27, 1.78, -0.21],
    'water-out': [-0.27, 1.78, -0.21],
    power: [0.32, 1.05, -0.33],
  },
  'water-tank': {
    supply: [0.8, 0.55, 0],
    return: [0.8, 0.85, 0],
  },
  circulator: {
    suction: [-1, 0.68, 0],
    discharge: [-0.57, 1.26, 0.12],
    power: [0.55, 0.8, 0.2],
  },
  'remote-gas-valve': {
    in: [-0.28, 0.74, 0],
    out: [0.28, 0.74, 0],
    'actuator-power': [0, 1.16, -0.22],
  },
  'remote-water-valve': {
    in: [-0.28, 0.74, 0],
    out: [0.28, 0.74, 0],
    'actuator-power': [0, 1.16, -0.22],
  },
  'remote-breaker': {
    in: [-0.23, 0.88, 0],
    out: [0.23, 0.88, 0],
    'motor-power': [0.2, 1.15, -0.1],
  },
  battery: { feeder: [0, 1.05, -0.08] },
};

export function demoLocalPortAnchor(kind: DemoKind, port: string): Vec3 {
  const point = anchors[kind]?.[port];
  if (!point) throw new Error(`${kind}.${port}: missing model port anchor`);
  return point;
}

export function demoPortPositions(layout: PlantRoomLayout) {
  const positions = new Map<string, Vec3>();
  demoVisualBindings.forEach(({ nodeId, kind }, i) => {
    const place = layout.places[i];
    for (const [port, [x, y, z]] of Object.entries(anchors[kind] ?? {})) {
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

/**
 * The shortest orthogonal path through an assigned overhead service lane.
 * The lanes clear every floor machine and stay north of the south-west door.
 * The flue rises to an unseen stack; the thermal link has no physical pipe.
 */
export function demoServiceRoutes(layout: PlantRoomLayout): DemoRoute[] {
  const positions = demoPortPositions(layout);
  const count: Record<Medium, number> = {
    gas: 0,
    water: 0,
    power: 0,
    flue: 0,
  };
  const laneY: Record<Medium, number> = {
    gas: 2.18,
    water: 2.55,
    power: 3.05,
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
    if (kind === 'flue') {
      routes.push({
        edgeId: edge.id,
        medium: kind,
        points: [start, [start[0], laneY.flue, start[2]]],
      });
      continue;
    }
    const finish = positions.get(`${edge.targetId}.${edge.targetPort}`);
    if (!finish) throw new Error(`${edge.id}: target has no visual port`);
    const index = count[kind]++;
    const y = laneY[kind] + index * 0.075;
    const z = -layout.halfZ + 0.38 + index * 0.09;
    routes.push({
      edgeId: edge.id,
      medium: kind,
      points: [
        start,
        [start[0], y, start[2]],
        [start[0], y, z],
        [finish[0], y, z],
        [finish[0], y, finish[2]],
        finish,
      ],
    });
  }
  return routes;
}
