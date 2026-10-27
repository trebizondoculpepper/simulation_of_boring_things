import { SHELL_WALL, WET_HALL, WET_HALL_LAYOUT } from './shell-rooms';

/**
 * A fire point (prompt 089, item 5; BS 5306-8): portable extinguishers on
 * the wall, the fire action notice above them, a FIRE POINT sign over
 * that, and the floor before it kept clear inside a red outline. One
 * reusable layout item (`fire-point:<kinds>`, its kinds of extinguisher a
 * parameter), placed by a room's `layoutRoom` as any machine is, its
 * footprint the kept-clear floor, so nothing else is stood there. Pure:
 * metres.
 */

export type FirePointExtinguisher = 'water' | 'foam' | 'co2' | 'powder';

/** Between one extinguisher and the next along the wall, middle to middle. */
export const EXTINGUISHER_PITCH = 0.44;
/** How far the kept-clear floor reaches out from the wall. */
export const FIRE_POINT_DEPTH = 0.8;
/** Its height, floor to the top of its sign. */
export const FIRE_POINT_HEIGHT = 2.1;

/**
 * The item key of a fire point with these extinguishers, in order, and
 * its own id where a room has more than one.
 */
export const firePointKey = (
  kinds: readonly FirePointExtinguisher[],
  id?: string,
) => `fire-point:${kinds.join('+')}${id ? `:${id}` : ''}`;

const KINDS: readonly FirePointExtinguisher[] = [
  'water',
  'foam',
  'co2',
  'powder',
];

/** The extinguishers a fire point's key names (its argument after the colon). */
export function firePointKinds(arg: string): FirePointExtinguisher[] {
  return arg
    .split('+')
    .filter((k): k is FirePointExtinguisher =>
      (KINDS as readonly string[]).includes(k),
    );
}

/** Its width along the wall: its extinguishers, and never less than a metre kept clear. */
export const firePointWidth = (count: number) =>
  Math.max(1.0, count * EXTINGUISHER_PITCH + 0.12);

/** Where each extinguisher hangs along the wall, from the fire point's middle. */
export const extinguisherOffsets = (count: number) =>
  Array.from(
    { length: count },
    (_, i) => (i - (count - 1) / 2) * EXTINGUISHER_PITCH,
  );

/**
 * Its red keep-clear outline on the floor, in its own frame (the wall at
 * z = 0, the room at +z): a line along its front and one down each side
 * to the wall, 60 mm wide, as rectangles (x, z middles; w along x, d
 * along z).
 */
export function firePointOutline(count: number) {
  const w = firePointWidth(count);
  const d = FIRE_POINT_DEPTH;
  const line = 0.06;
  return [
    { x: 0, z: d - line / 2, w, d: line },
    { x: -w / 2 + line / 2, z: (d - line) / 2, w: line, d: d - line },
    { x: w / 2 - line / 2, z: (d - line) / 2, w: line, d: d - line },
  ];
}

/**
 * The wet hall's fire points (the owner, 2026-10-26): in the make-up bay
 * by its doors, by the stair's foot, and by the ramp's foot (clear of its
 * rail); each a CO2 and a foam extinguisher, its fire action notice and a
 * manual call point, faces into the room. Room frame: where each meets its
 * wall, and which way it faces (its yaw: 0 faces +z).
 */
export function wetHallFirePoints() {
  const L = WET_HALL_LAYOUT;
  const R = WET_HALL.side / 2 - SHELL_WALL;
  return [
    { id: 'wh-mcp-1', x: -1.5, z: L.bay.maxZ - 0.005, yaw: Math.PI },
    { id: 'wh-mcp-2', x: R - 0.005, z: 2.6, yaw: -Math.PI / 2 },
    { id: 'wh-mcp-3', x: -4.0, z: R - 0.005, yaw: Math.PI },
  ] as const;
}

/** The side a fire point faces, from its yaw. */
export function firePointFace(
  yaw: number,
): 'north' | 'south' | 'east' | 'west' {
  const s = Math.round(Math.sin(yaw));
  const c = Math.round(Math.cos(yaw));
  if (c === 1) return 'south';
  if (c === -1) return 'north';
  return s === 1 ? 'east' : 'west';
}

/**
 * The middle of a fire point's kept-clear floor, from where it meets its
 * wall and which way it faces: half its depth out into the room.
 */
export function firePointMiddle(at: { x: number; z: number; yaw: number }) {
  return {
    x: at.x + Math.sin(at.yaw) * (FIRE_POINT_DEPTH / 2),
    z: at.z + Math.cos(at.yaw) * (FIRE_POINT_DEPTH / 2),
  };
}
