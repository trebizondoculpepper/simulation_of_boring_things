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
import type {
  Camera,
  LightShadow,
  Object3D,
  WebGLRenderTarget,
  Scene,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { computed, effect } from '@preact/signals-core';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { settings } from '../../../settings/settings-store';
import { renderScale } from '../../../settings/logic/settings';
import {
  ambientOcclusionAt,
  bloomAt,
  cappedPixelRatio,
  graphicsOptions,
  shadowMapSide,
} from '../../../settings/logic/graphics';
import type { GraphicsOptions } from '../../../settings/logic/graphics';
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
 * What the player's graphics preset decides (`graphics.ts`, mission 087):
 * every room renderer and composer follows it, so a preset chosen in the
 * menu or the address reaches every room without the rooms knowing.
 */
const graphics = computed(() => graphicsOptions(settings.value.graphics));

/** The effects a preset switches off in a post-processing chain by itself. */
type GatedEffect = 'refraction';

/** Passes that declared which effect they are (`markEffect`). */
const declared = new WeakMap<Pass, GatedEffect>();

/**
 * Declare a post-processing pass one of the effects a graphics preset
 * switches off. (Ambient occlusion and bloom follow the player's own
 * settings instead, `followEffectSettings`.)
 */
export function markEffect<P extends Pass>(pass: P, effect: GatedEffect): P {
  declared.set(pass, effect);
  return pass;
}

/**
 * Gate a declared pass on the preset: it runs only while the room wants
 * it on and the preset allows it. A room still switches it as before
 * (`pass.enabled = …`); the preset's word is added to the room's.
 */
function gatePass(pass: Pass) {
  const effect = declared.get(pass);
  if (!effect) return;
  let wanted = pass.enabled;
  Object.defineProperty(pass, 'enabled', {
    configurable: true,
    enumerable: true,
    get: () => wanted && graphics.peek()[effect],
    set: (on: boolean) => {
      wanted = on;
    },
  });
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
  // Its passes the preset decides follow it.
  const add = composer.addPass.bind(composer);
  composer.addPass = (pass: Pass) => {
    gatePass(pass);
    add(pass);
  };
  const insert = composer.insertPass.bind(composer);
  composer.insertPass = (pass: Pass, index: number) => {
    gatePass(pass);
    insert(pass, index);
  };
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
 * following when the composer is disposed. Returns `allowAmbientOcclusion`,
 * which turns the occlusion off while the room is only drawn under another
 * through a doorway, whatever the settings say: it is on only in the room
 * the player is in (the owner, 2026-10-29).
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
  let aoAllowed = true;
  let aoWanted = false;
  const stop = effect(() => {
    const s = settings.value;
    if (ao) {
      const at = ambientOcclusionAt(s.ambientOcclusion, aoSamples);
      aoWanted = at.enabled;
      ao.enabled = aoWanted && aoAllowed;
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
  return {
    allowAmbientOcclusion(allowed: boolean) {
      aoAllowed = allowed;
      if (ao) ao.enabled = aoWanted && aoAllowed;
    },
  };
}

/**
 * Each renderer's ratio drawn exactly, past the player's graphics
 * settings, while a screenshot is taken (`drawAtRatio`).
 */
const exactRatios = new WeakMap<
  WebGLRenderer,
  (ratio: number | null) => void
>();

/**
 * Draw a room's renderer at exactly this pixel ratio, whatever the
 * player's render quality, resolution cap and preset (a screenshot at full
 * quality, `captureView` in `src/main.ts`); null returns it to the settings.
 */
export function drawAtRatio(renderer: WebGLRenderer, ratio: number | null) {
  exactRatios.get(renderer)?.(ratio);
}

const ratioScales = new WeakMap<WebGLRenderer, (scale: number) => void>();

/**
 * Draw a room's renderer at a share of the ratio its settings give it (a
 * hall seen through an archway at a quarter, the owner, 2026-10-29); 1
 * returns it to the settings' ratio.
 */
export function scaleRatio(renderer: WebGLRenderer, scale: number) {
  ratioScales.get(renderer)?.(scale);
}

/** Each shadow's map size as the room asked for it, before a preset cut it. */
const askedShadow = new WeakMap<LightShadow, { x: number; y: number }>();

/**
 * Cut a scene's shadow maps to the preset's largest (or give them back
 * their size), freeing any map drawn at the old size. Whether anything
 * changed.
 */
function fitShadows(scene: Object3D, max: number) {
  let changed = false;
  scene.traverse((o) => {
    const shadow = (o as { shadow?: LightShadow }).shadow;
    if (!shadow?.mapSize) return;
    let asked = askedShadow.get(shadow);
    if (!asked) {
      asked = { x: shadow.mapSize.x, y: shadow.mapSize.y };
      askedShadow.set(shadow, asked);
    }
    const x = shadowMapSide(asked.x, max);
    const y = shadowMapSide(asked.y, max);
    if (shadow.mapSize.x === x && shadow.mapSize.y === y) return;
    shadow.mapSize.set(x, y);
    shadow.map?.dispose();
    shadow.map = null;
    changed = true;
  });
  return changed;
}

/** A WebGL renderer for a room (the Hall has its own, hall-pipeline.ts). */
export function createRenderer(canvas: HTMLCanvasElement, alpha = false) {
  // Antialiasing is fixed when the context is made: a preset's choice
  // reaches the next room built (or a reload).
  const options = graphics.peek();
  // A stencil buffer, for doorways that look into a space the room does
  // not build (a door's lobby, drawn only where the doorway is seen).
  const renderer = new WebGLRenderer({
    canvas,
    antialias: options.antialias,
    stencil: true,
    alpha,
  });
  // The player's graphics quality scales whatever ratio the room asks for
  // (`settings.ts`), now and whenever the setting changes.
  const setRatio = renderer.setPixelRatio.bind(renderer);
  const setSize = renderer.setSize.bind(renderer);
  let wanted = Math.min(globalThis.devicePixelRatio ?? 1, MAX_PIXEL_RATIO);
  let exact: number | null = null;
  let scale = 1;

  // The room's post-processing chains follow its ratio (`createComposer`).
  const follow = () => {
    for (const composer of composers.get(renderer) ?? [])
      composer.setPixelRatio(renderer.getPixelRatio());
  };
  const size = new Vector2();
  /**
   * The ratio drawn at: the room's, under the preset's cap, less the
   * player's render quality, and under the player's maximum resolution for
   * the canvas's size now; or exactly a screenshot's (`drawAtRatio`).
   */
  const ratioNow = () => {
    const s = settings.value;
    const cap = graphics.value.pixelRatioCap;
    if (exact !== null) return exact;
    const ratio = Math.min(wanted, cap) * renderScale(s.renderLevel) * scale;
    renderer.getSize(size);
    return cappedPixelRatio(ratio, size.x, size.y, s.resolutionCap);
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
  exactRatios.set(renderer, (ratio) => {
    exact = ratio;
    apply();
  });
  ratioScales.set(renderer, (share) => {
    scale = share;
    apply();
  });
  const stopQuality = effect(() => {
    void settings.value;
    apply();
  });
  renderer.setPixelRatio(wanted);

  // Shadows: the room turns them on as before (`shadowMap.enabled =
  // true`); they are drawn only while the preset allows them too.
  const shadowMap = renderer.shadowMap;
  let wantsShadows = shadowMap.enabled;
  Object.defineProperty(shadowMap, 'enabled', {
    configurable: true,
    enumerable: true,
    get: () => wantsShadows && graphics.peek().shadows,
    set: (on: boolean) => {
      wantsShadows = on;
    },
  });
  // Each scene drawn, and the preset it was last fitted to: a scene is
  // fitted when first drawn and again after the preset changes, and its
  // materials compiled again when shadows came or went (a one-off pause).
  const fitted = new WeakMap<Object3D, GraphicsOptions>();
  const render = renderer.render.bind(renderer);
  renderer.render = (scene: Object3D, camera: Camera) => {
    const now = graphics.peek();
    const was = fitted.get(scene);
    if (was !== now) {
      fitted.set(scene, now);
      if (fitShadows(scene, now.shadowMapMax)) shadowMap.needsUpdate = true;
      if (was && was.shadows !== now.shadows) {
        scene.traverse((o) => {
          const material = (o as { material?: unknown }).material;
          for (const m of Array.isArray(material) ? material : [material])
            if (m && typeof m === 'object' && 'needsUpdate' in m)
              (m as { needsUpdate: boolean }).needsUpdate = true;
        });
        shadowMap.needsUpdate = true;
      }
    }
    render(scene, camera);
  };
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
