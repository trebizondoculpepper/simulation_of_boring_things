import {
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import type { BufferGeometry, Material } from 'three';

/** How big a tile is, metres, when instances are split up for culling. */
export const TILE = 15;

/**
 * Build instanced meshes of `geometry` in `material` at `matrices`, split
 * into square tiles `tile` metres across by where each copy stands, so a
 * tile out of view is not drawn at all (each tile's bounding sphere is
 * its own). A copy that spans many tiles (a long duct) belongs to the
 * tile its middle is in, and its tile's sphere grows to cover it.
 * Returns the meshes, already added to `group`.
 */
export function buildTiled(
  group: Group,
  geometry: BufferGeometry,
  material: Material,
  matrices: Matrix4[],
  tile = TILE,
) {
  const tiles = new Map<string, Matrix4[]>();
  const at = new Vector3();
  for (const m of matrices) {
    at.setFromMatrixPosition(m);
    const key = `${Math.floor(at.x / tile)},${Math.floor(at.z / tile)}`;
    let list = tiles.get(key);
    if (!list) tiles.set(key, (list = []));
    list.push(m);
  }
  const meshes: InstancedMesh[] = [];
  for (const list of tiles.values()) {
    const mesh = new InstancedMesh(geometry, material, list.length);
    list.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
}

/**
 * Collects copies of a few parts (a geometry with a material each) by
 * transform, and builds them as instanced meshes, tiled for culling:
 * hundreds of duct sections or floor stripes in a handful of draw calls.
 */
export function createInstancer() {
  const parts: {
    geometry: BufferGeometry;
    material: Material;
    matrices: Matrix4[];
    /** A fine detail, hidden at a distance (see detail-culling.ts). */
    detail?: number;
  }[] = [];
  const euler = new Euler();
  const q = new Quaternion();
  const built: { mesh: InstancedMesh; detail?: number }[] = [];
  return {
    /**
     * Declare a part; `put` places copies of it. `detail`, if given, is
     * the distance in metres beyond which its copies are not drawn.
     */
    part(geometry: BufferGeometry, material: Material, detail?: number) {
      const entry = { geometry, material, matrices: [] as Matrix4[], detail };
      parts.push(entry);
      return entry;
    },
    /** A copy of `entry` at (x, y, z), turned (rx, ry, rz) and scaled (sx, sy, sz). */
    put(
      entry: { matrices: Matrix4[] },
      x: number,
      y: number,
      z: number,
      sx = 1,
      sy = 1,
      sz = 1,
      rx = 0,
      ry = 0,
      rz = 0,
    ) {
      q.setFromEuler(euler.set(rx, ry, rz, 'YXZ'));
      entry.matrices.push(
        new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz)),
      );
    },
    build(group: Group) {
      for (const entry of parts) {
        if (!entry.matrices.length) continue;
        for (const mesh of buildTiled(
          group,
          entry.geometry,
          entry.material,
          entry.matrices,
        ))
          built.push({ mesh, detail: entry.detail });
      }
    },
    /** The meshes built, and the distance beyond which each is a hidden detail. */
    built: () => built,
    dispose() {
      for (const entry of parts) entry.geometry.dispose();
    },
  };
}
