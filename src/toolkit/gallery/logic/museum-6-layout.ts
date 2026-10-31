import {
  FITTINGS,
  INSTRUMENTS,
  LINKS,
  LINK_DN,
  PUMPS,
  TANK,
  hall6Expansion,
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
import type { RouterLine } from '../../components/core/logic/voxel-router';
import { pipeClashes } from '../../components/core/logic/pipe-route';
import type { PipeJoint, Vec3 } from '../../components/core/logic/pipe-route';
import { pointAlong } from './source-sink-plumbing';
import { hallColumns, hallInterior, hallOrigin } from './museum-plan';

/**
 * Hall 6's plant, laid out (107j; the owner's redesign, 2026-10-31). Six
 * of the game's pumps stand round the hall, smallest to largest along the
 * visitors' route from the way in (the north archway, from Hall 5) to the
 * way out (the south archway, to Hall 7): two on the north wall, two on
 * the west (window) wall, two on the south wall, each clear of the
 * archways and their approaches; the east (street) wall keeps the mimic
 * and the panels. Each pump stands with its suction to the wall, drawing
 * from the ideal reservoir CW1, a trough along the foot of each of the
 * three walls (one ideal source, drawn in three lengths), and faces into
 * the hall, its RUN stand and plaque in front of it. Each fill line rises
 * from its pump, runs overhead (at its own level, below the header, where
 * it must cross another) and rises at its last corner to run level into
 * the inlet header HD1, overhead in the hall's middle, never above it;
 * the header feeds the test tank TK1; the tank's drain and overflow fall
 * all the way (`FALL`) to the ideal drain DR1, a tundish at its foot.
 * Sized from `hallInterior('museum6')`. Pure; metres, the hall's own
 * frame (middle at the origin, y up, north −z).
 */

/** No turn: the layout is in the hall's own frame (it was turned half round before 2026-10-31). */
export const STANDS = { turn: 0 } as const;

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

/** The reservoir's troughs: their depth from the wall and their height. */
export const TROUGH = { d: 0.6, h: 1.05, gap: 0.05 } as const;
/** How far in front of a trough each pump's suction port stands: room for its valve. */
const SUCTION_OFF = 0.85;
/** The header: overhead in the hall's middle, along x, at z = `z`; the fill lines run level into it at its height. */
export const HEADER = { y: 3.7, z: 0, od: 0.32 } as const;
export const HEADER_SPAN = { minX: -3.2, maxX: 1.2 } as const;
/** The tank's place, in the hall's middle, east of the header's end. */
export const TANK_AT = { x: 1.6, z: 0 } as const;
/** The IBC's top (its cage), m. */
export const TANK_TOP = 1.16;
/** The drain's tundish, at the tank's foot (its outlet faces −z). */
export const GULLY_AT = { x: 1.6, z: -1.7 } as const;

export interface MachinePlace {
  x: number;
  z: number;
  yaw: number;
}
export interface Port {
  at: Vec3;
  out: Vec3;
}

/** A wall the plant stands against. */
type Side = 'north' | 'west' | 'south';
/** Toward the wall, in (x, z). */
const TOWARD: Record<Side, [number, number]> = {
  north: [0, -1],
  west: [-1, 0],
  south: [0, 1],
};
/** The yaw that turns a frame's +x toward the wall. */
const WALL_YAW: Record<Side, number> = {
  north: Math.PI / 2,
  west: Math.PI,
  south: -Math.PI / 2,
};
/**
 * Where each pump stands: its wall, its place along it (x on the north and
 * south walls, z on the west), and the fill line's way to the header: the
 * level it runs at, the corners it turns (x, z), and its inlet's x on the
 * header's north (−z) or south (+z) side. Smallest to largest along the
 * route: in by the north archway (x 3.7 to 7.3), west along the north
 * wall, south down the west wall, east along the south wall to the south
 * archway; each pump clear of the columns (x ±3.85; z −6, 0, 6).
 */
const STATIONS: Record<
  PumpNo,
  {
    side: Side;
    u: number;
    level: number;
    corners: [number, number][];
    inlet: { x: number; side: -1 | 1 };
  }
> = {
  1: {
    side: 'north',
    u: 0.9,
    level: HEADER.y,
    corners: [],
    inlet: { x: 0.9, side: -1 },
  },
  2: {
    side: 'north',
    u: -2.2,
    level: HEADER.y,
    corners: [],
    inlet: { x: -2.2, side: -1 },
  },
  3: {
    side: 'west',
    u: -2.5,
    level: 3.2,
    corners: [[-2.9, -2.5]],
    inlet: { x: -2.9, side: -1 },
  },
  4: {
    side: 'west',
    u: 2.5,
    level: 3.0,
    corners: [[-2.9, 2.5]],
    inlet: { x: -2.9, side: 1 },
  },
  5: {
    side: 'south',
    u: -5.4,
    level: 3.3,
    corners: [
      [-5.28, 1.0],
      [-2.0, 1.0],
    ],
    inlet: { x: -2.0, side: 1 },
  },
  6: {
    side: 'south',
    u: 0.4,
    level: HEADER.y,
    corners: [],
    inlet: { x: 0.52, side: 1 },
  },
};

/** Each pump's shape in its own frame: suction toward +x (yaw 0), except the end-suction views (suction toward −x, turned a quarter so they face the room). */
interface PumpShape {
  yaw: number;
  suction: Port;
  discharge: Port;
  box: { min: Vec3; max: Vec3 };
}

/** A dosing pump's stand: its top. */
export const DOSING_STAND = 0.9;

const shapeOf = (p: HallPump): PumpShape =>
  p.family === 'displacement'
    ? {
        yaw: 0,
        suction: { at: [0.25, DOSING_STAND + 0.05, 0], out: [1, 0, 0] },
        discharge: { at: [-0.05, DOSING_STAND + 0.35, 0], out: [0, 1, 0] },
        box: { min: [-0.25, 0, -0.22], max: [0.25, DOSING_STAND + 0.3, 0.22] },
      }
    : {
        // Turned so its front (its gauges, nameplate and handles, the
        // view's +z) faces out from its wall into the room (the facing
        // rule); its axial suction then points along the wall, fed round
        // from the trough's outlet beside it (`SIDE_FEED`).
        yaw: -Math.PI / 2,
        suction: { at: [-1.0, 0.68, 0], out: [-1, 0, 0] },
        discharge: { at: [-0.57, 1.26, 0.12], out: [0, 1, 0] },
        box: { min: [-0.95, 0, -0.4], max: [0.95, 1.2, 0.4] },
      };

export const SHAPES: Record<PumpNo, PumpShape> = Object.fromEntries(
  PUMPS.map((p) => [p.no, shapeOf(p)]),
) as Record<PumpNo, PumpShape>;

const round = (v: number) => Math.round(v * 1e4) / 1e4;
const turn = ([x, y, z]: Vec3, yaw: number): Vec3 => [
  x * Math.cos(yaw) + z * Math.sin(yaw),
  y,
  -x * Math.sin(yaw) + z * Math.cos(yaw),
];

/** A point on a wall: `u` along it, `off` in from its face. */
function onWall(side: Side, u: number, off: number): [number, number] {
  if (side === 'west') return [interior.minX + off, u];
  return [u, side === 'north' ? interior.minZ + off : interior.maxZ - off];
}

/** Each pump's place: its suction port `SUCTION_OFF` in front of its trough, opposite its place along the wall. */
function placePumps(): Record<PumpNo, MachinePlace> {
  const out = {} as Record<PumpNo, MachinePlace>;
  for (const p of PUMPS) {
    const s = SHAPES[p.no];
    const st = STATIONS[p.no];
    const yaw = s.yaw + WALL_YAW[st.side];
    const [px, pz] = onWall(st.side, st.u, TROUGH.gap + TROUGH.d + SUCTION_OFF);
    const a = turn(s.suction.at, yaw);
    out[p.no] = { x: round(px - a[0]), z: round(pz - a[2]), yaw };
  }
  return out;
}

const PUMP_PLACES = placePumps();

/** How far along its wall an end-suction pump's trough outlet stands from its suction port, the way the suction points, m. */
export const SIDE_FEED = 0.75;
function sideFeed(no: PumpNo): number {
  const st = STATIONS[no];
  const out = turn(SHAPES[no].suction.out, PUMP_PLACES[no].yaw);
  const along = st.side === 'west' ? out[2] : out[0];
  return Math.sign(along) * SIDE_FEED;
}

/** The reservoir's three lengths: middle, yaw (its +x toward its wall) and length. */
export const TROUGHS: readonly {
  side: Side;
  x: number;
  z: number;
  yaw: number;
  length: number;
}[] = (['north', 'west', 'south'] as Side[]).map((side) => {
  const us = PUMPS.filter((p) => STATIONS[p.no].side === side).map(
    (p) => STATIONS[p.no].u,
  );
  const lo = Math.min(...us) - 1.2;
  const hi = Math.max(...us) + 1.2;
  const [x, z] = onWall(side, (lo + hi) / 2, TROUGH.gap + TROUGH.d / 2);
  return { side, x, z, yaw: WALL_YAW[side], length: hi - lo };
});

export const PLACES: Record<MachineId, MachinePlace> = {
  ...(Object.fromEntries(
    PUMPS.map((p) => [pumpId(p.no), PUMP_PLACES[p.no]]),
  ) as Record<`p${PumpNo}`, MachinePlace>),
  // The reservoir's ports are given in the hall's frame (`TROUGHS`).
  source: { x: 0, z: 0, yaw: 0 },
  header: { x: 0, z: HEADER.z, yaw: 0 },
  // Turned so its bottom outlet faces −z, toward the tundish.
  tank: { x: TANK_AT.x, z: TANK_AT.z, yaw: Math.PI / 2 },
  drain: { x: GULLY_AT.x, z: GULLY_AT.z, yaw: 0 },
};

/** Each machine's ports, in its own frame. */
export const PORTS: Record<MachineId, Record<string, Port>> = {
  ...(Object.fromEntries(
    PUMPS.map((p) => {
      const s = SHAPES[p.no];
      return [pumpId(p.no), { suction: s.suction, discharge: s.discharge }];
    }),
  ) as unknown as Record<`p${PumpNo}`, Record<string, Port>>),
  // The troughs' outlets on their faces, one opposite each pump's suction.
  source: Object.fromEntries(
    PUMPS.map((p) => {
      const st = STATIONS[p.no];
      // An end-suction pump's suction points along the wall: its outlet
      // stands beside it, the way its suction points, so the line turns once.
      const [x, z] = onWall(
        st.side,
        st.u + (p.family === 'centrifugal' ? sideFeed(p.no) : 0),
        TROUGH.gap + TROUGH.d,
      );
      const [tx, tz] = TOWARD[st.side];
      return [
        `out-${p.no}`,
        {
          at: [round(x), SHAPES[p.no].suction.at[1], round(z)] as Vec3,
          out: [-tx, 0, -tz] as Vec3,
        },
      ];
    }),
  ),
  // The header: an inlet on its side for each pump; its outlet at its east end.
  header: {
    ...Object.fromEntries(
      PUMPS.map((p) => {
        const i = STATIONS[p.no].inlet;
        return [
          `in-${p.no}`,
          {
            at: [i.x, HEADER.y, (i.side * HEADER.od) / 2] as Vec3,
            out: [0, 0, i.side] as Vec3,
          },
        ];
      }),
    ),
    out: { at: [HEADER_SPAN.maxX, HEADER.y, 0], out: [1, 0, 0] },
  },
  // The IBC (its own frame: outlet toward +x): the fill down into its top
  // filler, the overflow out of its bottle's shoulder, the drain from its
  // bottom outlet valve's face.
  tank: {
    inlet: { at: [0, TANK.inletM, 0], out: [0, 1, 0] },
    overflow: {
      at: [0.6, TANK.floorM + TANK.overflowM - 0.06, -0.3],
      out: [1, 0, 0],
    },
    drain: { at: [0.72, 0.25, 0], out: [1, 0, 0] },
  },
  // The overflow in line with the tank's overflow; the drain a little
  // below the IBC's outlet, so its run falls (`FALL`).
  drain: {
    'in-1': { at: [-0.3, 0.3, 0], out: [0, 0, 1] },
    'in-2': { at: [0, 0.22, 0], out: [0, 0, 1] },
  },
};

export const BOXES: Record<MachineId, { min: Vec3; max: Vec3 }> = {
  ...(Object.fromEntries(
    PUMPS.map((p) => [pumpId(p.no), SHAPES[p.no].box]),
  ) as Record<`p${PumpNo}`, { min: Vec3; max: Vec3 }>),
  source: { min: [0, 0, 0], max: [0, 0, 0] },
  header: {
    min: [HEADER_SPAN.minX, HEADER.y - HEADER.od / 2, -HEADER.od / 2],
    max: [HEADER_SPAN.maxX, HEADER.y + HEADER.od / 2, HEADER.od / 2],
  },
  tank: { min: [-0.62, 0, -0.52], max: [0.62, TANK_TOP, 0.52] },
  drain: { min: [0, 0, 0], max: [0, 0, 0] },
};

/** Not obstacles as boxes: the gully in the floor, and the reservoir (its troughs are, `troughBoxes`). */
export const POINTS: readonly MachineId[] = ['drain', 'source'];

/** The troughs' boxes in the hall. */
export function troughBoxes(): { min: Vec3; max: Vec3 }[] {
  return TROUGHS.map((t) => {
    const along = t.side === 'west' ? 'z' : 'x';
    const half = t.length / 2;
    const hd = TROUGH.d / 2;
    return along === 'x'
      ? {
          min: [t.x - half, 0, t.z - hd] as Vec3,
          max: [t.x + half, TROUGH.h, t.z + hd] as Vec3,
        }
      : {
          min: [t.x - hd, 0, t.z - half] as Vec3,
          max: [t.x + hd, TROUGH.h, t.z + half] as Vec3,
        };
  });
}

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
    : ((
        {
          25: 0.032,
          40: 0.05,
          50: 0.063,
          65: 0.075,
          150: 0.16,
          200: 0.225,
          250: 0.28,
          300: 0.315,
        } as Record<number, number>
      )[dn] ?? dn / 900);

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
  return (
    (FIRST + things.reduce((s, t) => s + SPACING[t.kind], 0)) * scale(dn) + 0.1
  );
}

const lengthOf = (points: readonly Vec3[]) =>
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
) {
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

/**
 * Where each pump's RUN stand and plaque stand: in front of it, toward the
 * hall's middle, clear of a column's line where it would stand in its
 * shadow; `inward` is the way the visitor looks from the walkway (the
 * plaque faces back along it), `yaw` the stand's turn so its +z faces them.
 */
export function standOf(no: PumpNo): {
  x: number;
  z: number;
  yaw: number;
  inward: [number, number];
} {
  const st = STATIONS[no];
  const [tx, tz] = TOWARD[st.side];
  const b = boxInHall(pumpId(no));
  // Out from the wall to just beyond the pump's front, then 0.55 m more.
  const reach =
    st.side === 'west'
      ? b.max[0] - interior.minX
      : st.side === 'north'
        ? b.max[2] - interior.minZ
        : interior.maxZ - b.min[2];
  // Before the pump's middle along its wall (an end-suction pump's body
  // stands to one side of its suction port).
  const mid =
    st.side === 'west' ? (b.min[2] + b.max[2]) / 2 : (b.min[0] + b.max[0]) / 2;
  const [x, z] = onWall(st.side, mid, reach + 0.55);
  return {
    x: round(x),
    z: round(z),
    yaw: Math.atan2(-tx, -tz),
    inward: [-tx, -tz],
  };
}

/** A plaque's face: its centre's height and its half-width, m (`createRunStand`). */
export const PLAQUE = { y: 1.08, half: 0.32 } as const;
/** The visitors' walkway: how far in front of the stands they stand to read the plaques, and their eye's height, m. */
export const READER = { back: 1.5, eye: 1.6 } as const;

/** A gravity line's fall along its level-ish runs: 1 in 40. */
export const FALL = 1 / 40;

const lift = (p: Port, d: number): Vec3 => [
  p.at[0] + p.out[0] * d,
  p.at[1] + p.out[1] * d,
  p.at[2] + p.out[2] * d,
];

/** A path without its repeated points. */
const distinct = (points: readonly Vec3[]): Vec3[] =>
  points.filter(
    (p, k) =>
      k === 0 ||
      Math.hypot(
        p[0] - points[k - 1][0],
        p[1] - points[k - 1][1],
        p[2] - points[k - 1][2],
      ) > 1e-6,
  );

/**
 * A pump's fill line: up from its discharge to its level, along its
 * corners, up at the last to the header's level, and level into its inlet
 * (along z); never above the header, never down.
 */
function fillLineOf(no: PumpNo): Vec3[] {
  const st = STATIONS[no];
  const from = portInHall(pumpId(no), 'discharge');
  const to = portInHall('header', `in-${no}`);
  const y = Math.min(st.level, to.at[1]);
  const corners = st.corners.map(([x, z]) => [x, y, z] as Vec3);
  const last = corners.at(-1) ?? [from.at[0], y, from.at[2]];
  // The way along z into the inlet, from the last corner.
  return distinct([
    from.at,
    [from.at[0], y, from.at[2]],
    ...corners,
    [last[0], to.at[1], last[2]],
    [to.at[0], to.at[1], last[2]],
    to.at,
  ]);
}

/** The tank's fill: level from the header's outlet to over the tank, then down into it. */
function overAndDown(from: Port, to: Port): Vec3[] {
  return distinct([
    from.at,
    [to.at[0], from.at[1], from.at[2]],
    [to.at[0], from.at[1], to.at[2]],
    to.at,
  ]);
}

/**
 * The overflow: out of the tank falling (`FALL`), down beside it, and
 * falling into the tundish; its ends in line, so it never rises or runs level.
 */
function fallingTo(from: Port, to: Port): Vec3[] {
  const out = 0.4;
  const [x, y, z] = lift(from, out);
  const run = Math.hypot(to.at[0] - x, to.at[2] - z);
  return [
    from.at,
    [x, y - out * FALL, z],
    [x, to.at[1] + run * FALL, z],
    to.at,
  ];
}

/** Lay out and plumb Hall 6. */
export function plumbHall6(): Hall6Room {
  const expansion = hall6Expansion();
  const machines = (Object.keys(PLACES) as MachineId[]).filter(
    (id) => !POINTS.includes(id),
  );
  const columns = hallColumns('museum6').map((c) => ({
    min: [c.x - 0.3, 0, c.z - 0.3] as Vec3,
    max: [c.x + 0.3, ROOM.height, c.z + 0.3] as Vec3,
  }));
  const obstacles = [
    ...machines.map((id) => boxInHall(id)),
    ...troughBoxes(),
    ...columns,
  ];
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
      ...(l.id === 'overflow' || l.id === 'drainLine'
        ? { gravity: true as const }
        : {}),
    };
  });
  // Laid by hand: each fill line (the router's levels all stand above
  // both ends, so it would hump them over the header and trap air), the
  // tank fill, and the overflow and drain falling all the way. Each
  // suction runs straight from its trough.
  const hand = new Map<string, Vec3[]>([
    ...PUMPS.map((p): [string, Vec3[]] => [
      `delivery${p.no}`,
      fillLineOf(p.no),
    ]),
    [
      'fill',
      overAndDown(portInHall('header', 'out'), portInHall('tank', 'inlet')),
    ],
    [
      'overflow',
      fallingTo(portInHall('tank', 'overflow'), portInHall('drain', 'in-1')),
    ],
    [
      'drainLine',
      [portInHall('tank', 'drain').at, portInHall('drain', 'in-2').at],
    ],
  ]);
  for (const q of requests)
    if (!hand.has(q.id) && facing(q.start, q.end))
      hand.set(q.id, [q.start.at, q.end.at]);
  const fixed = requests
    .filter((q) => hand.has(q.id))
    .map((q) => ({
      name: q.id,
      points: hand.get(q.id)!,
      od: q.od,
      joint: q.joint,
    }));
  const routed = routeVoxelLines(
    { ...ROOM, regions: [], obstacles },
    requests.filter((q) => !hand.has(q.id)),
    fixed,
  );
  for (const [id, points] of hand) routed.routes.set(id, points);
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
    ...obstacles
      .filter((b) => b.min[1] < 2)
      .map((b) => ({
        minX: b.min[0],
        maxX: b.max[0],
        minZ: b.min[2],
        maxZ: b.max[2],
      })),
    ...lowPipeFootprints(lines),
  ];
  return { expansion, lines, items, problems, solids };
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
