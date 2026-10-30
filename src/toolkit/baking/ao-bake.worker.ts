/**
 * The ambient occlusion baker's worker: one room at a time, its static
 * meshes made into one BVH (three-mesh-bvh), then each receiving mesh's
 * vertices baked by casting rays, a slice of about `SLICE` rays at a time
 * so a pause or a cancel is heard between slices.
 */
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Ray,
  Vector3,
} from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { createVertexAoJob } from './logic/ao-rays';
import type { BakeRequest, BakeReply } from './ao-bake-protocol';

/** Rays a slice: a few milliseconds' work. */
const SLICE = 2000;

let paused = false;
let current: { id: number; cancelled: boolean } | null = null;
let resume: (() => void) | null = null;

const post = (reply: BakeReply, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(reply, transfer);

const expand = (
  array: Float32Array,
  index: ArrayLike<number> | null | undefined,
) => {
  if (!index) return array;
  const out = new Float32Array(index.length * 3);
  for (let i = 0; i < index.length; i++) {
    const j = index[i] * 3;
    out[i * 3] = array[j];
    out[i * 3 + 1] = array[j + 1];
    out[i * 3 + 2] = array[j + 2];
  }
  return out;
};

const calm = () =>
  paused
    ? new Promise<void>((done) => (resume = done))
    : new Promise<void>((done) => setTimeout(done, 0));

async function bake(request: Extract<BakeRequest, { type: 'bake' }>) {
  const started = performance.now();
  const job = { id: request.id, cancelled: false };
  current = job;
  // Every mesh occludes: one geometry of all their triangles.
  let total = 0;
  for (const m of request.meshes)
    total += m.index ? m.index.length * 3 : m.positions.length;
  const all = new Float32Array(total);
  let at = 0;
  for (const m of request.meshes) {
    const flat = expand(m.positions, m.index);
    all.set(flat, at);
    at += flat.length;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(all, 3));
  const index = new Uint32Array(total / 3);
  for (let i = 0; i < index.length; i++) index[i] = i;
  geometry.setIndex(new BufferAttribute(index, 1));
  const bvh = new MeshBVH(geometry);
  const bvhMs = performance.now() - started;
  const near = request.settings.bias;
  const ray = new Ray(new Vector3(), new Vector3());
  const cast = (
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    far: number,
  ) => {
    ray.origin.set(ox, oy, oz);
    ray.direction.set(dx, dy, dz);
    // Hits nearer than the bias are surfaces the vertex lies on (a floor
    // meeting the wall it is on), not occluders.
    const hit = bvh.raycastFirst(ray, DoubleSide, near, far);
    return hit ? hit.distance : null;
  };
  const results: Uint8Array[] = [];
  let rays = 0;
  for (const m of request.meshes) {
    if (!m.receiver) continue;
    const vertexAo = createVertexAoJob(
      {
        positions: m.positions,
        normals: m.normals,
        rays: request.settings.rays,
        distance: request.settings.distance,
        bias: request.settings.bias,
      },
      cast,
    );
    while (!vertexAo.step(SLICE)) {
      await calm();
      if (job.cancelled) return;
    }
    rays += vertexAo.raysCast;
    results.push(vertexAo.result);
    await calm();
    if (job.cancelled) return;
  }
  current = null;
  post(
    {
      type: 'done',
      id: request.id,
      ao: results,
      ms: performance.now() - started,
      bvhMs,
      rays,
      triangles: total / 9,
    },
    results.map((r) => r.buffer),
  );
}

self.addEventListener('message', (event: MessageEvent<BakeRequest>) => {
  const message = event.data;
  if (message.type === 'bake')
    bake(message).catch((error: unknown) => {
      current = null;
      post({ type: 'error', id: message.id, message: String(error) });
    });
  else if (message.type === 'cancel') {
    if (current?.id === message.id) current.cancelled = true;
    current = null;
  } else if (message.type === 'pause') paused = true;
  else if (message.type === 'resume') {
    paused = false;
    const go = resume;
    resume = null;
    go?.();
  }
});
