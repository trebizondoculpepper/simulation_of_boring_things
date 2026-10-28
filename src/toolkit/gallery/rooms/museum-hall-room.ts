import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  HalfFloatType,
  HemisphereLight,
  PerspectiveCamera,
  PointLight,
  Scene,
  SpotLight,
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
  MUSEUM_SIZES,
  archToSee,
  arrivalFrom,
  crossedInto,
  hallArches,
  hallSolids,
  startOf,
} from '../logic/museum-plan';
import type { MuseumHallId } from '../logic/museum-plan';
import { createMuseumHall } from '../views/museum-hall';

/**
 * A hall of the pool science museum (mission 107), in its own scene: its
 * archways are doorways the app sees through (`door-joins.ts`), always
 * open, one at a time (the one the visitor is at, or looking towards:
 * `archToSee`); the other shows a plain stand-in. Crossing an archway's
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
  const { d, h } = MUSEUM_SIZES[id];

  // Daylight through the west windows and the soft light of a white room;
  // the same in every hall, so an archway's reveal is lit alike either side.
  scene.add(new AmbientLight('#f4f1ea', 0.12));
  scene.add(new HemisphereLight('#eef3f6', '#8c8579', 0.55));
  const sun = new DirectionalLight('#fff3df', 0.7);
  sun.position.set(-10 * metre, 14 * metre, 3 * metre);
  scene.add(sun);
  // The gallery lights: four warm pools of light, each 5 m in from an end wall.
  for (const x of [-4, 4])
    for (const z of [-d / 2 + 5, d / 2 - 5]) {
      const lamp = new PointLight('#ffe9c8', 9 * metre * metre, 16 * metre, 2);
      lamp.position.set(x * metre, (h - 2.6) * metre, z * metre);
      scene.add(lamp);
    }
  if (id === 'museum1') {
    // The title wall, washed by its own spot.
    const wash = new SpotLight(
      '#fff4e0',
      220 * metre * metre,
      22 * metre,
      0.7,
      0.6,
      2,
    );
    wash.position.set(0, (h - 2.5) * metre, (d / 2 - 9) * metre);
    wash.target.position.set(0, 3.5 * metre, (d / 2) * metre);
    scene.add(wash, wash.target);
  }

  const composer = createComposer(
    renderer,
    new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 }),
  );
  const base = new RenderPass(scene, camera);
  base.clearAlpha = 0;
  composer.addPass(base);
  const ao = new GTAOPass(scene, camera, 1, 1);
  ao.updateGtaoMaterial({
    distanceExponent: 1.4,
    thickness: 1.2 * metre,
    scale: 1,
    samples: 12,
    radius: 0.6 * metre,
  });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 });
  ao.blendIntensity = 0.8;
  composer.addPass(ao);
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.25, 0.4, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  followEffectSettings(composer, { ao, bloom });

  // Which archway's hall is drawn through it, and which are being seen.
  const seen: Partial<Record<MuseumHallId, boolean>> = {};
  let looking: MuseumHallId | null = null;
  const toScene = (f: Footprint) => ({
    minX: f.minX * metre,
    maxX: f.maxX * metre,
    minZ: f.minZ * metre,
    maxZ: f.maxZ * metre,
  });
  const start = startOf(id);
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre,
    floorY: 0,
    start: { x: start.x * metre, z: start.z * metre, yaw: start.yaw },
    floorAt: () => 0,
    solids: () => hallSolids(id, seen).map(toScene),
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
        const standIn = hall.standIns.get(a.to);
        if (standIn) standIn.visible = !on;
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
