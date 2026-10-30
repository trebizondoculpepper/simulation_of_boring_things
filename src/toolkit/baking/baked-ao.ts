/**
 * Baked ambient occlusion in a room (`doc/reports/baked-lighting-and-reflections.md`,
 * the owner, 2026-10-30). The main thread only gathers the room's static
 * meshes (their own arrays and world matrices) and hands them to the one
 * background worker (`ao-bake.worker.ts`), which does everything else:
 * world space, the hash, the cache, subdividing large faces, the BVH, the
 * rays. Until the bake is ready the room shows no ambient occlusion; then
 * its geometry and bake are swapped in, a few meshes a frame within a
 * small budget, and the bake fades in over about a second and stays. It
 * darkens only the ambient (indirect) light, never a lamp's direct light.
 *
 * A room calls `bakeRoomAo(root, { roomId })` once built. What it bakes:
 * by default the meshes `mergeStatic` made (in its `Merged` holders, never
 * a moving or clickable part, which it keeps apart), plus any mesh under
 * an object marked `userData.bakeAo = true`; never anything under one
 * marked `userData.bakeAo = false`, nor instanced meshes, hidden meshes,
 * transparent or live (lamp) materials.
 *
 * Occlusion is baked for the room with every light on (the owner,
 * 2026-10-30): lights take no part in it (only geometry does), lamps'
 * meshes count as present and lit however the room is lit, and nothing
 * about the lighting enters the cache key, so the bake comes out the same
 * whether the room is entered lit, dark, in emergency lighting or in a
 * blackout.
 */
import {
  RepeatWrapping,
  Box3,
  Box3Helper,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  Sphere,
  Vector3,
} from 'three';
import type {
  Material,
  Object3D,
  WebGLProgramParametersWithUniforms,
  WebGLRenderer,
} from 'three';
import { effect } from '@preact/signals-core';
import { AO_LOOKS } from './logic/ao-geometry';
import type { AoLook, BakeSettings } from './logic/ao-geometry';
import {
  BAKE_PRIORITY,
  createBakeQueue,
  mayBake,
  mayBakeAhead,
} from './logic/ao-cache-policy';
import { settings as playerSettings } from '../settings/settings-store';
import { isBakedAo } from '../settings/logic/graphics';
import { SIMPLE_AO_LOOKS } from './logic/simple-ao';
import type { Box } from './logic/simple-ao';
import type {
  BakeReply,
  BakeRequest,
  BakeTimings,
  BakedMesh,
} from './ao-bake-protocol';

/** How long the bake takes to fade in once ready, seconds. */
export const BAKED_AO_FADE = 1;
/** Main-thread time a frame for swapping baked geometry in, ms. */
const APPLY_BUDGET = 2;
/** Vertices swapped in a frame at most, so their upload to the GPU is spread too. */
const APPLY_VERTICES = 100_000;

/** Whether the player has a kept bake chosen: BAKED (rays) or SIMPLE. */
const baking = () => isBakedAo(playerSettings.value.aoMode);

// ---- The worker and its queue ------------------------------------------------

type Ready = Extract<BakeReply, { type: 'ready' }>;
interface Job {
  roomId: string;
  priority: number;
  done: (reply: Ready | null) => void;
}

const queue = createBakeQueue();
const jobs = new Map<number, Job>();
let worker: Worker | null = null;
let active: number | null = null;
let nextId = 1;
let pausedUntil = 0;
/** The room the walker is in (`focusRoom`): others' bakes wait behind its. */
let focused: string | null = null;
let workerPaused = false;
const frames: number[] = [];

/** Bakes done this session, for measurements. */
export const bakeStats: (BakeTimings & {
  roomId: string;
  hash: string;
  cached: boolean;
  /** Main-thread time gathering and handing over, ms, in all and in its longest frame. */
  gatherMs: number;
  gatherMaxMs: number;
  /** Main-thread time swapping the result in, ms, all frames together, and the longest frame's share. */
  applyMs: number;
  applyMaxMs: number;
  /** From asking to shown, ms. */
  ms: number;
})[] = [];
/** The rooms' bakes shown now, latest last (to compare, in the browser). */
const shownBakes: { setShown(on: boolean): void; roomId: string }[] = [];
Object.assign(globalThis, {
  bakedAoStats: bakeStats,
  bakedAoRooms: shownBakes,
  /**
   * Diagnostics, in the browser (`bakedAo.report()`): bakes queued, under
   * way and done, and each room's state (applied, meshes patched, strength).
   */
  bakedAo: {
    report: () => ({
      queued: queue.size,
      active,
      waiting: [...jobs.values()].map((j) => j.roomId),
      done: bakeStats.map((s) => ({
        roomId: s.roomId,
        cached: s.cached,
        bakeMs: Math.round(s.bakeMs),
        vertices: s.vertices,
      })),
      rooms: shownBakes.map((r) => ({
        roomId: r.roomId,
        ...(r as { state?: object }).state,
      })),
      mode: playerSettings.value.aoMode,
    }),
  },
});

function startWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./ao-bake.worker.ts', import.meta.url), {
    type: 'module',
  });
  worker.addEventListener('message', (event: MessageEvent<BakeReply>) => {
    const reply = event.data;
    const job = jobs.get(reply.id);
    if (reply.type === 'missed') {
      if (job) queue.add(String(reply.id), job.priority);
      pump();
      return;
    }
    if (reply.id === active) active = null;
    jobs.delete(reply.id);
    if (reply.type === 'error') console.warn('Baked AO failed:', reply.message);
    job?.done(reply.type === 'ready' ? reply : null);
    pump();
  });
  return worker;
}

const send = (message: BakeRequest, transfer: Transferable[] = []) =>
  startWorker().postMessage(message, transfer);

/** Whether a job is for the room the walker is in (or nobody is placed yet). */
const isCurrent = (id: number) => {
  const job = jobs.get(id);
  return Boolean(job) && (focused === null || job!.roomId === focused);
};
/** Whether the walker's own room still has a bake to come. */
const currentPending = () => [...jobs.keys()].some(isCurrent);

function pump() {
  // Not ONE-TIME: queued bakes wait, none is started.
  if (active !== null || !baking()) return;
  const item = queue.peek();
  if (!item) return;
  const id = Number(item.hash);
  if (!jobs.has(id)) {
    queue.take();
    return pump();
  }
  // Another room's bake (a neighbour, the lift's destination) starts only
  // when the game is truly idle (the owner, 2026-10-30).
  if (
    !isCurrent(id) &&
    !mayBakeAhead(performance.now(), pausedUntil, frames, currentPending())
  )
    return;
  queue.take();
  active = id;
  send({ type: 'bake', id });
  throttle();
}

/** Pause or resume the worker by the frame budget, hand-overs and the mode. */
function throttle() {
  const now = performance.now();
  // The walker's room's bake by the frame budget; any other's only while
  // the game stays idle, stopped the moment frames rise or a hand-over begins.
  const allowed =
    baking() &&
    (active !== null && isCurrent(active)
      ? mayBake(now, pausedUntil, frames)
      : mayBakeAhead(now, pausedUntil, frames, currentPending()));
  if (!worker) return;
  if (allowed === !workerPaused) return;
  workerPaused = !allowed;
  send({ type: allowed ? 'resume' : 'pause' });
}
// The mode changed in the menu: a running bake pauses or goes on, a queued one starts.
effect(() => {
  void playerSettings.value.aoMode;
  throttle();
  pump();
});

/**
 * In development, a small note at the foot of the screen while the
 * walker's own room is still baking ("AO BAKING"), so a room without its
 * occlusion yet is not taken for one whose bake failed. Only for BAKED,
 * the slow ray-traced bake: SIMPLE takes about a second and is never
 * announced (the owner, 2026-10-30).
 */
let note: HTMLElement | null = null;
function showBaking() {
  if (!import.meta.env.DEV || typeof document === 'undefined') return;
  const on =
    playerSettings.value.aoMode === 'rays' &&
    baking() &&
    focused !== null &&
    currentPending();
  if (!on && !note) return;
  if (!note) {
    note = document.createElement('div');
    note.textContent = 'AO BAKING';
    note.setAttribute('aria-hidden', 'true');
    Object.assign(note.style, {
      position: 'fixed',
      left: '50%',
      bottom: '40px',
      transform: 'translateX(-50%)',
      font: '11px monospace',
      color: '#f5a623',
      background: 'rgba(0,0,0,0.5)',
      padding: '2px 6px',
      zIndex: '50',
      pointerEvents: 'none',
    });
    document.body.append(note);
  }
  note.hidden = !on;
}

// Every room's frames, measured here (whatever room draws them): the baker
// works only while the recent ones are within budget.
let lastFrame = 0;
function watchFrames(time: number) {
  if (lastFrame && document.visibilityState === 'visible') {
    frames.push(time - lastFrame);
    if (frames.length > 30) frames.shift();
  }
  lastFrame = time;
  if (active !== null) throttle();
  else if (queue.size) pump();
  showBaking();
  requestAnimationFrame(watchFrames);
}
if (typeof requestAnimationFrame === 'function')
  requestAnimationFrame(watchFrames);

/**
 * Hold the baker still for `ms` (a hand-over, a lift arrival, the first
 * seconds of a new room's shader compiles), then let it go on.
 */
export function pauseBaking(ms = 1500) {
  pausedUntil = Math.max(pausedUntil, performance.now() + ms);
  frames.length = 0;
  throttle();
}

/**
 * The walker is now in `roomId`: its bakes first, everyone else's after
 * (as neighbours), and a calm moment for the hand-over.
 */
export function focusRoom(roomId: string) {
  focused = roomId;
  for (const [id, job] of jobs) {
    job.priority =
      job.roomId === roomId ? BAKE_PRIORITY.current : BAKE_PRIORITY.neighbour;
    queue.reprioritise(String(id), job.priority);
  }
  pauseBaking();
}

// ---- Swapping results in, a few a frame ------------------------------------

/**
 * Run `work` when the main thread is idle (`requestIdleCallback`, lowest
 * priority), or within a second at most; a frame later where there is no
 * idle callback.
 */
function whenIdle(work: () => void): number {
  const idle = (
    globalThis as {
      requestIdleCallback?: (
        cb: () => void,
        options?: { timeout: number },
      ) => number;
    }
  ).requestIdleCallback;
  return idle
    ? idle(work, { timeout: 1000 })
    : requestAnimationFrame(() => work());
}

const applying: { work: () => void; vertices: number }[] = [];
let applyFrame = 0;
function applySome() {
  applyFrame = 0;
  const start = performance.now();
  let vertices = 0;
  while (
    applying.length &&
    performance.now() - start < APPLY_BUDGET &&
    (vertices === 0 || vertices + applying[0].vertices <= APPLY_VERTICES)
  ) {
    const next = applying.shift()!;
    vertices += next.vertices;
    next.work();
  }
  if (applying.length) applyFrame = whenIdle(applySome);
}
function later(work: () => void, vertices = 0) {
  applying.push({ work, vertices });
  if (!applyFrame) applyFrame = whenIdle(applySome);
}

// ---- Gathering a room's static geometry -----------------------------------

const PATCHABLE = (m: Material) =>
  m instanceof MeshStandardMaterial ||
  m instanceof MeshLambertMaterial ||
  m instanceof MeshPhongMaterial;

/** Whether `mesh` is static by the rules above (receiver), given its ancestry. */
function staticKind(
  mesh: Mesh,
  root: Object3D,
): 'receiver' | 'occluder' | `skip:${string}` | `occluder:${string}` {
  if (mesh instanceof InstancedMesh) return 'skip:instanced';
  let marked: boolean | undefined;
  let merged = false;
  let hidden = false;
  for (let o: Object3D | null = mesh; o; o = o.parent) {
    if (!o.visible) hidden = true;
    if (o.userData.bakeAo === false) return 'skip:excluded';
    if (o.userData.bakeAo === true) marked ??= true;
    if (o.name === 'Merged') merged = true;
    if (o === root) break;
  }
  if (!marked && !merged) return 'skip:not static';
  // Baked for the room with every light on (the owner, 2026-10-30): a
  // lamp's own meshes (its live materials) occlude whether lit and shown
  // or not, so how the room is lit never changes the bake or its key.
  const lamp =
    !Array.isArray(mesh.material) && Boolean(mesh.material.userData.live);
  if (hidden) return lamp ? 'occluder:lamp' : 'skip:hidden';
  const g = mesh.geometry as BufferGeometry;
  const position = g.attributes.position as BufferAttribute | undefined;
  const normal = g.attributes.normal as BufferAttribute | undefined;
  // Only plain arrays are handed over as they are.
  if (
    !position?.isBufferAttribute ||
    !normal?.isBufferAttribute ||
    !(position.array instanceof Float32Array) ||
    !(normal.array instanceof Float32Array)
  )
    return 'skip:arrays';
  const material = mesh.material;
  // Several materials (a hall's walls, paint and brick): each patched, if
  // every one can be.
  if (Array.isArray(material))
    return material.every(
      (m) =>
        PATCHABLE(m) && !m.transparent && !m.userData.live && m.opacity >= 1,
    )
      ? 'receiver'
      : 'occluder:materials';
  // Custom shaders (the pools' water, light shafts, caustics): neither.
  if ((material as { isShaderMaterial?: boolean }).isShaderMaterial)
    return 'skip:shader';
  // Glass, water, mesh and light shafts: see-through, so neither.
  if (material.transparent || material.alphaTest > 0 || material.opacity < 1)
    return 'skip:see-through';
  // Displays drawn on a canvas are not darkened: their readouts stay as lit.
  const map = (material as MeshStandardMaterial).map;
  // (A canvas tiled across a surface, as the museum's floors are, is a
  // finish, not a display: it repeats.)
  if (map && 'isCanvasTexture' in map && map.wrapS !== RepeatWrapping)
    return 'occluder:display';
  if (material.transparent || material.userData.live || !PATCHABLE(material))
    return `occluder:${material.transparent ? 'transparent' : material.userData.live ? 'live' : material.type}`;
  return 'receiver';
}

/** Whether a receiver's geometry can be subdivided: nothing to carry but positions, normals and uvs. */
function subdividable(g: BufferGeometry) {
  const uv = g.attributes.uv as BufferAttribute | undefined;
  return (
    Object.keys(g.attributes).every((n) =>
      ['position', 'normal', 'uv'].includes(n),
    ) &&
    (!uv || uv.array instanceof Float32Array)
  );
}

// ---- Applying a bake --------------------------------------------------------

const VERTEX_HEAD = 'attribute float aoBake;\nvarying float vBakedAo;\n';
const FRAGMENT_HEAD =
  'uniform float bakedAoStrength;\nuniform float bakedAoDepth;\nuniform float bakedAoDirect;\nvarying float vBakedAo;\n';
const FRAGMENT_APPLY = `{
  float bakedAo = mix( 1.0, clamp( 1.0 - ( 1.0 - vBakedAo ) * bakedAoDepth, 0.0, 1.0 ), bakedAoStrength );
  reflectedLight.indirectDiffuse *= bakedAo;
  reflectedLight.indirectSpecular *= bakedAo;
  // A share of the lamps' own light too, so it shows in rooms lit mostly
  // by lamps (still the lights-on bake: no light's state enters it).
  reflectedLight.directDiffuse *= mix( 1.0, bakedAo, bakedAoDirect );
}
#include <aomap_fragment>`;
/** `?aodebug=1`: every baked surface shows its raw bake as grey, nothing else. */
const AO_DEBUG =
  new URLSearchParams(globalThis.location?.search ?? '').get('aodebug') === '1';
const FRAGMENT_DEBUG = '\tgl_FragColor = vec4( vec3( vBakedAo ), 1.0 );\n}';

/**
 * A copy of `material` that multiplies its indirect light by the vertex
 * attribute `aoBake`, faded by `strength` (0 none, 1 all); any patch the
 * material already had runs first.
 */
function bakedAoMaterial(
  material: Material,
  strength: { value: number },
  depth: { value: number },
  direct: { value: number },
) {
  const copy = material.clone();
  const own = material.onBeforeCompile;
  const ownKey = material.customProgramCacheKey.bind(material);
  copy.userData = material.userData;
  copy.onBeforeCompile = function (
    shader: WebGLProgramParametersWithUniforms,
    renderer: WebGLRenderer,
  ) {
    own.call(this, shader, renderer);
    shader.uniforms.bakedAoStrength = strength;
    shader.uniforms.bakedAoDepth = depth;
    shader.uniforms.bakedAoDirect = direct;
    shader.vertexShader =
      VERTEX_HEAD +
      shader.vertexShader.replace(
        'void main() {',
        'void main() {\n\tvBakedAo = aoBake;',
      );
    shader.fragmentShader =
      FRAGMENT_HEAD +
      shader.fragmentShader.replace(
        '#include <aomap_fragment>',
        FRAGMENT_APPLY,
      );
    // The debug grey written last of all, over every other patch.
    if (AO_DEBUG) {
      const end = shader.fragmentShader.lastIndexOf('}');
      shader.fragmentShader =
        shader.fragmentShader.slice(0, end) + FRAGMENT_DEBUG;
    }
  };
  copy.customProgramCacheKey = () =>
    `${ownKey()}|baked-ao-v1${AO_DEBUG ? '|debug' : ''}`;
  return copy;
}

export interface BakedAoOptions {
  /** The room's id: its cache entries are its, and hubs are never evicted. */
  roomId: string;
  /** How urgent (`BAKE_PRIORITY`): the room the walker is in, by default. */
  priority?: number;
  /** Scene units a metre. */
  unit?: number;
  /** Its kind of room's look (`AO_LOOKS`): how it is baked and how deep. */
  look?: AoLook;
  settings?: BakeSettings;
  /** Bake again even if cached (`?bake=fresh`). */
  fresh?: boolean;
  /**
   * The room's free space for SIMPLE occlusion, boxes in `root`'s own
   * frame (min x, y, z, max x, y, z), from its plan; none: the shell's
   * bounds.
   */
  interiors?: Box[];
  /**
   * Compile shaders without blocking (`renderer.compileAsync(object, camera,
   * scene)`): the baked materials are compiled on stand-ins before they are
   * swapped in, so their first frame does not stall.
   */
  compile?: (object: Object3D) => Promise<unknown>;
}

export type BakeStat = (typeof bakeStats)[number];

/**
 * Whether a mesh must never be a SIMPLE occluder (the owner, 2026-10-30):
 * cables, wires, conduits, trays, signs, labels, plates, decals, tags,
 * by its or an ancestor's name, or `userData.aoOccluder === false`.
 */
const NEVER_OCCLUDES =
  /\b(cables?|wires?|wiring|conduits?|trays?|signs?|signage|labels?|plates?|decals?|stickers?|tags?|posters?|notices?|placards?)\b/i;
function neverOccludes(mesh: Object3D) {
  for (let o: Object3D | null = mesh; o; o = o.parent) {
    if (o.userData.aoOccluder === false) return true;
    if (o.name && NEVER_OCCLUDES.test(o.name)) return true;
  }
  return false;
}

/** `?aodebug=1`: a SIMPLE bake's boxes drawn as outlines, its interiors red, its occluders yellow. */
function showBoxes(
  root: Object3D,
  boxes: { interiors: number[]; occluders: number[] },
) {
  let top = root;
  while (top.parent) top = top.parent;
  const draw = (list: number[], colour: number) => {
    for (let i = 0; i + 5 < list.length; i += 6)
      top.add(
        new Box3Helper(
          new Box3(
            new Vector3(list[i], list[i + 1], list[i + 2]),
            new Vector3(list[i + 3], list[i + 4], list[i + 5]),
          ),
          colour,
        ),
      );
  };
  Object.assign(globalThis, { simpleAoBoxes: boxes });
  draw(boxes.interiors, 0xff2020);
  draw(boxes.occluders, 0xffd000);
}

/** Boxes in `root`'s frame as world boxes, six numbers each. */
function worldInteriors(root: Object3D, boxes: readonly Box[]) {
  const out: number[] = [];
  for (const b of boxes) {
    const box = new Box3(
      new Vector3(b[0], b[1], b[2]),
      new Vector3(b[3], b[4], b[5]),
    ).applyMatrix4(root.matrixWorld);
    out.push(box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z);
  }
  return out;
}

/**
 * The room's lamps (point, spot and area lights) anywhere in its scene,
 * world positions, three numbers each: SIMPLE occlusion darkens more far
 * from them in plant rooms. Their state does not count, only where they are.
 */
function lampPositions(root: Object3D) {
  let top = root;
  while (top.parent) top = top.parent;
  const out: number[] = [];
  const v = new Vector3();
  top.traverse((o) => {
    const l = o as Object3D & {
      isPointLight?: boolean;
      isSpotLight?: boolean;
      isRectAreaLight?: boolean;
    };
    if (l.isPointLight || l.isSpotLight || l.isRectAreaLight) {
      o.getWorldPosition(v);
      out.push(v.x, v.y, v.z);
    }
  });
  return out;
}

/**
 * Bake `root`'s static meshes' ambient occlusion, or take it from the
 * cache, and fade it in. Returns a handle: `ready` settles once it is
 * shown (with what it cost), `setShown` turns it off and on (to compare),
 * `dispose` drops it.
 */
export function bakeRoomAo(root: Object3D, options: BakedAoOptions) {
  const asked = new URLSearchParams(globalThis.location?.search ?? '').get(
    'bake',
  );
  // `?bake=off`: the room as it was before baking, to compare.
  if (asked === 'off')
    return {
      roomId: options.roomId,
      hash: '',
      receivers: 0,
      skipped: {},
      ready: Promise.resolve(null as BakeStat | null),
      setShown() {},
      strength: 0,
      dispose() {},
    };
  const started = performance.now();
  const {
    roomId,
    // The walker's room first; one built ahead (a neighbour through a
    // doorway, the lift's destination, a museum hall next door) after.
    priority = focused === null || focused === options.roomId
      ? BAKE_PRIORITY.current
      : BAKE_PRIORITY.neighbour,
    unit = 1,
  } = options;
  // Its look, or another asked for in the address to compare
  // (`?aolook=standard`, `?aodepth=1.5`).
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const askedLook = params.get('aolook');
  const look =
    AO_LOOKS[
      askedLook && askedLook in AO_LOOKS
        ? (askedLook as AoLook)
        : (options.look ?? 'standard')
    ];
  // How it is worked out: the method chosen when the room is built
  // (SIMPLE unless BAKED is chosen, or `?aomethod=rays|simple`); shown
  // only while that mode is chosen, the other's waiting for the next room.
  const askedMethod = params.get('aomethod');
  const method: 'rays' | 'simple' =
    askedMethod === 'rays' || askedMethod === 'simple'
      ? askedMethod
      : playerSettings.value.aoMode === 'rays'
        ? 'rays'
        : 'simple';
  const lookName: AoLook =
    askedLook && askedLook in AO_LOOKS
      ? (askedLook as AoLook)
      : (options.look ?? 'standard');
  const simpleLook = SIMPLE_AO_LOOKS[lookName];
  const settings = options.settings ?? look.bake;
  const depth = {
    value:
      Number(params.get('aodepth')) || (method === 'simple' ? 1 : look.depth),
  };
  const direct = {
    value: params.has('aodirect')
      ? Number(params.get('aodirect'))
      : look.direct,
  };
  const fresh = options.fresh ?? asked === 'fresh';
  root.updateMatrixWorld(true);
  const receivers: Mesh[] = [];
  const found: { mesh: Mesh; receiver: boolean }[] = [];
  // Why each mesh not baked was left out, counted (to look into in the browser).
  const skipped: Record<string, number> = {};
  // Only listed here; sorted a few at a time (below).
  const all: Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof Mesh) all.push(o);
  });
  let sorted = 0;
  const id = nextId++;
  let gatherMs = performance.now() - started;
  let gatherMaxMs = gatherMs;
  const strength = { value: 0 };
  const materials = new Map<Material, Material>();
  const originals = new Map<
    Mesh,
    { material: Material | Material[]; geometry: BufferGeometry }
  >();
  let disposed = false;
  let shown = true;
  let applied = false;
  let fadeFrom = 0;
  let raf = 0;
  const fade = () => {
    raf = 0;
    if (disposed) return;
    const on = shown && playerSettings.value.aoMode === method;
    const target = on ? 1 : 0;
    const t = Math.min(
      1,
      (performance.now() - fadeFrom) / (BAKED_AO_FADE * 1000),
    );
    strength.value = on ? t : 0;
    if (strength.value !== target) raf = requestAnimationFrame(fade);
  };
  const startFade = () => {
    fadeFrom = performance.now();
    strength.value = 0;
    if (!raf) raf = requestAnimationFrame(fade);
  };
  // Another mode in the menu: the bake goes at once; back to its own, it fades in.
  let wasBaking = playerSettings.value.aoMode === method;
  const stopFollowing = effect(() => {
    const now = playerSettings.value.aoMode === method;
    if (now === wasBaking) return;
    wasBaking = now;
    if (applied) startFade();
  });
  /** Swap one receiver's geometry and material: no per-vertex work here. */
  const swap = (mesh: Mesh, baked: BakedMesh) => {
    // (An empty bake: too small to bake, left as it is.)
    if (disposed || !baked.ao.length) return;
    const old = mesh.geometry as BufferGeometry;
    let geometry: BufferGeometry;
    if (baked.positions && baked.normals) {
      geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new BufferAttribute(baked.positions, 3),
      );
      geometry.setAttribute('normal', new BufferAttribute(baked.normals, 3));
      if (baked.uvs)
        geometry.setAttribute('uv', new BufferAttribute(baked.uvs, 2));
      if (old.boundingBox) geometry.boundingBox = old.boundingBox.clone();
    } else {
      if (old.attributes.position.count !== baked.ao.length) return;
      // Its own geometry, sharing the arrays (another mesh may share the
      // old geometry, with a bake of its own): no copying.
      geometry = new BufferGeometry();
      for (const [name, attribute] of Object.entries(old.attributes))
        geometry.setAttribute(name, attribute);
      geometry.setIndex(old.index);
      for (const g of old.groups)
        geometry.addGroup(g.start, g.count, g.materialIndex);
      geometry.boundingSphere = old.boundingSphere;
      geometry.boundingBox = old.boundingBox;
    }
    geometry.setAttribute('aoBake', new BufferAttribute(baked.ao, 1, true));
    // Its bounds from the worker, so none are worked out here.
    if (baked.sphere)
      geometry.boundingSphere = new Sphere(
        new Vector3(baked.sphere[0], baked.sphere[1], baked.sphere[2]),
        baked.sphere[3],
      );
    // Its material groups carried across the subdivision.
    if (baked.positions && baked.starts && old.groups.length) {
      const at = (i: number) =>
        baked.starts![Math.min(baked.starts!.length - 1, Math.floor(i / 3))] *
        3;
      for (const g of old.groups)
        geometry.addGroup(
          at(g.start),
          at(g.start + g.count) - at(g.start),
          g.materialIndex,
        );
    }
    const material = mesh.material as Material | Material[];
    const patch = (m: Material) => {
      let patched = materials.get(m);
      if (!patched)
        materials.set(
          m,
          (patched = bakedAoMaterial(m, strength, depth, direct)),
        );
      return patched;
    };
    if (!originals.has(mesh)) originals.set(mesh, { material, geometry: old });
    mesh.geometry = geometry;
    mesh.material = Array.isArray(material)
      ? material.map(patch)
      : patch(material);
  };
  const ready = new Promise<Ready | null>((resolve) => {
    jobs.set(id, { roomId, priority, done: resolve });
  })
    .then(async (reply) => {
      // The baked materials compiled first, on stand-ins, without blocking.
      if (reply && options.compile && !disposed && asked !== 'late-nocompile') {
        const stand = new Group();
        const tiny = new BufferGeometry();
        tiny.setAttribute(
          'position',
          new BufferAttribute(new Float32Array(9), 3),
        );
        tiny.setAttribute(
          'normal',
          new BufferAttribute(new Float32Array(9), 3),
        );
        tiny.setAttribute('uv', new BufferAttribute(new Float32Array(6), 2));
        tiny.setAttribute(
          'aoBake',
          new BufferAttribute(new Uint8Array(3), 1, true),
        );
        // One stand-in for each kind of program (material and shadows),
        // compiled one a frame: linking a program can take tens of
        // milliseconds, so never many at once.
        const kinds = new Map<string, Mesh>();
        for (const mesh of receivers)
          for (const material of ([] as Material[]).concat(mesh.material)) {
            let patched = materials.get(material);
            if (!patched)
              materials.set(
                material,
                (patched = bakedAoMaterial(material, strength, depth, direct)),
              );
            const key = `${patched.type}|${patched.customProgramCacheKey()}|${(patched as MeshStandardMaterial).map ? 'm' : ''}|${mesh.receiveShadow}|${mesh.castShadow}|${patched.side}`;
            if (kinds.has(key)) continue;
            const proxy = new Mesh(tiny, patched);
            // Shadows change the program: as the mesh has them.
            proxy.receiveShadow = mesh.receiveShadow;
            proxy.castShadow = mesh.castShadow;
            kinds.set(key, proxy);
          }
        for (const proxy of kinds.values()) {
          if (disposed) break;
          stand.clear();
          stand.add(proxy);
          try {
            await options.compile(stand);
          } catch {
            // Compiled on first use instead.
          }
          await new Promise((next) => requestAnimationFrame(next));
        }
        tiny.dispose();
      }
      return reply;
    })
    .then(
      (reply) =>
        new Promise<BakeStat | null>((resolve) => {
          if (!reply || disposed || reply.meshes.length !== receivers.length)
            return resolve(null);
          let applyMs = 0;
          let applyMaxMs = 0;
          receivers.forEach((mesh, i) =>
            later(() => {
              const t = performance.now();
              swap(mesh, reply.meshes[i]);
              const spent = performance.now() - t;
              applyMs += spent;
              applyMaxMs = Math.max(applyMaxMs, spent);
            }, reply.meshes[i].ao.length),
          );
          later(() => {
            applied = true;
            startFade();
            if (AO_DEBUG && reply.boxes) showBoxes(root, reply.boxes);
            const stat: BakeStat = {
              ...reply.timings,
              roomId,
              hash: reply.hash,
              cached: reply.cached,
              gatherMs,
              gatherMaxMs,
              applyMs,
              applyMaxMs,
              ms: performance.now() - started,
            };
            bakeStats.push(stat);
            resolve(stat);
          });
        }),
    );
  // In three steps a few at a time, each within the frame budget: sort the
  // meshes; number their geometries (each once however many meshes share
  // it); copy every geometry into a few packed arrays. Then hand those
  // over: a handful of transfers, nothing copied again.
  const numbered = new Map<BufferGeometry, number>();
  const unique: BufferGeometry[] = [];
  const offsets: number[] = [];
  let floats = 0;
  let uvFloats = 0;
  let indices = 0;
  let next = 0;
  let packed: {
    positions: Float32Array;
    normals: Float32Array;
    uvs: Float32Array;
    index: Uint32Array;
  } | null = null;
  let copied = 0;
  const gatherSome = () => {
    if (disposed) return;
    const start = performance.now();
    const within = () => performance.now() - start < APPLY_BUDGET;
    while (sorted < all.length && within()) {
      const o = all[sorted++];
      const kind = staticKind(o, root);
      if (kind !== 'receiver') skipped[kind] = (skipped[kind] ?? 0) + 1;
      if (kind.startsWith('skip:')) continue;
      found.push({ mesh: o, receiver: kind === 'receiver' });
      if (kind === 'receiver') receivers.push(o);
    }
    while (sorted === all.length && next < found.length && within()) {
      const g = found[next++].mesh.geometry as BufferGeometry;
      if (numbered.has(g)) continue;
      numbered.set(g, unique.length);
      unique.push(g);
      const count = g.attributes.position.array.length;
      const uv = g.attributes.uv as BufferAttribute | undefined;
      const hasUv = uv?.array instanceof Float32Array;
      const index = g.index?.array;
      const hasIndex =
        index instanceof Uint32Array || index instanceof Uint16Array;
      offsets.push(
        floats,
        count,
        hasUv ? uvFloats : -1,
        hasIndex ? indices : -1,
        hasIndex ? index.length : 0,
      );
      floats += count;
      if (hasUv) uvFloats += (count / 3) * 2;
      if (hasIndex) indices += index.length;
    }
    if (next === found.length && sorted === all.length) {
      packed ??= {
        positions: new Float32Array(floats),
        normals: new Float32Array(floats),
        uvs: new Float32Array(uvFloats),
        index: new Uint32Array(indices),
      };
      while (copied < unique.length && within()) {
        const g = unique[copied];
        const o = offsets.slice(copied * 5, copied * 5 + 5);
        packed.positions.set(g.attributes.position.array as Float32Array, o[0]);
        packed.normals.set(g.attributes.normal.array as Float32Array, o[0]);
        if (o[2] >= 0)
          packed.uvs.set(g.attributes.uv.array as Float32Array, o[2]);
        if (o[3] >= 0) packed.index.set(g.index!.array, o[3]);
        copied++;
      }
    }
    const spent = performance.now() - start;
    gatherMs += spent;
    gatherMaxMs = Math.max(gatherMaxMs, spent);
    if (!packed || copied < unique.length) {
      whenIdle(gatherSome);
      return;
    }
    const t = performance.now();
    const geometry = new Int32Array(found.length);
    const flags = new Uint8Array(found.length);
    const matrices = new Float32Array(found.length * 16);
    found.forEach(({ mesh, receiver }, i) => {
      const g = mesh.geometry as BufferGeometry;
      geometry[i] = numbered.get(g)!;
      flags[i] =
        (receiver ? 1 : 0) |
        (receiver && subdividable(g) ? 2 : 0) |
        ((mesh.material as Material).side === DoubleSide ? 4 : 0) |
        (neverOccludes(mesh) ? 8 : 0);
      matrices.set(mesh.matrixWorld.elements, i * 16);
    });
    const message: Extract<BakeRequest, { type: 'prepare' }> = {
      type: 'prepare',
      id,
      roomId,
      geometries: { ...packed, offsets: Int32Array.from(offsets) },
      meshes: { geometry, flags, matrices },
      settings: {
        distance: settings.distance,
        maxEdge: settings.maxEdge,
        unit,
        rays: settings.rays,
        smooth: settings.smooth !== false,
        ...(method === 'simple'
          ? {
              maxEdge: simpleLook.maxEdge,
              simple: {
                interiors: worldInteriors(root, options.interiors ?? []),
                lights: lampPositions(root),
                look: simpleLook,
              },
            }
          : {}),
      },
      fresh,
    };
    send(message, [
      packed.positions.buffer,
      packed.normals.buffer,
      packed.uvs.buffer,
      packed.index.buffer,
      message.geometries.offsets.buffer,
      geometry.buffer,
      flags.buffer,
      matrices.buffer,
    ]);
    const handOver = performance.now() - t;
    gatherMs += handOver;
    gatherMaxMs = Math.max(gatherMaxMs, handOver);
  };
  // `?bake=late`: begun 8 s after the room, to measure its own cost apart
  // from the room's loading.
  if (asked === 'late' || asked === 'late-nocompile')
    setTimeout(gatherSome, 8000);
  else gatherSome();
  const handle = {
    roomId,
    /** What it bakes (to look into in the browser). */
    root,
    hash: '',
    get receivers() {
      return receivers.length;
    },
    skipped,
    ready,
    /** Show the bake or not (fading in again when shown). */
    setShown(on: boolean) {
      shown = on;
      startFade();
    },
    get strength() {
      return strength.value;
    },
    /** How deep the bake darkens (`AO_LOOKS`' depth), changed at once. */
    setDepth(value: number) {
      depth.value = value;
    },
    /** How much of the lamps' direct light it darkens too, 0–1. */
    setDirect(value: number) {
      direct.value = value;
    },
    /** For checking in the browser: whether shown, and how strongly. */
    get state() {
      return {
        applied,
        strength: strength.value,
        depth: depth.value,
        direct: direct.value,
        meshesPatched: originals.size,
      };
    },
    dispose() {
      disposed = true;
      stopFollowing();
      const at = shownBakes.indexOf(handle);
      if (at >= 0) shownBakes.splice(at, 1);
      if (raf) cancelAnimationFrame(raf);
      // Its bake goes on into the cache all the same (baking ahead), unshown.
      const job = jobs.get(id);
      if (job) job.done = () => {};
      for (const [mesh, { material, geometry }] of originals) {
        // (Its own attributes only: shared ones stay with the old geometry.)
        if (mesh.geometry !== geometry) mesh.geometry.dispose();
        mesh.material = material;
        mesh.geometry = geometry;
      }
      for (const m of materials.values()) m.dispose();
    },
  };
  shownBakes.push(handle);
  return handle;
}
