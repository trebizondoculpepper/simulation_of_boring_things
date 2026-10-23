import {
  SOURCE_SHAPE,
  createExperimentalSink,
  createExperimentalSource,
} from '../../../game/plant/experimental-source';
import type { SourcePort } from '../../../game/plant/experimental-source';
import { expandForPlumbing } from '../../../game/plant/plumbing-expansion';
import type {
  Expansion,
  FittingKind,
  PlumbEdge,
  PlumbMedium,
} from '../../../game/plant/plumbing-expansion';
import {
  INVERTER_40,
  NK_150_315,
  pumpDrive,
  stepPowerChain,
} from '../../../game/plant/power-conversion';
import type {
  PowerChainState,
  PowerChainStep,
} from '../../../game/plant/power-conversion';
import { routeVoxelLines } from '../../components/core/logic/voxel-router';
import type { RouterLine } from '../../components/core/logic/voxel-router';
import type { PipeJoint, Vec3 } from '../../components/core/logic/pipe-route';
import type { PlantRoomLayout } from './plant-room-layout';
import { placeRigFittings } from './rig-fittings';

/**
 * The battery-backed pump rig (Dev22; the owner, 2026-10-23): an endless
 * 450 V supply, through an isolator, to a rectifier, its battery bank and
 * an inverter (an online UPS's three parts, `power-conversion.ts`), and
 * from the inverter, through a second isolator, to an end-suction pump
 * set, which pumps water from an endless source to an endless sink.
 * Switch the supply's isolator off and the battery carries the pump until
 * it is flat; then the inverter cuts out and the pump stops.
 *
 * The plumber's layers, as in Dev21: the graph, expanded with its
 * fittings (an isolator in the supply's feed and in the pump's; the pump's
 * suction isolating valve, and its discharge non-return and isolating
 * valves), routed by the voxel router, each fitting placed where a person
 * can reach it. Pure.
 */

export type RigItem =
  | 'supply'
  | 'rectifier'
  | 'battery'
  | 'inverter'
  | 'pump'
  | 'water-source'
  | 'water-sink';

export const RIG_ITEMS: readonly RigItem[] = [
  'supply',
  'rectifier',
  'battery',
  'inverter',
  'pump',
  'water-source',
  'water-sink',
];

/** The node id of each item. */
export const RIG_ID: Record<RigItem, string> = {
  supply: 'rig.supply',
  rectifier: 'rig.rectifier',
  battery: 'rig.battery',
  inverter: 'rig.inverter',
  pump: 'rig.pump',
  'water-source': 'rig.water-source',
  'water-sink': 'rig.water-sink',
};

/** The supply's voltage (the owner's 450 V). */
export const SUPPLY_VOLTS = 450;

/** A power cabinet: width, depth, height, metres (a 40 kVA UPS's cabinet, split in three). */
export const CABINET = { w: 0.6, d: 0.8, h: 1.9, gland: 0.04 } as const;

/** Each item's size on the floor. */
export const RIG_SIZE: Record<RigItem, { w: number; d: number; h: number }> = {
  supply: { w: 0.7, d: 0.7, h: SOURCE_SHAPE.height + 0.1 },
  rectifier: { w: CABINET.w, d: CABINET.d, h: CABINET.h },
  battery: { w: CABINET.w, d: CABINET.d, h: CABINET.h },
  inverter: { w: CABINET.w, d: CABINET.d, h: CABINET.h },
  pump: { w: 1.9, d: 0.6, h: 1.3 },
  'water-source': { w: 0.7, d: 0.7, h: SOURCE_SHAPE.height + 0.1 },
  'water-sink': { w: 0.7, d: 0.7, h: SOURCE_SHAPE.height + 0.1 },
};

type Port = { at: Vec3; out: Vec3 };

/** A cabinet's two cable glands on its top: left (−x) and right (+x). */
const cabinetPorts = (left: string, right: string): Record<string, Port> => ({
  [left]: { at: [-0.15, CABINET.h + CABINET.gland, 0], out: [0, 1, 0] },
  [right]: { at: [0.15, CABINET.h + CABINET.gland, 0], out: [0, 1, 0] },
});

const portOf = (ports: SourcePort[], name: string): Port => {
  const p = ports.find((q) => q.name === name)!;
  return { at: p.at, out: p.out };
};

/**
 * Each item's ports in its own frame. The pump's are the end-suction set's
 * (as in Dev19): suction at its volute's end, discharge up from its top,
 * power into its motor's terminal box.
 */
export const RIG_PORTS: Record<RigItem, Record<string, Port>> = {
  supply: {
    'out-1': portOf(
      createExperimentalSource({ id: 's', substance: 'power-400v' }).ports,
      'out-1',
    ),
  },
  rectifier: cabinetPorts('ac-in', 'dc-out'),
  battery: cabinetPorts('dc-in', 'dc-out'),
  inverter: cabinetPorts('dc-in', 'ac-out'),
  pump: {
    suction: { at: [-1, 0.68, 0], out: [-1, 0, 0] },
    discharge: { at: [-0.57, 1.26, 0.12], out: [0, 1, 0] },
    power: { at: [0.55, 0.8, 0.2], out: [1, 0, 0] },
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
};

/** Where each item stands: x, z, facing (0 faces south, +z). */
const PLACES: Record<RigItem, { x: number; z: number; yaw: number }> = {
  supply: { x: -4.6, z: -3.5, yaw: 0 },
  rectifier: { x: -3.4, z: -3.8, yaw: 0 },
  battery: { x: -2.6, z: -3.8, yaw: 0 },
  inverter: { x: -1.8, z: -3.8, yaw: 0 },
  pump: { x: 1.6, z: -1.2, yaw: 0 },
  'water-source': { x: -1.2, z: 0.6, yaw: 0 },
  'water-sink': { x: 4.2, z: 0.6, yaw: 0 },
};

export const RIG_HALF = { x: 6, z: 4.5 } as const;
export const RIG_HEIGHT = 4;

export function layoutBatteryPumpRig(): PlantRoomLayout {
  const places = RIG_ITEMS.map((item) => ({ ...PLACES[item], y: 0 }));
  return {
    halfX: RIG_HALF.x,
    halfZ: RIG_HALF.z,
    height: RIG_HEIGHT,
    places,
    solids: RIG_ITEMS.map((item) => {
      const { x, z } = PLACES[item];
      const { w, d } = RIG_SIZE[item];
      return {
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      };
    }),
  };
}

/** A line: from one item's port to another's. */
interface RigLink {
  id: string;
  from: [RigItem, string];
  to: [RigItem, string];
  medium: PlumbMedium;
}

export const RIG_LINKS: readonly RigLink[] = [
  {
    id: 'supply-feed',
    from: ['supply', 'out-1'],
    to: ['rectifier', 'ac-in'],
    medium: 'power',
  },
  {
    id: 'charge',
    from: ['rectifier', 'dc-out'],
    to: ['battery', 'dc-in'],
    medium: 'power',
  },
  {
    id: 'discharge',
    from: ['battery', 'dc-out'],
    to: ['inverter', 'dc-in'],
    medium: 'power',
  },
  {
    id: 'pump-feed',
    from: ['inverter', 'ac-out'],
    to: ['pump', 'power'],
    medium: 'power',
  },
  {
    id: 'suction',
    from: ['water-source', 'out-1'],
    to: ['pump', 'suction'],
    medium: 'water',
  },
  {
    id: 'delivery',
    from: ['pump', 'discharge'],
    to: ['water-sink', 'in-1'],
    medium: 'water',
  },
];

/** Each medium's pipe or conduit. */
export const RIG_PIPES: Record<
  'power' | 'water',
  { kind: string; od: number; joint: PipeJoint; colour: string }
> = {
  // Steel conduit, orange for electrical services (BS 1710).
  power: {
    kind: 'steel-screwed',
    od: 0.032,
    joint: 'thread',
    colour: '#e07a22',
  },
  // DN150 for the pump's suction and discharge, green for water.
  water: { kind: 'pvc-pressure', od: 0.16, joint: 'socket', colour: '#3d7f45' },
};

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

/** An item's port in the room. */
export function rigPort(item: RigItem, port: string) {
  const p = RIG_PORTS[item][port];
  const place = PLACES[item];
  const [x, y, z] = turn(p.at, place.yaw);
  return {
    at: round3([place.x + x, y, place.z + z]),
    outward: round3(turn(p.out, place.yaw)),
  };
}

export interface RigLine {
  id: string;
  medium: 'power' | 'water';
  points: Vec3[];
}

export interface RigFitting {
  id: string;
  kind: FittingKind;
  medium: PlumbMedium;
  normally: 'open' | 'closed';
  edge: string;
  at: Vec3;
  along: Vec3;
}

export interface BatteryPumpRig {
  layout: PlantRoomLayout;
  expansion: Expansion;
  lines: RigLine[];
  fittings: RigFitting[];
  problems: string[];
}

/** How far along a line from its end a fitting sits, metres. */
const OFFSET = 0.35;
/** The heights a person can work a fitting at, metres. */
const REACH = [0.3, 1.8] as const;

export function plumbBatteryPumpRig(): BatteryPumpRig {
  const layout = layoutBatteryPumpRig();
  const kindOf: Record<RigItem, string> = {
    supply: 'experimental-source',
    rectifier: 'rectifier',
    battery: 'battery',
    inverter: 'inverter',
    pump: 'pump',
    'water-source': 'experimental-source',
    'water-sink': 'experimental-sink',
  };
  const nodes = RIG_ITEMS.map((item) => ({
    id: RIG_ID[item],
    kind: kindOf[item],
  }));
  const edges: PlumbEdge[] = RIG_LINKS.map((l) => ({
    id: l.id,
    sourceId: RIG_ID[l.from[0]],
    sourcePort: l.from[1],
    targetId: RIG_ID[l.to[0]],
    targetPort: l.to[1],
    medium: l.medium,
  }));
  const expansion = expandForPlumbing(nodes, edges, {
    // The pump's water connections isolated, a non-return valve on its discharge.
    isolate: new Set(['pump']),
    pumps: new Set(['pump']),
    discharge: 'discharge',
    // An isolator in the last feed to each device, but none inside the UPS
    // (between its rectifier, battery and inverter).
    powerIsolators: 'every-device',
    switchgear: new Set(['battery', 'inverter']),
  });
  const r = (item: RigItem) => {
    const { x, z } = PLACES[item];
    const { w, d, h } = RIG_SIZE[item];
    return {
      min: [x - w / 2, 0, z - d / 2] as Vec3,
      max: [x + w / 2, h, z + d / 2] as Vec3,
    };
  };
  const requests: RouterLine[] = RIG_LINKS.map((l) => {
    const pipe = RIG_PIPES[l.medium as 'power' | 'water'];
    return {
      id: l.id,
      start: rigPort(...l.from),
      end: rigPort(...l.to),
      od: pipe.od,
      joint: pipe.joint,
      price: l.medium === 'water' ? 3 : 1,
      startStraight: OFFSET + 0.3,
      endStraight: OFFSET + 0.3,
    };
  });
  const routed = routeVoxelLines(
    {
      halfX: layout.halfX,
      halfZ: layout.halfZ,
      height: layout.height,
      // The pump's own body only: the cabinets and cylinders have their
      // ports on top, and the router keeps clear of them by their leads.
      obstacles: RIG_ITEMS.map(r),
    },
    requests,
  );
  const problems = [...routed.problems];
  const lines: RigLine[] = [];
  const fittings: RigFitting[] = [];
  for (const l of RIG_LINKS) {
    const points = routed.routes.get(l.id);
    if (!points) {
      problems.push(`${l.id}: not routed`);
      continue;
    }
    lines.push({ id: l.id, medium: l.medium as 'power' | 'water', points });
    fittings.push(
      ...placeRigFittings(l.id, points, expansion.along.get(l.id) ?? [], {
        offset: OFFSET,
        reach: REACH,
      }),
    );
  }
  return { layout, expansion, lines, fittings, problems };
}

// ---- The rig working ----------------------------------------------------------------

/**
 * The rig's working model: the supply, the UPS's three parts, the pump
 * and the water, and each fitting's state (all left open by the plumber,
 * so the rig starts running). Each step: the supply's isolator decides
 * whether the rectifier has its 450 V; the pump's isolator whether the
 * pump sees the inverter's output; the pump runs on that, drawing its
 * power through the chain and, with its valves open, moving its water.
 */
export function createBatteryPumpModel(rig: BatteryPumpRig) {
  const supply = createExperimentalSource({
    id: RIG_ID.supply,
    substance: 'power-400v',
    potential: SUPPLY_VOLTS,
  });
  const water = createExperimentalSource({
    id: RIG_ID['water-source'],
    substance: 'pool-water',
    maxRate: 400,
  });
  const sink = createExperimentalSink({
    id: RIG_ID['water-sink'],
    substance: 'pool-water',
    maxRate: 400,
  });
  const open = new Map(rig.fittings.map((f) => [f.id, f.normally === 'open']));
  const on = (edge: string) =>
    rig.fittings.filter((f) => f.edge === edge).every((f) => open.get(f.id));
  let chain: PowerChainState = { charge: 1, inverterOn: true };
  let last: PowerChainStep = stepPowerChain(chain, SUPPLY_VOLTS, 0, 0);
  let pumpVolts = INVERTER_40.outputVolts;
  let pump = pumpDrive(NK_150_315, pumpVolts);
  let flow = 0;
  return {
    supply,
    water,
    sink,
    isOpen: (id: string) => open.get(id) ?? false,
    setOpen: (id: string, value: boolean) => {
      if (open.has(id)) open.set(id, value);
    },
    /** The fittings on a line. */
    fittingsOn: (edge: string) =>
      rig.fittings.filter((f) => f.edge === edge).map((f) => f.id),
    step(dt: number) {
      if (!(dt > 0)) return;
      const inputVolts = on('supply-feed') ? supply.flow.potential : 0;
      pumpVolts = on('pump-feed') ? last.outputVolts : 0;
      pump = pumpDrive(NK_150_315, pumpVolts);
      last = stepPowerChain(chain, inputVolts, pump.kW, dt);
      chain = last.state;
      supply.draw((last.supplyKW * dt) / 3600, dt);
      // With its suction and delivery open, it moves its water.
      flow =
        pump.running && on('suction') && on('delivery')
          ? sink.accept(water.draw((pump.flow * dt) / 3600, dt), dt) *
            (3600 / dt)
          : 0;
    },
    /** What the panels show. */
    readings: () => ({
      ...last,
      charge: chain.charge,
      inverterOn: chain.inverterOn,
      supplyVolts: on('supply-feed') ? supply.flow.potential : 0,
      pumpVolts,
      pumpRunning: pump.running,
      pumpKW: pump.kW,
      // Its gauges: at its duty point while it moves water; at nothing
      // stopped, or against a shut valve (both near enough for a placeholder).
      dischargeBar: flow > 0 ? pump.dischargeBar : 0,
      suctionBar: flow > 0 ? pump.suctionBar : 0,
      flow,
    }),
  };
}

export type BatteryPumpModel = ReturnType<typeof createBatteryPumpModel>;
