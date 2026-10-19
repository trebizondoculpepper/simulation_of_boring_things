import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  NeutralToneMapping,
  PCFSoftShadowMap,
  PMREMGenerator,
  WebGLRenderer,
} from 'three';
import type { Scene } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
}
export function rendererOn(canvas: HTMLCanvasElement) {
  return renderers.get(canvas) ?? null;
}

/** A WebGL renderer for a room (the Hall has its own, hall-pipeline.ts). */
export function createRenderer(canvas: HTMLCanvasElement) {
  // A stencil buffer, for doorways that look into a space the room does
  // not build (a door's lobby, drawn only where the doorway is seen).
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    stencil: true,
  });
  renderer.setPixelRatio(
    Math.min(globalThis.devicePixelRatio ?? 1, MAX_PIXEL_RATIO),
  );
  // Neutral keeps the panels' paint colours and contrast as painted.
  renderer.toneMapping =
    tone === 'aces'
      ? ACESFilmicToneMapping
      : tone === 'agx'
        ? AgXToneMapping
        : NeutralToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const entry: RoomRenderer = {
    renderer,
    loop: null,
    paused: false,
    after: null,
  };
  renderers.set(canvas, entry);
  const setLoop = renderer.setAnimationLoop.bind(renderer);
  renderer.setAnimationLoop = (callback) => {
    entry.loop = callback as ((time: number) => void) | null;
    setLoop(
      callback
        ? (time, frame) => {
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
