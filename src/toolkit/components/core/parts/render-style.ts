import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  NeutralToneMapping,
  PCFSoftShadowMap,
  PMREMGenerator,
  Plane,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { WebGLRenderTarget, Scene } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { effect } from '@preact/signals-core';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { settings } from '../../../settings/settings-store';
import { renderScale } from '../../../settings/logic/settings';
import {
  ambientOcclusionAt,
  bloomAt,
  cappedPixelRatio,
} from '../../../settings/logic/graphics';
import type { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import type { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Pass } from 'three/addons/postprocessing/Pass.js';

/**
 * How the game is drawn: realistically, at the screen's own resolution
 * with antialiasing, smooth shading, physically based materials lit by an
 * environment map as well as the rooms' lights, soft shadows and filmic
 * tone mapping. (The VX3's low-resolution PS1 look is retired.)
 */
const params =
  typeof location === 'undefined'
    ? new URLSearchParams()
    : new URLSearchParams(location.search);
/**
 * Tuning knobs for trying the look: `?tone=neutral|agx|aces`,
 * `?exposure=1.1` and `?env=1` (a multiplier on each room's environment
 * light).
 */
const tone = params.get('tone') ?? 'neutral';
const exposure = Number(params.get('exposure') ?? 1.0);
const environmentScale = Number(params.get('env') ?? 1);

/** Always true: kept so materials can ask. */
export const realistic = true;

/** The most pixels per CSS pixel drawn: sharp on a Retina screen, not wasteful. */
const MAX_PIXEL_RATIO = 2;

/**
 * Each room's renderer by its canvas, and the frame loop it was given, so
 * that development tools can run a room's frames themselves (where the
 * browser does not, as in a hidden tab): `devShot` in `src/main.ts`.
 */
const renderers = new WeakMap<HTMLCanvasElement, RoomRenderer>();
export interface RoomRenderer {
  renderer: WebGLRenderer;
  /** The room's frame, as given to `setAnimationLoop`. */
  loop: ((time: number) => void) | null;
  /** While paused the browser does not run the frame; `after` may. */
  paused: boolean;
  /** Run just after each of this room's frames: another room's, drawn under it. */
  after: ((time: number) => void) | null;
  /**
   * The time the browser last ran its frame at: run again at this time, a
   * frame advances nothing (no time has passed) and only draws, as a
   * screenshot wants (`captureView` in `src/main.ts`).
   */
  time: number;
}
export function rendererOn(canvas: HTMLCanvasElement) {
  return renderers.get(canvas) ?? null;
}

/**
 * A clipping plane that clips nothing: everything is far on its kept
 * side. Every room renderer always has exactly one clipping plane, this
 * one or a doorway's (`src/main.ts`), because three.js compiles a
 * different shader for each count of planes: were a room drawn through a
 * doorway with one plane and then on its own with none, every material
 * in it would be compiled again at the hand-over, a stall of up to
 * seconds (`doc/reports/room-transition-performance.md`).
 */
export const inertClip = () => new Plane(new Vector3(0, 1, 0), 1e9);

/**
 * Whether a screenshot is being drawn (`captureView` in `src/main.ts`):
 * then the resolution cap stands aside, as the screenshot sizes itself.
 */
let capturing = false;
export function setCapturing(on: boolean) {
  capturing = on;
}

/** Each renderer's post-processing chains, to follow its pixel ratio. */
const composers = new WeakMap<WebGLRenderer, Set<EffectComposer>>();

/**
 * A post-processing chain for a room's renderer: an EffectComposer that
 * follows the renderer's pixel ratio, so a change of the player's
 * graphics quality reaches it at once. Rooms make their composers here.
 */
export function createComposer(
  renderer: WebGLRenderer,
  target?: WebGLRenderTarget,
) {
  const composer = new EffectComposer(renderer, target);
  let set = composers.get(renderer);
  if (!set) composers.set(renderer, (set = new Set()));
  set.add(composer);
  const dispose = composer.dispose.bind(composer);
  composer.dispose = () => {
    set.delete(composer);
    dispose();
  };
  return composer;
}

/**
 * A room's costlier passes following the player's graphics settings (the
 * owner, 2026-10-28): its ambient occlusion off or at fewer samples, its
 * bloom off or on a smaller image, its film grain and vignette off; live,
 * as the settings change. `aoSamples` is the room's own, as tuned. Stops
 * following when the composer is disposed.
 */
export function followEffectSettings(
  composer: EffectComposer,
  {
    ao,
    aoSamples = 12,
    bloom,
    film,
  }: {
    ao?: GTAOPass;
    aoSamples?: number;
    bloom?: UnrealBloomPass;
    film?: Pass;
  },
) {
  // Bloom's blur chain on a share of the image: its size, scaled.
  let bloomScale = 1;
  const full = { w: 1, h: 1 };
  if (bloom) {
    const setSize = bloom.setSize.bind(bloom);
    bloom.setSize = (width: number, height: number) => {
      full.w = width;
      full.h = height;
      setSize(
        Math.max(1, Math.round(width * bloomScale)),
        Math.max(1, Math.round(height * bloomScale)),
      );
    };
  }
  let samples = aoSamples;
  const stop = effect(() => {
    const s = settings.value;
    if (ao) {
      const at = ambientOcclusionAt(s.ambientOcclusion, aoSamples);
      ao.enabled = at.enabled;
      if (at.enabled && at.samples !== samples) {
        samples = at.samples;
        ao.updateGtaoMaterial({ samples });
      }
    }
    if (bloom) {
      const at = bloomAt(s.bloom);
      bloom.enabled = at.enabled;
      if (at.scale !== bloomScale) {
        bloomScale = at.scale;
        bloom.setSize(full.w, full.h);
      }
    }
    if (film) film.enabled = s.filmEffects;
  });
  const dispose = composer.dispose.bind(composer);
  composer.dispose = () => {
    stop();
    dispose();
  };
}

/** A WebGL renderer for a room (the Hall has its own, hall-pipeline.ts). */
export function createRenderer(canvas: HTMLCanvasElement, alpha = false) {
  // A stencil buffer, for doorways that look into a space the room does
  // not build (a door's lobby, drawn only where the doorway is seen).
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    stencil: true,
    alpha,
  });
  // The player's graphics quality scales whatever ratio the room asks for
  // (`settings.ts`), now and whenever the setting changes.
  const setRatio = renderer.setPixelRatio.bind(renderer);
  const setSize = renderer.setSize.bind(renderer);
  let wanted = Math.min(globalThis.devicePixelRatio ?? 1, MAX_PIXEL_RATIO);

  // The room's post-processing chains follow its ratio (`createComposer`).
  const follow = () => {
    for (const composer of composers.get(renderer) ?? [])
      composer.setPixelRatio(renderer.getPixelRatio());
  };
  const size = new Vector2();
  /**
   * The ratio drawn at: the room's, less the player's render quality, and
   * under the player's resolution cap for the canvas's height now (not
   * while a screenshot is taken, which sizes itself).
   */
  const ratioNow = () => {
    const s = settings.value;
    const ratio = wanted * renderScale(s.renderLevel);
    if (capturing) return ratio;
    return cappedPixelRatio(ratio, renderer.getSize(size).y, s.resolutionCap);
  };
  const apply = () => {
    const ratio = ratioNow();
    if (renderer.getPixelRatio() === ratio) return;
    setRatio(ratio);
    follow();
  };
  renderer.setPixelRatio = (ratio: number) => {
    wanted = ratio;
    apply();
  };
  // A canvas resized may cross its cap.
  renderer.setSize = (width, height, updateStyle) => {
    setSize(width, height, updateStyle);
    apply();
  };
  const stopQuality = effect(() => {
    void settings.value;
    apply();
  });
  renderer.setPixelRatio(wanted);
  const dispose = renderer.dispose.bind(renderer);
  renderer.dispose = () => {
    stopQuality();
    dispose();
  };
  // Neutral keeps the panels' paint colours and contrast as painted.
  renderer.toneMapping =
    tone === 'aces'
      ? ACESFilmicToneMapping
      : tone === 'agx'
        ? AgXToneMapping
        : NeutralToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.clippingPlanes = [inertClip()];
  const entry: RoomRenderer = {
    renderer,
    loop: null,
    paused: false,
    after: null,
    time: 0,
  };
  renderers.set(canvas, entry);
  const setLoop = renderer.setAnimationLoop.bind(renderer);
  renderer.setAnimationLoop = (callback) => {
    entry.loop = callback as ((time: number) => void) | null;
    setLoop(
      callback
        ? (time, frame) => {
            entry.time = time;
            if (!entry.paused) callback(time, frame);
            entry.after?.(time);
          }
        : null,
    );
  };
  return renderer;
}

/**
 * Light a scene's physically based materials with a neutral studio room,
 * as well as its own lights: soft fill from every side and something to
 * reflect, so chrome looks like chrome and a button's cap has a sheen.
 * `intensity` scales it; a dark room wants little. Returns a function that frees it.
 */
export function useEnvironment(
  renderer: WebGLRenderer,
  scene: Scene,
  intensity = 0.5,
) {
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const target = pmrem.fromScene(room, 0.04);
  scene.environment = target.texture;
  scene.environmentIntensity = intensity * environmentScale;
  room.dispose();
  pmrem.dispose();
  return () => {
    if (scene.environment === target.texture) scene.environment = null;
    target.dispose();
  };
}
