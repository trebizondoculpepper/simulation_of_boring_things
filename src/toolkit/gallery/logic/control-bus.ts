import { FEEDER_ISOLATOR, layoutRoom } from './room-equipment';
import type { Placed, Side } from './room-equipment';
import { roomStructure } from './room-structure';
import { PLANT_ROOM } from './plant-rooms';
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
 * (`doc/prompts/008-pipe-supports.md`). Pure: metres, the room's middle at
 * x = z = 0, its floor at y = 0.
 */

/** The devices on the control bus: panels, mimics, instruments, the desk and its printer. */
export const isControlDevice = (key: string) =>
  /^(operator-desk|alarm-printer|mimic-|annunciator|chart-recorders|readout-board|bms-outstation|fire-repeater|cctv|gas-safety|combustion-panel|level-instruments)/.test(
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
const LOWEST = DOOR_HEAD + OVER;
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
  const devices = placed.filter((p) => isControlDevice(p.item.key));
  if (!devices.length) return null;
  const problems: string[] = [];

  // Its height: over everything on the walls and the door heads.
  const wallTop = Math.max(
    0,
    ...placed
      .filter((p) => p.item.mount === 'wall')
      .map((p) => p.y + p.item.h / 2),
  );
  const y = Math.max(LOWEST, wallTop + OVER);
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

  // Each device to the nearest point of the bus.
  const stubs: ServiceRoute[] = [];
  const topOf = (p: Placed) =>
    p.item.mount === 'floor' ? p.item.h : p.y + p.item.h / 2;
  for (const p of devices) {
    const name = `${p.item.label} control`;
    const top = topOf(p);
    if (p.side !== 'island' && spans.has(p.side as Side)) {
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
    for (const [side, [lo2, hi2]] of spans) {
      const s = Math.min(hi2, Math.max(lo2, along(side, p.x, p.z)));
      const at = onWall(side, s, y, OFF + BUS.depth / 2);
      const d = Math.abs(at[0] - p.x) + Math.abs(at[2] - p.z);
      if (!best || d < best.d) best = { at, d };
    }
    if (!best) {
      problems.push(`${p.item.label}: no bus to reach`);
      continue;
    }
    const up: Point3 = [p.x, y, p.z];
    const corner: Point3 =
      Math.abs(best.at[0] - p.x) < Math.abs(best.at[2] - p.z)
        ? [best.at[0], y, p.z]
        : [p.x, y, best.at[2]];
    stubs.push({
      name,
      utility: 'power',
      kind: 'steel-screwed',
      od: STUB_OD,
      points: [[p.x, top, p.z], up, corner, best.at],
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
