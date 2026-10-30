/**
 * The ambient occlusion baker's worker (the owner, 2026-10-30: all of it
 * off the main thread). For each room it is handed its static meshes' own
 * arrays and world matrices, and does the rest: puts them in world space,
 * hashes them and looks in the cache (`prepare`); and, for a miss, when
 * the game says (`bake`): builds one BVH (three-mesh-bvh), finds which
 * large faces need subdividing (a quick pass of rays at their corners,
 * edges and centre: not a face wholly buried or wholly open), subdivides
 * those, casts each vertex's rays a slice at a time (so a pause is heard
 * between slices), smooths the result, and caches it. Replies carry new
 * geometry and bakes as transferable arrays, ready to upload.
 */
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Matrix3,
  Matrix4,
  Ray,
  Vector3,
} from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { createVertexAoJob } from './logic/ao-rays';
import type { CastFirst } from './logic/ao-rays';
import {
  geometryHash,
  needsDetail,
  raysFor,
  smoothVertexAo,
  spreadSubdivision,
  subdivideLongEdges,
} from './logic/ao-geometry';
import {
  MAX_LIGHTS,
  boundsOf,
  chooseOccluders,
  occludersNear,
  simpleVertexAo,
} from './logic/simple-ao';
import type { Box, SimpleAoScene } from './logic/simple-ao';
import { loadBake, storeBake } from './ao-cache';
import { unpackGeometry } from './ao-bake-protocol';
import type {
  BakeGeometryPayload,
  BakeMeshPayload,
  BakeReply,
  BakeRequest,
  BakeSettingsPayload,
  BakedMesh,
} from './ao-bake-protocol';

/** Rays a slice: a few milliseconds' work. */
const SLICE = 2000;
/** Within this, metres, most rays hitting means a vertex is buried. */
const BURY = 0.02;
/** Rays a sample point when deciding whether a face needs subdividing. */
const PROBE_RAYS = 16;

let paused = false;
let resume: (() => void) | null = null;

const post = (reply: BakeReply, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(reply, transfer);

/** Give way between slices: to messages, and while paused, until resumed. */
const calm = () =>
  paused
    ? new Promise<void>((done) => (resume = done))
    : new Promise<void>((done) => setTimeout(done, 0));

/** A mesh in world space, with its triangles as a soup in its own space. */
interface WorldMesh {
  source: BakeMeshPayload;
  /** World space, per vertex as given (indexed or not). */
  positions: Float32Array;
  normals: Float32Array;
  /** Its own scale: a metre's edge in its own units is `unit / scale`. */
  scale: number;
  matrix: Matrix4;
  normalMatrix: Matrix3;
  /** Half its world bounding box's diagonal, scene units. */
  radius: number;
  /** Too small to matter (a bolt): neither baked nor occluding. */
  tiny: boolean;
  /** Its world bounding box. */
  bounds: Box;
  /** Its surface area over its box's (how solidly it fills it). */
  fill: number;
  /** Marked never to occlude in a SIMPLE bake (cables, signs). */
  noOcclude: boolean;
}

/** Below this radius, metres, a mesh is left out; below `SMALL`, where it stands does not count. */
const TINY = 0.03;
/**
 * Small things (a gauge's needle, a flag, a pointer) may stand differently
 * from one visit to the next as the plant runs: where they stand is not
 * compared, so they never make a room's bake miss; their bake from an
 * earlier pose is near enough.
 */
const SMALL = 0.15;

/**
 * Whether two rooms' meshes stand alike: each matrix within 5 cm and a
 * small turn of the other's (a part moved a little), else the room has
 * changed and is baked again.
 */
function placedAlike(
  a: Float32Array | undefined,
  b: Float32Array,
  unit: number,
  /** Meshes whose place does not count (small things that move as the plant runs). */
  loose: readonly boolean[],
) {
  if (!a || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (loose[i >> 4]) continue;
    const tolerance =
      i % 16 >= 12 ? 0.05 * unit : 0.02 * Math.max(1, Math.abs(a[i]));
    if (Math.abs(a[i] - b[i]) > tolerance) return false;
  }
  return true;
}

interface Job {
  placements: Float32Array;
  id: number;
  roomId: string;
  hash: string;
  rays: number;
  settings: BakeSettingsPayload;
  meshes: WorldMesh[];
  triangles: number;
  prepareMs: number;
}

const jobs = new Map<number, Job>();

function toWorld(
  positions: Float32Array,
  normals: Float32Array,
  matrix: Matrix4,
  normalMatrix: Matrix3,
) {
  const p = new Float32Array(positions.length);
  const n = new Float32Array(normals.length);
  const v = new Vector3();
  for (let i = 0; i < positions.length; i += 3) {
    v.set(positions[i], positions[i + 1], positions[i + 2]).applyMatrix4(
      matrix,
    );
    p[i] = v.x;
    p[i + 1] = v.y;
    p[i + 2] = v.z;
    v.set(normals[i], normals[i + 1], normals[i + 2])
      .applyMatrix3(normalMatrix)
      .normalize();
    n[i] = v.x;
    n[i + 1] = v.y;
    n[i + 2] = v.z;
  }
  return { positions: p, normals: n };
}

/** Indexed arrays as a triangle soup, `size` floats a vertex. */
function expand(
  array: Float32Array,
  index: ArrayLike<number> | null,
  size: number,
) {
  if (!index) return array;
  const out = new Float32Array(index.length * size);
  for (let i = 0; i < index.length; i++)
    for (let k = 0; k < size; k++)
      out[i * size + k] = array[index[i] * size + k];
  return out;
}

async function prepare(message: Extract<BakeRequest, { type: 'prepare' }>) {
  const started = performance.now();
  const packed = message.meshes;
  const geometries = new Map<number, BakeGeometryPayload>();
  const meshes: WorldMesh[] = Array.from(packed.geometry, (g, i) => {
    let geometry = geometries.get(g);
    if (!geometry)
      geometries.set(g, (geometry = unpackGeometry(message.geometries, g)));
    const source: BakeMeshPayload = {
      ...geometry,
      matrix: packed.matrices.subarray(i * 16, i * 16 + 16),
      receiver: Boolean(packed.flags[i] & 1),
      subdivide: Boolean(packed.flags[i] & 2),
      twoSided: Boolean(packed.flags[i] & 4),
    };
    const matrix = new Matrix4().fromArray(source.matrix);
    const normalMatrix = new Matrix3().getNormalMatrix(matrix);
    const world = toWorld(
      source.positions,
      source.normals,
      matrix,
      normalMatrix,
    );
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < world.positions.length; i += 3)
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], world.positions[i + k]);
        hi[k] = Math.max(hi[k], world.positions[i + k]);
      }
    const radius =
      Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2 || 0;
    return {
      source,
      ...world,
      scale: matrix.getMaxScaleOnAxis(),
      matrix,
      normalMatrix,
      radius,
      tiny: radius < TINY * message.settings.unit,
      bounds: [lo[0], lo[1], lo[2], hi[0], hi[1], hi[2]] as Box,
      fill: fillOf(world.positions, source.index, lo, hi),
      noOcclude: Boolean(packed.flags[i] & 8),
    };
  });
  let triangles = 0;
  for (const m of meshes)
    triangles +=
      (m.source.index ? m.source.index.length : m.positions.length / 3) / 3;
  const rays = raysFor(triangles, message.settings.rays);
  const { distance, maxEdge, unit } = message.settings;
  // The key: the room and its meshes' shapes in their own space, not
  // where they stand, so a part that moves a little as the plant runs (a
  // float, a level, a needle) does not make the room miss; where each
  // stands is kept with the bake and compared (`placedAlike`).
  // SIMPLE bakes are kept under keys of their own (and their room's boxes
  // and lamps), so a ray-traced bake is never taken for one, nor one for it.
  const simple = message.settings.simple;
  const hash =
    message.roomId +
    ':' +
    (simple ? `simple1|${JSON.stringify(simple)}|` : '') +
    geometryHash(
      meshes
        .filter((m) => !m.tiny)
        .map((m) => ({
          positions: m.source.positions,
          normals: m.source.normals,
          index: m.source.index,
          receiver: m.source.receiver,
        })),
      { rays, distance, maxEdge, smooth: message.settings.smooth },
      unit,
    );
  const placements = packed.matrices;
  const job: Job = {
    id: message.id,
    roomId: message.roomId,
    hash,
    rays,
    settings: message.settings,
    meshes,
    triangles,
    prepareMs: 0,
    placements: placements.slice(),
  };
  const cached = message.fresh ? null : await loadBake(hash);
  if (
    cached &&
    placedAlike(
      cached.placements,
      placements,
      unit,
      meshes.map((m) => m.radius < SMALL * unit),
    )
  ) {
    const out = meshesFromCache(job, cached.ao, cached.masks);
    if (out) {
      job.prepareMs = performance.now() - started;
      return reply(job, out, true, 0, 0, 0);
    }
  }
  job.prepareMs = performance.now() - started;
  jobs.set(job.id, job);
  post({ type: 'missed', id: job.id, hash });
}

/** A receiver's own soup in its own space: positions, normals, uvs. */
function soupOf(m: WorldMesh) {
  const { positions, normals, uvs, index } = m.source;
  return {
    positions: expand(positions, index, 3),
    normals: expand(normals, index, 3),
    uvs: uvs ? expand(uvs, index, 2) : null,
  };
}

/** Rebuild the receivers' geometry from a cached bake's masks; null if it no longer fits. */
function meshesFromCache(
  job: Job,
  ao: Uint8Array[],
  masks: (Uint8Array | null)[],
): BakedMesh[] | null {
  const out: BakedMesh[] = [];
  let r = 0;
  for (const m of job.meshes) {
    if (!m.source.receiver) continue;
    const bake = ao[r];
    const mask = masks[r];
    r++;
    if (!bake) return null;
    if (m.tiny) {
      out.push({
        positions: null,
        normals: null,
        uvs: null,
        ao: bake,
        sphere: null,
      });
      continue;
    }
    if (m.source.subdivide && mask) {
      const soup = subdivideLongEdges(
        soupOf(m),
        (job.settings.maxEdge * job.settings.unit) / m.scale,
        400_000,
        mask,
      );
      if (soup.positions.length / 3 !== bake.length) return null;
      out.push({ ...soup, ao: bake, sphere: null });
    } else {
      if (m.positions.length / 3 !== bake.length) return null;
      out.push({
        positions: null,
        normals: null,
        uvs: null,
        ao: bake,
        sphere: null,
      });
    }
  }
  return out;
}

/** A bounding sphere of positions (x, y, z, radius): the box's centre, the farthest point. */
function sphereOf(positions: Float32Array) {
  if (!positions.length) return null;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], positions[i + k]);
      hi[k] = Math.max(hi[k], positions[i + k]);
    }
  const c = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2);
  let r2 = 0;
  for (let i = 0; i < positions.length; i += 3)
    r2 = Math.max(
      r2,
      (positions[i] - c[0]) ** 2 +
        (positions[i + 1] - c[1]) ** 2 +
        (positions[i + 2] - c[2]) ** 2,
    );
  return new Float32Array([c[0], c[1], c[2], Math.sqrt(r2)]);
}

function reply(
  job: Job,
  meshes: BakedMesh[],
  cached: boolean,
  bvhMs: number,
  bakeMs: number,
  rays: number,
) {
  const transfer: Transferable[] = [];
  let vertices = 0;
  let r = 0;
  for (const m of meshes) {
    // Its bounds, from the new geometry or its own.
    while (!job.meshes[r].source.receiver) r++;
    m.sphere = sphereOf(m.positions ?? job.meshes[r].source.positions);
    r++;
    if (m.sphere) transfer.push(m.sphere.buffer);
    vertices += m.ao.length;
    for (const a of [m.positions, m.normals, m.uvs, m.ao, m.starts])
      if (a) transfer.push(a.buffer);
  }
  const scene = simpleScene(job);
  const boxes = scene
    ? {
        interiors: scene.interiors.flatMap((b) => [...b]),
        occluders: scene.occluders.flatMap((b) => [...b]),
      }
    : undefined;
  post(
    {
      type: 'ready',
      id: job.id,
      hash: job.hash,
      cached,
      meshes,
      timings: {
        prepareMs: job.prepareMs,
        bvhMs,
        bakeMs,
        rays,
        triangles: job.triangles,
        vertices,
      },
      boxes,
    },
    transfer,
  );
}

/** Bake a job's vertices, a slice at a time; false if dropped meanwhile. */
async function run(
  job: Job,
  input: { positions: Float32Array; normals: Float32Array; twoSided?: boolean },
  rays: number,
  cast: CastFirst,
  bias: number,
  distance: number,
) {
  const vertexAo = createVertexAoJob(
    { ...input, rays, distance, bias, bury: (BURY * distance) / 1.5 },
    cast,
  );
  while (!vertexAo.step(SLICE)) {
    await calm();
    if (!jobs.has(job.id)) return null;
  }
  return {
    result: vertexAo.result,
    buried: vertexAo.buried,
    rays: vertexAo.raysCast,
  };
}

/**
 * A SIMPLE bake (`logic/simple-ao.ts`): no BVH, no rays. Large faces are
 * probed at their corners, edge midpoints and centre and subdivided where
 * the occlusion varies (near a junction), as for rays; then every vertex
 * is worked out from the room's boxes. Well under a second for a room.
 */
async function bakeSimple(job: Job, scene: SimpleAoScene, started: number) {
  const { unit, maxEdge } = job.settings;
  const out: BakedMesh[] = [];
  const bakes: Uint8Array[] = [];
  const masks: (Uint8Array | null)[] = [];
  let sliceFrom = performance.now();
  for (const m of job.meshes) {
    if (!m.source.receiver) continue;
    if (m.tiny) {
      const none = new Uint8Array(0);
      out.push({
        positions: null,
        normals: null,
        uvs: null,
        ao: none,
        sphere: null,
      });
      bakes.push(none);
      masks.push(null);
      continue;
    }
    const near = occludersNear(m.bounds, scene);
    if (!m.source.subdivide) {
      const ao = simpleVertexAo(m.positions, m.normals, scene, near);
      out.push({ positions: null, normals: null, uvs: null, ao, sphere: null });
      bakes.push(ao);
      masks.push(null);
    } else {
      const soup = soupOf(m);
      const edge = (maxEdge * unit) / m.scale;
      // A large face is subdivided wherever it comes within reach of the
      // room's planes or an occluder (a junction, a machine's foot), not by
      // probing its corners and middle, which miss what falls between them.
      const mask = facesNear(m, soup.positions, scene, near);
      const fine = subdivideLongEdges(soup, edge, 400_000, mask);
      const world = toWorld(
        fine.positions,
        fine.normals,
        m.matrix,
        m.normalMatrix,
      );
      const ao = simpleVertexAo(world.positions, world.normals, scene, near);
      out.push({ ...fine, ao, sphere: null });
      bakes.push(ao);
      masks.push(mask);
    }
    // Give way to messages now and then.
    if (performance.now() - sliceFrom > 8) {
      await calm();
      if (!jobs.has(job.id)) return;
      sliceFrom = performance.now();
    }
  }
  jobs.delete(job.id);
  const bakeMs = performance.now() - started;
  void storeBake({
    hash: job.hash,
    roomId: job.roomId,
    bytes:
      bakes.reduce((s, a) => s + a.byteLength, 0) +
      masks.reduce((s, a) => s + (a?.byteLength ?? 0), 0),
    lastUsed: Date.now(),
    ao: bakes.map((a) => a.slice()),
    masks,
    placements: job.placements,
  });
  reply(job, out, false, 0, bakeMs, 0);
}

/** Which of a soup's faces (own space) come within a SIMPLE bake's reach of its room's planes or occluders. */
function facesNear(
  m: WorldMesh,
  p: Float32Array,
  scene: SimpleAoScene,
  near: readonly Box[],
) {
  const reach = scene.look.radius * scene.unit;
  const mask = new Uint8Array(p.length / 9);
  // Only the room's own surfaces (walls, floors, ceilings: a mesh spanning
  // much of the room) need it; a machine's faces keep their own vertices.
  const b0 = m.bounds;
  const shell = scene.interiors.some((r) =>
    [0, 1, 2].some((i) => b0[i + 3] - b0[i] > 0.5 * (r[i + 3] - r[i])),
  );
  if (!shell) return mask;
  const v = new Vector3();
  const lo = [0, 0, 0];
  const hi = [0, 0, 0];
  for (let t = 0; t < mask.length; t++) {
    lo.fill(Infinity);
    hi.fill(-Infinity);
    for (let k = 0; k < 3; k++) {
      const o = t * 9 + k * 3;
      v.set(p[o], p[o + 1], p[o + 2]).applyMatrix4(m.matrix);
      const w = [v.x, v.y, v.z];
      for (let i = 0; i < 3; i++) {
        lo[i] = Math.min(lo[i], w[i]);
        hi[i] = Math.max(hi[i], w[i]);
      }
    }
    let close = false;
    for (const r of scene.interiors)
      for (let i = 0; i < 3 && !close; i++)
        if (lo[i] - r[i] < reach || r[i + 3] - hi[i] < reach) close = true;
    for (const b of near) {
      if (close) break;
      let overlaps = true;
      for (let i = 0; i < 3; i++)
        if (b[i] - reach > hi[i] || b[i + 3] + reach < lo[i]) overlaps = false;
      close = overlaps;
    }
    mask[t] = close ? 1 : 0;
  }
  return mask;
}

/** A mesh's surface area over its box's surface area. */
function fillOf(
  p: Float32Array,
  index: ArrayLike<number> | null,
  lo: number[],
  hi: number[],
) {
  const dx = hi[0] - lo[0];
  const dy = hi[1] - lo[1];
  const dz = hi[2] - lo[2];
  const box = 2 * (dx * dy + dy * dz + dz * dx);
  if (!(box > 0)) return 0;
  const count = index ? index.length : p.length / 3;
  let area = 0;
  for (let t = 0; t + 2 < count; t += 3) {
    const a = (index ? index[t] : t) * 3;
    const b = (index ? index[t + 1] : t + 1) * 3;
    const c = (index ? index[t + 2] : t + 2) * 3;
    const ux = p[b] - p[a];
    const uy = p[b + 1] - p[a + 1];
    const uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a];
    const vy = p[c + 1] - p[a + 1];
    const vz = p[c + 2] - p[a + 2];
    area +=
      Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }
  return area / box;
}

/** A room described for SIMPLE occlusion: its interiors, biggest solids and lamps. */
function simpleScene(job: Job): SimpleAoScene | null {
  const simple = job.settings.simple;
  if (!simple) return null;
  const { unit } = job.settings;
  const kept = job.meshes.filter((m) => !m.tiny);
  const solid = kept.map((m) => m.bounds);
  const interiors: Box[] = [];
  for (let i = 0; i + 5 < simple.interiors.length; i += 6)
    interiors.push(simple.interiors.slice(i, i + 6) as unknown as Box);
  // No plan: the shell's own bounds.
  if (!interiors.length) {
    const shell = boundsOf(solid);
    if (shell) interiors.push(shell);
  }
  return {
    interiors,
    occluders: chooseOccluders(
      kept.map((m) => ({
        box: m.bounds,
        fill: m.fill,
        excluded: m.noOcclude,
      })),
      interiors,
      unit,
    ),
    lights: simple.lights.slice(0, MAX_LIGHTS * 3),
    unit,
    look: simple.look,
  };
}

async function bake(job: Job) {
  const started = performance.now();
  const { unit, maxEdge } = job.settings;
  const distance = job.settings.distance * unit;
  const bias = 0.002 * unit;
  const scene = simpleScene(job);
  if (scene) return bakeSimple(job, scene, started);
  // Every mesh occludes: one BVH of all their triangles, in world space.
  const soups = job.meshes
    .filter((m) => !m.tiny)
    .map((m) => expand(m.positions, m.source.index, 3));
  const all = new Float32Array(soups.reduce((s, a) => s + a.length, 0));
  let at = 0;
  for (const soup of soups) {
    all.set(soup, at);
    at += soup.length;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(all, 3));
  const index = new Uint32Array(all.length / 3);
  for (let i = 0; i < index.length; i++) index[i] = i;
  geometry.setIndex(new BufferAttribute(index, 1));
  const bvh = new MeshBVH(geometry);
  const bvhMs = performance.now() - started;
  await calm();
  const ray = new Ray(new Vector3(), new Vector3());
  const cast: CastFirst = (ox, oy, oz, dx, dy, dz, far) => {
    ray.origin.set(ox, oy, oz);
    ray.direction.set(dx, dy, dz);
    // Hits nearer than the bias are surfaces the vertex lies on (a floor
    // meeting the wall it is on), not occluders.
    const hit = bvh.raycastFirst(ray, DoubleSide, bias, far);
    return hit ? hit.distance : null;
  };
  const out: BakedMesh[] = [];
  const bakes: Uint8Array[] = [];
  const masks: (Uint8Array | null)[] = [];
  let rays = 0;
  for (const m of job.meshes) {
    if (!m.source.receiver) continue;
    if (m.tiny) {
      // Left as it is: an empty bake.
      const none = new Uint8Array(0);
      out.push({
        positions: null,
        normals: null,
        uvs: null,
        ao: none,
        sphere: null,
      });
      bakes.push(none);
      masks.push(null);
      continue;
    }
    if (!m.source.subdivide) {
      // Its own vertices, as they are.
      const done = await run(
        job,
        {
          positions: m.positions,
          normals: m.normals,
          twoSided: m.source.twoSided,
        },
        job.rays,
        cast,
        bias,
        distance,
      );
      if (!done) return;
      rays += done.rays;
      // Buried vertices (within another part) left unoccluded.
      for (let i = 0; i < done.result.length; i++)
        if (done.buried[i]) done.result[i] = 255;
      out.push({
        positions: null,
        normals: null,
        uvs: null,
        ao: done.result,
        sphere: null,
      });
      bakes.push(done.result);
      masks.push(null);
      continue;
    }
    const soup = soupOf(m);
    const edge = (maxEdge * unit) / m.scale;
    // Which large faces need subdividing: rays from each one's corners,
    // edge midpoints and centre (world space), a face wholly buried or
    // wholly open is left whole.
    const count = soup.positions.length / 9;
    const mask = new Uint8Array(count);
    const big: number[] = [];
    const e2 = edge * edge;
    const p = soup.positions;
    for (let t = 0; t < count; t++) {
      const o = t * 9;
      const d = (a: number, b: number) =>
        (p[o + a] - p[o + b]) ** 2 +
        (p[o + a + 1] - p[o + b + 1]) ** 2 +
        (p[o + a + 2] - p[o + b + 2]) ** 2;
      if (!(d(0, 3) > e2 || d(3, 6) > e2 || d(6, 0) > e2)) continue;
      big.push(t);
    }
    if (big.length) {
      const samples = new Float32Array(big.length * 7 * 3);
      const sampleNormals = new Float32Array(big.length * 7 * 3);
      const v = new Vector3();
      const n = new Vector3();
      big.forEach((t, b) => {
        const o = t * 9;
        const corner = (k: number) =>
          new Vector3(p[o + k * 3], p[o + k * 3 + 1], p[o + k * 3 + 2]);
        const [c0, c1, c2] = [corner(0), corner(1), corner(2)];
        const points = [
          c0,
          c1,
          c2,
          c0.clone().add(c1).multiplyScalar(0.5),
          c1.clone().add(c2).multiplyScalar(0.5),
          c2.clone().add(c0).multiplyScalar(0.5),
          c0
            .clone()
            .add(c1)
            .add(c2)
            .multiplyScalar(1 / 3),
        ];
        n.set(0, 0, 0);
        for (let k = 0; k < 3; k++) n.x += soup.normals[o + k * 3];
        for (let k = 0; k < 3; k++) n.y += soup.normals[o + k * 3 + 1];
        for (let k = 0; k < 3; k++) n.z += soup.normals[o + k * 3 + 2];
        n.applyMatrix3(m.normalMatrix).normalize();
        points.forEach((point, k) => {
          v.copy(point).applyMatrix4(m.matrix);
          const s = (b * 7 + k) * 3;
          samples[s] = v.x;
          samples[s + 1] = v.y;
          samples[s + 2] = v.z;
          sampleNormals[s] = n.x;
          sampleNormals[s + 1] = n.y;
          sampleNormals[s + 2] = n.z;
        });
      });
      const probe = await run(
        job,
        {
          positions: samples,
          normals: sampleNormals,
          twoSided: m.source.twoSided,
        },
        PROBE_RAYS,
        cast,
        bias,
        distance,
      );
      if (!probe) return;
      rays += probe.rays;
      big.forEach((t, b) => {
        mask[t] = needsDetail(probe.result.subarray(b * 7, b * 7 + 7)) ? 1 : 0;
      });
      spreadSubdivision(soup.positions, soup.normals, mask, edge);
    }
    const fine = subdivideLongEdges(soup, edge, 400_000, mask);
    const world = toWorld(
      fine.positions,
      fine.normals,
      m.matrix,
      m.normalMatrix,
    );
    const done = await run(
      job,
      { ...world, twoSided: m.source.twoSided },
      job.rays,
      cast,
      bias,
      distance,
    );
    if (!done) return;
    rays += done.rays;
    // Smoothed (a clean look), or the rays' variation kept (grime), buried
    // vertices left unoccluded either way.
    const smooth = job.settings.smooth
      ? smoothVertexAo(world.positions, world.normals, done.result, done.buried)
      : done.result.map((v, i) => (done.buried[i] ? 255 : v));
    out.push({ ...fine, ao: smooth, sphere: null });
    bakes.push(smooth);
    masks.push(mask);
    await calm();
  }
  jobs.delete(job.id);
  const bakeMs = performance.now() - started;
  // Kept before the arrays go to the game (their buffers are transferred).
  void storeBake({
    hash: job.hash,
    roomId: job.roomId,
    bytes:
      bakes.reduce((s, a) => s + a.byteLength, 0) +
      masks.reduce((s, a) => s + (a?.byteLength ?? 0), 0),
    lastUsed: Date.now(),
    ao: bakes.map((a) => a.slice()),
    masks,
    placements: job.placements,
  });
  reply(job, out, false, bvhMs, bakeMs, rays);
}

self.addEventListener('message', (event: MessageEvent<BakeRequest>) => {
  const message = event.data;
  const fail = (id: number) => (error: unknown) =>
    post({ type: 'error', id, message: String(error) });
  if (message.type === 'prepare') prepare(message).catch(fail(message.id));
  else if (message.type === 'bake') {
    const job = jobs.get(message.id);
    if (job) bake(job).catch(fail(message.id));
    else post({ type: 'error', id: message.id, message: 'no such job' });
  } else if (message.type === 'drop') jobs.delete(message.id);
  else if (message.type === 'pause') paused = true;
  else if (message.type === 'resume') {
    paused = false;
    const go = resume;
    resume = null;
    go?.();
  }
});
