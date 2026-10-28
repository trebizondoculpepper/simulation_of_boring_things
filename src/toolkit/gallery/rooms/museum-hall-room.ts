import {
  ACESFilmicToneMapping,
  Mesh,
  AmbientLight,
  DirectionalLight,
  HalfFloatType,
  HemisphereLight,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import type { Group, Material, Object3D } from 'three';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  createComposer,
  createRenderer,
  followEffectSettings,
  useEnvironment,
} from '../../components/core/parts/render-style';
import { METRE } from '../../components/core/logic/units';
import { createFirstPerson } from '../../controls/input/first-person';
import type { Footprint } from '../../controls/logic/walk-collision';
import { registerJoint } from '../logic/door-joins';
import type { DoorFrame } from '../logic/door-joins';
import { enterDevRoom } from '../logic/dev-room-links';
import type { RoomId } from '../logic/dev-room-links';
import {
  hallAxes,
  hallSize,
  archToSee,
  arrivalFrom,
  crossedInto,
  hallArches,
  hallOrigin,
  hallSolids,
  neighbourDraw,
  neighbourFade,
  ringNeighbours,
  startOf,
} from '../logic/museum-plan';
import type { MuseumHallId } from '../logic/museum-plan';
import { createMuseumHall } from '../views/museum-hall';
import {
  createEmptyHallMaterials,
  createRingShells,
} from '../views/museum-empty-hall';
import { safetySolids } from '../logic/museum-safety';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { knobDirection } from '../../controls/input/knob-turning';
import { touchingAt } from '../../controls/input/touch-point';
import { partAudio } from '../../components/core/audio/part-audio';
import { createInspector } from '../views/inspect-pick';
import { localNow } from '../logic/museum-time';
import { HALL_EXHIBITS } from './museum/exhibits';
import type { HallExhibit } from './museum/exhibits';
import { partOf } from './museum/exhibit-carrying';
import type { CarryingExhibit } from './museum/exhibit-carrying';

/**
 * The museum's ambient occlusion samples per pixel, at High (the owner,
 * 2026-10-28: "set ambient occlusion to something quite low, maybe 2 or
 * 3, and see if that makes it run even faster"); its big plain walls
 * need little.
 */
const MUSEUM_AO_SAMPLES = 3;

/**
 * A room of the pool science museum, PLANTROOMS (mission 107), in its own scene: its
 * archways are doorways the app sees through (`door-joins.ts`), always
 * open, one at a time (the one the visitor is at, or looking towards:
 * `archToSee`); the other shows its hall's empty component, as do the
 * halls beyond (`museum-empty-hall.ts`, 107-1). Crossing an archway's
 * middle line hands the visitor over to the next hall (`handOver` in
 * `src/main.ts`), its eye and zoom carried through. Lazy joints: both
 * neighbours are built while this hall is shown, so the hand-over is
 * ready, and let go when not next door.
 */
export function startMuseumHallRoom(
  canvas: HTMLCanvasElement,
  id: MuseumHallId,
) {
  const metre = METRE;
  const scene = new Scene();
  scene.background = null;
  const renderer = createRenderer(canvas, true);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor('#f4f2ec', 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const camera = new PerspectiveCamera(68, 1, 0.05 * metre, 90 * metre);
  const freeEnvironment = useEnvironment(renderer, scene, 0.2);

  const hall = createMuseumHall(id);
  hall.group.scale.setScalar(metre);
  scene.add(hall.group);
  // Every other hall of the ring as its empty component, at its true
  // place (107-1): the neighbours' seen through their archways until their
  // full rooms are drawn there, the halls beyond them always empty.
  const shellMaterials = createEmptyHallMaterials(hall.materials);
  const shells = createRingShells(id, shellMaterials);
  const o = hallOrigin(id);
  shells.group.position.set(-o.x, 0, -o.z);
  hall.group.add(shells.group);
  // Both neighbours in full (the owner, 2026-10-28: "only the rooms
  // adjacent to the room we're in render"): each a full copy at its true
  // place, seen while its own room is not drawn through its archway
  // (`neighbourDraw`), so both are full even when both archways are in
  // view; shown empty while this hall is itself drawn under another.
  const copies = new Map(
    ringNeighbours(id).map((n) => {
      const copy = createMuseumHall(n);
      const on = hallOrigin(n);
      copy.group.position.set(on.x - o.x, 0, on.z - o.z);
      hall.group.add(copy.group);
      return [n, copy] as const;
    }),
  );
  let peekFrom: MuseumHallId | null = null;
  // The hall's exhibit (107-0), loaded with it; and each neighbour's copy's,
  // drawn in its reset state and never stepped (rule 1: a hall's time
  // starts when the visitor crosses in).
  const kit = createPanelKit();
  let exhibit: CarryingExhibit | null = null;
  const copyExhibits: HallExhibit[] = [];
  let disposed = false;
  const loadExhibit = (n: MuseumHallId, into: Group) =>
    HALL_EXHIBITS[n]?.().then((m) => {
      if (disposed) return null;
      const built = m.buildHallExhibit(kit);
      built.reset(localNow());
      // Drawn once, in its reset state.
      built.update?.(0);
      into.add(built.object);
      return built;
    });
  void loadExhibit(id, hall.group)?.then((built) => {
    if (!built) return;
    exhibit = built;
    // The exhibit's carrying (107f), through the control scheme's hands.
    if (walk.hands) exhibit.carrying?.bind(walk.hands);
  });
  for (const [n, copy] of copies)
    void loadExhibit(n, copy.group)?.then((built) => {
      if (!built) return;
      copyExhibits.push(built);
      // It fades in with its hall: on its own materials, since an
      // exhibit's are often shared (a pipe kind's, cached), and this
      // hall's own exhibit is not to fade with it.
      const own = ownMaterials(built.object);
      copyMaterials.push(...own);
      fadeMaterials.get(n)?.push(
        ...own.map((mat) => ({
          mat,
          opacity: mat.opacity,
          transparent: mat.transparent,
        })),
      );
      applyFade(n, fade.get(n) ?? 1);
    });
  // Each copy's fade (`neighbourFade`), and its materials, gathered once:
  // while part faded in, they are drawn see-through over its empty hall.
  const fade = new Map<MuseumHallId, number>();
  const fadeMaterials = new Map(
    [...copies].map(([n, copy]) => {
      const list = new Set<Material & { opacity: number }>();
      copy.group.traverse((obj) => {
        if (obj instanceof Mesh)
          for (const mat of [obj.material].flat() as Material[]) list.add(mat);
      });
      return [
        n,
        [...list].map((mat) => ({
          mat,
          opacity: mat.opacity,
          transparent: mat.transparent,
        })),
      ] as const;
    }),
  );
  const copyMaterials: Material[] = [];
  const applyFade = (n: MuseumHallId, f: number) => {
    for (const m of fadeMaterials.get(n) ?? []) {
      const blend = f < 1 || m.transparent;
      if (m.mat.transparent !== blend) {
        m.mat.transparent = blend;
        m.mat.needsUpdate = true;
      }
      m.mat.opacity = m.opacity * f;
    }
  };
  const redraw = () => {
    for (const [n, copy] of copies) {
      const how = neighbourDraw(id, n, { seen, peekFrom });
      const f = fade.get(n) ?? 1;
      copy.group.visible = how === 'full' && f > 0;
      // The empty hall stays underneath until the copy is fully in.
      shells.show(n, how === 'full' && f < 1 ? 'empty' : how);
    }
  };
  const fadeTo = (pose: { x: number; z: number }) => {
    let changed = false;
    for (const n of copies.keys()) {
      const f = neighbourFade(id, n, pose);
      if (fade.get(n) === f) continue;
      fade.set(n, f);
      applyFade(n, f);
      changed = true;
    }
    if (changed) redraw();
  };
  const { h } = hallSize(id);
  const axes = hallAxes(id);
  const welcome = id === 'museum0';

  // The soft light of a white room and the daylight, the same in every
  // hall, so an archway's reveal is lit alike either side; Hall 0's
  // fluorescent, cool and a little green, as an empty pool hall's.
  scene.add(new AmbientLight(welcome ? '#eefaf4' : '#f4f1ea', 0.12));
  scene.add(
    new HemisphereLight(
      welcome ? '#effaf6' : '#eef3f6',
      welcome ? '#8fa39d' : '#8c8579',
      welcome ? 0.75 : 0.55,
    ),
  );
  const sun = new DirectionalLight('#fff3df', welcome ? 0.25 : 0.7);
  sun.position.set(-10 * metre, 14 * metre, 3 * metre);
  scene.add(sun);
  // The gallery lights: four pools of light, 5 m in from the hall's ends,
  // towards its courtyard side: warm in the halls, fluorescent in Hall 0.
  for (const s of [-1, 1])
    for (const c of [-1, 1]) {
      const along = s * Math.max(0, axes.length / 2 - 5);
      const across = c * (axes.width / 4);
      const lamp = new PointLight(
        welcome ? '#effff4' : '#ffe9c8',
        (welcome ? 5 : 9) * metre * metre,
        16 * metre,
        2,
      );
      lamp.position.set(
        (axes.along[0] * along + axes.across[0] * across) * metre,
        (h - (welcome ? 0.6 : 2.6)) * metre,
        (axes.along[1] * along + axes.across[1] * across) * metre,
      );
      scene.add(lamp);
    }

  const composer = createComposer(
    renderer,
    new WebGLRenderTarget(1, 1, {
      type: HalfFloatType,
      samples: 4,
    }),
  );
  const base = new RenderPass(scene, camera);
  base.clearAlpha = 0;
  composer.addPass(base);
  const ao = new GTAOPass(scene, camera, 1, 1);
  ao.updateGtaoMaterial({
    distanceExponent: 1.4,
    thickness: 1.2 * metre,
    scale: 1,
    samples: MUSEUM_AO_SAMPLES,
    radius: 0.6 * metre,
  });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 });
  ao.blendIntensity = 0.8;
  composer.addPass(ao);
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.25, 0.4, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  followEffectSettings(composer, { ao, aoSamples: MUSEUM_AO_SAMPLES, bloom });

  // Which archway's hall is drawn through it, and which are being seen.
  const seen: Partial<Record<MuseumHallId, boolean>> = {};
  let looking: MuseumHallId | null = null;
  const toScene = (f: Footprint) => ({
    minX: f.minX * metre,
    maxX: f.maxX * metre,
    minZ: f.minZ * metre,
    maxZ: f.maxZ * metre,
  });
  // The fire point boards and the staff door, stood against the walls.
  const fittings = safetySolids(id);
  const start = startOf(id);
  // Working the exhibit: whatever part of it is aimed at, within reach,
  // through the control scheme (`knob-turning`, `touch-point`).
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const useAt = (x: number, y: number) => {
    if (!exhibit || !active) return null;
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(exhibit.object, true)[0];
    if (!hit || hit.distance > 4 * metre) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work = exhibit.parts?.uses.get(o);
      if (work) {
        const at = o;
        return () =>
          touchingAt(hit, () => work(knobDirection(at, hit.point, camera)));
      }
    }
    return null;
  };
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre,
    floorY: 0,
    start: { x: start.x * metre, z: start.z * metre, yaw: start.yaw },
    floorAt: () => 0,
    // Carrying (107f): the control scheme's pick-up, carry and drop, for
    // the exhibit's portable objects (`exhibit-carrying.ts`), in the
    // scene's frame; a neighbour's copy's are never picked up.
    objects: scene,
    allowPickup: (object) =>
      Boolean(
        exhibit?.carrying &&
        active &&
        (partOf(object, exhibit.object) || !partOf(object, hall.group)),
      ),
    divert: (object, portable) =>
      Boolean(active && exhibit?.carrying?.divert?.(object, portable)),
    nearbyTargetFeedback: (object, portable) =>
      (active && exhibit?.carrying?.nearbyTargetFeedback?.(object, portable)) ||
      null,
    solids: () =>
      [
        ...hallSolids(id, seen),
        ...fittings,
        ...(exhibit?.solids?.({
          x: walk.walker.x / metre,
          z: walk.walker.z / metre,
        }) ?? []),
      ].map(toScene),
    use: (x, y) => useAt(x, y)?.(),
    aimed: () => Boolean(useAt(0, 0)),
    // The information overlay: each thing says only what it shows itself.
    inspect: createInspector({ root: scene, camera, metre }),
  });

  const withdraw = hallArches(id).map((a) => {
    const frame: DoorFrame = {
      x: a.frame.x * metre,
      z: a.frame.z * metre,
      yaw: a.frame.yaw,
    };
    return registerJoint(id as RoomId, a.to as RoomId, {
      frame,
      lazy: true,
      open: () => looking === a.to,
      angle: () => 0,
      swingTo: () => {},
      // No wall is cut: the archway is open already.
      opening: () => ({ minX: 1e9, maxX: 1e9, minZ: 1e9, maxZ: 1e9 }),
      see: (on) => {
        seen[a.to] = on;
        redraw();
      },
      // Drawn under hall `a.to`, seen through its archway.
      peek: (on) => {
        peekFrom = on ? a.to : peekFrom === a.to ? null : peekFrom;
        redraw();
      },
    });
  });

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    composer.setSize(Math.round(width), Math.round(height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let visual = true;
  // Whether this hall is the one walked in (not drawn under another).
  let active = true;
  let handing = false;
  let was: { x: number; z: number } | null = null;
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    exhibit?.parts?.setAudible(active);
    // The exhibit runs only while its hall is the one walked in.
    if (exhibit && active) {
      partAudio.listen(camera, metre, scene);
      exhibit.parts?.update(delta);
      exhibit.update?.(delta);
    }
    if (active && !walk.following) {
      const pose = walk.pose();
      const now = { x: pose.x / metre, z: pose.z / metre };
      looking = archToSee(id, { ...now, yaw: pose.yaw }, looking);
      fadeTo(now);
      const into = was && !handing ? crossedInto(id, was, now) : null;
      was = now;
      if (into && seen[into]) {
        handing = true;
        enterDevRoom(into as RoomId, id as RoomId, true);
      }
    }
    if (visual) composer.render(delta);
  });

  return Object.assign(
    () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      for (const off of withdraw) off();
      for (const e of [exhibit, ...copyExhibits]) {
        e?.parts?.dispose();
        e?.dispose?.();
      }
      disposeKit(kit, hall.group);
      observer.disconnect();
      composer.dispose();
      walk.dispose();
      hall.dispose();
      for (const copy of copies.values()) copy.dispose();
      for (const m of copyMaterials) m.dispose();
      shells.dispose();
      shellMaterials.dispose();
      freeEnvironment();
      renderer.dispose();
    },
    {
      setVisual(enabled: boolean) {
        visual = enabled;
      },
      // Arrived by a link from another hall, not seen through: inside its archway.
      enter(from: string | null) {
        active = true;
        // Walking in is pressing RESET: the exhibit from the start, its clock at now.
        exhibit?.reset(localNow());
        handing = false;
        was = null;
        if (from && hallArches(id).some((a) => a.to === from)) {
          const at = arrivalFrom(id, from);
          walk.place(at.x * metre, at.z * metre, at.yaw, 0);
        }
      },
      suspend() {
        active = false;
      },
      resume() {
        active = true;
        handing = false;
        was = null;
      },
    },
  );
}

/**
 * Gives every mesh under `root` its own copy of each material it draws
 * with (one copy of a material however many meshes share it), so the
 * copies can be faded without touching anything else drawn with the
 * originals; returns the copies. A copy keeps its original's shader hooks
 * (a PS1 material's) and shares its `userData` and textures.
 */
function ownMaterials(root: Object3D): Material[] {
  const copies = new Map<Material, Material>();
  const own = (original: Material) => {
    let made = copies.get(original);
    if (!made) {
      made = original.clone();
      made.onBeforeCompile = original.onBeforeCompile;
      made.customProgramCacheKey = original.customProgramCacheKey;
      made.userData = original.userData;
      copies.set(original, made);
    }
    return made;
  };
  root.traverse((obj) => {
    if (obj instanceof Mesh)
      obj.material = Array.isArray(obj.material)
        ? obj.material.map(own)
        : own(obj.material);
  });
  return [...copies.values()];
}
