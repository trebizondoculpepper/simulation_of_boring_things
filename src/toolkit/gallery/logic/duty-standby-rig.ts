import {
  SOURCE_SHAPE,
  createExperimentalSink,
  createExperimentalSource,
} from '../../../game/plant/experimental-source';
import type { SourcePort } from '../../../game/plant/experimental-source';
import { expandForPlumbing } from '../../../game/plant/plumbing-expansion';
import type {
  Expansion,
  PlumbEdge,
  PlumbMedium,
} from '../../../game/plant/plumbing-expansion';
import {
  commands,
  newDutyStandby,
  pressDutyStandby,
  pumpsHydraulics,
  stepDutyStandby,
} from '../../../game/plant/duty-standby';
import type {
  DutyStandbyEvent,
  DutyStandbyState,
  PumpIndex,
} from '../../../game/plant/duty-standby';
import { NK_150_315 } from '../../../game/plant/power-conversion';
import { routeVoxelLines } from '../../components/core/logic/voxel-router';
import type { RouterLine } from '../../components/core/logic/voxel-router';
import type { PipeJoint, Vec3 } from '../../components/core/logic/pipe-route';
import type { PlantRoomLayout } from './plant-room-layout';
import { placeRigFittings } from './rig-fittings';
import type { PlacedRigFitting } from './rig-fittings';

/**
 * Duty and standby pumps (Dev24; scenario 1, `doc/prompts/024-scenario-duty-standby-pumps.md`):
 * two end-suction pump sets side by side, drawing from an endless source
 * through a suction header and delivering through a discharge header to
 * an endless sink, each fed from a Penfold duty/standby panel on an
 * endless 400 V supply. The headers are components of their own (a
 * manifold: a main end and a branch to each pump), so the plumber joins
 * each pump to them as to anything else and sets each pump's fittings:
 * its suction isolating valve, its discharge non-return and isolating
 * valves, and a local isolator in its power feed. Pure.
 */

export type DutyItem =
  | 'supply'
  | 'panel'
  | 'water-source'
  | 'water-sink'
  | 'pump-1'
  | 'pump-2';
export const DUTY_ITEMS: readonly DutyItem[] = [
  'supply',
  'panel',
  'water-source',
  'water-sink',
  'pump-1',
  'pump-2',
];
export const DUTY_ID: Record<
  DutyItem | 'suction-header' | 'discharge-header',
  string
> = {
  supply: 'duty.supply',
  panel: 'duty.panel',
  'water-source': 'duty.water-source',
  'water-sink': 'duty.water-sink',
  'pump-1': 'duty.pump-1',
  'pump-2': 'duty.pump-2',
  'suction-header': 'duty.suction-header',
  'discharge-header': 'duty.discharge-header',
};

/** The panel: a floor-standing Penfold cubicle, and its glands on top. */
export const PANEL = { w: 0.8, d: 0.4, h: 1.8 } as const;

export const DUTY_SIZE: Record<DutyItem, { w: number; d: number; h: number }> =
  {
    supply: { w: 0.7, d: 0.7, h: SOURCE_SHAPE.height + 0.1 },
    panel: { w: PANEL.w, d: PANEL.d, h: PANEL.h },
    'water-source': { w: 0.7, d: 0.7, h: SOURCE_SHAPE.height + 0.1 },
    'water-sink': { w: 0.7, d: 0.7, h: SOURCE_SHAPE.height + 0.1 },
    'pump-1': { w: 1.9, d: 0.6, h: 1.3 },
    'pump-2': { w: 1.9, d: 0.6, h: 1.3 },
  };

const PLACES: Record<DutyItem, { x: number; z: number; yaw: number }> = {
  supply: { x: -5, z: -3.5, yaw: 0 },
  panel: { x: -3.6, z: -4.05, yaw: 0 },
  'water-source': { x: -1.8, z: -3.6, yaw: 0 },
  'water-sink': { x: 0.9, z: 3.6, yaw: Math.PI },
  'pump-1': { x: 0.5, z: -1.4, yaw: 0 },
  'pump-2': { x: 0.5, z: 1.4, yaw: 0 },
};

type Port = { at: Vec3; out: Vec3 };
const portOf = (ports: SourcePort[], name: string): Port => {
  const p = ports.find((q) => q.name === name)!;
  return { at: p.at, out: p.out };
};

/** The pump set's ports (as in Dev19 and Dev22), in its own frame. */
const PUMP_PORTS: Record<string, Port> = {
  suction: { at: [-1, 0.68, 0], out: [-1, 0, 0] },
  discharge: { at: [-0.57, 1.26, 0.12], out: [0, 1, 0] },
  power: { at: [0.55, 0.8, 0.2], out: [1, 0, 0] },
};

const ITEM_PORTS: Record<DutyItem, Record<string, Port>> = {
  supply: {
    'out-1': portOf(
      createExperimentalSource({ id: 's', substance: 'power-400v' }).ports,
      'out-1',
    ),
  },
  panel: {
    // Its three glands 300 mm apart, room for the conduits to rise clear.
    'supply-in': { at: [-0.3, PANEL.h + 0.04, 0], out: [0, 1, 0] },
    'pump-1': { at: [0, PANEL.h + 0.04, 0], out: [0, 1, 0] },
    'pump-2': { at: [0.3, PANEL.h + 0.04, 0], out: [0, 1, 0] },
  },
  'water-source': {
    'out-1': portOf(
      createExperimentalSource({ id: 's', substance: 'pool-water' }).ports,
      'out-1',
    ),
  },
  'water-sink': {
    'in-1': portOf(
      createExperimentalSink({ id: 's', substance: 'pool-water' }).ports,
      'in-1',
    ),
  },
  'pump-1': PUMP_PORTS,
  'pump-2': PUMP_PORTS,
};

/**
 * A header: a length of DN200 pipe from `from` to `to` (its main end at
 * `from`, facing away from `to`, its other end capped), with a short
 * branch stub at each of `branches`, each ending in a port facing `branchOut`.
 */
export interface Header {
  id: string;
  from: Vec3;
  to: Vec3;
  od: number;
  branches: { name: string; at: Vec3 }[];
  branchOut: Vec3;
  stub: number;
}

const STUB = 0.25;
export const HEADERS: Header[] = [
  {
    // Along the pumps' suction ends, at their shaft height; in from the source at its north end.
    id: DUTY_ID['suction-header'],
    from: [-1.8, 0.68, -2.4],
    to: [-1.8, 0.68, 2.0],
    od: 0.219,
    branches: [
      { name: 'branch-1', at: [-1.8, 0.68, -1.4] },
      { name: 'branch-2', at: [-1.8, 0.68, 1.4] },
    ],
    branchOut: [1, 0, 0],
    stub: STUB,
  },
  {
    // Beside the pumps at 1.7 m, over their motors: each discharge rises,
    // turns and runs across to it (its non-return valve on the riser, its
    // isolating valve on the level, both in reach); out to the sink at its
    // south end.
    id: DUTY_ID['discharge-header'],
    from: [0.9, 1.7, 2.4],
    to: [0.9, 1.7, -2.0],
    od: 0.168,
    branches: [
      { name: 'branch-1', at: [0.9, 1.7, -1.28] },
      { name: 'branch-2', at: [0.9, 1.7, 1.52] },
    ],
    branchOut: [-1, 0, 0],
    stub: STUB,
  },
];

/** A header's ports: its main end, and each branch stub's end. */
export function headerPorts(
  h: Header,
): Record<string, { at: Vec3; outward: Vec3 }> {
  const len = Math.hypot(
    h.to[0] - h.from[0],
    h.to[1] - h.from[1],
    h.to[2] - h.from[2],
  );
  const away: Vec3 = [
    (h.from[0] - h.to[0]) / len,
    (h.from[1] - h.to[1]) / len,
    (h.from[2] - h.to[2]) / len,
  ];
  return {
    main: { at: h.from, outward: away },
    ...Object.fromEntries(
      h.branches.map((b) => [
        b.name,
        {
          at: [
            b.at[0] + h.branchOut[0] * h.stub,
            b.at[1] + h.branchOut[1] * h.stub,
            b.at[2] + h.branchOut[2] * h.stub,
          ] as Vec3,
          outward: h.branchOut,
        },
      ]),
    ),
  };
}

const turn = ([x, y, z]: readonly number[], yaw: number): Vec3 => [
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

type End = DutyItem | 'suction-header' | 'discharge-header';

/** An item's or header's port in the room. */
export function dutyPort(item: End, port: string) {
  if (item === 'suction-header' || item === 'discharge-header')
    return headerPorts(HEADERS.find((h) => h.id === DUTY_ID[item])!)[port];
  const p = ITEM_PORTS[item][port];
  const place = PLACES[item];
  const [x, y, z] = turn(p.at, place.yaw);
  return {
    at: round3([place.x + x, y, place.z + z]),
    outward: round3(turn(p.out, place.yaw)),
  };
}

export function layoutDutyStandby(): PlantRoomLayout {
  const places = DUTY_ITEMS.map((item) => ({ ...PLACES[item], y: 0 }));
  return {
    halfX: 6,
    halfZ: 4.5,
    height: 4,
    places,
    solids: DUTY_ITEMS.map((item) => {
      const { x, z } = PLACES[item];
      const { w, d } = DUTY_SIZE[item];
      return {
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      };
    }),
  };
}

interface DutyLink {
  id: string;
  from: [End, string];
  to: [End, string];
  medium: PlumbMedium;
}

export const DUTY_LINKS: readonly DutyLink[] = [
  {
    id: 'supply-feed',
    from: ['supply', 'out-1'],
    to: ['panel', 'supply-in'],
    medium: 'power',
  },
  {
    id: 'pump-1-feed',
    from: ['panel', 'pump-1'],
    to: ['pump-1', 'power'],
    medium: 'power',
  },
  {
    id: 'pump-2-feed',
    from: ['panel', 'pump-2'],
    to: ['pump-2', 'power'],
    medium: 'power',
  },
  {
    id: 'to-suction-header',
    from: ['water-source', 'out-1'],
    to: ['suction-header', 'main'],
    medium: 'water',
  },
  {
    id: 'pump-1-suction',
    from: ['suction-header', 'branch-1'],
    to: ['pump-1', 'suction'],
    medium: 'water',
  },
  {
    id: 'pump-2-suction',
    from: ['suction-header', 'branch-2'],
    to: ['pump-2', 'suction'],
    medium: 'water',
  },
  {
    id: 'pump-1-delivery',
    from: ['pump-1', 'discharge'],
    to: ['discharge-header', 'branch-1'],
    medium: 'water',
  },
  {
    id: 'pump-2-delivery',
    from: ['pump-2', 'discharge'],
    to: ['discharge-header', 'branch-2'],
    medium: 'water',
  },
  {
    id: 'to-sink',
    from: ['discharge-header', 'main'],
    to: ['water-sink', 'in-1'],
    medium: 'water',
  },
];

export const DUTY_PIPES: Record<
  'power' | 'water',
  { kind: string; od: number; joint: PipeJoint; colour: string }
> = {
  power: {
    kind: 'steel-screwed',
    od: 0.032,
    joint: 'thread',
    colour: '#e07a22',
  },
  water: { kind: 'pvc-pressure', od: 0.16, joint: 'socket', colour: '#3d7f45' },
};

export interface DutyLine {
  id: string;
  medium: 'power' | 'water';
  points: Vec3[];
}

export interface DutyStandbyRig {
  layout: PlantRoomLayout;
  expansion: Expansion;
  lines: DutyLine[];
  fittings: PlacedRigFitting[];
  headers: Header[];
  problems: string[];
}

export function plumbDutyStandbyRig(): DutyStandbyRig {
  const layout = layoutDutyStandby();
  const kindOf: Record<End, string> = {
    supply: 'experimental-source',
    panel: 'duty-standby-panel',
    'water-source': 'experimental-source',
    'water-sink': 'experimental-sink',
    'pump-1': 'pump',
    'pump-2': 'pump',
    'suction-header': 'header',
    'discharge-header': 'header',
  };
  const ends = Object.keys(kindOf) as End[];
  const nodes = ends.map((e) => ({ id: DUTY_ID[e], kind: kindOf[e] }));
  const edges: PlumbEdge[] = DUTY_LINKS.map((l) => ({
    id: l.id,
    sourceId: DUTY_ID[l.from[0]],
    sourcePort: l.from[1],
    targetId: DUTY_ID[l.to[0]],
    targetPort: l.to[1],
    medium: l.medium,
  }));
  const expansion = expandForPlumbing(nodes, edges, {
    isolate: new Set(['pump']),
    pumps: new Set(['pump']),
    discharge: 'discharge',
    powerIsolators: 'every-device',
    switchgear: new Set(['duty-standby-panel']),
  });
  const box = (item: DutyItem) => {
    const { x, z } = PLACES[item];
    const { w, d, h } = DUTY_SIZE[item];
    return {
      min: [x - w / 2, 0, z - d / 2] as Vec3,
      max: [x + w / 2, h, z + d / 2] as Vec3,
    };
  };
  const pipeBox = (h: Header) => {
    const r = h.od / 2 + 0.02;
    return {
      min: [
        Math.min(h.from[0], h.to[0]) - r,
        Math.min(h.from[1], h.to[1]) - r,
        Math.min(h.from[2], h.to[2]) - r,
      ] as Vec3,
      max: [
        Math.max(h.from[0], h.to[0]) + r,
        Math.max(h.from[1], h.to[1]) + r,
        Math.max(h.from[2], h.to[2]) + r,
      ] as Vec3,
    };
  };
  const requests: RouterLine[] = DUTY_LINKS.map((l) => {
    const pipe = DUTY_PIPES[l.medium as 'power' | 'water'];
    return {
      id: l.id,
      start: dutyPort(...l.from),
      end: dutyPort(...l.to),
      od: pipe.od,
      joint: pipe.joint,
      price: l.medium === 'water' ? 3 : 1,
      // Short leads on the deliveries, which run only a metre to their
      // header; long ones out of a motor's terminal box, to clear the set.
      startStraight: l.id.endsWith('-delivery') ? 0.25 : 0.55,
      endStraight: l.id.endsWith('-delivery')
        ? 0.25
        : l.medium === 'power'
          ? 0.8
          : 0.55,
    };
  });
  const routed = routeVoxelLines(
    {
      halfX: layout.halfX,
      halfZ: layout.halfZ,
      height: layout.height,
      obstacles: [...DUTY_ITEMS.map(box), ...HEADERS.map(pipeBox)],
    },
    requests,
  );
  const problems = [...routed.problems];
  const lines: DutyLine[] = [];
  const fittings: PlacedRigFitting[] = [];
  for (const l of DUTY_LINKS) {
    const points = routed.routes.get(l.id);
    if (!points) {
      problems.push(`${l.id}: not routed`);
      continue;
    }
    lines.push({ id: l.id, medium: l.medium as 'power' | 'water', points });
    fittings.push(
      ...placeRigFittings(l.id, points, expansion.along.get(l.id) ?? []),
    );
  }
  return { layout, expansion, lines, fittings, headers: HEADERS, problems };
}

// ---- The rig working ----------------------------------------------------------------

/**
 * The rig's working model: the controller, each fitting's state (all left
 * open), each pump's non-return valve's fault (jammed open, or not), and
 * the water. A pump runs if commanded with its power isolator on; the
 * controller sees that as its running feedback.
 */
export function createDutyStandbyModel(rig: DutyStandbyRig) {
  const water = createExperimentalSource({
    id: DUTY_ID['water-source'],
    substance: 'pool-water',
    maxRate: 700,
  });
  const sink = createExperimentalSink({
    id: DUTY_ID['water-sink'],
    substance: 'pool-water',
    maxRate: 700,
  });
  const open = new Map(rig.fittings.map((f) => [f.id, f.normally === 'open']));
  const on = (edge: string, kind?: string) =>
    rig.fittings
      .filter((f) => f.edge === edge && (!kind || f.kind === kind))
      .every((f) => open.get(f.id));
  const jammed: [boolean, boolean] = [false, false];
  let controller: DutyStandbyState = newDutyStandby();
  let running: [boolean, boolean] = [false, false];
  let hydraulics = pumpsHydraulics(NK_150_315, running, [true, true], jammed);
  const powered = (i: PumpIndex) => on(`pump-${i + 1}-feed`);
  const valvesOpen = (i: PumpIndex) =>
    on(`pump-${i + 1}-suction`, 'isolating-valve') &&
    on(`pump-${i + 1}-delivery`, 'isolating-valve');
  return {
    water,
    sink,
    isOpen: (id: string) => open.get(id) ?? false,
    setOpen: (id: string, value: boolean) => {
      if (open.has(id)) open.set(id, value);
    },
    /** A pump's non-return valve, jammed open (a fault to try). */
    isJammed: (i: PumpIndex) => jammed[i],
    setJammed: (i: PumpIndex, value: boolean) => {
      jammed[i] = value;
    },
    press(e: Exclude<DutyStandbyEvent, { type: 'reset' }> | { type: 'reset' }) {
      controller =
        e.type === 'reset'
          ? pressDutyStandby(controller, {
              type: 'reset',
              available: [powered(0), powered(1)],
            })
          : pressDutyStandby(controller, e);
    },
    step(dt: number) {
      if (!(dt > 0)) return;
      const c = commands(controller);
      running = [c[0] && powered(0), c[1] && powered(1)];
      controller = stepDutyStandby(controller, running, dt);
      hydraulics = pumpsHydraulics(
        NK_150_315,
        running,
        [valvesOpen(0), valvesOpen(1)],
        jammed,
      );
      sink.accept(water.draw((hydraulics.delivered * dt) / 3600, dt), dt);
    },
    readings: () => ({
      controller,
      commands: commands(controller),
      running,
      ...hydraulics,
    }),
  };
}

export type DutyStandbyModel = ReturnType<typeof createDutyStandbyModel>;
