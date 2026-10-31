import { BoxGeometry, ExtrudeGeometry, Group, Mesh, Shape } from 'three';
import { createPs1Material } from '../../core/parts/ps1-material';
import { kitPaint } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';

/**
 * A 1990s office wall shelf's measurements, metres: twin-slot steel
 * uprights (25 × 16 mm channel, its slots at a 25 mm pitch) screwed to the
 * wall, a steel cantilever bracket hooked into each, and an 18 mm
 * beech-effect laminate board on them, as offices put up over a desk.
 */
export interface WallShelfSize {
  /** The board's length, depth and thickness. */
  w: number;
  d: number;
  t: number;
  /** The uprights' spacing, centre to centre, and their length. */
  centres: number;
  upright: number;
}

export const WALL_SHELF: WallShelfSize = {
  w: 1.15,
  d: 0.26,
  t: 0.018,
  centres: 0.8,
  upright: 0.7,
};

const UPRIGHT = { w: 0.025, d: 0.016 } as const;
/** The bracket's blade: its thickness, and its depth at the upright and at its tip. */
const BRACKET = { t: 0.012, root: 0.06, tip: 0.018 } as const;
/** Silver-grey stove enamel, the system's usual finish. */
const STEEL = '#a9adaf';

/** The uprights' slotted face: two columns of slots at a 25 mm pitch. */
function slottedFace(kit: PanelKit, length: number) {
  const pitch = 16;
  const w = 32;
  const h = Math.round((length / 0.025) * pitch);
  const { context, texture } = createCanvasTexture(w, h, 'printed');
  context.fillStyle = STEEL;
  context.fillRect(0, 0, w, h);
  context.fillStyle = '#2b2d2e';
  for (let y = pitch / 2; y < h - pitch / 2; y += pitch)
    for (const x of [7, 21]) context.fillRect(x, y - 5, 4, 10);
  texture.needsUpdate = true;
  kit.textures.push(texture);
  const material = createPs1Material({ map: texture, roughness: 0.5 });
  kit.materials.push(material);
  return material;
}

/**
 * The shelf, its back on the wall at z = 0, reaching out to +z; its origin
 * on the wall under the middle of the board, at the board's top: things
 * stood on it stand on y = 0. Set decoration, drawn once.
 */
export function createWallShelf(kit: PanelKit, size = WALL_SHELF) {
  const group = new Group();
  group.name = 'Wall shelf';
  const steel = kitPaint(kit, STEEL, 0.4);
  const face = slottedFace(kit, size.upright);
  // The uprights, from a little above the board down the wall.
  const top = 0.12;
  for (const side of [-1, 1]) {
    const upright = new Mesh(
      new BoxGeometry(UPRIGHT.w, size.upright, UPRIGHT.d),
      [steel, steel, steel, steel, face, steel],
    );
    upright.name = 'Twin-slot upright';
    upright.position.set(
      (side * size.centres) / 2,
      top - size.upright / 2,
      UPRIGHT.d / 2,
    );
    group.add(upright);
    // Its bracket: a tapered blade from the upright's face to the board's
    // front, its top under the board, a small lip turned up at its tip.
    const reach = size.d - UPRIGHT.d - 0.01;
    const profile = new Shape();
    profile.moveTo(0, 0);
    profile.lineTo(reach, 0);
    profile.lineTo(reach, -BRACKET.tip);
    profile.lineTo(0, -BRACKET.root);
    profile.closePath();
    const blade = new Mesh(
      new ExtrudeGeometry(profile, { depth: BRACKET.t, bevelEnabled: false }),
      steel,
    );
    blade.name = 'Cantilever bracket';
    // The profile's x outward from the wall (+z), its extrusion across.
    blade.geometry.translate(0, 0, -BRACKET.t / 2);
    blade.rotation.y = -Math.PI / 2;
    blade.position.set((side * size.centres) / 2, -size.t, UPRIGHT.d);
    group.add(blade);
    // The hooks at its root, into the upright's slots.
    const hook = new Mesh(
      new BoxGeometry(BRACKET.t, BRACKET.root + 0.03, 0.006),
      steel,
    );
    hook.position.set(
      (side * size.centres) / 2,
      -size.t - (BRACKET.root + 0.03) / 2 + 0.01,
      UPRIGHT.d + 0.003,
    );
    group.add(hook);
  }
  // The board: beech-effect laminate, its edges banded to match, its back
  // touching the uprights' faces.
  const board = new Mesh(new BoxGeometry(size.w, size.t, size.d - UPRIGHT.d), [
    kitPaint(kit, '#bf9f73'),
    kitPaint(kit, '#bf9f73'),
    kitPaint(kit, '#cdb084'),
    kitPaint(kit, '#a98d64'),
    kitPaint(kit, '#bb9b6f'),
    kitPaint(kit, '#a98d64'),
  ]);
  board.name = 'Shelf board';
  board.position.set(0, -size.t / 2, UPRIGHT.d + (size.d - UPRIGHT.d) / 2);
  group.add(board);
  return group;
}

/** The depth of the shelf's uprights: what stands on its board stands this far off the wall. */
export const WALL_SHELF_STANDOFF = UPRIGHT.d;
