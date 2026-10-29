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
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import {
  createComposer,
  createRenderer,
  followEffectSettings,
  layoutSize,
} from '../../components/core/parts/render-style';
import { METRE } from '../../components/core/logic/units';
import { createFirstPerson } from '../../controls/input/first-person';
import { DEFAULT_POOL_LOOK, POOL_LOOKS } from '../logic/pool-looks';
import { createRoundPinkRoom } from '../views/dry-stair-passage';
import {
  createGreenRoom,
  GREEN_ROOM,
  greenRoomSolids,
  greenRoomZoneAt,
} from '../views/green-room';
import {
  createDiamondStairCorridor,
  DIAMOND_STAIR,
  DIAMOND_STAIR_WEST_X,
  diamondStairFloorAt,
  diamondStairSolids,
  diamondStairZoneAt,
} from '../views/diamond-stair-corridor';
import {
  createWhiteCorridor,
  WHITE_CORRIDOR,
  WHITE_CORRIDOR_START,
  whiteCorridorFloorAt,
  whiteCorridorSolids,
  whiteCorridorZoneAt,
} from '../views/white-corridor';

type Zone =
  | 'CR_A_ROUND'
  | 'white_corridor_1'
  | 'green_room_1'
  | 'CR_GREEN_STAIR';

/**
 * white_corridor_1: the white corridor north out of CR_A_ROUND, in its
 * own scene with the round room it opens from. Walking back out into the
 * round room hands the walker on.
 */
export function startWhiteCorridorRoom(
  canvas: HTMLCanvasElement,
  initialZone: Zone = 'white_corridor_1',
) {
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
  const rooms = createWhiteCorridor(metre);
  rooms.add(createRoundPinkRoom(1));
  rooms.add(createGreenRoom(1));
  rooms.add(createDiamondStairCorridor(1));
  scene.add(rooms);

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
  followEffectSettings(composer, { ao, bloom, film });

  const walls = [
    ...whiteCorridorSolids(),
    ...greenRoomSolids(),
    ...diamondStairSolids(),
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
    // In the corridor, a step in from the hall, looking along it.
    start: {
      x:
        (initialZone === 'CR_GREEN_STAIR'
          ? DIAMOND_STAIR.eastX - 0.5
          : WHITE_CORRIDOR.x) * metre,
      z:
        (initialZone === 'CR_GREEN_STAIR'
          ? DIAMOND_STAIR.z
          : initialZone === 'green_room_1'
            ? GREEN_ROOM.southZ - 2
            : WHITE_CORRIDOR_START - 1) * metre,
      yaw: 0,
    },
    floorAt: (x, z) =>
      (diamondStairFloorAt(x / metre, z / metre) ??
        whiteCorridorFloorAt(x / metre, z / metre) ??
        (greenRoomZoneAt(x / metre, z / metre)
          ? GREEN_ROOM.floorY
          : WHITE_CORRIDOR.floorY)) * metre,
    solids: () => walls,
    use: () => {},
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
  let zone: Zone = initialZone;
  let visual = true;
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    if (
      walk.walker.x / metre <= DIAMOND_STAIR_WEST_X + 0.06 &&
      Math.abs(walk.walker.z / metre - DIAMOND_STAIR.z) < 0.8
    ) {
      window.dispatchEvent(
        new CustomEvent('pool-plant:coordinate-hop', {
          detail: {
            room: 'CR_A_STEPS',
            x: 3.1,
            y: 0.82,
            z: 24.54,
            yaw: 270,
            pitch: 0,
            zoom: walk.zoom,
          },
        }),
      );
      return;
    }
    // Out of its mouth is back in the round room.
    const nextZone: Zone =
      diamondStairZoneAt(walk.walker.x / metre, walk.walker.z / metre) ??
      greenRoomZoneAt(walk.walker.x / metre, walk.walker.z / metre) ??
      whiteCorridorZoneAt(walk.walker.x / metre, walk.walker.z / metre) ??
      'CR_A_ROUND';
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
      enter() {
        zone = initialZone;
      },
    },
  );
}

/** A separately mounted scene with its own renderer and walker. */
export function startGreenRoom(canvas: HTMLCanvasElement) {
  return startWhiteCorridorRoom(canvas, 'green_room_1');
}

export function startDiamondStairRoom(canvas: HTMLCanvasElement) {
  return startWhiteCorridorRoom(canvas, 'CR_GREEN_STAIR');
}
