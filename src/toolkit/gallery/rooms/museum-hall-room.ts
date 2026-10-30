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
  scaleRatio,
  followEffectSettings,
  useEnvironment,
  layoutSize,
} from '../../components/core/parts/render-style';
import { METRE } from '../../components/core/logic/units';
import { createFirstPerson } from '../../controls/input/first-person';
import type { Footprint } from '../../controls/logic/walk-collision';
import { registerJoint } from '../logic/door-joins';
import type { DoorFrame } from '../logic/door-joins';
import { enterDevRoom } from '../logic/dev-room-links';
import { installLiftLanding } from '../views/lift-landing';
import { createPartSet } from '../../components/core/parts/parts';
import { landingArrival } from '../logic/lift-doorway';
import { hallLiftPlace } from '../logic/museum-plan';
import { roomWorld } from '../../save/world-store';
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
import { projectorWhereabouts } from '../views/caustics-projector';
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
import { createFarVersion } from '../../components/core/views/far-version';
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
  const freeEnvironment = useEnvironment(
    renderer,
    scene,
    id === 'museum0' ? 0.1 : 0.2,
  );

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
      const copy = createMuseumHall(n, undefined, id);
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
    if (walk.hands)
      exhibit.carrying?.bind(walk.hands, {
        pitch: () => walk.pose().pitch,
        hold: (on) => walk.hold(on),
        look: (pitch) =>
          walk.place(walk.walker.x, walk.walker.z, walk.pose().yaw, pitch),
        // Through the walker's own eye (`first-person.ts`'s `film`), so
        // a hall drawn through an archway follows the shot, not the walker.
        film: ({ from, to, fov }) => {
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dz = to.z - from.z;
          walk.film({
            x: from.x,
            y: from.y,
            z: from.z,
            yaw: Math.atan2(dx, -dz),
            pitch: Math.atan2(dy, Math.hypot(dx, dz)),
            fov,
          });
          filmed = true;
        },
      });
  });
  // A neighbour's exhibit is only ever seen from another hall, so it is
  // drawn as its far version (the owner, 2026-10-29): flat colours, the
  // approximate shape, no screens, a handful of draws however many parts.
  const farCopies: { dispose(): void }[] = [];
  for (const [n, copy] of copies)
    void HALL_EXHIBITS[n]?.().then((m) => {
      if (disposed) return;
      const built = m.buildHallExhibit(kit);
      built.reset(localNow());
      built.update?.(0);
      const far = createFarVersion(built.object, { name: `${n} exhibit` });
      built.parts?.dispose();
      built.dispose?.();
      farCopies.push(far);
      copy.group.add(far.group);
      // It fades in with its hall, on its own materials.
      const own = far.materials;
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
  // fluorescent, cool and a little green, as an empty pool hall's, and
  // darkened (the owner, 2026-10-28): the projected pool its main light,
  // the posters lit by their own coves.
  scene.add(
    new AmbientLight(welcome ? '#dfe9f2' : '#f4f1ea', welcome ? 0.04 : 0.12),
  );
  scene.add(
    new HemisphereLight(
      welcome ? '#cfe2ee' : '#eef3f6',
      welcome ? '#4a5552' : '#8c8579',
      welcome ? 0.22 : 0.55,
    ),
  );
  const sun = new DirectionalLight('#fff3df', welcome ? 0.08 : 0.7);
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
        (welcome ? 1 : 9) * metre * metre,
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
    // A stencil buffer, for what is drawn only where it is seen through
    // an opening (Hall 5's skimmer, `skimmer-well.ts`).
    new WebGLRenderTarget(1, 1, {
      type: HalfFloatType,
      samples: 4,
      stencilBuffer: true,
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
  // Things that are not solid where they are drawn (light, and what is
  // only painted through an opening) cast no ambient occlusion: the pass
  // draws its normals with them hidden, as it hides points and lines.
  const aoHides = ao as unknown as {
    _overrideVisibility(): void;
    _visibilityCache: Object3D[];
  };
  const hideLines = aoHides._overrideVisibility.bind(ao);
  aoHides._overrideVisibility = () => {
    hideLines();
    scene.traverse((o) => {
      if (o.userData.noAmbientOcclusion && o.visible) {
        o.visible = false;
        aoHides._visibilityCache.push(o);
      }
    });
  };
  composer.addPass(ao);
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.25, 0.4, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const effects = followEffectSettings(composer, {
    ao,
    aoSamples: MUSEUM_AO_SAMPLES,
    bloom,
  });

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
    if (!active) return null;
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const targets = [
      ...(exhibit ? [exhibit.object] : []),
      ...(liftLanding ? [liftLanding.root] : []),
    ];
    const hit = raycaster.intersectObjects(targets, true)[0];
    if (!hit || hit.distance > 4 * metre) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work = exhibit?.parts?.uses.get(o) ?? liftParts.uses.get(o);
      if (work) {
        const at = o;
        return () =>
          touchingAt(hit, () => work(knobDirection(at, hit.point, camera)));
      }
    }
    return null;
  };
  // The lift landing's call button, worked like the exhibit's parts.
  const liftParts = createPartSet();
  let liftLanding: ReturnType<typeof installLiftLanding> | null = null;
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
        ...(liftLanding?.solids() ?? []),
      ].map(toScene),
    use: (x, y) => useAt(x, y)?.(),
    aimed: () => Boolean(useAt(0, 0)),
    // The information overlay: each thing says only what it shows itself.
    inspect: createInspector({ root: scene, camera, metre }),
  });

  // The freight lift's floor-4 landing on Hall 0's west wall (mission 108):
  // the museum's way in that is not a link.
  const liftPlace = hallLiftPlace(id);
  liftLanding = liftPlace
    ? installLiftLanding({
        room: id as RoomId,
        lift: 'freight',
        floor: '4',
        place: liftPlace,
        kit,
        parts: liftParts,
        parent: hall.group,
        metre,
        store: roomWorld(),
        walk,
        sign: 'GOODS LIFT · 4 MUSEUM',
      })
    : null;

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
    const { width, height } = layoutSize(canvas);
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    composer.setSize(Math.round(width), Math.round(height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // Seen through an archway from the hall walked in (the owner,
  // 2026-10-29): drawn at a quarter of its resolution, blurred, and with
  // its exhibit as its far version, coming clear as the walker nears the
  // archway: half resolution within 10 m, full and its real exhibit within
  // 5 m, the blur (at most 3 px) fading out by 4 m. The owner, 2026-10-29,
  // asked for it to come clear sooner, so the distances are doubled, and
  // for half as much blur.
  let farExhibit: ReturnType<typeof createFarVersion> | null = null;
  let seenShare = 1;
  let seenBlur = 0;
  let seenFar = false;
  const seeFrom = (metres: number | null) => {
    const share =
      metres === null ? 1 : metres > 10 ? 0.25 : metres > 5 ? 0.5 : 1;
    const blur =
      metres === null
        ? 0
        : Math.round(Math.max(0, Math.min(1, (metres - 4) / 8)) * 3 * 2) / 2;
    const useFar = metres !== null && metres > 5 && exhibit !== null;
    if (share !== seenShare) {
      seenShare = share;
      scaleRatio(renderer, share);
    }
    if (blur !== seenBlur) {
      seenBlur = blur;
      canvas.style.filter = blur > 0 ? `blur(${blur}px)` : '';
    }
    if (useFar !== seenFar && exhibit) {
      seenFar = useFar;
      if (useFar && !farExhibit) {
        farExhibit = createFarVersion(exhibit.object, {
          name: `${id} exhibit`,
        });
        exhibit.object.parent?.add(farExhibit.group);
      }
      exhibit.object.visible = !useFar;
      if (farExhibit) farExhibit.group.visible = useFar;
    }
  };
  /** How far the eye drawn under another hall is from this hall's nearest archway, metres. */
  const archwayDistance = () => {
    const pose = walk.pose();
    const x = pose.x / metre;
    const z = pose.z / metre;
    return Math.min(
      ...hallArches(id).map((a) => Math.hypot(x - a.frame.x, z - a.frame.z)),
    );
  };

  let visual = true;
  // Whether this hall is the one walked in (not drawn under another).
  let active = true;
  let handing = false;
  let was: { x: number; z: number } | null = null;
  /** Whether the exhibit gave a film's shot this frame. */
  let filmed = false;
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    exhibit?.parts?.setAudible(active);
    // The exhibit runs only while its hall is the one walked in.
    filmed = false;
    if (exhibit && active) {
      partAudio.listen(camera, metre, scene);
      exhibit.parts?.update(delta);
      exhibit.update?.(delta);
    }
    // A film not shot this frame has ended: the walker's eye back.
    if (!filmed) walk.film(null);
    // The hall's own moving parts (Hall 0's projector), while walked in;
    // and Hall 0's projector seen from a neighbour, going out after the
    // walker leaves it (the owner, 2026-10-28).
    if (active) {
      projectorWhereabouts.walkerIn(id, performance.now() / 1000);
      hall.update(delta);
      copies.get('museum0')?.update(delta);
    }
    liftParts.update(delta);
    liftLanding?.update();
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
    seeFrom(active ? null : archwayDistance());
    if (visual) composer.render(delta);
  });

  return Object.assign(
    () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      for (const off of withdraw) off();
      liftLanding?.dispose();
      liftParts.dispose();
      exhibit?.parts?.dispose();
      exhibit?.dispose?.();
      disposeKit(kit, hall.group);
      observer.disconnect();
      composer.dispose();
      walk.dispose();
      hall.dispose();
      for (const copy of copies.values()) copy.dispose();
      for (const far of farCopies) far.dispose();
      farExhibit?.dispose();
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
        effects.allowAmbientOcclusion(true);
        // Walking in is pressing RESET: the exhibit from the start, its clock at now.
        exhibit?.reset(localNow());
        handing = false;
        was = null;
        if (from && hallArches(id).some((a) => a.to === from)) {
          const at = arrivalFrom(id, from);
          walk.place(at.x * metre, at.z * metre, at.yaw, 0);
        } else if (from === 'freight_lift' && liftPlace) {
          // Out of the lift by a link: in front of its landing.
          const at = landingArrival(liftPlace);
          walk.place(at.x * metre, at.z * metre, at.yaw, 0);
        }
      },
      // Ambient occlusion only in the hall walked in, not one drawn under it.
      suspend() {
        active = false;
        effects.allowAmbientOcclusion(false);
        liftLanding?.suspend();
      },
      resume() {
        active = true;
        liftLanding?.resume();
        effects.allowAmbientOcclusion(true);
        handing = false;
        was = null;
      },
    },
  );
}
