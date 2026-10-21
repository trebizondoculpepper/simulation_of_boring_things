import {
  ACESFilmicToneMapping,
  AmbientLight,
  HemisphereLight,
  HalfFloatType,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import type { Object3D } from 'three';
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
  WALKER_RADIUS_METRES,
} from '../../controls/input/first-person';
import { DEFAULT_POOL_LOOK, POOL_LOOKS } from '../logic/pool-looks';
import { createMainCorridor } from '../views/main-corridor';
import {
  corridorDoorBlock,
  corridorSolids,
  doorPlace,
  inCorridor,
  MAIN_CORRIDOR,
} from '../logic/main-corridor';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import { knobDirection } from '../../controls/input/knob-turning';
import { registerJoint } from '../logic/door-joins';
import { doorwayStops, overlaps } from '../logic/doorway';
import { doorReaders } from '../../components/architectural/logic/card-reader';
import { enterDevRoom } from '../logic/dev-room-links';
import type { RoomId } from '../logic/dev-room-links';

/**
 * main_corridor: the L-shaped plant corridor (`logic/main-corridor.ts`),
 * in its own scene: each plant room's equipment doors open off its outer
 * walls, seen through and walked through without a break; the wet hall's
 * doors, in its inner walls, are shut until the wet hall is built.
 */
export function startMainCorridorRoom(canvas: HTMLCanvasElement) {
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
  const kit = createPanelKit();
  const parts = createPartSet();
  const { group: rooms, doors } = createMainCorridor(metre, kit);
  for (const d of doors) parts.add(d.part);
  scene.add(rooms);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(rooms, true)[0];
    if (!hit || hit.distance > 3 * metre) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work = parts.uses.get(o);
      if (work) {
        const at = o;
        return () => work(knobDirection(at, hit.point, camera));
      }
    }
    return null;
  };
  const toMetre = (s: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }) => ({
    minX: s.minX * metre,
    maxX: s.maxX * metre,
    minZ: s.minZ * metre,
    maxZ: s.maxZ * metre,
  });
  // Each plant room's doors as a doorway the app sees through
  // (`door-joins.ts`): open, the room is built and drawn beyond; walked
  // through, the walker is handed over to it without a break.
  const yawInto = {
    north: 0,
    south: Math.PI,
    west: Math.PI / 2,
    east: -Math.PI / 2,
  } as const;
  const links = doors
    .filter((d) => d.door.to.startsWith('plant_'))
    .map((d) => {
      const p = doorPlace(d.door);
      const to = d.door.to as RoomId;
      const link = { ...d, p, to, seen: false };
      const withdraw = registerJoint('main_corridor', to, {
        frame: {
          x: p.x * metre,
          z: p.z * metre,
          y: 0,
          yaw: yawInto[d.door.wall],
        },
        onOpen: true,
        open: () => d.part.open(),
        angle: () => d.part.angle(),
        swingTo: (a) => d.part.swingTo(a),
        opening: () => {
          const half = MAIN_CORRIDOR.opening / 2;
          const x0 = p.x - p.into[0] * 2;
          const z0 = p.z - p.into[1] * 2;
          return toMetre({
            minX: Math.min(p.x, x0) - (p.into[0] ? 0.1 : half),
            maxX: Math.max(p.x, x0) + (p.into[0] ? 0.1 : half),
            minZ: Math.min(p.z, z0) - (p.into[1] ? 0.1 : half),
            maxZ: Math.max(p.z, z0) + (p.into[1] ? 0.1 : half),
          });
        },
        see: (on) => {
          link.seen = on;
          d.lobby.visible = !on;
        },
        peek: (on) => d.part.showLeaves(!on),
      });
      // The same record the doorway's `see` marks: not a copy of it.
      return Object.assign(link, {
        withdraw,
        block: toMetre(corridorDoorBlock(d.door)),
      });
    });
  // The wet hall's doors stay shut to walking until it is built.
  // Every doorway, metres: its leaves' place across the wall, a stop just
  // beyond it, and its plant room's link if it has one.
  const ways = doors.map((d) => {
    const leaf = corridorDoorBlock(d.door);
    const p = doorPlace(d.door);
    const t = MAIN_CORRIDOR.wall;
    const out = { x: -p.into[0] * (t + 0.15), z: -p.into[1] * (t + 0.15) };
    return {
      part: d.part,
      link: links.find((l) => l.door === d.door),
      leaf,
      beyond: {
        minX: leaf.minX + out.x,
        maxX: leaf.maxX + out.x,
        minZ: leaf.minZ + out.z,
        maxZ: leaf.maxZ + out.z,
      },
    };
  });
  const inWay = (w: (typeof ways)[number]) =>
    overlaps(
      w.leaf,
      walk.walker.x / metre,
      walk.walker.z / metre,
      WALKER_RADIUS_METRES,
    );

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

  const walls = corridorSolids().map((s) => ({
    minX: s.minX * metre,
    maxX: s.maxX * metre,
    minZ: s.minZ * metre,
    maxZ: s.maxZ * metre,
  }));
  const walk = createFirstPerson({
    canvas,
    camera,
    metre,
    floorY: 0,
    // In the outside corner, looking along the east leg.
    start: { x: 2 * metre, z: 2 * metre, yaw: Math.PI / 2 },
    floorAt: () => 0,
    // Each doorway shut to walking but while its doors stand open and the
    // room beyond is seen through them.
    // Each doorway: its leaves while shut, but never where the walker
    // stands; a stop just beyond until the room there is seen (the wet
    // hall's never, until it is built).
    solids: () => [
      ...walls,
      ...ways
        .flatMap((w) =>
          doorwayStops(
            {
              inside: inWay(w),
              shut: w.part.angle() < 0.6,
              seen: w.link?.seen ?? false,
            },
            w.leaf,
            w.beyond,
          ),
        )
        .map(toMetre),
    ],
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
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
  let leaving = false;
  // Whether each pair stood open last frame: null on arrival.
  const wasOpen: (boolean | null)[] = doors.map(() => null);
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    parts.update(delta);
    // No pair closes on someone standing in its doorway.
    for (const w of ways) if (inWay(w)) w.part.holdOpen();
    // Each pair's card readers show green while it stands open, beeping
    // only when it is opened here, not when it is found open on arrival.
    doors.forEach((d, i) => {
      const r = doorReaders(wasOpen[i], d.part.open());
      if (r.light)
        for (const reader of d.part.readers) reader.doorOpened(r.audible);
      wasOpen[i] = r.was;
    });
    // Through a plant room's doors, once it is seen: handed over to it.
    // Only the room in charge: not while drawn under another, following it.
    if (!leaving && !walk.following) {
      const x = walk.walker.x / metre;
      const z = walk.walker.z / metre;
      if (!inCorridor(x, z))
        for (const l of links) {
          const along = l.p.into[0] ? Math.abs(z - l.p.z) : Math.abs(x - l.p.x);
          const beyond = (l.p.x - x) * l.p.into[0] + (l.p.z - z) * l.p.into[1];
          if (l.seen && along < MAIN_CORRIDOR.opening / 2 && beyond > 0.05) {
            leaving = true;
            enterDevRoom(l.to, 'main_corridor', true);
            break;
          }
        }
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
      for (const l of links) l.withdraw();
      parts.dispose();
      disposeKit(kit, rooms as never);
      walk.dispose();
      rooms.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      renderer.dispose();
    },
    {
      resume() {
        leaving = false;
        wasOpen.fill(null);
      },
      setVisual(enabled: boolean) {
        visual = enabled;
      },
    },
  );
}
