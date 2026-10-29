import {
  CustomBlending,
  OneFactor,
  SrcAlphaFactor,
  ZeroFactor,
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
const SLUDGE = 4.12;
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
 * Sludge, seen from above: dark brown and fibrous, a felt of rotted leaf
 * and hair, darker and lighter in lumps, with leaf scraps and pale hairs.
 */
function paintSludge(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  random: () => number,
) {
  c.fillStyle = '#26190c';
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) {
    const x = random() * w;
    const y = random() * h;
    const r = (0.04 + 0.1 * random()) * w;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(
      0,
      random() < 0.5 ? 'rgba(70, 48, 22, 0.6)' : 'rgba(12, 8, 4, 0.6)',
    );
    g.addColorStop(1, 'rgba(38, 25, 12, 0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // Fibres: short curls of rotted leaf and hair, matted every which way.
  c.lineCap = 'round';
  const fibres = ['#120c06', '#3a2814', '#4e3719', '#1d140a', '#5e4a2a'];
  for (let i = 0; i < 1400; i++) {
    const x = random() * w;
    const y = random() * h;
    const a = random() * Math.PI * 2;
    const l = 4 + random() * 18;
    c.strokeStyle = fibres[i % fibres.length];
    c.globalAlpha = 0.4 + 0.5 * random();
    c.lineWidth = 0.5 + random() * 1.2;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(
      x + Math.cos(a + 0.8) * l * 0.6,
      y + Math.sin(a + 0.8) * l * 0.6,
      x + Math.cos(a) * l,
      y + Math.sin(a) * l,
    );
    c.stroke();
  }
  c.globalAlpha = 1;
  // Scraps of leaf.
  for (let i = 0; i < 10; i++) {
    c.save();
    c.translate(random() * w, random() * h);
    c.rotate(random() * Math.PI);
    c.fillStyle = ['#3e3216', '#4a3a18', '#2e2a12'][i % 3];
    c.beginPath();
    c.ellipse(0, 0, 5 + random() * 8, 2 + random() * 3, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  // A few pale hairs on top.
  for (let i = 0; i < 12; i++) {
    const x = random() * w;
    const y = random() * h;
    c.strokeStyle = 'rgba(150, 120, 74, 0.7)';
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(
      x + (random() - 0.5) * 50,
      y + (random() - 0.5) * 50,
      x + (random() - 0.5) * 70,
      y + (random() - 0.5) * 70,
    );
    c.stroke();
  }
}

/** A disc `r` across, lumpy: its inner points lifted and sunk by up to `bump`. */
function lumpyDisc(r: number, bump: number, random: () => number) {
  const geometry = new RingGeometry(0.0001, r, 40, 8);
  const at = geometry.attributes.position;
  for (let i = 0; i < at.count; i++) {
    const out = Math.hypot(at.getX(i), at.getY(i)) / r;
    // Flat at the rim, where it meets the basket.
    at.setZ(i, (random() - 0.5) * 2 * bump * (1 - out * out));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The grime on the well's wall, painted as the capacitor soot is
 * (`industrial-devices.ts`): soft blots, each brown at its heart, yellow
 * round it and clear at its edge, more and heavier the lower down, over
 * a stain darkening toward the bottom; a tide line at the water's level
 * (`water`, a fraction of the depth down, or null for none: the basket,
 * under water) and drips running down from it.
 * The canvas wraps the wall: across is round it, down is down it.
 */
function paintGrime(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: string,
  water: number | null,
  random: () => number,
) {
  c.fillStyle = base;
  c.fillRect(0, 0, w, h);
  const wash = c.createLinearGradient(0, 0, 0, h);
  // Clean above the water; under it (the basket), stained from the top.
  wash.addColorStop(0, `rgba(150, 120, 50, ${water === null ? 0.35 : 0})`);
  if (water !== null) wash.addColorStop(water, 'rgba(150, 120, 50, 0.12)');
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
  if (water === null) return;
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
  // Everything below the collar: shown only while the lid is off (`open`).
  const inner = new Group();
  // Painted through the opening, not solid where it is drawn: no ambient
  // occlusion from it (`museum-hall-room.ts`).
  inner.userData.noAmbientOcclusion = true;
  group.add(inner);

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
  inner.add(mask);
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
  inner.add(backstop);

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
  inner.add(walls);

  // The throat: a rectangular duct at the water's level, from the well's
  // wall back under the deck to the pool, its far end beyond the pool's
  // edge so no end is seen. The weir is hinged at the foot of its far
  // mouth, the pool's end, as 1980s skimmers' are (Hayward's SP1070:
  // "attached at the bottom of the skimmer's mouth"), standing up a
  // little off the vertical as it floats. Drawn only when its mouth
  // faces the eye.
  const throat = new Group();
  throat.position.set(0, -0.085, -radius);
  inner.add(throat);
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
  inner.add(floor);

  // The ledge round the wall below the throat, and the basket sitting
  // on it: open at the top, its handle across, the glow in it.
  const seat = -0.17;
  // A little narrower than the shaft, to lift out.
  const basketRadius = radius * 0.9;
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
  inner.add(ledge);
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
  // As grimy as the wall above it, all the way down: it is always under
  // water, so no tide line.
  const basketGrime = createCanvasTexture(512, 128);
  paintGrime(basketGrime.context, 512, 128, colours.basket, null, random);
  basketGrime.texture.needsUpdate = true;
  const farMaterial = own(
    createPs1Material({ map: basketGrime.texture, roughness: 0.75 }),
  );
  farMaterial.side = BackSide;
  const far = inside(
    farMaterial,
    BASKET_FAR,
    new Mesh(basketShape, farMaterial),
  );
  far.position.y = seat - basketDepth / 2;
  inner.add(far);
  const nearMaterial = own(
    createPs1Material({ map: basketGrime.texture, roughness: 0.75 }),
  );
  const near = inside(
    nearMaterial,
    BASKET_NEAR,
    new Mesh(basketShape, nearMaterial),
  );
  near.position.y = seat - basketDepth / 2;
  inner.add(near);
  // Silt settled in its bottom.
  const bottomMaterial = own(
    createPs1Material({ color: '#4d3d26', roughness: 0.95 }),
  );
  const bottom = inside(
    bottomMaterial,
    BASKET_FLOOR,
    new Mesh(new CircleGeometry(basketRadius * 0.92, 40), bottomMaterial),
  );
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = seat - basketDepth;
  inner.add(bottom);
  // The sludge it fills with: dark brown, fibrous, uneven. Shown
  // or not (`sludge`).
  const muck = createCanvasTexture(256, 256);
  paintSludge(muck.context, 256, 256, random);
  muck.texture.needsUpdate = true;
  const sludgeMaterial = own(
    createPs1Material({ map: muck.texture, roughness: 0.9 }),
  );
  const sludge = inside(
    sludgeMaterial,
    SLUDGE,
    new Mesh(lumpyDisc(basketRadius * 0.97, 0.012, random), sludgeMaterial),
  );
  sludge.rotation.x = -Math.PI / 2;
  sludge.position.y = seat - 0.025;
  inner.add(sludge);
  // The glow in the basket, under the caustics.
  const glowMaterial = own(
    new MeshBasicMaterial({
      color: glow,
      transparent: true,
      opacity: 0,
      // Added light, the target's alpha untouched (`skimmer-caustics.ts`).
      blending: CustomBlending,
      blendSrc: SrcAlphaFactor,
      blendDst: OneFactor,
      blendSrcAlpha: ZeroFactor,
      blendDstAlpha: OneFactor,
    }),
  );
  const shine = inside(
    glowMaterial,
    GLOW,
    new Mesh(new CircleGeometry(basketRadius * 0.9, 40), glowMaterial),
  );
  shine.rotation.x = -Math.PI / 2;
  const floorOfBasket = seat - basketDepth + 0.002;
  let full = false;
  let glowAt = 0;
  shine.position.y = floorOfBasket;
  inner.add(shine);
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
  inner.add(rim);
  const handle = inside(
    rimMaterial,
    BASKET_RIM,
    new Mesh(new BoxGeometry(basketRadius * 2, 0.008, 0.022), rimMaterial),
  );
  handle.position.y = seat + 0.01;
  inner.add(handle);
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
  inner.add(name);

  return {
    group,
    /** Open, its inside shown, or shut, only its collar (and the lid over it). */
    open(on: boolean) {
      inner.visible = on;
    },
    /** The basket dirty, full of brown sludge, or clean (only its walls' grime). */
    sludge(dirty: boolean) {
      sludge.visible = dirty;
      full = dirty;
      glowMaterial.opacity = glowAt * (full ? 0.15 : 0.6);
      shine.position.y = dirty ? sludge.position.y + 0.002 : floorOfBasket;
    },
    /** The glow on the well's floor, 0–1. */
    glow(level: number) {
      glowAt = level;
      // Faint on sludge, which would otherwise shine like gold.
      glowMaterial.opacity = level * (full ? 0.15 : 0.6);
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
      basketGrime.texture.dispose();
      muck.texture.dispose();
    },
  };
}

/** Draw `object` after the well's inside, so the inside never paints over it. */
export function drawOver(object: Object3D) {
  object.traverse((o) => {
    o.renderOrder = OVER_WELL;
  });
}
