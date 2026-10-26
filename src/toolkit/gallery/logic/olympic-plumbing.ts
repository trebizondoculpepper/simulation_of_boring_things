import type { Footprint } from '../../controls/logic/walk-collision';
import type { PipeJoint, Vec3 } from '../../components/core/logic/pipe-route';
import { pipeClashes } from '../../components/core/logic/pipe-route';
import type { DrawnRun } from '../../components/core/logic/pipe-route';
import { routeVoxelLines } from '../../components/core/logic/voxel-router';
import type {
  RouterLine,
  RouterRegion,
} from '../../components/core/logic/voxel-router';
import { pricePerMetre } from '../../components/core/logic/pipe-costs';
import {
  expandForPlumbing,
  operatorFor,
} from '../../../game/plant/plumbing-expansion';
import type {
  Actuation,
  Actuator,
  Expansion,
  Operator,
  FittingKind,
  PlumbEdge,
  PlumbMedium,
  PlumbNode,
} from '../../../game/plant/plumbing-expansion';
import { machinePorts } from './machine-ports';
import type { MachinePort } from './machine-ports';
import type { Item } from './room-equipment';
import type { Meter, PipeRun, Valve, WallCrossing } from './room-pipes';
import type { Containment } from './cable-containment';
import { PLANT_ROOM } from './plant-rooms';
import { sizeRoom } from './room-sizer';
import { scoreRoom } from './room-scorer';
import type { Score } from './room-scorer';
import type { Region } from './room-regions';
import {
  DECK_SOFFIT,
  HEADERS,
  PLAN_ACCESS,
  accessOf,
  footprintOf,
  keptClear,
  olympicPlan,
  olympicRoomPlan,
} from './olympic-plan';
import type { PlanItem } from './olympic-plan';

/**
 * The Olympic plant room's plumbing (prompt 033, stage 2): the plan
 * (`olympic-plan.ts`) put through the pipeline's plumbing layers. The
 * machines' ports are the room's own (`machinePorts`), turned into place.
 *
 * Laid by rule, as plant builders do and as the pipeline's blocks are:
 *
 * - the pump block: each pump's suction straight out of its side through
 *   the west wall into the balance tank hall; its discharge rising to a
 *   manifold that runs north to the battery;
 * - the battery block: the inlet, outlet and backwash headers along its
 *   front with every filter's branches (its face's five valves, or three:
 *   an option), and two stubs on the outlet
 *   header for the heat exchanger's side-stream, a regulating valve in the
 *   header between them;
 * - the drainage: the backwash header falling to a floor channel that runs
 *   south to the main plant (the router knows nothing of falls);
 * - the pool's overflow and main drain mains, by gravity, in through the
 *   north wall and out through the west in the room's north-west corner.
 *
 * Routed by the voxel router (`voxel-router.ts`), each line ending at its
 * machine's port or at the wall of the place it goes to (pool north, main
 * plant south, balance tank west, power and control east): the filtered
 * water to the contact tank, the UV and back to the pool; the heat
 * exchanger's side-stream and its heating; the make-up; the chemicals;
 * the ozone; power to every device. The plumber (`expandForPlumbing`) sets
 * the fittings into every line, by the room's options (`OlympicOptions`):
 * how its valves are worked, each filter's face, where its flowmeters go;
 * the scorer scores the room. Pure.
 */

/** The plumber's choices for the room (the owner, 2026-10-23). */
export interface OlympicOptions {
  /** How the valves are worked: by hand, by hand where reachable, or all automatic (`operatorFor`). */
  actuation: Actuation;
  /** What drives an automatic valve. */
  actuator: Actuator;
  /**
   * Each filter's face: three valves (inlet, outlet, a backwash to waste
   * from its drain), or the five-valve battery (Dev26, `five-valve-filter.ts`):
   * V1 inlet, V2 outlet, V3 backwash in, V4 backwash out, V5 rinse, its
   * drain beside them.
   */
  filterValves: 3 | 5;
  /** Where flowmeters go, as the plumber's `<kind>.<port>`s: none, or some. */
  flowmeters: ReadonlySet<string>;
}

/**
 * The room as built: every valve solenoid-operated, worked from its panels;
 * the five-valve battery; a flowmeter on each filter's outlet riser
 * (reading service up it, a backwash down it) and on the pumps' common
 * discharge.
 */
export const OLYMPIC: OlympicOptions = {
  actuation: 'all-automatic',
  actuator: 'solenoid',
  filterValves: 5,
  flowmeters: new Set(['filter.outlet', 'pumps.discharge']),
};

type Medium = PlumbMedium;
type Kind =
  | 'pvc-pressure'
  | 'pvc-drain'
  | 'lagged-heating'
  | 'copper'
  | 'chemical-tube'
  | 'stainless'
  | 'steel-screwed';

export interface OlympicRun {
  name: string;
  /** Which line of the schematic it is part of. */
  line: string;
  kind: Kind;
  od: number;
  joint: PipeJoint;
  medium: Medium;
  points: Vec3[];
  /** Laid by rule (a block's, a fall's) or by the router. */
  by: 'rule' | 'router';
}

export interface OlympicFitting {
  id: string;
  kind: FittingKind | 'regulating-valve' | 'fused-tap-off';
  /** A valve's actuator's (or a vertical valve's neck's) way in plan, when not the room's default. */
  facing?: Vec3;
  line: string;
  /** The run it is set on. */
  run: string;
  at: Vec3;
  along: Vec3;
  normally: 'open' | 'closed';
  /**
   * How it is worked: a valve by its solenoid, from the panel (a direct
   * solenoid valve on a small line, a solenoid pilot on a pneumatic
   * actuator on a main); a machine's local isolator by hand; a fused
   * tap-off on the busbar overhead by an operating pole from the floor.
   */
  operator: Operator | 'pole';
  /** Whether it can be worked: from the panel, or by a person standing on the floor. */
  reachable: boolean;
}

/** The room's item, for its ports, by the plan's key. */
const ITEM: Record<string, { key: string }> = {
  pumps: { key: 'pump-pair' },
  contact: { key: 'contact-tank' },
  generator: { key: 'ozone-generator:plant_pool_02' },
  uv: { key: 'uv-unit' },
  exchanger: { key: 'heat-exchanger' },
  panel: { key: 'pump-panel' },
  controller: { key: 'dosing-controller' },
  hypo: { key: 'hypo-pumps' },
  acid: { key: 'acid-pump' },
  tankPanel: { key: 'balance-tank-panel' },
};
const itemOf = (p: PlanItem): Item => ({
  key: p.key.startsWith('filter') ? 'sand-filter:3' : ITEM[p.key].key,
  // The filters' nozzles radial, each pipe into its vessel square to its shell (the owner, 2026-10-23).
  ...(p.key.startsWith('filter') ? { nozzles: 'radial' as const } : {}),
  label: p.label,
  w: p.w,
  d: p.d,
  h: p.h,
  mount: p.mount,
  ...(p.y !== undefined ? { y: p.y } : {}),
  ...(p.stand ? { stand: p.stand } : {}),
});

/** Turned as Three turns an object: 0 faces south. */
const YAW = {
  south: 0,
  east: Math.PI / 2,
  north: Math.PI,
  west: (3 * Math.PI) / 2,
};
const round = (v: number) => Math.round(v * 1e4) / 1e4;
const r3 = (v: readonly number[]): Vec3 => [
  round(v[0]),
  round(v[1]),
  round(v[2]),
];
const turn = (v: readonly number[], yaw: number): Vec3 => [
  round(v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw)),
  round(v[1]),
  round(-v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw)),
];

export interface RoomPort {
  machine: string;
  name: string;
  at: Vec3;
  outward: Vec3;
  od: number;
  service: MachinePort['service'];
}

/** Each machine's ports, in the room. */
export function olympicPorts(items = olympicPlan()): RoomPort[] {
  return items.flatMap((p) => {
    const yaw = YAW[p.facing];
    const y0 = p.mount === 'wall' ? (p.y ?? 0) : (p.stand ?? 0);
    // Wall equipment's frame is the middle of its back, in the wall's face (`Placed`).
    const forward = turn([0, 0, 1], yaw);
    const back = p.mount === 'wall' ? p.d / 2 : 0;
    const ox = p.x - forward[0] * back;
    const oz = p.z - forward[2] * back;
    return machinePorts(itemOf(p)).map((q) => {
      const t = turn(q.at, yaw);
      return {
        machine: p.key,
        name: q.name,
        at: [round(ox + t[0]), round(y0 + t[1]), round(oz + t[2])] as Vec3,
        outward: turn(q.outward, yaw),
        od: q.od,
        service: q.service,
      };
    });
  });
}

/** The main's size, the Olympic's circulation (714 m³/h): DN350. */
export const MAIN = 0.355;
/** How high the battery's headers run: the inlet at the filters' inlets, the outlet at their outlets, the backwash below. */
const HEADER = {
  inlet: { z: 0.15 },
  // Overhead, so the battery's face is clear to stand at.
  // High enough over the inlet header that a valve's actuator on a filter's
  // backwash-in branch, under it, stands clear.
  outlet: { z: 0.65, y: 3.15 },
} as const;
/** The battery's outlet risers and backwash drops stand this far inside the filters' footprints' fronts, just clear of the vessels. */
const RISE = 0.2;
/** The backwash header's trench under the floor along the battery's front: its pipe's height. */
const TRENCH_Y = -0.2;
/** The pump manifold's height: over the balance tank doors' clear space (2.6 m) and the battery's outlet header. */
const MANIFOLD_Y = 3.7;
/** The pump discharges' run across the pair's top, just over it (1.9 m). */
const ACROSS_Y = 2.05;
/** The side-stream stubs rise out of the outlet header to here. */
const STUB_TOP = 3.6;
/**
 * A five-valve face's heights: the outlet riser's flowmeter; the
 * backwash-out valve on its drop; the rinse valve on its drop under the
 * riser's foot, below the service hatch.
 */
const METER_Y = 1.3;
const BACKWASH_OUT_Y = 1.6;
const RINSE_VALVE_Y = 0.5;
/**
 * The backwash-out drop stands this far west of the inlet nozzle, so the
 * vessel's sight glass, between the inlet and outlet nozzles, stays in
 * view (the owner, 2026-10-23: no pipe over a window).
 */
const BACKWASH_OUT_OFF = 0.2;
/** The backwash header and its channel, sized for a filter's backwash to waste (about 210 m³/h): DN300. */
const WASTE = 0.315;
/** The floor channel's depth below the floor. */
const CHANNEL = -0.3;
/**
 * The busbar ring (the owner, 2026-10-23): a plug-in busbar trunking run
 * round the room's walls, fed from the east wall, each machine fed by a
 * short drop from a tap-off on it. High, over the stair's and the east
 * gantry's headroom (5.6 m) and under the services ceiling (6 m); a little
 * in from the walls. Its trunking is about 150 mm square.
 */
export const BUSBAR = { y: 5.75, off: 0.3, od: 0.15 } as const;
/** A conduit's saddles hold it this far off its wall, surface to face, metres. */
const WALL_SADDLE = 0.03;
/** A tap-off box hangs this far under the busbar, its drop leaving its foot. */
const TAP = 0.3;
/** The dosing spool's line in from the south wall, and the height the chemical lines come in at. */
const SPOOL_OFF = 0.7;
const CHEMICAL_IN = 2.2;
/** How far a dosing quill stands off its main's surface, metres. */
const QUILL = 0.08;
/** The open floor's cells, and how near a machine or a wall a run may still be low, metres. */
const OPEN_FLOOR = { cell: 1, near: 1.0, wall: 0.9 } as const;
/** The sample line's height along the south wall, over headroom, under the heating's entries. */
const SAMPLE_Y = 2.35;
/** The lines the router lays first: they have least room. */
const FIRST = new Set(['battery-to-contact', 'hx-return']);
/** A line ending at a wall ends this far inside its face, at its sleeve. */
const SLEEVE = 0.15;
/** Where a person can reach a fitting from the floor, metres. */
const REACH = { low: 0.2, high: 2.1 } as const;

const pipeOf: Record<string, { kind: Kind; joint: PipeJoint; medium: Medium }> =
  {
    water: { kind: 'pvc-pressure', joint: 'socket', medium: 'water' },
    // A sample line: pool water, in small chemical-grade tube.
    sample: { kind: 'chemical-tube', joint: 'socket', medium: 'water' },
    drain: { kind: 'pvc-drain', joint: 'socket', medium: 'water' },
    heating: { kind: 'lagged-heating', joint: 'flange', medium: 'water' },
    makeup: { kind: 'copper', joint: 'socket', medium: 'water' },
    chemical: { kind: 'chemical-tube', joint: 'socket', medium: 'chemical' },
    ozone: { kind: 'stainless', joint: 'socket', medium: 'gas' },
    power: { kind: 'steel-screwed', joint: 'thread', medium: 'power' },
  };

const len = (pts: readonly Vec3[]) =>
  pts
    .slice(1)
    .reduce(
      (s, p, k) =>
        s + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1], p[2] - pts[k][2]),
      0,
    );

/** The point `d` metres along a polyline, and its direction there. */
function along(points: readonly Vec3[], d: number) {
  let left = d;
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1];
    const b = points[k];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (!l) continue;
    const dir: Vec3 = [(b[0] - a[0]) / l, (b[1] - a[1]) / l, (b[2] - a[2]) / l];
    if (left <= l || k === points.length - 1) {
      const t = Math.min(left, l);
      return {
        at: r3([a[0] + dir[0] * t, a[1] + dir[1] * t, a[2] + dir[2] * t]),
        along: r3(dir),
      };
    }
    left -= l;
  }
  return { at: points[0], along: [1, 0, 0] as Vec3 };
}

export interface OlympicPlumbing {
  items: PlanItem[];
  ports: RoomPort[];
  runs: OlympicRun[];
  fittings: OlympicFitting[];
  expansion: Expansion;
  /** The schematic the plumber expanded: its nodes and base links. */
  schematic: { nodes: PlumbNode[]; edges: PlumbEdge[] };
  regions: Region[];
  problems: string[];
  reducers: { from: Vec3; to: Vec3; fromOd: number; toOd: number }[];
}

export function plumbOlympic(
  options: OlympicOptions = OLYMPIC,
): OlympicPlumbing {
  const five = options.filterValves === 5;
  const items = olympicPlan();
  const room = olympicRoomPlan();
  const hx = room.halfX;
  const hz = room.halfZ;
  const ports = olympicPorts(items);
  const port = (machine: string, name: string) =>
    ports.find((p) => p.machine === machine && p.name === name)!;
  const runs: OlympicRun[] = [];
  const problems: string[] = [];
  const rule = (
    name: string,
    line: string,
    pipe: keyof typeof pipeOf,
    od: number,
    points: Vec3[],
  ) =>
    runs.push({
      name,
      line,
      ...pipeOf[pipe],
      od,
      points: points.map(r3),
      by: 'rule',
    });

  // ---- The pump block -------------------------------------------------
  // Each suction straight out of the pair's side through the west wall.
  for (const s of ['A', 'B']) {
    const p = port('pumps', `suction${s}`);
    rule(`Suction ${s}`, `tank.suction${s}`, 'water', p.od, [
      [-hx - 0.3, p.at[1], p.at[2]],
      p.at,
    ]);
  }
  // Each discharge up to the manifold, which runs north to the battery.
  const filters = items.filter((i) => i.key.startsWith('filter'));
  const front = footprintOf(filters[0]).maxZ;
  const inletZ = front + HEADER.inlet.z;
  const outletZ = front + HEADER.outlet.z;
  // Within the filters' footprints, just in front of the vessels: clear of the strip where one stands.
  const riseZ = round(front - RISE);
  // Where each nozzle's pipe meets the face pipework's plane: straight out
  // of a square nozzle; along a radial one's radius, its pipe pointing at
  // the vessel's axis until it turns onto the room's square lines.
  const foot = (p: RoomPort): Vec3 => {
    const t = p.outward[2] > 1e-6 ? (riseZ - p.at[2]) / p.outward[2] : 0;
    return r3([p.at[0] + p.outward[0] * t, p.at[1], riseZ]);
  };
  const fp = filters.map((f) => {
    const inlet = port(f.key, 'inlet');
    const outlet = port(f.key, 'outlet');
    const drain = port(f.key, 'drain');
    return {
      inlet,
      outlet,
      drain,
      feet: { inlet: foot(inlet), outlet: foot(outlet), drain: foot(drain) },
    };
  });
  const drainZ = riseZ;
  const inletY = fp[0].inlet.at[1];
  const outletY = HEADER.outlet.y;
  const dA = port('pumps', 'dischargeA');
  const dB = port('pumps', 'dischargeB');
  // Each discharge up off its pump and east across the pair's top, its
  // valves beyond the pair's east side, within reach from the floor there,
  // then up to the manifold, which runs north to the battery.
  const pumpsItem = items.find((i) => i.key === 'pumps')!;
  const mx = round(footprintOf(pumpsItem).maxX + 0.3);
  // The manifold's terminal elbow is full bore. Reduce on its vertical leg,
  // with straight sockets either side, rather than ending a large pipe on a
  // small riser's centreline and leaving an exposed flat face.
  const heelZ = Math.max(dA.at[2], dB.at[2]);
  const reducerTop: Vec3 = [mx, round(MANIFOLD_Y - 0.6), heelZ];
  const reducerBottom: Vec3 = [mx, round(MANIFOLD_Y - 0.95), heelZ];
  const reducers = [
    { from: reducerBottom, to: reducerTop, fromOd: dB.od, toOd: MAIN },
  ];
  for (const d of [dA, dB])
    rule(`Discharge ${d.name.slice(-1)}`, `pumps.${d.name}`, 'water', d.od, [
      d.at,
      [d.at[0], ACROSS_Y, d.at[2]],
      [mx, ACROSS_Y, d.at[2]],
      d === dB ? reducerBottom : [mx, MANIFOLD_Y, d.at[2]],
    ]);
  // The pumps' drain (the owner, 2026-10-25): off discharge B's rise, east
  // and down to a tundish at the floor, which runs to the backwash floor
  // channel and so to the wet hall's holding tank. Its valve (PL2-P1-DV1)
  // on the level length, in reach; shut in service.
  const drainY = round(ACROSS_Y + 0.25);
  rule('Pump discharge drain', 'pumps.drain', 'drain', 0.11, [
    [mx, drainY, dB.at[2]],
    [round(mx + 0.45), drainY, dB.at[2]],
    [round(mx + 0.45), 0.1, dB.at[2]],
  ]);
  rule('Pump discharge manifold', 'battery.inlet', 'water', MAIN, [
    reducerTop,
    [mx, MANIFOLD_Y, heelZ],
    [mx, MANIFOLD_Y, inletZ],
    [mx, inletY, inletZ],
  ]);

  // ---- The battery block ----------------------------------------------
  const xs = (k: 'inlet' | 'outlet' | 'drain') => fp.map((f) => f.feet[k][0]);
  const inletX0 = Math.min(mx, ...xs('inlet'));
  // As far east as the last filter's backwash-in branch, with five valves.
  const inletX1 = Math.max(...xs('inlet'), ...(five ? xs('outlet') : []));
  rule('Inlet header', 'battery.inlet', 'water', MAIN, [
    [inletX0, inletY, inletZ],
    [inletX1, inletY, inletZ],
  ]);
  // The backwash trench falls 1 in 100 from each end to its drop between filters 1 and 2.
  const filterGap = (a: number, b: number) =>
    (footprintOf(filters[a]).maxX + footprintOf(filters[b]).minX) / 2;
  const dropX = filterGap(0, 1);
  // Every drop into the trench: the drains, and with five valves the backwash-out and rinse drops.
  const dropXs = fp.flatMap((f) =>
    five
      ? [f.feet.inlet[0] - BACKWASH_OUT_OFF, f.feet.outlet[0], f.feet.drain[0]]
      : [f.feet.drain[0]],
  );
  const farthest = Math.max(...dropXs.map((x) => Math.abs(x - dropX)));
  const trenchLow = TRENCH_Y - farthest * 0.01;
  const trenchAt = (x: number) => round(trenchLow + Math.abs(x - dropX) * 0.01);
  fp.forEach((f, i) => {
    rule(
      `Filter ${i + 1} inlet`,
      `filter-${i + 1}.inlet`,
      'water',
      f.inlet.od,
      [f.inlet.at, f.feet.inlet, [f.feet.inlet[0], inletY, inletZ]],
    );
    // Up from its nozzle, just in front of the vessel, to the header overhead.
    rule(
      `Filter ${i + 1} outlet`,
      `filter-${i + 1}.outlet`,
      'water',
      f.outlet.od,
      [
        f.outlet.at,
        f.feet.outlet,
        [f.feet.outlet[0], outletY, riseZ],
        [f.feet.outlet[0], outletY, outletZ],
      ],
    );
    if (five) {
      // V3, backwash in: from the inlet header back under the outlet's
      // top to the underdrain's riser.
      rule(
        `Filter ${i + 1} backwash in`,
        `filter-${i + 1}.backwashIn`,
        'water',
        f.outlet.od,
        [
          [f.feet.outlet[0], inletY, inletZ],
          [f.feet.outlet[0], inletY, riseZ],
        ],
      );
      // V4, backwash out: from the top distributor's branch, just in front
      // of the vessel, a little west, clear of the sight glass, and down
      // into the trench.
      const bx = f.feet.inlet[0] - BACKWASH_OUT_OFF;
      rule(
        `Filter ${i + 1} backwash out`,
        `filter-${i + 1}.backwashOut`,
        'drain',
        f.inlet.od,
        [f.feet.inlet, [bx, inletY, riseZ], [bx, trenchAt(bx), riseZ]],
      );
      // V5, rinse: straight down from the underdrain riser's foot into the
      // trench, below the service hatch.
      rule(
        `Filter ${i + 1} rinse`,
        `filter-${i + 1}.rinse`,
        'drain',
        f.outlet.od,
        [f.feet.outlet, [f.feet.outlet[0], trenchAt(f.feet.outlet[0]), riseZ]],
      );
    }
    // Down from its nozzle into the trench: its backwash with three
    // valves; with five, the vessel's drain, to empty it.
    rule(
      `Filter ${i + 1} ${five ? 'drain' : 'backwash'}`,
      `filter-${i + 1}.drain`,
      'drain',
      f.drain.od,
      [
        f.drain.at,
        f.feet.drain,
        [f.feet.drain[0], trenchAt(f.feet.drain[0]), riseZ],
      ],
    );
  });
  // The outlet header, its east end the way on to treatment.
  const outletEast = Math.max(...xs('outlet')) + 0.6;
  rule('Outlet header', 'battery.outlet', 'water', MAIN, [
    [Math.min(...xs('outlet')), outletY, outletZ],
    [outletEast, outletY, outletZ],
  ]);
  // The heat exchanger's side-stream: two stubs rising off the outlet header, between filters 2 and 3, by the exchanger.
  const gap = (a: number, b: number) =>
    (footprintOf(filters[a]).maxX + footprintOf(filters[b]).minX) / 2;
  const hxFlowX = gap(1, 2) - 0.35;
  const hxReturnX = gap(1, 2) + 0.35;
  for (const [name, x] of [
    ['HX side-stream flow stub', hxFlowX],
    ['HX side-stream return stub', hxReturnX],
  ] as const)
    rule(name, 'battery.outlet', 'water', 0.11, [
      [x, outletY, outletZ],
      [x, STUB_TOP, outletZ],
    ]);
  // The backwash header, in its covered trench under the floor along the
  // battery's front, falling 1 in 100 each way to the floor channel
  // between filters 1 and 2, which runs south to the main plant.
  const dx = dropXs;
  const waste = five ? WASTE : 0.16;
  rule('Backwash header, west', 'battery.drain', 'drain', waste, [
    [Math.min(...dx), trenchAt(Math.min(...dx)), drainZ],
    [dropX, trenchLow, drainZ],
  ]);
  rule('Backwash header, east', 'battery.drain', 'drain', waste, [
    [Math.max(...dx), trenchAt(Math.max(...dx)), drainZ],
    [dropX, trenchLow, drainZ],
  ]);
  const low = trenchLow;
  rule('Backwash drop and floor channel', 'battery.drain', 'drain', waste, [
    [dropX, low, drainZ],
    [dropX, Math.min(low, CHANNEL), drainZ],
    [dropX, Math.min(low, CHANNEL) - (hz - drainZ) / 100, hz + 0.3],
  ]);

  // ---- The pool's overflow and main drain, by gravity, across the north-west corner ----
  const corner = { x: -hx + 0.3, z: -hz + 0.35 };
  rule('Pool overflow main', 'pool.overflow', 'drain', MAIN, [
    [corner.x, 3.0, -hz - 0.3],
    [corner.x, 3.0 - 0.025, corner.z],
    [-hx - 0.3, 3.0 - 0.04, corner.z],
  ]);
  rule('Pool main drain', 'pool.mainDrain', 'drain', MAIN, [
    [corner.x, 1.2, -hz - 0.3],
    [corner.x, 1.2 - 0.025, corner.z],
    [-hx - 0.3, 1.2 - 0.04, corner.z],
  ]);

  // ---- The dosing spool and the chemical lines, along the south wall --------
  // Acid and hypochlorite never run over a walkway (the owner, 2026-10-23):
  // they come in from the main plant through the south wall and stay
  // against it, laid by rule, low, in containment. So the return main's
  // first length, from the UV's outlet, is a spool along the wall just in
  // front of the dosing pumps, at the UV's outlet height, and each pump
  // doses onto it by a quill on its top, a short drop below the pump.
  const uvOut = port('uv', 'outlet');
  const spoolZ = round(hz - SPOOL_OFF);
  const turnX = round(uvOut.at[0] + uvOut.outward[0] * 0.5);
  const doseX = ['acid', 'hypo'].map((k) => port(k, 'dose').at[0]);
  const spoolEnd = round(Math.max(...doseX) + 0.6);
  rule('Dosing spool', 'uv-to-pool', 'water', uvOut.od, [
    uvOut.at,
    [turnX, uvOut.at[1], uvOut.at[2]],
    [turnX, uvOut.at[1], spoolZ],
    [spoolEnd, uvOut.at[1], spoolZ],
  ]);
  const quillY = round(uvOut.at[1] + uvOut.od / 2 + QUILL);
  for (const k of ['hypo', 'acid'] as const) {
    const dose = port(k, 'dose');
    rule(
      `${k === 'hypo' ? 'Hypochlorite' : 'Acid'} dose line`,
      `${k}-dose`,
      'chemical',
      0.012,
      [dose.at, [dose.at[0], dose.at[1], spoolZ], [dose.at[0], quillY, spoolZ]],
    );
    const supply = port(k, 'supply');
    rule(
      `${k === 'hypo' ? 'Hypochlorite' : 'Acid'} supply line`,
      `${k}-supply`,
      'chemical',
      0.012,
      [
        [supply.at[0], CHEMICAL_IN, hz + 0.3],
        [supply.at[0], CHEMICAL_IN, supply.at[2]],
        supply.at,
      ],
    );
  }

  // ---- The busbar ring, round the walls, fed from the east ------------------
  const B = BUSBAR;
  const bx = hx - B.off;
  const bz = hz - B.off;
  rule('Busbar ring', 'bus', 'power', B.od, [
    [bx, B.y, 0],
    [bx, B.y, -bz],
    [-bx, B.y, -bz],
    [-bx, B.y, bz],
    [bx, B.y, bz],
    [bx, B.y, 0],
  ]);
  rule('Busbar feed', 'bus', 'power', B.od, [
    [hx + 0.3, B.y, 0.6],
    [bx, B.y, 0.6],
  ]);
  /** A tap-off on the ring's run along `side`, at `a` along it, its drop leaving straight down. */
  const tap = (side: 'north' | 'south' | 'east' | 'west', a: number) => ({
    at: (side === 'north'
      ? [a, B.y - TAP, -bz]
      : side === 'south'
        ? [a, B.y - TAP, bz]
        : side === 'west'
          ? [-bx, B.y - TAP, a]
          : [bx, B.y - TAP, a]) as Vec3,
    outward: [0, -1, 0] as Vec3,
  });

  // The drops by the walls, laid by rule: from its tap-off straight down
  // the wall, then across over the machine and down onto its power port.
  // The east wall's step in to the wall first, on its saddles, and pass the
  // gantry's deck there, close against the wall: a conduit may pierce the
  // deck only so (the owner, 2026-10-26). The UV's, in the room's middle,
  // is routed.
  const drop = (
    line: string,
    side: 'east' | 'west',
    p: RoomPort,
    across: number,
    od: number,
  ) => {
    const x = side === 'east' ? bx : -bx;
    const top = B.y - B.od / 2;
    const hug = hx - WALL_SADDLE - od / 2;
    rule(
      `Busbar drop to ${p.machine} (${p.name})`,
      line,
      'power',
      od,
      side === 'east'
        ? [
            [x, top, p.at[2]],
            [x, top - 0.15, p.at[2]],
            [hug, top - 0.15, p.at[2]],
            [hug, across, p.at[2]],
            [p.at[0], across, p.at[2]],
            p.at,
          ]
        : [
            [x, top, p.at[2]],
            [x, across, p.at[2]],
            [p.at[0], across, p.at[2]],
            p.at,
          ],
    );
  };
  drop(
    'power-panel',
    'east',
    port('panel', 'supply'),
    port('panel', 'supply').at[1] + 0.45,
    0.05,
  );
  drop(
    'power-generator',
    'east',
    port('generator', 'power'),
    port('generator', 'power').at[1] + 0.45,
    0.0269,
  );
  // The pumps': across at 2.3 m, under the manifold over their discharge risers.
  drop('power-pump-A', 'west', port('pumps', 'powerA'), 2.3, 0.0269);
  drop('power-pump-B', 'west', port('pumps', 'powerB'), 2.3, 0.0269);

  // ---- The routed lines -------------------------------------------------
  const wall = (
    side: 'north' | 'south' | 'east' | 'west',
    a: number,
    y: number,
  ) => {
    const at: Vec3 =
      side === 'north'
        ? [a, y, -hz + SLEEVE]
        : side === 'south'
          ? [a, y, hz - SLEEVE]
          : side === 'west'
            ? [-hx + SLEEVE, y, a]
            : [hx - SLEEVE, y, a];
    const outward: Vec3 =
      side === 'north'
        ? [0, 0, 1]
        : side === 'south'
          ? [0, 0, -1]
          : side === 'west'
            ? [1, 0, 0]
            : [-1, 0, 0];
    return { at, outward };
  };
  const end = (p: RoomPort) => ({ at: p.at, outward: p.outward });
  const stub = (x: number) => ({
    at: [x, STUB_TOP, outletZ] as Vec3,
    outward: [0, 1, 0] as Vec3,
  });
  const exchanger = items.find((i) => i.key === 'exchanger')!;
  const hxX = exchanger.x;
  type Want = {
    id: string;
    pipe: keyof typeof pipeOf;
    od: number;
    start: { at: Vec3; outward: Vec3 };
    end: { at: Vec3; outward: Vec3 };
  };
  const wants: Want[] = [
    {
      id: 'battery-to-contact',
      pipe: 'water',
      od: MAIN,
      start: { at: [outletEast, outletY, outletZ], outward: [1, 0, 0] },
      end: end(port('contact', 'inlet')),
    },
    {
      id: 'contact-to-uv',
      pipe: 'water',
      od: 0.225,
      start: end(port('contact', 'outlet')),
      end: end(port('uv', 'inlet')),
    },
    {
      id: 'uv-to-pool',
      pipe: 'water',
      od: 0.225,
      // On from the dosing spool's end along the south wall.
      start: {
        at: [spoolEnd, uvOut.at[1], spoolZ] as Vec3,
        outward: [1, 0, 0] as Vec3,
      },
      end: wall('north', gap(1, 2), 4.6),
    },
    {
      id: 'hx-flow',
      pipe: 'water',
      od: 0.11,
      start: stub(hxFlowX),
      end: end(port('exchanger', 'poolIn')),
    },
    {
      id: 'hx-return',
      pipe: 'water',
      od: 0.11,
      start: end(port('exchanger', 'poolOut')),
      end: stub(hxReturnX),
    },
    {
      id: 'heating-flow',
      pipe: 'heating',
      od: 0.114,
      start: wall('south', hxX - 1.2, 2.6),
      end: end(port('exchanger', 'primaryFlow')),
    },
    {
      id: 'heating-return',
      pipe: 'heating',
      od: 0.114,
      start: end(port('exchanger', 'primaryReturn')),
      end: wall('south', hxX - 1.6, 2.6),
    },
    {
      id: 'make-up',
      pipe: 'makeup',
      od: 0.054,
      start: wall('south', -5.2, 3.0),
      end: wall('west', 5.6, 3.0),
    },
    {
      id: 'ozone',
      pipe: 'ozone',
      od: 0.05,
      start: end(port('generator', 'ozoneOut')),
      end: end(port('contact', 'ozone')),
    },
    {
      id: 'power-uv',
      pipe: 'power',
      od: 0.0269,
      // From the ring's south run, over it: the UV stands in the room's middle.
      start: tap('south', port('uv', 'power').at[0]),
      end: end(port('uv', 'power')),
    },
  ];

  // The router's room: its height under the services ceiling; what forbids runs.
  const regions: Region[] = [];
  const deck = 3.5;
  const head = 2.1;
  const region = (
    name: string,
    kind: Region['kind'],
    f: Footprint,
    y0: number,
    y1: number,
    machines = true,
  ) =>
    regions.push({
      name,
      kind,
      min: [f.minX, y0, f.minZ],
      max: [f.maxX, y1, f.maxZ],
      forbids: { machines, runs: true },
    });
  region('landing', 'gantry', room.landing, DECK_SOFFIT, deck + head, false);
  // The east gantry's walkway: services rise in the strip against the wall behind it.
  region(
    'east gantry',
    'gantry',
    { ...room.gantry, maxX: room.gantry.maxX - 0.35 },
    DECK_SOFFIT,
    deck + head,
    false,
  );
  region(
    'stair',
    'stair',
    {
      minX: room.stair.minX,
      maxX: room.stair.maxX,
      minZ: room.stair.minZ,
      maxZ: room.stair.maxZ,
    },
    0,
    deck + head,
  );
  keptClear().forEach((k, i) =>
    region(`kept clear ${i + 1}`, 'door', k, 0, 2.6),
  );
  // The walkway in front of the battery's headers, and every machine's access.
  region(
    'battery walkway',
    'walkway',
    {
      minX: -hx,
      maxX: room.gantry.minX,
      minZ: front + HEADERS,
      maxZ: front + HEADERS + 1.2,
    },
    0,
    head,
  );
  // Every machine's access, kept clear of machines; a pipe may cross it, as every pipe leaves its port through it.
  for (const i of items)
    if (i.mount === 'floor' && !i.key.startsWith('filter'))
      regions.push({
        name: `${i.key} access`,
        kind: 'access',
        min: [accessOf(i, PLAN_ACCESS).minX, 0, accessOf(i, PLAN_ACCESS).minZ],
        max: [
          accessOf(i, PLAN_ACCESS).maxX,
          head,
          accessOf(i, PLAN_ACCESS).maxZ,
        ],
        forbids: { machines: true, runs: false },
      });
  // The open floor (the owner, 2026-10-23): no run crosses it below
  // headroom. A run may be low only near the machine it serves or near a
  // wall; elsewhere, a metre's cell of floor reserves its headroom.
  // A cell any part of which comes within `near` of a machine is near it.
  const nearMachine = (x0: number, z0: number, x1: number, z1: number) =>
    items.some((i) => {
      const f = footprintOf(i);
      return (
        x1 > f.minX - OPEN_FLOOR.near &&
        x0 < f.maxX + OPEN_FLOOR.near &&
        z1 > f.minZ - OPEN_FLOOR.near &&
        z0 < f.maxZ + OPEN_FLOOR.near
      );
    });
  for (let x = -hx; x < hx - 1e-9; x += OPEN_FLOOR.cell)
    for (let z = -hz; z < hz - 1e-9; z += OPEN_FLOOR.cell) {
      const cx = x + OPEN_FLOOR.cell / 2;
      const cz = z + OPEN_FLOOR.cell / 2;
      const c = OPEN_FLOOR.cell;
      const byWall =
        x < -hx + OPEN_FLOOR.wall ||
        x + c > hx - OPEN_FLOOR.wall ||
        z < -hz + OPEN_FLOOR.wall ||
        z + c > hz - OPEN_FLOOR.wall;
      if (byWall || nearMachine(x, z, x + c, z + c)) continue;
      regions.push({
        name: `open floor ${cx.toFixed(1)},${cz.toFixed(1)}`,
        kind: 'walkway',
        min: [x, 0, z],
        max: [x + OPEN_FLOOR.cell, head, z + OPEN_FLOOR.cell],
        forbids: { machines: false, runs: true },
      });
    }
  const routerRegions: RouterRegion[] = regions
    .filter((r) => r.forbids.runs)
    .map((r) => ({
      min: r.min,
      max: r.max,
      forbids: { runs: true },
    }));
  const obstacles = items.map((i) => {
    const f = footprintOf(i);
    const y0 = i.mount === 'wall' ? (i.y ?? 0) - i.h / 2 : 0;
    return {
      min: [f.minX, y0, f.minZ] as Vec3,
      max: [f.maxX, y0 + i.h, f.maxZ] as Vec3,
    };
  });
  // The fixed runs the router keeps clear of, each stopped short where a routed line joins it.
  const joins = new Set([
    'Dosing spool',
    'Outlet header',
    'HX side-stream flow stub',
    'HX side-stream return stub',
  ]);
  const fixed: DrawnRun[] = runs.map((r) => ({
    name: r.name,
    // The header's end fitting (a flange) and the main's need more room than a stub's.
    points: joins.has(r.name)
      ? trimEnd(
          r.points,
          r.name === 'Outlet header' || r.name === 'Dosing spool' ? 0.6 : 0.2,
        )
      : r.points,
    od: r.od,
    joint: r.joint,
  }));
  const lines: RouterLine[] = wants.map((w) => ({
    id: w.id,
    start: w.start,
    end: w.end,
    od: w.od,
    joint: pipeOf[w.pipe].joint,
    price: pricePerMetre(pipeOf[w.pipe].kind, w.od, {
      conduit: w.pipe === 'power',
    }),
    // The exchanger's valves need a complete straight spool beyond each
    // flange, before the drawn elbow (including heating insulation).
    startStraight: ['hx-return', 'heating-return'].includes(w.id) ? 0.8 : 0.45,
    // Laid first, as they have least room: the treatment main, the side-stream's return, the pumps' feeds across the room.
    ...(FIRST.has(w.id) ? { priority: 10 } : {}),
    // A pump's power port is inside its casing's box: a lead long enough to clear it (as Dev24's).
    endStraight: w.id.startsWith('power-pump')
      ? 1.0
      : ['hx-flow', 'heating-flow'].includes(w.id)
        ? 0.8
        : 0.45,
  }));
  const routed = routeVoxelLines(
    { halfX: hx, halfZ: hz, height: 6.0, regions: routerRegions, obstacles },
    lines,
    fixed,
  );
  problems.push(...routed.problems);
  for (const w of wants) {
    const points = routed.routes.get(w.id);
    if (!points) {
      problems.push(`${w.id}: not routed`);
      continue;
    }
    runs.push({
      name: w.id,
      line: w.id,
      ...pipeOf[w.pipe],
      od: w.od,
      points,
      by: 'router',
    });
  }

  // ---- The sample line, laid by rule along the south wall ------------------
  // From a tapping on top of pump B's discharge, before the filters and any
  // dosing (`doc/plant-model.md`), up over headroom, south to the wall and
  // along it to the dosing controller's cells: held by the wall all the way.
  {
    const b = runs.find((r) => r.name === 'Discharge B')!;
    const across = b.points[1];
    const tapX = round(b.points[2][0] - 0.5);
    const sample = port('controller', 'sample');
    const wallZ = round(hz - 0.35);
    // Start inside the main so the drawn tube meets its surface. There is no
    // separate sample-tapping fitting to bridge a stand-off above the pipe.
    rule('Sample line', 'sample', 'sample', 0.012, [
      [tapX, across[1], across[2]],
      [tapX, SAMPLE_Y, across[2]],
      [tapX, SAMPLE_Y, wallZ],
      [sample.at[0], SAMPLE_Y, wallZ],
      [sample.at[0], sample.at[1], wallZ],
      sample.at,
    ]);
  }

  // ---- The plumber: the fittings the schematic implies -------------------
  const nodes = [
    ...items
      .filter((i) => i.mount === 'floor')
      .map((i) => ({ id: i.key, kind: i.key.replace(/-\d$/, '') })),
    { id: 'pool', kind: 'pool' },
    { id: 'tank', kind: 'balance-tank' },
    { id: 'main-plant', kind: 'main-plant' },
    { id: 'bus', kind: 'supply' },
  ];
  const edge = (
    id: string,
    s: string,
    sp: string,
    t: string,
    tp: string,
    medium: Medium,
  ): PlumbEdge => ({
    id,
    sourceId: s,
    sourcePort: sp,
    targetId: t,
    targetPort: tp,
    medium,
  });
  const edges: PlumbEdge[] = [
    edge('tank.suctionA', 'tank', 'suction', 'pumps', 'suctionA', 'water'),
    edge('tank.suctionB', 'tank', 'suction', 'pumps', 'suctionB', 'water'),
    ...filters.map((f) =>
      edge(`${f.key}.inlet`, 'pumps', 'discharge', f.key, 'inlet', 'water'),
    ),
    ...filters.map((f) =>
      edge(`${f.key}.outlet`, f.key, 'outlet', 'contact', 'inlet', 'water'),
    ),
    ...filters.map((f) =>
      edge(`${f.key}.drain`, f.key, 'drain', 'main-plant', 'drain', 'water'),
    ),
    // The five-valve face's other three: backwash in from the pumps, backwash out and rinse to waste.
    ...(five
      ? filters.flatMap((f) => [
          edge(
            `${f.key}.backwashIn`,
            'pumps',
            'discharge',
            f.key,
            'backwashIn',
            'water',
          ),
          edge(
            `${f.key}.backwashOut`,
            f.key,
            'backwashOut',
            'main-plant',
            'drain',
            'water',
          ),
          edge(
            `${f.key}.rinse`,
            f.key,
            'rinse',
            'main-plant',
            'drain',
            'water',
          ),
        ])
      : []),
    edge('contact-to-uv', 'contact', 'outlet', 'uv', 'inlet', 'water'),
    edge('uv-to-pool', 'uv', 'outlet', 'pool', 'return', 'water'),
    edge('hx-flow', 'contact', 'inlet', 'exchanger', 'poolIn', 'water'),
    edge('hx-return', 'exchanger', 'poolOut', 'contact', 'inlet', 'water'),
    edge(
      'heating-flow',
      'main-plant',
      'heating-flow',
      'exchanger',
      'primaryFlow',
      'water',
    ),
    edge(
      'heating-return',
      'exchanger',
      'primaryReturn',
      'main-plant',
      'heating-return',
      'water',
    ),
    edge('make-up', 'main-plant', 'make-up', 'tank', 'make-up', 'water'),
    edge('power-pump-A', 'bus', 'feed', 'pumps', 'powerA', 'power'),
    edge('power-pump-B', 'bus', 'feed', 'pumps', 'powerB', 'power'),
    edge('power-uv', 'bus', 'feed', 'uv', 'power', 'power'),
    edge('power-generator', 'bus', 'feed', 'generator', 'power', 'power'),
    edge('power-panel', 'bus', 'feed', 'panel', 'supply', 'power'),
  ];
  const expansion = expandForPlumbing(nodes, edges, {
    isolate: new Set(['pumps', 'filter', 'contact', 'uv', 'exchanger']),
    pumps: new Set(['pumps']),
    discharge: 'discharge',
    isolateMedia: new Set<Medium>(['water', 'power']),
    powerIsolators: 'supply-feeds',
    flowmeters: options.flowmeters,
  });
  // How each is worked, by the options and whether it can be reached from the floor.
  const workedBy = (
    f: { kind: FittingKind; medium: PlumbMedium },
    at: Vec3,
  ): Operator =>
    operatorFor(
      f,
      at[1] >= REACH.low && at[1] <= REACH.high,
      options.actuation,
      {
        actuator: options.actuator,
      },
    );

  // Each fitting on the run that carries its line: at its end by the port it serves.
  const fittings: OlympicFitting[] = [];
  const runFor = (lineId: string) =>
    runs.find((r) => r.line === lineId) ??
    (lineId.startsWith('filter-')
      ? runs.find((r) => r.line === lineId)
      : lineId.endsWith('.inlet') || lineId.startsWith('pumps')
        ? runs.find((r) => r.name === 'Pump discharge manifold')
        : undefined);
  // Fittings the schematic gives a shared port, set where the room has them:
  // each pump of the pair its own non-return and isolating valve on its own
  // discharge riser; the contact tank's inlet valve on the main into it.
  for (const s of ['A', 'B'] as const) {
    const riser = runs.find((r) => r.name === `Discharge ${s}`)!;
    // On its run across, just beyond the pair's east side.
    const before = len(riser.points.slice(0, 3));
    for (const [kind, back] of [
      ['non-return-valve', 0.75],
      ['isolating-valve', 0.4],
    ] as const) {
      const p = along(riser.points, before - back);
      fittings.push({
        id: `pumps.discharge${s}.${kind === 'non-return-valve' ? 'nrv' : 'iso'}`,
        kind,
        line: `pumps.discharge${s}`,
        run: riser.name,
        at: p.at,
        along: p.along,
        normally: 'open',
        operator: workedBy({ kind, medium: 'water' }, p.at),
        reachable: true,
      });
    }
  }
  // The pumps' drain valve, on its drain's level length.
  {
    const run = runs.find((r) => r.name === 'Pump discharge drain');
    if (run) {
      const [a, b] = run.points;
      fittings.push({
        id: 'pumps.drain.iso',
        kind: 'isolating-valve',
        line: 'pumps.drain',
        run: run.name,
        at: [round((a[0] + b[0]) / 2), a[1], a[2]],
        along: [1, 0, 0],
        normally: 'closed',
        operator: workedBy({ kind: 'isolating-valve', medium: 'water' }, a),
        reachable: true,
      });
    }
  }
  // The pool's main drains' isolating valve, on its main just inside the
  // north wall, before it turns for the tank (the owner, 2026-10-26).
  {
    const run = runs.find((r) => r.name === 'Pool main drain');
    if (run) {
      const [a, b] = run.points;
      const z = -olympicRoomPlan().halfZ + 0.18;
      const t = (z - a[2]) / (b[2] - a[2]);
      const at: Vec3 = [a[0], round(a[1] + (b[1] - a[1]) * t), z];
      fittings.push({
        id: 'pool.mainDrain.iso',
        kind: 'isolating-valve',
        line: 'pool.mainDrain',
        run: run.name,
        at,
        along: [0, 0, 1],
        normally: 'open',
        operator: workedBy({ kind: 'isolating-valve', medium: 'water' }, at),
        reachable: true,
      });
    }
  }
  // The pumps' common discharge's flowmeter, on the manifold's drop to the battery.
  {
    const f = expansion.fittings.find((x) => x.id === 'pumps.discharge.meter');
    const main = runs.find((r) => r.name === 'Pump discharge manifold');
    if (f && main) {
      const p = along(
        main.points,
        len(main.points) - (MANIFOLD_Y - inletY) / 2,
      );
      fittings.push({
        id: f.id,
        kind: f.kind,
        line: 'battery.inlet',
        run: main.name,
        at: p.at,
        along: p.along,
        normally: 'open',
        operator: 'none',
        reachable: true,
      });
    }
  }
  const shared = (id: string) =>
    id.startsWith('pumps.discharge.') ||
    id === 'contact.inlet.iso' ||
    id === 'uv.inlet.iso' ||
    id === 'uv.outlet.iso';
  // The UV's isolating valves on long straights, clear of their bends (the
  // owner, 2026-10-25): the inlet's well up its drop from the high level,
  // not just above the bend into the low run; the outlet's on the dosing
  // spool's run along the wall, before the acid quill, not on its short
  // first leg out of the unit.
  for (const [id, runName, pick] of [
    [
      'uv.inlet.iso',
      'contact-to-uv',
      (pts: readonly Vec3[]) => {
        const i = pts.findIndex(
          (q, k) =>
            k > 0 && q[1] < pts[k - 1][1] - 0.5 && q[0] === pts[k - 1][0],
        );
        const top = pts[i - 1];
        return { at: [top[0], 1.4, top[2]] as Vec3, along: [0, -1, 0] as Vec3 };
      },
    ],
    [
      'uv.outlet.iso',
      'Dosing spool',
      (pts: readonly Vec3[]) => {
        const corner = pts[2];
        return {
          at: [round(corner[0] + 0.6), corner[1], corner[2]] as Vec3,
          along: [1, 0, 0] as Vec3,
        };
      },
    ],
  ] as const) {
    const run = runs.find((r) => r.name === runName);
    const f = [...expansion.along.values()].flat().find((x) => x.id === id);
    if (!run || !f) continue;
    const p = pick(run.points);
    fittings.push({
      id: f.id,
      kind: f.kind,
      line: run.line,
      run: run.name,
      at: p.at,
      along: p.along,
      normally: f.normally,
      operator: workedBy(f, p.at),
      reachable: true,
    });
  }
  {
    const main = runs.find((r) => r.name === 'battery-to-contact');
    const f = [...expansion.along.values()]
      .flat()
      .find((x) => x.id === 'contact.inlet.iso');
    if (main && f) {
      const p = along(main.points, len(main.points) - 0.7);
      fittings.push({
        id: f.id,
        kind: f.kind,
        line: 'battery-to-contact',
        run: main.name,
        at: p.at,
        along: p.along,
        normally: f.normally,
        operator: workedBy(f, p.at),
        reachable: true,
      });
    }
  }
  for (const [lineId, all] of expansion.along) {
    const list = all.filter((f) => !shared(f.id));
    if (!list.length) continue;
    const run =
      runFor(lineId) ??
      (lineId.startsWith('tank.suction')
        ? runs.find((r) => r.line === lineId)
        : undefined);
    if (!run) {
      problems.push(`${lineId}: no run to set its fittings in`);
      continue;
    }
    const L = len(run.points);
    list.forEach((f, k) => {
      const d = Math.min(L - 0.1, 0.35 + k * 0.4);
      // A filter's branch valves at the branch's header end, by the battery's
      // walkway, where its face is worked from; the rest by their ports.
      const name = run.name.replace(/^Filter \d /, '');
      const filterRun = /^Filter \d /.test(run.name);
      const fromEnd = !filterRun
        ? f.end === 'source'
          ? d
          : L - d
        : f.kind === 'flowmeter'
          ? // On the outlet riser, under its backwash-in branch: it reads service (up) and backwash (down).
            len(run.points.slice(0, 2)) + (METER_Y - run.points[1][1])
          : name === 'backwash' || name === 'drain'
            ? len(run.points.slice(0, 2)) + (run.points[1][1] - 0.6)
            : name === 'inlet' && five
              ? // Between the backwash-out branch and the header.
                L - 0.15
              : name === 'backwash in'
                ? L / 2
                : name === 'backwash out'
                  ? BACKWASH_OUT_OFF + (inletY - BACKWASH_OUT_Y)
                  : name === 'rinse'
                    ? run.points[0][1] - RINSE_VALVE_Y
                    : L - 0.3;
      // A power isolator is the machine's local isolator, on its drop by
      // the machine at a hand's height, not at the tap-off overhead.
      const p =
        f.kind === 'power-isolator'
          ? (withinReach(run.points) ?? along(run.points, L - 0.4))
          : along(run.points, Math.max(0.05, fromEnd));
      fittings.push({
        id: f.id,
        kind: f.kind,
        line: lineId,
        run: run.name,
        at: p.at,
        along: p.along,
        normally: f.normally,
        // Worked as the options say: by hand within reach, by a chain
        // wheel out of it, or automatically, from the panels.
        operator: workedBy(f, p.at),
        // The first filter's backwash-out actuator faces the south aisle;
        // west would put its manual override against the room wall.
        // The other backwash-out actuators stay clear of their sight glasses.
        ...(five && name === 'backwash out'
          ? {
              facing: (run.name.startsWith('Filter 1 ')
                ? [0, 0, 1]
                : [-1, 0, 0]) as Vec3,
            }
          : five && (name === 'drain' || name === 'rinse')
            ? { facing: [1, 0, 0] as Vec3 }
            : {}),
        reachable:
          (f.kind !== 'power-isolator' && workedBy(f, p.at) !== 'hand') ||
          (p.at[1] >= REACH.low && p.at[1] <= REACH.high),
      });
    });
  }
  // Each drop's fused tap-off on the busbar, protecting its cable (the
  // owner, 2026-10-23); worked from the floor with an operating pole. Its
  // machine's local isolator is the plumber's power isolator at a hand's
  // height on the drop; the panel and the ozone generator have their own
  // incoming isolators on their fronts, as such cabinets do.
  for (const r of runs.filter(
    (x) => x.medium === 'power' && x.line.startsWith('power-'),
  ))
    fittings.push({
      id: `${r.line}.tap-off`,
      kind: 'fused-tap-off',
      line: r.line,
      run: r.name,
      at: r.points[0],
      along: [0, -1, 0],
      normally: 'closed',
      operator: 'pole',
      reachable: r.points[0][1] <= 6,
    });
  // The regulating valve in the outlet header, between the side-stream's stubs.
  fittings.push({
    id: 'battery.outlet.regulating',
    kind: 'regulating-valve',
    line: 'battery.outlet',
    run: 'Outlet header',
    at: [round((hxFlowX + hxReturnX) / 2), outletY, round(outletZ)],
    along: [1, 0, 0],
    normally: 'open',
    operator: workedBy({ kind: 'isolating-valve', medium: 'water' }, [
      0,
      outletY,
      0,
    ]),
    reachable: true,
  });

  // Every run, rule-laid and routed alike, clear of every other.
  const clashes = pipeClashes(
    runs.map((r) => ({
      name: r.name,
      points: r.points,
      od: r.od,
      joint: r.joint,
    })),
  );
  for (const c of clashes) {
    const [a, b] = [c.run, c.other];
    // A branch meeting its own header or manifold is a joint, not a clash.
    const ra = runs.find((r) => r.name === a);
    const rb = runs.find((r) => r.name === b);
    if (ra && rb && sameFamily(ra, rb)) continue;
    problems.push(`clash: ${a} / ${b}`);
  }
  return {
    items,
    ports,
    runs,
    fittings,
    expansion,
    schematic: { nodes, edges },
    regions,
    problems,
    reducers,
  };
}

/** The point nearest its far end at which a run passes a hand's height (1.5 m), if it does. */
function withinReach(points: readonly Vec3[]) {
  const hand = 1.5;
  for (let k = points.length - 1; k > 0; k--) {
    const a = points[k - 1];
    const b = points[k];
    if ((a[1] - hand) * (b[1] - hand) > 0) continue;
    if (a[1] === b[1]) return { at: r3(b), along: r3([0, 0, 1]) };
    const t = (hand - a[1]) / (b[1] - a[1]);
    const at = r3([a[0] + (b[0] - a[0]) * t, hand, a[2] + (b[2] - a[2]) * t]);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1;
    return {
      at,
      along: r3([(b[0] - a[0]) / l, (b[1] - a[1]) / l, (b[2] - a[2]) / l]),
    };
  }
  return null;
}

/** A polyline stopped `d` metres short of its end. */
function trimEnd(points: readonly Vec3[], d: number): Vec3[] {
  const a = points.at(-2)!;
  const b = points.at(-1)!;
  const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  if (l <= d) return [...points];
  const t = (l - d) / l;
  return [
    ...points.slice(0, -1),
    r3([
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ]),
  ];
}

/** Runs that meet by design: a block's header and its branches, a line's pieces. */
function sameFamily(a: OlympicRun, b: OlympicRun) {
  const family = (r: OlympicRun) =>
    r.line.startsWith('filter-') ||
    r.line.startsWith('battery.') ||
    r.line.startsWith('pumps.')
      ? r.line.endsWith('.drain') || r.line === 'battery.drain'
        ? 'drain'
        : 'battery'
      : r.line;
  const fa = family(a);
  const fb = family(b);
  if (fa === fb) return true;
  // A five-valve face's backwash-out and rinse drops leave the battery's pipework for the trench.
  const toWaste = (r: OlympicRun) =>
    /^filter-\d\.(backwashOut|rinse)$/.test(r.line);
  if ((toWaste(a) && fb === 'drain') || (toWaste(b) && fa === 'drain'))
    return true;
  // The side-stream's routed lines start at their stubs on the outlet header; the treatment line at its east end.
  const meets = new Set(['hx-flow', 'hx-return', 'battery-to-contact']);
  return (
    (meets.has(a.line) && fb === 'battery') ||
    (meets.has(b.line) && fa === 'battery')
  );
}

/** The plumbed room, scored by the pipeline's scorer. */
export function scoreOlympic(plumbed = plumbOlympic()): Score {
  const { items, runs, fittings, regions } = plumbed;
  const floor = items.filter((i) => i.mount === 'floor');
  const size = sizeRoom(floor.map((i) => ({ w: i.w, d: i.d, h: i.h })));
  const room = olympicRoomPlan();
  const byLine = new Map<string, OlympicRun[]>();
  for (const r of runs.filter((x) => x.by === 'router'))
    byLine.set(r.line, [...(byLine.get(r.line) ?? []), r]);
  const shares = new Map<string, string[]>();
  for (const r of runs) {
    const together = runs
      .filter((o) => o !== r && sameFamily(r, o))
      .map((o) => o.name);
    if (together.length) shares.set(r.name, together);
  }
  // The plumber's fittings, the regulating valve, and a fused tap-off for every drop.
  const wanted =
    plumbed.expansion.fittings.length +
    1 +
    plumbed.fittings.filter((f) => f.kind === 'fused-tap-off').length;
  return scoreRoom({
    name: 'Olympic plant room, 22 × 14 m',
    w: room.halfX * 2,
    d: room.halfZ * 2,
    h: 6.0,
    minimumArea: size.w * size.d,
    machines: floor.map(footprintOf),
    unreachableAccess: 0,
    runs: runs.map((r) => ({
      name: r.name,
      points: r.points,
      od: r.od,
      joint: r.joint,
    })),
    runPrices: runs.map((r) =>
      pricePerMetre(r.kind, r.od, { conduit: r.medium === 'power' }),
    ),
    shares,
    ends: [...byLine.values()].map(
      (pieces) => [pieces[0].points[0], pieces.at(-1)!.points.at(-1)!] as const,
    ),
    endPrices: [...byLine.values()].map((pieces) =>
      pricePerMetre(pieces[0].kind, pieces[0].od, {
        conduit: pieces[0].medium === 'power',
      }),
    ),
    regions,
    fittings: {
      wanted,
      installed: fittings.length,
      reachable: fittings.filter((f) => f.reachable).length,
    },
  });
}

// ---- The room as the game draws it (prompt 033, stage 3) ---------------

/** The room's machines, as the room's equipment has them: labelled as its own. */
export function olympicItems(): Item[] {
  return olympicPlan().map((p) => {
    const item = itemOf(p);
    return {
      ...item,
      // Lower-cased after the pool's name, unless an acronym (UV) begins it.
      label: `Olympic pool ${/^[A-Z]{2}/.test(p.label) ? p.label : p.label.charAt(0).toLowerCase() + p.label.slice(1)}`,
    };
  });
}

/** Each drawn valve's name and its tag's machine code, by its fitting. */
function valveName(
  id: string,
  five = OLYMPIC.filterValves === 5,
): { name: string; code: string; tag?: string } | null {
  const filter =
    /^filter-(\d)\.(inlet|outlet|drain|backwashIn|backwashOut|rinse)\.iso$/.exec(
      id,
    );
  if (filter) {
    const n = filter[1];
    // With five valves, each its V-number on the battery (Dev26's), and the vessel's drain beside them.
    const face: Record<string, [string, string]> = {
      inlet: ['inlet', 'V1'],
      outlet: ['outlet', 'V2'],
      backwashIn: ['backwash in', 'V3'],
      backwashOut: ['backwash out', 'V4'],
      rinse: ['rinse', 'V5'],
      drain: [five ? 'drain' : 'backwash', 'DV1'],
    };
    const [role, v] = face[filter[2]];
    return {
      name: `F${n} ${role} valve`,
      code: `F${n}`,
      ...(five ? { tag: `PL2-F${n}-${v}` } : {}),
    };
  }
  const table: Record<string, [string, string]> = {
    'pumps.suctionA.iso': ['Pump A suction valve', 'P1'],
    'pumps.suctionB.iso': ['Pump B suction valve', 'P1'],
    'pumps.dischargeA.iso': ['Pump A discharge valve', 'P1'],
    'pumps.dischargeB.iso': ['Pump B discharge valve', 'P1'],
    'contact.inlet.iso': ['Contact tank inlet valve', 'T2'],
    'contact.outlet.iso': ['Contact tank outlet valve', 'T2'],
    'uv.inlet.iso': ['UV inlet valve', 'UV1'],
    'uv.outlet.iso': ['UV outlet valve', 'UV1'],
    'exchanger.poolIn.iso': ['HX pool flow valve', 'HX1'],
    'exchanger.poolOut.iso': ['HX pool return valve', 'HX1'],
    'exchanger.primaryFlow.iso': ['HX primary flow valve', 'HX1'],
    'exchanger.primaryReturn.iso': ['HX primary return valve', 'HX1'],
    'battery.outlet.regulating': ['Side-stream regulating valve', 'F'],
    'pumps.drain.iso': ['Pump drain valve', 'P1'],
    'pool.mainDrain.iso': ['Pool main drain isolating valve', 'T1'],
  };
  const t = table[id];
  // The pumps' drain keeps its own plate: a drain valve (the owner, 2026-10-25).
  if (id === 'pumps.drain.iso')
    return { name: t[0], code: t[1], tag: 'PL2-P1-DV1' };
  return t ? { name: t[0], code: t[1] } : null;
}

/** A valve's normal state: a filter's backwash, rinse and drain valves shut (it is in service), the rest open. */
export const valveNormally = (name: string): 'open' | 'closed' =>
  / (backwash|backwash in|backwash out|rinse|drain) valve$/.test(name)
    ? 'closed'
    : 'open';

/** How a valve the plumber worked is drawn. */
const DRAWN: Partial<Record<Operator, Valve['operator']>> = {
  hand: 'lever',
  chain: 'chain',
  solenoid: 'solenoid',
  motor: 'motor',
};

/** Each flowmeter's tag, and what it reads, by its fitting. */
function meterName(
  id: string,
): { tag: string; role: string; reads: string } | null {
  const filter = /^filter-(\d)\.outlet\.meter$/.exec(id);
  if (filter)
    return {
      tag: `PL2-F${filter[1]}-FT1`,
      role: 'OUTLET',
      reads: `filter-${filter[1]}`,
    };
  if (id === 'pumps.discharge.meter')
    return { tag: 'PL2-P1-FT1', role: 'DISCHARGE', reads: 'pumps' };
  return null;
}

const serviceOf = (r: OlympicRun): PipeRun['service'] =>
  r.kind === 'pvc-drain'
    ? 'drainage'
    : r.kind === 'lagged-heating'
      ? r.line === 'heating-return'
        ? 'heating return'
        : 'heating flow'
      : r.kind === 'copper'
        ? 'make-up'
        : r.line === 'sample'
          ? 'sample'
          : r.kind === 'chemical-tube'
            ? r.line.startsWith('acid')
              ? 'acid'
              : 'hypochlorite'
            : r.kind === 'stainless'
              ? 'ozone'
              : r.medium === 'power'
                ? 'electrical'
                : r.line === 'sample'
                  ? 'sample'
                  : 'pool water';

const LABEL: Record<PipeRun['service'], string> = {
  'pool water': 'POOL WATER',
  'heating flow': 'LTHW FLOW',
  'heating return': 'LTHW RETURN',
  drainage: 'DRAINAGE',
  'make-up': 'MAKE-UP',
  ozone: 'OZONE',
  electrical: 'POWER',
  hypochlorite: 'SODIUM HYPOCHLORITE',
  acid: 'ACID',
  sample: 'SAMPLE',
  gas: 'GAS',
  flue: 'FLUE',
  'hot water': 'HOT WATER',
};

let cached: {
  runs: PipeRun[];
  busbar: Containment[];
  reducers: OlympicPlumbing['reducers'];
  routes: Map<string, ValveRoute>;
} | null = null;
let plumbedOnce: OlympicPlumbing | null = null;
/** The room as built (`OLYMPIC`), plumbed once. */
const built = () => (plumbedOnce ??= plumbOlympic());
/** The room's plumbing as built: its plan, enhanced network and fittings. */
export const olympicPlumbing = (): OlympicPlumbing => built();

/** The room's runs, as the game draws them, and its busbar trunking: plumbed once. */
export function olympicRoom() {
  if (cached) return cached;
  const plumbed = built();
  const room = olympicRoomPlan();
  const t = PLANT_ROOM.wall;
  const busbar: Containment[] = [];
  const runs: PipeRun[] = [];
  const routes = new Map<string, ValveRoute>();
  const words = nodeWords(plumbed);
  const base = new Map(plumbed.schematic.edges.map((e) => [e.id, e]));
  const expanded = new Map(plumbed.expansion.fittings.map((f) => [f.id, f]));
  for (const r of plumbed.runs) {
    if (r.name === 'Busbar ring' || r.name === 'Busbar feed') {
      r.points.slice(1).forEach((p, k) =>
        busbar.push({
          name: `${r.name} ${k + 1}`,
          kind: 'trunking',
          width: BUSBAR.od,
          depth: BUSBAR.od,
          from: r.points[k],
          to: p,
        }),
      );
      continue;
    }
    // Where it crosses a wall's plane: a sleeve through it.
    const through: WallCrossing[] = [];
    for (const [k, p] of r.points.entries()) {
      if (!k) continue;
      const a = r.points[k - 1];
      for (const [axis, half, normal] of [
        [0, room.halfX, [1, 0, 0]],
        [0, -room.halfX, [-1, 0, 0]],
        [2, room.halfZ, [0, 0, 1]],
        [2, -room.halfZ, [0, 0, -1]],
      ] as const) {
        const lo = Math.min(a[axis], p[axis]);
        const hi = Math.max(a[axis], p[axis]);
        if (
          lo < half + Math.sign(half) * t * 0.5 &&
          hi > half + Math.sign(half) * t * 0.5 &&
          lo !== hi
        ) {
          const at = [...a] as [number, number, number];
          at[axis] = half + Math.sign(half) * (t / 2);
          through.push({ at, normal, thickness: t, kind: 'sleeve' });
        }
      }
    }
    const axisOf = (along: Vec3) =>
      Math.abs(along[1]) > 0.5 ? 'y' : Math.abs(along[0]) > 0.5 ? 'x' : 'z';
    const meters: Meter[] = plumbed.fittings
      .filter((f) => f.run === r.name && f.kind === 'flowmeter')
      .flatMap((f) => {
        const m = meterName(f.id);
        if (!m) return [];
        return [
          {
            ...m,
            fitting: f.id,
            at: f.at,
            along: f.along,
            od: r.od,
            // Its display toward the room's middle.
            inward: [0, f.at[2] > 0 ? -1 : 1] as const,
          } satisfies Meter,
        ];
      });
    const valves: Valve[] = plumbed.fittings
      .filter(
        (f) =>
          f.run === r.name &&
          (f.kind === 'isolating-valve' || f.kind === 'regulating-valve'),
      )
      .flatMap((f) => {
        const v = valveName(f.id);
        const operator = f.operator === 'pole' ? undefined : DRAWN[f.operator];
        if (!v || !operator) return [];
        // Its route, from the base link it sits on in the enhanced network.
        const sits = expanded.get(f.id);
        const link = sits ? base.get(sits.edge) : undefined;
        // The pumps' drain, beside the expansion (`olympic-annex.ts`): from
        // the pumps' discharge to the main plant's drain.
        if (f.id === 'pool.mainDrain.iso')
          routes.set(`${r.name}|${v.name}`, {
            from: "the pool's main drains",
            to: 'the balance tank',
            medium: 'water',
          });
        if (f.id === 'pumps.drain.iso')
          routes.set(`${r.name}|${v.name}`, {
            from: 'the circulation pumps',
            to: "the main plant's drain",
            medium: 'water',
          });
        if (link && sits) {
          const edges = plumbed.schematic.edges;
          // The served end as itself; the other as all that share its port.
          const served = (end: 'source' | 'target') =>
            end === 'source'
              ? [{ id: link.sourceId, port: link.sourcePort }]
              : [{ id: link.targetId, port: link.targetPort }];
          const other = sits.end === 'source' ? 'target' : 'source';
          const ends = {
            [sits.end]: words(served(sits.end)),
            [other]: words(farEnds(edges, link, sits.end)),
          };
          routes.set(`${r.name}|${v.name}`, {
            from: ends.source,
            to: ends.target,
            medium: /heating/.test(serviceOf(r)) ? 'heating water' : 'water',
          });
        }
        const axis = axisOf(f.along);
        return [
          {
            at: f.at,
            axis,
            name: v.name,
            fitting: f.id,
            od: r.od,
            // As the plumber's options have it worked.
            operator,
            // Its lever away from the wall it is nearest, into the room, unless
            // the plumber turned it. A valve is built along its frame's z and
            // turned to `facing`, its shut lever along its frame's +x: so on
            // a level pipe `facing` runs along the pipe, the way that puts
            // the lever into the room (across it would turn the valve
            // crossways on its pipe: the owner, 2026-10-25, PL2-UV1-IV1); on
            // an upright pipe it is the lever's way out, into the room.
            facing:
              f.facing ??
              (axis === 'x'
                ? [f.at[2] > 0 ? 1 : -1, 0, 0]
                : axis === 'z'
                  ? [0, 0, f.at[0] > 0 ? -1 : 1]
                  : [f.at[0] > 0 ? -1 : 1, 0, 0]),
          } satisfies Valve,
        ];
      });
    runs.push({
      name: r.name,
      model: { link: r.line },
      kind: r.kind,
      od: r.od,
      points: r.points,
      joins: [],
      service: serviceOf(r),
      label: LABEL[serviceOf(r)],
      through,
      valves,
      ...(meters.length ? { meters } : {}),
    });
  }
  cached = { runs, busbar, reducers: plumbed.reducers, routes };
  return cached;
}

/** A valve's route in the enhanced network, in a description's words. */
export interface ValveRoute {
  from: string;
  to: string;
  medium: 'water' | 'heating water';
}

/**
 * A node of the enhanced network in a sentence, derived, never written: a
 * machine by its plan label up to any comma, after "the" ("the circulation
 * pumps"), or bare where it ends in its number ("sand filter 1"); any
 * other node by its kind and the port the link meets ("the main plant's
 * drain"); several nodes meeting one shared port by their kinds, several
 * of a kind in the plural ("the filters and the heat exchanger").
 */
function nodeWords(plumbed: OlympicPlumbing) {
  const labels = new Map(plumbed.items.map((i) => [i.key, i.label]));
  const kinds = new Map(plumbed.schematic.nodes.map((n) => [n.id, n.kind]));
  const plain = (text: string) => {
    const t = text.split(',')[0].replaceAll('-', ' ').trim();
    // Lower-cased, unless an acronym (UV) begins it.
    return /^[A-Z]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1);
  };
  const the = (words: string) => (/\d$/.test(words) ? words : `the ${words}`);
  const one = ({ id, port }: { id: string; port: string }) => {
    const label = labels.get(id);
    if (label) return the(plain(label));
    return `${the(plain(kinds.get(id) ?? id))}'s ${plain(port)}`;
  };
  return (ids: readonly { id: string; port: string }[]) => {
    // Grouped by kind, in the order met: several of a kind in the plural.
    const groups = new Map<string, { id: string; port: string }[]>();
    for (const n of ids) {
      const kind = kinds.get(n.id) ?? n.id;
      groups.set(kind, [...(groups.get(kind) ?? []), n]);
    }
    return [...groups]
      .map(([kind, members]) =>
        members.length > 1 ? `the ${plain(kind)}s` : one(members[0]),
      )
      .join(' and ');
  };
}

/**
 * The far ends of the link a fitting sits on, seen from the node it serves:
 * the link's other end, or, where the served port is shared by several
 * links (the filters' outlets into the contact tank's inlet), all of theirs.
 */
function farEnds(
  edges: readonly PlumbEdge[],
  link: PlumbEdge,
  end: 'source' | 'target',
) {
  const at =
    end === 'source'
      ? { id: link.sourceId, port: link.sourcePort }
      : { id: link.targetId, port: link.targetPort };
  return edges
    .filter((e) =>
      end === 'source'
        ? e.sourceId === at.id && e.sourcePort === at.port
        : e.targetId === at.id && e.targetPort === at.port,
    )
    .map((e) =>
      end === 'source'
        ? { id: e.targetId, port: e.targetPort }
        : { id: e.sourceId, port: e.sourcePort },
    );
}

/** Each drawn valve's route, by its run's and its own name: the room's enhanced network's. */
export const olympicValveRoutes = (): ReadonlyMap<string, ValveRoute> =>
  olympicRoom().routes;

/** Each drawn valve's permanent identity's tag, as `installed-valves.ts` registers it. */
export function olympicValveTags(): {
  run: string;
  name: string;
  tag: string;
  normal: 'open' | 'closed';
}[] {
  const seen = new Map<string, number>();
  return olympicRoom().runs.flatMap((r) =>
    r.valves.map((v) => {
      const named = valveName(
        built().fittings.find(
          (f) => f.run === r.name && valveName(f.id)?.name === v.name,
        )!.id,
      )!;
      const code = named.code;
      if (named.tag)
        return {
          run: r.name,
          name: v.name,
          tag: named.tag,
          normal: valveNormally(v.name),
        };
      const kind = / regulating /.test(v.name)
        ? 'RV'
        : / backwash /.test(v.name)
          ? 'BV'
          : 'IV';
      const n = (seen.get(code + kind) ?? 0) + 1;
      seen.set(code + kind, n);
      return {
        run: r.name,
        name: v.name,
        tag: `PL2-${code}-${kind}${n}`,
        normal: valveNormally(v.name),
      };
    }),
  );
}

/** Each drawn machine's key in the room's plan, by its label as drawn (`olympicItems`, made from the plan in its order). */
export function olympicPlanKeys(): ReadonlyMap<string, string> {
  const plan = olympicPlan();
  return new Map(olympicItems().map((item, i) => [item.label, plan[i].key]));
}
