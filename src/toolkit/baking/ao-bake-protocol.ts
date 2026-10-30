/**
 * Messages between the game and the ambient occlusion baker's worker
 * (`ao-bake.worker.ts`). The game only gathers each static mesh's own
 * arrays and its world matrix and hands them over; everything else (the
 * world transform, the hash, the cache, subdividing, the BVH, the rays,
 * smoothing) is the worker's (the owner, 2026-10-30: nothing on the main
 * thread beyond handing over buffers).
 */

/** A geometry's own arrays, in its own space: handed over once however many meshes share it. */
export interface BakeGeometryPayload {
  positions: Float32Array;
  normals: Float32Array;
  /** Its uvs, carried through subdivision. */
  uvs: Float32Array | null;
  index: Uint32Array | Uint16Array | null;
}

/** A static mesh: its geometry (by number), where it stands, what it does. */
export interface BakeMeshRef {
  geometry: number;
  /** Its world matrix, column-major. */
  matrix: Float32Array;
  /** Whether it takes a bake; every mesh occludes. */
  receiver: boolean;
  /** Whether its large faces may be subdivided (only positions, normals and uvs to carry). */
  subdivide: boolean;
  /** Whether it is seen from both sides. */
  twoSided?: boolean;
}

/**
 * Every geometry packed into a few arrays, so handing them over is a
 * handful of transfers, not thousands: per geometry, `offsets` holds its
 * first float and float count in `positions` (and `normals`), its first uv
 * float (-1 if none), and its first index and index count (-1 if none).
 */
export interface PackedGeometries {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  index: Uint32Array;
  offsets: Int32Array;
}
export const GEOMETRY_STRIDE = 5;

/** Every mesh packed likewise: its geometry, flags (1 receiver, 2 subdivide, 4 seen from both sides) and world matrix (16 floats). */
export interface PackedMeshes {
  geometry: Int32Array;
  flags: Uint8Array;
  matrices: Float32Array;
}

/** Unpack geometry `g` (views into the packed arrays, nothing copied). */
export function unpackGeometry(
  packed: PackedGeometries,
  g: number,
): BakeGeometryPayload {
  const o = packed.offsets.subarray(
    g * GEOMETRY_STRIDE,
    g * GEOMETRY_STRIDE + GEOMETRY_STRIDE,
  );
  const [start, count, uv, indexStart, indexCount] = o;
  return {
    positions: packed.positions.subarray(start, start + count),
    normals: packed.normals.subarray(start, start + count),
    uvs: uv >= 0 ? packed.uvs.subarray(uv, uv + (count / 3) * 2) : null,
    index:
      indexStart >= 0
        ? packed.index.subarray(indexStart, indexStart + indexCount)
        : null,
  };
}

/** A mesh with its geometry, as the worker uses it. */
export type BakeMeshPayload = BakeGeometryPayload &
  Omit<BakeMeshRef, 'geometry'>;

/** One receiver's result: new geometry if it was subdivided, its bake either way. */
export interface BakedMesh {
  positions: Float32Array | null;
  normals: Float32Array | null;
  uvs: Float32Array | null;
  /** One byte a vertex (of the new geometry, if any, else of its own). */
  ao: Uint8Array;
  /** Where each original triangle's pieces begin, if subdivided (to carry material groups across). */
  starts?: Uint32Array | null;
  /** Its bounding sphere in its own space (centre, radius), worked out here so the game need not. */
  sphere: Float32Array | null;
}

export interface BakeSettingsPayload {
  /** Reach and longest kept edge, metres; scene units a metre. */
  distance: number;
  maxEdge: number;
  unit: number;
  /** Rays a vertex at most (big rooms take fewer). */
  rays: number;
  /** One smoothing pass, or the variation left in. */
  smooth: boolean;
}

export type BakeRequest =
  | {
      /** Hash, and look in the cache: answered `ready` (a hit) or `missed`. */
      type: 'prepare';
      id: number;
      roomId: string;
      geometries: PackedGeometries;
      meshes: PackedMeshes;
      settings: BakeSettingsPayload;
      /** Bake again even if cached. */
      fresh: boolean;
    }
  /** Bake a prepared job that missed. */
  | { type: 'bake'; id: number }
  /** Forget a prepared job. */
  | { type: 'drop'; id: number }
  | { type: 'pause' }
  | { type: 'resume' };

export interface BakeTimings {
  /** Worker time, ms: hashing and the cache, the BVH, the rays, subdividing. */
  prepareMs: number;
  bvhMs: number;
  bakeMs: number;
  rays: number;
  triangles: number;
  vertices: number;
}

export type BakeReply =
  | { type: 'missed'; id: number; hash: string }
  | {
      type: 'ready';
      id: number;
      hash: string;
      cached: boolean;
      meshes: BakedMesh[];
      timings: BakeTimings;
    }
  | { type: 'error'; id: number; message: string };
