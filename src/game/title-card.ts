import type { RoomPlan } from './facility-plan';

/** A title card's width, metres: larger in a tall room, never wider than its wall allows. */
export function cardWidth(room: RoomPlan) {
  const wall =
    room.card === 'north' || room.card === 'south'
      ? room.maxX - room.minX
      : room.maxZ - room.minZ;
  const preferred = room.height > 6 ? 6 : 2.4;
  return Math.min(preferred, wall * 0.6);
}

/** A title card's height, metres, for its width (a 3:1 board). */
export const cardHeight = (room: RoomPlan) => cardWidth(room) / 3;

/** The height of a title card's centre above the floor, metres. */
export function cardCentreY(room: RoomPlan) {
  return room.height > 6
    ? 4
    : Math.min(1.9, room.height - 0.3 - cardHeight(room) / 2);
}
