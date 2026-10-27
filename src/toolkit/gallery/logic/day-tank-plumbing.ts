import { placedPort } from './machine-ports';
import type { Vec3 } from '../../components/core/logic/pipe-route';
import { SCHEMATICS } from '../../../game/plant/schematics';
import { layoutRoom } from './room-equipment';
import { roomStructure } from './room-structure';
import type { PipeRun } from './room-pipes';

/**
 * A plant room's day tanks plumbed (plan 085; the owner, 2026-10-27): each
 * chemical's branch from the wet hall's selector straight down out of the
 * services ceiling into its dose bottle's fill socket (rigid PVC-U); and
 * each bottle's dosing tube (PE, in a PVC-U carrier) up beside it, across at high level,
 * clear of every walkway, and down into what doses with it. Pure: metres,
 * the room's frame.
 */

const LABEL = {
  hypochlorite: 'SODIUM HYPOCHLORITE 14%',
  acid: 'HYDROCHLORIC ACID 10%',
} as const;
const POOL: Record<string, string> = {
  plant_pool_01: 'pool_01',
  plant_pool_03: 'pool_03',
  plant_pool_04: 'pool_04',
};
/** What each dosing target node is placed as, by room, and its port if not the link's. */
const TARGET: Record<string, Record<string, [string, string?]>> = {
  plant_pool_01: {
    'hypo-pumps': ['hypo-pumps', 'supply'],
    'acid-pump': ['acid-pump', 'supply'],
  },
  plant_pool_03: { cabinet: ['jacuzzi-pack'] },
  plant_pool_04: { cabinet: ['spa-pack'] },
};
/** A dosing tube's height across the room, above every head. */
const HIGH = 2.5;

export function dayTankPlumbing(room: string): {
  runs: PipeRun[];
  problems: string[];
} {
  const layout = layoutRoom(room);
  const schematic = SCHEMATICS[room];
  const pool = POOL[room];
  const structure = roomStructure(room);
  if (!layout || !schematic || !pool || !structure)
    return { runs: [], problems: ['no room'] };
  const problems: string[] = [];
  const find = (key: string) =>
    layout.placed.find(
      (p) => p.item.key === key || p.item.key.startsWith(`${key}:`),
    );
  const runs: PipeRun[] = [];
  for (const l of schematic.links.filter((x) => x.medium === 'chemical')) {
    const c = /^Acid/.test(l.id) ? 'acid' : 'hypochlorite';
    const bottle = find(`chem-day:${c}:${pool}`);
    if (!bottle) {
      problems.push(`${l.id}: no day tank`);
      continue;
    }
    if (/branch to its day tank$/.test(l.id)) {
      const fill = placedPort(bottle, 'fill');
      const [x, y, z] = fill.at;
      runs.push({
        name: l.id,
        kind: 'pvc-pressure',
        od: 0.025,
        points: [
          [x, structure.ceilingZone, z],
          [x, y, z],
        ],
        joins: [bottle.item.label],
        service: c,
        label: LABEL[c],
        through: [],
        valves: [],
      });
      continue;
    }
    // Its dosing tube, to the target's inlet for this chemical.
    const [targetKey, targetPort] = TARGET[room]?.[l.targetId] ?? [];
    const target = targetKey ? find(targetKey) : undefined;
    if (!target) {
      problems.push(`${l.id}: no target ${l.targetId}`);
      continue;
    }
    const out = placedPort(bottle, 'out');
    const a = out.at;
    // Out sideways until clear of its bottle's footprint, then up.
    const f = bottle.footprint;
    let step = 0.08;
    while (
      step < 1.5 &&
      a[0] + out.outward[0] * step > f.minX - 0.05 &&
      a[0] + out.outward[0] * step < f.maxX + 0.05 &&
      a[2] + out.outward[2] * step > f.minZ - 0.05 &&
      a[2] + out.outward[2] * step < f.maxZ + 0.05
    )
      step += 0.05;
    const a1: Vec3 = [
      a[0] + out.outward[0] * step,
      a[1],
      a[2] + out.outward[2] * step,
    ];
    const b = placedPort(target, targetPort ?? l.targetPort).at;
    // Each chemical at its own height, so the two never cross.
    const high = Math.max(HIGH, b[1] + 0.3) + (c === 'acid' ? 0.15 : 0);
    runs.push({
      name: l.id,
      // The PE dosing tube inside a PVC-U carrier, its containment
      // (secondary containment for a dosing line, as good practice asks).
      kind: 'pvc-pressure',
      od: 0.025,
      points: (
        [
          [a[0], a[1], a[2]],
          a1,
          [a1[0], high, a1[2]],
          [b[0], high, a1[2]],
          [b[0], high, b[2]],
          [b[0], b[1], b[2]],
        ] as Vec3[]
      ).filter(
        (p, i, all) =>
          i === 0 ||
          Math.hypot(
            p[0] - all[i - 1][0],
            p[1] - all[i - 1][1],
            p[2] - all[i - 1][2],
          ) > 1e-6,
      ),
      joins: [bottle.item.label, target.item.label],
      service: c,
      label: LABEL[c],
      through: [],
      valves: [],
    });
  }
  return { runs, problems };
}
