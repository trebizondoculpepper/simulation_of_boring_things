import {
  ACESFilmicToneMapping,
  BoxGeometry,
  CanvasTexture,
  Color,
  CubeCamera,
  DirectionalLight,
  Group,
  HemisphereLight,
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  Raycaster,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLCubeRenderTarget,
} from 'three';
import type { CubeTexture, Material, Texture } from 'three';
import { devPortals, devWalls } from '../logic/dev-room-links';
import type { Footprint } from '../../controls/logic/walk-collision';
import { METRE } from '../../components/core/logic/units';
import { createPortals } from '../views/portals';
import { createFirstPerson } from '../../controls/input/first-person';
import { createRenderer } from '../../components/core/parts/render-style';
import { Water } from '../../vendor/threejs-water/Water';
import { Renderer as WaterRenderer } from '../../vendor/threejs-water/Renderer';
import { NO_WATER_OPTICS } from '../../vendor/threejs-water/water/WaterOptics';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import {
  createCctvCamera,
  createDuck,
} from '../../components/security/views/cctv';
import { duckAt, duckDrift } from '../../components/security/logic/duck';
import {
  CCTV,
  FEED,
  FEED_RATE,
  POOL_CAMERA,
} from '../../components/security/logic/cctv-signal';

/**
 * Dev16, the water prototype: Yong Su's three.js port of Evan Wallace's
 * WebGL Water (`src/toolkit/vendor/threejs-water/`, MIT), tried as the
 * pool of a plain tiled hall. The water is a height field stepped on the
 * GPU; its caustics are traced from the rooflights through the moving
 * surface onto the pool's floor and walls; its surface refracts the tiles
 * below and reflects a picture of the hall (a cube map taken once).
 * Clicking the water drops a ripple into it, and the pool's inlets stir it
 * now and then. Four rubber ducks drift about on it, each on its own
 * path (`logic/duck.ts`), rippling the water as they go, and a CCTV
 * camera high in the hall's north-east corner watches the pool, sending
 * its picture to the monitor in the security office next door (dev18):
 * while that monitor watches, the room keeps its water and its ducks
 * going even when nobody is in it,
 * and sends a picture a few times a second.
 *
 * The library works in its own units: here one is a metre, the pool's
 * middle at the water line, scaled into the room's units by a group. It
 * lights the pool itself (its shaders take the light's direction, not the
 * scene's lights); the hall around it is ordinary three.js.
 */

/**
 * The pool: half its width and length, and its depth, metres. A main pool
 * by default; `?pool=learner` tries a learner pool, 4 × 6 m, nearer the
 * size the library was made for.
 */
const POOLS = {
  main: { halfWidth: 5, halfLength: 10, depth: 1.4, corner: 0.25 },
  learner: { halfWidth: 2, halfLength: 3, depth: 0.9, corner: 0.25 },
};
const POOL =
  new URLSearchParams(globalThis.location?.search ?? '').get('pool') ===
  'learner'
    ? POOLS.learner
    : POOLS.main;
/** The hall, metres: the pool's middle at the origin. */
const HALL = { minX: -9, maxX: 9, minZ: -14, maxZ: 14, height: 7 };
/** The water lies this far below the deck (the library's rim). */
const FREEBOARD = 2 / 12;

/** White glazed tile, 125 mm with grey grout: `tiles` tiles a side. */
function tileTexture(tiles: number, colour = '#f1f5f4', grout = '#b8c4c3') {
  const px = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('No 2D canvas context.');
  c.fillStyle = grout;
  c.fillRect(0, 0, px, px);
  const cell = px / tiles;
  for (let i = 0; i < tiles; i++)
    for (let j = 0; j < tiles; j++) {
      // A faint variation tile to tile, as glazes vary.
      const v = 0.97 + ((i * 7 + j * 13) % 5) * 0.008;
      c.fillStyle = new Color(colour).multiplyScalar(v).getStyle();
      c.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
    }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

export function startWaterRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const id = 'dev16' as const;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  scene.background = new Color('#dfe9e8');
  const camera = new PerspectiveCamera(68, 1, 0.05 * m, 80 * m);

  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  scene.add(new HemisphereLight('#f4fbfb', '#9fb3b1', 1.6));
  const sun = new DirectionalLight('#ffffff', 1.4);
  sun.position.set(2, 10, 3);
  scene.add(sun);

  // The hall: a tiled deck, walls and a pale ceiling with a rooflight.
  const textures: Texture[] = [];
  const materials: Material[] = [];
  const tiled = (w: number, h: number) => {
    const texture = tileTexture(16);
    texture.repeat.set(w / 2, h / 2);
    textures.push(texture);
    const material = new MeshStandardMaterial({
      map: texture,
      roughness: 0.25,
    });
    materials.push(material);
    return material;
  };
  const slab = (
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    room.add(mesh);
    return mesh;
  };
  const W = HALL.maxX - HALL.minX,
    L = HALL.maxZ - HALL.minZ;
  const pw = POOL.halfWidth * 2,
    pl = POOL.halfLength * 2;
  // The deck round the pool: four slabs leaving its hole.
  const side = (W - pw) / 2,
    end = (L - pl) / 2;
  slab(tiled(side, L), side, 0.2, L, HALL.minX + side / 2, -0.1, 0);
  slab(tiled(side, L), side, 0.2, L, HALL.maxX - side / 2, -0.1, 0);
  slab(tiled(pw, end), pw, 0.2, end, 0, -0.1, HALL.minZ + end / 2);
  slab(tiled(pw, end), pw, 0.2, end, 0, -0.1, HALL.maxZ - end / 2);
  const wallH = HALL.height;
  slab(tiled(W, wallH), W, wallH, 0.2, 0, wallH / 2, HALL.minZ - 0.1);
  slab(tiled(W, wallH), W, wallH, 0.2, 0, wallH / 2, HALL.maxZ + 0.1);
  slab(tiled(L, wallH), 0.2, wallH, L, HALL.minX - 0.1, wallH / 2, 0);
  slab(tiled(L, wallH), 0.2, wallH, L, HALL.maxX + 0.1, wallH / 2, 0);
  const ceiling = new MeshStandardMaterial({
    color: '#eef3f2',
    roughness: 0.9,
  });
  materials.push(ceiling);
  slab(ceiling, W, 0.2, L, 0, wallH + 0.1, 0);
  const rooflight = new MeshBasicMaterial({ color: '#ffffff' });
  materials.push(rooflight);
  slab(rooflight, pw * 0.8, 0.05, pl * 0.8, 0, wallH - 0.02, 0);

  // The pool: the library's walls, floor and water surface.
  const pool = new Group();
  pool.position.y = -FREEBOARD;
  room.add(pool);
  const cubeTarget = new WebGLCubeRenderTarget(256, { type: HalfFloatType });
  const water = new Water(renderer);
  const optics = new WaterRenderer(
    renderer,
    tileTexture(16, '#eef7f6', '#b4c6c6'),
    cubeTarget.texture as unknown as CubeTexture,
  );
  optics.setPoolShape(
    'RoundedBox',
    POOL.corner,
    POOL.halfWidth,
    POOL.depth,
    POOL.halfLength,
  );
  optics.setWaterOptics(NO_WATER_OPTICS);
  pool.add(
    optics.getPoolMesh(),
    optics.getWaterMesh(),
    optics.getWaterMeshBack(),
  );
  optics.markWaterOpticsHidden();
  // The rooflight, nearly overhead, for the caustics.
  optics.lightDir.set(0.25, 1, 0.15).normalize();

  // The surface's reflection: a picture of the hall, taken once from over
  // the pool's middle with the pool hidden.
  const cubeCamera = new CubeCamera(0.1 * m, 60 * m, cubeTarget);
  cubeCamera.position.set(0, 1.6 * m, 0);
  scene.add(cubeCamera);
  pool.visible = false;
  cubeCamera.update(renderer, scene);
  pool.visible = true;

  // Some waves to start with.
  for (let i = 0; i < 20; i++)
    water.addDrop(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      0.03,
      i % 2 === 0 ? -0.01 : 0.01,
      POOL.halfWidth,
      POOL.halfLength,
    );

  // The duck, on the water, and the camera watching it from the corner.
  const kit = createPanelKit();
  const DUCKS = 4;
  const ducks = Array.from({ length: DUCKS }, () => createDuck(kit, 0.6));
  for (const duck of ducks) pool.add(duck.group);
  const cctv = createCctvCamera(kit);
  cctv.group.position.set(HALL.maxX - 0.7, 5.2, HALL.minZ);
  room.add(cctv.group);
  {
    // Aimed at the pool's middle, a little toward the far end.
    const at = cctv.group.position;
    const dx = -at.x,
      dy = -FREEBOARD - at.y,
      dz = 2 - (at.z + 0.32);
    cctv.head.rotation.y = Math.atan2(dx, dz);
    cctv.housing.rotation.x = Math.atan2(-dy, Math.hypot(dx, dz));
  }
  cctv.view.near = 0.1 * m;
  cctv.view.far = 60 * m;
  cctv.view.updateProjectionMatrix();
  // Drawn as the room is (its tone mapping, and the water library's own
  // shaders, which write finished colour), into the canvas's corner, read
  // back, then drawn over by the room's own picture.
  const feedPixels = new Uint8Array(FEED.width * FEED.height * 4);
  const feedSize = new Vector2();
  const feedEye = new PerspectiveCamera();
  let feedDue = 0;
  /** Send the camera's picture down its cable. */
  const transmit = (now: number) => {
    const ratio = renderer.getPixelRatio();
    renderer.getSize(feedSize);
    renderer.setViewport(0, 0, FEED.width / ratio, FEED.height / ratio);
    renderer.setScissor(0, 0, FEED.width / ratio, FEED.height / ratio);
    renderer.setScissorTest(true);
    renderer.render(scene, cctv.view);
    const gl = renderer.getContext();
    gl.readPixels(
      0,
      0,
      FEED.width,
      FEED.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      feedPixels,
    );
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, feedSize.x, feedSize.y);
    CCTV.transmit(POOL_CAMERA, {
      width: FEED.width,
      height: FEED.height,
      data: feedPixels.slice(),
      at: now,
    });
  };
  let wake = 0;
  let duckTime = performance.now() / 1000;
  /** Move the ducks on to `now`, rippling the water behind each. */
  const drift = (now: number) => {
    ducks.forEach((duck, n) =>
      duck.place(
        duckAt(now, POOL.halfWidth, POOL.halfLength, n),
        POOL.halfWidth,
        POOL.halfLength,
      ),
    );
    wake -= now - duckTime;
    if (wake <= 0) {
      wake = 0.35;
      ducks.forEach((_, n) => {
        const pose = duckAt(now, POOL.halfWidth, POOL.halfLength, n);
        const speed = duckDrift(
          now - 1,
          now,
          POOL.halfWidth,
          POOL.halfLength,
          n,
        );
        water.addDrop(
          pose.u,
          pose.v,
          0.025,
          0.004 + 0.03 * speed,
          POOL.halfWidth,
          POOL.halfLength,
        );
      });
    }
    duckTime = now;
  };

  // The portal home, and the walker, kept out of the pool.
  const bounds: Footprint = {
    minX: HALL.minX * m,
    maxX: HALL.maxX * m,
    minZ: HALL.minZ * m,
    maxZ: HALL.maxZ * m,
  };
  const walls = devWalls(bounds, m, HALL.height * m);
  const poolSolid: Footprint = {
    minX: -POOL.halfWidth * m,
    maxX: POOL.halfWidth * m,
    minZ: -POOL.halfLength * m,
    maxZ: POOL.halfLength * m,
  };
  const portals = createPortals(id, devPortals(id, bounds, m), 0, m);
  scene.add(portals.group);

  // A click on the water drops a ripple where it lands.
  const raycaster = new Raycaster();
  const surface = new Plane(new Vector3(0, 1, 0), FREEBOARD * m);
  const hit = new Vector3();
  const ripple = (x: number, y: number) => {
    raycaster.setFromCamera(new Vector2(x, y), camera);
    if (!raycaster.ray.intersectPlane(surface, hit)) return null;
    const u = hit.x / m / POOL.halfWidth,
      v = hit.z / m / POOL.halfLength;
    if (Math.abs(u) > 1 || Math.abs(v) > 1) return null;
    return () =>
      water.addDrop(u, v, 0.04, 0.03, POOL.halfWidth, POOL.halfLength);
  };
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    start: { x: 0, z: 0 },
    solids: () => [...walls, poolSolid],
    use: (x, y) => ripple(x, y)?.(),
    aimed: () => Boolean(ripple(0, 0)),
  });
  const arrival = portals.arrival(
    new URLSearchParams(location.search).get('from'),
  );
  const start = arrival ?? {
    x: (HALL.minX + 2) * m,
    z: (HALL.maxZ - 2) * m,
    yaw: 0.6,
    pitch: -0.2,
  };
  walk.place(start.x, start.z, start.yaw, start.pitch);

  // The eye, as the library's shaders want it: in the pool's own units.
  const eye = new PerspectiveCamera();
  let sized = false;
  const resize = () => {
    const { width: w, height: h } = canvas.getBoundingClientRect();
    if (!w || !h) {
      // Built unseen, for its camera: sized for that until it is shown.
      if (!sized) optics.setSize(640, 480);
      return;
    }
    sized = true;
    renderer.setSize(Math.round(w), Math.round(h), false);
    optics.setSize(Math.round(w), Math.round(h));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let last = 0;
  let stir = 0;
  let frameMs = 0;
  renderer.setAnimationLoop((time) => {
    const now = time / 1000;
    if (canvas.parentElement?.hidden) {
      last = 0;
      // Unseen, it runs only for a monitor watching its camera.
      if (!CCTV.watched(POOL_CAMERA)) return;
      drift(now);
      water.stepSimulation(POOL.halfWidth, POOL.halfLength);
      water.stepSimulation(POOL.halfWidth, POOL.halfLength);
      water.updateNormals(POOL.halfWidth, POOL.halfLength);
      if (now < feedDue) return;
      feedDue = now + 1 / FEED_RATE;
      room.updateMatrixWorld();
      feedEye.position.copy(
        pool.worldToLocal(cctv.view.getWorldPosition(new Vector3())),
      );
      feedEye.updateMatrixWorld();
      optics.updateCaustics(water);
      optics.renderPool(water);
      optics.renderWater(water, feedEye);
      transmit(now);
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    if (last) frameMs += (time - last - frameMs) * 0.05;
    last = time;
    walk.update(delta);
    portals.update(delta, walk.walker.x, walk.walker.z, !walk.following);
    drift(now);
    // The inlets stir the water now and then, along the pool's sides.
    stir -= delta;
    if (stir <= 0) {
      stir = 0.6 + Math.random() * 0.8;
      water.addDrop(
        Math.random() < 0.5 ? -0.92 : 0.92,
        Math.random() * 1.6 - 0.8,
        0.02,
        0.008,
        POOL.halfWidth,
        POOL.halfLength,
      );
    }
    water.stepSimulation(POOL.halfWidth, POOL.halfLength);
    water.stepSimulation(POOL.halfWidth, POOL.halfLength);
    water.updateNormals(POOL.halfWidth, POOL.halfLength);
    camera.updateMatrixWorld();
    pool.updateMatrixWorld();
    eye.position.copy(
      pool.worldToLocal(camera.getWorldPosition(new Vector3())),
    );
    eye.updateMatrixWorld();
    optics.updateObjectTextures(scene, camera, null);
    optics.updateCaustics(water);
    optics.renderPool(water);
    optics.renderWater(water, eye);
    if (CCTV.watched(POOL_CAMERA) && now >= feedDue) {
      feedDue = now + 1 / FEED_RATE;
      transmit(now);
    }
    renderer.render(scene, camera);
  });

  // A development handle for the console.
  (window as unknown as { waterRoom: unknown }).waterRoom = {
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    drop(u: number, v: number, strength = 0.03) {
      water.addDrop(u, v, 0.04, strength, POOL.halfWidth, POOL.halfLength);
    },
    light(x: number, y: number, z: number) {
      optics.lightDir.set(x, y, z).normalize();
    },
    stats: () => ({ frameMs: Math.round(frameMs * 10) / 10 }),
  };

  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    cubeTarget.dispose();
    for (const t of kit.textures) t.dispose();
    for (const material of kit.materials) material.dispose();
    for (const t of textures) t.dispose();
    for (const material of materials) material.dispose();
    room.traverse((o) => {
      if (o instanceof Mesh) o.geometry.dispose();
    });
    renderer.dispose();
    delete (window as unknown as { waterRoom?: unknown }).waterRoom;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const pose = portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
  });
}
