import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Object3D } from 'three';

/** A sealed wall batten after the proportions of Thorn's Aquaforce Pro. */
export function createWallBattenMaterials() {
  return {
    housing: new MeshStandardMaterial({
      color: '#d8ddda',
      metalness: 0.08,
      roughness: 0.6,
    }),
    diffuser: new MeshStandardMaterial({
      color: '#f3f7f4',
      emissive: '#e7f5f0',
      emissiveIntensity: 0.95,
      roughness: 0.8,
    }),
    end: new MeshStandardMaterial({
      color: '#8c999b',
      metalness: 0.18,
      roughness: 0.52,
    }),
    clip: new MeshStandardMaterial({
      color: '#526267',
      metalness: 0.65,
      roughness: 0.4,
    }),
  };
}

export type WallBattenMaterials = ReturnType<typeof createWallBattenMaterials>;

export function addWallBatten(
  parent: Object3D,
  materials: WallBattenMaterials,
  x: number,
  y: number,
  z: number,
  along: 'x' | 'z',
  face: -1 | 1 = 1,
  length = 1.35,
) {
  const fixture = new Group();
  fixture.name = 'sealed wall luminaire';
  fixture.position.set(x, y, z);
  fixture.rotation.y =
    along === 'x'
      ? face === 1
        ? 0
        : Math.PI
      : face === 1
        ? Math.PI / 2
        : -Math.PI / 2;
  parent.add(fixture);
  const add = (
    name: string,
    material: MeshStandardMaterial,
    geometry: BoxGeometry | RoundedBoxGeometry,
    at: [number, number, number],
  ) => {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...at);
    mesh.raycast = () => {};
    fixture.add(mesh);
  };

  // The casing and caps meet at their edges; no coplanar end faces overlap.
  add(
    'luminaire casing',
    materials.housing,
    new RoundedBoxGeometry(length - 0.07, 0.075, 0.08, 3, 0.014),
    [0, 0, 0],
  );
  add(
    'opal diffuser',
    materials.diffuser,
    new RoundedBoxGeometry(length - 0.12, 0.056, 0.032, 3, 0.013),
    [0, 0, 0.055],
  );
  for (const sign of [-1, 1])
    add(
      'flush moulded end cap',
      materials.end,
      new RoundedBoxGeometry(0.035, 0.078, 0.086, 3, 0.009),
      [sign * (length / 2 - 0.0175), 0, 0],
    );
  for (const at of [-length * 0.28, length * 0.28]) {
    add(
      'lens retaining clip',
      materials.clip,
      new RoundedBoxGeometry(0.022, 0.072, 0.01, 2, 0.004),
      [at, 0, 0.077],
    );
    add('wall bracket', materials.end, new BoxGeometry(0.055, 0.055, 0.065), [
      at,
      0,
      -0.069,
    ]);
  }
  return fixture;
}
