import { describe, expect, it } from 'vite-plus/test';
import { Matrix4, MeshBasicMaterial } from 'three';
import { createGroutSpecimens } from './grout-specimen';
import { PLINTHS, plinthX } from '../logic/museum-7-grout';

describe('Hall 7 grout specimens', () => {
  const materials = {
    tile: new MeshBasicMaterial(),
    grout: new MeshBasicMaterial(),
    avocado: new MeshBasicMaterial(),
    stone: new MeshBasicMaterial(),
  };
  const built = createGroutSpecimens(
    PLINTHS.map((p) => ({
      matrix: new Matrix4().makeTranslation(plinthX(p.n), 1.15, 3.6),
      coloured: p.grout === 'avocado',
    })),
    materials,
  );

  it('draws ten from one geometry: nine grey, one avocado', () => {
    expect(built.grey.count).toBe(9);
    expect(built.avocado.count).toBe(1);
    expect(built.grey.geometry).toBe(built.avocado.geometry);
  });

  it('differs only in the grout', () => {
    const g = built.grey.material as unknown[];
    const a = built.avocado.material as unknown[];
    expect(g[0]).toBe(a[0]);
    expect(g[2]).toBe(a[2]);
    expect(g[1]).toBe(materials.grout);
    expect(a[1]).toBe(materials.avocado);
  });

  it('has three groups: tiles, grout, base', () => {
    expect(built.geometry.groups.map((x) => x.materialIndex)).toEqual([
      0, 1, 2,
    ]);
  });
});
