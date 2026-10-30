/** Messages between the game and the ambient occlusion baker's worker (`ao-bake.worker.ts`). */

export interface BakeMeshPayload {
  /** World space, scene units. */
  positions: Float32Array;
  normals: Float32Array;
  index?: Uint32Array | null;
  /** Whether it takes a bake; every mesh occludes. */
  receiver: boolean;
}

export type BakeRequest =
  | {
      type: 'bake';
      id: number;
      meshes: BakeMeshPayload[];
      /** Distance and bias in scene units. */
      settings: { rays: number; distance: number; bias: number };
    }
  | { type: 'cancel'; id: number }
  | { type: 'pause' }
  | { type: 'resume' };

export type BakeReply =
  | {
      type: 'done';
      id: number;
      /** One byte a vertex, per receiving mesh in the order sent. */
      ao: Uint8Array[];
      ms: number;
      bvhMs: number;
      rays: number;
      triangles: number;
    }
  | { type: 'error'; id: number; message: string };
