import type { Material, Object3D } from 'three';
import type { tools } from '../../core/views/fitting-tools';

/**
 * The standard pieces of the game's steel doorsets (Ironside): the frame
 * round an opening, and the furniture on a leaf. A door that is pulled
 * open has a pull handle on that side, and a push plate on the other,
 * where it is pushed. Metres; each in its parent's frame, a leaf's face
 * at z = 0 facing +z unless `side` turns it to face −z.
 */

type Tools = ReturnType<typeof tools>;

/**
 * A pressed steel frame all round an opening `w` × `h` (its middle at
 * x = 0, its sill on the floor): two jambs, a head, and a sill the leaf
 * closes onto, `f` across and `depth` through the wall, behind z = 0.
 */
export function doorFrame(
  t: Tools,
  parent: Object3D,
  material: Material,
  w: number,
  h: number,
  f = 0.05,
  depth = 0.12,
) {
  const back = 0.02 - depth / 2;
  for (const x of [-w / 2 - f / 2, w / 2 + f / 2])
    t.box(parent, material, f, h + 2 * f, depth, x, h / 2 + f, back);
  t.box(parent, material, w + 2 * f, f, depth, 0, h + f * 1.5, back);
  t.box(parent, material, w + 2 * f, f, depth, 0, f / 2, back);
}

/**
 * A stainless D pull handle, upright, 425 mm between centres on two
 * stand-offs, at (x, y) on a face at z = `face`, facing `side`.
 */
export function pullHandle(
  t: Tools,
  parent: Object3D,
  steel: Material,
  x: number,
  y: number,
  face = 0,
  side: 1 | -1 = 1,
) {
  t.cyl(parent, steel, 0.014, 0.48, x, y, face + side * 0.065, 'y', 12);
  for (const dy of [-0.2125, 0.2125])
    t.cyl(parent, steel, 0.009, 0.065, x, y + dy, face + side * 0.033, 'z', 8);
}

/**
 * A stainless push plate, 100 × 300 mm, upright, at (x, y) on a face at
 * z = `face`, facing `side`: where a door is pushed.
 */
export function pushPlate(
  t: Tools,
  parent: Object3D,
  steel: Material,
  x: number,
  y: number,
  face = 0,
  side: 1 | -1 = 1,
) {
  t.box(parent, steel, 0.1, 0.3, 0.0015, x, y, face + side * 0.001);
}

/** A stainless kick plate along a leaf's foot, `w` wide, on a face. */
export function kickPlate(
  t: Tools,
  parent: Object3D,
  steel: Material,
  w: number,
  x: number,
  face = 0,
  side: 1 | -1 = 1,
) {
  t.box(parent, steel, w - 0.04, 0.25, 0.003, x, 0.15, face + side * 0.0015);
}
