import { BoxGeometry, InstancedMesh, Matrix4 } from 'three';
import type { BufferGeometry, Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SPECIMEN } from '../logic/museum-7-grout';

/**
 * Hall 7's specimen (107k): one model of a 450 mm tiled panel, nine white
 * 150 mm tiles with 3 mm joints, the grout's face tooled back from the
 * tiles', upright on a stone base. One geometry with three groups (tiles,
 * grout, base), so a material per group; its origin at the base's
 * underside, the tiles facing +z.
 */
export function groutSpecimenGeometry(): BufferGeometry {
  const { size, tiles, joint, tileThick, recess } = SPECIMEN;
  const base = 0.06;
  const pitch = size / tiles;
  const tile = pitch - joint;
  const tileParts: BufferGeometry[] = [];
  for (let i = 0; i < tiles; i++)
    for (let j = 0; j < tiles; j++) {
      const g = new BoxGeometry(tile, tile, tileThick);
      g.translate(
        (i - (tiles - 1) / 2) * pitch,
        base + (j + 0.5) * pitch,
        tileThick / 2,
      );
      tileParts.push(g);
    }
  // The bed of grout behind and between: its face just short of the tiles'.
  const grout = new BoxGeometry(size, size, tileThick - recess + 0.01);
  grout.translate(0, base + size / 2, (tileThick - recess - 0.01) / 2);
  const stone = new BoxGeometry(size + 0.05, base, 0.12);
  stone.translate(0, base / 2, 0);
  const merged = mergeGeometries(
    [
      mergeGeometries(tileParts.map((g) => g.toNonIndexed())),
      grout.toNonIndexed(),
      stone.toNonIndexed(),
    ],
    true,
  );
  for (const g of [...tileParts, grout, stone]) g.dispose();
  return merged;
}

/**
 * The specimens, instanced: one `InstancedMesh` for each grout colour in
 * use (grey for most, the 1970s' avocado, the furan's black), the same
 * geometry and the same tile and base materials, only the grout's differs.
 */
export function createGroutSpecimens<C extends string>(
  placements: readonly { matrix: Matrix4; grout: C }[],
  materials: { tile: Material; stone: Material; grout: Record<C, Material> },
) {
  const geometry = groutSpecimenGeometry();
  const meshes = {} as Record<C, InstancedMesh>;
  for (const colour of Object.keys(materials.grout) as C[]) {
    const at = placements.filter((p) => p.grout === colour);
    if (!at.length) continue;
    const mesh = new InstancedMesh(
      geometry,
      [materials.tile, materials.grout[colour], materials.stone],
      at.length,
    );
    at.forEach((p, k) => mesh.setMatrixAt(k, p.matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.name = `Grout specimens: ${colour}`;
    meshes[colour] = mesh;
  }
  return { geometry, meshes };
}
