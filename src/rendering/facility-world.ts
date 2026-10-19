import { HemisphereLight, PerspectiveCamera, Scene } from 'three';
import {
  ROOMS,
  START,
  roomAt,
  roomById,
  wallFootprints,
} from '../game/facility-plan';
import type { Side } from '../game/facility-plan';
import { createFacility } from '../scene/facility';
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
 * unit. Every room stays built while the player is elsewhere: there is
 * one scene, and the rooms are joined by open doorways.
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
  const freeEnvironment = useEnvironment(renderer, scene, 0.55);
  scene.add(new HemisphereLight('#ffffff', '#9aa3a6', 1.6));
  const camera = new PerspectiveCamera(65, 1, 0.05, 400);
  const facility = createFacility();
  scene.add(facility.group);
  const walls = wallFootprints();

  const at = new URLSearchParams(location.search).get('at');
  const startRoom = at && ROOMS.some((r) => r.id === at) ? roomById(at) : null;
  const start = startRoom
    ? {
        x: (startRoom.minX + startRoom.maxX) / 2,
        z: (startRoom.minZ + startRoom.maxZ) / 2,
        yaw: FACING[startRoom.card],
      }
    : START;

  const walk = createFirstPerson({
    canvas,
    camera,
    metre: 1,
    floorY: 0,
    start,
    solids: () => walls,
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
    const room = roomAt(walk.walker.x, walk.walker.z);
    const title = room?.title ?? '';
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
      walk.place(
        (r.minX + r.maxX) / 2,
        (r.minZ + r.maxZ) / 2,
        FACING[r.card],
        0,
      );
    },
    stats: () => ({ ...renderer.info.render }),
  };

  let last = 0;
  renderer.setAnimationLoop((time) => {
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    showRoom();
    renderer.render(scene, camera);
  });

  return () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    facility.dispose();
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { facility?: unknown }).facility;
  };
}
