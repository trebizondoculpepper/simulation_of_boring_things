import { placedPort } from './machine-ports';
import { routeVoxelLines } from '../../components/core/logic/voxel-router';
import type { RouterLine } from '../../components/core/logic/voxel-router';
import type {
  PipeJoint,
  PortEnd,
  Vec3,
} from '../../components/core/logic/pipe-route';
import { pricePerMetre } from '../../components/core/logic/pipe-costs';
import { placeInline } from '../../components/core/logic/inline-placement';
import type { InlineSpot } from '../../components/core/logic/inline-placement';
import { WET_HALL_SCHEMATIC } from '../../../game/plant/wet-hall-schematic';
import { schematicExpansion } from '../../../game/plant/schematics';
import { INSTALLED_VALVES } from '../../../game/plant/installed-valves';
import { layoutRoom, wetHallBox } from './room-equipment';
import { WET_HALL, WET_HALL_LAYOUT } from './shell-rooms';

/**
 * The wet hall plumbed by the plumber (prompt 036; the owner, 2026-10-26),
 * after the jacuzzi's (`jacuzzi-plumbing.ts`): each water link of its
 * schematic (`wet-hall-schematic.ts`) laid by the voxel router from the
 * port it leaves to the port it reaches, round the placed machines, the
 * make-up bay's partition, the ramp and the stair. Its boundaries: the
 * outside world's services by their flanged stubs on the north wall (the
 * town main in and the make-up main out, in the bay; the backwash main in,
 * west of it); the foul sewer by its connection in the floor east of the
 * pit; the waste by the make-up bay's own gullies, never the pit. The
 * schematic's valves set in their lines by `placeInline`, under the
 * register's names. Nothing is drawn by hand. Pure: metres, the hall's
 * frame, its floor at y = 0.
 */

export type WetHallKind = 'copper' | 'pvc-pressure' | 'pvc-drain';

export interface WetHallLine {
  /** Its link in the schematic. */
  link: string;
  kind: WetHallKind;
  od: number;
  joint: PipeJoint;
  start: PortEnd;
  end: PortEnd;
  gravity: boolean;
  /** Its points, as the router laid it; none if it could not. */
  points?: Vec3[];
  /** Its schematic's valves, set in it: each fitting's spot and name. */
  valves?: (InlineSpot & { fitting: string; name: string })[];
}

const UP: Vec3 = [0, 1, 0];
/** A gully's tundish mouth: where a drain's pipe ends over it. */
const TUNDISH_TOP = 0.17;
/** A doorway's head, with a pipe's room over it, metres. */
const DOOR_HEAD = 2.7;
/** The flange of a north-wall stub, this far in from the wall's face. */
const STUB = 0.37;
/** Headroom kept over a ramp or a stair, metres. */
const HEADROOM = 2.3;

const nodeKind = new Map(WET_HALL_SCHEMATIC.nodes.map((n) => [n.id, n.kind]));

/** The water links the router lays (the rest are signals and power). */
export const WET_HALL_ROUTED = WET_HALL_SCHEMATIC.links.filter(
  (l) => l.medium === 'water',
);

/** A line that must fall all the way: an overflow, or anything to waste. */
const isGravity = (link: (typeof WET_HALL_ROUTED)[number]) =>
  /overflow/.test(link.sourcePort) || nodeKind.get(link.targetId) === 'gully';

/** The register's name for a valve, by its fitting (asset) id. */
function valveName(link: string, fitting: string) {
  const key = Object.keys(INSTALLED_VALVES).find(
    (k) =>
      k.startsWith(`wet_hall|${link}|`) &&
      INSTALLED_VALVES[k].assetId === fitting,
  );
  return key?.split('|')[2] ?? fitting;
}

/** The hall's north wall's inside face, z. */
const northFace = () => -(WET_HALL.side / 2) + WET_HALL_LAYOUT.northWall;

/** Each routed link's two ends in the hall, from its machines' ports and boundaries. */
export function wetHallLines(): WetHallLine[] {
  const layout = layoutRoom('wet_hall');
  if (!layout) return [];
  const byNode: Record<string, string> = {
    meter: 'water-meter',
    flowmeter: 'make-up-flowmeter',
    'break-tank': 'break-tank',
    booster: 'booster-set',
    holding: 'backwash-tank',
  };
  const L = WET_HALL_LAYOUT;
  const z0 = northFace() + STUB;
  const stub = (p: { x: number; y: number }): PortEnd => ({
    at: [p.x, p.y, z0],
    outward: [0, 0, 1],
  });
  const gully = (side: 'clean' | 'dirty', k = 0): PortEnd => {
    const g = L.gullies.filter((x) => x.side === side)[k];
    return { at: [g.x, TUNDISH_TOP, g.z], outward: UP };
  };
  return WET_HALL_ROUTED.map((link) => {
    const machineEnd = (node: string, port: string): PortEnd | undefined => {
      const key = byNode[node];
      const placed = key && layout.placed.find((p) => p.item.key === key);
      if (!placed) return undefined;
      const p = placedPort(placed, port);
      return { at: [...p.at] as Vec3, outward: [...p.outward] as Vec3 };
    };
    const boundary = (node: string, port: string): PortEnd => {
      if (node === 'town-main') return stub(L.townMainIn);
      if (node === 'plant-rooms')
        return stub(port === 'make-up' ? L.makeUpMainOut : L.backwashMainIn);
      if (node === 'sewer')
        return { at: [L.sewerDrop.x, 0.15, L.sewerDrop.z], outward: UP };
      // The break tank's waste to the bay's gullies: its overflow to the
      // one under it, its drain to the one before the booster set.
      return gully('clean', link.sourcePort === 'overflow' ? 0 : 1);
    };
    const start =
      machineEnd(link.sourceId, link.sourcePort) ??
      boundary(link.sourceId, link.sourcePort);
    const end =
      machineEnd(link.targetId, link.targetPort) ??
      boundary(link.targetId, link.targetPort);
    const gravity = isGravity(link);
    const dirty =
      link.sourceId === 'plant-rooms' && link.sourcePort === 'backwash';
    const kind: WetHallKind = gravity
      ? 'pvc-drain'
      : dirty || link.sourceId === 'holding'
        ? 'pvc-pressure'
        : 'copper';
    const od = dirty
      ? 0.16
      : link.sourceId === 'holding'
        ? 0.076
        : gravity
          ? link.sourcePort === 'overflow'
            ? 0.11
            : 0.09
          : link.sourceId === 'booster'
            ? 0.076
            : link.targetId === 'booster'
              ? 0.089
              : 0.067;
    return {
      link: link.id,
      kind,
      od,
      joint: kind === 'copper' ? 'flange' : 'socket',
      start,
      end,
      gravity,
    };
  });
}

/** The lines routed round the hall: each with its points and valves, and what failed. */
export function wetHallPlumbing() {
  const layout = layoutRoom('wet_hall');
  const lines = wetHallLines();
  if (!layout) return { lines, problems: ['no room'] };
  const box = wetHallBox();
  const solidUpTo = (h: number) => (f: (typeof box.solid)[number]) => ({
    min: [f.minX, 0, f.minZ] as Vec3,
    max: [f.maxX, h, f.maxZ] as Vec3,
  });
  // The machines, each to its height; the pit only to its rail's, its
  // lines going down into it on long leads.
  const obstacles = layout.placed.map((p) => ({
    min: [p.footprint.minX, 0, p.footprint.minZ] as Vec3,
    max: [
      p.footprint.maxX,
      p.item.pit ? 1.2 : p.item.h,
      p.footprint.maxZ,
    ] as Vec3,
  }));
  // The partition, to its top; the ramp, stair and landings with
  // headroom over them; the doorways and the floor kept clear before
  // them, to a door's head.
  const regions = [
    ...box.solid.map((f) => ({
      ...solidUpTo(
        f.maxX - f.minX < 0.5 || f.maxZ - f.minZ < 0.5
          ? WET_HALL_LAYOUT.partition.height
          : WET_HALL.drop + HEADROOM,
      )(f),
      forbids: { runs: true },
    })),
    ...box.keepClear.map((k) => ({
      ...solidUpTo(DOOR_HEAD)(k),
      forbids: { runs: true },
    })),
  ];
  // A port inside its machine's box leaves it on a lead long enough to
  // clear it: up out of the pit, past its rail; out from the break
  // tank's face, past its ladder's cage.
  const inPit = (end: PortEnd) => end.at[1] < 0.2 && end.outward[1] > 0;
  const lead = (l: WetHallLine, end: PortEnd) =>
    inPit(end) && end !== sewerEnd(l)
      ? 1.6
      : // The booster set's discharge out level far enough for its
        // motorised valve on the straight, on a floor stand, before it
        // turns up (the owner, 2026-10-26: it sat on the riser, held by
        // nothing).
        l.link === 'Make-up main to the pool plant rooms' && end === l.start
        ? 0.7
        : 0.2;
  const sewerEnd = (l: WetHallLine) =>
    l.link === 'Backwash discharge to the sewer' ? l.end : undefined;
  // Two ports facing each other on one line are joined straight, a
  // short spool, not routed (the owner, 2026-10-26: the meter to the
  // flowmeter looped up and down); the router lays the rest round them.
  const facing = (l: WetHallLine) => {
    const [a, b] = [l.start, l.end];
    const d: Vec3 = [b.at[0] - a.at[0], b.at[1] - a.at[1], b.at[2] - a.at[2]];
    const len = Math.hypot(...d);
    return (
      len > 0 &&
      [0, 1, 2].every(
        (i) =>
          Math.abs(a.outward[i] - d[i] / len) < 1e-6 &&
          Math.abs(b.outward[i] + d[i] / len) < 1e-6,
      )
    );
  };
  // Two ports level with each other, facing at right angles, each out
  // toward the corner between them, are joined by one elbow (the owner,
  // 2026-10-26: the town main straight into its meter, no dogleg).
  const elbow = (l: WetHallLine): Vec3[] | undefined => {
    const [a, b] = [l.start, l.end];
    if (l.gravity || Math.abs(a.at[1] - b.at[1]) > 1e-6) return undefined;
    const axis = (v: Vec3) =>
      Math.abs(v[0]) > 0.9 ? 0 : Math.abs(v[2]) > 0.9 ? 2 : -1;
    const ia = axis(a.outward);
    const ib = axis(b.outward);
    if (ia < 0 || ib < 0 || ia === ib) return undefined;
    const corner: Vec3 =
      ia === 0 ? [b.at[0], a.at[1], a.at[2]] : [a.at[0], a.at[1], b.at[2]];
    const out = (from: Vec3, dir: Vec3) =>
      (corner[0] - from[0]) * dir[0] + (corner[2] - from[2]) * dir[2];
    return out(a.at, a.outward) > 0.2 && out(b.at, b.outward) > 0.2
      ? [a.at, corner, b.at]
      : undefined;
  };
  const straight = new Map<string, Vec3[]>(
    lines.flatMap((l): [string, Vec3[]][] => {
      if (facing(l)) return [[l.link, [l.start.at, l.end.at]]];
      const e = elbow(l);
      return e ? [[l.link, e]] : [];
    }),
  );
  const router: RouterLine[] = lines
    .filter((l) => !straight.has(l.link))
    .map((l) => ({
      id: l.link,
      start: l.start,
      end: l.end,
      od: l.od,
      joint: l.joint,
      price: pricePerMetre(l.kind, l.od),
      startStraight: lead(l, l.start),
      endStraight: lead(l, l.end),
      ...(l.gravity ? { priority: 5, gravity: true as const } : {}),
    }));
  const routed = routeVoxelLines(
    {
      halfX: layout.box.w / 2,
      halfZ: layout.box.d / 2,
      height: 5.5,
      obstacles,
      regions,
    },
    router,
    lines
      .filter((l) => straight.has(l.link))
      .map((l) => ({
        name: l.link,
        points: straight.get(l.link)!,
        od: l.od,
        joint: l.joint,
      })),
  );
  for (const [link, points] of straight) routed.routes.set(link, points);
  const along = schematicExpansion('wet_hall')?.along ?? new Map();
  const problems: string[] = [];
  const done = lines.map((l): WetHallLine => {
    const points = routed.routes.get(l.link);
    if (!points) return l;
    const fittings = (along.get(l.link) ?? []).filter(
      (f: { kind: string }) => f.kind === 'isolating-valve',
    );
    const placed = placeInline(
      points,
      fittings.map((f: { id: string; end: string }) => ({
        id: f.id,
        length: Math.max(0.15, 3 * l.od),
        near: f.end === 'source' ? ('start' as const) : ('end' as const),
      })),
      // A gravity line's valve at its foot, by the floor, worked
      // crouching.
      l.gravity
        ? {
            ends: 0.04,
            bends: 0.06,
            reach: [0, 1.8],
          }
        : straight.has(l.link) ||
            l.link === 'Make-up main to the pool plant rooms'
          ? // A spool or elbow between ports, low: worked crouching; or a
            // motorised valve, worked from its panel, set low on the level
            // run where it is carried.
            { reach: [0, 1.8] }
          : {},
    );
    problems.push(...placed.problems.map((p) => `${l.link}: ${p}`));
    return {
      ...l,
      points,
      valves: placed.spots.map((spot) => ({
        ...spot,
        fitting: spot.id,
        name: valveName(l.link, spot.id),
      })),
    };
  });
  return {
    lines: done,
    problems: [
      ...problems,
      ...routed.problems,
      ...lines
        .filter((l) => !routed.routes.has(l.link))
        .map((l) => `${l.link}: not routed`),
    ],
  };
}
