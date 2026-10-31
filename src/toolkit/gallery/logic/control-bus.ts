import { fedByItsPanel } from './room-services';
import { machinePorts, placedPort } from './machine-ports';
import { FEEDER_ISOLATOR, layoutRoom } from './room-equipment';
import type { Placed, Side } from './room-equipment';
import { deckOf, roomStructure } from './room-structure';
import { PLANT_ROOM } from './plant-rooms';
import { WET_HALL_LAYOUT, wetHallPartition } from './shell-rooms';
import type { Containment } from './cable-containment';
import type { Point3, ServiceRoute } from './room-services';

/**
 * A room's control bus (the owner, 2026-10-23): one run of compartmented
 * steel trunking, carrying the control and instrument devices' signal and
 * small-power cables in separate compartments, in a ring right round the
 * room just above door level (the owner's rule: typically above the
 * doors), higher only where a panel stands taller. Every control device
 * sends a short conduit to the nearest point of it, instead of a line of
 * its own across the room. It enters the room once, rising into the services ceiling at the
 * supply wall: beyond that a control network we do not route is imagined
 * (`doc/prompts/done/008-pipe-supports.md`). Pure: metres, the room's middle at
 * x = z = 0, its floor at y = 0.
 */

/** The devices on the control bus: panels, mimics, instruments, the desk and its printer. */
export const isControlDevice = (key: string) =>
  /^(operator-desk|alarm-printer|mimic-|annunciator|chart-recorders|readout-board|bms-outstation|fire-repeater|cctv|gas-safety|combustion-panel|level-instruments|booster-set)/.test(
    key,
  );

/** The trunking: 100 × 50 mm, its back on the wall. */
export const BUS = { width: 0.1, depth: 0.05 } as const;
/**
 * Door level: the tallest doors, the equipment doors, 2.4 m high
 * (`plant-rooms.ts`), with their frame's head. The bus runs this far over
 * it, and over the tallest thing on the walls.
 */
export const DOOR_HEAD = PLANT_ROOM.equipment.h + 0.1;
const OVER = 0.15;
/**
 * Its clearance over a door's head: past the lintel over the opening (a
 * 215 mm concrete lintel) and a little more, so it is never fixed into
 * it (the owner, 2026-10-26).
 */
export const OVER_LINTEL = 0.35;
const LOWEST = DOOR_HEAD + OVER_LINTEL;
/** Its middle stands this far off the wall's face. */
const OFF = BUS.depth / 2 + 0.005;
/** A device's conduit to it. */
const STUB_OD = 0.0213;

export interface ControlBus {
  /** The bus's lengths and its riser into the ceiling, as trunking (`cable-containment.ts` draws it). */
  trunking: Containment[];
  /** Each device's conduit to the bus. */
  stubs: ServiceRoute[];
  /** The bus's height over the floor. */
  y: number;
  /** The devices on it, by key. */
  devices: string[];
  /** What could not be fitted. */
  problems: string[];
}

const SIDES: readonly Side[] = ['north', 'east', 'south', 'west'];

export function controlBus(room: string): ControlBus | null {
  const layout = layoutRoom(room);
  const structure = roomStructure(room);
  if (!layout || !structure) return null;
  const { box, placed } = layout;
  const hw = box.w / 2;
  const hd = box.d / 2;
  const devices = placed.filter(
    (p) => isControlDevice(p.item.key) && !fedByItsPanel(room, p.item.key),
  );
  if (!devices.length) return null;
  const problems: string[] = [];

  // Its height: over everything on the walls and the door heads.
  const wallTop = Math.max(
    0,
    ...placed
      .filter((p) => p.item.mount === 'wall')
      .map((p) => p.y + p.item.h / 2),
  );
  // And over its doors' heads, at the level they open from: a room whose
  // floor is below its doors (the wet hall's, half a storey down) has
  // them that much higher (the owner, 2026-10-26: the bus went across
  // the wet hall's doors).
  const y = Math.max(LOWEST + (deckOf(room) ?? 0), wallTop + OVER);
  if (y > structure.ceilingZone - 0.2)
    problems.push(
      `no room for the bus between the tallest panel and the services ceiling`,
    );

  /** A point on a wall's face, `s` along it (z on the east and west, x on the others). */
  const onWall = (side: Side, s: number, h: number, off = OFF): Point3 =>
    side === 'west'
      ? [-hw + off, h, s]
      : side === 'east'
        ? [hw - off, h, s]
        : side === 'north'
          ? [s, h, -hd + off]
          : [s, h, hd - off];
  const along = (side: Side, x: number, z: number) =>
    side === 'west' || side === 'east' ? z : x;
  const half = (side: Side) => (side === 'west' || side === 'east' ? hd : hw);

  const trunking: Containment[] = [];
  /** The bus's lengths along each wall: [from, to] along the wall. */
  const spans = new Map<Side, [number, number]>();
  {
    // Round the room, just off every wall.
    const corner = (sx: number, sz: number): Point3 => [
      sx * (hw - OFF),
      y,
      sz * (hd - OFF),
    ];
    const corners = [
      corner(-1, -1),
      corner(1, -1),
      corner(1, 1),
      corner(-1, 1),
    ];
    SIDES.forEach((side, i) => {
      trunking.push({
        name: `Control bus, ${side} wall`,
        kind: 'trunking',
        width: BUS.width,
        depth: BUS.depth,
        from: corners[i],
        to: corners[(i + 1) % 4],
      });
      spans.set(side, [-half(side) + OFF, half(side) - OFF]);
    });
  }

  // Its one way in: up into the services ceiling on the supply wall,
  // clear of the room supply's own conduit.
  const entryWall = structure.supplyWall;
  const [lo, hi] = spans.get(entryWall)!;
  const feeder =
    entryWall === 'west' ? hd - FEEDER_ISOLATOR.fromSouth : (lo + hi) / 2;
  const entryS = Math.min(hi - 0.1, Math.max(lo + 0.1, feeder - 0.4));
  trunking.push({
    name: 'Control bus riser, to the control network',
    kind: 'trunking',
    width: BUS.width,
    depth: BUS.depth,
    from: onWall(entryWall, entryS, y),
    to: onWall(entryWall, entryS, structure.ceilingZone),
    facing: entryWall === 'west' || entryWall === 'east' ? 'x' : 'z',
  });

  // A branch along a partition's face for the devices on it (the wet
  // hall's annunciator on the make-up bay's partition, the owner,
  // 2026-10-31): down the wall the partition meets from the ring to just
  // under the partition's top, then along its face to the westernmost.
  const partition = partitionFace(room);
  const onPartition = (p: Placed) =>
    !!partition &&
    p.side === 'island' &&
    Math.abs(p.yaw) < 1e-9 &&
    Math.abs(p.z - p.item.d / 2 - partition.z) < 0.01 &&
    p.x > partition.minX &&
    p.x < partition.maxX;
  const branchY = partition ? partition.top - BUS.width / 2 - 0.05 : 0;
  if (partition) {
    const west = Math.min(
      ...devices.filter(onPartition).map((p) => p.x - p.item.w / 2),
    );
    if (Number.isFinite(west)) {
      const z = partition.z + OFF;
      const east = hw - OFF;
      trunking.push(
        {
          name: 'Control bus, down to the partition',
          kind: 'trunking',
          width: BUS.width,
          depth: BUS.depth,
          from: [east, y, z],
          to: [east, branchY, z],
          facing: 'x',
        },
        {
          name: 'Control bus, along the partition',
          kind: 'trunking',
          width: BUS.width,
          depth: BUS.depth,
          from: [east, branchY, z],
          to: [west, branchY, z],
        },
      );
    }
  }

  // Each device to the nearest point of the bus.
  const stubs: ServiceRoute[] = [];
  const topOf = (p: Placed) =>
    p.item.mount === 'floor' ? p.item.h : p.y + p.item.h / 2;
  for (const p of devices) {
    const name = `${p.item.label} control`;
    const top = topOf(p);
    // A device with a control port of its own (the booster set's gland,
    // the owner, 2026-10-26) is wired there, straight up from it.
    const own = machinePorts(p.item).find((q) => q.service === 'control');
    const port = own ? placedPort(p, own.name).at : null;
    if (!port && partition && onPartition(p)) {
      // Straight up the partition's face into its branch.
      const z = partition.z + OFF;
      stubs.push({
        name,
        utility: 'power',
        kind: 'steel-screwed',
        od: STUB_OD,
        points: [
          [p.x, top, z],
          [p.x, branchY - BUS.width / 2, z],
        ],
        to: p.item.key,
      });
      continue;
    }
    if (!port && p.side !== 'island' && spans.has(p.side as Side)) {
      // Straight up its wall from its top into the bus.
      const side = p.side as Side;
      const s = along(side, p.x, p.z);
      stubs.push({
        name,
        utility: 'power',
        kind: 'steel-screwed',
        od: STUB_OD,
        points: [
          onWall(side, s, top, OFF),
          onWall(side, s, y - BUS.width / 2, OFF),
        ],
        to: p.item.key,
      });
      continue;
    }
    // Out in the room (or by a wall without the bus): up to the bus's
    // height, then square across to the nearest point of it.
    let best: { at: Point3; d: number } | null = null;
    // From its control port, where it has one, else its middle.
    const ox = port ? port[0] : p.x;
    const oz = port ? port[2] : p.z;
    for (const [side, [lo2, hi2]] of spans) {
      const s = Math.min(hi2, Math.max(lo2, along(side, ox, oz)));
      const at = onWall(side, s, y, OFF + BUS.depth / 2);
      const d = Math.abs(at[0] - ox) + Math.abs(at[2] - oz);
      if (!best || d < best.d) best = { at, d };
    }
    if (!best) {
      problems.push(`${p.item.label}: no bus to reach`);
      continue;
    }
    const [fx, fy, fz]: Point3 = port
      ? [port[0], port[1], port[2]]
      : [p.x, top, p.z];
    const up: Point3 = [fx, y, fz];
    const corner: Point3 =
      Math.abs(best.at[0] - fx) < Math.abs(best.at[2] - fz)
        ? [best.at[0], y, fz]
        : [fx, y, best.at[2]];
    stubs.push({
      name,
      utility: 'power',
      kind: 'steel-screwed',
      od: STUB_OD,
      points: [[fx, fy, fz], up, corner, best.at],
      to: p.item.key,
    });
  }
  return {
    trunking,
    stubs: stubs.map((r) => ({ ...r, points: dedupe(r.points) })),
    y,
    devices: devices.map((p) => p.item.key),
    problems,
  };
}

/**
 * A partition's face, facing south, that devices may hang on, and its
 * top: the wet hall's make-up bay's, its length east of the bay's doors
 * to the hall's east wall. Room frame.
 */
function partitionFace(
  room: string,
): { z: number; minX: number; maxX: number; top: number } | null {
  if (room !== 'wet_hall') return null;
  const run = wetHallPartition().at(-1)!;
  return {
    z: run.maxZ,
    minX: run.minX,
    maxX: run.maxX,
    top: WET_HALL_LAYOUT.partition.height,
  };
}

/** The points with repeats and points in line dropped. */
function dedupe(points: readonly Point3[]): Point3[] {
  const kept: Point3[] = [];
  for (const p of points) {
    const q = kept.at(-1);
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 1e-6)
      kept.push(p);
  }
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
