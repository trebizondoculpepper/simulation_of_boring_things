import {
  AmbientLight,
  CanvasTexture,
  Color,
  DoubleSide,
  Fog,
  GridHelper,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Sprite,
  SpriteMaterial,
  BoxGeometry,
} from 'three';
import type { Object3D } from 'three';
import {
  makeSharedPlantLayout,
  sharedGantryFloor,
} from '../game/shared-plant-layout';
import { EXHIBITS as BOILER } from '../toolkit/gallery/rooms/plant/boiler';
import { EXHIBITS as BALANCE } from '../toolkit/gallery/rooms/plant/balance';
import { EXHIBITS as CHEMICALS } from '../toolkit/gallery/rooms/plant/chemicals';
import { EXHIBITS as AIR } from '../toolkit/gallery/rooms/plant/air';
import { EXHIBITS as ELECTRICAL } from '../toolkit/gallery/rooms/plant/electrical';
import { EXHIBITS as CONTROL } from '../toolkit/gallery/rooms/plant/control';
import type { PlantExhibit } from '../toolkit/gallery/rooms/plant/exhibit';
import { isLive } from '../toolkit/gallery/rooms/plant/exhibit';
import {
  createPanelKit,
  disposeKit,
} from '../toolkit/components/core/views/eighties-controls';
import {
  createRenderer,
  layoutSize,
} from '../toolkit/components/core/parts/render-style';
import { createFirstPerson } from '../toolkit/controls/input/first-person';
import { METRE } from '../toolkit/components/core/logic/units';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import { createSectionalTank } from '../toolkit/components/plant/views/balance-plant';

const EXHIBITS: readonly PlantExhibit[] = [
  ...BOILER,
  ...BALANCE,
  ...CHEMICALS,
  ...AIR,
  ...ELECTRICAL,
  ...CONTROL,
];
const PALETTE: Record<string, string> = {
  utilities: '#698caa',
  boilers: '#c77a51',
  electrical: '#d9ba62',
  chemicals: '#accb69',
  loading_bay: '#b5aba0',
  balance: '#64adc1',
  water_services: '#8bc2bd',
  air: '#9db991',
  control: '#b9a6c9',
  office: '#c7b18b',
};
function label(text: string, width: number, color = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(18,28,34,.92)';
  ctx.fillRect(0, 0, 1024, 128);
  ctx.fillStyle = color;
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 64, 980);
  const texture = new CanvasTexture(canvas);
  const sprite = new Sprite(
    new SpriteMaterial({ map: texture, depthTest: true }),
  );
  // The whole world is scaled by METRE below; sprites use local metres here.
  sprite.scale.set(width, width / 8, 1);
  return sprite;
}
export function startSharedPlantLayout(canvas: HTMLCanvasElement) {
  const layout = makeSharedPlantLayout();
  const scene = new Scene();
  scene.background = new Color('#e5e9e9');
  scene.fog = new Fog('#e5e9e9', 24 * METRE, 95 * METRE);
  scene.add(
    new AmbientLight('#ffffff', 1.4),
    new HemisphereLight('#ffffff', '#aebfc5', 1.8),
  );
  const renderer = createRenderer(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor('#e5e9e9');
  const camera = new PerspectiveCamera(66, 1, 0.05, 1000 * METRE);
  const world = new Group();
  world.scale.setScalar(METRE);
  scene.add(world);
  const plane = new Mesh(
    new PlaneGeometry(600, 600),
    new MeshStandardMaterial({
      color: '#d9dfde',
      roughness: 1,
      side: DoubleSide,
    }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.035;
  world.add(plane);
  const grid = new GridHelper(600, 600, '#9dadb0', '#c5cfd0');
  grid.position.y = -0.025;
  world.add(grid);
  const kit = createPanelKit();
  const live: { update?(delta: number): void; dispose?(): void }[] = [];
  const floorMaterials: MeshBasicMaterial[] = [];
  const solids: Footprint[] = [];
  const elevatedBarriers: Footprint[] = [];
  const machineTags: Sprite[] = [];
  const lodEntries: {
    detail: Object3D;
    simple: Mesh;
    x: number;
    z: number;
    range: number;
  }[] = [];
  const box = (
    w: number,
    h: number,
    d: number,
    color: string,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(
      new BoxGeometry(w, h, d),
      new MeshStandardMaterial({ color, roughness: 0.7 }),
    );
    mesh.position.set(x, y, z);
    world.add(mesh);
    return mesh;
  };
  for (const zone of layout.zones) {
    const color = PALETTE[zone.id];
    const mat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.19,
      depthWrite: false,
    });
    floorMaterials.push(mat);
    const pad = new Mesh(new PlaneGeometry(zone.w, zone.d), mat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(zone.x + zone.w / 2, 0.005, zone.z + zone.d / 2);
    world.add(pad);
    const edgeColor = '#5c6e76';
    box(zone.w, 0.035, 0.055, edgeColor, zone.x + zone.w / 2, 0.03, zone.z);
    box(
      zone.w,
      0.035,
      0.055,
      edgeColor,
      zone.x + zone.w / 2,
      0.03,
      zone.z + zone.d,
    );
    box(0.055, 0.035, zone.d, edgeColor, zone.x, 0.03, zone.z + zone.d / 2);
    box(
      0.055,
      0.035,
      zone.d,
      edgeColor,
      zone.x + zone.w,
      0.03,
      zone.z + zone.d / 2,
    );
    const heading = label(zone.label, 4.5, '#ffffff');
    heading.position.set(zone.x + zone.w / 2, 3.4, zone.z + 1.0);
    world.add(heading);
    for (const machine of zone.machines) {
      const m = EXHIBITS.find((e) => e.title === machine.model);
      let object: Object3D;
      if (machine.id.startsWith('balance-')) {
        object = createSectionalTank(kit, {
          nx: Math.max(1, Math.floor(machine.w - 0.25)),
          nz: Math.max(1, Math.floor(machine.d - 0.25)),
          ny: 3,
          brand: 'gorskiy',
        }).group;
      } else if (m) {
        const built = m.build(kit);
        object = isLive(built) ? built.object : built;
        if (isLive(built)) live.push(built);
      } else {
        object = new Mesh(
          new BoxGeometry(machine.w, machine.h, machine.d),
          new MeshStandardMaterial({ color: '#819aa5', roughness: 0.72 }),
        );
        object.position.y = machine.h / 2;
      }
      object.position.x = machine.x;
      object.position.z = machine.z;
      world.add(object);
      if (!machine.proxy) {
        const simple = box(
          machine.w,
          machine.h,
          machine.d,
          color,
          machine.x,
          machine.h / 2,
          machine.z,
        );
        simple.visible = false;
        lodEntries.push({
          detail: object,
          simple,
          x: machine.x,
          z: machine.z,
          range:
            machine.zone === 'electrical'
              ? 8
              : machine.zone === 'balance'
                ? 22
                : 16,
        });
      }
      // A pale pad marks the service envelope, distinct from the actual machine footprint.
      const service = new Mesh(
        new PlaneGeometry(machine.allowance.w, machine.allowance.d),
        new MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        }),
      );
      service.rotation.x = -Math.PI / 2;
      service.position.set(machine.x, 0.013, machine.z);
      world.add(service);
      const tag = label(
        machine.label,
        2.4,
        machine.proxy ? '#f4dca3' : '#ffffff',
      );
      tag.position.set(machine.x, Math.max(machine.h + 0.65, 2.2), machine.z);
      world.add(tag);
      machineTags.push(tag);
      solids.push({
        minX: (machine.x - machine.w / 2) * METRE,
        maxX: (machine.x + machine.w / 2) * METRE,
        minZ: (machine.z - machine.d / 2) * METRE,
        maxZ: (machine.z + machine.d / 2) * METRE,
      });
    }
  }
  // Six-metre observation gantry, outside the measured machinery rectangle.
  // Its floor leaves the whole study visible from above.
  const gantryY = 6;
  const rim = 3;
  const steel = '#41535b';
  box(
    layout.width + 2 * rim,
    0.16,
    rim,
    steel,
    layout.width / 2,
    gantryY,
    -rim / 2,
  );
  box(
    layout.width + 2 * rim,
    0.16,
    rim,
    steel,
    layout.width / 2,
    gantryY,
    layout.depth + rim / 2,
  );
  box(rim, 0.16, layout.depth, steel, -rim / 2, gantryY, layout.depth / 2);
  box(
    rim,
    0.16,
    layout.depth,
    steel,
    layout.width + rim / 2,
    gantryY,
    layout.depth / 2,
  );
  const rail = (along: 'x' | 'z', at: number, from: number, to: number) => {
    const len = to - from,
      mid = (from + to) / 2;
    for (const height of [0.55, 1.12])
      box(
        along === 'x' ? len : 0.055,
        0.055,
        along === 'z' ? len : 0.055,
        '#b2bec0',
        along === 'x' ? mid : at,
        gantryY + height,
        along === 'z' ? mid : at,
      );
    for (
      let p = from;
      p <= to + 0.01;
      p += Math.max(1.5, len / Math.ceil(len / 2.5))
    )
      box(
        0.065,
        1.12,
        0.065,
        '#81949a',
        along === 'x' ? p : at,
        gantryY + 0.56,
        along === 'z' ? p : at,
      );
  };
  for (const z of [-rim, 0, layout.depth])
    rail('x', z, -rim, layout.width + rim);
  // The south outer rail stops at the stair landing.
  rail('x', layout.depth + rim, -rim, -2.55);
  rail('x', layout.depth + rim, -0.45, layout.width + rim);
  for (const x of [-rim, 0, layout.width, layout.width + rim])
    rail('z', x, -rim, layout.depth + rim);
  const barrier = (along: 'x' | 'z', at: number, from: number, to: number) => {
    const r = 0.06;
    elevatedBarriers.push(
      along === 'x'
        ? {
            minX: from * METRE,
            maxX: to * METRE,
            minZ: (at - r) * METRE,
            maxZ: (at + r) * METRE,
          }
        : {
            minX: (at - r) * METRE,
            maxX: (at + r) * METRE,
            minZ: from * METRE,
            maxZ: to * METRE,
          },
    );
  };
  for (const z of [-rim, 0, layout.depth])
    barrier('x', z, -rim, layout.width + rim);
  barrier('x', layout.depth + rim, -rim, -2.55);
  barrier('x', layout.depth + rim, -0.45, layout.width + rim);
  for (const x of [-rim, 0, layout.width, layout.width + rim])
    barrier('z', x, -rim, layout.depth + rim);
  for (const x of [-rim / 2, layout.width + rim / 2])
    for (let z = 0; z <= layout.depth; z += 10)
      box(0.18, gantryY, 0.18, '#7d8b8e', x, gantryY / 2, z);
  // A 30-tread stair on the south-west corner joins the ground to the ring.
  const stairX = -rim / 2,
    stairRun = 9,
    treadCount = 30;
  for (let i = 0; i < treadCount; i++) {
    const y = gantryY * (1 - (i + 1) / treadCount);
    box(
      1.9,
      0.09,
      stairRun / treadCount,
      steel,
      stairX,
      y,
      layout.depth + rim + ((i + 0.5) * stairRun) / treadCount,
    );
  }
  for (const x of [stairX - 1, stairX + 1]) {
    barrier('z', x, layout.depth + rim, layout.depth + rim + stairRun);
    const slope = new Mesh(
      new BoxGeometry(0.07, 0.07, Math.hypot(stairRun, gantryY)),
      new MeshStandardMaterial({ color: '#b2bec0', roughness: 0.6 }),
    );
    slope.position.set(x, gantryY / 2 + 1, layout.depth + rim + stairRun / 2);
    slope.rotation.x = Math.atan2(gantryY, stairRun);
    world.add(slope);
    for (let i = 0; i <= treadCount; i += 5) {
      const y = gantryY * (1 - i / treadCount);
      box(
        0.055,
        1.1,
        0.055,
        '#b2bec0',
        x,
        y + 0.55,
        layout.depth + rim + (i * stairRun) / treadCount,
      );
    }
  }
  const stairSign = label('STAIRS TO GANTRY', 3, '#ffffff');
  stairSign.position.set(stairX, 2, layout.depth + 13);
  world.add(stairSign);
  // Visible overall measurement lines and corner markers.
  box(layout.width, 0.05, 0.08, '#dc8350', layout.width / 2, 0.04, -1);
  box(0.08, 0.05, layout.depth, '#dc8350', -1, 0.04, layout.depth / 2);
  const xTag = label(`${layout.width.toFixed(1)} m`, 5, '#ffd7ba');
  xTag.position.set(layout.width / 2, 1.7, -1.1);
  world.add(xTag);
  const zTag = label(`${layout.depth.toFixed(1)} m`, 5, '#ffd7ba');
  zTag.position.set(-1.2, 1.7, layout.depth / 2);
  world.add(zTag);
  const hud = document.createElement('div');
  hud.style.cssText =
    'position:absolute;top:1rem;left:1rem;z-index:5;max-width:390px;background:rgba(15,28,32,.88);color:white;padding:1rem 1.2rem;font:14px/1.5 system-ui,sans-serif;border-radius:8px';
  hud.innerHTML = `<strong style="font-size:18px">Shared plant layout study</strong><br>${layout.width.toFixed(1)} × ${layout.depth.toFixed(1)} m = <strong>${layout.area.toFixed(0)} m²</strong> machinery rectangle<br>${layout.zoneArea.toFixed(0)} m² within zone outlines · ${layout.equipmentArea.toFixed(0)} m² machine footprints<br>${layout.zones.length} groups · ${layout.zones.reduce((n, z) => n + z.machines.length, 0)} items<br><small>1 m service margin per machine · 2 m between groups<br>Amber labels are dimensional placeholders. Click to walk; Esc releases pointer.</small><br><button type="button" id="stair-view">Stair foot</button> <button type="button" id="gantry-view">View from gantry</button> <button type="button" id="floor-view">Ground view</button>`;
  const root = canvas.parentElement!;
  const priorPosition = root.style.position;
  if (getComputedStyle(root).position === 'static')
    root.style.position = 'relative';
  root.append(hud);
  const upperSolids = [...solids, ...elevatedBarriers];
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: METRE,
    floorY: 0,
    floorAt: (x, z, previousY) =>
      sharedGantryFloor(
        layout.width,
        layout.depth,
        x / METRE,
        z / METRE,
        previousY / METRE,
      ) * METRE,
    objects: scene,
    start: {
      x: (layout.width * METRE) / 2,
      z: (layout.depth + 8) * METRE,
      yaw: 0,
      pitch: -0.18,
    },
    // Guardrails are raised; their plan footprints must not block ground walkers.
    solids: () => (camera.position.y >= 5 * METRE ? upperSolids : solids),
    use: () => {},
    aimed: () => false,
  });
  const gantryView = () =>
    walk.place(
      (layout.width * METRE) / 2,
      (layout.depth + 1.5) * METRE,
      0,
      -0.36,
      undefined,
      6 * METRE,
    );
  const groundView = () =>
    walk.place(
      (layout.width * METRE) / 2,
      (layout.depth + 8) * METRE,
      0,
      -0.18,
    );
  const stairView = () =>
    walk.place(-1.5 * METRE, (layout.depth + 12.5) * METRE, 0, 0);
  hud.querySelector('#stair-view')?.addEventListener('click', stairView);
  hud.querySelector('#gantry-view')?.addEventListener('click', gantryView);
  hud.querySelector('#floor-view')?.addEventListener('click', groundView);
  const shortcuts = (event: KeyboardEvent) => {
    if (root.hidden) return;
    if (event.code === 'KeyG') gantryView();
    if (event.code === 'KeyR') groundView();
  };
  window.addEventListener('keydown', shortcuts);
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
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (root.hidden) {
      last = 0;
      return;
    }
    const dt = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(dt);
    for (const entry of lodEntries) {
      const near =
        Math.hypot(
          camera.position.x - entry.x * METRE,
          camera.position.z - entry.z * METRE,
        ) <
        entry.range * METRE;
      entry.detail.visible = near;
      entry.simple.visible = !near;
    }
    for (const tag of machineTags)
      tag.visible =
        Math.hypot(
          camera.position.x - tag.position.x * METRE,
          camera.position.z - tag.position.z * METRE,
        ) <
        9 * METRE;
    for (const item of live) item.update?.(dt);
    renderer.render(scene, camera);
  });
  (window as unknown as { sharedPlant?: unknown }).sharedPlant = {
    layout,
    place: (x: number, z: number, yaw = 0, pitch = 0) =>
      walk.place(x * METRE, z * METRE, yaw, pitch),
  };
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    window.removeEventListener('keydown', shortcuts);
    hud.remove();
    root.style.position = priorPosition;
    for (const item of live) item.dispose?.();
    disposeKit(kit, scene as unknown as Group);
    scene.traverse((o) => {
      if (o instanceof Mesh) o.geometry.dispose();
      if (o instanceof Sprite) o.material.map?.dispose();
    });
    for (const mat of floorMaterials) mat.dispose();
    renderer.dispose();
    delete (window as unknown as { sharedPlant?: unknown }).sharedPlant;
  };
  return Object.assign(dispose, {
    enter() {
      if (new URLSearchParams(location.search).get('view') === 'gantry')
        gantryView();
      else groundView();
    },
  });
}
