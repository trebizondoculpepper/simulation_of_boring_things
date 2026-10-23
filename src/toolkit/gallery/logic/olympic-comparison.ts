import type { Footprint } from '../../controls/logic/walk-collision';
import type { PipeJoint } from '../../components/core/logic/pipe-route';
import { pricePerMetre } from '../../components/core/logic/pipe-costs';
import { layoutRoom } from './room-equipment';
import { roomPipes } from './room-pipes';
import type { PipeRun } from './room-pipes';
import { sizeRoom } from './room-sizer';
import { scoreRoom } from './room-scorer';
import type { Score } from './room-scorer';
import type { Region } from './room-regions';

/**
 * The Olympic plant room as it was (`retired0`, laid out by hand before
 * the pipeline) and as it is (prompt 033), scored by the same rules (the
 * owner, 2026-10-23): each room's pipes as the game draws them and the
 * valves on them; its own machines and size; and the same reserved
 * spaces, worked out from each room's own machines and plan: inside its
 * doors, the headroom over its decks and stair, and the open floor (no
 * run below headroom more than a metre from a machine or 0.9 m from a
 * wall), a rule the old room was never held to. Pure.
 */

/** The decks and stair of a room, and their headroom, for its reserved regions. */
interface Access {
  decks: readonly Footprint[];
  stair: Footprint | null;
}

const DECK = { soffit: 3.35, head: 5.6 } as const;

/** Each kind of pipe's joint, as the pipe kinds have them (`pipe-kinds.ts`). */
const JOINT: Record<PipeRun['kind'], PipeJoint> = {
  'pvc-pressure': 'socket',
  'pvc-drain': 'socket',
  'lagged-heating': 'flange',
  copper: 'solder',
  'chemical-tube': 'none',
  stainless: 'weld',
  'steel-screwed': 'thread',
  flue: 'band',
};

function regionsFor(
  box: { w: number; d: number; keepClear: readonly Footprint[] },
  machines: readonly Footprint[],
  access: Access,
  floorY: number,
): Region[] {
  const hx = box.w / 2;
  const hz = box.d / 2;
  const regions: Region[] = [];
  // Heights over the plant floor (the decks a storey up).
  const up = (y: number) => y - floorY;
  for (const [i, k] of box.keepClear.entries())
    regions.push({
      name: `kept clear ${i + 1}`,
      kind: 'door',
      min: [k.minX, 0, k.minZ],
      max: [k.maxX, 2.6, k.maxZ],
      forbids: { machines: true, runs: true },
    });
  for (const [i, d] of access.decks.entries())
    regions.push({
      name: `deck ${i + 1}`,
      kind: 'gantry',
      min: [d.minX, up(DECK.soffit), d.minZ],
      max: [d.maxX, up(DECK.head), d.maxZ],
      forbids: { machines: false, runs: true },
    });
  if (access.stair)
    regions.push({
      name: 'stair',
      kind: 'stair',
      min: [access.stair.minX, 0, access.stair.minZ],
      max: [access.stair.maxX, up(DECK.head), access.stair.maxZ],
      forbids: { machines: true, runs: true },
    });
  const near = (x0: number, z0: number, x1: number, z1: number) =>
    machines.some(
      (f) =>
        x1 > f.minX - 1 &&
        x0 < f.maxX + 1 &&
        z1 > f.minZ - 1 &&
        z0 < f.maxZ + 1,
    );
  for (let x = -hx; x < hx - 1e-9; x += 1)
    for (let z = -hz; z < hz - 1e-9; z += 1) {
      const wall =
        x < -hx + 0.9 || x + 1 > hx - 0.9 || z < -hz + 0.9 || z + 1 > hz - 0.9;
      if (wall || near(x, z, x + 1, z + 1)) continue;
      regions.push({
        name: `open floor ${x},${z}`,
        kind: 'walkway',
        min: [x, 0, z],
        max: [x + 1, 2.1, z + 1],
        forbids: { machines: false, runs: true },
      });
    }
  return regions;
}

function scoreAs(
  name: string,
  room: string,
  access: Access,
  floorY: number,
): Score {
  const layout = layoutRoom(room)!;
  const floor = layout.placed.filter((p) => p.item.mount === 'floor');
  const machines = floor.map((p) => p.footprint);
  const size = sizeRoom(
    floor.map((p) => ({ w: p.item.w, d: p.item.d, h: p.item.h })),
  );
  const runs = roomPipes(room);
  const valves = runs.flatMap((r) => r.valves);
  return scoreRoom({
    name,
    w: layout.box.w,
    d: layout.box.d,
    h: 6,
    minimumArea: size.w * size.d,
    machines,
    unreachableAccess: 0,
    runs: runs.map((r) => ({
      name: r.name,
      points: r.points,
      od: r.od,
      joint: JOINT[r.kind],
    })),
    runPrices: runs.map((r) => pricePerMetre(r.kind, r.od)),
    ends: runs.map((r) => [r.points[0], r.points.at(-1)!] as const),
    endPrices: runs.map((r) => pricePerMetre(r.kind, r.od)),
    regions: regionsFor(layout.box, machines, access, floorY),
    fittings: {
      wanted: valves.length,
      installed: valves.length,
      // A lever within reach, a chain wheel's chain, or a solenoid worked from its panel.
      reachable: valves.filter((v) => v.operator !== 'lever' || v.at[1] <= 2.0)
        .length,
    },
  });
}

/** The two rooms, scored alike. */
export function compareOlympic(): { before: Score; after: Score } {
  const before = layoutRoom('retired0')!.box;
  const solid = before.solid;
  return {
    // The large square room: its full-width landing and its stair down the east wall.
    before: scoreAs(
      'Olympic plant room, 2026-10-23 morning (retired0)',
      'retired0',
      { decks: [solid[0]], stair: solid[1] ?? null },
      -3.5,
    ),
    after: (() => {
      const box = layoutRoom('plant_pool_02')!.box;
      return scoreAs(
        'Olympic plant room, redone (prompt 033)',
        'plant_pool_02',
        { decks: [], stair: box.solid[0] ?? null },
        -3.5,
      );
    })(),
  };
}
