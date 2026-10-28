import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  HalfFloatType,
  HemisphereLight,
  PerspectiveCamera,
  PointLight,
  Scene,
  Vector2,
  WebGLRenderTarget,
} from 'three';
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
  startOf,
} from '../logic/museum-plan';
import type { MuseumHallId } from '../logic/museum-plan';
import { createMuseumHall } from '../views/museum-hall';
import {
  createEmptyHallMaterials,
  createRingShells,
} from '../views/museum-empty-hall';
import { safetySolids } from '../logic/museum-safety';

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
      // The courtyard is drawn only through the windows (a stencil).
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
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre,
    floorY: 0,
    start: { x: start.x * metre, z: start.z * metre, yaw: start.yaw },
    floorAt: () => 0,
    solids: () => [...hallSolids(id, seen), ...fittings].map(toScene),
    use: () => {},
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
        shells.see(a.to, on);
      },
      peek: () => {},
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
    if (active && !walk.following) {
      const pose = walk.pose();
      const now = { x: pose.x / metre, z: pose.z / metre };
      looking = archToSee(id, { ...now, yaw: pose.yaw }, looking);
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
      renderer.setAnimationLoop(null);
      for (const off of withdraw) off();
      observer.disconnect();
      composer.dispose();
      walk.dispose();
      hall.dispose();
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
