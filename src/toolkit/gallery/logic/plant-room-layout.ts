import type { Footprint } from '../../controls/logic/walk-collision';

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
