import type { EmergencyFitting } from '../../components/general-safety/logic/emergency-lighting';

/**
 * Dev18's lighting, as a plan, so that its emergency lighting can be
 * checked against BS 5266-1 without drawing it: a 24 × 18 m room, 7 m
 * high, with its exit doors in the north wall (the escape door at x = −7.5
 * and the utility door at x = 7.5; the loading door between is not a way
 * out) and the portals near its north-east and south-east corners. The
 * products and their data are in `doc/research/emergency-lighting-parts.md`.
 */
export const GALLERY_FLOOR = { minX: -12, maxX: 12, minZ: -9, maxZ: 9 };
export const GALLERY_CEILING = 7;

/** The room's luminaires (LED battens), hung below the ceiling, metres. */
export const GALLERY_LUMINAIRES: readonly {
  x: number;
  y: number;
  z: number;
}[] = [-8, 0, 8].flatMap((x) =>
  [-4.5, 4.5].map((z) => ({ x, y: GALLERY_CEILING - 0.6, z })),
);

/**
 * The emergency downlights' optics, after Thorn's Voyager Star E3/8 on its
 * 3-hour setting: the high-ceiling lens (235 lm, its light thrown wide:
 * modelled as even in every direction below) next to the walls, and the
 * open-area lens (270 lm) between, as Thorn's spacing guide lays them out
 * at 7 m (3.9 m from a wall).
 */
const HIGH_CEILING = { lumens: 235, spread: 0 };
const OPEN_AREA = { lumens: 270, spread: 0.6 };
/** The bulkheads over the ways out (LEDVANCE EM BULKHEAD E, 200 lm). */
const BULKHEAD = { lumens: 200, spread: 1 };

export type EmergencyKind = 'downlight' | 'bulkhead';
export interface GalleryEmergency extends EmergencyFitting {
  kind: EmergencyKind;
  /** A bulkhead's wall: the side of the room it is on. */
  wall?: 'north' | 'south';
}

/** Where the downlights are: 3.9 m in from the walls, and the middle. */
const ROWS = [-5.1, 0, 5.1];
const COLUMNS = [-8.1, 0, 8.1];
/** A bulkhead's mounting height, over a door, and how far it stands out. */
export const BULKHEAD_HEIGHT = 2.75;

/**
 * The emergency lights: downlights in the ceiling over the open area, and
 * a bulkhead over each way out, within 2 m of it as BS 5266 asks. (A
 * bulkhead faces out of its wall; for the check it is taken as a point a
 * little out from the wall, which is near enough on the floor in front of
 * it.)
 */
export const GALLERY_EMERGENCY: readonly GalleryEmergency[] = [
  ...COLUMNS.flatMap((x) =>
    ROWS.map((z) => ({
      kind: 'downlight' as const,
      x,
      z,
      height: GALLERY_CEILING,
      ...(x === 0 && z === 0 ? OPEN_AREA : HIGH_CEILING),
    })),
  ),
  ...[
    { x: -7.5, wall: 'north' as const },
    { x: 7.5, wall: 'north' as const },
    { x: 10.9, wall: 'north' as const },
    { x: 10.9, wall: 'south' as const },
  ].map(({ x, wall }) => ({
    kind: 'bulkhead' as const,
    wall,
    x,
    z: wall === 'north' ? GALLERY_FLOOR.minZ + 0.3 : GALLERY_FLOOR.maxZ - 0.3,
    height: BULKHEAD_HEIGHT,
    ...BULKHEAD,
  })),
];

/** A lighting switch bank beside each exit door, on its latch side. */
export const GALLERY_SWITCH_BANKS: readonly { x: number }[] = [
  { x: -6.5 },
  { x: 6.5 },
];

/** A high-bay presence detector over each zone's column of battens. */
export const GALLERY_DETECTORS: readonly {
  x: number;
  z: number;
  height: number;
}[] = [-8, 0, 8].map((x) => ({ x, z: -2.2, height: GALLERY_CEILING }));

/** Where BS 5266 wants an emergency light close by: each way out. */
export const GALLERY_EMPHASIS: readonly {
  name: string;
  x: number;
  z: number;
}[] = [
  { name: 'escape door', x: -7.5, z: -9 },
  { name: 'utility door', x: 7.5, z: -9 },
  { name: 'north portal', x: 10.9, z: -9 },
  { name: 'south portal', x: 10.9, z: 9 },
];
