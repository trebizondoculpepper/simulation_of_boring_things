/**
 * Baked ambient occlusion in a room (`doc/reports/baked-lighting-and-reflections.md`,
 * the owner, 2026-10-30): the room's static meshes are gathered, their
 * large flat faces subdivided, hashed and looked up in the cache; if not
 * there, baked in the one background worker. Until the bake is ready the
 * room shows no ambient occlusion at all; then the bake fades in over
 * about a second and stays. The occlusion darkens only the ambient
 * (indirect) light, never a lamp's direct light.
 *
 * A room calls `bakeRoomAo(root, { roomId })` once built. What it bakes:
 * by default the meshes `mergeStatic` made (in its `Merged` holders, never
 * a moving or clickable part, which it keeps apart), plus any mesh under
 * an object marked `userData.bakeAo = true`; never anything under one
 * marked `userData.bakeAo = false`, nor instanced meshes, hidden meshes,
 * transparent or live (lamp) materials.
 */
import {
  BufferAttribute,
  BufferGeometry,
  InstancedMesh,
  Matrix3,
  Mesh,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import type {
  Material,
  Object3D,
  WebGLProgramParametersWithUniforms,
  WebGLRenderer,
} from 'three';
import {
  DEFAULT_BAKE,
  geometryHash,
  subdivideLongEdges,
} from './logic/ao-geometry';
import type { BakeSettings } from './logic/ao-geometry';
import {
  BAKE_PRIORITY,
  createBakeQueue,
  mayBake,
} from './logic/ao-cache-policy';
import { loadBake, storeBake } from './ao-cache';
import { effect } from '@preact/signals-core';
import { settings as playerSettings } from '../settings/settings-store';

/** Whether the player has ONE-TIME (baked) ambient occlusion chosen. */
const baking = () => playerSettings.value.aoMode === 'bake';
import type {
  BakeMeshPayload,
  BakeReply,
  BakeRequest,
} from './ao-bake-protocol';

/** How long the bake takes to fade in once ready, seconds. */
export const BAKED_AO_FADE = 1;

// ---- The worker and its queue ------------------------------------------------

interface PendingBake {
  hash: string;
  roomId: string;
  meshes: BakeMeshPayload[];
  settings: { rays: number; distance: number; bias: number };
  waiting: ((reply: Extract<BakeReply, { type: 'done' }> | null) => void)[];
}

const queue = createBakeQueue();
const pending = new Map<string, PendingBake>();
let worker: Worker | null = null;
let active: { id: number; bake: PendingBake } | null = null;
let nextId = 1;
let pausedUntil = 0;
let workerPaused = false;
const frames: number[] = [];

/** Bakes done this session, for the dev overlay and measurements. */
export const bakeStats: {
  roomId: string;
  hash: string;
  ms: number;
  bvhMs: number;
  rays: number;
  triangles: number;
  vertices: number;
  cached: boolean;
}[] = [];
// For measurements in the browser: every bake this session.
/** The rooms' bakes shown now, latest last (to compare, in the browser). */
const shownBakes: { setShown(on: boolean): void; roomId: string }[] = [];
Object.assign(globalThis, {
  bakedAoStats: bakeStats,
  bakedAoRooms: shownBakes,
});

function startWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./ao-bake.worker.ts', import.meta.url), {
    type: 'module',
  });
  worker.addEventListener('message', (event: MessageEvent<BakeReply>) => {
    const reply = event.data;
    if (!active || reply.id !== active.id) return;
    const { bake } = active;
    active = null;
    pending.delete(bake.hash);
    for (const w of bake.waiting) w(reply.type === 'done' ? reply : null);
    if (reply.type === 'error') console.warn('Baked AO failed:', reply.message);
    pump();
  });
  return worker;
}

const send = (message: BakeRequest, transfer: Transferable[] = []) =>
  startWorker().postMessage(message, transfer);

function pump() {
  // Not ONE-TIME: queued bakes wait, none is started.
  if (active || !baking()) return;
  const item = queue.take();
  if (!item) return;
  const bake = pending.get(item.hash);
  if (!bake) return pump();
  active = { id: nextId++, bake };
  // The geometry is copied to the worker; the room keeps its own.
  send({
    type: 'bake',
    id: active.id,
    meshes: bake.meshes,
    settings: bake.settings,
  });
  throttle();
}

/** Pause or resume the worker by the frame budget and hand-overs. */
function throttle() {
  const allowed = baking() && mayBake(performance.now(), pausedUntil, frames);
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
setInterval(() => {
  if (active) throttle();
}, 250);

/**
 * A frame's time, ms, from the room drawing it: the baker works only while
 * the recent frames are within budget.
 */
export function reportFrameTime(ms: number) {
  frames.push(ms);
  if (frames.length > 30) frames.shift();
}

/**
 * Hold the baker still for `ms` (a hand-over, a lift arrival, the first
 * seconds of a new room's shader compiles), then let it go on.
 */
export function pauseBaking(ms = 1500) {
  pausedUntil = Math.max(pausedUntil, performance.now() + ms);
  frames.length = 0;
  throttle();
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
): 'receiver' | 'occluder' | null {
  if (mesh instanceof InstancedMesh) return null;
  let marked: boolean | undefined;
  let merged = false;
  for (let o: Object3D | null = mesh; o; o = o.parent) {
    if (!o.visible) return null;
    if (o.userData.bakeAo === false) return null;
    if (o.userData.bakeAo === true) marked ??= true;
    if (o.name === 'Merged') merged = true;
    if (o === root) break;
  }
  if (!marked && !merged) return null;
  const material = mesh.material;
  if (Array.isArray(material)) return 'occluder';
  if (material.transparent || material.userData.live || !PATCHABLE(material))
    return 'occluder';
  return 'receiver';
}

/**
 * A receiver's large faces subdivided in place (so the walls, floors and
 * ceilings have vertices enough to carry occlusion), if its geometry is
 * only positions, normals and uvs; kept as it is otherwise.
 */
function subdivideInPlace(mesh: Mesh, maxEdge: number) {
  const g = mesh.geometry as BufferGeometry;
  if (g.userData.aoSubdivided) return;
  const names = Object.keys(g.attributes);
  // (Groups do not matter: a receiver has one material.)
  if (names.some((n) => !['position', 'normal', 'uv'].includes(n))) return;
  if (!g.attributes.normal) g.computeVertexNormals();
  const flat = g.index ? g.toNonIndexed() : g;
  const uv = flat.attributes.uv as BufferAttribute | undefined;
  const out = subdivideLongEdges(
    {
      positions: flat.attributes.position.array as Float32Array,
      normals: flat.attributes.normal.array as Float32Array,
      uvs: uv ? (uv.array as Float32Array) : null,
    },
    maxEdge,
  );
  if (
    out.positions.length ===
      (g.attributes.position.array as Float32Array).length &&
    !g.index
  ) {
    g.userData.aoSubdivided = true;
    return;
  }
  const next = new BufferGeometry();
  next.setAttribute('position', new BufferAttribute(out.positions, 3));
  next.setAttribute('normal', new BufferAttribute(out.normals, 3));
  if (out.uvs) next.setAttribute('uv', new BufferAttribute(out.uvs, 2));
  next.computeBoundingSphere();
  next.computeBoundingBox();
  next.userData.aoSubdivided = true;
  mesh.geometry = next;
  g.dispose();
  if (flat !== g) flat.dispose();
}

function payloadOf(mesh: Mesh, receiver: boolean): BakeMeshPayload {
  const g = mesh.geometry as BufferGeometry;
  const position = g.attributes.position;
  if (!g.attributes.normal) g.computeVertexNormals();
  const normal = g.attributes.normal;
  const n = position.count;
  const positions = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  const v = new Vector3();
  const normalMatrix = new Matrix3().getNormalMatrix(mesh.matrixWorld);
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
    v.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize();
    normals[i * 3] = v.x;
    normals[i * 3 + 1] = v.y;
    normals[i * 3 + 2] = v.z;
  }
  const index = g.index ? Uint32Array.from(g.index.array) : null;
  return { positions, normals, index, receiver };
}

// ---- Applying a bake --------------------------------------------------------

const VERTEX_HEAD = 'attribute float aoBake;\nvarying float vBakedAo;\n';
const FRAGMENT_HEAD =
  'uniform float bakedAoStrength;\nvarying float vBakedAo;\n';
const FRAGMENT_APPLY = `{
  float bakedAo = mix( 1.0, vBakedAo, bakedAoStrength );
  reflectedLight.indirectDiffuse *= bakedAo;
  reflectedLight.indirectSpecular *= bakedAo;
}
#include <aomap_fragment>`;

/**
 * A copy of `material` that multiplies its indirect light by the vertex
 * attribute `aoBake`, faded by `strength` (0 none, 1 all); any patch the
 * material already had runs first.
 */
function bakedAoMaterial(material: Material, strength: { value: number }) {
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
  };
  copy.customProgramCacheKey = () => `${ownKey()}|baked-ao-v1`;
  return copy;
}

export interface BakedAoOptions {
  /** The room's id: its cache entries are its, and hubs are never evicted. */
  roomId: string;
  /** How urgent (`BAKE_PRIORITY`): the room the walker is in, by default. */
  priority?: number;
  /** Scene units a metre. */
  unit?: number;
  settings?: BakeSettings;
  /** Bake again even if cached (`?bake=fresh`). */
  fresh?: boolean;
}

/**
 * Bake `root`'s static meshes' ambient occlusion, or take it from the
 * cache, and fade it in. Returns a handle: `ready` settles once it is
 * shown (with what it cost), `setShown` turns it off and on (to compare),
 * `dispose` drops it (the bake itself goes on into the cache).
 */
export function bakeRoomAo(root: Object3D, options: BakedAoOptions) {
  const started = performance.now();
  const {
    roomId,
    priority = BAKE_PRIORITY.current,
    unit = 1,
    settings = DEFAULT_BAKE,
  } = options;
  const asked = new URLSearchParams(globalThis.location?.search ?? '').get(
    'bake',
  );
  const fresh = options.fresh ?? asked === 'fresh';
  // `?bake=off`: the room as it was before baking, to compare.
  if (asked === 'off')
    return {
      hash: '',
      receivers: 0,
      occluders: 0,
      vertices: 0,
      ready: Promise.resolve(null),
      setShown() {},
      strength: 0,
      dispose() {},
    };
  root.updateMatrixWorld(true);
  const receivers: Mesh[] = [];
  const meshes: Mesh[] = [];
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const kind = staticKind(o, root);
    if (!kind) return;
    meshes.push(o);
    if (kind === 'receiver') receivers.push(o);
  });
  // In each mesh's own units: its world scale may be other than one.
  for (const mesh of receivers)
    subdivideInPlace(
      mesh,
      (settings.maxEdge * unit) / mesh.matrixWorld.getMaxScaleOnAxis(),
    );
  const isReceiver = new Set(receivers);
  const payload = meshes.map((m) => payloadOf(m, isReceiver.has(m)));
  const hash = geometryHash(payload, settings, unit);
  const hashMs = performance.now() - started;
  const strength = { value: 0 };
  const materials = new Map<Material, Material>();
  const originals = new Map<Mesh, Material>();
  let disposed = false;
  let shown = true;
  let fadeFrom = 0;
  let raf = 0;
  const fade = () => {
    raf = 0;
    if (disposed) return;
    const on = shown && baking();
    const target = on ? 1 : 0;
    const t = Math.min(
      1,
      (performance.now() - fadeFrom) / (BAKED_AO_FADE * 1000),
    );
    strength.value = on ? t : 0;
    if (strength.value !== target) raf = requestAnimationFrame(fade);
  };
  // LIVE or OFF in the menu: the bake goes at once; back to ONE-TIME, it fades in.
  let applied = false;
  let wasBaking = baking();
  const stopFollowing = effect(() => {
    const now = playerSettings.value.aoMode === 'bake';
    if (now === wasBaking) return;
    wasBaking = now;
    if (!applied) return;
    fadeFrom = performance.now();
    strength.value = 0;
    if (!raf) raf = requestAnimationFrame(fade);
  });
  const apply = (ao: Uint8Array[]) => {
    if (disposed) return false;
    applied = true;
    if (ao.length !== receivers.length) return false;
    receivers.forEach((mesh, i) => {
      const g = mesh.geometry as BufferGeometry;
      if (g.attributes.position.count !== ao[i].length) return;
      g.setAttribute('aoBake', new BufferAttribute(ao[i], 1, true));
      const material = mesh.material as Material;
      let patched = materials.get(material);
      if (!patched)
        materials.set(
          material,
          (patched = bakedAoMaterial(material, strength)),
        );
      originals.set(mesh, material);
      mesh.material = patched;
    });
    fadeFrom = performance.now();
    if (!raf) raf = requestAnimationFrame(fade);
    return true;
  };
  const vertices = receivers.reduce(
    (s, m) => s + (m.geometry as BufferGeometry).attributes.position.count,
    0,
  );
  const ready = (async () => {
    const cached = fresh ? null : await loadBake(hash);
    if (cached) {
      apply(cached.ao);
      const stat = {
        roomId,
        hash,
        ms: performance.now() - started,
        bvhMs: 0,
        rays: 0,
        triangles: 0,
        vertices,
        cached: true,
        hashMs,
      };
      bakeStats.push(stat);
      return stat;
    }
    if (!receivers.length) return null;
    let bake = pending.get(hash);
    if (!bake) {
      bake = {
        hash,
        roomId,
        meshes: payload,
        settings: {
          rays: settings.rays,
          distance: settings.distance * unit,
          bias: 0.002 * unit,
        },
        waiting: [],
      };
      pending.set(hash, bake);
    }
    const reply = await new Promise<Extract<
      BakeReply,
      { type: 'done' }
    > | null>((resolve) => {
      bake.waiting.push(resolve);
      queue.add(hash, priority);
      pump();
    });
    if (!reply) return null;
    const bytes = reply.ao.reduce((s, a) => s + a.byteLength, 0);
    void storeBake({ hash, roomId, bytes, lastUsed: Date.now(), ao: reply.ao });
    apply(reply.ao);
    const stat = {
      roomId,
      hash,
      ms: reply.ms,
      bvhMs: reply.bvhMs,
      rays: reply.rays,
      triangles: reply.triangles,
      vertices,
      cached: false,
      hashMs,
    };
    bakeStats.push(stat);
    return stat;
  })();
  const handle = {
    roomId,
    hash,
    receivers: receivers.length,
    occluders: meshes.length - receivers.length,
    vertices,
    ready,
    /** Show the bake or not (fading in again when shown). */
    setShown(on: boolean) {
      shown = on;
      fadeFrom = performance.now();
      strength.value = 0;
      if (!raf) raf = requestAnimationFrame(fade);
    },
    get strength() {
      return strength.value;
    },
    dispose() {
      disposed = true;
      stopFollowing();
      const at = shownBakes.indexOf(handle);
      if (at >= 0) shownBakes.splice(at, 1);
      if (raf) cancelAnimationFrame(raf);
      for (const [mesh, material] of originals) mesh.material = material;
      for (const m of materials.values()) m.dispose();
    },
  };
  shownBakes.push(handle);
  return handle;
}
