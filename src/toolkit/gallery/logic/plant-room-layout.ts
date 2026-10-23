import type { Footprint } from '../../controls/logic/walk-collision';
import { placeMachines } from './machine-placement';
import type { Band, PlaceItem, PlaceLink } from './machine-placement';
import { reserveRegions } from './room-regions';
import type { Gantry, Region, RegionOptions, RegionRoom } from './room-regions';
import { sizeRoom } from './room-sizer';

/**
 * How a plant development room lays out its exhibits, in metres: floor
 * equipment stands in a row along the north wall, facing south across a
 * walkway, with a maintenance clearance behind it; wall-mounted equipment
 * hangs in a row on the south wall, facing north. The room is as long as
 * its longer row needs and as tall as its tallest exhibit needs. The west
 * wall is left clear at its south end for the door to the corridor
 * (`devPortals`), and the east wall carries the room's title card.
 *
 * The room's middle is the origin; north is −z, as everywhere.
 */

export interface ExhibitSize {
  /** Width along the row (x), depth from the wall (z), height, metres. */
  w: number;
  d: number;
  h: number;
  mount: 'floor' | 'wall';
  /** For wall equipment, the height of its middle above the floor. */
  y?: number;
  /**
   * For floor equipment sunk into the floor (a pool's edge, a pit): the
   * outline in plan, (x, z) metres about its origin, that the room cuts
   * out of its floor for it.
   */
  pit?: readonly (readonly [number, number])[];
}

/** Gap between neighbouring exhibits along a row, metres. */
export const EXHIBIT_GAP = 1.4;
/** Clear space behind floor equipment, for maintenance access, metres. */
export const BACK_CLEARANCE = 0.8;
/** Clear walkway between the rows, metres. */
export const WALKWAY = 4;
/** Room at each end of a row: the door at the west, the title at the east. */
export const END_SPACE = 3;
/** Headroom above the tallest exhibit, metres. */
export const HEADROOM = 1.5;
export const MIN_HEIGHT = 4;

/** How far the walls' inner faces stand in from the room's half depth, metres (half the wall thickness). */
export const WALL_FACE = 0.15;

export interface ExhibitPlace {
  /** The middle of its footprint on the floor (floor) or its back (wall). */
  x: number;
  z: number;
  /** Height of its origin: 0 on the floor, its middle on a wall. */
  y: number;
  /** Turn about y: 0 faces south (+z), π faces north. */
  yaw: number;
  /**
   * A turn about its own z before the yaw, for a device set into a run of
   * pipe: π/2 stands its x (the pipe's way through it) upright.
   */
  tilt?: number;
  /** Set into a line by the plumber, not standing on the floor. */
  inline?: boolean;
}

export interface PlantRoomLayout {
  /** Half the room's length (x) and depth (z), metres. */
  halfX: number;
  halfZ: number;
  height: number;
  places: ExhibitPlace[];
  /** Footprints of floor exhibits, for walking collision. */
  solids: Footprint[];
}

/** Lay out exhibits, in the order given, along the room. */
export function layoutPlantRoom(
  sizes: readonly ExhibitSize[],
): PlantRoomLayout {
  const floor = sizes.filter((s) => s.mount === 'floor');
  const wall = sizes.filter((s) => s.mount === 'wall');
  const rowLength = (row: readonly ExhibitSize[]) =>
    row.reduce((n, s) => n + s.w, 0) +
    Math.max(0, row.length - 1) * EXHIBIT_GAP;
  const length = Math.max(
    12,
    Math.max(rowLength(floor), rowLength(wall)) + 2 * END_SPACE,
  );
  const deepest = Math.max(0, ...floor.map((s) => s.d));
  const wallDeepest = Math.max(0, ...wall.map((s) => s.d));
  const depth = Math.max(
    10,
    BACK_CLEARANCE + deepest + WALKWAY + wallDeepest + 0.5,
  );
  const tallest = Math.max(
    0,
    ...floor.map((s) => s.h),
    ...wall.map((s) => (s.y ?? 1.5) + s.h / 2),
  );
  const height = Math.max(MIN_HEIGHT, Math.ceil((tallest + HEADROOM) * 2) / 2);
  const halfX = length / 2;
  const halfZ = depth / 2;
  const places = new Map<ExhibitSize, ExhibitPlace>();
  const solids: Footprint[] = [];
  const lay = (
    row: readonly ExhibitSize[],
    place: (s: ExhibitSize, x: number) => ExhibitPlace,
  ) => {
    let x = -rowLength(row) / 2;
    for (const s of row) {
      places.set(s, place(s, x + s.w / 2));
      x += s.w + EXHIBIT_GAP;
    }
  };
  lay(floor, (s, x) => {
    const z = -halfZ + BACK_CLEARANCE + s.d / 2;
    solids.push({
      minX: x - s.w / 2,
      maxX: x + s.w / 2,
      minZ: z - s.d / 2,
      maxZ: z + s.d / 2,
    });
    return { x, z, y: 0, yaw: 0 };
  });
  lay(wall, (s, x) => ({
    x,
    z: halfZ - WALL_FACE,
    y: s.y ?? 1.5,
    yaw: Math.PI,
  }));
  return {
    halfX,
    halfZ,
    height,
    places: sizes.map((s) => places.get(s) as ExhibitPlace),
    solids,
  };
}

/** Square development plant with machines on four walls and connected neighbours nearby. */
export function layoutSquarePlantRoom(
  sizes: readonly ExhibitSize[],
  links: readonly (readonly [number, number, number])[] = [],
): PlantRoomLayout {
  const quarter = Math.floor(sizes.length / 4);
  const counts = [
    quarter,
    Math.ceil(sizes.length / 4),
    quarter,
    sizes.length - 2 * quarter - Math.ceil(sizes.length / 4),
  ];
  const rowLength = (row: readonly number[]) =>
    row.reduce((sum, index) => sum + sizes[index].w, 0) +
    Math.max(0, row.length - 1) * EXHIBIT_GAP;
  const rowsOf = (order: readonly number[]) => {
    let cursor = 0;
    return counts.map((count) => {
      const row = order.slice(cursor, cursor + count);
      cursor += count;
      return row;
    });
  };
  const side = 20;
  const half = side / 2;
  const arrange = (order: readonly number[]) => {
    const places: ExhibitPlace[] = Array(sizes.length);
    const solids: Footprint[] = Array(sizes.length);
    const rows = rowsOf(order);
    rows.forEach((row, bank) => {
      let along = -rowLength(row) / 2;
      for (const index of row) {
        const size = sizes[index];
        const middle = along + size.w / 2;
        const inset = half - BACK_CLEARANCE - size.d / 2;
        const [x, z, yaw] =
          bank === 0
            ? [middle, -inset, 0]
            : bank === 1
              ? [inset, middle, -Math.PI / 2]
              : bank === 2
                ? [-middle, inset, Math.PI]
                : [-inset, -middle, Math.PI / 2];
        places[index] = { x, y: 0, z, yaw };
        const halfW = bank % 2 === 0 ? size.w / 2 : size.d / 2;
        const halfD = bank % 2 === 0 ? size.d / 2 : size.w / 2;
        solids[index] = {
          minX: x - halfW,
          maxX: x + halfW,
          minZ: z - halfD,
          maxZ: z + halfD,
        };
        along += size.w + EXHIBIT_GAP;
      }
    });
    return { rows, places, solids };
  };
  const score = (order: readonly number[]) => {
    const { rows, places } = arrange(order);
    const overflow = rows.reduce(
      (sum, row) => sum + Math.max(0, rowLength(row) - (side - 3)) ** 2 * 1000,
      0,
    );
    return (
      overflow +
      links.reduce(
        (sum, [a, b, weight]) =>
          sum +
          weight *
            Math.hypot(places[a].x - places[b].x, places[a].z - places[b].z),
        0,
      )
    );
  };
  const order = sizes.map((_, index) => index);
  let best = score(order);
  for (let pass = 0; pass < 8; pass++) {
    let improved = false;
    for (let a = 0; a < order.length - 1; a++) {
      for (let b = a + 1; b < order.length; b++) {
        [order[a], order[b]] = [order[b], order[a]];
        const next = score(order);
        if (next + 0.001 < best) {
          best = next;
          improved = true;
        } else [order[a], order[b]] = [order[b], order[a]];
      }
    }
    if (!improved) break;
  }
  const { places, solids } = arrange(order);
  return {
    halfX: half,
    halfZ: half,
    height: 4,
    places,
    solids,
  };
}

/**
 * A development plant room laid out by the room's layers
 * (`doc/prompts/017-room-sizer-gantries-placement.md`): sized for its
 * exhibits (`sizeRoom`), its regions reserved (`reserveRegions`: the door's
 * approach and, two storeys up, a gantry and its stair), then its machines
 * placed round them (`placeMachines`). If they will not all fit, the room
 * grows a step and they are placed again.
 */
export interface SizedPlantRoomLayout extends PlantRoomLayout {
  regions: Region[];
  /** The bands the machines stand in, and the band each exhibit stands in (none for one in a line). */
  bands: Band[];
  bandOf: (string | null)[];
  gantry: Gantry | null;
  room: RegionRoom;
  /** How the room was sized and laid out, and what could not be done. */
  reasons: string[];
  problems: string[];
  /** The placed machines' weighted link length, metres. */
  linkLength: number;
}

export function layoutSizedPlantRoom(
  sizes: readonly ExhibitSize[],
  {
    items = [],
    links = [],
    gantry = 'auto',
    storeys = 2,
    seed = 1,
    practice = true,
  }: {
    /** What placement needs beyond the sizes, by exhibit: walls, ports, a rising flue. */
    items?: readonly Partial<PlaceItem>[];
    links?: readonly PlaceLink[];
    gantry?: RegionOptions['gantry'];
    storeys?: number;
    seed?: number;
    /** Follow the process layout rules (`PlaceOptions.practice`). */
    practice?: boolean;
  } = {},
): SizedPlantRoomLayout {
  const all: PlaceItem[] = sizes.map((s, i) => ({
    key: String(i),
    w: s.w,
    d: s.d,
    h: s.h,
    ...items[i],
  }));
  // What sits in a line (a valve) is the plumber's to place, later: the
  // room is sized and laid out without it.
  const place = all.filter((item) => !item.inline);
  // Grow a little at a time; at each size, a few seeds before growing.
  const tries = [0, 0.1, 0.2, 0.3, 0.45, 0.6];
  let result: SizedPlantRoomLayout | null = null;
  for (const grow of tries) {
    const size = sizeRoom(place, {
      storeys,
      gantry: gantry !== 'never',
      grow,
    });
    const room: RegionRoom = {
      w: size.w,
      d: size.d,
      h: size.h,
      // The dev rooms' one door: west wall, 1.1 m from its south end.
      doors: [{ side: 'west', at: size.d / 2 - 1.1, width: 1, height: 2.1 }],
    };
    const reserved = reserveRegions(room, { gantry });
    // A seed, and another only while it breaks a rule.
    let placed = placeMachines(room, reserved.regions, place, links, {
      seed,
      practice,
    });
    for (const s of [seed + 1, seed + 2]) {
      if (!placed.problems.length) break;
      const next = placeMachines(room, reserved.regions, place, links, {
        seed: s,
        practice,
      });
      if (next.problems.length < placed.problems.length) placed = next;
    }
    result = {
      halfX: room.w / 2,
      halfZ: room.d / 2,
      height: room.h,
      places: all.map((item) => {
        const p = placed.placed.find((q) => q.key === item.key);
        return p
          ? { x: p.x, z: p.z, y: 0, yaw: p.yaw }
          : { x: 0, z: 0, y: 0, yaw: 0, inline: true };
      }),
      // Index for index with the exhibits; nothing, for one in a line.
      solids: all.map(
        (item) =>
          placed.placed.find((q) => q.key === item.key)?.footprint ?? {
            minX: 0,
            maxX: 0,
            minZ: 0,
            maxZ: 0,
          },
      ),
      regions: [...reserved.regions, ...placed.walkways],
      bands: placed.bands,
      bandOf: all.map(
        (item) => placed.placed.find((q) => q.key === item.key)?.band ?? null,
      ),
      gantry: reserved.gantry,
      room,
      reasons: [...size.reasons, `machines placed from ${placed.pattern}`],
      problems: [...reserved.problems, ...placed.problems],
      linkLength: placed.length,
    };
    if (!placed.problems.length) break;
  }
  return result!;
}
