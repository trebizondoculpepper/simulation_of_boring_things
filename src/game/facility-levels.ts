import { DOORS, ROOMS, roomAt } from './facility-plan';
import type { PlanFootprint } from './facility-plan';

/** The lower plant level's floor, metres below the ground floor. */
export const LOWER_Y = -3;

/**
 * The stairs between the service corridor and the lower service corridor
 * beneath it: each one prefabricated galvanised steel straight flight along the
 * corridors' north wall, descending westward. Sixteen risers of 187.5 mm
 * and fifteen goings of 250 mm (a pitch of about 37°), within the limits
 * of Approved Document K for a utility stair (rise at most 190 mm, going
 * at least 250 mm, pitch at most 42°), 1.1 m wide overall.
 * The ground floor has an opening above each whole flight, so the headroom
 * over it is the corridor's full height.
 */
export const STAIR_RISERS = 16;
export const STAIR_RISE = -LOWER_Y / STAIR_RISERS;
export const STAIR_GOING = 0.25;
/** A flight's footprint: its top nosing at maxX, its foot at minX. */
export interface Stair {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const RUN = (STAIR_RISERS - 1) * STAIR_GOING;
const flight = (id: string, top: number): Stair => ({
  id,
  minX: top - RUN,
  maxX: top,
  minZ: -3.9,
  maxZ: -2.8,
});

/**
 * Two flights, one near each end of the corridors, so nobody on the
 * lower level is ever far from a way up, and no dead end down there is
 * longer than Approved Document B allows (18 m where there is only one way
 * to go).
 */
export const STAIRS: readonly Stair[] = [
  flight('west', 17.75),
  flight('east', 90.35),
];
/** The west flight, kept by name for the places that need just one. */
export const STAIR = STAIRS[0];

/** The guards round one flight: upstairs and downstairs. */
export function stairGuards(stair: Stair) {
  const side: PlanFootprint = {
    minX: stair.minX,
    maxX: stair.maxX,
    minZ: stair.maxZ,
    maxZ: stair.maxZ + 0.08,
  };
  return {
    /** Upstairs, the opening's guard rail on its long side and its far end. */
    upper: [
      side,
      {
        minX: stair.minX - 0.08,
        maxX: stair.minX,
        minZ: stair.minZ,
        maxZ: stair.maxZ + 0.08,
      },
    ],
    /**
     * Downstairs, the flight's side, and the space under its upper half,
     * too low to stand in. Climbing the flight's lower half the walker is
     * still downstairs; past halfway they are upstairs, clear of it.
     */
    lower: [
      side,
      {
        minX: (stair.minX + stair.maxX) / 2,
        maxX: stair.maxX,
        minZ: stair.minZ,
        maxZ: stair.maxZ,
      },
    ],
  };
}
export const UPPER_STAIR_GUARDS: readonly PlanFootprint[] = STAIRS.flatMap(
  (s) => stairGuards(s).upper,
);
export const LOWER_STAIR_GUARDS: readonly PlanFootprint[] = STAIRS.flatMap(
  (s) => stairGuards(s).lower,
);

/** The flight a plan point is on, if any. */
export function stairAt(x: number, z: number) {
  return (
    STAIRS.find(
      (s) => x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ,
    ) ?? null
  );
}

/**
 * The floor under the walker: on the flight, its pitch line; elsewhere
 * the ground floor, or the lower floor where only it is there, or where
 * both are and the walker is already downstairs.
 */
export function floorAt(x: number, z: number, previousY: number) {
  const stair = stairAt(x, z);
  if (stair) return LOWER_Y * ((stair.maxX - x) / (stair.maxX - stair.minX));
  const lower = roomAt(x, z, ROOMS, LOWER_Y);
  const upper = roomAt(x, z, ROOMS, 0);
  const hasLower = lower?.floorY === LOWER_Y;
  const hasUpper = upper && (upper.floorY ?? 0) === 0;
  if (hasLower && (!hasUpper || previousY < LOWER_Y / 2)) return LOWER_Y;
  return 0;
}

/** Rooms visible through a doorway from the current room. */
export function nearbyRooms(id: string) {
  const ids = new Set([id]);
  for (const door of DOORS) {
    if (!door.rooms.includes(id)) continue;
    ids.add(door.rooms[0]);
    ids.add(door.rooms[1]);
  }
  return ids;
}
