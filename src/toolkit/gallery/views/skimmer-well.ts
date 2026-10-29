import {
  AdditiveBlending,
  AlwaysStencilFunc,
  BackSide,
  CircleGeometry,
  CylinderGeometry,
  EqualStencilFunc,
  Group,
  IncrementStencilOp,
  KeepStencilOp,
  LessEqualStencilFunc,
  Mesh,
  MeshBasicMaterial,
  ReplaceStencilOp,
  RingGeometry,
  TorusGeometry,
  PlaneGeometry,
  BoxGeometry,
} from 'three';
import type { Material, Object3D } from 'three';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import { createCanvasTexture } from '../../components/core/views/screens';

/**
 * A skimmer's mouth as a hole in a flat deck (dev53, the owner,
 * 2026-10-29), with no hole cut: the opening is drawn into the stencil
 * buffer, then the well's inside (its walls, its floor, the basket) is
 * painted over the deck in layers, deepest first, only where the opening
 * is seen. Nothing inside tests depth, so nothing inside needs the deck
 * to be open; the lid, drawn after (`drawOver`), sits over it all. The
 * throat, where the pool's water comes in over the weir flap, is cut into
 * the well's wall on its −z side: turn the group so −z faces the pool.
 * Metres; the deck at y 0.
 */

/** The stencil value the opening writes (portals use 1), and the throat's mouth within it. */
const STENCIL = 2;
const MOUTH = 3;
/** Layers, in the order drawn: the opening's mask, a backstop, then the inside, deepest first. */
const MASK = 1;
const BACKSTOP = 1.5;
const WALLS = 2;
/** The throat in the wall: its mouth's mask, its duct, the weir at its far end, the frame round its mouth. */
const MOUTH_MASK = 2.05;
const THROAT = 2.2;
const WEIR = 2.25;
const LIP = 2.3;
const FLOOR = 3;
/** The ledge the basket sits on, then the basket: its far inside, its floor, the glow, its near outside, its rim. */
const LEDGE = 3.5;
const BASKET_FAR = 4;
const BASKET_FLOOR = 4.1;
const GLOW = 4.15;
const BASKET_NEAR = 4.2;
const BASKET_RIM = 4.3;
const BASKET_MARK = 4.35;
/** What comes after the inside: the lid. */
export const OVER_WELL = 6;

export interface SkimmerWellOptions {
  /** The opening's radius, and the collar's round it, metres. */
  radius?: number;
  collar?: number;
  depth?: number;
  /** How far the throat runs back under the deck toward the pool, metres: to under its water, so its end is never seen. */
  reach?: number;
  /** The collar's colour (the maker's white), the inside's, the floor's and the basket's. */
  colours?: {
    collar: string;
    inside: string;
    floor: string;
    basket: string;
    throat: string;
  };
  glow?: string;
  /** For the grime's blots; the same seed, the same dirt. */
  random?: () => number;
}

/**
 * The grime on the well's wall, painted as the capacitor soot is
 * (`industrial-devices.ts`): soft blots, each brown at its heart, yellow
 * round it and clear at its edge, more and heavier the lower down, over
 * a stain darkening toward the bottom; a tide line at the water's level
 * (`water`, a fraction of the depth down) and drips running down from it.
 * The canvas wraps the wall: across is round it, down is down it.
 */
function paintGrime(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: string,
  water: number,
  random: () => number,
) {
  c.fillStyle = base;
  c.fillRect(0, 0, w, h);
  const wash = c.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, 'rgba(150, 120, 50, 0)');
  wash.addColorStop(water, 'rgba(150, 120, 50, 0.12)');
  wash.addColorStop(1, 'rgba(90, 62, 28, 0.75)');
  c.fillStyle = wash;
  c.fillRect(0, 0, w, h);
  const blot = (x: number, y: number, r: number, alpha: number) => {
    // Round the seam, so the wrap does not show.
    for (const dx of [-w, 0, w]) {
      const g = c.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      g.addColorStop(0, `rgba(82, 54, 22, ${alpha})`);
      g.addColorStop(0.45, `rgba(176, 142, 58, ${alpha * 0.6})`);
      g.addColorStop(1, 'rgba(200, 170, 80, 0)');
      c.fillStyle = g;
      c.fillRect(x + dx - r, y - r, 2 * r, 2 * r);
    }
  };
  for (let i = 0; i < 320; i++) {
    // Down the wall, more of them the lower.
    const down = Math.sqrt(random());
    blot(
      random() * w,
      down * h,
      (0.04 + 0.08 * random()) * h * (0.6 + down),
      0.2 + 0.7 * down * random(),
    );
  }
  // The tide line, where the water stands, and what ran down from it.
  const tide = water * h;
  c.fillStyle = 'rgba(120, 92, 36, 0.45)';
  c.fillRect(0, tide - h * 0.012, w, h * 0.024);
  c.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const x = random() * w;
    c.strokeStyle = `rgba(100, 72, 30, ${0.15 + 0.3 * random()})`;
    c.lineWidth = 1 + random() * 3;
    c.beginPath();
    c.moveTo(x, tide);
    c.lineTo(x + (random() - 0.5) * 4, tide + random() * (h - tide) * 0.8);
    c.stroke();
  }
}

/**
 * Painted inside the opening only, in layer `order`, regardless of depth:
 * by default anywhere in it, the throat's mouth included; `only` the
 * opening's own stencil value (`EqualStencilFunc`), or the mouth's.
 */
function inside(
  material: Material,
  order: number,
  mesh: Mesh,
  ref = STENCIL,
  func:
    | typeof EqualStencilFunc
    | typeof LessEqualStencilFunc = LessEqualStencilFunc,
) {
  material.depthTest = false;
  material.depthWrite = false;
  material.stencilWrite = true;
  material.stencilRef = ref;
  material.stencilFunc = func;
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
    depth = 0.32,
    reach = 0.7,
    colours = {
      collar: '#f2f1ec',
      inside: '#c9ccc8',
      floor: '#4a5254',
      basket: '#8a9498',
      throat: '#1a2226',
    },
    glow = '#ffc44a',
    random = Math.random,
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
  // A backstop over the whole opening, so that no sliver between the
  // layers below (their edges snap to the PS1 grid) shows the deck.
  const backstopMaterial = own(
    createPs1Material({ color: colours.inside, roughness: 0.6 }),
  );
  const backstop = inside(
    backstopMaterial,
    BACKSTOP,
    new Mesh(new CircleGeometry(radius * 1.02, 48), backstopMaterial),
  );
  backstop.rotation.x = -Math.PI / 2;
  backstop.position.y = -depth * 0.5;
  group.add(backstop);

  // The walls, seen from within: only the far side faces the eye. Dirty,
  // the more so the deeper.
  const grime = createCanvasTexture(512, 256);
  paintGrime(
    grime.context,
    512,
    256,
    colours.inside,
    (0.085 + 0.05) / depth,
    random,
  );
  grime.texture.needsUpdate = true;
  const wallMaterial = own(
    createPs1Material({ map: grime.texture, roughness: 0.7 }),
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

  // The throat: a rectangular duct at the water's level, from the well's
  // wall back under the deck to the pool, its far end beyond the pool's
  // edge so no end is seen. The weir is hinged at the foot of its far
  // mouth, the pool's end, as 1980s skimmers' are (Hayward's SP1070:
  // "attached at the bottom of the skimmer's mouth"), standing up a
  // little off the vertical as it floats. Drawn only when its mouth
  // faces the eye.
  const throat = new Group();
  throat.position.set(0, -0.085, -radius);
  group.add(throat);
  const wide = 0.15;
  const high = 0.1;
  // Its mouth, into the stencil: the duct is drawn only through it.
  const mouthMaterial = own(
    new MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
  );
  const mouth = inside(
    mouthMaterial,
    MOUTH_MASK,
    new Mesh(new PlaneGeometry(wide, high), mouthMaterial),
    STENCIL,
    EqualStencilFunc,
  );
  // Where the opening is seen through the mouth, 2 becomes 3.
  mouthMaterial.stencilZPass = IncrementStencilOp;
  mouth.position.z = 0.03;
  throat.add(mouth);
  // Its inside, seen from within; dark: the water's way in.
  const ductMaterial = own(
    createPs1Material({ color: colours.throat, roughness: 0.9 }),
  );
  ductMaterial.side = BackSide;
  const duct = inside(
    ductMaterial,
    THROAT,
    new Mesh(new BoxGeometry(wide, high, reach), ductMaterial),
    MOUTH,
    EqualStencilFunc,
  );
  duct.position.z = 0.03 - reach / 2;
  throat.add(duct);
  const weirMaterial = own(
    createPs1Material({ color: colours.collar, roughness: 0.5 }),
  );
  const weir = new Group();
  weir.position.set(0, -high / 2, 0.03 - reach + 0.04);
  weir.rotation.x = 0.2;
  throat.add(weir);
  const flap = inside(
    weirMaterial,
    WEIR,
    new Mesh(new BoxGeometry(wide * 0.94, high * 0.7, 0.006), weirMaterial),
    MOUTH,
    EqualStencilFunc,
  );
  flap.position.y = high * 0.35;
  weir.add(flap);
  // A frame round the mouth, so the cut in the wall reads.
  const lipMaterial = own(
    createPs1Material({ color: colours.collar, roughness: 0.45 }),
  );
  for (const [w, h, x, y] of [
    [wide + 0.012, 0.006, 0, high / 2 + 0.003],
    [wide + 0.012, 0.006, 0, -high / 2 - 0.003],
    [0.006, high, wide / 2 + 0.003, 0],
    [0.006, high, -wide / 2 - 0.003, 0],
  ]) {
    const bar = inside(
      lipMaterial,
      LIP,
      new Mesh(new BoxGeometry(w, h, 0.006), lipMaterial),
    );
    bar.position.set(x, y, 0.03);
    throat.add(bar);
  }

  const floorMaterial = own(
    createPs1Material({ color: colours.floor, roughness: 0.9 }),
  );
  // Not over the throat's mouth: the floor lies below it.
  const floor = inside(
    floorMaterial,
    FLOOR,
    new Mesh(new CircleGeometry(radius * 0.92, 48), floorMaterial),
    STENCIL,
    EqualStencilFunc,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -depth;
  group.add(floor);

  // The ledge round the wall below the throat, and the basket sitting
  // on it: open at the top, its handle across, the glow in it.
  const seat = -0.17;
  const basketRadius = radius * 0.84;
  const basketDepth = 0.13;
  // Where the silt settles: the dirtiest of all.
  const ledgeMaterial = own(
    createPs1Material({ color: '#8a7550', roughness: 0.9 }),
  );
  const ledge = inside(
    ledgeMaterial,
    LEDGE,
    new Mesh(new RingGeometry(basketRadius, radius, 48), ledgeMaterial),
  );
  ledge.rotation.x = -Math.PI / 2;
  ledge.position.y = seat;
  group.add(ledge);
  const basketShape = new CylinderGeometry(
    basketRadius,
    basketRadius * 0.92,
    basketDepth,
    40,
    1,
    true,
  );
  // Its far side seen from within, and its near side from without: two
  // meshes, so each is painted in its turn.
  const farMaterial = own(
    createPs1Material({ color: colours.basket, roughness: 0.6 }),
  );
  farMaterial.side = BackSide;
  const far = inside(
    farMaterial,
    BASKET_FAR,
    new Mesh(basketShape, farMaterial),
  );
  far.position.y = seat - basketDepth / 2;
  group.add(far);
  const nearMaterial = own(
    createPs1Material({ color: colours.basket, roughness: 0.6 }),
  );
  const near = inside(
    nearMaterial,
    BASKET_NEAR,
    new Mesh(basketShape, nearMaterial),
  );
  near.position.y = seat - basketDepth / 2;
  group.add(near);
  const bottomMaterial = own(
    createPs1Material({ color: colours.floor, roughness: 0.9 }),
  );
  const bottom = inside(
    bottomMaterial,
    BASKET_FLOOR,
    new Mesh(new CircleGeometry(basketRadius * 0.92, 40), bottomMaterial),
  );
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = seat - basketDepth;
  group.add(bottom);
  // The glow in the basket, under the caustics.
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
    GLOW,
    new Mesh(new CircleGeometry(basketRadius * 0.9, 40), glowMaterial),
  );
  shine.rotation.x = -Math.PI / 2;
  shine.position.y = seat - basketDepth + 0.002;
  group.add(shine);
  const rimMaterial = own(
    createPs1Material({ color: colours.basket, roughness: 0.6 }),
  );
  const rim = inside(
    rimMaterial,
    BASKET_RIM,
    new Mesh(new TorusGeometry(basketRadius, 0.006, 6, 40), rimMaterial),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = seat + 0.003;
  group.add(rim);
  const handle = inside(
    rimMaterial,
    BASKET_RIM,
    new Mesh(new BoxGeometry(basketRadius * 2, 0.008, 0.022), rimMaterial),
  );
  handle.position.y = seat + 0.01;
  group.add(handle);
  // The maker's name moulded on the handle, so the basket is a branded thing.
  const mark = createCanvasTexture(512, 64);
  const c = mark.context;
  c.fillStyle = colours.basket;
  c.fillRect(0, 0, 512, 64);
  c.fillStyle = '#2b3a4a';
  c.font = 'bold 44px Arial, Helvetica, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('CERTIKIND', 256, 34, 480);
  mark.texture.needsUpdate = true;
  const markMaterial = own(new MeshBasicMaterial({ map: mark.texture }));
  const name = inside(
    markMaterial,
    BASKET_MARK,
    new Mesh(new PlaneGeometry(basketRadius * 1.3, 0.017), markMaterial),
  );
  name.rotation.x = -Math.PI / 2;
  name.position.y = seat + 0.0145;
  group.add(name);

  return {
    group,
    /** The glow on the well's floor, 0–1. */
    glow(level: number) {
      glowMaterial.opacity = 0.6 * level;
      shine.visible = level > 0;
    },
    /**
     * Seen from `eye`, in the group's own frame: the throat only when its
     * mouth faces the eye. From the pool's side its wall would hide it,
     * and nothing inside is hidden by anything.
     */
    seenFrom(eye: { z: number }) {
      throat.visible = eye.z > -radius * 0.5;
    },
    dispose() {
      group.traverse((o) => (o as Mesh).geometry?.dispose());
      for (const m of materials) m.dispose();
      mark.texture.dispose();
      grime.texture.dispose();
    },
  };
}

/** Draw `object` after the well's inside, so the inside never paints over it. */
export function drawOver(object: Object3D) {
  object.traverse((o) => {
    o.renderOrder = OVER_WELL;
  });
}
