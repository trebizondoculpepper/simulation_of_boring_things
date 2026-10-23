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
import { expandForPlumbing } from '../../../game/plant/plumbing-expansion';
import type {
  Expansion,
  FittingKind,
  PlumbEdge,
  PlumbMedium,
} from '../../../game/plant/plumbing-expansion';
import { machinePorts } from './machine-ports';
import type { MachinePort } from './machine-ports';
import type { Item } from './room-equipment';
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
 *   front with every filter's branches, and two stubs on the outlet
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
 * the fittings into every line; the scorer scores the room. Pure.
 */

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
  line: string;
  at: Vec3;
  along: Vec3;
  normally: 'open' | 'closed';
  /**
   * How it is worked: a valve by its solenoid, from the panel (a direct
   * solenoid valve on a small line, a solenoid pilot on a pneumatic
   * actuator on a main); a machine's local isolator by hand; a fused
   * tap-off on the busbar overhead by an operating pole from the floor.
   */
  operator: 'solenoid' | 'hand' | 'pole';
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
};
const itemOf = (p: PlanItem): Item => ({
  key: p.key.startsWith('filter') ? 'sand-filter:3' : ITEM[p.key].key,
  label: p.label,
  w: p.w,
  d: p.d,
  h: p.h,
  mount: p.mount,
  ...(p.y !== undefined ? { y: p.y } : {}),
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
    const y0 = p.mount === 'wall' ? (p.y ?? 0) : 0;
    return machinePorts(itemOf(p)).map((q) => {
      const t = turn(q.at, yaw);
      return {
        machine: p.key,
        name: q.name,
        at: [round(p.x + t[0]), round(y0 + t[1]), round(p.z + t[2])] as Vec3,
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
  outlet: { z: 0.4 },
  drain: { z: 0.15, y: 0.45 },
} as const;
/** The pump manifold's height: over the balance tank doors' clear space (2.6 m). */
const MANIFOLD_Y = 2.9;
/** The side-stream stubs rise out of the outlet header to here, over the battery's walkway. */
const STUB_TOP = 2.4;
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
/** A tap-off box hangs this far under the busbar, its drop leaving its foot. */
const TAP = 0.3;
/** The lines the router lays first: they have least room. */
const FIRST = new Set(['battery-to-contact', 'hx-return']);
/** A line ending at a wall ends this far inside its face, at its sleeve. */
const SLEEVE = 0.15;
/** Where a person can reach a fitting from the floor, metres. */
const REACH = { low: 0.2, high: 2.1 } as const;

const pipeOf: Record<string, { kind: Kind; joint: PipeJoint; medium: Medium }> =
  {
    water: { kind: 'pvc-pressure', joint: 'socket', medium: 'water' },
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
  regions: Region[];
  problems: string[];
}

export function plumbOlympic(): OlympicPlumbing {
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
  const fp = filters.map((f) => ({
    inlet: port(f.key, 'inlet'),
    outlet: port(f.key, 'outlet'),
    drain: port(f.key, 'drain'),
  }));
  const front = footprintOf(filters[0]).maxZ;
  const inletZ = front + HEADER.inlet.z;
  const outletZ = front + HEADER.outlet.z;
  const drainZ = front + HEADER.drain.z;
  const inletY = fp[0].inlet.at[1];
  const outletY = fp[0].outlet.at[1];
  const dA = port('pumps', 'dischargeA');
  const dB = port('pumps', 'dischargeB');
  const mx = dA.at[0];
  for (const d of [dA, dB])
    rule(`Discharge ${d.name.slice(-1)}`, `pumps.${d.name}`, 'water', d.od, [
      d.at,
      [d.at[0], MANIFOLD_Y, d.at[2]],
    ]);
  rule('Pump discharge manifold', 'battery.inlet', 'water', MAIN, [
    [mx, MANIFOLD_Y, Math.max(dA.at[2], dB.at[2])],
    [mx, MANIFOLD_Y, inletZ],
    [mx, inletY, inletZ],
  ]);

  // ---- The battery block ----------------------------------------------
  const xs = (k: 'inlet' | 'outlet' | 'drain') => fp.map((f) => f[k].at[0]);
  const inletX0 = Math.min(mx, ...xs('inlet'));
  rule('Inlet header', 'battery.inlet', 'water', MAIN, [
    [inletX0, inletY, inletZ],
    [Math.max(...xs('inlet')), inletY, inletZ],
  ]);
  fp.forEach((f, i) => {
    rule(
      `Filter ${i + 1} inlet`,
      `filter-${i + 1}.inlet`,
      'water',
      f.inlet.od,
      [f.inlet.at, [f.inlet.at[0], inletY, inletZ]],
    );
    rule(
      `Filter ${i + 1} outlet`,
      `filter-${i + 1}.outlet`,
      'water',
      f.outlet.od,
      [f.outlet.at, [f.outlet.at[0], outletY, outletZ]],
    );
    rule(
      `Filter ${i + 1} backwash`,
      `filter-${i + 1}.drain`,
      'drain',
      f.drain.od,
      [
        f.drain.at,
        [f.drain.at[0], f.drain.at[1], drainZ],
        [f.drain.at[0], HEADER.drain.y, drainZ],
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
  // The backwash header, falling 1 in 100 each way to its drop into the floor channel between filters 1 and 2.
  const dropX = gap(0, 1);
  const dx = xs('drain');
  const fall = (x: number) => HEADER.drain.y - Math.abs(x - dropX) * 0.01;
  rule('Backwash header, west', 'battery.drain', 'drain', 0.16, [
    [Math.min(...dx), fall(Math.min(...dx)), drainZ],
    [dropX, fall(dropX) + 0.0, drainZ],
  ]);
  rule('Backwash header, east', 'battery.drain', 'drain', 0.16, [
    [Math.max(...dx), HEADER.drain.y, drainZ],
    [dropX, fall(dropX), drainZ],
  ]);
  rule('Backwash drop and floor channel', 'battery.drain', 'drain', 0.16, [
    [dropX, fall(dropX), drainZ],
    [dropX, CHANNEL, drainZ],
    [dropX, CHANNEL - (hz - drainZ) / 100, hz + 0.3],
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
  // (The east wall's pass the gantry's deck where it meets the wall, in a
  // sleeve.) The UV's, in the room's middle, is routed.
  const drop = (
    line: string,
    side: 'east' | 'west',
    p: RoomPort,
    across: number,
    od: number,
  ) => {
    const x = side === 'east' ? bx : -bx;
    rule(`Busbar drop to ${p.machine} (${p.name})`, line, 'power', od, [
      [x, B.y - B.od / 2, p.at[2]],
      [x, across, p.at[2]],
      [p.at[0], across, p.at[2]],
      p.at,
    ]);
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
      start: end(port('uv', 'outlet')),
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
      id: 'hypo-supply',
      pipe: 'chemical',
      od: 0.012,
      start: wall('south', port('hypo', 'supply').at[0], 2.2),
      end: end(port('hypo', 'supply')),
    },
    {
      id: 'acid-supply',
      pipe: 'chemical',
      od: 0.012,
      start: wall('south', port('acid', 'supply').at[0], 2.2),
      end: end(port('acid', 'supply')),
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
    'Outlet header',
    'HX side-stream flow stub',
    'HX side-stream return stub',
  ]);
  const fixed: DrawnRun[] = runs.map((r) => ({
    name: r.name,
    // The header's end fitting (a flange) and the main's need more room than a stub's.
    points: joins.has(r.name)
      ? trimEnd(r.points, r.name === 'Outlet header' ? 0.6 : 0.2)
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
    startStraight: 0.45,
    // Laid first, as they have least room: the treatment main, the side-stream's return, the pumps' feeds across the room.
    ...(FIRST.has(w.id) ? { priority: 10 } : {}),
    // A pump's power port is inside its casing's box: a lead long enough to clear it (as Dev24's).
    endStraight: w.id.startsWith('power-pump') ? 1.0 : 0.45,
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
  });

  // Each fitting on the run that carries its line: at its end by the port it serves.
  const fittings: OlympicFitting[] = [];
  const runFor = (lineId: string) =>
    runs.find((r) => r.line === lineId) ??
    (lineId.startsWith('filter-')
      ? runs.find((r) => r.line === lineId)
      : lineId.endsWith('.inlet') || lineId.startsWith('pumps')
        ? runs.find((r) => r.name === 'Pump discharge manifold')
        : undefined);
  for (const [lineId, list] of expansion.along) {
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
      const fromEnd = f.end === 'source' ? d : L - d;
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
        at: p.at,
        along: p.along,
        normally: f.normally,
        // Every valve is solenoid-operated, worked from the panel (the
        // owner, 2026-10-23): its height does not matter. A power
        // isolator is worked by hand, so must be within reach.
        operator: f.kind === 'power-isolator' ? 'hand' : 'solenoid',
        reachable:
          f.kind !== 'power-isolator' ||
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
    at: [round((hxFlowX + hxReturnX) / 2), outletY, round(outletZ)],
    along: [1, 0, 0],
    normally: 'open',
    operator: 'solenoid',
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
  return { items, ports, runs, fittings, expansion, regions, problems };
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
