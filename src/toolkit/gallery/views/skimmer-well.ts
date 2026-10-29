import {
  AdditiveBlending,
  AlwaysStencilFunc,
  BackSide,
  CircleGeometry,
  CylinderGeometry,
  EqualStencilFunc,
  Group,
  KeepStencilOp,
  Mesh,
  MeshBasicMaterial,
  ReplaceStencilOp,
  RingGeometry,
  TorusGeometry,
  BoxGeometry,
} from 'three';
import type { Material, Object3D } from 'three';
import { createPs1Material } from '../../components/core/parts/ps1-material';

/**
 * A skimmer's mouth as a hole in a flat deck (dev53, the owner,
 * 2026-10-29), with no hole cut: the opening is drawn into the stencil
 * buffer, then the well's inside (its walls, its floor, the basket) is
 * painted over the deck in layers, deepest first, only where the opening
 * is seen. Nothing inside tests depth, so nothing inside needs the deck
 * to be open; the lid, drawn after (`drawOver`), sits over it all.
 * Metres; the deck at y 0.
 */

/** The stencil value the opening writes; portals use 1. */
const STENCIL = 2;
/** Layers, in the order drawn: the opening's mask, then the inside, deepest first. */
const MASK = 1;
const WALLS = 2;
const FLOOR = 3;
const BASKET = 4;
/** What comes after the inside: the lid. */
export const OVER_WELL = 6;

export interface SkimmerWellOptions {
  /** The opening's radius, and the collar's round it, metres. */
  radius?: number;
  collar?: number;
  depth?: number;
  /** The collar's colour (the maker's white), the inside's, the floor's and the basket's. */
  colours?: { collar: string; inside: string; floor: string; basket: string };
  glow?: string;
}

/** Painted inside the opening only, in layer `order`, regardless of depth. */
function inside(material: Material, order: number, mesh: Mesh) {
  material.depthTest = false;
  material.depthWrite = false;
  material.stencilWrite = true;
  material.stencilRef = STENCIL;
  material.stencilFunc = EqualStencilFunc;
  material.stencilFail = KeepStencilOp;
  material.stencilZFail = KeepStencilOp;
  material.stencilZPass = KeepStencilOp;
  mesh.renderOrder = order;
  return mesh;
}

export function createSkimmerWell(options: SkimmerWellOptions = {}) {
  const {
    radius = 0.13,
    collar = 0.155,
    depth = 0.24,
    colours = {
      collar: '#f2f1ec',
      inside: '#c9ccc8',
      floor: '#4a5254',
      basket: '#8a9498',
    },
    glow = '#ffc44a',
  } = options;
  const group = new Group();
  group.name = 'Skimmer well';
  const materials: Material[] = [];
  const own = <M extends Material>(m: M) => {
    materials.push(m);
    return m;
  };

  // The collar, flat on the deck round the opening.
  const ring = new Mesh(
    new RingGeometry(radius, collar, 48),
    own(createPs1Material({ color: colours.collar, roughness: 0.45 })),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.002;
  group.add(ring);

  // The opening, into the stencil only, where it is seen (it tests depth,
  // so whatever stands before it hides the hole).
  const maskMaterial = own(
    new MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -4,
    }),
  );
  maskMaterial.stencilWrite = true;
  maskMaterial.stencilRef = STENCIL;
  maskMaterial.stencilFunc = AlwaysStencilFunc;
  maskMaterial.stencilZPass = ReplaceStencilOp;
  const mask = new Mesh(new CircleGeometry(radius, 48), maskMaterial);
  mask.rotation.x = -Math.PI / 2;
  mask.position.y = 0.001;
  mask.renderOrder = MASK;
  group.add(mask);

  // The walls, seen from within: only the far side faces the eye.
  const wallMaterial = own(
    createPs1Material({ color: colours.inside, roughness: 0.6 }),
  );
  wallMaterial.side = BackSide;
  const walls = inside(
    wallMaterial,
    WALLS,
    new Mesh(
      new CylinderGeometry(radius, radius * 0.92, depth, 48, 1, true),
      wallMaterial,
    ),
  );
  walls.position.y = -depth / 2;
  group.add(walls);
  const floorMaterial = own(
    createPs1Material({ color: colours.floor, roughness: 0.9 }),
  );
  const floor = inside(
    floorMaterial,
    FLOOR,
    new Mesh(new CircleGeometry(radius * 0.92, 48), floorMaterial),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -depth;
  group.add(floor);

  // The glow on its floor, under the caustics.
  const glowMaterial = own(
    new MeshBasicMaterial({
      color: glow,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
    }),
  );
  const shine = inside(
    glowMaterial,
    BASKET,
    new Mesh(new CircleGeometry(radius * 0.9, 48), glowMaterial),
  );
  shine.rotation.x = -Math.PI / 2;
  shine.position.y = -depth + 0.002;
  group.add(shine);

  // The basket's rim and handle, a little way down.
  const basketMaterial = own(
    createPs1Material({ color: colours.basket, roughness: 0.6 }),
  );
  const rim = inside(
    basketMaterial,
    BASKET,
    new Mesh(new TorusGeometry(radius * 0.8, 0.005, 6, 40), basketMaterial),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.05;
  group.add(rim);
  const handle = inside(
    basketMaterial,
    BASKET,
    new Mesh(new BoxGeometry(radius * 1.6, 0.008, 0.01), basketMaterial),
  );
  handle.position.y = -0.045;
  group.add(handle);

  return {
    group,
    /** The glow on the well's floor, 0–1. */
    glow(level: number) {
      glowMaterial.opacity = 0.6 * level;
      shine.visible = level > 0;
    },
    dispose() {
      group.traverse((o) => (o as Mesh).geometry?.dispose());
      for (const m of materials) m.dispose();
    },
  };
}

/** Draw `object` after the well's inside, so the inside never paints over it. */
export function drawOver(object: Object3D) {
  object.traverse((o) => {
    o.renderOrder = OVER_WELL;
  });
}
