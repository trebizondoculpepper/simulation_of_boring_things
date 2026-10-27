import { runShell } from './shell-room';
import { createControlRoomPrototype } from '../views/control-room-prototype';
import {
  protoBounds,
  protoFloorAt,
  protoSolids,
  protoStart,
} from '../logic/control-room-prototype';
import type { Theme } from '../logic/control-room-prototype';
import { DEV_ROOM_NAMES } from '../logic/dev-room-links';

/**
 * The control room's prototype, in its two versions on one geometry
 * (mission 092 stage 0; the owner, 2026-10-27): dev45 the Bond villain's
 * lair, dev46 the starship bridge. In at the stair hall's door, up the
 * 8 m switchback stair, into the grand heptagonal room. Its own walking
 * (`logic/control-room-prototype.ts`): the stair's surfaces, the room's
 * floor and stage (and the bridge's ramps), and what stops a walker at
 * each height. No doors; nothing in it works yet.
 */
function startPrototype(canvas: HTMLCanvasElement, theme: Theme) {
  const self = theme === 'lair' ? 'dev45' : 'dev46';
  const b = protoBounds();
  // The shell's frame is centred: wide and deep enough for the whole plan.
  const w = 2 * Math.max(-b.minX, b.maxX);
  const d = 2 * Math.max(-b.minZ, b.maxZ);
  return runShell(canvas, {
    self,
    room: { w, d, doors: [] },
    build: (metre, kit) => ({
      group: createControlRoomPrototype(
        metre,
        kit,
        DEV_ROOM_NAMES[self],
        theme,
      ),
      doors: [],
    }),
    floorAt: (x, z, previous) => protoFloorAt(x, z, previous, theme),
    levelSolids: (y) => protoSolids(y, theme),
    solids: [],
    powered: () => true,
    start: protoStart(),
  });
}

/** Dev45: the control room as the Bond villain's lair. */
export const startControlRoomPrototype = (canvas: HTMLCanvasElement) =>
  startPrototype(canvas, 'lair');

/** Dev46: the control room as the starship bridge. */
export const startBridgePrototype = (canvas: HTMLCanvasElement) =>
  startPrototype(canvas, 'bridge');
