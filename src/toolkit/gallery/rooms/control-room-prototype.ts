import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { runShell } from './shell-room';
import { createControlRoomPrototype } from '../views/control-room-prototype';
import { equipmentDoors } from '../../components/architectural/parts/equipment-doors';
import { consoleRecording } from '../../components/sound/audio/console-recordings';
import {
  CARD_READ_SOUND,
  LEVELS,
} from '../../components/sound/logic/console-sounds';
import type { EquipmentDoorsPart } from '../../components/architectural/parts/equipment-doors';
import type { Part } from '../../components/core/parts/parts';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import {
  STOREY,
  bridgeArrival,
  bridgeDoor,
  bridgeDoorway,
  protoBounds,
  protoFloorAt,
  protoSolids,
  protoStart,
} from '../logic/control-room-prototype';
import type { Theme } from '../logic/control-room-prototype';
import { DEV_ROOM_NAMES } from '../logic/dev-room-links';
import type { ShellDoor } from '../logic/shell-rooms';
import { roomPowered } from '../views/room-power';
import { warningsFor } from '../views/shell-room';

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

/**
 * The bridge (mission 095; the owner, 2026-10-27: "why don't we wire this
 * in as the real replacement control room? ... we'll just call this room
 * the bridge"): dev46's room as the game's control room, off the main
 * corridor through the doors that led to the old one (retired, kept by
 * its URL). In through the stair hall's pair of equipment doors, up the
 * stair; on the control room's supply and lighting way (CR-SF1, way 14),
 * which it takes over. `install` puts in its working consoles.
 */
export function startBridgeRoom(
  canvas: HTMLCanvasElement,
  install: (kit: PanelKit) => Part[] = () => [],
  /** Told of its doors to the corridor once built (the reveal waits for them to shut). */
  onDoors?: (doors: EquipmentDoorsPart) => void,
) {
  // Its one doorway, in its west wall (`bridgeDoorway`), joined to the
  // corridor's control room doorway a storey down; the runner's rectangle
  // is only its noclip's frame.
  const b = protoBounds();
  const door: ShellDoor = { wall: 'west', at: 0, to: 'main_corridor' };
  const room = {
    w: 2 * Math.max(-b.minX, b.maxX),
    d: 2 * Math.max(-b.minZ, b.maxZ),
    doors: [door],
  };
  const way = bridgeDoorway();
  return runShell(canvas, {
    self: 'bridge',
    room,
    build: (metre, kit) => {
      const group = createControlRoomPrototype(
        metre,
        kit,
        DEV_ROOM_NAMES.bridge,
        'bridge',
        { game: true },
      );
      // The corridor's doors, set into the wall's doorway as a shell room
      // hangs them (`views/shell-room.ts`), pulled open from in here;
      // beyond, a dark lobby until the corridor is seen through them.
      const yaw = way.frame.yaw;
      // No sign over them on the bridge's side (the owner, 2026-10-27).
      // Their card readers answer with the owner's console sound, as
      // everything electronic on the bridge does (the owner, 2026-10-27).
      const part = equipmentDoors(kit, '', warningsFor('main_corridor'), 1, {
        readerBeep: consoleRecording(CARD_READ_SOUND, LEVELS.cardRead),
      });
      onDoors?.(part);
      part.object.position.set(way.inner.x, STOREY, way.inner.z);
      part.object.rotation.y = yaw;
      const lobby = new Group();
      lobby.position.set(way.outer.x, STOREY, way.outer.z);
      lobby.rotation.y = yaw;
      const dark = new MeshStandardMaterial({ color: '#0b0d0d', roughness: 1 });
      kit.materials.push(dark);
      const size = bridgeDoor();
      const curtain = new Mesh(
        new BoxGeometry(size.width, size.height, 0.05),
        dark,
      );
      curtain.position.set(0, size.height / 2, -0.9);
      lobby.add(curtain);
      // The plan's metres, scaled as the prototype's group is.
      const inner = new Group();
      inner.add(part.object, lobby);
      group.add(inner);
      return { group, doors: [{ door, part, lobby }] };
    },
    install,
    floorAt: (x, z, previous) => protoFloorAt(x, z, previous, 'bridge', true),
    levelSolids: (y) => protoSolids(y, 'bridge', true),
    solids: [],
    bounds: b,
    doorY: STOREY,
    doorway: () => way,
    lightsOf: 'control_room',
    powered: roomPowered('control_room'),
    start: bridgeArrival(),
  });
}
