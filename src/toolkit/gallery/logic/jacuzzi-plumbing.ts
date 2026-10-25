import { PIPE_KINDS } from '../../components/core/views/pipe-kinds';
import { routeVoxelLines } from '../../components/core/logic/voxel-router';
import type { RouterLine } from '../../components/core/logic/voxel-router';
import type {
  DrawnRun,
  PipeJoint,
  PortEnd,
  Vec3,
} from '../../components/core/logic/pipe-route';
import { pricePerMetre } from '../../components/core/logic/pipe-costs';
import { placeInline } from '../../components/core/logic/inline-placement';
import type { InlineSpot } from '../../components/core/logic/inline-placement';
import {
  JACUZZI_LINKS,
  JACUZZI_NODES,
  JACUZZI_ROOM,
  jacuzziExpansion,
} from '../../../game/plant/jacuzzi-schematic';
import type { PlumbEdge } from '../../../game/plant/plumbing-expansion';
import { layoutRoom } from './room-equipment';
import {
  cabinetBalanceTank,
  cabinetBodyIn,
  cabinetGully,
  cabinetPortsInRoom,
} from './cabinet-pipes';

/**
 * The jacuzzi plant room plumbed by the plumber (prompt 064, step 7): each
 * water and air link of its schematic (`jacuzzi-schematic.ts`) laid by the
 * voxel router from the port it leaves to the port it reaches, round the
 * placed cabinet and balance tank: the cabinet's and the tank's own ports,
 * the gully's tundishes on the floor, and where the spa's, the heating
 * main's and the water service's links meet the room's walls (the spa's
 * the north wall, toward its hall; the main plant's the south). Nothing is
 * drawn by hand: a line's ends are its link's ports, its kind its medium's.
 * The room as it was is kept as `retired1`. Pure.
 */

type Kind = 'pvc-pressure' | 'pvc-drain' | 'lagged-heating';

export interface JacuzziLine {
  /** Its link in the schematic. */
  link: string;
  kind: Kind;
  od: number;
  joint: PipeJoint;
  start: PortEnd;
  end: PortEnd;
  /** Its points, as the router laid it; none if it could not. */
  points?: Vec3[];
  /** Its schematic's valves, set in it by the plumber: each fitting's spot. */
  valves?: (InlineSpot & { fitting: string })[];
}

/** A valve's length along its pipe, for setting it in: about three diameters, at least 15 cm. */
const valveLength = (od: number) => Math.max(0.15, 3 * od);

/** Where the room's links cross its walls: this high and this far apart, one lane each. */
const WALL_LANES = { from: 2.7, step: 0.25, across: 0.3 } as const;
const UP: Vec3 = [0, 1, 0];
/** A wall's port stands this far in from its face, its sleeve's length (as the Olympic's). */
const SLEEVE = 0.15;
/** A doorway's head, with a pipe's room over it, metres. */
const DOOR_HEAD = 2.7;
/** A tundish's mouth: where a drain's pipe ends over it. */
const TUNDISH_TOP = 0.17;

const nodeKind = new Map(JACUZZI_NODES.map((n) => [n.id, n.kind]));

/** The pipe a link is laid in, by what it carries and where it goes. */
function kindOf(link: PlumbEdge): Kind {
  const ends = [link.sourceId, link.targetId].map((id) => nodeKind.get(id));
  if (ends.includes('gully')) return 'pvc-drain';
  if (ends.includes('heating-main')) return 'lagged-heating';
  return 'pvc-pressure';
}

/**
 * A gravity line, which must fall all the way: an overflow (named so by
 * its ports), or anything to the gully.
 */
const gravity = (link: PlumbEdge) =>
  /overflow/.test(link.sourcePort) ||
  /overflow/.test(link.targetPort) ||
  nodeKind.get(link.targetId) === 'gully';

/**
 * A gravity line's route, by rule (the router lays lines that may rise):
 * out of its port, level across to over where it lands, then straight
 * down into it. It never rises.
 */
function falling(start: PortEnd, end: PortEnd, lead = 0.15): Vec3[] {
  const out: Vec3 = [
    start.at[0] + start.outward[0] * lead,
    start.at[1] + start.outward[1] * lead,
    start.at[2] + start.outward[2] * lead,
  ];
  const y = out[1];
  const points: Vec3[] = [
    start.at,
    out,
    [end.at[0], y, out[2]],
    [end.at[0], y, end.at[2]],
    end.at,
  ];
  // Without its steps of no length, and straight on through its points.
  const kept = points.filter(
    (p, i) =>
      i === 0 ||
      Math.hypot(
        p[0] - points[i - 1][0],
        p[1] - points[i - 1][1],
        p[2] - points[i - 1][2],
      ) > 1e-6,
  );
  return kept.filter((p, i) => {
    if (i === 0 || i === kept.length - 1) return true;
    const a = kept[i - 1];
    const b = kept[i + 1];
    const u = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const v = [b[0] - p[0], b[1] - p[1], b[2] - p[2]];
    const cross = Math.hypot(
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    );
    return cross > 1e-9;
  });
}

/** The water and air links the router lays (the rest are signals and power). */
export const ROUTED_LINKS: readonly PlumbEdge[] = JACUZZI_LINKS.filter(
  (l) => l.medium === 'water' || l.medium === 'air',
);

/** Each routed link's two ends in the room, from its machines' ports. */
export function jacuzziLines(room = JACUZZI_ROOM): JacuzziLine[] {
  const layout = layoutRoom(room);
  const tank = cabinetBalanceTank(room);
  const ports = new Map(cabinetPortsInRoom(room).map((p) => [p.name, p]));
  if (!layout || !tank) return [];
  const halfZ = layout.box.d / 2;
  const lanes = { north: 0, south: 0 };
  /** A boundary's port on a wall, in its next lane, square to the wall. */
  const onWall = (
    wall: 'north' | 'south',
    x: number,
    straight = false,
  ): PortEnd => {
    const k = lanes[wall]++;
    const y = WALL_LANES.from + WALL_LANES.step * k;
    // Each lane a little further into the room, so they cross the wall
    // apart; a gravity line straight over where it falls to.
    if (!straight) x += WALL_LANES.across * k;
    return wall === 'north'
      ? { at: [x, y, -halfZ + SLEEVE], outward: [0, 0, 1] }
      : { at: [x, y, halfZ - SLEEVE], outward: [0, 0, -1] };
  };
  const tankPort = (port: string): PortEnd | undefined =>
    port === 'suction'
      ? { at: tank.suction, outward: [-1, 0, 0] }
      : port === 'overflow'
        ? { at: tank.overflowIn, outward: UP }
        : port === 'make-up'
          ? { at: tank.makeUp, outward: UP }
          : port === 'overflow-out'
            ? { at: tank.overflowOut, outward: [0, 0, -1] }
            : port === 'drain'
              ? { at: tank.drainOut, outward: [0, 0, -1] }
              : undefined;
  return ROUTED_LINKS.map((link) => {
    const cabinetPort = ports.get(link.id);
    // The end at a machine: the cabinet's port of the link's name, the tank's by its port.
    const machineEnd = (node: string, port: string): PortEnd | undefined =>
      node === 'cabinet' && cabinetPort
        ? { at: cabinetPort.at, outward: cabinetPort.outward }
        : node === 'tank'
          ? tankPort(port)
          : undefined;
    const source = machineEnd(link.sourceId, link.sourcePort);
    const target = machineEnd(link.targetId, link.targetPort);
    const across = (source ?? target)!.at[0];
    // The end at a boundary: the gully's tundish, or a wall.
    const boundary = (node: string): PortEnd => {
      const kind = nodeKind.get(node);
      if (kind === 'gully') {
        const at =
          link.sourceId === 'cabinet'
            ? cabinetGully(room)!
            : link.sourcePort === 'drain'
              ? tank.drainGully
              : tank.overflowDrop;
        return { at: [at[0], TUNDISH_TOP, at[2]], outward: UP };
      }
      return onWall(kind === 'spa' ? 'north' : 'south', across, gravity(link));
    };
    const kind = kindOf(link);
    return {
      link: link.id,
      kind,
      od: cabinetPort?.od ?? (link.targetPort === 'make-up' ? 0.032 : 0.05),
      joint: kind === 'lagged-heating' ? 'flange' : 'socket',
      start: source ?? boundary(link.sourceId),
      end: target ?? boundary(link.targetId),
    };
  });
}

/** The lines routed round the room's machines: each with its points, and what failed. */
export function jacuzziPlumbing(
  room = JACUZZI_ROOM,
  /** Runs already laid, to keep clear of (the room's power, by rule). */
  fixed: readonly DrawnRun[] = [],
) {
  const layout = layoutRoom(room);
  const tank = cabinetBalanceTank(room);
  const cabinet = layout?.placed.find((p) => p.item.key === 'jacuzzi-pack');
  const lines = jacuzziLines(room);
  if (!layout || !tank || !cabinet) return { lines, problems: ['no room'] };
  const body = cabinetBodyIn(cabinet, true);
  const obstacles = [
    { min: body.min, max: [body.max[0], 2.2, body.max[2]] as Vec3 },
    {
      min: [tank.x - tank.r, 0, tank.z - tank.r] as Vec3,
      max: [tank.x + tank.r, tank.height, tank.z + tank.r] as Vec3,
    },
  ];
  const isGravity = (l: JacuzziLine) =>
    gravity(JACUZZI_LINKS.find((x) => x.id === l.link)!);
  // The gravity lines by rule; the router lays the rest round them.
  const fallen = new Map(
    lines.filter(isGravity).map((l) => [l.link, falling(l.start, l.end)]),
  );
  const router: RouterLine[] = lines
    .filter((l) => !isGravity(l))
    .map((l) => ({
      id: l.link,
      start: l.start,
      end: l.end,
      od: l.od,
      joint: l.joint,
      price: pricePerMetre(l.kind, l.od),
      startStraight: 0.15,
      endStraight: 0.15,
      // Half its lagging: the cabinet's heating stubs stand closer than two
      // laggings (a clash known since 2026-10-23, `pipe-clashes.test.ts`),
      // and the router must still lead them out apart.
      insulation: (PIPE_KINDS[l.kind].insulation?.thickness ?? 0) / 2,
      // The lagged heating pair, its ports close together, laid first.
      ...(l.kind === 'lagged-heating' ? { priority: 10 } : {}),
    }));
  // The room's doorways and the spaces kept clear before them: no pipe
  // through them below the doors' head.
  const regions = layout.box.keepClear.map((k) => ({
    min: [k.minX, 0, k.minZ] as Vec3,
    max: [k.maxX, DOOR_HEAD, k.maxZ] as Vec3,
    forbids: { runs: true },
  }));
  const routed = routeVoxelLines(
    {
      halfX: layout.box.w / 2,
      halfZ: layout.box.d / 2,
      height: 4,
      obstacles,
      regions,
    },
    router,
    [
      ...fixed,
      ...lines.filter(isGravity).map((l) => ({
        name: l.link,
        points: fallen.get(l.link)!,
        od: l.od,
        joint: l.joint,
      })),
    ],
  );
  // Each line's valves, the schematic's own, set in it where a person can
  // reach them, each near the end of the link the schematic puts it at.
  const along = jacuzziExpansion().along;
  const problems: string[] = [];
  const done = lines.map((l): JacuzziLine => {
    const points = fallen.get(l.link) ?? routed.routes.get(l.link);
    if (!points) return l;
    const fittings = (along.get(l.link) ?? []).filter(
      (f) => f.kind === 'isolating-valve',
    );
    const placed = placeInline(
      points,
      fittings.map((f) => ({
        id: f.id,
        length: valveLength(l.od),
        near: f.end === 'source' ? ('start' as const) : ('end' as const),
      })),
      // A gravity line's valve is at its foot, by the floor, on a short
      // straight: closer to its ends and bends, worked crouching.
      isGravity(l) ? { ends: 0.04, bends: 0.06, reach: [0, 1.8] } : {},
    );
    problems.push(...placed.problems.map((p) => `${l.link}: ${p}`));
    return {
      ...l,
      points,
      valves: placed.spots.map((spot) => ({ ...spot, fitting: spot.id })),
    };
  });
  return {
    lines: done,
    problems: [
      ...problems,
      ...routed.problems,
      ...lines
        .filter((l) => !routed.routes.has(l.link) && !fallen.has(l.link))
        .map((l) => `${l.link}: not routed`),
    ],
  };
}
