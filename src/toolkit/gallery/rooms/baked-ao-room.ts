import {
  AmbientLight,
  Group,
  HemisphereLight,
  PerspectiveCamera,
  PointLight,
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
import { createSectionBoard } from '../../components/core/views/signage';
import { tools } from '../../components/core/views/fitting-tools';
import {
  createRenderer,
  useEnvironment,
  layoutSize,
} from '../../components/core/parts/render-style';
import { mergeStatic } from '../../components/core/views/merge-static';
import { createFirstPerson } from '../../controls/input/first-person';
import { bakeRoomAo, bakeStats } from '../../baking/baked-ao';
import { clearBakes } from '../../baking/ao-cache';

/** The room inside, metres. */
const ROOM = { w: 12, d: 9, h: 4, wall: 0.25 };

/**
 * Dev56, baked ambient occlusion (the owner, 2026-10-30): a plain room of
 * walls, columns, a tank, crates, shelving and a pipe run on brackets,
 * all static and merged, its ambient occlusion baked in the background
 * worker and faded in once ready. No live AO. The red button on the post
 * turns the bake off and on, to compare; `?bake=fresh` bakes again
 * though cached.
 */
export function startBakedAoRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.35);
  const camera = new PerspectiveCamera(62, 1, 0.05, 60 * m);
  const kit = createPanelKit();
  const t = tools(kit);
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  // Mostly ambient light, which is what the bake darkens; two lamps for shape.
  scene.add(new HemisphereLight('#f4f2ec', '#5d5a55', 1.6));
  scene.add(new AmbientLight('#ffffff', 0.35));
  for (const x of [-3, 3]) {
    const lamp = new PointLight('#fff4e0', 6, 9 * m, 2);
    lamp.position.set(x * m, (ROOM.h - 0.3) * m, 0);
    scene.add(lamp);
  }

  // ---- The static room ------------------------------------------------------
  const shell = new Group();
  room.add(shell);
  const { w, d, h, wall } = ROOM;
  const plaster = t.paint('#d9d4ca', 0.9);
  const floor = t.paint('#8d8a84', 0.85);
  const steel = t.paint('#6f7880', 0.45, 0.6);
  const blue = t.paint('#2f5f8f', 0.6);
  const wood = t.paint('#a07a4c', 0.8);
  t.box(shell, floor, w + 2 * wall, wall, d + 2 * wall, 0, -wall / 2, 0);
  t.box(shell, plaster, w + 2 * wall, wall, d + 2 * wall, 0, h + wall / 2, 0);
  t.box(shell, plaster, w + 2 * wall, h, wall, 0, h / 2, -d / 2 - wall / 2);
  t.box(shell, plaster, w + 2 * wall, h, wall, 0, h / 2, d / 2 + wall / 2);
  t.box(shell, plaster, wall, h, d, -w / 2 - wall / 2, h / 2, 0);
  t.box(shell, plaster, wall, h, d, w / 2 + wall / 2, h / 2, 0);
  // Two columns, a plinth and a tank on it.
  for (const x of [-2, 2]) t.box(shell, plaster, 0.45, h, 0.45, x, h / 2, 1.2);
  t.box(shell, floor, 2.4, 0.2, 2.4, 4, 0.1, -2.5);
  t.cyl(shell, blue, 0.9, 2.6, 4, 1.5, -2.5, 'y', 32);
  // Crates in the corner, stacked.
  t.box(shell, wood, 0.8, 0.8, 0.8, -5.5, 0.4, -4);
  t.box(shell, wood, 0.8, 0.8, 0.8, -4.65, 0.4, -4);
  t.box(shell, wood, 0.8, 0.8, 0.8, -5.5, 0.4, -3.15);
  t.box(shell, wood, 0.8, 0.8, 0.8, -5.1, 1.2, -3.7);
  // Shelving along the west wall.
  for (const z of [0.5, 2.5])
    t.box(shell, steel, 0.05, 2.2, 0.5, -5.72, 1.1, z);
  for (const y of [0.15, 0.85, 1.55, 2.2])
    t.box(shell, steel, 0.5, 0.04, 2.05, -5.72, y, 1.5);
  for (const [y, z] of [
    [0.3, 0.9],
    [0.3, 1.6],
    [1.0, 2.0],
    [1.7, 1.1],
  ] as const)
    t.box(shell, blue, 0.4, 0.26, 0.35, -5.72, y, z);
  // A pipe run on brackets along the north wall, and a low table.
  for (const x of [-4, -1, 2, 5])
    t.box(shell, steel, 0.06, 0.4, 0.3, x, 2.6, -4.35);
  t.cyl(shell, steel, 0.12, 11.5, 0, 2.55, -4.25, 'x', 20);
  t.cyl(shell, steel, 0.08, 11.5, 0, 2.95, -4.3, 'x', 16);
  t.box(shell, wood, 1.6, 0.06, 0.8, 0, 0.75, -1.5);
  for (const [x, z] of [
    [-0.75, -1.85],
    [0.75, -1.85],
    [-0.75, -1.15],
    [0.75, -1.15],
  ] as const)
    t.box(shell, steel, 0.05, 0.72, 0.05, x, 0.36, z);
  const sign = createSectionBoard(kit, 'DEV56 · BAKED AMBIENT OCCLUSION', 4.4);
  sign.position.set(0, 3.3, -d / 2 + 0.03);
  room.add(sign);
  room.updateMatrixWorld(true);
  mergeStatic(shell, 3);

  // ---- The comparison button --------------------------------------------
  const uses = new Map<Object3D, () => void>();
  t.box(room, steel, 0.06, 1.1, 0.06, 1.5, 0.55, 3);
  const button = t.box(
    room,
    t.paint('#c8322a', 0.5),
    0.22,
    0.12,
    0.08,
    1.5,
    1.12,
    3,
  );
  button.userData.bakeAo = false;

  const ao = bakeRoomAo(room, {
    roomId: 'dev56',
    unit: m,
    compile: (object) => renderer.compileAsync(object, camera, scene),
  });
  let shown = new URLSearchParams(location.search).get('ao') !== 'off';
  if (!shown) ao.setShown(false);
  uses.set(button, () => {
    shown = !shown;
    ao.setShown(shown);
  });
  void ao.ready.then((stat) => {
    if (stat)
      console.info(
        `Baked AO dev56: ${stat.cached ? 'from the cache' : 'baked'} in ${Math.round(stat.ms)} ms, ${stat.vertices} vertices, ${stat.rays} rays`,
      );
  });
  Object.assign(window, {
    bakedAo: {
      handle: ao,
      scene,
      stats: bakeStats,
      show: (on: boolean) => ao.setShown(on),
      clear: clearBakes,
    },
  });

  // ---- Walking and working ------------------------------------------------
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(room, true)[0];
    if (!hit || hit.distance > 3 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work = uses.get(o);
      if (work) return work;
    }
    return null;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    room: { x: 0, z: 4 * m, yaw: 0, pitch: -0.12 },
    corner: { x: -2.5 * m, z: 0, yaw: 0.9, pitch: -0.25 },
    tank: { x: 1.5 * m, z: 0.5 * m, yaw: -0.7, pitch: -0.15 },
  };
  const half = (s: number) => (s / 2) * m;
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start:
      views[new URLSearchParams(location.search).get('view') ?? ''] ??
      views.room,
    solids: () => [
      { minX: -half(w) - m, maxX: -half(w), minZ: -half(d), maxZ: half(d) },
      { minX: half(w), maxX: half(w) + m, minZ: -half(d), maxZ: half(d) },
      { minX: -half(w), maxX: half(w), minZ: -half(d) - m, maxZ: -half(d) },
      { minX: -half(w), maxX: half(w), minZ: half(d), maxZ: half(d) + m },
      { minX: 2.8 * m, maxX: 5.2 * m, minZ: -3.7 * m, maxZ: -1.3 * m },
    ],
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
  });
  const resize = () => {
    const { width, height } = layoutSize(canvas);
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // ---- Each frame ----------------------------------------------------------
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    ao.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
  };
  return Object.assign(dispose, {
    enter() {
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) walk.place(view.x, view.z, view.yaw, view.pitch);
    },
  });
}
