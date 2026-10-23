import {
  AmbientLight,
  BoxGeometry,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { METRE } from '../../components/core/logic/units';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { partAudio } from '../../components/core/audio/part-audio';
import { createFirstPerson } from '../../controls/input/first-person';
import { knobDirection } from '../../controls/input/knob-turning';
import {
  createPs1Material,
  ps1Uniforms,
} from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';
import {
  createBreezeBlockTextures,
  mapBlockwork,
} from '../../../scene/breeze-block-texture';
import type { Footprint } from '../../controls/logic/walk-collision';
import { registerJoint } from '../logic/door-joins';
import { enterDevRoom } from '../logic/dev-room-links';
import type { RoomId } from '../logic/dev-room-links';
import {
  DOORWAY,
  HALL,
  OPENING,
  PARTITION,
  TANK,
} from '../logic/balance-tank-hall';
import { buildHall, prepareRoom } from './plant/balance-tank-hall';

/**
 * The Olympic pool's balance tank hall, in the building (prompt 033): the
 * hall Dev28 tried, without its plant bay, entered from the Olympic plant
 * room itself through the equipment doors in that room's west wall, which
 * are this hall's partition doors. Seen through and walked through without
 * a break (`door-joins.ts`). Cast concrete below its gantry, blockwork
 * above, under the pool's surround. Metres; the gantry at y = 0, level
 * with the plant room's floor.
 */
export function startTankHall(canvas: HTMLCanvasElement) {
  const m = METRE;
  const self: RoomId = 'tank_hall';
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.4);
  renderer.setClearColor('#262a2b');
  const camera = new PerspectiveCamera(60, 1, 0.05, 80 * m);
  // A little fill: the hall is lit by its own fittings.
  scene.add(
    new AmbientLight('#f2f4f0', 0.12),
    new HemisphereLight('#f6f6f0', '#5d5f58', 0.2),
  );
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);

  // The hall's tank, gantry, pipes, instruments and doors.
  prepareRoom();
  const hall = buildHall(kit, { bay: false });
  room.add(hall.object);

  // Its upper walls, blockwork, round the tank above the gantry, and its soffit.
  const blocks = createBreezeBlockTextures();
  kit.textures.push(blocks.map, blocks.normalMap, blocks.roughnessMap);
  const block = createPs1Material({
    map: blocks.map,
    normalMap: blocks.normalMap,
    roughnessMap: blocks.roughnessMap,
    roughness: 1,
  });
  kit.materials.push(block);
  const t = 0.3;
  const wall = (
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const geometry = new BoxGeometry(sx, sy, sz);
    mapBlockwork(geometry, [x, y, z]);
    const mesh = new Mesh(geometry, block);
    mesh.position.set(x, y, z);
    room.add(mesh);
  };
  const west = TANK.minX - PARTITION;
  const L = TANK.maxX - west;
  const h = HALL.height;
  wall(L + 2 * t, h, t, (west + TANK.maxX) / 2, h / 2, TANK.minZ - t / 2);
  wall(L + 2 * t, h, t, (west + TANK.maxX) / 2, h / 2, TANK.maxZ + t / 2);
  wall(t, h, TANK.maxZ - TANK.minZ, TANK.maxX + t / 2, h / 2, 0);
  wall(
    L + 2 * t,
    0.3,
    TANK.maxZ - TANK.minZ + 2 * t,
    (west + TANK.maxX) / 2,
    h + 0.15,
    0,
  );

  // Walking: the gantry at y = 0; the open water, the walls and the doorway's leaves stop the walker.
  const toMetre = (s: Footprint): Footprint => ({
    minX: s.minX * m,
    maxX: s.maxX * m,
    minZ: s.minZ * m,
    maxZ: s.maxZ * m,
  });
  const d0 = DOORWAY.z - DOORWAY.width / 2;
  const d1 = DOORWAY.z + DOORWAY.width / 2;
  const fixed: Footprint[] = [
    { ...OPENING },
    { minX: west - PARTITION, maxX: TANK.minX, minZ: TANK.minZ, maxZ: d0 },
    { minX: west - PARTITION, maxX: TANK.minX, minZ: d1, maxZ: TANK.maxZ },
    {
      minX: TANK.maxX,
      maxX: TANK.maxX + t,
      minZ: TANK.minZ - t,
      maxZ: TANK.maxZ + t,
    },
    {
      minX: west - t,
      maxX: TANK.maxX + t,
      minZ: TANK.minZ - t,
      maxZ: TANK.minZ,
    },
    {
      minX: west - t,
      maxX: TANK.maxX + t,
      minZ: TANK.maxZ,
      maxZ: TANK.maxZ + t,
    },
  ];
  let seenPlant = false;
  // The doorway: its leaves, and until the plant room is seen through it, a stop just beyond.
  const beyond: Footprint = {
    minX: west - 0.4,
    maxX: west,
    minZ: d0,
    maxZ: d1,
  };
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    // On the gantry just inside the doors, looking out over the water.
    start: { x: (TANK.minX + 0.8) * m, z: DOORWAY.z * m, yaw: Math.PI / 2 },
    floorAt: () => 0,
    solids: () => [
      ...fixed.map(toMetre),
      ...(
        hall.solids?.({ x: walk.walker.x / m, z: walk.walker.z / m }) ?? []
      ).map(toMetre),
      ...(seenPlant ? [] : [toMetre(beyond)]),
    ],
    use: (x, y) => useAt(x, y)?.(),
    aimed: () => Boolean(useAt(0, 0)),
  });
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const useAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(room, true)[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work = hall.parts?.uses.get(o);
      if (work) {
        const at = o;
        return () => work(knobDirection(at, hit.point, camera));
      }
    }
    return null;
  };

  // The doorway to the Olympic plant room: these doors' outer face, +z into the hall.
  const withdraw = registerJoint(self, 'plant_pool_02', {
    frame: { x: west * m, z: DOORWAY.z * m, y: 0, yaw: Math.PI / 2 },
    onOpen: true,
    open: () => hall.doors.open(),
    angle: () => hall.doors.angle(),
    swingTo: (a) => hall.doors.swingTo(a),
    opening: () =>
      toMetre({ minX: west - 2, maxX: west + 0.4, minZ: d0, maxZ: d1 }),
    see: (on) => {
      seenPlant = on;
    },
    peek: (on) => hall.doors.showLeaves(!on),
  });
  let leaving = false;

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    ps1Uniforms.resolution.value.set(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    partAudio.listen(camera, m);
    hall.parts?.update(delta);
    hall.update?.(delta);
    // Out through the doors, once the plant room is seen beyond: handed over to it.
    if (seenPlant && !leaving && !walk.following) {
      const x = walk.walker.x / m;
      const z = walk.walker.z / m;
      if (x < west - 0.05 && z > d0 && z < d1) {
        leaving = true;
        enterDevRoom('plant_pool_02', self, true);
      }
    }
    renderer.render(scene, camera);
  });
  return Object.assign(
    () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      withdraw();
      walk.dispose();
      hall.parts?.dispose();
      disposeKit(kit, scene as unknown as Group);
      freeEnvironment();
      renderer.dispose();
    },
    {
      resume() {
        leaving = false;
      },
    },
  );
}
