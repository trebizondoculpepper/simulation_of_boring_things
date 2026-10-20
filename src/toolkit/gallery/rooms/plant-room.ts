import {
  AmbientLight,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { DEV_ROOM_NAMES, devPortals, devWalls } from '../logic/dev-room-links';
import type { EquipmentRoomId } from '../logic/dev-room-links';
import { layoutPlantRoom } from '../logic/plant-room-layout';
import type { Footprint } from '../../controls/logic/walk-collision';
import { METRE } from '../../components/core/logic/units';
import { createPortals } from '../views/portals';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import { SANS, tools } from '../../components/core/views/fitting-tools';
import { mergeTree } from '../../components/core/views/merge-static';
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
import { isLive } from './plant/exhibit';
import type { LiveExhibit, PlantExhibit } from './plant/exhibit';

/** Each plant room's exhibits, loaded with the room. */
/** The rooms laid out as exhibits: each equipment room, and dev10. */
export type ExhibitRoomId = EquipmentRoomId | 'dev10' | 'dev12';

const EXHIBITS: Record<
  ExhibitRoomId,
  () => Promise<{ EXHIBITS: readonly PlantExhibit[]; PURPOSE: string }>
> = {
  dev_pumps: () => import('./plant/pumps'),
  dev_balance: () => import('./plant/balance'),
  dev_chemicals: () => import('./plant/chemicals'),
  dev_dosing: () => import('./plant/dosing'),
  dev_boiler: () => import('./plant/boiler'),
  dev_air: () => import('./plant/air'),
  dev_electrical: () => import('./plant/electrical'),
  dev_control: () => import('./plant/control'),
  dev10: () => import('./plant/services'),
  dev12: () => import('./plant/pool-fittings'),
};

/**
 * A plant development room: the equipment of one of the leisure centre's
 * plant rooms, each piece modelled at true size from a referenced product
 * and shown with its name and reference, in a plain concrete-and-blockwork
 * room (`layoutPlantRoom`). Its one way out is a spring door to
 * dev_corridor. The room is built while its exhibits load, and they appear
 * when they arrive.
 */
export function startEquipmentRoom(
  canvas: HTMLCanvasElement,
  id: ExhibitRoomId,
) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.4);
  renderer.setClearColor('#262a2b');
  const camera = new PerspectiveCamera(60, 1, 0.05, 80 * m);
  scene.add(
    new AmbientLight('#f2f4f0', 0.7),
    new HemisphereLight('#f6f6f0', '#5d5f58', 0.6),
  );
  const key = new DirectionalLight('#fffdf6', 1.4);
  key.position.set(-6 * m, 10 * m, 8 * m);
  scene.add(key);
  const kit = createPanelKit();
  const t = tools(kit);
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  const floorPaint = createPs1Material({ color: '#8a8b86', roughness: 0.7 });
  const wallPaint = createPs1Material({ color: '#cfd2c8', roughness: 0.85 });
  const stripePaint = kitPaint(kit, '#2f6f7a');
  kit.materials.push(floorPaint, wallPaint);

  let walls: Footprint[] = [];
  let solids: Footprint[] = [];
  let portals: ReturnType<typeof createPortals> | null = null;
  let disposed = false;
  /** The exhibits that work: updated each frame, their parts clickable. */
  const live: LiveExhibit[] = [];

  /** Build the room's shell, door and exhibits to fit `exhibits`. */
  const build = (exhibits: readonly PlantExhibit[], purpose: string) => {
    const layout = layoutPlantRoom(exhibits.map((e) => e.size));
    const { halfX, halfZ, height } = layout;
    const slab = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      paint = wallPaint,
    ) => t.box(room, paint, w, h, d, x, y, z);
    slab(2 * halfX, 0.1, 2 * halfZ, 0, -0.05, 0, floorPaint);
    slab(2 * halfX, 0.1, 2 * halfZ, 0, height + 0.05, 0);
    const bounds: Footprint = {
      minX: -halfX * m,
      maxX: halfX * m,
      minZ: -halfZ * m,
      maxZ: halfZ * m,
    };
    const pieces = devWalls(bounds, m, height * m);
    walls = pieces;
    for (const w of pieces)
      slab(
        (w.maxX - w.minX) / m,
        (w.top - w.bottom) / m,
        (w.maxZ - w.minZ) / m,
        (w.minX + w.maxX) / 2 / m,
        (w.bottom + w.top) / 2 / m,
        (w.minZ + w.maxZ) / 2 / m,
      );
    // A painted dado stripe round the walls, as plant rooms are marked.
    for (const z of [-halfZ + 0.16, halfZ - 0.16])
      slab(2 * halfX - 0.4, 0.15, 0.01, 0, 1.2, z, stripePaint);
    portals = createPortals(id, devPortals(id, bounds, m), 0, m);
    scene.add(portals.group);

    // The title card on the east wall.
    const card = t.printed(
      3.6,
      1.2,
      (c, w, h) => {
        c.fillStyle = '#1f3b5a';
        c.fillRect(0, 0, w, h);
        c.strokeStyle = '#f2f2ec';
        c.lineWidth = h * 0.02;
        c.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1);
        c.fillStyle = '#f7f7f2';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `bold ${h * 0.2}px ${SANS}`;
        c.fillText(DEV_ROOM_NAMES[id], w / 2, h * 0.4);
        c.font = `${h * 0.085}px ${SANS}`;
        c.fillStyle = '#d9e6ea';
        c.fillText(purpose, w / 2, h * 0.68);
      },
      1024,
    );
    card.mesh.position.set(halfX - 0.17, Math.min(2.2, height - 0.8), 0);
    card.mesh.rotation.y = -Math.PI / 2;
    room.add(card.mesh);

    exhibits.forEach((exhibit, i) => {
      const place = layout.places[i];
      const holder = new Group();
      holder.name = `Exhibit: ${exhibit.title}`;
      holder.position.set(place.x, place.y, place.z);
      holder.rotation.y = place.yaw;
      const built = exhibit.build(kit);
      const model = isLive(built) ? built.object : built;
      if (isLive(built)) live.push(built);
      holder.add(model);
      room.add(holder);
      mergeTree(model, (o) => o.userData.live === true);
      // Its caption on the wall behind it (floor equipment) or beneath it.
      const floor = exhibit.size.mount === 'floor';
      const caption = createMicroLabel(
        kit,
        `${i + 1}. ${exhibit.title}\n${exhibit.reference}`,
        {
          height: 0.07,
          ink: '#20313a',
          plate: '#eef0ea',
          maxWidth: Math.max(1.6, exhibit.size.w),
        },
      );
      if (floor) {
        caption.position.set(
          place.x,
          Math.min(exhibit.size.h + 0.45, height - 0.35),
          -halfZ + 0.17,
        );
      } else {
        caption.position.set(
          place.x,
          Math.max(0.5, place.y - exhibit.size.h / 2 - 0.3),
          halfZ - 0.17,
        );
        caption.rotation.y = Math.PI;
      }
      room.add(caption);
    });
    solids = layout.solids.map((s) => ({
      minX: s.minX * m,
      maxX: s.maxX * m,
      minZ: s.minZ * m,
      maxZ: s.maxZ * m,
    }));
    const params = new URLSearchParams(location.search);
    const arrival = portals.arrival(params.get('from'));
    const start = arrival ?? {
      x: (-halfX + 2.5) * m,
      z: (halfZ - 2) * m,
      yaw: Math.PI / 4,
      pitch: 0,
    };
    walk.place(start.x, start.z, start.yaw, start.pitch);
  };

  const raycaster = new Raycaster(),
    pointer = new Vector2();
  const useAt = (x: number, y: number) => {
    if (!portals) return null;
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects(
      [portals.group, ...live.map((l) => l.object)],
      true,
    )[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const use = portals.uses.get(o as Mesh);
      if (use) return use;
      for (const exhibit of live) {
        const work = exhibit.parts?.uses.get(o);
        if (work) {
          const at = o;
          return () => work(knobDirection(at, hit.point, camera));
        }
      }
    }
    return null;
  };
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    start: { x: 0, z: 0 },
    solids: () => [...walls, ...solids],
    use: (x, y) => useAt(x, y)?.(),
    aimed: () => Boolean(useAt(0, 0)),
  });

  // A development handle for the console: stand anywhere, in metres.
  (window as unknown as { exhibitRoom: unknown }).exhibitRoom = {
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
  };

  void EXHIBITS[id]().then(({ EXHIBITS: exhibits, PURPOSE }) => {
    if (!disposed) build(exhibits, PURPOSE);
  });

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
    portals?.update(delta, walk.walker.x, walk.walker.z);
    for (const exhibit of live) {
      exhibit.parts?.update(delta);
      exhibit.update?.(delta);
    }
    renderer.render(scene, camera);
  });

  const dispose = () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals?.dispose();
    for (const exhibit of live) {
      exhibit.parts?.dispose();
      exhibit.dispose?.();
    }
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { exhibitRoom?: unknown }).exhibitRoom;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const pose = portals?.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
  });
}
