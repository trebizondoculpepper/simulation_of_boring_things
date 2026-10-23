import {
  createBreezeBlockTextures,
  mapBlockwork,
} from '../../../scene/breeze-block-texture';
import {
  AmbientLight,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  Mesh,
  Path,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Shape,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { DEV_ROOM_NAMES, devPortals, devWalls } from '../logic/dev-room-links';
import type { EquipmentRoomId } from '../logic/dev-room-links';
import {
  layoutPlantRoom,
  layoutSizedPlantRoom,
} from '../logic/plant-room-layout';
import type {
  ExhibitSize,
  PlantRoomLayout,
  SizedPlantRoomLayout,
} from '../logic/plant-room-layout';
import { regionFloorAt, regionSolids } from '../logic/room-regions';
import { createRoomRegions } from '../views/room-regions';
import { DEV19C_SEED } from '../logic/dev19-scoring';
import { layoutWithBlocks } from '../logic/block-layout';
import { sizeRoom } from '../logic/room-sizer';
import { BASE_MODEL, DEV19D_MODEL } from '../../../game/plant/demo-variants';
import {
  demoPlaceItems,
  demoPlaceLinks,
  demoPlumbing,
  ADOPTED_RULES,
  CODEX_RULES,
} from '../logic/port-graph-demo-routes';
import {
  BEAM_DEPTH,
  createServiceCeiling,
} from '../../components/site-dressing/views/service-ceiling';
import type { ServiceCeilingOptions } from '../../components/site-dressing/views/service-ceiling';
import type { Footprint } from '../../controls/logic/walk-collision';
import { METRE } from '../../components/core/logic/units';
import { createPortals } from '../views/portals';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import type { PanelKit } from '../../components/core/views/eighties-controls';
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
export type ExhibitRoomId =
  | EquipmentRoomId
  | 'dev10'
  | 'dev12'
  | 'dev13'
  | 'dev14'
  | 'dev15'
  | 'dev17'
  | 'dev18'
  | 'dev19'
  | 'dev19b'
  | 'dev19c'
  | 'dev19d'
  | 'dev20'
  | 'dev21'
  | 'dev22'
  | 'dev23'
  | 'dev24'
  | 'dev25'
  | 'dev26'
  | 'dev27'
  | 'dev28'
  | 'dev29';

/** A room's own finish (`FINISH` in its module). */
export interface RoomFinish {
  wall?: string;
  floor?: string | null;
  /** Breeze-block walls, as the plant rooms have. */
  blockwork?: boolean;
  /** Lit by its own fittings: the room's general light only a little fill. */
  ownLights?: boolean;
}

const EXHIBITS: Record<
  ExhibitRoomId,
  () => Promise<{
    EXHIBITS: readonly PlantExhibit[];
    PURPOSE: string;
    buildRoomServices?: (
      kit: PanelKit,
      layout: PlantRoomLayout,
    ) => Group | LiveExhibit;
    /** Bind the room's model to its layout before its exhibits are built (Dev19's plumbed graph). */
    prepareRoom?: (layout: PlantRoomLayout) => void;
    /** Its own layout, in place of the usual rows (Dev21's sources facing their sinks). */
    layoutRoom?: (sizes: readonly ExhibitSize[]) => PlantRoomLayout;
    /** Its finish: its walls' colour, and its floor's (null: none, as over Dev28's tank, where the room draws its own gantry). */
    FINISH?: RoomFinish;
    /** Where the walker starts, metres, when it does not come through the door. */
    START?: { x: number; z: number; yaw: number };
  }>
> = {
  dev_pumps: () => import('./plant/pumps'),
  dev_balance: () => import('./plant/balance'),
  dev_chemicals: () => import('./plant/chemicals'),
  dev_dosing: () => import('./plant/dosing'),
  dev_boiler: () => import('./plant/boiler'),
  dev_air: () => import('./plant/air'),
  dev_electrical: () => import('./plant/electrical'),
  dev_control: () => import('./plant/control'),
  dev_ozone: () => import('./plant/ozone'),
  dev10: () => import('./plant/services'),
  dev12: () => import('./plant/pool-fittings'),
  dev13: () => import('./plant/signage'),
  dev14: () => import('./plant/remote-button'),
  dev15: () => import('./plant/remote-lamp'),
  dev17: () => import('./plant/pool-edges'),
  dev18: () => import('./plant/security-office'),
  dev19: () => import('./plant/port-graph-demo'),
  dev19b: () => import('./plant/port-graph-demo-b'),
  dev19c: () => import('./plant/port-graph-demo-c'),
  dev19d: () => import('./plant/port-graph-demo-d'),
  dev20: () => import('./plant/experimental-sources'),
  dev21: () => import('./plant/source-sink'),
  dev22: () => import('./plant/battery-pump'),
  dev23: () => import('./plant/jacuzzi-drain'),
  dev24: () => import('./plant/duty-standby'),
  dev25: () => import('./plant/tank-fill-drain'),
  dev26: () => import('./plant/filter-five-valve'),
  dev27: () => import('./plant/pool-heating'),
  dev28: () => import('./plant/balance-tank-hall'),
  dev29: () => import('./plant/solenoid-valves'),
};

/**
 * Rooms with an exposed services ceiling over their exhibits (set
 * decoration: `AGENTS.md`), and its settings. The open height under it is
 * the room's usual height, at least `SERVICE_CLEAR`; the services, beams
 * and deck go above that.
 */
const SERVICE_CEILINGS: Partial<Record<ExhibitRoomId, ServiceCeilingOptions>> =
  {
    dev_pumps: { seed: 11, acoustic: true },
  };
/** The least clear height under a services ceiling's lowest layer. */
const SERVICE_CLEAR = 4;
/** From the deck's underside down to the felt grid's underside. */
const SERVICE_ZONE = BEAM_DEPTH + 1.45;

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
  const ambient = new AmbientLight('#f2f4f0', 0.7);
  const sky = new HemisphereLight('#f6f6f0', '#5d5f58', 0.6);
  scene.add(ambient, sky);
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
  /** A room laid out by its layers, with its gantry, if it is one. */
  let sized: SizedPlantRoomLayout | null = null;
  /** The walker's floor height, metres: on the floor, the stair or the gantry. */
  let standing = 0;
  let portals: ReturnType<typeof createPortals> | null = null;
  let disposed = false;
  /** The exhibits that work: updated each frame, their parts clickable. */
  const live: LiveExhibit[] = [];

  /** Build the room's shell, door and exhibits to fit `exhibits`. */
  const build = (
    exhibits: readonly PlantExhibit[],
    purpose: string,
    buildRoomServices?: (
      kit: PanelKit,
      layout: PlantRoomLayout,
    ) => Group | LiveExhibit,
    prepareRoom?: (layout: PlantRoomLayout) => void,
    layoutRoom?: (sizes: readonly ExhibitSize[]) => PlantRoomLayout,
    finish?: RoomFinish,
    startAt?: { x: number; z: number; yaw: number },
  ) => {
    if (finish?.wall) wallPaint.color.set(finish.wall);
    // A room lit by its own fittings: the general light turned down to a little fill.
    if (finish?.ownLights) {
      ambient.intensity = 0.12;
      sky.intensity = 0.2;
      key.intensity = 0;
    }
    // Its walls of breeze blocks, as the plant rooms' are.
    let blockwork: ReturnType<typeof createPs1Material> | null = null;
    if (finish?.blockwork) {
      const blocks = createBreezeBlockTextures();
      kit.textures.push(blocks.map, blocks.normalMap, blocks.roughnessMap);
      blockwork = createPs1Material({
        map: blocks.map,
        normalMap: blocks.normalMap,
        roughnessMap: blocks.roughnessMap,
        roughness: 1,
      });
      kit.materials.push(blockwork);
    }
    if (finish?.floor) floorPaint.color.set(finish.floor);
    const sizes = exhibits.map((e) => e.size);
    // Dev19 tries the room's layers (`doc/prompts/017-room-sizer-gantries-placement.md`):
    // sized for its machines, two storeys with a gantry, placed in bands.
    // Dev19b is the same room plumbed by Codex's rules, to compare.
    sized =
      id === 'dev19' || id === 'dev19b' || id === 'dev19c'
        ? layoutSizedPlantRoom(sizes, {
            items: demoPlaceItems(),
            links: demoPlaceLinks(),
            // Dev19c: the best seed of a scored search (`dev19-scoring.ts`).
            seed: id === 'dev19c' ? DEV19C_SEED : 1,
          })
        : null;
    // Dev19d: three filters, pre-assembled into blocks (`block-layout.ts`).
    if (id === 'dev19d') {
      const items = demoPlaceItems(DEV19D_MODEL);
      const size = sizeRoom(sizes.filter((_, i) => !items[i]?.inline));
      sized = layoutWithBlocks(sizes, {
        items,
        links: demoPlaceLinks(DEV19D_MODEL),
        minimumArea: size.w * size.d,
      }).layout;
    }
    // The plumber sets the valves into their lines.
    if (sized)
      sized = {
        ...sized,
        places: demoPlumbing(
          sized,
          id === 'dev19b' ? CODEX_RULES : ADOPTED_RULES,
          id === 'dev19d' ? DEV19D_MODEL : BASE_MODEL,
        ).places,
      };
    const layout = sized ?? layoutRoom?.(sizes) ?? layoutPlantRoom(sizes);
    prepareRoom?.(layout);
    const { halfX, halfZ } = layout;
    const services = SERVICE_CEILINGS[id as ExhibitRoomId];
    // Under a services ceiling, the walls and roof go up over the services.
    const clear = services
      ? Math.max(SERVICE_CLEAR, layout.height)
      : layout.height;
    const deckY = clear + SERVICE_ZONE;
    const height = services ? deckY : layout.height;
    const slab = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      paint = wallPaint,
    ) => t.box(room, paint, w, h, d, x, y, z);
    // The floor, with a hole for each exhibit sunk into it.
    const floor = new Shape([
      new Vector2(-halfX, -halfZ),
      new Vector2(halfX, -halfZ),
      new Vector2(halfX, halfZ),
      new Vector2(-halfX, halfZ),
    ]);
    exhibits.forEach((exhibit, i) => {
      const pit = exhibit.size.pit;
      if (!pit) return;
      const { x, z, yaw } = layout.places[i];
      const c = Math.cos(yaw),
        s = Math.sin(yaw);
      // Shape coordinates are (x, −z): the floor is laid with its y up.
      floor.holes.push(
        new Path(
          pit.map(
            ([px, pz]) =>
              new Vector2(x + px * c + pz * s, -(z - px * s + pz * c)),
          ),
        ),
      );
    });
    const floorGeometry = new ExtrudeGeometry(floor, {
      depth: 0.1,
      bevelEnabled: false,
    });
    floorGeometry.rotateX(-Math.PI / 2);
    floorGeometry.translate(0, -0.1, 0);
    if (finish?.floor !== null) room.add(new Mesh(floorGeometry, floorPaint));
    slab(2 * halfX, 0.1, 2 * halfZ, 0, height + 0.05, 0);
    const bounds: Footprint = {
      minX: -halfX * m,
      maxX: halfX * m,
      minZ: -halfZ * m,
      maxZ: halfZ * m,
    };
    const pieces = devWalls(bounds, m, height * m);
    if (services)
      room.add(
        createServiceCeiling(
          { minX: -halfX, maxX: halfX, minZ: -halfZ, maxZ: halfZ, deckY },
          services,
        ).group,
      );
    walls = pieces;
    if (sized)
      room.add(createRoomRegions(kit, sized.room, sized.regions, sized.gantry));
    for (const w of pieces) {
      const at = [
        (w.minX + w.maxX) / 2 / m,
        (w.bottom + w.top) / 2 / m,
        (w.minZ + w.maxZ) / 2 / m,
      ] as const;
      const piece = slab(
        (w.maxX - w.minX) / m,
        (w.top - w.bottom) / m,
        (w.maxZ - w.minZ) / m,
        ...at,
        blockwork ?? wallPaint,
      );
      if (blockwork) mapBlockwork(piece.geometry, at);
    }
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
      holder.rotation.set(0, place.yaw, place.tilt ?? 0);
      const built = exhibit.build(kit);
      const model = isLive(built) ? built.object : built;
      if (isLive(built)) live.push(built);
      holder.add(model);
      room.add(holder);
      // Still geometry is merged; what moves, and every piece a click
      // works, is kept as it is.
      const worked = new Set(
        isLive(built) ? (built.parts?.uses.keys() ?? []) : [],
      );
      mergeTree(model, (o) => o.userData.live === true || worked.has(o));
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
      if (layoutRoom) {
        // On the wall behind it, facing into the room, clear of what
        // rises from its top.
        const north = place.z < 0;
        caption.position.set(
          place.x,
          Math.min(exhibit.size.h + 0.6, height - 0.35),
          north ? -halfZ + 0.17 : halfZ - 0.17,
        );
        caption.rotation.y = north ? 0 : Math.PI;
      } else if (sized) {
        // Over the machine, facing the way it faces; over a valve in its
        // line, just above it.
        caption.position.set(
          place.x,
          place.inline
            ? place.y + 0.3
            : Math.min(exhibit.size.h + 0.35, height - 0.35),
          place.z,
        );
        caption.rotation.y = place.yaw;
      } else if (floor) {
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
    if (buildRoomServices) {
      // Its services may work too (Dev19's valves and isolators).
      const services = buildRoomServices(kit, layout);
      if (isLive(services)) {
        live.push(services);
        room.add(services.object);
      } else room.add(services);
    }
    solids = layout.solids
      .filter((s) => s.maxX > s.minX && s.maxZ > s.minZ)
      .map((s) => ({
        minX: s.minX * m,
        maxX: s.maxX * m,
        minZ: s.minZ * m,
        maxZ: s.maxZ * m,
      }));
    const params = new URLSearchParams(location.search);
    const arrival = portals.arrival(params.get('from'));
    // A position in the link (the position button's) wins: the room is
    // built after main.ts has placed the walker there, so place it again.
    const linked = (name: string) => {
      const raw = params.get(name);
      const value = raw === null || raw.trim() === '' ? NaN : Number(raw);
      return Number.isFinite(value) ? value : null;
    };
    const [lx, ly, lz] = [linked('x'), linked('y'), linked('z')];
    if (!arrival && lx !== null && lz !== null) {
      walk.place(
        lx * m,
        lz * m,
        ((linked('yaw') ?? 45) * Math.PI) / 180,
        ((linked('pitch') ?? 0) * Math.PI) / 180,
        ly === null ? undefined : ly * m,
      );
      return;
    }
    const start =
      arrival ??
      (startAt
        ? { x: startAt.x * m, z: startAt.z * m, yaw: startAt.yaw, pitch: 0 }
        : {
            x: (-halfX + 2.5) * m,
            z: (halfZ - 2) * m,
            yaw: Math.PI / 4,
            pitch: 0,
          });
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
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    start: { x: 0, z: 0 },
    floorAt: (x, z, previous) => {
      standing = sized
        ? regionFloorAt(sized.room, sized.gantry, x / m, z / m, previous / m)
        : 0;
      return standing * m;
    },
    // Up the stair or on the gantry, its rails; on the floor, the machines too.
    solids: () => [
      ...walls,
      ...(standing < 0.5 ? solids : []),
      // What the exhibits put in the way as they work (a shut door).
      ...live
        .flatMap(
          (l) =>
            l.solids?.({ x: walk.walker.x / m, z: walk.walker.z / m }) ?? [],
        )
        .map((f) => ({
          minX: f.minX * m,
          maxX: f.maxX * m,
          minZ: f.minZ * m,
          maxZ: f.maxZ * m,
        })),
      ...(sized
        ? regionSolids(sized.room, sized.gantry, standing).map((f) => ({
            minX: f.minX * m,
            maxX: f.maxX * m,
            minZ: f.minZ * m,
            maxZ: f.maxZ * m,
          }))
        : []),
    ],
    use: (x, y) => useAt(x, y)?.(),
    aimed: () => Boolean(useAt(0, 0)),
  });

  // A development handle for the console: stand anywhere, in metres.
  (window as unknown as { exhibitRoom: unknown }).exhibitRoom = {
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    /** Use whatever is at (x, y) on the screen (−1 to 1), as a click would. */
    use: (x = 0, y = 0) => useAt(x, y)?.(),
  };

  void EXHIBITS[id]().then(
    ({
      EXHIBITS: exhibits,
      PURPOSE,
      buildRoomServices,
      prepareRoom,
      layoutRoom,
      FINISH,
      START,
    }) => {
      if (!disposed)
        build(
          exhibits,
          PURPOSE,
          buildRoomServices,
          prepareRoom,
          layoutRoom,
          FINISH,
          START,
        );
    },
  );

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
