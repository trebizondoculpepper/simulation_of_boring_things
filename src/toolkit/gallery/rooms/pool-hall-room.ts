import {
  ACESFilmicToneMapping,
  AmbientLight,
  HemisphereLight,
  HalfFloatType,
  Mesh,
  PerspectiveCamera,
  Scene,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createRenderer } from '../../components/core/parts/render-style';
import { METRE } from '../../components/core/logic/units';
import {
  createFirstPerson,
  EYE_HEIGHT_METRES,
} from '../../controls/input/first-person';
import {
  corridorFloorAt,
  corridorFootprints,
} from '../../components/architectural/logic/corridor-path';
import {
  carry,
  HAND_OVER,
  intoCorridor,
  LOOP_LEGS,
  roomCorridors,
} from '../logic/pool-loop';
import type { LoopRoom, Pose } from '../logic/pool-loop';
import { DEFAULT_POOL_LOOK, POOL_LOOKS } from '../logic/pool-looks';
import { createPoolHall } from '../views/pool-hall';
import {
  galleryPlan,
  hallFloorAt,
  hallSolids,
  POOL_HALLS,
} from '../logic/pool-halls';
import type { PoolHallId } from '../logic/pool-halls';

/**
 * A version-one pool hall (pool_01 to pool_04), in its own scene. None has
 * doors yet: each is reached by its URL until corridors join them.
 */
export function startPoolHallRoom(
  canvas: HTMLCanvasElement,
  id: PoolHallId,
  { inGallery = false }: { inGallery?: boolean } = {},
) {
  const spec = POOL_HALLS[id];
  // In the underwater gallery (pool_02_gallery) the walker is kept to it.
  const gallery = inGallery ? galleryPlan(spec) : null;
  const metre = METRE;
  const scene = new Scene();
  scene.background = null;
  const renderer = createRenderer(canvas, true);
  renderer.toneMapping = ACESFilmicToneMapping;
  const look = POOL_LOOKS[DEFAULT_POOL_LOOK];
  renderer.toneMappingExposure = look.exposure;
  renderer.setClearColor('#d8e1df', 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  // The sun through the skylights casts shadows.
  renderer.shadowMap.enabled = true;
  const camera = new PerspectiveCamera(68, 1, 0.05 * metre, 140 * metre);
  scene.add(new AmbientLight('#f4f7f5', 0.25));
  scene.add(new HemisphereLight('#e9f3f1', '#65716f', 0.6));
  const rooms = createPoolHall(spec, metre, {
    underwater: Boolean(gallery),
    loopRoom: gallery ? 'pool_02_gallery' : id,
  });
  scene.add(rooms);

  const composer = new EffectComposer(
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
    radius: look.ao.radius * metre,
  });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 });
  ao.blendIntensity = look.ao.blend;
  composer.addPass(ao);
  const bloom = new UnrealBloomPass(
    new Vector2(1, 1),
    look.bloom.strength,
    look.bloom.radius,
    look.bloom.threshold,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      time: { value: 0 },
      grain: { value: look.grain },
      vignette: { value: look.vignette },
    },
    vertexShader:
      'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time, grain, vignette; varying vec2 vUv;
float rand(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
void main() { vec2 c = vUv - 0.5; vec2 shift = c * dot(c, c) * 0.006;
vec4 sampleColour = texture2D(tDiffuse, vUv);
vec3 colour = vec3(texture2D(tDiffuse, vUv + shift).r, sampleColour.g, texture2D(tDiffuse, vUv - shift).b);
colour *= 1.0 - vignette * smoothstep(0.25, 0.85, length(c * vec2(1.15, 1.0)));
colour += (rand(vUv * 731.0) - 0.5) * grain;
gl_FragColor = vec4(colour, sampleColour.a); }`,
  });
  composer.addPass(film);

  const half = 0.6;
  // Its place in the pool loop, and the loop's corridors in its scene.
  const loopRoom: LoopRoom = gallery ? 'pool_02_gallery' : id;
  const { leaving, arriving } = roomCorridors(loopRoom);
  const corridors = [...leaving.placed, ...arriving.placed];
  const walls = [
    ...(gallery
      ? [
          // The gallery's long walls; its ends open onto the corridors.
          {
            minX: gallery.x0,
            maxX: gallery.x1,
            minZ: gallery.z - half - 1,
            maxZ: gallery.z - half,
          },
          {
            minX: gallery.x0,
            maxX: gallery.x1,
            minZ: gallery.z + half,
            maxZ: gallery.z + half + 1,
          },
        ]
      : hallSolids(spec)),
    ...corridorFootprints(corridors),
  ].map((s) => ({
    minX: s.minX * metre,
    maxX: s.maxX * metre,
    minZ: s.minZ * metre,
    maxZ: s.maxZ * metre,
  }));
  const walk = createFirstPerson({
    canvas,
    camera,
    metre,
    floorY: (gallery?.floor ?? 0) * metre,
    // In the gallery, at its west end looking east along the windows.
    start: gallery
      ? { x: (gallery.x0 + 1) * metre, z: gallery.z * metre, yaw: Math.PI / 2 }
      : {
          x: spec.start.x * metre,
          z: spec.start.z * metre,
          yaw: spec.start.yaw,
        },
    floorAt: (x, z) =>
      (corridorFloorAt(corridors, x / metre, z / metre) ??
        (gallery ? gallery.floor : hallFloorAt(spec, x / metre, z / metre))) *
      metre,
    solids: () => walls,
    use: () => {},
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
  let hopping = false;
  /** On to `room`, standing at `pose` in its copy of the corridor. */
  const hop = (room: LoopRoom, pose: Pose) => {
    hopping = true;
    const there = roomCorridors(room);
    const floor =
      corridorFloorAt(
        [...there.leaving.placed, ...there.arriving.placed],
        pose.x,
        pose.z,
      ) ?? 0;
    window.dispatchEvent(
      new CustomEvent('pool-plant:coordinate-hop', {
        detail: {
          room,
          x: pose.x,
          y: floor + EYE_HEIGHT_METRES,
          z: pose.z,
          yaw: (pose.yaw * 180) / Math.PI,
          pitch: (walk.walker.pitch * 180) / Math.PI,
          zoom: walk.zoom,
        },
      }),
    );
  };
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    // A step into the corridor leaving hands the walker on to the next
    // room; a step back out of the corridor arriving, to the last.
    if (!hopping) {
      const x = walk.walker.x / metre;
      const z = walk.walker.z / metre;
      const pose = { x, z, y: 0, yaw: walk.walker.yaw };
      const onward = intoCorridor(leaving, x, z);
      const back = intoCorridor(arriving, x, z);
      if (onward !== null && onward > HAND_OVER.onward && onward < 1.5)
        hop(
          LOOP_LEGS[leaving.leg].to,
          carry(
            pose,
            leaving,
            roomCorridors(LOOP_LEGS[leaving.leg].to).arriving,
          ),
        );
      else if (back !== null && back < HAND_OVER.back && back > -1)
        hop(
          LOOP_LEGS[arriving.leg].from,
          carry(
            pose,
            arriving,
            roomCorridors(LOOP_LEGS[arriving.leg].from).leaving,
          ),
        );
    }
    if (visual) {
      film.uniforms.time.value = (time / 1000) % 100;
      composer.render(delta);
    }
  });
  return Object.assign(
    () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      composer.dispose();
      walk.dispose();
      rooms.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      renderer.dispose();
    },
    {
      setVisual(enabled: boolean) {
        visual = enabled;
      },
      // Shown again (walked back into): ready to hand on once more.
      resume() {
        hopping = false;
      },
    },
  );
}
