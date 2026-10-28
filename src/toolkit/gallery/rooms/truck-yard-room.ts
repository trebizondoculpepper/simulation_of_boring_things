import {
  CanvasTexture,
  CircleGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { METRE } from '../../components/core/logic/units';
import { partAudio } from '../../components/core/audio/part-audio';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { createSectionBoard } from '../../components/core/views/signage';
import { tools } from '../../components/core/views/fitting-tools';
import { createPartSet } from '../../components/core/parts/parts';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';
import { knobDirection } from '../../controls/input/knob-turning';
import { createFirstPerson } from '../../controls/input/first-person';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createSkyDome } from '../../../scene/sky-dome';
import { createSkyChanger } from '../../../game/skies';
import { tarmacMaterial } from '../views/dock-outside';
import { createTractorUnit } from '../../components/loading-dock/views/tractor-unit';
import { createSkeletalTrailer } from '../../components/loading-dock/views/skeletal-trailer';
import {
  rigFootprint,
  rigLayout,
} from '../../components/loading-dock/logic/rig';
import type { BrandId } from '../../components/core/logic/brands';
import { createIsoTankContainer } from '../../components/plant/views/iso-tank-container';
import { createOrangePlate } from '../../components/general-safety/views/dangerous-goods';

/** The tarmac's reach: solid to `solid`, faded into the overcast by `edge`, metres. */
const TARMAC = { solid: 55, edge: 80 };
/** The dock's edge, where the rigs' rear ends stop, and the bays' middles along it. */
const DOCK_Z = -6;
const BAYS = [
  { x: 2.25, label: 'BAY 1 · CHEMICALS' },
  { x: -2.25, label: 'BAY 2 · POWER' },
];

/**
 * Dev50, the delivery trucks (prompt 097): no walls and no roof, a disc of
 * tarmac fading into an overcast sky, as the goods yard does; a painted
 * dock edge and two bays, and in them, reversed up to the edge, two
 * identical Haulmark rigs, a tractor unit and a skeletal trailer each:
 * Chlorella's, carrying its bulk chemical in an ISO tank container, in
 * bay 1, and Voltara's, carrying a containerised generator, in bay 2, as
 * they will back up to the loading dock's two bays.
 */
export function startTruckYardRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.6);
  const camera = new PerspectiveCamera(62, 1, 0.05, 120 * m);
  const kit = createPanelKit();
  const t = tools(kit);
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  const parts = createPartSet();

  // ---- The sky and the day's light ----------------------------------------
  const sky = createSkyDome(100 * m);
  sky.set(createSkyChanger('overcast').step(0), 0, 0);
  sky.dome.frustumCulled = false;
  const eye = new Vector3();
  sky.dome.onBeforeRender = (_r, _s, cam) => {
    cam.getWorldPosition(eye);
    sky.dome.matrixWorld.setPosition(eye);
  };
  scene.add(sky.dome);
  scene.add(new HemisphereLight('#e8ecf0', '#55575a', 1.7));
  const sun = new DirectionalLight('#f2f2ee', 0.9);
  sun.position.set(-20 * m, 40 * m, 25 * m);
  scene.add(sun);

  // ---- The tarmac, fading out ---------------------------------------------
  const tarmac = tarmacMaterial(kit, 160);
  {
    const fade = document.createElement('canvas');
    fade.width = fade.height = 256;
    const g = fade.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(TARMAC.solid / TARMAC.edge, '#ffffff');
    grad.addColorStop(1, '#000000');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const alpha = new CanvasTexture(fade);
    kit.textures.push(alpha);
    tarmac.alphaMap = alpha;
    tarmac.transparent = true;
    tarmac.depthWrite = false;
  }
  kit.materials.push(tarmac);
  const ground = new Mesh(new CircleGeometry(TARMAC.edge, 96), tarmac);
  ground.rotation.x = -Math.PI / 2;
  room.add(ground);

  // ---- The dock's edge and its two bays, painted ------------------------
  const white = t.paint('#e9e8e2', 0.8);
  const yellow = t.paint('#e3b51f', 0.7);
  const paint = (
    material: typeof white,
    w: number,
    d: number,
    x: number,
    z: number,
  ) => t.box(room, material, w, 0.004, d, x, 0.003, z);
  paint(white, 14, 0.15, 0, DOCK_Z);
  for (const x of [6.75, 0, -6.75])
    paint(yellow, 0.1, 20, x === 0 ? 0 : x * (2 / 3), DOCK_Z + 10);
  for (const bay of BAYS) {
    const stencil = t.printed(
      3.2,
      0.5,
      (c, cw, ch) => {
        c.clearRect(0, 0, cw, ch);
        c.fillStyle = '#e9e8e2';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `700 ${ch * 0.62}px "Helvetica Neue", Arial, sans-serif`;
        c.fillText(bay.label, cw / 2, ch / 2, cw * 0.96);
      },
      512,
    );
    (stencil.mesh.material as { transparent: boolean }).transparent = true;
    stencil.mesh.rotation.x = -Math.PI / 2;
    stencil.mesh.position.set(bay.x, 0.005, DOCK_Z - 0.9);
    room.add(stencil.mesh);
  }
  // The room's title, on a sign on two posts beside the dock's edge.
  const sign = createSectionBoard(kit, 'DEV50 · THE DELIVERY TRUCKS', 4.4);
  sign.position.set(-8.5, 2.2, DOCK_Z - 1.5);
  sign.rotation.y = 0.5;
  room.add(sign);
  for (const s of [-1, 1]) {
    const post = t.box(
      room,
      t.paint('#5b5f63', 0.5, 0.4),
      0.08,
      2.4,
      0.08,
      0,
      1.2,
      0,
    );
    post.position.set(
      -8.5 + s * 2.1 * Math.cos(0.5),
      1.2,
      DOCK_Z - 1.5 - s * 2.1 * Math.sin(0.5) - 0.06,
    );
  }

  // ---- The two rigs ------------------------------------------------------
  const layout = rigLayout();
  const rig = (
    x: number,
    operator: BrandId,
    cab: string,
    stripe: string,
    fleet: string,
  ) => {
    const group = new Group();
    group.name = `Rig in bay at ${x}`;
    group.position.set(x, 0, DOCK_Z + 0.3);
    room.add(group);
    const unit = createTractorUnit(kit, { operator, cab, stripe, fleet });
    unit.group.position.z = layout.unit;
    group.add(unit.group);
    for (const part of unit.parts) parts.add(part);
    const trailer = createSkeletalTrailer(kit);
    trailer.group.position.z = layout.kingpin;
    group.add(trailer.group);
    const f = rigFootprint(0.15);
    const solid: Footprint = {
      minX: (x + f.minX) * m,
      maxX: (x + f.maxX) * m,
      minZ: (DOCK_Z + 0.3 + f.minZ) * m,
      maxZ: (DOCK_Z + 0.3 + f.maxZ) * m,
    };
    return { group, trailer, solid };
  };
  const rigs = [
    rig(BAYS[0].x, 'chlorella', '#f3f4f1', '#3f9b3a', 'CC 214'),
    rig(BAYS[1].x, 'voltara', '#f2c014', '#222222', 'VT 08'),
  ];
  // Bay 1's cargo: Chlorella's tank of hypochlorite, its discharge toward
  // the dock.
  {
    const { trailer } = rigs[0];
    const tank = createIsoTankContainer(kit, {
      chemical: 'hypochlorite',
      ground: trailer.seat.y,
      serial: 'CCLU 214006 2',
    });
    tank.group.position.set(0, trailer.seat.y, trailer.seat.z);
    trailer.group.add(tank.group);
    for (const part of tank.parts) parts.add(part);
    // A plain orange plate on the front: the tank's Hazchem plates say
    // what it carries, on its sides and rear.
    const front = createOrangePlate(kit);
    front.position.set(0, 0.42, layout.unit + 5.06);
    rigs[0].group.add(front);
  }

  // ---- Walking and working ------------------------------------------------
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(room, true)[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work = parts.uses.get(o);
      if (work) {
        const at = o;
        return () => work(knobDirection(at, hit.point, camera));
      }
    }
    return null;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    // Behind the dock's edge between the two bays, looking at the cargo.
    room: { x: 0, z: (DOCK_Z - 4) * m, yaw: Math.PI, pitch: -0.05 },
    // Off the chemical rig's side, the whole of it.
    side: {
      x: 12 * m,
      z: (DOCK_Z + 7) * m,
      yaw: -Math.PI / 2 + 0.2,
      pitch: -0.02,
    },
    // In front of both cabs.
    front: { x: 0, z: (DOCK_Z + 25) * m, yaw: 0, pitch: -0.05 },
  };
  const params = new URLSearchParams(location.search);
  const reach = 70 * m;
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start: views[params.get('view') ?? ''] ?? views.room,
    solids: () => [
      ...rigs.map((r) => r.solid),
      // The edge of the world, as the yard has: a ring of walls at its reach.
      ...Array.from({ length: 24 }, (_, i): Footprint => {
        const a = (i / 24) * Math.PI * 2;
        const x = Math.cos(a) * reach;
        const z = Math.sin(a) * reach;
        return {
          minX: x - 9 * m,
          maxX: x + 9 * m,
          minZ: z - 9 * m,
          maxZ: z + 9 * m,
        };
      }),
    ],
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
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
    parts.update(delta);
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    parts.dispose();
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
    suspend: () => parts.setAudible(false),
    resume: () => parts.setAudible(true),
  });
}
