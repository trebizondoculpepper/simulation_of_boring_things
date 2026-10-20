import {
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
} from 'three';
import {
  ROOMS,
  DOORS,
  START,
  roomAt,
  roomById,
  wallFootprints,
} from '../game/facility-plan';
import type { Side } from '../game/facility-plan';
import { createFacility, createServiceStair } from '../scene/facility';
import { createFireSafety } from '../scene/fire-safety';
import { createExterior } from '../scene/exterior';
import { createDoors } from '../scene/doors';
import { createSkyDome } from '../scene/sky-dome';
import { SKIES } from '../game/skies';
import {
  LOWER_STAIR_GUARDS,
  STAIRS,
  UPPER_STAIR_GUARDS,
  floorAt,
} from '../game/facility-levels';
import {
  PORTALS,
  advanceDoor,
  doorFootprint,
  visibleRooms,
} from '../game/doors';
import type { DoorState } from '../game/doors';
import { BASINS } from '../game/pool-layout';
import { CHANGING_SOLIDS } from '../game/changing-layout';
import { RECEPTION_SOLIDS } from '../game/reception-layout';
import { createFirstPerson } from '../toolkit/controls/input/first-person';
import {
  createRenderer,
  useEnvironment,
} from '../toolkit/components/core/parts/render-style';

/** The walker's yaw that faces each wall. */
const FACING: Record<Side, number> = {
  north: 0,
  east: Math.PI / 2,
  south: Math.PI,
  west: -Math.PI / 2,
};

/**
 * The whole leisure centre as one walkable world, one metre to a scene
 * unit. Rooms load only when occupied or visible through an open door;
 * doors remain present independently of their room models.
 *
 * `?at=<room id>` starts the player in the middle of that room.
 */
export function startFacilityWorld(
  canvas: HTMLCanvasElement,
  hud: HTMLElement,
) {
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  renderer.setClearColor('#20262a');
  const freeEnvironment = useEnvironment(renderer, scene, 0.35);
  scene.add(new HemisphereLight('#dce5e8', '#829397', 0.75));
  const sun = new DirectionalLight('#e8edf0', 0.32);
  sun.position.set(60, 95, -50);
  scene.add(sun);
  const camera = new PerspectiveCamera(65, 1, 0.05, 400);
  const sky = createSkyDome(300);
  scene.add(sky.dome);
  const exterior = createExterior();
  scene.add(exterior.group);
  const facility = createFacility();
  scene.add(facility.group);
  const doors = createDoors();
  scene.add(doors.group);
  const doorStates = new Map<string, DoorState>(
    PORTALS.map((portal) => [portal.id, { open: 0, hold: 0 }]),
  );
  const fireSafety = createFireSafety();
  scene.add(fireSafety.group);
  const stairs = STAIRS.map((s) => createServiceStair(s));
  for (const stair of stairs) scene.add(stair.group);
  const upperWalls = [
    ...wallFootprints(ROOMS, DOORS, 0),
    ...BASINS,
    ...CHANGING_SOLIDS,
    ...RECEPTION_SOLIDS,
    ...UPPER_STAIR_GUARDS,
  ];
  const lowerWalls = [
    ...wallFootprints(ROOMS, DOORS, -3),
    ...LOWER_STAIR_GUARDS,
  ];

  const at = new URLSearchParams(location.search).get('at');
  const startRoom = at && ROOMS.some((r) => r.id === at) ? roomById(at) : null;
  const start =
    at === 'outside'
      ? { x: 130, z: 25, yaw: FACING.west }
      : startRoom
        ? startRoom.id === 'hall'
          ? { x: 76, z: 34, yaw: FACING.west }
          : {
              x: (startRoom.minX + startRoom.maxX) / 2,
              z: (startRoom.minZ + startRoom.maxZ) / 2,
              yaw: FACING[startRoom.card],
            }
        : START;

  const walk = createFirstPerson({
    canvas,
    camera,
    metre: 1,
    floorY: startRoom?.floorY ?? 0,
    floorAt,
    start,
    solids: () => [
      ...(walk.floorY < -1.5 ? lowerWalls : upperWalls),
      ...PORTALS.filter(
        (portal) =>
          portal.kind !== 'open' &&
          Math.abs(portal.floorY - walk.floorY) < 1.1 &&
          (doorStates.get(portal.id)?.open ?? 0) < 0.72,
      ).map(doorFootprint),
    ],
    // Nothing in the rooms works yet.
    use: () => undefined,
    aimed: () => false,
  });

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let shown = '';
  const showRoom = () => {
    const room = roomAt(walk.walker.x, walk.walker.z, ROOMS, walk.floorY);
    const visible = visibleRooms(room?.id ?? 'outside', doorStates);
    facility.show(visible);
    fireSafety.show(visible);
    exterior.shell.visible = !room;
    for (const stair of stairs)
      stair.group.visible = Boolean(
        room && (room.id === 'corridor' || room.id === 'lower-corridor'),
      );
    const title = room?.title ?? 'Outside';
    if (title !== shown) {
      shown = title;
      hud.textContent = title;
    }
  };

  // A development handle for the console: walk to a room by id.
  (window as unknown as { facility: unknown }).facility = {
    rooms: () => ROOMS.map((r) => r.id),
    /** Stand in the middle of a room, facing its title card. */
    goTo(id: string) {
      const r = roomById(id);
      if (r.id === 'hall') {
        walk.place(76, 34, FACING.west, 0);
        return;
      }
      walk.place(
        (r.minX + r.maxX) / 2,
        (r.minZ + r.maxZ) / 2,
        FACING[r.card],
        0,
        undefined,
        r.floorY ?? 0,
      );
    },
    /** Stand at a plan point, on the given floor, looking by yaw and pitch. */
    place(x: number, z: number, yaw = 0, pitch = 0, floor = 0) {
      walk.place(x, z, yaw, pitch, undefined, floor);
    },
    /** Show or hide the fire safety fittings, to measure what they cost. */
    fireSafety(on: boolean) {
      fireSafety.group.visible = on;
    },
    stats: () => ({ ...renderer.info.render }),
    loaded: () => facility.loaded(),
  };

  let last = 0;
  renderer.setAnimationLoop((time) => {
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    for (const portal of PORTALS) {
      const next = advanceDoor(
        portal,
        doorStates.get(portal.id) as DoorState,
        walk.walker.x,
        walk.walker.z,
        walk.floorY,
        delta,
      );
      doorStates.set(portal.id, next);
      doors.setOpen(portal.id, next.open);
    }
    walk.update(delta);
    showRoom();
    sky.dome.position.copy(camera.position);
    sky.set(SKIES.overcast, delta, time / 1000);
    renderer.render(scene, camera);
  });

  return () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    facility.dispose();
    doors.dispose();
    for (const stair of stairs) stair.dispose();
    fireSafety.dispose();
    exterior.dispose();
    sky.dispose();
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { facility?: unknown }).facility;
  };
}
