import { Scene, Texture, Vector3 } from 'three';
import type {
  BufferGeometry,
  Camera,
  CanvasTexture,
  Material,
  Object3D,
} from 'three';
import { METRE } from '../logic/units';
import type { DisplaySighting } from '../logic/display-reach';
import {
  displayInReach,
  isLiveDisplay,
  meanColour,
} from '../logic/display-reach';

/**
 * Displays drawn only within reading distance (`logic/display-reach.ts`).
 * Every canvas texture made by `createCanvasTexture` is watched: once it
 * is live (redrawn after its first drawing), it shows a flat canvas of its
 * own average colour whenever no camera is within reach of a mesh showing
 * it, or none sees it from in front, near enough its normal and large
 * enough to read, and its redraws meanwhile are held back, uploaded once it is in
 * reach again. The component drawing it is untouched: it keeps drawing
 * into its own canvas, which is put back when in reach. Rooms need do
 * nothing: every render is watched, at most five times a second per scene.
 */

interface Watched {
  texture: CanvasTexture;
  canvas: HTMLCanvasElement;
  updates: number;
  inReach: boolean;
  /** Until when (ms) some camera has seen it within reach. */
  seenUntil: number;
  pending: boolean;
  flat: HTMLCanvasElement | null;
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
) {
  const w: Watched = {
    texture,
    canvas,
    updates: 0,
    inReach: true,
    seenUntil: 0,
    pending: false,
    flat: null,
  };
  watched.set(texture, w);
  Object.defineProperty(texture, 'needsUpdate', {
    configurable: true,
    set(value: boolean) {
      if (value !== true) return;
      w.updates++;
      if (w.inReach) upload.call(texture, true);
      else w.pending = true;
    },
  });
  install();
}

function flatOf(canvas: HTMLCanvasElement) {
  const small = document.createElement('canvas');
  small.width = small.height = 8;
  const c = small.getContext('2d', { willReadFrequently: true })!;
  c.drawImage(canvas, 0, 0, 8, 8);
  const colour = meanColour(c.getImageData(0, 0, 8, 8).data);
  const flat = document.createElement('canvas');
  flat.width = canvas.width;
  flat.height = canvas.height;
  const f = flat.getContext('2d')!;
  f.fillStyle = colour;
  f.fillRect(0, 0, flat.width, flat.height);
  return flat;
}

function setInReach(w: Watched, inReach: boolean) {
  if (w.inReach === inReach) return;
  w.inReach = inReach;
  if (inReach) {
    w.texture.image = w.canvas;
    w.flat = null;
    w.pending = false;
  } else {
    // Same size as the display, so it goes into the same texture storage.
    w.flat = flatOf(w.canvas);
    w.texture.image = w.flat;
  }
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
    if (objects.some((o) => displayInReach(w.inReach, sighting(o))))
      w.seenUntil = now + SIGHTING;
    setInReach(w, now < w.seenUntil);
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
