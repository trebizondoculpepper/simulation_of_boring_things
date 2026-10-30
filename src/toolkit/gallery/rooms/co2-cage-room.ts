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
  layoutSize,
} from '../../components/core/parts/render-style';
import { knobDirection } from '../../controls/input/knob-turning';
import { createFirstPerson } from '../../controls/input/first-person';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createSkyDome } from '../../../scene/sky-dome';
import { createSkyChanger } from '../../../game/skies';
import { tarmacMaterial } from '../views/dock-outside';
import { createLpgCagePart } from '../../components/loading-dock/parts/lpg-cage';
import { createCo2SupplyPart } from '../../components/plant/parts/co2-supply';
import { CO2_CAGE } from '../../components/plant/views/co2-cage';
import { createMicroLabel } from '../../components/core/views/eighties-controls';
import { newCo2Supply } from '../../components/plant/logic/co2-supply';
import {
  createCylinderTrolley,
  createGasCylinder,
} from '../../components/plant/views/gas-cylinder';
import type {
  GasCylinderSpec,
  GasCylinderView,
} from '../../components/plant/views/gas-cylinder';
import { GAS_IDS } from '../../components/plant/logic/gas-cylinders';
import { createMeshCagePart } from '../../components/architectural/parts/mesh-cage';
import type { MeshCageSpec } from '../../components/architectural/logic/mesh-cage';
import { createInspector } from '../views/inspect-pick';
import { markComponent } from '../../components/core/views/component-identity';

/** The tarmac's reach: solid to `solid`, faded into the overcast by `edge`, metres. */
const TARMAC = { solid: 30, edge: 45 };
/** The building's wall: its outside face at z = 0, the yard at +z. */
const WALL = { w: 12, h: 4.5, t: 0.3 };

/**
 * Dev55, the CO₂ cage (mission 109, stage 1): a stretch of the building's
 * outside wall on the goods yard's tarmac, the forklift propane cage as
 * the yard has it, and beside it the CO₂ cylinder cage, working: its two
 * banks' gauges, flags and changeover lever, its regulator's outlet, the
 * line along the wall to the wall inlet port and its emergency isolation
 * valve. A trial button draws CO₂ by hand, as a dosing plant room will,
 * so the changeover can be watched; another sets it back to full.
 *
 * In front, the shared gas cylinder builder's lineup (`gas-cylinder.ts`,
 * the owner, 2026-10-30): one of each gas the supplier fills, then a few
 * other sizes, chained to a rail; east of the CO₂ cage a small cage of
 * oxygen, nitrogen and argon chained upright; and a trolley with the
 * welder's pair, oxygen and acetylene, lying in its cradle.
 */
export function startCo2CageRoom(canvas: HTMLCanvasElement) {
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

  // ---- The wall, the propane cage and the CO₂ cage ---------------------
  t.box(
    room,
    t.paint('#8b8780', 0.9),
    WALL.w,
    WALL.h,
    WALL.t,
    0,
    WALL.h / 2,
    -WALL.t / 2,
  );
  const lpg = parts.add(createLpgCagePart(kit));
  lpg.object.position.set(-4.6, 0, 0.45);
  room.add(lpg.object);
  const cageZ = CO2_CAGE.gap + CO2_CAGE.d / 2;
  let co2 = parts.add(createCo2SupplyPart(kit));
  co2.object.position.set(0, 0, cageZ);
  room.add(co2.object);
  const sign = createSectionBoard(kit, 'DEV55 · THE CO₂ CAGE', 3.6);
  sign.position.set(0, 3.7, 0.03);
  room.add(sign);
  // The trial buttons: draw 20 kg, as a plant room's dosing will; refill.
  const trial = (x: number, text: string, colour: string, use: () => void) => {
    const post = t.box(
      room,
      t.paint('#5b5f63', 0.5, 0.4),
      0.06,
      1.1,
      0.06,
      x,
      0.55,
      cageZ + 1.5,
    );
    void post;
    const button = t.box(
      room,
      t.paint(colour, 0.5),
      0.22,
      0.12,
      0.08,
      x,
      1.12,
      cageZ + 1.5,
    );
    const label = createMicroLabel(kit, text, {
      height: 0.035,
      ink: '#111111',
      plate: '#f2f2ee',
    });
    label.position.set(x, 1.24, cageZ + 1.55);
    room.add(label);
    parts.uses.set(button, use);
  };
  trial(4.4, 'TRIAL: DRAW 20 kg', '#e3b51f', () => co2.draw(20));
  trial(5.0, 'TRIAL: FULL AGAIN', '#3f9b3a', () => {
    parts.remove(co2);
    room.remove(co2.object);
    co2 = parts.add(createCo2SupplyPart(kit, newCo2Supply()));
    co2.object.position.set(0, 0, cageZ);
    room.add(co2.object);
  });

  // ---- The cylinder builder's lineups --------------------------------
  // One of each gas on a plinth west of the wall's end, facing east; other
  // sizes on one east of it, facing west; each chained to its rail.
  const gases = GAS_IDS.map((gas): GasCylinderSpec => ({ gas }));
  const sizes: GasCylinderSpec[] = [
    { gas: 'oxygen', size: 'V20', contents: 'in-use' },
    { gas: 'oxygen', size: 'Z10' },
    { gas: 'oxygen', size: 'X2', contents: 'empty' },
    { gas: 'co2', size: 'Z10', contents: 'in-use' },
    { gas: 'co2', size: 'X2' },
    { gas: 'nitrogen', size: 'V20' },
    { gas: 'propane', size: 'P19', contents: 'empty' },
    { gas: 'propane', size: 'P13' },
    { gas: 'propane', size: 'F18', contents: 'in-use' },
    { gas: 'butane', size: 'B7' },
  ];
  const lined: GasCylinderView[] = [];
  const rows: Footprint[] = [];
  const LINE = { x: 7.4, z: 0.9 };
  const standRow = (specs: GasCylinderSpec[], side: -1 | 1, title: string) => {
    const row = new Group();
    // The row's own frame: along x, its labels facing +z, turned to face
    // the wall's middle from its end of the yard.
    row.position.x = side * LINE.x;
    row.rotation.y = (-side * Math.PI) / 2;
    room.add(row);
    const cylinders = specs.map((spec) => createGasCylinder(kit, spec));
    const gap = 0.14;
    const width = cylinders.reduce((w, c) => w + c.radius * 2 + gap, -gap);
    const rail = t.paint('#a9aeae', 0.45, 0.6);
    // A concrete plinth, a rail on posts behind, a chain across.
    t.box(row, t.paint('#9d9a92', 0.95), width + 0.4, 0.06, 0.6, 0, 0.03, 0);
    for (const px of [-width / 2 - 0.1, 0, width / 2 + 0.1])
      t.box(row, rail, 0.05, 1.2, 0.05, px, 0.6, -0.27);
    t.box(row, rail, width + 0.25, 0.04, 0.03, 0, 1.0, -0.27);
    t.box(
      row,
      t.paint('#4a4a4a', 0.5, 0.7),
      width + 0.2,
      0.012,
      0.012,
      0,
      0.32,
      0.21,
    );
    // Lay the row from the wall's line outwards.
    let x = -side * (width / 2);
    for (const c of cylinders) {
      x += side * c.radius;
      c.group.position.set(x, 0.06, 0);
      row.add(c.group);
      const k = c.kind;
      const plate = createMicroLabel(kit, `${k.gas.formula}\n${k.size.id}`, {
        height: 0.03,
        ink: '#111111',
        plate: '#f2f2ee',
      });
      plate.position.set(x, 0.03, 0.302);
      row.add(plate);
      x += side * (c.radius + gap);
      lined.push(c);
    }
    const sign = createMicroLabel(kit, title, {
      height: 0.05,
      ink: '#f2f2ee',
      plate: '#1f5f8b',
    });
    sign.position.set(0, 1.12, -0.25);
    row.add(sign);
    // Its plinth, in the yard's frame, from the wall's line outwards,
    // kept clear of the walker.
    row.position.z = LINE.z + width / 2;
    rows.push({
      minX: (side * LINE.x - 0.35) * m,
      maxX: (side * LINE.x + 0.35) * m,
      minZ: (LINE.z - 0.25) * m,
      maxZ: (LINE.z + width + 0.25) * m,
    });
  };
  standRow(
    gases,
    -1,
    'ARNCLIFFE GASES · ONE OF EACH GAS (BS EN 1089-3, BS EN ISO 7225)',
  );
  standRow(sizes, 1, 'ARNCLIFFE GASES · CYLINDER SIZES');

  // A small cage east of the CO₂ cage: oxygen, nitrogen and argon, chained upright.
  const SMALL_CAGE: MeshCageSpec = {
    w: 1.5,
    d: 0.8,
    h: 1.9,
    door: { side: 'front', at: 0, width: 0.7, hinge: 'left', opens: 'out' },
    roof: true,
    base: 'plates',
  };
  const smallCage = parts.add(
    createMeshCagePart(kit, SMALL_CAGE, { name: 'Industrial gas cage' }),
  );
  smallCage.object.position.set(4.6, 0, 0.45);
  room.add(smallCage.object);
  (['oxygen', 'nitrogen', 'argon'] as const).forEach((gas, i) => {
    const c = createGasCylinder(kit, {
      gas,
      contents: i === 2 ? 'empty' : 'full',
    });
    c.group.position.set(-0.45 + i * 0.45, 0.01, -0.12);
    smallCage.object.add(c.group);
  });
  t.box(
    smallCage.object,
    t.paint('#4a4a4a', 0.5, 0.7),
    1.3,
    0.012,
    0.012,
    0,
    1.0,
    0.01,
  );

  // A trolley with the welder's pair lying in its cradle.
  const trolley = createCylinderTrolley(kit);
  markComponent(trolley, { name: 'Cylinder trolley', decorative: true });
  trolley.position.set(1.6, 0, 3.4);
  trolley.rotation.y = 0.3;
  room.add(trolley);
  (['oxygen', 'acetylene'] as const).forEach((gas, i) => {
    const c = createGasCylinder(kit, { gas, contents: 'in-use' });
    // Lying with its valve to the handle's end (+x).
    c.group.rotation.z = -Math.PI / 2;
    c.group.position.set(-0.75, 0.21 + c.radius, (i ? 1 : -1) * 0.13);
    trolley.add(c.group);
  });

  const stateFor = () => co2.supply;
  Object.assign(window, {
    co2Supply: {
      state: stateFor,
      draw: (kg: number) => co2.draw(kg),
      door: (open: boolean) => co2.cage.setOpen(open),
      lpgDoor: (open: boolean) => lpg.setOpen(open),
    },
    gasCylinders: () =>
      lined.map((c) => `${c.group.name} - ${c.kind.gas.name} ${c.contents}`),
  });

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
    // Out in the yard, the wall and both cages.
    room: { x: 0, z: 7.5 * m, yaw: 0, pitch: -0.08 },
    // At the cage's front, the manifold through the mesh.
    close: { x: 0, z: 3.0 * m, yaw: 0, pitch: -0.1 },
    // By the wall inlet and its isolation valve.
    // The west end and the front from outside, a corner between.
    corner: { x: -4.2 * m, z: 3.4 * m, yaw: 0.75, pitch: -0.12 },
    // The east end, the empty bay's side, from outside.
    east: { x: 5.2 * m, z: 2.6 * m, yaw: -0.95, pitch: -0.1 },
    inlet: { x: 4.6 * m, z: 3.6 * m, yaw: -0.55, pitch: 0 },
    // The cylinder builder's lineup, close.
    lineup: { x: -2.9 * m, z: 3.6 * m, yaw: -Math.PI / 2, pitch: -0.12 },
    // Close to the lineup's CO₂ cylinder: its labels, and the overlay's name.
    label: { x: -6.5 * m, z: 2.13 * m, yaw: -Math.PI / 2, pitch: -0.3 },
    // The propane cage's empties.
    lpg: { x: -4.6 * m, z: 2.4 * m, yaw: 0, pitch: -0.45 },
    // The other sizes, east.
    sizes: { x: 4.0 * m, z: 3.4 * m, yaw: Math.PI / 2, pitch: -0.18 },
    // The small cage and the trolley.
    trolley: { x: 1.2 * m, z: 5.6 * m, yaw: 0, pitch: -0.35 },
  };
  const params = new URLSearchParams(location.search);
  const reach = 30 * m;
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start: views[params.get('view') ?? ''] ?? views.room,
    solids: () => [
      {
        minX: (-WALL.w / 2) * m,
        maxX: (WALL.w / 2) * m,
        minZ: -WALL.t * m,
        maxZ: (cageZ + CO2_CAGE.d / 2 + 0.1) * m,
      },
      // The lineups' plinths.
      ...rows,
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
    // What is aimed at, named in the help line: each cylinder's gas and tag.
    inspect: createInspector({ root: room, camera, metre: m }),
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
    parts.update(delta);
    partAudio.listen(camera, m, scene);
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
