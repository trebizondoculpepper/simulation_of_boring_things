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
import { createFirstPerson } from '../../controls/input/first-person';
import { DEFAULT_POOL_LOOK, POOL_LOOKS } from '../logic/pool-looks';
import {
  ARCHED_CORRIDOR,
  ARCHED_LINK_Z,
  ARCHED_ROOM,
  archedCorridorSolids,
  archedFloorAt,
  archedZoneAt,
  createArchedCorridor,
} from '../views/arched-corridor';
import {
  DIAMOND_STAIR,
  DIAMOND_STAIR_WEST_X,
} from '../views/diamond-stair-corridor';

type Zone = 'PR_A' | 'CR_A_ARCH' | 'CR_A_STEPS';

/**
 * CR_A_ARCH and CR_A_STEPS, one world: the arched corridor south of PR_A
 * and the stepped room it opens into, in their own scene with PR_A's
 * finish. Walking between them, or back into PR_A, hands the walker on.
 */
export function startArchedRooms(canvas: HTMLCanvasElement) {
  const metre = METRE;
  const scene = new Scene();
  scene.background = null;
  const renderer = createRenderer(canvas, true);
  renderer.toneMapping = ACESFilmicToneMapping;
  const look = POOL_LOOKS[DEFAULT_POOL_LOOK];
  renderer.toneMappingExposure = look.exposure;
  renderer.setClearColor('#d8e1df', 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const camera = new PerspectiveCamera(68, 1, 0.05 * metre, 80 * metre);
  scene.add(new AmbientLight('#f4f7f5', 0.18));
  scene.add(new HemisphereLight('#e9f3f1', '#65716f', 0.45));
  const rooms = createArchedCorridor(
    metre,
    { ...look.walls, bump: look.bump },
    { ...look.deck, bump: look.bump },
  );
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

  const walls = archedCorridorSolids().map((s) => ({
    minX: s.minX * metre,
    maxX: s.maxX * metre,
    minZ: s.minZ * metre,
    maxZ: s.maxZ * metre,
  }));
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre,
    floorY: 0,
    // In the corridor, a step in from the hall, looking down it.
    start: {
      x: ARCHED_CORRIDOR.x * metre,
      z: (ARCHED_CORRIDOR.mouthZ + 1) * metre,
      yaw: Math.PI,
    },
    floorAt: (x, z) => (archedFloorAt(x / metre, z / metre) ?? 0) * metre,
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
  let zone: Zone = 'CR_A_ARCH';
  let visual = true;
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    if (
      walk.walker.x / metre >= ARCHED_ROOM.maxX + 0.86 &&
      Math.abs(walk.walker.z / metre - ARCHED_LINK_Z) < 0.8
    ) {
      window.dispatchEvent(
        new CustomEvent('pool-plant:coordinate-hop', {
          detail: {
            room: 'CR_GREEN_STAIR',
            x: DIAMOND_STAIR_WEST_X + 0.2,
            y: DIAMOND_STAIR.floorY + 1 + 1.82,
            z: DIAMOND_STAIR.z,
            yaw: 90,
            pitch: 0,
            zoom: walk.zoom,
          },
        }),
      );
      return;
    }
    // Off the corridor's floor at its north end is back in the hall.
    const nextZone: Zone =
      archedZoneAt(walk.walker.x / metre, walk.walker.z / metre) ?? 'PR_A';
    if (nextZone !== zone) {
      zone = nextZone;
      window.dispatchEvent(
        new CustomEvent('pool-plant:room-zone', { detail: nextZone }),
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
      enter(_from: string | null, room: string) {
        zone = room === 'CR_A_STEPS' ? 'CR_A_STEPS' : 'CR_A_ARCH';
      },
    },
  );
}
