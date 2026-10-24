import { CORRIDOR_DOORS, MAIN_CORRIDOR } from './main-corridor';
import { layoutRoom } from './room-equipment';
import type { Placed } from './room-equipment';
import { MAIN_SWITCH } from './switch-room';

/**
 * The electrical supply's containment, from the switch room to every
 * room (BS 7671; BS EN 61537 cable ladder): heavy-duty galvanised cable
 * ladder at high level, and steel trunking rising to it from each piece
 * of switchgear.
 *
 * - In the switch room (the incoming supply rising out of the floor into
 *   the main incoming switch in the switch's own trunking), trunking rises from the
 *   switch, the main switchboard, the motor control centre and the
 *   emergency lighting battery, each the width its cables need, to a
 *   ladder round the room, which leaves over the door for the corridor.
 * - In the main corridor, the ladder runs right round the ring, close
 *   under its outside walls, and over every room's door it turns into
 *   the wall: that room's sub-main. The wet hall's two doors are in the
 *   ring's inside walls, so their branches cross the corridor.
 *
 * Pure: metres, each in its own room's frame, floors at y = 0.
 */

/** A straight length: cable ladder (lying flat) or trunking (rising, or flat). */
export interface Containment {
  name: string;
  kind: 'ladder' | 'trunking';
  /** Its width across, and its depth (a ladder's side rails' height). */
  width: number;
  depth: number;
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  /** Which way a rising length's broad face looks (x or z), in plan. */
  facing?: 'x' | 'z';
}

/** Where a length turns into a wall: a fire-stopped collar, and the room beyond. */
export interface WallEntry {
  name: string;
  at: readonly [number, number, number];
  /** The wall's outward normal, in plan (from the room into the wall). */
  normal: readonly [number, number];
  width: number;
  to: string;
}

/** The ladder's level, over every door and under the services ceilings. */
export const LADDER_Y = 4.4;
/** The main ladder's width; its rails' height. */
export const LADDER = { width: 0.6, depth: 0.1 } as const;
/** How far off its wall a ladder's middle runs. */
const OFF_WALL = 0.4;

/** Each piece of switchgear's trunking: its width, by the current it carries. */
const RISERS: Record<string, { width: number; depth: number }> = {
  'main-switch': { width: 0.6, depth: 0.2 },
  'lv-switchboard': { width: 0.6, depth: 0.2 },
  'central-battery': { width: 0.2, depth: 0.1 },
};

/** The plan direction a placed machine's back faces (toward its wall). */
function backOf(p: Placed): readonly [number, number] {
  // Turned by yaw from facing +z: its back is -z turned.
  return [-Math.sin(p.yaw), -Math.cos(p.yaw)];
}

export function switchRoomContainment(): {
  runs: Containment[];
  entries: WallEntry[];
} {
  const layout = layoutRoom('switch_room')!;
  const { box, placed } = layout;
  const hw = box.w / 2;
  const hd = box.d / 2;
  const y = LADDER_Y;
  const runs: Containment[] = [];
  const ladder = (
    name: string,
    from: Containment['from'],
    to: Containment['to'],
  ) => runs.push({ name, kind: 'ladder', ...LADDER, from, to });
  // The ladder round the room: along the west wall, the north, and the
  // east; and from the west wall's
  // south end along the south wall to over the door.
  const wx = -hw + OFF_WALL;
  const ex = hw - OFF_WALL;
  const nz = -hd + OFF_WALL;
  const sz = hd - OFF_WALL;
  ladder('Cable ladder, west', [wx, y, sz], [wx, y, nz]);
  ladder('Cable ladder, north', [wx, y, nz], [ex, y, nz]);
  ladder('Cable ladder, east', [ex, y, nz], [ex, y, sz]);
  ladder('Cable ladder, south', [wx, y, sz], [0, y, sz]);
  ladder('Cable ladder, out over the door', [0, y, sz], [0, y, hd]);
  const entries: WallEntry[] = [
    {
      name: 'Sub-mains out to the main corridor',
      at: [0, y, hd],
      normal: [0, 1],
      width: LADDER.width,
      to: 'main_corridor',
    },
  ];
  // Each piece of switchgear's trunking, up its wall from its top.
  for (const p of placed) {
    const size = RISERS[p.item.key];
    if (!size) continue;
    const [bx, bz] = backOf(p);
    // Against the wall, behind the machine's middle; a wall panel's
    // place is its back, on the wall's face already.
    const back =
      p.item.mount === 'wall' ? -size.depth / 2 : p.item.d / 2 - size.depth / 2;
    const x = p.x + bx * back;
    const z = p.z + bz * back;
    // The main switch's from the top of its box, on its posts; the rest
    // from their tops. (Its supply rises into its foot in its own trunking.)
    const top =
      p.item.key === 'main-switch'
        ? MAIN_SWITCH.top
        : p.item.mount === 'wall'
          ? p.y + p.item.h / 2
          : p.item.h;
    const facing = Math.abs(bx) > Math.abs(bz) ? 'x' : 'z';
    runs.push({
      name: `${p.item.label} trunking`,
      kind: 'trunking',
      ...size,
      from: [x, top, z],
      to: [x, y, z],
      facing,
    });
  }
  // Trunking from the main switch to the main switchboard: off its
  // riser, along its wall to the north wall, along that, and down into
  // the board's top.
  const find = (key: string) => placed.find((p) => p.item.key === key);
  const sw = find('main-switch');
  const board = find('lv-switchboard');
  if (sw && board) {
    const y = 2.6;
    const north = -hd + 0.1;
    const [sx] = backOf(sw);
    const [kx] = backOf(board);
    const swX = sw.x + sx * (sw.item.d / 2 - 0.15);
    const boardX = board.x + kx * (board.item.d / 2 - 0.12);
    runs.push(
      {
        name: 'Trunking, main switch along its wall',
        kind: 'trunking',
        width: 0.3,
        depth: 0.15,
        from: [swX, y, sw.z],
        to: [swX, y, north],
      },
      {
        name: 'Trunking, main switch to the main switchboard',
        kind: 'trunking',
        width: 0.3,
        depth: 0.15,
        from: [swX, y, north],
        to: [boardX, y, north],
      },
      {
        name: 'Trunking, down into the main switchboard',
        kind: 'trunking',
        width: 0.3,
        depth: 0.15,
        from: [boardX, board.item.h, north],
        to: [boardX, y, north],
        facing: 'z',
      },
    );
  }
  return { runs, entries };
}

/**
 * The main corridor's ladder (`main-corridor.ts`'s frame: its north-west
 * outside corner at the origin): round the ring under its outside walls,
 * and a branch into every room's door.
 */
export function corridorContainment(): {
  runs: Containment[];
  entries: WallEntry[];
} {
  const S = MAIN_CORRIDOR.side;
  const w = MAIN_CORRIDOR.width;
  const y = LADDER_Y;
  const a = OFF_WALL;
  const b = S - OFF_WALL;
  const runs: Containment[] = [];
  const ladder = (
    name: string,
    from: Containment['from'],
    to: Containment['to'],
  ) => runs.push({ name, kind: 'ladder', ...LADDER, from, to });
  ladder('Ring ladder, north', [a, y, a], [b, y, a]);
  ladder('Ring ladder, east', [b, y, a], [b, y, b]);
  ladder('Ring ladder, south', [b, y, b], [a, y, b]);
  ladder('Ring ladder, west', [a, y, b], [a, y, a]);
  const entries: WallEntry[] = [];
  for (const d of CORRIDOR_DOORS) {
    const name = `Sub-main to ${d.to}`;
    switch (d.wall) {
      case 'north':
        ladder(name, [d.at, y, a], [d.at, y, 0]);
        entries.push({
          name,
          at: [d.at, y, 0],
          normal: [0, -1],
          width: LADDER.width,
          to: d.to,
        });
        break;
      case 'south':
        ladder(name, [d.at, y, b], [d.at, y, S]);
        entries.push({
          name,
          at: [d.at, y, S],
          normal: [0, 1],
          width: LADDER.width,
          to: d.to,
        });
        break;
      case 'west':
        ladder(name, [a, y, d.at], [0, y, d.at]);
        entries.push({
          name,
          at: [0, y, d.at],
          normal: [-1, 0],
          width: LADDER.width,
          to: d.to,
        });
        break;
      case 'east':
        ladder(name, [b, y, d.at], [S, y, d.at]);
        entries.push({
          name,
          at: [S, y, d.at],
          normal: [1, 0],
          width: LADDER.width,
          to: d.to,
        });
        break;
      // The wet hall's, across the corridor to its inside walls.
      case 'inner-west':
        ladder(name, [a, y, d.at], [w, y, d.at]);
        entries.push({
          name,
          at: [w, y, d.at],
          normal: [1, 0],
          width: LADDER.width,
          to: d.to,
        });
        break;
      case 'inner-east':
        ladder(name, [b, y, d.at], [S - w, y, d.at]);
        entries.push({
          name,
          at: [S - w, y, d.at],
          normal: [-1, 0],
          width: LADDER.width,
          to: d.to,
        });
        break;
      case 'inner-north':
        ladder(name, [d.at, y, a], [d.at, y, w]);
        entries.push({
          name,
          at: [d.at, y, w],
          normal: [0, 1],
          width: LADDER.width,
          to: d.to,
        });
        break;
      case 'inner-south':
        ladder(name, [d.at, y, b], [d.at, y, S - w]);
        entries.push({
          name,
          at: [d.at, y, S - w],
          normal: [0, -1],
          width: LADDER.width,
          to: d.to,
        });
        break;
    }
  }
  return { runs, entries };
}
