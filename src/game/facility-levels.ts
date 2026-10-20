import { DOORS, ROOMS, roomAt } from './facility-plan';

/** The stair descends westward along the north edge of the service corridor. */
export const STAIR = { minX: 32, maxX: 44, minZ: -3.95, maxZ: -2.45 } as const;
export const LOWER_Y = -3;

export function floorAt(x: number, z: number, previousY: number) {
  if (x >= STAIR.minX && x <= STAIR.maxX && z >= STAIR.minZ && z <= STAIR.maxZ)
    return x === STAIR.maxX
      ? 0
      : LOWER_Y * ((STAIR.maxX - x) / (STAIR.maxX - STAIR.minX));
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
