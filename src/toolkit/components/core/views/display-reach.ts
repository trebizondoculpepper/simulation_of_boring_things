import { Scene, Texture, Vector3 } from 'three';
import type {
  BufferGeometry,
  Camera,
  CanvasTexture,
  Material,
  Object3D,
} from 'three';
import { METRE } from '../logic/units';
import type {
  DisplayKind,
  DisplaySighting,
  RoomDisplayLimits,
} from '../logic/display-reach';
import {
  DISPLAY_PROFILES,
  displayVisibility,
  isLiveDisplay,
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
 * flat to full, over angles set by its kind (an LCD's 70° to 65°). The component drawing it is untouched: it keeps drawing
 * into its own canvas, which is put back when in reach. Rooms need do
 * nothing: every render is watched, at most five times a second per scene.
 */

interface Watched {
  texture: CanvasTexture;
  canvas: HTMLCanvasElement;
  kind: DisplayKind;
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
) {
  const w: Watched = {
    texture,
    canvas,
    kind,
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
  if (!mayRefresh(DISPLAY_PROFILES[w.kind], w.shownAt, now)) {
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

interface SceneWatch {
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
  scene.traverseVisible((object) => {
    const material = (object as Object3D & { material?: Material | Material[] })
      .material;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material])
      for (const t of texturesOf(m)) {
        const w = watched.get(t);
        if (!w) continue;
        let list = s.shown.get(w);
        if (!list) s.shown.set(w, (list = []));
        list.push(object);
      }
  });
}

function check(scene: Scene, camera: Camera) {
  for (const w of waiting) refresh(w);
  const now = performance.now();
  let s = scenes.get(scene);
  if (!s)
    scenes.set(
      scene,
      (s = { shown: new Map(), scanned: -SCAN, checked: -CHECK }),
    );
  if (now - s.checked < CHECK) return;
  s.checked = now;
  if (now - s.scanned >= SCAN) {
    s.scanned = now;
    scan(scene, s);
  }
  camera.getWorldPosition(eye);
  for (const [w, objects] of s.shown) {
    if (!isLiveDisplay(w.updates)) continue;
    const profile = withinRoomLimits(
      DISPLAY_PROFILES[w.kind],
      roomLimits.get(scene),
    );
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
  at.setFromMatrixPosition(o.matrixWorld);
  toEye.subVectors(eye, at);
  const distance = toEye.length();
  const geometry = (o as Object3D & { geometry?: BufferGeometry }).geometry;
  let offNormal: number | null = null;
  if (geometry?.type === 'PlaneGeometry' && distance > 0) {
    normal.setFromMatrixColumn(o.matrixWorld, 2).normalize();
    offNormal =
      Math.acos(Math.max(-1, Math.min(1, normal.dot(toEye) / distance))) * DEG;
  }
  if (geometry && !geometry.boundingSphere) geometry.computeBoundingSphere();
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
    check(this, args[2]);
    before.apply(this, args);
  };
}
