import type { Footprint } from '../../controls/logic/walk-collision';
import {
  MUSEUM_EXHIBITS,
  MUSEUM_WALL,
  beyondAt,
  hallArches,
  hallAxes,
  hallOrigin,
  hallSize,
  hallWalls,
  wallWindows,
} from './museum-plan';
import type { HallWall, MuseumArch, MuseumHallId } from './museum-plan';

/**
 * The museum's safety and services layer (mission 107; the owner,
 * 2026-10-28: "look up what kind of safety gear you'd expect a museum to
 * have, and implement that as a layer of realism"): what a UK public
 * building of its kind carries under current practice, placed in each
 * room. Set decoration (the museum is not plant), built of the game's own
 * fittings. Where everything goes, pure and tested; the views draw it
 * (`views/museum-safety.ts`).
 *
 * - **Escape** (Approved Document B, BS 5499-4 / ISO 7010): every room's
 *   way out leads back to Hall 0, by the shorter way round the ring
 *   (`exitWay`), and from Hall 0 through its fire exit door to the stair
 *   to the ground floor (the museum is on the fourth floor). Over the
 *   doorway each room leaves by, a maintained exit sign; along each hall,
 *   signs hung from the lighting track, facing those walking to that
 *   doorway, arrow straight on; emergency bulkheads (BS 5266-1) by every
 *   doorway.
 * - **Fire detection and warning** (BS 5839-1): a manual call point at
 *   1.4 m beside every room's way out (at every storey and final exit), a
 *   sounder-beacon in each room at 2.4 m; smoke detectors and sprinkler
 *   heads come with the services ceiling (Hall 0 has its own).
 * - **Fire points** (BS 5306-8), in every other hall (1, 3 and 5, the
 *   owner's "every other hall"), on a free-standing board (no drilling of
 *   heritage brick): water and CO₂, their ID signs, the fire action
 *   notice.
 * - **Power** (BS 1363, Approved Document M: 400–1,000 mm): white twin
 *   switched sockets at 450 mm on the walls, and floor boxes where the
 *   exhibits' plinths will stand.
 * - **Medical, security, access, notices**: in Hall 0 a defibrillator
 *   cabinet, the first-aid kit and sign, the CCTV notice, the hearing loop
 *   sign, the lift, toilets and ground floor sign, maximum occupancy;
 *   in every room a CCTV dome and a PIR; "please do not touch" at each
 *   hall's way in; a staff-only door in Museum 3.
 *
 * Hall 0's east wall is kept clear for the lift that will come (the
 * owner, 2026-10-28; `LIFT_RESERVED`). Metres, in the museum's
 * coordinates; a fitting on a wall faces into its room.
 */

export type SafetyKind =
  | 'socket'
  | 'floor-box'
  | 'call-point'
  | 'sounder'
  | 'bulkhead'
  | 'exit-box'
  | 'exit-hanging'
  | 'fire-point'
  | 'cctv'
  | 'pir'
  | 'do-not-touch'
  | 'aed'
  | 'first-aid'
  | 'cctv-notice'
  | 'hearing-loop'
  | 'wayfinding'
  | 'occupancy'
  | 'fire-exit-door'
  | 'final-exit-sign'
  | 'ground-floor-sign'
  | 'door-keep-shut'
  | 'staff-door'
  | 'smoke-detector'
  | 'sprinkler';

export type ExitArrow = 'up' | 'left' | 'right' | 'up-left' | 'up-right';

export interface SafetyFitting {
  kind: SafetyKind;
  room: MuseumHallId;
  /** Where its mounting face's middle is (on a wall's face, a ceiling, the floor). */
  x: number;
  y: number;
  z: number;
  /** Its turn about y: its +z out from its wall, into the room. */
  yaw: number;
  /** An escape sign's arrow. */
  arrow?: ExitArrow;
}

/** Mounting heights, to the fitting's middle, metres: as the standards and the guidance give them. */
export const HEIGHTS = {
  /** BS 1363 sockets, Approved Document M: 400 to 1,000 mm; 450 mm, as usual. */
  socket: 0.45,
  /** BS 5839-1: manual call points 1.4 m (±200 mm). */
  callPoint: 1.4,
  /** Sounder-beacons above head height, at least 2.1 m. */
  sounder: 2.4,
  /** BS 5266-1 emergency luminaires at least 2 m above the floor. */
  bulkhead: 2.6,
  /** BS 5499-4: escape signs 2.0 to 2.5 m to their foot. */
  exitSign: 2.4,
  /** The AED cabinet's handle about 1.2 m, reachable from a wheelchair. */
  aed: 1.25,
  /** Notices at eye height. */
  notice: 1.5,
  /** CCTV domes and PIRs high on the walls, out of reach. */
  cctv: 3.4,
  pir: 2.6,
} as const;

/**
 * Each room's way towards the final exit: the next room on the escape
 * route, the shorter way round the ring back to Hall 0 (Museum 3 by Museum
 * 2, three doorways, rather than by 4 and 5, four); from Hall 0, out
 * through its fire exit door to the stair.
 */
export const EXIT_WAY: Record<MuseumHallId, MuseumHallId | 'stair'> = {
  museum0: 'stair',
  museum1: 'museum0',
  museum2: 'museum1',
  museum3: 'museum2',
  museum4: 'museum5',
  museum5: 'museum1',
};
export const exitWay = (id: MuseumHallId) => EXIT_WAY[id];

/** The doorway a room is left by on the escape route. */
export function exitArch(id: MuseumHallId): MuseumArch | null {
  const to = EXIT_WAY[id];
  return to === 'stair'
    ? null
    : (hallArches(id).find((a) => a.to === to) ?? null);
}

/** Hall 0's fire exit door, to the stair down: on its west wall, by the doorway from Museum 1. */
export const FIRE_EXIT = { wall: 'west' as const, along: -3.2, w: 1.1, h: 2.1 };

/**
 * Where the lift will be (the owner, 2026-10-28; not built yet): a large
 * goods lift with double doors, from the loading bay to the museum,
 * serving levels −1 (the utility corridor), the main corridor's and 4
 * (the museum), big enough for two roll cages (about 0.8 × 0.7 × 1.7 m
 * each) and a person standing aside: about 2,500 kg, its car about 2.0 m
 * wide and 2.7 m deep (BS EN 81-20's goods and passenger-goods sizes),
 * its landing doors about 2.0 m clear. Reserved on Hall 0's east wall, in
 * its middle, clear of the painted pool, the title wall, the welcome
 * panel and the doorway: along the wall from Hall 0's middle, the wall
 * kept clear for its doors and their surround, and the landing zone kept
 * clear in front of it. The shaft would stand outside the east wall.
 */
export const LIFT_RESERVED = {
  wall: 'east' as const,
  along: 1.4,
  w: 3.2,
  depth: 2.5,
  doorClear: 2.0,
  car: { w: 2.0, d: 2.7 },
  capacityKg: 2500,
};

/** A point on a wall's room face, `u` along it (the museum's coordinate), `y` up, `off` out from the face (12 mm by default, clear of Hall 0's tiles on its shared wall); and the yaw facing into the room. */
export function onWallFace(wall: HallWall, u: number, y: number, off = 0.012) {
  const n: readonly [number, number] = [-wall.out[0], -wall.out[1]];
  const d = MUSEUM_WALL / 2 + off;
  const yaw = Math.atan2(n[0], n[1]);
  return wall.axis === 'x'
    ? { x: u, y, z: wall.line + n[1] * d, yaw }
    : { x: wall.line + n[0] * d, y, z: u, yaw };
}

/** A stretch of a wall already used: by a fitting, or by a sign the hall's view hangs there. */
interface Taken {
  wall: HallWall;
  u0: number;
  u1: number;
  y0: number;
  y1: number;
}
const sameWall = (a: HallWall, b: HallWall) =>
  a.axis === b.axis && a.line === b.line && a.from === b.from && a.to === b.to;

/**
 * The signs the hall's view hangs on its street wall (`views/museum-hall.ts`):
 * its title vinyl, and Museum 5's end of the route; kept clear.
 */
function hallSignsTaken(id: MuseumHallId, wall: HallWall): Taken[] {
  const mid = (wall.from + wall.to) / 2;
  if (id === 'museum0') return [];
  if (id === 'museum1')
    return wall.side === 'south'
      ? [{ wall, u0: 1.1, u1: 6.1, y0: 2.5, y1: 4.3 }]
      : [];
  if (beyondAt(wall, mid) !== 'street') return [];
  if (id === 'museum5')
    return [
      { wall, u0: mid - 6.3, u1: mid - 1.7, y0: 1.2, y1: 3.6 },
      { wall, u0: mid + 0.6, u1: mid + 6.6, y0: 2.5, y1: 4.7 },
    ];
  return [{ wall, u0: mid - 3.6, u1: mid + 3.6, y0: 2.3, y1: 4.9 }];
}

/** What a stretch of wall at height `y0` to `y1`, `u ± half`, would hit: an opening, a window, a corner, a sign, a fitting already there. */
function blocked(
  id: MuseumHallId,
  wall: HallWall,
  u: number,
  half: number,
  y0: number,
  y1: number,
  taken: readonly Taken[] = [],
) {
  for (const t of [...taken, ...hallSignsTaken(id, wall)])
    if (
      sameWall(t.wall, wall) &&
      u + half > t.u0 - 0.1 &&
      u - half < t.u1 + 0.1 &&
      y1 > t.y0 - 0.1 &&
      y0 < t.y1 + 0.1
    )
      return true;
  if (u - half < wall.from + MUSEUM_WALL / 2 + 0.4) return true;
  if (u + half > wall.to - MUSEUM_WALL / 2 - 0.4) return true;
  for (const a of hallArches(id)) {
    const on =
      a.axis === wall.axis &&
      Math.abs((wall.axis === 'x' ? a.at.z : a.at.x) - wall.line) < 1e-9;
    if (!on) continue;
    const au = wall.axis === 'x' ? a.at.x : a.at.z;
    if (Math.abs(u - au) < a.w / 2 + half + 0.25 && y0 < a.top + 1.8)
      return true;
  }
  for (const w of wallWindows(id, wall))
    if (
      Math.abs(u - w.u) < w.w / 2 + half + 0.15 &&
      y1 > w.sill - 0.05 &&
      y0 < w.head + 0.4
    )
      return true;
  return false;
}

/** The nearest free place along a wall to `want`, for a fitting `half` wide either side, `y0` to `y1` high. */
export function freeAlong(
  id: MuseumHallId,
  wall: HallWall,
  want: number,
  half: number,
  y0: number,
  y1: number,
  taken: Taken[] = [],
): number | null {
  for (let k = 0; k < 200; k++) {
    for (const s of k ? [1, -1] : [1]) {
      const u = want + s * k * 0.1;
      if (!blocked(id, wall, u, half, y0, y1, taken)) {
        taken.push({ wall, u0: u - half, u1: u + half, y0, y1 });
        return u;
      }
    }
  }
  return null;
}

/** The wall an archway is in, as its room has it. */
function wallOf(id: MuseumHallId, a: MuseumArch) {
  return hallWalls(id).find(
    (w) =>
      w.axis === a.axis &&
      Math.abs((w.axis === 'x' ? a.at.z : a.at.x) - w.line) < 1e-9,
  )!;
}
const uOf = (a: MuseumArch) => (a.axis === 'x' ? a.at.x : a.at.z);

/** The halls with a fire point: every other one. */
export const FIRE_POINT_HALLS: readonly MuseumHallId[] = [
  'museum1',
  'museum3',
  'museum5',
];

/** A fire point's board, on its feet against the wall: its footprint out from the wall. */
export const FIRE_POINT_BOARD = { w: 0.7, depth: 0.45 };

/** Everything in a room's safety and services layer. */
export function safetyLayer(id: MuseumHallId): SafetyFitting[] {
  const out: SafetyFitting[] = [];
  const taken: Taken[] = [];
  const free = (
    wall: HallWall,
    want: number,
    half: number,
    y0: number,
    y1: number,
  ) => freeAlong(id, wall, want, half, y0, y1, taken);
  const walls = hallWalls(id);
  const o = hallOrigin(id);
  const { h } = hallSize(id);
  const put = (
    kind: SafetyKind,
    wall: HallWall,
    u: number | null,
    y: number,
    extra: Partial<SafetyFitting> = {},
  ) => {
    if (u === null) return;
    out.push({ kind, room: id, ...onWallFace(wall, u, y), ...extra });
  };
  const exit = exitArch(id);
  const welcome = id === 'museum0';
  const ax = hallAxes(id);

  // ---- The way out: over (beside) the doorway this room is left by ----
  if (exit) {
    const wall = wallOf(id, exit);
    const u = uOf(exit);
    // The maintained exit box beside the opening, arrow straight on, at 2.4 m.
    put(
      'exit-box',
      wall,
      free(wall, u + exit.w / 2 + 0.55, 0.2, 2.2, 2.6),
      HEIGHTS.exitSign,
      { arrow: 'up' },
    );
    // The call point at 1.4 m, on the other side of the opening.
    put(
      'call-point',
      wall,
      free(wall, u - exit.w / 2 - 0.45, 0.06, 1.3, 1.5),
      HEIGHTS.callPoint,
    );
  }
  // Emergency bulkheads by every doorway, over its side, at 2.6 m.
  for (const a of hallArches(id)) {
    const wall = wallOf(id, a);
    put(
      'bulkhead',
      wall,
      free(wall, uOf(a) - a.w / 2 - 0.6, 0.2, 2.5, 2.7),
      HEIGHTS.bulkhead,
    );
  }
  // Along an exhibit hall: signs hung from the street side's track at
  // 3.0 m, a quarter and three quarters along, each facing those walking
  // towards the way out, arrow straight on (BS 5499-4); their backs plain.
  if (!welcome && exit) {
    const along = ax.along;
    const across = ax.across;
    const exitAlong =
      (exit.at.x - o.x) * along[0] + (exit.at.z - o.z) * along[1];
    for (const s of [-ax.length / 4, ax.length / 4]) {
      const toward = Math.sign(exitAlong - s) || 1;
      // The street side's track: the courtyard side has the panels.
      const c = -(ax.width / 4 + 1);
      out.push({
        kind: 'exit-hanging',
        room: id,
        x: o.x + along[0] * s + across[0] * c,
        y: 3.0,
        z: o.z + along[1] * s + across[1] * c,
        // Its face away from the way out, towards those coming.
        yaw: Math.atan2(-along[0] * toward, -along[1] * toward),
        arrow: 'up',
      });
    }
  }

  // ---- Fire detection, warning and the fire points ----
  const street = walls.find(
    (w) => beyondAt(w, (w.from + w.to) / 2) === 'street',
  );
  const mainWall = street ?? walls.find((w) => w.side === 'south')!;
  const mid = (mainWall.from + mainWall.to) / 2;
  if (!welcome) {
    // A sounder-beacon on the street wall, a third along.
    const third = mainWall.from + (mainWall.to - mainWall.from) / 3;
    put(
      'sounder',
      mainWall,
      free(mainWall, third, 0.06, 2.3, 2.5),
      HEIGHTS.sounder,
    );
  }
  if (FIRE_POINT_HALLS.includes(id) && exit) {
    // On the street wall, as near the way out as it is clear.
    const exitU = mainWall.axis === 'x' ? exit.at.x : exit.at.z;
    const want = Math.max(
      mainWall.from + 1.4,
      Math.min(mainWall.to - 1.4, exitU),
    );
    const u = free(mainWall, want, FIRE_POINT_BOARD.w / 2 + 0.1, 0, 2.0);
    put('fire-point', mainWall, u, 0);
  }

  // ---- Power: twin sockets at 450 mm, every 6 m or so along the long walls; floor boxes ----
  if (!welcome) {
    for (const wall of walls) {
      const len = wall.to - wall.from;
      if (len < ax.length - 1) continue;
      for (let k = 1; k * 6 < len; k++) {
        const u = free(wall, wall.from + k * 6, 0.08, 0.35, 0.55);
        put('socket', wall, u, HEIGHTS.socket);
      }
    }
    for (const s of [-ax.length / 4, ax.length / 4])
      out.push({
        kind: 'floor-box',
        room: id,
        x: o.x + ax.along[0] * s,
        y: 0,
        z: o.z + ax.along[1] * s,
        yaw: 0,
      });
  }

  // ---- Security ----
  const corner = walls.find((w) => w !== mainWall && w.axis !== mainWall.axis)!;
  put(
    'cctv',
    mainWall,
    free(mainWall, mainWall.to - 1.0, 0.15, 3.2, 3.6),
    HEIGHTS.cctv,
  );
  put(
    'pir',
    corner,
    free(corner, corner.from + 0.8, 0.06, 2.5, 2.7),
    HEIGHTS.pir,
  );

  // ---- Visitors: "please do not touch" at each exhibit hall's way in ----
  if (!welcome) {
    const back =
      hallArches(id).find((a) => !a.onward && a.to !== EXIT_WAY[id]) ??
      hallArches(id).find((a) => !a.onward);
    if (back) {
      const wall = wallOf(id, back);
      put(
        'do-not-touch',
        wall,
        free(wall, uOf(back) + back.w / 2 + 0.6, 0.15, 1.3, 1.7),
        HEIGHTS.notice,
      );
    }
  }
  if (id === 'museum3') {
    // A staff-only door, kept shut, on the street wall.
    const u = free(mainWall, mid - 6.5, 0.6, 0, 2.3);
    put('staff-door', mainWall, u, 0);
  }

  // ---- Hall 0: the way out, the lift's place, medical, notices ----
  if (welcome) {
    const west = walls.find((w) => w.side === FIRE_EXIT.wall)!;
    const east = walls.find((w) => w.side === LIFT_RESERVED.wall)!;
    const doorU = o.z + FIRE_EXIT.along;
    put('fire-exit-door', west, doorU, 0);
    put('final-exit-sign', west, doorU, FIRE_EXIT.h + 0.3);
    // On the door's leaf, at eye height.
    put('door-keep-shut', west, doorU, 1.8);
    put('bulkhead', west, doorU, FIRE_EXIT.h + 0.62);
    put('ground-floor-sign', west, doorU + FIRE_EXIT.w / 2 + 0.75, 1.7);
    put('call-point', west, doorU - FIRE_EXIT.w / 2 - 0.35, HEIGHTS.callPoint);
    // Medical, by the fire exit: the defibrillator, the first-aid kit and its sign.
    put('aed', west, doorU + 3.6, HEIGHTS.aed);
    put('first-aid', west, doorU + 4.8, HEIGHTS.notice);
    // Hung inside the doorway from Museum 1, back to back: to those coming
    // in from the museum, the fire exit on their right; to those by the
    // pool, ahead and to the left.
    for (const [yaw, arrow] of [
      [Math.PI, 'right'],
      [0, 'up-left'],
    ] as const)
      out.push({
        kind: 'exit-hanging',
        room: id,
        x: o.x - 3.2,
        y: 2.6,
        z: o.z - 5.2,
        yaw,
        arrow,
      });
    // Notices by the doorway into the museum: CCTV, hearing loop, occupancy, wayfinding.
    const north = walls.find((w) => w.side === 'north')!;
    const door = hallArches(id)[0];
    const du = uOf(door);
    put('occupancy', north, du - door.w / 2 - 0.55, HEIGHTS.notice);
    put('cctv-notice', north, du - door.w / 2 - 1.15, HEIGHTS.notice);
    put('hearing-loop', north, du + door.w / 2 + 0.55, HEIGHTS.notice);
    put('wayfinding', north, du - door.w / 2 - 2.6, 1.9);
    put('sounder', north, du + door.w / 2 + 1.6, HEIGHTS.sounder);
    // The tiled ceiling's own detectors and sprinklers.
    for (const [lx, lz] of [
      [-4, -2],
      [4, 2],
    ])
      out.push({
        kind: 'smoke-detector',
        room: id,
        x: o.x + lx,
        y: h,
        z: o.z + lz,
        yaw: 0,
      });
    for (const [lx, lz] of [
      [-3, 3],
      [3, -3],
      [0, 0],
      [-6, -5],
      [6, 5],
    ])
      out.push({
        kind: 'sprinkler',
        room: id,
        x: o.x + lx,
        y: h,
        z: o.z + lz,
        yaw: 0,
      });
    // The lift's place on the east wall stays clear (nothing is put there).
    void east;
  }
  return out;
}

/** The layer's walking solids, in the room's own coordinates: the fire point boards. */
export function safetySolids(id: MuseumHallId): Footprint[] {
  const o = hallOrigin(id);
  return safetyLayer(id)
    .filter((f) => f.kind === 'fire-point' || f.kind === 'staff-door')
    .map((f) => {
      const nx = Math.sin(f.yaw);
      const nz = Math.cos(f.yaw);
      const half = f.kind === 'fire-point' ? FIRE_POINT_BOARD.w / 2 : 0.6;
      const depth = f.kind === 'fire-point' ? FIRE_POINT_BOARD.depth : 0.1;
      const cx = f.x + nx * (depth / 2) - o.x;
      const cz = f.z + nz * (depth / 2) - o.z;
      const hx = Math.abs(nx) > 0.5 ? depth / 2 : half;
      const hz = Math.abs(nx) > 0.5 ? half : depth / 2;
      return { minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz };
    });
}

/** The rooms reached by following the escape route from `id`, ending at the stair. */
export function escapeRoute(id: MuseumHallId): (MuseumHallId | 'stair')[] {
  const route: (MuseumHallId | 'stair')[] = [id];
  let at: MuseumHallId | 'stair' = id;
  for (let k = 0; k < 10 && at !== 'stair'; k++) {
    at = EXIT_WAY[at];
    route.push(at);
  }
  return route;
}

/** All the rooms' layers. */
export const ALL_SAFETY_ROOMS: readonly MuseumHallId[] = [
  'museum0',
  ...MUSEUM_EXHIBITS,
];
