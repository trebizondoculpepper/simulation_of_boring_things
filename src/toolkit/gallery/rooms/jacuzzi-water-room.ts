import {
  ACESFilmicToneMapping,
  AmbientLight,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  createComposer,
  createRenderer,
  followEffectSettings,
} from '../../components/core/parts/render-style';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { METRE } from '../../components/core/logic/units';
import { partAudio } from '../../components/core/audio/part-audio';
import { createFirstPerson } from '../../controls/input/first-person';
import { knobDirection } from '../../controls/input/knob-turning';
import { createPoolHall } from '../views/pool-hall';
import { createJacuzziFibreWall } from '../../components/architectural/views/jacuzzi-fibre-wall';
import { newFibreIlluminator } from '../../../game/plant/fibre-illuminator';
import { POOL_HALLS, hallFloorAt, hallSolids } from '../logic/pool-halls';
import { POOL_LOOKS, DEFAULT_POOL_LOOK } from '../logic/pool-looks';
import { createJacuzziDemo } from './plant/pool-amenities';
import {
  createSpaEffectsPanel,
  mountSpaEffectsOnPost,
} from '../views/spa-effects-panel';

/** Dev35: the existing jacuzzi and its room, with a private, unsaved controller. */
export function startJacuzziWaterRoom(canvas: HTMLCanvasElement) {
  const metre = METRE;
  const spec = { ...POOL_HALLS.pool_03, plantDoor: undefined };
  const kit = createPanelKit();
  const scene = new Scene();
  scene.background = null;
  const renderer = createRenderer(canvas, true);
  renderer.toneMapping = ACESFilmicToneMapping;
  const look = POOL_LOOKS[DEFAULT_POOL_LOOK];
  renderer.toneMappingExposure = look.exposure;
  renderer.setClearColor('#d8e1df', 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  const camera = new PerspectiveCamera(68, 1, 0.05 * metre, 80 * metre);
  scene.add(new AmbientLight('#f4f7f5', 0.25));
  scene.add(new HemisphereLight('#e9f3f1', '#65716f', 0.6));
  // Reuse the hall geometry and both jacuzzi components, not copied geometry.
  const hall = createPoolHall(spec, metre);
  const fibreWall = createJacuzziFibreWall(
    spec.w,
    spec.d,
    spec.tileTop,
    spec.h,
  );
  hall.add(fibreWall.group);
  const fibreState = newFibreIlluminator();
  // Its effects panel (the owner, 2026-10-24): the water's level in 5 %
  // steps, and the jets, light and bubbles each on or off, set directly.
  const effects = createSpaEffectsPanel(kit, 'TUB EFFECTS');
  const { tub, plate } = createJacuzziDemo(
    kit,
    effects.effects,
    spec.w / 2 - 2.7 + 0.15,
  );
  // The low post stands between the supplied viewpoint and the tub, with
  // its controls facing east toward the walker and the water behind it.
  const effectsPost = mountSpaEffectsOnPost(kit, effects.group);
  effectsPost.position.set(-0.4, 0, -0.04);
  effectsPost.rotation.y = Math.PI / 2;
  const devWindow = window as unknown as { jacuzziWater?: unknown };
  devWindow.jacuzziWater = { tub, plate, effects };
  tub.object.position.x = -2.7;
  hall.add(tub.object);
  const corner = new Group();
  corner.position.set(-2.7 + 1.3, 0.9 - 0.026, 1.3);
  corner.rotation.y = Math.PI / 4;
  plate.object.rotation.x = -Math.PI / 2;
  corner.add(plate.object);
  hall.add(corner);
  hall.add(effectsPost);
  scene.add(hall);
  const composer = createComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new Vector2(1, 1),
    look.bloom.strength,
    look.bloom.radius,
    look.bloom.threshold,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  followEffectSettings(composer, { bloom });
  const walls = [
    ...hallSolids(spec),
    {
      minX: -0.52,
      maxX: -0.28,
      minZ: -0.16,
      maxZ: 0.08,
    },
    // The prototype has no neighbours: keep the walker inside its hall.
    {
      minX: -spec.w / 2,
      maxX: spec.w / 2,
      minZ: -spec.d / 2 - 0.2,
      maxZ: -spec.d / 2,
    },
    {
      minX: -spec.w / 2,
      maxX: spec.w / 2,
      minZ: spec.d / 2,
      maxZ: spec.d / 2 + 0.2,
    },
  ].map((s) => ({
    minX: s.minX * metre,
    maxX: s.maxX * metre,
    minZ: s.minZ * metre,
    maxZ: s.maxZ * metre,
  }));
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const useAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    // Pick against the scene too, so the plinth cannot be clicked through.
    const hit = raycaster.intersectObject(hall, true)[0];
    if (!hit || hit.distance > 3 * metre) return null;
    for (let o = hit.object; o; o = o.parent!) {
      const use = plate.parts?.uses.get(o) ?? effects.parts.uses.get(o);
      if (use) return () => use(knobDirection(o, hit.point, camera));
      if (o === hall) break;
    }
    return null;
  };
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre,
    floorY: 0,
    start: {
      x: spec.start.x * metre,
      z: spec.start.z * metre,
      yaw: spec.start.yaw,
    },
    floorAt: (x, z) => hallFloorAt(spec, x / metre, z / metre) * metre,
    solids: () => walls,
    use: (x, y) => useAt(x, y)?.(),
    aimed: () => Boolean(useAt(0, 0)),
  });
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(Math.round(width), Math.round(height));
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
    walk.update(delta);
    tub.update?.(delta);
    plate.parts?.update(delta);
    effects.update(delta);
    fibreWall.update(time / 1000, fibreState);
    partAudio.listen(camera, metre);
    composer.render(delta);
  });
  return () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    tub.dispose?.();
    plate.parts?.dispose();
    effects.dispose();
    fibreWall.dispose();
    plate.dispose?.();
    for (const pass of composer.passes) pass.dispose();
    composer.dispose();
    const materials = new Set(kit.materials);
    hall.traverse((o) => {
      if (o instanceof Mesh) {
        for (const material of Array.isArray(o.material)
          ? o.material
          : [o.material])
          materials.add(material);
      }
    });
    for (const material of materials) {
      if (!kit.materials.includes(material)) material.dispose();
    }
    disposeKit(kit, hall);
    renderer.dispose();
    delete devWindow.jacuzziWater;
  };
}
