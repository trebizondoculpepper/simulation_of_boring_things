import { runShell } from './shell-room';
import { createControlRoomPrototype } from '../views/control-room-prototype';
import {
  protoBounds,
  protoFloorAt,
  protoSolids,
  protoStart,
} from '../logic/control-room-prototype';
import { DEV_ROOM_NAMES } from '../logic/dev-room-links';

/**
 * The control room's prototype (dev45, mission 092 stage 0): in at the
 * stair hall's door, up the 8 m switchback stair, into the grand
 * heptagonal room. Its own walking (`logic/control-room-prototype.ts`):
 * the stair's surfaces, the room's floor and stage, and what stops a
 * walker at each height. No doors; nothing in it works yet.
 */
export function startControlRoomPrototype(canvas: HTMLCanvasElement) {
  const b = protoBounds();
  // The shell's frame is centred: wide and deep enough for the whole plan.
  const w = 2 * Math.max(-b.minX, b.maxX);
  const d = 2 * Math.max(-b.minZ, b.maxZ);
  return runShell(canvas, {
    self: 'dev45',
    room: { w, d, doors: [] },
    build: (metre, kit) => ({
      group: createControlRoomPrototype(metre, kit, DEV_ROOM_NAMES.dev45),
      doors: [],
    }),
    floorAt: protoFloorAt,
    levelSolids: protoSolids,
    solids: [],
    powered: () => true,
    start: protoStart(),
  });
}
