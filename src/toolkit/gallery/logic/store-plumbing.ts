import { placedPort } from './machine-ports';
import { routeVoxelLines } from '../../components/core/logic/voxel-router';
import type { RouterLine } from '../../components/core/logic/voxel-router';
import type { PortEnd, Vec3 } from '../../components/core/logic/pipe-route';
import { pricePerMetre } from '../../components/core/logic/pipe-costs';
import { SCHEMATICS } from '../../../game/plant/schematics';
import { layoutRoom } from './room-equipment';
import { SHELL_ROOMS } from './shell-rooms';
import type { PipeRun } from './room-pipes';

/**
 * A chemical store plumbed (plan 085; the owner, 2026-10-27): each bulk
 * tank's draw-off into its transfer pump's suction, and the pump's
 * discharge main out of the store, high through its south wall over the
 * door, on to the wet hall (by compass only: the building is a fantasy).
 * Laid by the voxel router round the tanks, the skid, the shower and the
 * door's clear way, in PVC-U DN40 (the tanks' outlets and the suction)
 * and DN25 (the main), banded by chemical. Pure: metres, the room's frame.
 */

export type StoreId = 'hypo_store' | 'acid_store';
const CHEMICAL: Record<StoreId, 'hypochlorite' | 'acid'> = {
  hypo_store: 'hypochlorite',
  acid_store: 'acid',
};
const LABEL = {
  hypochlorite: 'SODIUM HYPOCHLORITE 14%',
  acid: 'HYDROCHLORIC ACID 10%',
} as const;
/** The main's sleeve, this far in from the wall's face. */
const STUB = 0.3;
const DOOR_HEAD = 2.7;

export function storePlumbing(room: StoreId) {
  const layout = layoutRoom(room);
  const schematic = SCHEMATICS[room];
  const c = CHEMICAL[room];
  const problems: string[] = [];
  if (!layout || !schematic)
    return { runs: [] as PipeRun[], problems: ['no room'] };
  const spec = SHELL_ROOMS[room];
  const byNode = (node: string) =>
    node === 'transfer'
      ? `chem-pump:${c}`
      : /^tank-(\d)$/.test(node)
        ? `chem-bulk:${c}:${node.slice(5)}`
        : null;
  const end = (node: string, port: string): PortEnd => {
    const key = byNode(node);
    const placed = key && layout.placed.find((p) => p.item.key === key);
    if (placed) {
      const p = placedPort(placed, port);
      return { at: [...p.at] as Vec3, outward: [...p.outward] as Vec3 };
    }
    // The main out: high in the south wall, east of the door.
    return node === 'main'
      ? { at: [1.4, 3.2, spec.d / 2 - STUB], outward: [0, 0, -1] }
      : { at: [-1.4, 0.5, spec.d / 2 - STUB], outward: [0, 0, -1] };
  };
  const links = schematic.links.filter((l) => l.medium === 'chemical');
  // Each tank's draw-off into its own tee on the suction header; each
  // tank's fill from its own sleeve along the wall, high, east of the
  // door, over the walkways and down to the tank.
  const tankNo = (node: string) => Number(/^tank-(\d)$/.exec(node)?.[1] ?? 1);
  const lines = links.map((l) => {
    const main = l.targetId === 'main';
    const toPump = l.targetId === 'transfer' && l.targetPort === 'in';
    const fill = l.targetPort === 'fill';
    const start = fill
      ? {
          at: [
            2.0 + 0.35 * (tankNo(l.targetId) - 1),
            3.6,
            spec.d / 2 - STUB,
          ] as Vec3,
          outward: [0, 0, -1] as Vec3,
        }
      : end(l.sourceId, l.sourcePort);
    // The main straight up off the skid to high level first, clear of
    // the floor in front of the extract and the shower.
    const riser: Vec3[] = [];
    let from = start;
    if (main) {
      const [x, y, z] = start.at;
      const o = start.outward;
      const elbow: Vec3 = [x + o[0] * 0.12, y, z + o[2] * 0.12];
      riser.push([x, y, z], elbow);
      from = { at: [elbow[0], 2.3, elbow[2]], outward: [0, 1, 0] };
    }
    return {
      link: l.id,
      od: main ? 0.032 : 0.05,
      riser,
      start: from,
      end: toPump
        ? end('transfer', `in-${tankNo(l.sourceId)}`)
        : end(l.targetId, l.targetPort),
    };
  });
  const obstacles = layout.placed.map((p) => ({
    min: [p.footprint.minX, 0, p.footprint.minZ] as Vec3,
    max: [
      p.footprint.maxX,
      p.item.mount === 'wall' ? p.y + p.item.h / 2 : p.item.h,
      p.footprint.maxZ,
    ] as Vec3,
  }));
  const regions = layout.box.keepClear.map((k) => ({
    min: [k.minX, 0, k.minZ] as Vec3,
    max: [k.maxX, DOOR_HEAD, k.maxZ] as Vec3,
    forbids: { runs: true },
  }));
  // Each tank's draw-off in a covered trench in the floor (as stores
  // have them): down from its outlet, along under the floor, up into its
  // tee on the pump's suction header, so nothing low crosses the floor.
  const TRENCH = -0.15;
  const trench = new Map<string, Vec3[]>(
    lines
      .filter((l) => /to its transfer pump$/.test(l.link))
      .map((l, k) => {
        const depth = TRENCH - 0.15 * k;
        // Its own lane under the header, beside the others'.
        const lane = 0.14 * (k + 1);
        const [ax, ay, az] = l.start.at;
        const [bx, by, bz] = l.end.at;
        const sx = ax + l.start.outward[0] * 0.12;
        const sz = az + l.start.outward[2] * 0.12;
        return [
          l.link,
          [
            [ax, ay, az],
            [sx, ay, sz],
            [sx, depth, sz],
            [bx - lane * Math.sign(bx - sx || 1), depth, sz],
            [bx - lane * Math.sign(bx - sx || 1), depth, bz],
            [bx, depth, bz],
            [bx, by, bz],
          ] as Vec3[],
        ];
      }),
  );
  const router: RouterLine[] = lines
    .filter((l) => !trench.has(l.link))
    .map((l) => ({
      id: l.link,
      start: l.start,
      end: l.end,
      od: l.od,
      joint: 'socket',
      price: pricePerMetre('pvc-pressure', l.od),
      // Out of its machine's footprint before it turns.
      startStraight: 0.7,
      endStraight: 0.7,
    }));
  const routed = routeVoxelLines(
    {
      halfX: layout.box.w / 2,
      halfZ: layout.box.d / 2,
      height: 4.5,
      obstacles,
      regions,
    },
    router,
    [],
  );
  problems.push(...routed.problems);
  for (const [link, points] of trench) routed.routes.set(link, points);
  const runs: PipeRun[] = lines.flatMap((l) => {
    const points = routed.routes.get(l.link);
    if (!points) {
      problems.push(`${l.link}: not routed`);
      return [];
    }
    return [
      {
        name: l.link,
        kind: 'pvc-pressure' as const,
        od: l.od,
        points: straightened([...l.riser, ...points]),
        joins: [],
        service: c,
        label: LABEL[c],
        through: [],
        valves: [],
      },
    ];
  });
  return { runs, problems };
}

/** A run's points with any that lie in a straight line between their neighbours dropped. */
function straightened(points: Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (
      last &&
      Math.hypot(p[0] - last[0], p[1] - last[1], p[2] - last[2]) < 1e-6
    )
      continue;
    if (out.length >= 2) {
      const a = out[out.length - 2];
      const b = last;
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [p[0] - b[0], p[1] - b[1], p[2] - b[2]];
      const cross = Math.hypot(
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      );
      if (cross < 1e-9 && u[0] * v[0] + u[1] * v[1] + u[2] * v[2] > 0) {
        out[out.length - 1] = p;
        continue;
      }
    }
    out.push(p);
  }
  return out;
}
