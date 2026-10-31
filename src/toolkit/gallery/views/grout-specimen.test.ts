import { describe, expect, it } from 'vite-plus/test';
import { Matrix4, MeshBasicMaterial } from 'three';
import { createGroutSpecimens } from './grout-specimen';
import { PLACES, PLINTHS } from '../logic/museum-7-grout';

describe('Hall 7 grout specimens', () => {
  const materials = {
    tile: new MeshBasicMaterial(),
    stone: new MeshBasicMaterial(),
    grout: {
      grey: new MeshBasicMaterial(),
      avocado: new MeshBasicMaterial(),
      black: new MeshBasicMaterial(),
    },
  };
  const built = createGroutSpecimens(
    PLINTHS.map((p) => ({
      matrix: new Matrix4().makeTranslation(PLACES[p.n].x, 1.15, PLACES[p.n].z),
      grout: p.grout,
    })),
    materials,
  );

  it('draws ten from one geometry: eight grey, one avocado, one black', () => {
    expect(built.meshes.grey.count).toBe(8);
    expect(built.meshes.avocado.count).toBe(1);
    expect(built.meshes.black.count).toBe(1);
    expect(built.meshes.grey.geometry).toBe(built.meshes.black.geometry);
  });

  it('differs only in the grout', () => {
    const g = built.meshes.grey.material as unknown[];
    const b = built.meshes.black.material as unknown[];
    expect(g[0]).toBe(b[0]);
    expect(g[2]).toBe(b[2]);
    expect(g[1]).toBe(materials.grout.grey);
    expect(b[1]).toBe(materials.grout.black);
  });

  it('has three groups: tiles, grout, base', () => {
    expect(built.geometry.groups.map((x) => x.materialIndex)).toEqual([
      0, 1, 2,
    ]);
  });
});
