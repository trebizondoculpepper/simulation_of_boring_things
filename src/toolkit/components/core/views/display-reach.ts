import { Color, Scene, Texture, Vector3 } from 'three';
import type {
  BufferGeometry,
  Camera,
  CanvasTexture,
  Material,
  WebGLProgramParametersWithUniforms,
  WebGLRenderer,
  Object3D,
  PerspectiveCamera,
} from 'three';
import { METRE } from '../logic/units';
import type {
  DisplayKind,
  DisplayProfile,
  DisplaySighting,
  LcdWash,
  RoomDisplayLimits,
} from '../logic/display-reach';
import {
  DISPLAY_PROFILES,
  displayVisibility,
  isLiveDisplay,
  SIGN_CUTOFFS,
  letteringShown,
  signStep,
  smallestReadable,
  mayRefresh,
  withinRoomLimits,
  meanColour,
} from '../logic/display-reach';

/**
 * Displays drawn only within reading distance (`logic/display-reach.ts`).
 * Every canvas texture made by `createCanvasTexture` is watched: once it
 * is live (redrawn after its first drawing), it shows a flat canvas of its
 * own average colour whenever no camera is within reach of a mesh showing
 * it, or none sees it from in front and large enough to read, and its
 * redraws meanwhile are held back, uploaded once it is shown again;
 * as the view comes round towards its face's normal it fades up from
 * flat to full, over angles set by its kind (a CRT's 85° to 80°). A kind
 * with a wash (an LCD's, `LCD_WASH`) is washed out per pixel by the
 * material showing it, patched once as it is first found in a scene
 * (`lcdWashPatch`): nothing more is uploaded for it, at any angle. The component drawing it is untouched: it keeps drawing
 * into its own canvas, which is put back when in reach. Rooms need do
 * nothing: every render is watched, at most five times a second per scene.
 */

interface Watched {
  texture: CanvasTexture;
  canvas: HTMLCanvasElement;
  kind: DisplayKind;
  /** Its own limit on new pictures a second, if not its kind's. */
  maxHz?: number;
  updates: number;
  /** How much of it is shown: 0 flat, 1 in full, between a fade. */
  level: number;
  /** Until when (ms) the last sighting of it holds. */
  seenUntil: number;
  /** When it last showed a new picture, ms, and whether one is waiting. */
  shownAt: number;
  waiting: boolean;
  /** Its flat or faded stand-in, while it is not shown in full. */
  stand: HTMLCanvasElement | null;
}

const upload = Object.getOwnPropertyDescriptor(
  Texture.prototype,
  'needsUpdate',
)!.set!;
const watched = new WeakMap<Texture, Watched>();
/** How long a sighting within reach counts, ms: any of the renderers drawing it. */
const SIGHTING = 500;
const CHECK = 200;
const SCAN = 1000;

/** Watch a display's canvas texture. */
export function watchDisplay(
  texture: CanvasTexture,
  canvas: HTMLCanvasElement,
  kind: DisplayKind,
  /** Its own limit on new pictures a second, where its panel is quicker or slower than its kind's (a colour TFT's 10 against a character LCD's 5). */
  maxHz?: number,
) {
  const w: Watched = {
    texture,
    canvas,
    kind,
    maxHz,
    updates: 0,
    level: 1,
    seenUntil: 0,
    shownAt: -Infinity,
    waiting: false,
    stand: null,
  };
  watched.set(texture, w);
  Object.defineProperty(texture, 'needsUpdate', {
    configurable: true,
    set(value: boolean) {
      if (value !== true) return;
      w.updates++;
      refresh(w);
    },
  });
  install();
}

const roomLimits = new WeakMap<Scene, RoomDisplayLimits>();

/**
 * A room's own limits on its displays, tightening every kind's profile
 * for the screens drawn in its scene (`RoomDisplayLimits`).
 */
export function setRoomDisplayLimits(scene: Scene, limits: RoomDisplayLimits) {
  roomLimits.set(scene, limits);
}

/** What kind of screen a canvas texture was made as, if it is watched. */
export function displayKindOf(texture: Texture): DisplayKind | undefined {
  return watched.get(texture)?.kind;
}

/** Whether a watched canvas texture has changed since it was first drawn. */
export function displayIsLive(texture: Texture): boolean {
  const w = watched.get(texture);
  return !!w && isLiveDisplay(w.updates);
}

/** Say what kind of screen a canvas texture is, if not the one it was made as. */
export function setDisplayKind(texture: CanvasTexture, kind: DisplayKind) {
  const w = watched.get(texture);
  if (w) w.kind = kind;
}

let smallContext: CanvasRenderingContext2D | null = null;
/** An 8 × 8 canvas the stand-ins' average colours are taken on, made when first wanted. */
function averager() {
  if (!smallContext) {
    const small = document.createElement('canvas');
    small.width = small.height = 8;
    smallContext = small.getContext('2d', { willReadFrequently: true })!;
  }
  return smallContext;
}

/**
 * Its stand-in drawn and uploaded: its canvas under its own average
 * colour, as opaque as it is not shown. Same size as the display, so it
 * goes into the same texture storage.
 */
function compose(w: Watched) {
  if (!w.stand) {
    w.stand = document.createElement('canvas');
    w.stand.width = w.canvas.width;
    w.stand.height = w.canvas.height;
  }
  const small = averager();
  small.clearRect(0, 0, 8, 8);
  small.drawImage(w.canvas, 0, 0, 8, 8);
  const c = w.stand.getContext('2d')!;
  c.globalAlpha = 1;
  if (w.level > 0) c.drawImage(w.canvas, 0, 0);
  c.globalAlpha = 1 - w.level;
  c.fillStyle = meanColour(small.getImageData(0, 0, 8, 8).data);
  c.fillRect(0, 0, w.stand.width, w.stand.height);
  c.globalAlpha = 1;
  w.texture.image = w.stand;
  upload.call(w.texture, true);
}

const waiting = new Set<Watched>();

/** Its kind's profile, at its own rate if it has one. */
function profileOf(w: Watched): DisplayProfile {
  const profile = DISPLAY_PROFILES[w.kind];
  return w.maxHz === undefined ? profile : { ...profile, maxHz: w.maxHz };
}

/**
 * A panel's wash off its normal, per pixel, in its material's own shader
 * (`LcdWash`): the way to the eye taken into the mesh's frame in its
 * vertex shader (a plane faces its local +z, its up its local +y), its
 * angles across and up worked out and its colour washed in its fragment
 * shader just after its picture is read, exactly as `lcdWashAmount` and
 * `lcdWashed` do. A few instructions a pixel, nothing uploaded. Its
 * backlight (`setLcdBacklight`) off, it shows a dark glossy panel instead.
 */
export function lcdWashPatch(wash: LcdWash) {
  const f = (n: number) => n.toFixed(4);
  const vertexHead = 'varying vec3 lcdEye;\n';
  const vertex = `
    lcdEye = transpose(mat3(modelMatrix)) * (cameraPosition - (modelMatrix * vec4(transformed, 1.0)).xyz);`;
  const fragmentHead = `varying vec3 lcdEye;
    uniform float lcdLit;
    uniform vec3 lcdDark;
    float lcdWashAmount(vec3 e) {
      float z = max(e.z, 1e-4);
      float across = degrees(atan(abs(e.x), z)) / ${f(wash.across)};
      float up = degrees(atan(e.y, z));
      float v = up >= 0.0 ? up / ${f(wash.above)} : -up / ${f(wash.below)};
      float t = clamp((length(vec2(across, v)) - 1.0) / ${f(wash.spread)}, 0.0, 1.0);
      return ${f(wash.most)} * t * t * (3.0 - 2.0 * t);
    }
`;
  const fragment = `
    {
      float lcdW = lcdWashAmount(lcdEye);
      float lcdGrey = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 lcdC = mix(diffuseColor.rgb, vec3(lcdGrey), lcdW * ${f(wash.desaturate)});
      lcdC = mix(lcdC, diffuse * ${f(wash.lift)}, lcdW * ${f(wash.contrast)});
      // Its backlight off: dark glass, a sheen rising towards grazing.
      float lcdSheen = pow(1.0 - clamp(normalize(lcdEye).z, 0.0, 1.0), 3.0);
      vec3 lcdOff = lcdDark + vec3(0.10, 0.11, 0.12) * lcdSheen;
      diffuseColor.rgb = mix(lcdOff, lcdC, lcdLit);
    }`;
  return (material: Material) => {
    if (patched.has(material)) return;
    patched.add(material);
    const before = material.onBeforeCompile;
    const key = material.customProgramCacheKey.bind(material);
    material.customProgramCacheKey = () => `${key()}|lcd-wash`;
    const lit = backlightOf(material);
    material.onBeforeCompile = function (
      shader: WebGLProgramParametersWithUniforms,
      renderer: WebGLRenderer,
    ) {
      before.call(this, shader, renderer);
      shader.uniforms.lcdLit = lit;
      shader.uniforms.lcdDark = LCD_DARK;
      shader.vertexShader = (vertexHead + shader.vertexShader).replace(
        '#include <fog_vertex>',
        `#include <fog_vertex>${vertex}`,
      );
      shader.fragmentShader = (fragmentHead + shader.fragmentShader).replace(
        '#include <map_fragment>',
        `#include <map_fragment>${fragment}`,
      );
    };
    material.needsUpdate = true;
  };
}

const patched = new WeakSet<Material>();
/** A dark panel's glass, linear. */
const LCD_DARK = { value: new Color(0x07090b) };

function backlightOf(material: Material): { value: number } {
  const data = material.userData as { lcdLit?: { value: number } };
  return (data.lcdLit ??= { value: 1 });
}

/**
 * Switch a backlit LCD's backlight on or off (the owner, 2026-10-31: a
 * powered-off LCD is black, as there is no backlight): its material shows
 * a dark glossy panel while off. Only for a backlit panel; a reflective
 * one, unlit, still shows its glass.
 */
export function setLcdBacklight(material: Material, on: boolean) {
  backlightOf(material).value = on ? 1 : 0;
}

const washPatches = new Map<LcdWash, (m: Material) => void>();
function washMaterial(material: Material, wash: LcdWash) {
  let patch = washPatches.get(wash);
  if (!patch) washPatches.set(wash, (patch = lcdWashPatch(wash)));
  patch(material);
}

/**
 * A new picture shown: in full, uploaded; fading, faded again; flat, held
 * back, its canvas put back when it is shown. No sooner than its kind
 * allows: else it waits, and is shown at the first render after its turn.
 */
function refresh(w: Watched) {
  if (w.level === 0) {
    waiting.delete(w);
    return;
  }
  const now = performance.now();
  if (!mayRefresh(profileOf(w), w.shownAt, now)) {
    w.waiting = true;
    waiting.add(w);
    return;
  }
  w.shownAt = now;
  w.waiting = false;
  waiting.delete(w);
  if (w.level === 1) upload.call(w.texture, true);
  else compose(w);
}

function setLevel(w: Watched, level: number) {
  if (w.level === level) return;
  w.level = level;
  if (level < 1) {
    compose(w);
    return;
  }
  w.texture.image = w.canvas;
  w.stand = null;
  upload.call(w.texture, true);
}

/**
 * A static sign drawn in stages by distance (`signStep`): its drawing
 * run again, on canvases of its own size, through a context that leaves
 * out the lettering a stage does not show.
 */
interface Sign {
  texture: Texture;
  canvas: HTMLCanvasElement;
  draw: (c: CanvasRenderingContext2D) => void;
  pixelsPerMetre: number;
  /** Its step of `SIGN_CUTOFFS`: 0 everything. */
  step: number;
  holdUntil: number;
  stages: Map<number, HTMLCanvasElement>;
  /** Within this many metres all its lettering is drawn, however small. */
  reach: number;
  /** A change of step under way: the stage it leaves, and when it began, ms. */
  fade: { from: HTMLCanvasElement; since: number } | null;
  /** The canvas a fade is drawn on. */
  blend: HTMLCanvasElement | null;
}
const signs = new WeakMap<Texture, Sign>();

/**
 * Draw a static sign in stages by distance: `draw` paints it on any
 * context (it is run again for each stage, so it must draw the same each
 * time); `pixelsPerMetre` is its canvas's, so lettering is judged by its
 * size on the sign.
 */
export function watchSign(
  texture: Texture,
  draw: (c: CanvasRenderingContext2D) => void,
  pixelsPerMetre: number,
  /** Within this many metres all its lettering is drawn (a poster read across a room). */
  reach = 0,
) {
  const canvas = texture.image as HTMLCanvasElement;
  if (!canvas?.getContext) return;
  signs.set(texture, {
    texture,
    canvas,
    draw,
    pixelsPerMetre,
    step: 0,
    holdUntil: 0,
    stages: new Map(),
    reach,
    fade: null,
    blend: null,
  });
  install();
}

function stageOf(sign: Sign, step: number) {
  if (step === 0) return sign.canvas;
  let stage = sign.stages.get(step);
  if (stage) return stage;
  stage = document.createElement('canvas');
  stage.width = sign.canvas.width;
  stage.height = sign.canvas.height;
  const real = stage.getContext('2d')!;
  const shown = () =>
    letteringShown(SIGN_CUTOFFS[step], real.font, sign.pixelsPerMetre);
  const context = new Proxy(real, {
    get(target, key) {
      if (key === 'fillText' || key === 'strokeText')
        return (...args: unknown[]) => {
          if (shown())
            (target[key] as (...a: unknown[]) => void).apply(target, args);
        };
      const value = Reflect.get(target, key) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, key, value) {
      return Reflect.set(target, key, value);
    },
  });
  sign.draw(context);
  sign.stages.set(step, stage);
  return stage;
}

/**
 * How long a sign's lettering takes to fade in or out as its step changes
 * (the owner, 2026-10-30: it appeared all at once), ms; drawn at each
 * check, five times a second, within the ten a display may animate at.
 */
export const SIGN_FADE = 1200;

function setStep(sign: Sign, step: number, now: number) {
  if (sign.step === step) return;
  // Fading from whatever is shown now, part-way through a fade or not.
  sign.fade = {
    from: (sign.texture.image as HTMLCanvasElement) ?? stageOf(sign, sign.step),
    since: now,
  };
  if (sign.fade.from === sign.blend) {
    // Keep the half-faded picture as the one it leaves.
    const kept = document.createElement('canvas');
    kept.width = sign.blend.width;
    kept.height = sign.blend.height;
    kept.getContext('2d')!.drawImage(sign.blend, 0, 0);
    sign.fade.from = kept;
  }
  sign.step = step;
  stepFade(sign, now);
}

/** A fade's next frame: the stage it leaves, the new one over it at its share. */
function stepFade(sign: Sign, now: number) {
  const fade = sign.fade;
  if (!fade) return;
  const to = stageOf(sign, sign.step);
  const k = Math.min(1, (now - fade.since) / SIGN_FADE);
  if (k >= 1) {
    sign.fade = null;
    sign.texture.image = to;
  } else {
    if (!sign.blend) {
      sign.blend = document.createElement('canvas');
      sign.blend.width = sign.canvas.width;
      sign.blend.height = sign.canvas.height;
    }
    const c = sign.blend.getContext('2d')!;
    c.globalAlpha = 1;
    c.drawImage(fade.from, 0, 0);
    c.globalAlpha = k * k * (3 - 2 * k);
    c.drawImage(to, 0, 0);
    c.globalAlpha = 1;
    sign.texture.image = sign.blend;
  }
  upload.call(sign.texture, true);
}

interface SceneWatch {
  signs: Map<Sign, Object3D[]>;
  shown: Map<Watched, Object3D[]>;
  scanned: number;
  checked: number;
}
const scenes = new WeakMap<Scene, SceneWatch>();
const eye = new Vector3();
const at = new Vector3();

function texturesOf(material: Material): Texture[] {
  const m = material as Material & { map?: Texture; emissiveMap?: Texture };
  return [m.map, m.emissiveMap].filter((t): t is Texture => !!t);
}

function scan(scene: Scene, s: SceneWatch) {
  s.shown.clear();
  s.signs.clear();
  scene.traverseVisible((object) => {
    const material = (object as Object3D & { material?: Material | Material[] })
      .material;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material])
      for (const t of texturesOf(m)) {
        const sign = signs.get(t);
        if (sign) {
          let list = s.signs.get(sign);
          if (!list) s.signs.set(sign, (list = []));
          if (!list.includes(object)) list.push(object);
        }
        const w = watched.get(t);
        if (!w) continue;
        // Washed per pixel, if its kind washes out: only a flat face has a normal.
        const wash = DISPLAY_PROFILES[w.kind].wash;
        if (
          wash &&
          (object as Object3D & { geometry?: BufferGeometry }).geometry
            ?.type === 'PlaneGeometry'
        )
          washMaterial(m, wash);
        let list = s.shown.get(w);
        if (!list) s.shown.set(w, (list = []));
        list.push(object);
      }
  });
}

function check(scene: Scene, camera: Camera, screenPixels: number) {
  for (const w of waiting) refresh(w);
  const now = performance.now();
  let s = scenes.get(scene);
  if (!s)
    scenes.set(
      scene,
      (s = {
        shown: new Map(),
        signs: new Map(),
        scanned: -SCAN,
        checked: -CHECK,
      }),
    );
  if (now - s.checked < CHECK) return;
  s.checked = now;
  if (now - s.scanned >= SCAN) {
    s.scanned = now;
    scan(scene, s);
  }
  camera.getWorldPosition(eye);
  for (const [sign, objects] of s.signs) {
    if (displayIsLive(sign.texture)) continue;
    stepFade(sign, now);
    // The finest lettering any of its faces needs, seen as it is: all of
    // it within its reach.
    let need = Infinity;
    for (const o of objects) {
      const seen = sighting(o);
      if (seen.metres <= sign.reach) {
        need = 0;
        break;
      }
      need = Math.min(
        need,
        smallestReadable({
          metres: seen.metres,
          fov: (camera as PerspectiveCamera).fov ?? 60,
          zoom: (camera as PerspectiveCamera).zoom ?? 1,
          screenPixels,
          offNormal: seen.offNormal,
        }),
      );
    }
    const step = signStep(sign.step, need);
    // As for displays: a sighting holds a while, so another renderer
    // seeing it from further off does not take its detail away at once.
    if (step <= sign.step) {
      sign.holdUntil = now + SIGHTING;
      setStep(sign, step, now);
    } else if (now >= sign.holdUntil) setStep(sign, step, now);
  }
  for (const [w, objects] of s.shown) {
    if (!isLiveDisplay(w.updates)) continue;
    const profile = withinRoomLimits(profileOf(w), roomLimits.get(scene));
    const level = Math.max(
      ...objects.map((o) =>
        displayVisibility(w.level > 0, sighting(o), profile),
      ),
    );
    // A sighting holds a while, so another renderer drawing it that
    // cannot see it does not flatten it at once.
    if (level > 0) w.seenUntil = now + SIGHTING;
    setLevel(w, level > 0 || now >= w.seenUntil ? level : w.level);
  }
}

const normal = new Vector3();
const toEye = new Vector3();
const scale = new Vector3();
const DEG = 180 / Math.PI;

/**
 * How the camera (`eye`) sees one mesh showing a display: its distance in
 * metres; its angle off the face's normal if it is a flat plane (a plane
 * faces its local +z), else null; and the angle its bounding sphere
 * subtends.
 */
function sighting(o: Object3D): DisplaySighting {
  const geometry = (o as Object3D & { geometry?: BufferGeometry }).geometry;
  if (geometry && !geometry.boundingSphere) geometry.computeBoundingSphere();
  // From the middle of what it draws, not its origin: a sign merged with
  // others of its material (`merge-static.ts`) has its origin at the
  // room's, metres from the sign itself.
  if (geometry?.boundingSphere)
    at.copy(geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);
  else at.setFromMatrixPosition(o.matrixWorld);
  toEye.subVectors(eye, at);
  const distance = toEye.length();
  let offNormal: number | null = null;
  if (geometry?.type === 'PlaneGeometry' && distance > 0) {
    normal.setFromMatrixColumn(o.matrixWorld, 2).normalize();
    offNormal =
      Math.acos(Math.max(-1, Math.min(1, normal.dot(toEye) / distance))) * DEG;
  }
  scale.setFromMatrixScale(o.matrixWorld);
  const radius =
    (geometry?.boundingSphere?.radius ?? 0) *
    Math.max(scale.x, scale.y, scale.z);
  const subtended =
    distance > radius ? 2 * Math.asin(radius / distance) * DEG : 180;
  return { metres: distance / METRE, offNormal, subtended };
}

let installed = false;
function install() {
  if (installed) return;
  installed = true;
  // Every scene, as each renderer begins drawing it (a renderer's
  // `render` is its own, not its prototype's, so it cannot be wrapped).
  const before = Scene.prototype.onBeforeRender;
  Scene.prototype.onBeforeRender = function (...args) {
    check(this, args[2], args[0].domElement.height);
    before.apply(this, args);
  };
}
