import {
  ACESFilmicToneMapping,
  AmbientLight,
  HemisphereLight,
  HalfFloatType,
  Mesh,
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
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import {
  createComposer,
  createRenderer,
} from '../../components/core/parts/render-style';
import { METRE } from '../../components/core/logic/units';
import { createFirstPerson } from '../../controls/input/first-person';
import { DEFAULT_POOL_LOOK, POOL_LOOKS } from '../logic/pool-looks';
import {
  createDryStairPassage,
  createRoundPinkRoom,
  DRY_PASSAGE,
  dryPassageFloorAt,
  dryPassageSolids,
  roundRoomFloorAt,
  roundRoomSolids,
  ROUND_ROOM,
} from '../views/dry-stair-passage';
import {
  createWhiteCorridor,
  whiteCorridorFloorAt,
  whiteCorridorSolids,
  whiteCorridorZoneAt,
} from '../views/white-corridor';
import { createGreenRoom } from '../views/green-room';

/** The corridor's own scene, with PR_A's finish but no pool water. */
export function startDryStairRoom(canvas: HTMLCanvasElement) {
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
  const borrowedPoolLight = new PointLight('#f0f7f5', 700, 11 * metre, 1.5);
  borrowedPoolLight.position.set(-13.5 * metre, 3.2 * metre, -4.6 * metre);
  scene.add(borrowedPoolLight);
  const passage = createDryStairPassage(metre);
  scene.add(passage);
  const roundRoom = createRoundPinkRoom(metre);
  scene.add(roundRoom);
  const whiteCorridor = createWhiteCorridor(metre);
  scene.add(whiteCorridor);
  const greenRoom = createGreenRoom(metre);
  scene.add(greenRoom);

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

  const midZ = (DRY_PASSAGE.nearZ + DRY_PASSAGE.farZ) / 2;

  const walls = [
    ...dryPassageSolids(),
    ...roundRoomSolids(),
    ...whiteCorridorSolids(),
  ].map((s) => ({
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
    start: { x: -17 * metre, z: midZ * metre, yaw: -Math.PI / 2 },
    floorAt: (x, z) =>
      (dryPassageFloorAt(x / metre, z / metre) ??
        roundRoomFloorAt(x / metre, z / metre) ??
        whiteCorridorFloorAt(x / metre, z / metre) ??
        0) * metre,
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
  let zone: 'PR_A' | 'CR_A_UP' | 'CR_A_ROUND' | 'white_corridor_1' = 'CR_A_UP';
  let visual = true;
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    const x = walk.walker.x / metre;
    const nextZone =
      whiteCorridorZoneAt(x, walk.walker.z / metre) ??
      (x >= DRY_PASSAGE.mouthX
        ? 'PR_A'
        : x < ROUND_ROOM.centreX + ROUND_ROOM.radius - 0.15
          ? 'CR_A_ROUND'
          : 'CR_A_UP');
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
      passage.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      whiteCorridor.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      greenRoom.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      roundRoom.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      renderer.dispose();
    },
    {
      setVisual(enabled: boolean) {
        visual = enabled;
      },
      enter(_from: string | null, room: string) {
        zone = room === 'CR_A_ROUND' ? 'CR_A_ROUND' : 'CR_A_UP';
      },
    },
  );
}
